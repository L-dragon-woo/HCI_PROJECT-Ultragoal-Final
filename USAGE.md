# HCI_PROJECT 컬러링북 생성 시스템 - 사용 가이드

> **최종 업데이트**: 2026-10-24
> **상태**: 배포 승인 완료 (G004 최종 리뷰 반영)

사진을 업로드하면 색상을 단순화하고, 닫힌 경계선을 만든 뒤, 색칠 가능한 영역마다
팔레트 번호를 배치한 paint-by-number 스타일 컬러링북을 생성하는 시스템입니다.
FastAPI 백엔드, React(Vite) 웹 프론트엔드, 그리고 폴더 단위 배치 파이프라인으로 구성됩니다.

## 목차

1. [설치 및 환경 구성](#설치-및-환경-구성)
2. [빠른 시작](#빠른-시작)
3. [백엔드 서버 사용 가이드](#백엔드-서버-사용-가이드)
4. [웹 인터페이스 사용 가이드](#웹-인터페이스-사용-가이드)
5. [배치 파이프라인 사용 가이드](#배치-파이프라인-사용-가이드)
6. [API 레퍼런스](#api-레퍼런스)
7. [사용 예제](#사용-예제)
8. [성능 최적화 팁](#성능-최적화-팁)
9. [확장 가이드 (커스터마이징)](#확장-가이드-커스터마이징)
10. [트러블슈팅](#트러블슈팅)
11. [FAQ](#faq)

---

## 설치 및 환경 구성

### 시스템 요구사항

- **Python**: 3.10 이상 (`main.py`에서 `int | None` 유니온 타입 문법 사용)
- **Node.js**: 18 이상 (Vite 8 / React 19 기준)
- **패키지 매니저**: `pnpm` 권장 (`pnpm-lock.yaml` 존재), `npm`도 사용 가능

### 1단계: 저장소 클론

```bash
git clone <repository-url>
cd HCI_PROJECT
```

### 2단계: 백엔드 설정

```bash
cd server
python -m venv .venv
# Windows:  .venv\Scripts\activate
# macOS/Linux:  source .venv/bin/activate
pip install -r requirements.txt
```

**설치 패키지** (`server/requirements.txt`):

- `opencv-python` – 이미지 처리 핵심 라이브러리
- `numpy` – 수치 계산
- `matplotlib` – 팔레트/색상표 이미지 렌더링
- `jupyter` – 알고리즘 분석 노트북 실행용
- `fastapi` – 웹 API 프레임워크
- `uvicorn` – ASGI 서버
- `python-multipart` – multipart/form-data 파일 업로드 처리

### 3단계: 프론트엔드 설정

```bash
cd ../web
pnpm install
# 또는: npm install
```

### 환경 변수

**백엔드**: 환경 변수 없이 기본 설정으로 동작합니다. 포트와 호스트는 `uvicorn`
실행 인자로 지정합니다. 업로드 상한(20MB)과 파이프라인 타임아웃(300초)은
`server/main.py` 상단 상수(`MAX_UPLOAD_BYTES`, `GENERATE_TIMEOUT_SEC`)로 조정합니다.

**프론트엔드** (`web/.env` 또는 `.env.local`):

```
VITE_API_BASE_URL=http://localhost:8000
```

> 미설정 시 `App.tsx`의 기본값 `http://localhost:8000`을 사용합니다.
> 변수명은 정확히 `VITE_API_BASE_URL`입니다 (Vite는 `VITE_` 접두어만 노출).

---

## 빠른 시작

**터미널 1 — 백엔드 서버**:

```bash
cd server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**터미널 2 — 웹 프론트엔드**:

```bash
cd web
pnpm dev     # 또는 npm run dev
```

브라우저에서 `http://localhost:5173`에 접속한 뒤, 사진을 올리고 난이도를 고른 다음
"변환하기"를 누르면 컬러링북이 생성됩니다.

**배치 파이프라인만 실행**하려면:

```bash
cd server
python scripts/batch_difficulty_pipeline.py --data-dir data --output-dir outputs
```

---

## 백엔드 서버 사용 가이드

### 서버 시작

```bash
cd server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

`python main.py`로는 서버가 뜨지 않습니다. `main.py`에는 `__main__` 실행 블록이 없고
`app` 객체만 노출하므로 반드시 `uvicorn`으로 기동해야 합니다.

**서버 정보**:

- **Base URL**: `http://localhost:8000`
- **대화형 API 문서(Swagger UI)**: `http://localhost:8000/docs`
- **OpenAPI 스키마**: `http://localhost:8000/openapi.json`
- **정적 결과 파일**: `http://localhost:8000/generated/{result_id}/{filename}`

### CORS 허용 오리진

`main.py`에 하드코딩되어 있습니다. 새 프론트엔드 주소를 추가하려면 이 목록을 수정하세요.

- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `https://hciproject-pi.vercel.app`

### 처리 흐름

1. 업로드 이미지를 64KB 청크로 스트리밍 저장하며 20MB 상한을 검사합니다.
2. 파이프라인을 스레드 풀에서 실행하고 300초 하드 타임아웃을 적용합니다.
3. 완료 후 업로드 임시 파일은 항상 삭제됩니다(`finally` 블록).
4. 결과 이미지는 `server/generated/{result_id}/`에 저장되어 URL로 제공됩니다.

---

## 웹 인터페이스 사용 가이드

### 화면 구성

- **업로드 영역** (`PhotoInput`): 클릭 또는 드래그 앤 드롭으로 이미지 선택.
  키보드 접근(Enter/Space) 지원. 안내 문구상 지원 형식은 JPG, PNG, WEBP · 최대 20MB.
- **난이도 드롭다운** (`DifficultyDropdown`): `쉬움 / 보통 / 어려움` 중 선택.
  각 항목은 대략적인 색상 수 가이드(4–8 / 9–16 / 17–32색)를 표시합니다.
- **변환 버튼**: 눌러서 서버에 생성 요청. 처리 중에는 비활성화됩니다.
- **진행 패널** (`ProgressPanel`) + **픽셀 마스코트** (`PixelMascot`):
  대기/처리/완료/오류 상태를 시각화합니다.
  진행률 바는 실제 서버 진행도가 아닌 체감용 추정 애니메이션입니다(`useFakeProgress`).
- **비교 슬라이더** (`ImageComparison`): 원본과 도안을 좌우 비교. 마우스/터치/화살표 키 지원.
- **결과 영역**: "도안 저장하기"(다운로드), "색상표 포함 결과 보기"(새 탭), 색상 팔레트 미리보기.

### 사용 순서

1. 사진을 업로드합니다 (클릭 또는 드래그 앤 드롭).
2. 난이도(`쉬움`/`보통`/`어려움`)를 선택합니다.
3. "변환하기"를 누릅니다.
4. 완료되면 비교 슬라이더, 팔레트, 다운로드 버튼이 나타납니다.
5. "도안 저장하기"로 번호 도안을 내려받거나, "색상표 포함 결과 보기"로 팔레트 포함본을 확인합니다.

> 현재 UI는 난이도(`쉬움`/`보통`/`어려움`)만 전송하며, 각각 서버에서 K=10/20/30으로 매핑됩니다.
> 임의 K 값 직접 지정은 API(`k` 파라미터)로만 가능합니다.

---

## 배치 파이프라인 사용 가이드

### 개요

폴더 안의 모든 이미지를 순회하며, 각 이미지를 한 번만 프로파일링한 뒤
`easy / normal / hard` 세 난이도 결과와 검수용 segmentation preview, CSV 요약을 생성합니다.

```bash
cd server
python scripts/batch_difficulty_pipeline.py [옵션]
```

### 주요 옵션

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--data-dir` | 입력 이미지 폴더 | `server/data` |
| `--output-dir` | 결과 저장 폴더 | `server/outputs` |
| `--max-size` | 작업 해상도 긴 변 상한(px). 자동 정책은 작은 원본을 여전히 업스케일 | 자동(미지정) |
| `--no-auto-policy` | 이미지 프로파일 기반 자동 정책 비활성화 | (미지정 시 활성화) |

지원 확장자: `.jpg`, `.jpeg`, `.png`, `.bmp`, `.webp`, `.tif`, `.tiff`

### 사용 예시

```bash
# 기본 실행 (server/data -> server/outputs)
python scripts/batch_difficulty_pipeline.py

# 사용자 폴더 지정
python scripts/batch_difficulty_pipeline.py \
  --data-dir ./my_images \
  --output-dir ./my_results

# 큰 이미지를 긴 변 1920px로 제한
python scripts/batch_difficulty_pipeline.py --max-size 1920
```

### 출력 파일

각 입력 이미지 `image.jpg`마다:

```
outputs/
├── image_easy_k{K}.png                         # Easy 난이도 도안
├── image_normal_k{K}.png                        # Normal 난이도 도안
├── image_hard_k{K}.png                          # Hard 난이도 도안
├── image_easy_k{K}_segmentation_filled.png      # Easy 검수용 채움 preview
├── image_normal_k{K}_segmentation_filled.png    # Normal 검수용 채움 preview
├── image_hard_k{K}_segmentation_filled.png      # Hard 검수용 채움 preview
└── batch_difficulty_summary.csv                 # 요약 보고서
```

K 값은 이미지별 `min_k` 추정치에 난이도 margin(easy +0, normal +10, hard +20)을 더해
결정되므로 이미지마다 달라집니다. 실패한 이미지가 있어도 배치는 중단되지 않고
로그에 기록된 뒤 다음 이미지로 넘어갑니다.

### 요약 CSV 컬럼

| 컬럼 | 설명 |
|------|------|
| `image` | 입력 이미지 파일명 |
| `difficulty` | 난이도 (easy/normal/hard) |
| `K` | 적용된 색상 클러스터 수 |
| `regions` | 분할된 색칠 영역 수 |
| `small_regions` | 작은 영역 수 |
| `edge_density` | 엣지 밀도 |
| `original_size` | 원본 크기 (WxH) |
| `working_size` | 작업 해상도 (WxH) |
| `policy` | 적용된 자동 정책 (`high`/`normal`/`simple`/`soft`/`fixed`) |
| `k_upper_bound` | 정책의 K 상한 |
| `output` | 결과 파일명 |
| `status` | 처리 상태 (`ok`/`failed`) |

---

## API 레퍼런스

Base URL: `http://localhost:8000`. 현재 인증은 없습니다.
에러 응답은 FastAPI 표준 형식 `{"detail": "<메시지>"}`를 따릅니다.

### GET `/api/health`

서버 상태 확인.

**응답 200**:

```json
{ "status": "ok", "timestamp": 1730000000.123 }
```

### POST `/api/generate`

이미지 하나로 컬러링북 전체 산출물을 생성합니다. `multipart/form-data`로 전송합니다.

**폼 필드**:

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `image` | file | 예 | 업로드 이미지. `image/*` content-type. 최대 20MB |
| `k` | int | 아니오 | 색상 수 직접 지정. 2–60 범위. 지정 시 `difficulty`보다 우선 |
| `difficulty` | string | 아니오 | `쉬움`/`보통`/`어려움` 또는 `easy`/`normal`/`hard`. 기본 `보통`. K=10/20/30으로 매핑 |

**응답 200 (요약)**:

```json
{
  "result_id": "0f1e2d...",
  "original_url": "/generated/<id>/original.png",
  "coloring_url": "/generated/<id>/final_numbered_coloringbook.png",
  "palette_url": "/generated/<id>/palette.png",
  "combined_url": "/generated/<id>/numbered_with_color_index.png",
  "download_url": "/api/results/<id>/download/coloring",
  "download_urls": {
    "coloring": "/api/results/<id>/download/coloring",
    "combined": "/api/results/<id>/download/combined",
    "palette": "/api/results/<id>/download/palette"
  },
  "preview_urls": {
    "kmeans": "/generated/<id>/kmeans.png",
    "segmentation": "/generated/<id>/region_preview.png",
    "colored_by_labels": "/generated/<id>/colored_by_labels_numbered.png"
  },
  "palette": [
    { "id": 1, "rgb": [34, 40, 49], "hex": "#222831" }
  ],
  "metrics": {
    "k": 20,
    "regions": 150,
    "runtime_sec": 4.21,
    "color_error": 7.8,
    "unique_colors": 20
  },
  "image_size": { "width": 900, "height": 600 },
  "difficulty": "보통",
  "k": 20
}
```

> URL은 상대 경로입니다. 프론트엔드는 `VITE_API_BASE_URL`을 접두해 절대 URL을 만듭니다.

**에러 코드**:

| 코드 | 상황 |
|------|------|
| `400` | content-type이 이미지가 아님 / 잘못된 `k` (2–60 범위 밖) / 지원하지 않는 difficulty / 파이프라인 입력 오류 |
| `413` | 업로드 이미지가 20MB 초과 |
| `500` | 업로드 저장 실패 또는 파이프라인 처리 실패 (상세 메시지는 노출되지 않음) |
| `504` | 처리 시간이 300초 초과 |

### GET `/api/results/{result_id}/download/{asset_name}`

생성된 산출물을 다운로드용 파일명으로 내려받습니다.

- `result_id`: 영숫자(`isalnum`)여야 합니다. 그 외에는 `400`.
- `asset_name`: `coloring` | `combined` | `palette` 중 하나. 그 외에는 `404`.

| asset_name | 실제 파일 | 다운로드 파일명 |
|------------|-----------|-----------------|
| `coloring` | `final_numbered_coloringbook.png` | `coloring-book.png` |
| `combined` | `numbered_with_color_index.png` | `coloring-book-with-palette.png` |
| `palette` | `palette.png` | `coloring-book-palette.png` |

### GET `/generated/{result_id}/{filename}`

정적 마운트로 제공되는 원본 결과 이미지(미리보기 등). 위 응답의 `*_url` 필드가 이 경로를 가리킵니다.

---

## 사용 예제

### cURL

```bash
# 헬스 체크
curl http://localhost:8000/api/health

# 난이도 기반 생성
curl -X POST http://localhost:8000/api/generate \
  -F "image=@photo.jpg" \
  -F "difficulty=보통"

# K 직접 지정 (difficulty보다 우선)
curl -X POST http://localhost:8000/api/generate \
  -F "image=@photo.jpg" \
  -F "k=24"

# 결과 도안 다운로드 (위 응답의 result_id 사용)
curl -OJ http://localhost:8000/api/results/<result_id>/download/coloring
```

### Python (requests)

```python
import requests

BASE = "http://localhost:8000"

with open("photo.jpg", "rb") as f:
    resp = requests.post(
        f"{BASE}/api/generate",
        files={"image": f},
        data={"difficulty": "어려움"},  # 또는 {"k": 30}
    )
resp.raise_for_status()
result = resp.json()

# 번호 도안 저장
dl = requests.get(f"{BASE}{result['download_url']}")
with open("coloring-book.png", "wb") as out:
    out.write(dl.content)

print("K:", result["k"], "영역 수:", result["metrics"]["regions"])
```

### JavaScript (fetch)

```js
const form = new FormData()
form.append('image', fileInput.files[0])
form.append('difficulty', '보통')

const res = await fetch('http://localhost:8000/api/generate', {
  method: 'POST',
  body: form,
})
if (!res.ok) {
  const { detail } = await res.json()
  throw new Error(detail)
}
const data = await res.json()
imgEl.src = `http://localhost:8000${data.coloring_url}`
```

---

## 성능 최적화 팁

- **작업 해상도 제한**: 배치는 `--max-size`, 서버는 `pipeline.py`의
  `DEFAULT_SETTINGS["max_size"]`(기본 900)로 긴 변을 줄여 처리 속도와 메모리를 크게 낮춥니다.
- **타임아웃 조정**: 큰 이미지에서 504가 발생하면 `main.py`의 `GENERATE_TIMEOUT_SEC`를 늘리되,
  동시에 `max_size`를 낮춰 근본 처리 시간을 줄이는 편이 좋습니다.
- **메모리**: `pipeline.py`와 `run_batch`는 큰 중간 배열을 `del`로 즉시 해제해 피크 메모리를 억제합니다.
  커스터마이징 시 이 패턴을 유지하세요.
- **난이도 선택**: K가 커질수록(어려움) 영역 수와 렌더링 시간이 늘어납니다. 미리보기/테스트에는 `쉬움`을 권장합니다.
- **동시 처리**: 서버는 요청당 스레드 풀 1개로 파이프라인을 실행합니다. 다수 동시 요청이 필요하면
  워커 수(`uvicorn --workers N`)를 늘리거나 큐를 도입하세요.

---

## 확장 가이드 (커스터마이징)

- **난이도 ↔ K 매핑 변경**: `server/main.py`의 `DIFFICULTY_TO_K` 딕셔너리를 수정합니다.
- **파이프라인 파라미터 튜닝**: `server/pipeline.py`의 `DEFAULT_SETTINGS`
  (canny 임계값, 최소 영역 면적, 선 두께 등)를 조정하거나,
  `generate_coloring_book(..., settings=<override dict>)`로 호출 시 덮어씁니다.
- **자동 정책 로직**: 배치/웹 공통 정책은 `batch_difficulty_pipeline.py`의
  `analyze_image_profile()` / `choose_processing_policy()` 상단 상수(`AUTO_*`)에서 제어합니다.
- **새 CORS 오리진**: `main.py`의 `allow_origins` 목록에 추가합니다.
- **새 다운로드 자산**: `main.py`의 `DOWNLOAD_ASSETS`에 항목을 추가하고,
  해당 파일이 `generate_coloring_book`의 저장 목록에 포함되는지 확인합니다.
- **업로드 상한/허용 형식**: `MAX_UPLOAD_BYTES`, `ALLOWED_IMAGE_CONTENT_TYPES`,
  `ALLOWED_SUFFIXES`를 조정합니다.
- **알고리즘 분석**: `server/*.ipynb` 노트북에서 색상 단순화/경계선/영역 분리 알고리즘을 비교·실험할 수 있습니다.

---

## 트러블슈팅

### `python main.py`로 서버가 뜨지 않음

`main.py`에는 실행 블록이 없습니다. `uvicorn main:app --port 8000`으로 기동하세요.

### `ModuleNotFoundError: No module named 'cv2'`

```bash
pip install -r requirements.txt   # server 디렉터리에서, 가상환경 활성화 상태로
```

### 포트 8000 사용 중 (`Address already in use`)

```bash
uvicorn main:app --port 8001   # 다른 포트 사용
```

프론트엔드도 `VITE_API_BASE_URL`을 새 포트로 맞춰야 합니다.

### 웹에서 CORS 오류 발생

프론트엔드 주소가 `main.py`의 `allow_origins` 목록에 없는 경우입니다. 목록에 추가 후 서버를 재시작하세요.

### 413 (파일이 너무 큼)

업로드가 20MB를 초과했습니다. 이미지를 줄이거나 `MAX_UPLOAD_BYTES`를 상향하세요.

### 504 (처리 시간 초과)

처리에 300초를 넘겼습니다. 더 작은 이미지를 쓰거나, `max_size`를 낮추고 `GENERATE_TIMEOUT_SEC`를 조정하세요.

### 결과 이미지가 표시되지 않음

- 서버가 실행 중이고 `VITE_API_BASE_URL`이 올바른지 확인합니다.
- `server/generated/{result_id}/`에 파일이 생성되었는지 확인합니다.

---

## FAQ

**Q: 어떤 이미지 형식을 지원하나요?**
A: 웹/API는 `image/*` content-type을 허용합니다(JPG, PNG, WEBP, BMP, GIF 등).
배치 파이프라인은 `.jpg/.jpeg/.png/.bmp/.webp/.tif/.tiff`를 처리합니다.

**Q: 최대 업로드 크기는?**
A: API는 20MB로 제한합니다(`MAX_UPLOAD_BYTES`). 초과 시 413을 반환합니다.

**Q: 난이도와 K는 어떻게 연결되나요?**
A: 웹 API에서는 `쉬움=10`, `보통=20`, `어려움=30`으로 매핑됩니다(`DIFFICULTY_TO_K`).
배치 파이프라인은 이미지별 `min_k`에 margin(+0/+10/+20)을 더해 K를 자동 결정합니다.

**Q: 임의의 K 값을 쓸 수 있나요?**
A: API의 `k` 폼 필드로 2–60 범위에서 지정할 수 있으며, 지정 시 `difficulty`보다 우선합니다.
현재 웹 UI는 난이도만 전송합니다.

**Q: 결과 이미지 해상도는?**
A: 자동 정책에 따라 작업 긴 변이 제한될 수 있습니다(웹 기본 900px). 응답의 `image_size`로 확인할 수 있습니다.

**Q: 여러 이미지를 한 번에 처리할 수 있나요?**
A: 웹/API는 요청당 이미지 1장입니다. 폴더 단위 처리는 배치 파이프라인을 사용하세요(순차 처리).

**Q: 생성된 결과는 어디에 저장되나요?**
A: `server/generated/{result_id}/`에 저장되며 `.gitignore`로 버전 관리에서 제외됩니다.
임시 업로드 파일은 처리 후 자동 삭제됩니다.

---

## 지원 및 피드백

- **이슈 보고**: GitHub Issues
- **이메일**: yongu3823@gmail.com

---

## 라이선스

현재 저장소에 별도 `LICENSE` 파일이 없습니다. 학술/과제(HCI 프로젝트) 용도로 작성된 코드이며,
외부 배포 또는 재사용 전에 라이선스를 명시하는 것을 권장합니다.
