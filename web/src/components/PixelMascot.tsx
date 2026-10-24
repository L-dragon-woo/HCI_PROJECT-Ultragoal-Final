import { useState } from 'react'

export type MascotState = 'idle' | 'processing' | 'done' | 'error'

interface PixelMascotProps {
  state: MascotState
}

// ─── Pixel art rendered via inline SVG rects ────────────────────────────────
// Grid is 16×16. Each cell = 1 unit. Characters are drawn bottom-up.
// Colors are chosen to be pastel / pixel-art friendly.

type Pixel = [number, number, string] // [col, row, color]

const SKIN = '#FFDAB9'
const HAIR = '#5C3D2E'
const SHIRT_IDLE = '#A8D8EA'
const SHIRT_BUSY = '#FFD166'
const SHIRT_DONE = '#06D6A0'
const SHIRT_ERR = '#EF476F'
const PANTS = '#5E6472'
const SHOE = '#2D2D2D'
const EYE = '#2D2D2D'
const MOUTH_HAPPY = '#C0392B'
const MOUTH_WORRY = '#8B0000'
const SWEAT = '#74B9FF'
const STAR = '#FFD700'
const KEYBOARD = '#B2BEC3'
const KEY = '#DFE6E9'

// Helper to make a filled rectangle of pixels
const rect = (
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): Pixel[] => {
  const out: Pixel[] = []
  for (let row = y; row < y + h; row++)
    for (let col = x; col < x + w; col++) out.push([col, row, color])
  return out
}

// Base body (shared across states) — shirt color varies
const baseBody = (shirtColor: string): Pixel[] => [
  // Head
  ...rect(5, 2, 6, 5, SKIN),
  // Hair
  ...rect(5, 1, 6, 2, HAIR),
  ...rect(4, 2, 1, 2, HAIR),
  ...rect(11, 2, 1, 2, HAIR),
  // Eyes
  [6, 4, EYE],
  [9, 4, EYE],
  // Torso / shirt
  ...rect(4, 7, 8, 4, shirtColor),
  // Arms
  ...rect(2, 7, 2, 3, SKIN),
  ...rect(12, 7, 2, 3, SKIN),
  // Pants
  ...rect(4, 11, 3, 3, PANTS),
  ...rect(9, 11, 3, 3, PANTS),
  // Shoes
  ...rect(3, 14, 4, 1, SHOE),
  ...rect(9, 14, 4, 1, SHOE),
]

// Idle pixels: neutral smile, sitting relaxed
const idlePixels = (): Pixel[] => [
  ...baseBody(SHIRT_IDLE),
  // Smile
  [6, 6, MOUTH_HAPPY],
  [7, 6, MOUTH_HAPPY],
  [8, 6, MOUTH_HAPPY],
  [9, 6, MOUTH_HAPPY],
  // Chair hint
  ...rect(1, 13, 14, 1, '#D0D3D4'),
  ...rect(1, 13, 1, 3, '#D0D3D4'),
  ...rect(14, 13, 1, 3, '#D0D3D4'),
]

// Processing: typing at keyboard, busy expression
const processingPixels = (): Pixel[] => [
  ...baseBody(SHIRT_BUSY),
  // Focused eyes (smaller)
  [6, 4, EYE],
  [9, 4, EYE],
  // Neutral / focused mouth
  [6, 6, MOUTH_HAPPY],
  [9, 6, MOUTH_HAPPY],
  // Keyboard
  ...rect(2, 12, 12, 2, KEYBOARD),
  [3, 12, KEY],
  [5, 12, KEY],
  [7, 12, KEY],
  [9, 12, KEY],
  [11, 12, KEY],
  // Arms forward (typing)
  ...rect(3, 10, 2, 2, SKIN),
  ...rect(11, 10, 2, 2, SKIN),
  // Sweat drop
  [12, 3, SWEAT],
  [12, 4, SWEAT],
]

// Done: arms raised, big smile
const donePixels = (): Pixel[] => [
  ...baseBody(SHIRT_DONE),
  // Big smile
  [5, 6, MOUTH_HAPPY],
  [6, 6, MOUTH_HAPPY],
  [7, 6, MOUTH_HAPPY],
  [8, 6, MOUTH_HAPPY],
  [9, 6, MOUTH_HAPPY],
  [10, 6, MOUTH_HAPPY],
  // Raised arms (V-pose)
  ...rect(1, 5, 2, 2, SKIN),
  ...rect(13, 5, 2, 2, SKIN),
  // Stars
  [1, 3, STAR],
  [14, 3, STAR],
  [0, 6, STAR],
  [15, 7, STAR],
]

// Error: worried eyes, sweat
const errorPixels = (): Pixel[] => [
  ...baseBody(SHIRT_ERR),
  // Worried slant eyes
  [6, 4, EYE],
  [7, 3, EYE],
  [9, 4, EYE],
  [8, 3, EYE],
  // Wavy / worried mouth
  [6, 6, MOUTH_WORRY],
  [7, 6, '#FFF'],
  [8, 6, MOUTH_WORRY],
  [9, 6, '#FFF'],
  [10, 6, MOUTH_WORRY],
  // Big sweat drops
  [12, 2, SWEAT],
  [13, 4, SWEAT],
  [12, 5, SWEAT],
  [11, 3, SWEAT],
]

const pixelsByState: Record<MascotState, () => Pixel[]> = {
  idle: idlePixels,
  processing: processingPixels,
  done: donePixels,
  error: errorPixels,
}

const STATE_LABELS: Record<MascotState, string> = {
  idle: '대기 중이에요! 사진을 올려주세요 😊',
  processing: '열심히 도안을 만들고 있어요! 잠시만 기다려 주세요 ⌨️',
  done: '완성됐어요! 도안을 확인해보세요 🎉',
  error: '앗, 문제가 생겼어요. 다시 시도해 주세요 😓',
}

// Animation class per state
const ANIM: Record<MascotState, string> = {
  idle: 'animate-[mascot-idle_3s_ease-in-out_infinite]',
  processing: 'animate-[mascot-busy_0.5s_steps(2)_infinite]',
  done: 'animate-[mascot-done_0.6s_ease-in-out_3]',
  error: 'animate-[mascot-shake_0.4s_ease-in-out_2]',
}

const CELL = 16 // px per pixel cell
const GRID = 16 // 16×16 grid

const PixelMascot = ({ state }: PixelMascotProps) => {
  const [showTooltip, setShowTooltip] = useState(false)
  const pixels = pixelsByState[state]()

  return (
    <div className="relative flex flex-col items-center gap-2 select-none">
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute -top-14 left-1/2 z-50 w-max max-w-[220px] -translate-x-1/2 rounded-xl border border-gray-100 bg-white px-3 py-2 text-center text-xs font-medium text-gray-700 shadow-lg">
          {STATE_LABELS[state]}
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-white" />
        </div>
      )}

      {/* Pixel character SVG */}
      <div
        role="img"
        aria-label={STATE_LABELS[state]}
        title={STATE_LABELS[state]}
        className={['cursor-pointer transition-transform hover:scale-110', ANIM[state]].join(' ')}
        onClick={() => setShowTooltip((v) => !v)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <svg
          width={GRID * CELL}
          height={GRID * CELL}
          viewBox={`0 0 ${GRID} ${GRID}`}
          xmlns="http://www.w3.org/2000/svg"
          shapeRendering="crispEdges"
          style={{ imageRendering: 'pixelated' }}
        >
          {pixels.map(([col, row, color], i) => (
            <rect key={i} x={col} y={row} width={1} height={1} fill={color} />
          ))}
        </svg>
      </div>

      {/* State badge */}
      <StateBadge state={state} />
    </div>
  )
}

const BADGE_CONFIG: Record<
  MascotState,
  { label: string; bg: string; dot: string; text: string }
> = {
  idle: {
    label: '대기 중',
    bg: 'bg-gray-100',
    dot: 'bg-gray-400',
    text: 'text-gray-600',
  },
  processing: {
    label: '처리 중',
    bg: 'bg-yellow-50',
    dot: 'bg-yellow-400 animate-ping',
    text: 'text-yellow-700',
  },
  done: {
    label: '완료',
    bg: 'bg-green-50',
    dot: 'bg-green-500',
    text: 'text-green-700',
  },
  error: {
    label: '오류',
    bg: 'bg-red-50',
    dot: 'bg-red-500',
    text: 'text-red-700',
  },
}

const StateBadge = ({ state }: { state: MascotState }) => {
  const cfg = BADGE_CONFIG[state]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${cfg.bg} ${cfg.text}`}
    >
      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

export default PixelMascot
