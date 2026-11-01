import { Check, Plus } from 'lucide-react'
import { IMG_BASE_URL } from '../api.js'
import { usePaginatedFetch } from '../hooks/usePaginatedFetch.js'

export default function Row({ title, fetchUrl, large = false, onPlay, isInMyList, onToggleMyList }) {
  const { items: movies, loading, loadingMore, moreError, error, hasMore, loadMore } = usePaginatedFetch(fetchUrl)

  return (
    <section className="mb-8">
      <h3 className="mx-10 mb-3 text-[1.4rem] font-bold max-md:mx-5 max-md:mb-2">{title}</h3>
      <div className="flex gap-2.5 overflow-x-auto px-10 py-5 [scroll-behavior:smooth] [&::-webkit-scrollbar]:hidden max-md:px-5 max-md:py-4">
        {loading &&
          Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className={`shrink-0 animate-[shimmer_1.4s_infinite] rounded-md bg-[linear-gradient(90deg,#1f1f1f_25%,#2a2a2a_50%,#1f1f1f_75%)] bg-[length:200%_100%] ${
                large ? 'h-[330px] w-[220px]' : 'h-[270px] w-[180px]'
              }`}
            />
          ))}

        {error && <p className="px-10 text-[#b3b3b3]">{error}</p>}

        {!loading &&
          !error &&
          movies.map((movie) => {
            const name = movie.title || movie.name || movie.original_name
            const posterPath = movie.poster_path || movie.backdrop_path
            if (!posterPath) return null
            const inList = isInMyList?.(movie.id) ?? false
            return (
              <div
                key={movie.id}
                className={`group relative z-[1] shrink-0 cursor-pointer transition-transform duration-300 hover:z-[2] hover:scale-[1.12] ${
                  large ? 'w-[220px] max-md:w-[160px]' : 'w-[180px] max-md:w-[140px]'
                }`}
                title={name}
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
                  src={`${IMG_BASE_URL}/${large ? 'w500' : 'w342'}${posterPath}`}
                  alt={name}
                  loading="lazy"
                />
                <div className="absolute bottom-0 left-0 right-0 rounded-b-md bg-[linear-gradient(to_top,rgba(0,0,0,0.9),transparent)] p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <p className="mb-1 text-sm font-semibold">{name}</p>
                  <p className="text-xs text-[#f5c518]">
                    ⭐ {Math.round(movie.vote_average * 10) / 10}
                  </p>
                  {onToggleMyList && (
                    <button
                      className="absolute right-2 top-2 flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full bg-[rgba(20,20,20,0.85)] text-white transition-colors duration-200 hover:bg-[#141414]"
                      type="button"
                      aria-label={
                        inList
                          ? `Hapus ${name} dari Daftar Saya`
                          : `Tambah ${name} ke Daftar Saya`
                      }
                      onClick={(event) => {
                        event.stopPropagation()
                        onToggleMyList(movie)
                      }}
                    >
                      {inList ? <Check size={16} /> : <Plus size={16} />}
                    </button>
                  )}
                </div>
              </div>
            )
          })}

        {!loading && !error && hasMore && (
          <button
            className="flex min-h-[270px] w-[120px] shrink-0 cursor-pointer items-center justify-center rounded-md border border-white/25 bg-transparent text-base font-semibold text-white transition-colors duration-200 hover:border-white/50 hover:bg-white/10 disabled:cursor-default disabled:opacity-50"
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Memuat...' : moreError ? 'Coba lagi' : 'Lainnya'}
          </button>
        )}
      </div>
    </section>
  )
}
