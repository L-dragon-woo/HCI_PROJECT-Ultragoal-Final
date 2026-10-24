import { ImagePlus, X } from 'lucide-react'
import { useRef, useState, useCallback } from 'react'

interface PhotoInputProps {
  image?: string | null
  setImage: (image: string | null) => void
  setFile: (file: File | null) => void
  disabled?: boolean
}

const PhotoInput = ({ image, setImage, setFile, disabled }: PhotoInputProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const processFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return
      setFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    },
    [setFile, setImage],
  )

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    } else {
      setFile(null)
      setImage(null)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (disabled) return
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  const triggerFileInput = () => {
    if (disabled) return
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    setFile(null)
    setImage(null)
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="사진 업로드 영역. 클릭하거나 드래그하여 파일을 업로드하세요."
      className={[
        'relative flex aspect-4/3 w-full max-w-4xl items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed bg-white transition-all duration-200',
        disabled
          ? 'cursor-not-allowed opacity-60'
          : image
            ? 'cursor-pointer border-transparent'
            : isDragOver
              ? 'cursor-copy scale-[1.01] border-violet-400 bg-violet-50 shadow-lg shadow-violet-100'
              : 'cursor-pointer border-gray-200 hover:border-violet-300 hover:bg-gray-50/50',
      ].join(' ')}
      onClick={triggerFileInput}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') triggerFileInput()
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {image ? (
        <>
          <img
            src={image}
            alt="업로드된 사진"
            className="h-full w-full object-contain"
          />
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              aria-label="이미지 제거"
              className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
            클릭하여 다른 사진 선택
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-4 px-6 text-center">
          <div
            className={[
              'flex h-14 w-14 items-center justify-center rounded-2xl transition-colors md:h-16 md:w-16',
              isDragOver ? 'bg-violet-100' : 'bg-gray-100',
            ].join(' ')}
          >
            <ImagePlus
              className={[
                'h-7 w-7 md:h-8 md:w-8',
                isDragOver ? 'text-violet-600' : 'text-gray-400',
              ].join(' ')}
            />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-base font-semibold text-gray-800 md:text-lg">
              {isDragOver ? '여기에 놓으세요' : '사진을 업로드하세요'}
            </p>
            <p className="text-xs text-gray-400 md:text-sm">
              클릭하거나 드래그하여 파일을 올려주세요
            </p>
            <p className="mt-0.5 text-xs text-gray-300">
              JPG, PNG, WEBP · 최대 20MB
            </p>
          </div>
        </div>
      )}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleImageUpload}
        aria-hidden="true"
      />
    </div>
  )
}

export default PhotoInput
