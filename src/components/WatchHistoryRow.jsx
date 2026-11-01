import { IMG_BASE_URL } from '../api.js'

// Baris "Lanjutkan Menonton" yang menampilkan riwayat tontonan terbaru.
export default function WatchHistoryRow({ items, onPlay }) {
  if (!items || items.length === 0) return null

  return (
    <section className="mb-8">
      <h3 className="mx-10 mb-3 text-[1.4rem] font-bold max-md:mx-5 max-md:mb-2">Lanjutkan Menonton</h3>
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
              {Number(movie.duration) > 0 && Number(movie.progress_seconds) > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden rounded-b-md bg-white/25" aria-hidden="true">
                  <span
                    className="block h-full bg-[#e50914]"
                    style={{
                      width: `${Math.min(
                        100,
                        (Number(movie.progress_seconds) / Number(movie.duration)) * 100,
                      )}%`,
                    }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
