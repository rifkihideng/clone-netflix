import { useMemo } from 'react'
import { IMG_BASE_URL } from '../api.js'
import { useFetch } from '../hooks/useFetch.js'
import { Marquee } from './ui/Marquee.jsx'

// Kartu poster film untuk marquee latar halaman login.
function PosterCard({ movie }) {
  const name = movie.title || movie.name || movie.original_name || ''
  const poster = movie.poster_path || movie.backdrop_path
  if (!poster) return null
  return (
    <div className="w-[150px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[#1f1f1f] shadow-[0_12px_30px_rgba(0,0,0,0.55)]">
      <img
        src={`${IMG_BASE_URL}/w342${poster}`}
        alt={name}
        loading="lazy"
        className="h-auto w-full object-cover"
      />
    </div>
  )
}

// Latar 3D halaman login: kolom-kolom poster film berjalan vertikal (marquee)
// dengan perspektif 3D, lalu memudar ke latar gelap di tepiannya.
export default function LoginMarquee() {
  const { data } = useFetch('/trending/all/week')

  const movies = useMemo(
    () =>
      (data?.results ?? [])
        .filter((movie) => movie.poster_path || movie.backdrop_path)
        .slice(0, 24),
    [data],
  )

  if (movies.length === 0) return null

  const COLUMN_COUNT = 6
  const columns = Array.from({ length: COLUMN_COUNT }, (_, index) =>
    movies.filter((_, movieIndex) => movieIndex % COLUMN_COUNT === index),
  )

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden [perspective:1200px]"
    >
      <div
        className="absolute left-1/2 top-1/2 flex flex-row items-center gap-4 opacity-45"
        style={{
          transform:
            'translate(-50%, -50%) translateZ(-260px) rotateX(18deg) rotateY(-10deg) rotateZ(16deg)',
        }}
      >
        {columns.map((list, index) => (
          <Marquee
            key={index}
            vertical
            reverse={index % 2 === 1}
            repeat={3}
            className="h-[150vh]"
            style={{ '--duration': `${60 + index * 10}s` }}
          >
            {list.map((movie) => (
              <PosterCard key={movie.id} movie={movie} />
            ))}
          </Marquee>
        ))}
      </div>

      {/* Gradasi tepi agar marquee menyatu dengan latar gelap Netflix. */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#141414] to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#141414] to-transparent" />
      <div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-[#141414] to-transparent" />
      <div className="absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-[#141414] to-transparent" />
    </div>
  )
}
