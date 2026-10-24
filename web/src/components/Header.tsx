import { Palette } from 'lucide-react'

const Header = () => {
  return (
    <header className="fixed top-0 right-0 left-0 z-10 border-b border-gray-100 bg-white/90 backdrop-blur-md">
      <div className="container mx-auto px-4 py-3 md:px-8 md:py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 md:h-9 md:w-9">
            <Palette className="h-4 w-4 text-white md:h-5 md:w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-gray-900 md:text-xl">
            ColoringBook
          </span>
        </div>
      </div>
    </header>
  )
}

export default Header
