import { ArrowLeftRight } from 'lucide-react'
import React, { useState, useRef, useEffect } from 'react'

interface ImageComparisonProps {
  beforeImage: string
  afterImage: string
}

const ImageComparison: React.FC<ImageComparisonProps> = ({
  beforeImage,
  afterImage,
}) => {
  const [sliderPosition, setSliderPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    setSliderPosition((x / rect.width) * 100)
  }

  const handleMouseUp = () => setIsDragging(false)
  const handleTouchEnd = () => setIsDragging(false)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      handleMove(e.clientX)
    }
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return
      handleMove(e.touches[0].clientX)
    }
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      window.addEventListener('touchmove', handleTouchMove)
      window.addEventListener('touchend', handleTouchEnd)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isDragging])

  return (
    <div className="flex w-full flex-col gap-2">
      {/* Labels row */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-medium text-gray-400">원본 사진</span>
        <span className="text-xs font-medium text-gray-400">컬러링 도안</span>
      </div>

      {/* Comparison container */}
      <div
        ref={containerRef}
        role="slider"
        aria-label="원본과 도안 비교 슬라이더"
        aria-valuenow={Math.round(sliderPosition)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') setSliderPosition((p) => Math.max(0, p - 2))
          if (e.key === 'ArrowRight') setSliderPosition((p) => Math.min(100, p + 2))
        }}
        className="relative aspect-4/3 w-full max-w-4xl overflow-hidden rounded-2xl shadow-md select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
      >
        {/* After Image — bottom layer */}
        <img
          src={afterImage}
          alt="컬러링 도안"
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />

        {/* Before Image — clipped top layer */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <img
            src={beforeImage}
            alt="원본 사진"
            className="h-full w-full object-cover"
            draggable={false}
          />
        </div>

        {/* Divider line */}
        <div
          className="absolute inset-y-0 z-20 w-px bg-white/80 shadow-[0_0_8px_rgba(0,0,0,0.3)]"
          style={{ left: `${sliderPosition}%` }}
        />

        {/* Drag handle */}
        <div
          className="absolute inset-y-0 z-30 -ml-5 w-10 cursor-ew-resize"
          style={{ left: `${sliderPosition}%` }}
          onMouseDown={() => setIsDragging(true)}
          onTouchStart={() => setIsDragging(true)}
        >
          <div
            className={[
              'absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white p-2 shadow-xl ring-2 transition-all',
              isDragging ? 'scale-110 ring-violet-400' : 'ring-black/10',
            ].join(' ')}
          >
            <ArrowLeftRight className="h-4 w-4 text-gray-600 md:h-5 md:w-5" />
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-gray-400">
        슬라이더를 드래그하여 원본과 도안을 비교해보세요
      </p>
    </div>
  )
}

export default ImageComparison
