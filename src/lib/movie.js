// Normalisasi objek film/serial ke bentuk ringkas yang disimpan ke database
// (dan dulu dipakai localStorage). Menghindari menyimpan field yang tidak perlu.
export function normalizeMovie(movie) {
  const isTV = movie.media_type === 'tv' || (!movie.media_type && movie.name && !movie.title)
  return {
    id: movie.id,
    title: movie.title || movie.name || movie.original_name || '',
    name: movie.name || movie.title || movie.original_name || '',
    overview: movie.overview || '',
    poster_path: movie.poster_path || movie.backdrop_path || null,
    backdrop_path: movie.backdrop_path || movie.poster_path || null,
    vote_average: movie.vote_average ?? 0,
    media_type: movie.media_type || (isTV ? 'tv' : 'movie'),
  }
}

// Tentukan tipe media: serial (tv) atau film (movie). Endpoint khusus film
// (mis. top_rated/discover) tidak menyertakan media_type, jadi pakai title/name.
export function getMediaType(movie) {
  if (movie.media_type === 'tv' || movie.media_type === 'movie') return movie.media_type
  return movie.name && !movie.title ? 'tv' : 'movie'
}

// Tahun rilis dari release_date (film) atau first_air_date (serial).
export function getYear(movie) {
  const date = movie.release_date || movie.first_air_date
  return date ? String(date).slice(0, 4) : ''
}

// Cari video YouTube yang cocok: utamakan Trailer resmi, lalu Trailer,
// Teaser, lalu video YouTube lain.
export function getVideoKey(videos) {
  const results = videos?.results ?? []
  const match =
    results.find((v) => v.site === 'YouTube' && v.type === 'Trailer' && v.official) ||
    results.find((v) => v.site === 'YouTube' && v.type === 'Trailer') ||
    results.find((v) => v.site === 'YouTube' && v.type === 'Teaser') ||
    results.find((v) => v.site === 'YouTube')
  return match?.key ?? null
}
