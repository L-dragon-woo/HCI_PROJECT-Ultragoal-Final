import { useEffect, useRef, useState } from 'react'
import {
  Download,
  ExternalLink,
  ImageIcon,
  Layers,
  Loader2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import Header from './components/Header'
import Footer from './components/Footer'
import ImageComparison from './components/ImageComparison'
import PhotoInput from './components/PhotoInput'
import DifficultyDropdown from './components/DifficultyDropdown'
import PixelMascot, { type MascotState } from './components/PixelMascot'
import ProgressPanel from './components/ProgressPanel'
import beforeImage from './images/beforeImage.png'
import afterImage from './images/afterImage.png'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

interface GenerateResponse {
  original_url: string
  coloring_url: string
  palette_url: string
  combined_url: string
  download_url: string
  download_urls: {
    coloring: string
    combined: string
    palette: string
  }
  difficulty: string
  k: number
}

const STEPS = [
  {
    step: '01',
    icon: ImageIcon,
    title: '사진 업로드',
    description: '변환하고 싶은 사진을 선택하거나 드래그하여 업로드합니다.',
  },
  {
    step: '02',
    icon: Layers,
    title: '난이도 선택',
    description: '원하는 색상 수와 세밀도를 선택합니다.',
  },
  {
    step: '03',
    icon: Loader2,
    title: '컬러링북 생성',
    description: "'변환' 버튼을 눌러 나만의 컬러링 도안을 만듭니다.",
  },
  {
    step: '04',
    icon: Download,
    title: '결과 저장',
    description: '완성된 도안과 팔레트를 확인하고 저장합니다.',
  },
]

// Fake progress ticker: ramps quickly to ~85%, slows near the end
function useFakeProgress(active: boolean) {
  const [progress, setProgress] = useState(0)
  const [estimatedSec, setEstimatedSec] = useState(15)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!active) return

    // Reset asynchronously so no setState runs synchronously in the effect body
    // (avoids cascading renders). The reset lands before the first 800ms tick.
    const resetId = setTimeout(() => {
      setProgress(0)
      setEstimatedSec(15)
    }, 0)

    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p
        const increment = p < 50 ? 6 : p < 75 ? 3 : 1
        return Math.min(p + increment, 90)
      })
      setEstimatedSec((s) => Math.max(0, s - 1))
    }, 800)

    return () => {
      clearTimeout(resetId)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [active])

  return { progress, estimatedSec }
}

function App() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [difficulty, setDifficulty] = useState('보통')
  const [result, setResult] = useState<GenerateResponse | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [imageCount, setImageCount] = useState(0)

  const difficulties = ['쉬움', '보통', '어려움']

  const { progress, estimatedSec } = useFakeProgress(isGenerating)

  const mascotState: MascotState = errorMessage
    ? 'error'
    : result
      ? 'done'
      : isGenerating
        ? 'processing'
        : 'idle'

  const assetUrl = (path: string) => `${API_BASE_URL}${path}`

  const handleGenerate = async () => {
    if (!uploadedFile) {
      setErrorMessage('컬러링북으로 만들 사진을 먼저 선택해주세요.')
      return
    }

    setIsGenerating(true)
    setErrorMessage(null)
    setResult(null)

    const formData = new FormData()
    formData.append('image', uploadedFile)
    formData.append('difficulty', difficulty)

    try {
      const response = await fetch(`${API_BASE_URL}/api/generate`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json().catch(() => null)
        throw new Error(error?.detail ?? '컬러링북 생성에 실패했습니다.')
      }

      const data = (await response.json()) as GenerateResponse
      setResult(data)
      setImageCount((c) => c + 1)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '컬러링북 생성에 실패했습니다.',
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const comparisonBefore = result
    ? assetUrl(result.original_url)
    : (uploadedImage ?? beforeImage)
  const comparisonAfter = result ? assetUrl(result.coloring_url) : afterImage

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />

      <main className="container mx-auto flex-grow px-4 pt-20 md:px-8 md:pt-24">
        {/* ── Hero ────────────────────────────────────────────── */}
        <section className="flex flex-col items-center gap-4 py-10 text-center md:gap-5 md:py-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-4 py-1.5">
            <Sparkles className="h-3.5 w-3.5 text-violet-500" />
            <span className="text-xs font-semibold text-violet-600">
              AI 컬러링북 생성기
            </span>
          </div>
          <h1 className="text-4xl font-bold break-keep text-gray-900 md:text-5xl lg:text-6xl">
            사진으로 만드는{' '}
            <span className="text-violet-600">나만의 컬러링북</span>
          </h1>
          <p className="max-w-xl text-base font-medium break-keep text-gray-500 md:text-lg">
            소중한 사진을 업로드하고 색상 수를 지정해보세요.
            <br className="hidden md:block" />
            누구나 따라 칠할 수 있는 번호 기반 도안을 즉시 만들어 드립니다.
          </p>
        </section>

        {/* ── Mascot + Progress row ────────────────────────────── */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[auto_1fr]">
          {/* Mascot card */}
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <PixelMascot state={mascotState} />
            <p className="max-w-[180px] text-center text-xs leading-snug break-keep text-gray-500">
              {mascotState === 'idle' && '사진을 올려주세요!'}
              {mascotState === 'processing' && '도안을 열심히 만들고 있어요…'}
              {mascotState === 'done' && '완성됐어요! 다운로드 해보세요 🎉'}
              {mascotState === 'error' && '앗, 오류가 발생했어요. 다시 시도해주세요.'}
            </p>
          </div>

          {/* Progress panel */}
          <ProgressPanel
            state={mascotState}
            difficulty={difficulty}
            progress={isGenerating ? progress : result ? 100 : 0}
            estimatedSec={estimatedSec}
            imageCount={imageCount}
          />
        </section>

        {/* ── Main grid ───────────────────────────────────────── */}
        <section className="grid w-full grid-cols-1 items-start gap-8 pb-16 lg:grid-cols-2 lg:gap-10">
          {/* Left — input panel */}
          <div className="flex flex-col gap-5">
            <PhotoInput
              image={uploadedImage}
              setImage={(image) => {
                setUploadedImage(image)
                setResult(null)
                setErrorMessage(null)
              }}
              setFile={setUploadedFile}
              disabled={isGenerating}
            />

            {/* Controls row */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <DifficultyDropdown
                difficulties={difficulties}
                difficulty={difficulty}
                setDifficulty={setDifficulty}
                disabled={isGenerating}
              />

              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className={[
                  'flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-200',
                  isGenerating
                    ? 'cursor-not-allowed bg-violet-400 text-white'
                    : 'cursor-pointer bg-violet-600 text-white hover:bg-violet-700 active:scale-[0.98]',
                ].join(' ')}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>변환 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>변환하기</span>
                  </>
                )}
              </button>
            </div>

            {/* Status message */}
            <div className="min-h-[2.5rem]">
              {errorMessage && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <p className="text-sm font-medium break-keep text-red-600">
                    {errorMessage}
                  </p>
                </div>
              )}
              {result && !errorMessage && (
                <div
                  role="status"
                  className="flex items-center gap-2.5 rounded-xl border border-green-100 bg-green-50 px-4 py-3"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                  <p className="text-sm font-medium text-green-700">
                    <strong>{result.difficulty}</strong> 난이도,{' '}
                    <strong>{result.k}색</strong>으로 생성 완료!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right — result panel */}
          <div className="flex flex-col gap-5">
            <ImageComparison
              beforeImage={comparisonBefore}
              afterImage={comparisonAfter}
            />

            {result && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <a
                  href={assetUrl(result.download_url)}
                  download
                  className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
                >
                  <Download className="h-4 w-4" />
                  도안 저장하기
                </a>
                <a
                  href={assetUrl(result.combined_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
                >
                  <ExternalLink className="h-4 w-4" />
                  색상표 포함 결과 보기
                </a>
              </div>
            )}

            {result && (
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
                <div className="border-b border-gray-100 px-4 py-3">
                  <p className="text-sm font-semibold text-gray-700">색상 팔레트</p>
                </div>
                <div className="p-4">
                  <img
                    src={assetUrl(result.palette_url)}
                    alt="색상 팔레트"
                    className="w-full rounded-lg object-contain"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── How-to steps ────────────────────────────────────── */}
        <section className="border-t border-gray-100 pb-16 pt-12">
          <h2 className="mb-8 text-center text-2xl font-bold text-gray-900 md:text-3xl">
            이렇게 사용하세요
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.step}
                  className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50">
                      <Icon className="h-5 w-5 text-violet-500" />
                    </div>
                    <span className="text-xs font-bold tracking-widest text-violet-400">
                      STEP {item.step}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-base font-bold text-gray-900">
                      {item.title}
                    </h3>
                    <p className="text-sm leading-relaxed break-keep text-gray-500">
                      {item.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default App
