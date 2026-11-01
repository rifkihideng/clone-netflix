import { useState } from 'react'
import { Search, User } from 'lucide-react'
import { BorderBeam } from '@/components/ui/border-beam-search'
import { useTypewriter } from '../hooks/useTypewriter.js'

export default function Navbar({ showBg, query, onQueryChange, onSearch }) {
  const [focused, setFocused] = useState(false)
  const typedPlaceholder = useTypewriter()

  const handleSubmit = (event) => {
    event.preventDefault()
    onSearch(query)
  }

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 px-10 py-4 transition-colors duration-[400ms] max-md:px-5 max-md:py-3 ${
        showBg ? 'bg-[#141414]' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="bg-transparent p-0 text-[1.8rem] font-black uppercase tracking-[1px] text-[#e50914] max-md:text-[1.4rem]"
          onClick={() => onSearch('')}
          aria-label="Kembali ke beranda"
        >
          NETFLIX
        </button>

        <div className="flex items-center gap-4 max-md:gap-2">
          <form className="flex min-w-0 items-center" role="search" onSubmit={handleSubmit}>
            <BorderBeam size="line" colorVariant="colorful" duration={3.1} borderRadius={20}>
              <div className="flex h-[42px] w-60 items-center gap-2.5 rounded-[20px] bg-[#1d1d1d] px-[13px] text-[#565656] ring-1 ring-[#2c2f36]/50 max-md:w-40 max-[360px]:w-32">
                <button className="flex shrink-0 cursor-pointer items-center justify-center border-none bg-transparent p-0 text-[#565656] transition-colors duration-200 hover:text-white" type="submit" aria-label="Cari">
                  <Search aria-hidden="true" width={20} height={20} />
                </button>
                <div className="relative min-w-0 flex-1">
                  <input
                    className="w-full border-none bg-transparent p-0 font-[inherit] text-sm text-white outline-none placeholder:text-[#565656] [&::-webkit-search-cancel-button]:appearance-none"
                    type="search"
                    placeholder={focused ? 'Cari film atau serial...' : ''}
                    value={query}
                    onChange={(event) => onQueryChange(event.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    aria-label="Cari film atau serial"
                  />
                  {query === '' && !focused && (
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center overflow-hidden text-sm text-[#565656]">
                      <span className="truncate">{typedPlaceholder}</span>
                      <span className="ml-0.5 animate-pulse text-[#8b8b8b]">|</span>
                    </div>
                  )}
                </div>
              </div>
            </BorderBeam>
          </form>

          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1d1d1d] text-[#b3b3b3] ring-1 ring-[#2c2f36]/50 max-[360px]:hidden"
            role="img"
            aria-label="Profil"
          >
            <User aria-hidden="true" width={20} height={20} />
          </div>
        </div>
      </div>
    </nav>
  )
}
