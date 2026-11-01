import { useEffect, useMemo, useRef, useState } from 'react'
import './Banner.css'
import { IMG_BASE_URL } from '../api.js'
import { useFetch } from '../hooks/useFetch.js'

// Durasi tiap slide (ms) dan jumlah maksimal film yang masuk slider.
const SLIDE_INTERVAL = 6000
const MAX_SLIDES = 8

export default function Banner({ fetchUrl, onPlay, isInMyList, onToggleMyList, onLoaded }) {
  const { data, loading, error } = useFetch(fetchUrl)
  const [index, setIndex] = useState(0)
  const loadedRef = useRef(false)

  // Beri tahu App ketika data pertama selesai dimuat (untuk menutup splash).
  useEffect(() => {
    if (!loading && !loadedRef.current) {
      loadedRef.current = true
      onLoaded?.()
    }
  }, [loading, onLoaded])

  // Pilih film yang punya backdrop (atau poster) dan sinopsis,
  // supaya tiap slide selalu menampilkan gambar + teks yang lengkap.
  const slides = useMemo(() => {
    const list = data?.results ?? []
    return list
      .filter((movie) => (movie.backdrop_path || movie.poster_path) && movie.overview)
      .slice(0, MAX_SLIDES)
  }, [data])

  // Putar slider otomatis, lalu kembali ke slide pertama.
  useEffect(() => {
    if (slides.length < 2) return
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % slides.length)
    }, SLIDE_INTERVAL)
    return () => clearInterval(timer)
  }, [slides.length])

  if (loading) {
    return <div className="banner banner--loading">Memuat...</div>
  }

  if (error) {
    return (
      <div className="banner banner--error">
        <p>{error}</p>
        <p>
          Isi <code>TMDB_API_KEY</code> di file <code>.env</code> (di sisi server), lalu jalankan ulang
          <code>pnpm run server</code>.
        </p>
      </div>
    )
  }

  if (slides.length === 0) return null

  const movie = slides[index]
  const inList = isInMyList?.(movie.id) ?? false
  const title = movie.title || movie.name || movie.original_name
  const backdropPath = movie.backdrop_path || movie.poster_path
  const backdrop = backdropPath ? `${IMG_BASE_URL}/original${backdropPath}` : ''
  const poster = movie.poster_path ? `${IMG_BASE_URL}/w500${movie.poster_path}` : ''

  return (
    <header className="banner">
      {slides.map((slide, i) => {
        const path = slide.backdrop_path || slide.poster_path
        const url = path ? `${IMG_BASE_URL}/original${path}` : ''
        return (
          <div
            key={slide.id}
            className={`banner__bg ${i === index ? 'banner__bg--active' : ''}`}
            style={{
              backgroundImage: url
                ? `linear-gradient(to top, #141414 0%, transparent 60%), url(${url})`
                : 'none',
            }}
            aria-hidden={i !== index}
          />
        )
      })}

      <div className="banner__contents" key={movie.id}>
        <h2 className="banner__title">{title}</h2>
        <div className="banner__buttons">
          <button
            className="banner__button banner__button--play"
            type="button"
            onClick={() => onPlay(movie)}
          >
            ▶ Putar
          </button>
          <button
            className="banner__button"
            type="button"
            onClick={() => onToggleMyList(movie)}
          >
            {inList ? '✓ Tersimpan' : '+ Daftar Saya'}
          </button>
        </div>
        <p className="banner__description">{movie.overview}</p>
        <div className="banner__dots">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              className={`banner__dot ${i === index ? 'banner__dot--active' : ''}`}
              onClick={() => setIndex(i)}
              aria-label={`Tampilkan ${slide.title || slide.name || slide.original_name}`}
            />
          ))}
        </div>
      </div>

      {poster && <img className="banner__poster" src={poster} alt={title} />}
      <div className="banner__fade" />
    </header>
  )
}
