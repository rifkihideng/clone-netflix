import { Search } from 'lucide-react'
import { BorderBeam } from '@/components/ui/border-beam-search'

export default function Navbar({ showBg, query, onQueryChange, onSearch }) {
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
                <input
                  className="min-w-0 flex-1 border-none bg-transparent p-0 font-[inherit] text-sm text-white outline-none placeholder:text-[#565656] [&::-webkit-search-cancel-button]:appearance-none"
                  type="search"
                  placeholder="Cari film atau serial..."
                  value={query}
                  onChange={(event) => onQueryChange(event.target.value)}
                  aria-label="Cari film atau serial"
                />
              </div>
            </BorderBeam>
          </form>

          <img
            className="h-9 w-9 rounded object-cover max-[360px]:hidden"
            src="https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png"
            alt="Profil"
          />
        </div>
      </div>
    </nav>
  )
}
