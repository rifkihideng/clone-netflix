import { X } from 'lucide-react'
import './Row.css'
import { IMG_BASE_URL } from '../api.js'

export default function MyListRow({ items, onPlay, onRemove }) {
  if (!items || items.length === 0) return null

  return (
    <section className="row">
      <h3 className="row__title">Daftar Saya</h3>
      <div className="row__posters">
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
              className="row__card"
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
                src={`${IMG_BASE_URL}/w342${posterPath}`}
                alt={name}
                loading="lazy"
              />
              <div className="row__overlay">
                <p className="row__name">{name}</p>
                <p className="row__rating">⭐ {rating}</p>
              </div>
              <button
                className="row__remove"
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
