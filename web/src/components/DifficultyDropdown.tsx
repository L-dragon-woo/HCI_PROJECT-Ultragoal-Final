import { Check, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface Difficulty {
  label: string
  description: string
  colors: string
  dotCount: number
}

const DIFFICULTY_INFO: Record<string, Difficulty> = {
  쉬움: {
    label: '쉬움',
    description: '적은 색상, 단순한 도안',
    colors: '4–8색',
    dotCount: 1,
  },
  보통: {
    label: '보통',
    description: '적당한 색상, 균형 잡힌 도안',
    colors: '9–16색',
    dotCount: 2,
  },
  어려움: {
    label: '어려움',
    description: '많은 색상, 세밀한 도안',
    colors: '17–32색',
    dotCount: 3,
  },
}

interface DifficultyDropdownProps {
  difficulties: string[]
  difficulty: string
  setDifficulty: (difficulty: string) => void
  disabled?: boolean
}

const DifficultyDots = ({ count, active }: { count: number; active: boolean }) => (
  <span className="flex items-center gap-0.5" aria-hidden="true">
    {Array.from({ length: 3 }).map((_, i) => (
      <span
        key={i}
        className={[
          'h-2 w-2 rounded-full transition-colors',
          i < count
            ? active
              ? 'bg-violet-500'
              : 'bg-gray-400'
            : 'bg-gray-200',
        ].join(' ')}
      />
    ))}
  </span>
)

const DifficultyDropdown = ({
  difficulties,
  difficulty,
  setDifficulty,
  disabled,
}: DifficultyDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleToggle = () => {
    if (!disabled) setIsOpen((prev) => !prev)
  }

  const current = DIFFICULTY_INFO[difficulty] ?? DIFFICULTY_INFO['보통']

  return (
    <div ref={containerRef} className="relative w-full sm:w-auto">
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`난이도 선택: 현재 ${difficulty}`}
        className={[
          'flex w-full items-center gap-3 rounded-xl border bg-white px-4 py-3 text-left transition-all sm:w-52',
          disabled
            ? 'cursor-not-allowed border-gray-200 opacity-50'
            : isOpen
              ? 'border-violet-400 shadow-sm ring-2 ring-violet-100'
              : 'cursor-pointer border-gray-200 hover:border-gray-300 hover:shadow-sm',
        ].join(' ')}
      >
        <DifficultyDots count={current.dotCount} active={false} />
        <div className="flex flex-1 flex-col">
          <span className="text-sm font-semibold text-gray-800">{current.label}</span>
          <span className="text-xs text-gray-400">{current.colors}</span>
        </div>
        <ChevronDown
          className={[
            'h-4 w-4 text-gray-400 transition-transform duration-200',
            isOpen ? 'rotate-180' : '',
          ].join(' ')}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="난이도 목록"
          className="absolute top-full left-0 z-40 mt-2 w-full min-w-[220px] overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl shadow-gray-200/60 sm:w-64"
        >
          {difficulties.map((d) => {
            const info = DIFFICULTY_INFO[d]
            const isSelected = d === difficulty
            return (
              <button
                key={d}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  setDifficulty(d)
                  setIsOpen(false)
                }}
                className={[
                  'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                  isSelected
                    ? 'bg-violet-50 text-violet-700'
                    : 'text-gray-700 hover:bg-gray-50',
                ].join(' ')}
              >
                <DifficultyDots count={info.dotCount} active={isSelected} />
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-sm font-semibold">{info.label}</span>
                  <span className="text-xs text-gray-400">{info.description}</span>
                </div>
                <span className="text-xs font-medium text-gray-400">{info.colors}</span>
                {isSelected && <Check className="h-4 w-4 text-violet-500" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default DifficultyDropdown
