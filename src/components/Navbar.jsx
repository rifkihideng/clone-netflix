import { useState } from 'react'
import { ArrowLeftRight, LayoutGrid, LogOut, Search } from 'lucide-react'
import { BorderBeam } from '@/components/ui/border-beam-search'
import { useTypewriter } from '../hooks/useTypewriter.js'

export default function Navbar({ showBg, query, onQueryChange, onSearch, onOpenBrowse, user, onLogout, onSwitchProfile }) {
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
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 max-[380px]:gap-x-2">
        <div className="flex items-center gap-6 max-[380px]:gap-3">
          <button
            type="button"
            className="bg-transparent p-0 text-[1.8rem] font-black uppercase tracking-[1px] text-[#e50914] max-md:text-[1.4rem] max-[380px]:text-[1.15rem]"
            onClick={() => onSearch('')}
            aria-label="Kembali ke beranda"
          >
            NETFLIX
          </button>
          {onOpenBrowse && (
            <button
              type="button"
              className="bg-transparent p-0 text-sm font-semibold text-[#e5e5e5] transition-colors duration-200 hover:text-white"
              onClick={onOpenBrowse}
              aria-label="Jelajah genre"
            >
              <LayoutGrid
                className="hidden max-[380px]:block"
                aria-hidden="true"
                width={18}
                height={18}
              />
              <span className="max-[380px]:hidden">Jelajah</span>
            </button>
          )}
        </div>

        <form className="flex min-w-0 items-center max-md:order-last max-md:w-full" role="search" onSubmit={handleSubmit}>
            <BorderBeam size="line" colorVariant="colorful" duration={3.1} borderRadius={20}>
              <div className="flex h-[42px] w-60 items-center gap-2.5 rounded-[20px] bg-[#1d1d1d] px-[13px] text-[#565656] ring-1 ring-[#2c2f36]/50 max-md:w-full">
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

          {user && (
            <div className="flex items-center gap-2.5 max-[380px]:gap-2">
              <img
                src={user.avatar_url}
                alt={user.login}
                referrerPolicy="no-referrer"
                className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-[#2c2f36]/50 max-[380px]:h-8 max-[380px]:w-8"
              />
              {onSwitchProfile && (
                <button
                  type="button"
                  onClick={onSwitchProfile}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[#1d1d1d] text-[#b3b3b3] ring-1 ring-[#2c2f36]/50 transition-colors hover:text-white max-[380px]:h-8 max-[380px]:w-8"
                  aria-label="Ganti Profil"
                  title="Ganti Profil"
                >
                  <ArrowLeftRight aria-hidden="true" width={16} height={16} />
                </button>
              )}
              <button
                type="button"
                onClick={onLogout}
                className="flex h-9 items-center gap-1.5 rounded-full bg-[#1d1d1d] px-3 text-sm text-[#b3b3b3] ring-1 ring-[#2c2f36]/50 transition-colors hover:text-white max-[380px]:h-8 max-[380px]:px-2"
                aria-label="Keluar"
              >
                <LogOut aria-hidden="true" width={16} height={16} />
                <span className="max-[420px]:hidden">Keluar</span>
              </button>
            </div>
          )}
      </div>
    </nav>
  )
}
