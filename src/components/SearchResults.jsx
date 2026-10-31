import './SearchResults.css'
import { IMG_BASE_URL } from '../api.js'
import { useFetch } from '../hooks/useFetch.js'

export default function SearchResults({ query, onPlay }) {
  const { data, loading, error } = useFetch('/search/multi', { query })

  const results = (data?.results ?? []).filter(
    (item) => item.poster_path || item.backdrop_path,
  )

  return (
    <section className="search">
      <h2 className="search__title">Hasil untuk “{query}”</h2>

      <div className="search__grid">
        {loading &&
          Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="search__skeleton" />
          ))}

        {error && <p className="search__error">{error}</p>}

        {!loading && !error && results.length === 0 && (
          <p className="search__empty">
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
                className="search__card"
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
                  className="search__poster"
                  src={`${IMG_BASE_URL}/w342${posterPath}`}
                  alt={name}
                  loading="lazy"
                />
                <div className="search__overlay">
                  <p className="search__name">{name}</p>
                  <p className="search__meta">
                    {mediaType} · ⭐ {rating}
                  </p>
                </div>
              </div>
            )
          })}
      </div>
    </section>
  )
}
