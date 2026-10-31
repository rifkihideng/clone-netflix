import { Check, Plus } from 'lucide-react'
import './Row.css'
import { IMG_BASE_URL } from '../api.js'
import { useFetch } from '../hooks/useFetch.js'

export default function Row({ title, fetchUrl, large = false, onPlay, isInMyList, onToggleMyList }) {
  const { data, loading, error } = useFetch(fetchUrl)
  const movies = data?.results ?? []

  return (
    <section className="row">
      <h3 className="row__title">{title}</h3>
      <div className="row__posters">
        {loading &&
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`row__skeleton ${large ? 'row__skeleton--large' : ''}`} />
          ))}

        {error && <p className="row__error">{error}</p>}

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
                className={`row__card ${large ? 'row__card--large' : ''}`}
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
                  className="row__poster"
                  src={`${IMG_BASE_URL}/${large ? 'w500' : 'w342'}${posterPath}`}
                  alt={name}
                  loading="lazy"
                />
                <div className="row__overlay">
                  <p className="row__name">{name}</p>
                  <p className="row__rating">⭐ {Math.round(movie.vote_average * 10) / 10}</p>
                  {onToggleMyList && (
                    <button
                      className="row__list-toggle"
                      type="button"
                      aria-label={inList ? `Hapus ${name} dari Daftar Saya` : `Tambah ${name} ke Daftar Saya`}
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
      </div>
    </section>
  )
}
