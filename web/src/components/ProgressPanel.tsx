import { CheckCircle2, Clock, ImageIcon, Layers, Loader2 } from 'lucide-react'
import type { MascotState } from './PixelMascot'

interface ProgressPanelProps {
  state: MascotState
  difficulty: string
  progress: number        // 0–100
  estimatedSec: number    // remaining seconds (shown when processing)
  imageCount: number      // how many images have been processed this session
}

const STAGE_STEPS = [
  { id: 'upload', label: '이미지 업로드' },
  { id: 'process', label: '도안 생성 중' },
  { id: 'done', label: '결과 완성' },
]

const stageIndex = (state: MascotState) => {
  if (state === 'idle') return 0
  if (state === 'processing') return 1
  if (state === 'done' || state === 'error') return 2
  return 0
}

const ProgressPanel = ({
  state,
  difficulty,
  progress,
  estimatedSec,
  imageCount,
}: ProgressPanelProps) => {
  const stage = stageIndex(state)

  return (
    <div className="flex w-full flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-violet-500" />
        <span className="text-sm font-bold text-gray-800">진행 상황</span>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-1">
        {STAGE_STEPS.map((step, i) => {
          const done = i < stage
          const active = i === stage && state !== 'error'
          const err = state === 'error' && i === stage
          return (
            <div key={step.id} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={[
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all',
                  done
                    ? 'bg-violet-600 text-white'
                    : active
                      ? 'bg-violet-100 text-violet-600 ring-2 ring-violet-300'
                      : err
                        ? 'bg-red-100 text-red-500'
                        : 'bg-gray-100 text-gray-400',
                ].join(' ')}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={[
                  'text-center text-[10px] font-medium leading-tight break-keep',
                  done
                    ? 'text-violet-600'
                    : active
                      ? 'text-gray-800'
                      : 'text-gray-400',
                ].join(' ')}
              >
                {step.label}
              </span>
              {/* Connector line */}
              {i < STAGE_STEPS.length - 1 && (
                <div
                  className={[
                    'absolute hidden',
                  ].join(' ')}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Progress bar (visible when processing) */}
      {state === 'processing' && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">진행률</span>
            <span className="text-xs font-bold text-violet-600">{progress}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="처리 진행률"
            className="h-2 w-full overflow-hidden rounded-full bg-gray-100"
          >
            <div
              className="h-full rounded-full bg-violet-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-2">
        <InfoCell
          icon={<ImageIcon className="h-3.5 w-3.5 text-violet-400" />}
          label="처리된 이미지"
          value={`${imageCount}장`}
        />
        <InfoCell
          icon={<Layers className="h-3.5 w-3.5 text-violet-400" />}
          label="현재 난이도"
          value={difficulty}
        />
        {state === 'processing' && (
          <>
            <InfoCell
              icon={<Clock className="h-3.5 w-3.5 text-yellow-400" />}
              label="예상 남은 시간"
              value={estimatedSec > 0 ? `약 ${estimatedSec}초` : '거의 완료'}
            />
            <InfoCell
              icon={<Loader2 className="h-3.5 w-3.5 animate-spin text-yellow-400" />}
              label="현재 단계"
              value="도안 생성 중"
            />
          </>
        )}
        {state === 'done' && (
          <InfoCell
            icon={<CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
            label="상태"
            value="생성 완료!"
          />
        )}
      </div>
    </div>
  )
}

const InfoCell = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) => (
  <div className="flex flex-col gap-1 rounded-xl bg-gray-50 px-3 py-2">
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="text-[10px] font-medium text-gray-400">{label}</span>
    </div>
    <span className="text-sm font-bold text-gray-700">{value}</span>
  </div>
)

export default ProgressPanel
