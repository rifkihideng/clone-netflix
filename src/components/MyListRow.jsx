import { X } from 'lucide-react'
import { IMG_BASE_URL } from '../api.js'

export default function MyListRow({ items, onPlay, onRemove }) {
  if (!items || items.length === 0) return null

  return (
    <section className="mb-8">
      <h3 className="mx-10 mb-3 text-[1.4rem] font-bold max-md:mx-5 max-md:mb-2">Daftar Saya</h3>
      <div className="flex gap-2.5 overflow-x-auto px-10 py-5 [scroll-behavior:smooth] [&::-webkit-scrollbar]:hidden max-md:px-5 max-md:py-4">
        {items.map((movie) => {
          const name = movie.title || movie.name || ''
          const posterPath = movie.poster_path || movie.backdrop_path
          if (!posterPath) return null

          const rating = movie.vote_average
            ? Math.round(movie.vote_average * 10) / 10
            : '—'

          return (
            <div
              key={movie.id}
              className="group relative z-[1] w-[180px] shrink-0 cursor-pointer transition-transform duration-300 hover:z-[2] hover:scale-[1.12] max-md:w-[140px]"
              role="button"
              tabIndex={0}
              onClick={() => onPlay(movie)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onPlay(movie)
                }
              }}
            >
              <img
                className="h-auto w-full rounded-md bg-[#333] object-cover"
                src={`${IMG_BASE_URL}/w342${posterPath}`}
                alt={name}
                loading="lazy"
              />
              <div className="absolute bottom-0 left-0 right-0 rounded-b-md bg-[linear-gradient(to_top,rgba(0,0,0,0.9),transparent)] p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <p className="mb-1 text-sm font-semibold">{name}</p>
                <p className="text-xs text-[#f5c518]">⭐ {rating}</p>
              </div>
              <button
                className="absolute right-2 top-2 z-[2] hidden h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full bg-[rgba(20,20,20,0.85)] text-white group-hover:flex"
                type="button"
                aria-label={`Hapus ${name} dari Daftar Saya`}
                onClick={(event) => {
                  event.stopPropagation()
                  onRemove(movie)
                }}
              >
                <X size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
