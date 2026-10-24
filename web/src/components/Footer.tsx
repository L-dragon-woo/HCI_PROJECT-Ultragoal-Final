import { ExternalLink, Palette } from 'lucide-react'

const Footer = () => {
  return (
    <footer className="border-t border-gray-100 bg-white py-8 md:py-10">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex flex-col gap-1 text-center md:text-left">
            <div className="flex items-center justify-center gap-2 md:justify-start">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-600">
                <Palette className="h-3.5 w-3.5 text-white" />
              </div>
              <p className="text-base font-bold text-gray-900">ColoringBook</p>
            </div>
            <p className="text-xs text-gray-400">
              © 2026 HCI Team Project. All rights reserved.
            </p>
          </div>

          <a
            href="https://github.com/L-dragon-woo/HCI_PROJECT"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
          >
            <ExternalLink className="h-4 w-4" />
            <span>GitHub</span>
          </a>
        </div>
      </div>
    </footer>
  )
}

export default Footer
