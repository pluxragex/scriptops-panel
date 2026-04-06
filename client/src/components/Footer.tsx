import { Heart } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-[#151515] border-t border-[#ffffff10] transition-colors duration-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-12 items-center justify-center">
          <div className="flex items-center space-x-1 text-sm text-[#f3f3f398]">
            <span>Powered</span>
            <Heart className="h-3 w-3 text-[#a476ff] fill-current" />
            <span>by</span>
            <a
              href="https://t.me/pluxragex"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#dfdfdf] hover:text-[#a476ff] transition-colors"
            >
              pluxragex
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
