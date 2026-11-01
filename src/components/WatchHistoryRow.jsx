import './Row.css'
import { IMG_BASE_URL } from '../api.js'

// Baris "Lanjutkan Menonton" yang menampilkan riwayat tontonan terbaru.
export default function WatchHistoryRow({ items, onPlay }) {
  if (!items || items.length === 0) return null

  return (
    <section className="row">
      <h3 className="row__title">Lanjutkan Menonton</h3>
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
              {Number(movie.duration) > 0 && Number(movie.progress_seconds) > 0 && (
                <div className="row__progress" aria-hidden="true">
                  <span
                    className="row__progress-bar"
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
