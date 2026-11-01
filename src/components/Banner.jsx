import { useEffect, useMemo, useRef, useState } from 'react'
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
    return (
      <div className="relative flex h-[90vh] items-center justify-center bg-[#141414] text-center">
        Memuat...
      </div>
    )
  }

  if (error) {
    return (
      <div className="relative flex h-[90vh] items-center justify-center bg-[#141414] px-10 text-center">
        <div>
          <p className="mb-2 max-w-[640px] text-[#b3b3b3]">{error}</p>
          <p className="mb-2 max-w-[640px] text-[#b3b3b3]">
            Isi <code>TMDB_API_KEY</code> di file <code>.env</code> (di sisi server), lalu jalankan
            ulang <code>pnpm run server</code>.
          </p>
        </div>
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
    <header className="relative flex h-[90vh] items-end overflow-hidden bg-[#141414] px-10 pb-[200px] max-md:h-[70vh] max-md:px-5 max-md:pb-[170px]">
      {slides.map((slide, i) => {
        const path = slide.backdrop_path || slide.poster_path
        const url = path ? `${IMG_BASE_URL}/original${path}` : ''
        return (
          <div
            key={slide.id}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[1200ms] ease-in-out ${
              i === index ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              backgroundImage: url
                ? `linear-gradient(to top, #141414 0%, transparent 60%), url(${url})`
                : 'none',
            }}
            aria-hidden={i !== index}
          />
        )
      })}

      <div className="relative z-[2] max-w-[600px] animate-[banner-fade-in_0.6s_ease]" key={movie.id}>
        <h2 className="mb-4 text-5xl font-extrabold [text-shadow:2px_2px_8px_rgba(0,0,0,0.6)] max-md:text-4xl">
          {title}
        </h2>
        <div className="mb-4 flex gap-3">
          <button
            className="rounded bg-white px-6 py-2.5 text-base font-bold text-black transition-colors duration-200 hover:bg-white/75"
            type="button"
            onClick={() => onPlay(movie)}
          >
            ▶ Putar
          </button>
          <button
            className="rounded bg-[rgba(109,109,110,0.7)] px-6 py-2.5 text-base font-bold text-white transition-colors duration-200 hover:bg-[rgba(109,109,110,0.4)]"
            type="button"
            onClick={() => onToggleMyList(movie)}
          >
            {inList ? '✓ Tersimpan' : '+ Daftar Saya'}
          </button>
        </div>
        <p className="text-base leading-6 text-[#e5e5e5] [text-shadow:1px_1px_4px_rgba(0,0,0,0.6)] max-md:line-clamp-3">
          {movie.overview}
        </p>
        <div className="mt-[18px] flex gap-2">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              className={`h-2 w-2 cursor-pointer rounded border-none bg-white/35 p-0 transition-[width,background-color] duration-300 ${
                i === index ? 'w-[26px] bg-white/85' : ''
              }`}
              onClick={() => setIndex(i)}
              aria-label={`Tampilkan ${slide.title || slide.name || slide.original_name}`}
            />
          ))}
        </div>
      </div>

      {poster && (
        <img
          className="absolute bottom-[200px] right-[60px] z-[2] w-[140px] rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.7)] max-md:hidden"
          src={poster}
          alt={title}
        />
      )}
      <div className="absolute inset-0 z-[1] bg-[linear-gradient(to_top,#141414_0%,transparent_55%)]" />
    </header>
  )
}
