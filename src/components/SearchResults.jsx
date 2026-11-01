import { IMG_BASE_URL } from '../api.js'
import { usePaginatedFetch } from '../hooks/usePaginatedFetch.js'

export default function SearchResults({ query, onPlay }) {
  const { items, loading, loadingMore, moreError, error, hasMore, loadMore } = usePaginatedFetch(
    '/search/multi',
    { query },
  )

  const results = items.filter((item) => item.poster_path || item.backdrop_path)

  return (
    <section className="px-10 pb-10 max-md:px-5 max-md:pb-6">
      <h2 className="mb-5 text-[1.6rem] font-bold">Hasil untuk “{query}”</h2>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-x-4 gap-y-6 max-md:grid-cols-[repeat(auto-fill,minmax(120px,1fr))] max-md:gap-x-3 max-md:gap-y-4">
        {loading &&
          Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] animate-[shimmer_1.4s_infinite] rounded-md bg-[linear-gradient(90deg,#1f1f1f_25%,#2a2a2a_50%,#1f1f1f_75%)] bg-[length:200%_100%]"
            />
          ))}

        {error && <p className="col-span-full py-6 text-[#b3b3b3]">{error}</p>}

        {!loading && !error && results.length === 0 && (
          <p className="col-span-full py-6 text-[#b3b3b3]">
            Tidak ada hasil untuk “{query}”. Coba kata kunci lain.
          </p>
        )}

        {!loading &&
          !error &&
          results.map((item) => {
            const name = item.title || item.name || item.original_name
            const posterPath = item.poster_path || item.backdrop_path
            const mediaType = item.media_type === 'tv' ? 'Serial' : 'Film'
            const rating = item.vote_average ? Math.round(item.vote_average * 10) / 10 : '—'

            return (
              <div
                key={`${item.media_type}-${item.id}`}
                className="group relative cursor-pointer transition-transform duration-300 hover:z-[2] hover:scale-[1.06]"
                role="button"
                tabIndex={0}
                onClick={() => onPlay(item)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onPlay(item)
                  }
                }}
              >
                <img
                  className="aspect-[2/3] w-full rounded-md bg-[#333] object-cover"
                  src={`${IMG_BASE_URL}/w342${posterPath}`}
                  alt={name}
                  loading="lazy"
                />
                <div className="absolute bottom-0 left-0 right-0 rounded-b-md bg-[linear-gradient(to_top,rgba(0,0,0,0.9),transparent)] p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <p className="mb-1 text-sm font-semibold">{name}</p>
                  <p className="text-xs text-[#b3b3b3]">
                    {mediaType} · ⭐ {rating}
                  </p>
                </div>
              </div>
            )
          })}

        {!loading && !error && hasMore && (
          <button
            className="col-span-full mt-2 justify-self-center rounded-md border border-white/25 bg-transparent px-7 py-3 text-[0.95rem] font-semibold text-white transition-colors duration-200 hover:border-white/50 hover:bg-white/10 disabled:cursor-default disabled:opacity-50"
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Memuat...' : moreError ? 'Coba lagi' : 'Muat Lebih Banyak'}
          </button>
        )}
      </div>
    </section>
  )
}
