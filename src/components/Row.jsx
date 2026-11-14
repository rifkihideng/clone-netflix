import { usePaginatedFetch } from '../hooks/usePaginatedFetch.js'
import MovieCard from './MovieCard.jsx'

export default function Row({ title, fetchUrl, large = false, onPlay, onInfo, isInMyList, onToggleMyList }) {
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
          movies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              large={large}
              onPlay={onPlay}
              onInfo={onInfo}
              isInMyList={isInMyList}
              onToggleMyList={onToggleMyList}
            />
          ))}

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
