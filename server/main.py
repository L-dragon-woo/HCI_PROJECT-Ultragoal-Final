import asyncio
import logging
import shutil
import sys
import time
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from pipeline import DEFAULT_GENERATED_DIR, generate_coloring_book

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("coloring_api")

# ---------------------------------------------------------------------------
# Directories
# ---------------------------------------------------------------------------
UPLOAD_DIR = BASE_DIR / "uploads"
GENERATED_DIR = DEFAULT_GENERATED_DIR

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
GENERATED_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Limits
# ---------------------------------------------------------------------------
MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB
GENERATE_TIMEOUT_SEC = 300           # 5 minutes hard timeout

# ---------------------------------------------------------------------------
# App & middleware
# ---------------------------------------------------------------------------
app = FastAPI(title="Coloring Book Generator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://hciproject-pi.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept", "Authorization"],
    max_age=600,
)

app.mount("/generated", StaticFiles(directory=str(GENERATED_DIR)), name="generated")


# ---------------------------------------------------------------------------
# Global exception handler
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again later."},
    )


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
DIFFICULTY_TO_K = {
    "쉬움": 10,
    "보통": 20,
    "어려움": 30,
    "easy": 10,
    "normal": 20,
    "hard": 30,
}

DOWNLOAD_ASSETS = {
    "coloring": {
        "filename": "final_numbered_coloringbook.png",
        "download_name": "coloring-book.png",
    },
    "combined": {
        "filename": "numbered_with_color_index.png",
        "download_name": "coloring-book-with-palette.png",
    },
    "palette": {
        "filename": "palette.png",
        "download_name": "coloring-book-palette.png",
    },
}

ALLOWED_IMAGE_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/bmp",
    "image/gif",
}

ALLOWED_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def resolve_color_count(k, difficulty):
    if k is not None:
        if k < 2 or k > 60:
            raise HTTPException(status_code=400, detail="k must be between 2 and 60")
        return k
    if difficulty not in DIFFICULTY_TO_K:
        raise HTTPException(status_code=400, detail=f"unsupported difficulty: {difficulty}")
    return DIFFICULTY_TO_K[difficulty]


def _cleanup_upload(path: Path) -> None:
    """Remove a temporary upload file, logging but not raising on failure."""
    try:
        path.unlink(missing_ok=True)
    except Exception as exc:
        logger.warning("Failed to remove upload %s: %s", path, exc)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/api/health")
async def health():
    return {"status": "ok", "timestamp": time.time()}


@app.post("/api/generate")
async def generate(
    request: Request,
    image: UploadFile = File(...),
    k: int | None = Form(None),
    difficulty: str = Form("보통"),
):
    # --- Content-type validation ---
    content_type = (image.content_type or "").lower()
    if content_type not in ALLOWED_IMAGE_CONTENT_TYPES and not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="image must be an image file")

    color_count = resolve_color_count(k, difficulty)
    result_id = uuid4().hex

    suffix = Path(image.filename or "").suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        suffix = ".png"

    upload_path = UPLOAD_DIR / f"{result_id}{suffix}"

    # --- Stream upload with size guard ---
    total_bytes = 0
    try:
        with upload_path.open("wb") as buffer:
            while True:
                chunk = await image.read(65536)  # 64 KB chunks
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > MAX_UPLOAD_BYTES:
                    buffer.close()
                    _cleanup_upload(upload_path)
                    raise HTTPException(
                        status_code=413,
                        detail=f"Image exceeds maximum allowed size of {MAX_UPLOAD_BYTES // (1024*1024)} MB",
                    )
                buffer.write(chunk)
    except HTTPException:
        raise
    except Exception as exc:
        _cleanup_upload(upload_path)
        logger.error("Upload write failed for %s: %s", result_id, exc)
        raise HTTPException(status_code=500, detail="Failed to save uploaded image") from exc

    logger.info(
        "generate request result_id=%s difficulty=%s k=%d upload_bytes=%d",
        result_id, difficulty, color_count, total_bytes,
    )

    # --- Run pipeline in thread pool with timeout ---
    loop = asyncio.get_event_loop()
    t_start = time.perf_counter()
    try:
        result = await asyncio.wait_for(
            loop.run_in_executor(
                None,
                lambda: generate_coloring_book(
                    upload_path,
                    k=color_count,
                    output_root=GENERATED_DIR,
                    result_id=result_id,
                ),
            ),
            timeout=GENERATE_TIMEOUT_SEC,
        )
    except asyncio.TimeoutError:
        logger.error("Pipeline timeout for result_id=%s after %.1fs", result_id, GENERATE_TIMEOUT_SEC)
        raise HTTPException(status_code=504, detail="Image processing timed out. Try a smaller image.")
    except ValueError as exc:
        logger.warning("Validation error for result_id=%s: %s", result_id, exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        logger.error("File not found for result_id=%s: %s", result_id, exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Pipeline failed for result_id=%s", result_id)
        raise HTTPException(status_code=500, detail="Image processing failed. Please try again.") from exc
    finally:
        _cleanup_upload(upload_path)

    elapsed = time.perf_counter() - t_start
    logger.info("generate done result_id=%s elapsed=%.2fs", result_id, elapsed)

    def url_for_asset(name):
        return f"/generated/{result_id}/{name}"

    def download_url(asset_name):
        return f"/api/results/{result_id}/download/{asset_name}"

    return {
        "result_id": result["result_id"],
        "original_url": url_for_asset("original.png"),
        "coloring_url": url_for_asset("final_numbered_coloringbook.png"),
        "palette_url": url_for_asset("palette.png"),
        "combined_url": url_for_asset("numbered_with_color_index.png"),
        "download_url": download_url("coloring"),
        "download_urls": {
            "coloring": download_url("coloring"),
            "combined": download_url("combined"),
            "palette": download_url("palette"),
        },
        "preview_urls": {
            "kmeans": url_for_asset("kmeans.png"),
            "segmentation": url_for_asset("region_preview.png"),
            "colored_by_labels": url_for_asset("colored_by_labels_numbered.png"),
        },
        "palette": result["palette"],
        "metrics": result["metrics"],
        "image_size": result["image_size"],
        "difficulty": difficulty,
        "k": color_count,
    }


@app.get("/api/results/{result_id}/download/{asset_name}")
async def download_result(result_id: str, asset_name: str):
    if asset_name not in DOWNLOAD_ASSETS:
        raise HTTPException(status_code=404, detail="download asset not found")

    if not result_id.isalnum():
        raise HTTPException(status_code=400, detail="invalid result id")

    asset = DOWNLOAD_ASSETS[asset_name]
    file_path = GENERATED_DIR / result_id / asset["filename"]
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="result file not found")

    return FileResponse(
        path=str(file_path),
        media_type="image/png",
        filename=asset["download_name"],
    )
