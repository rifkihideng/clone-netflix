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
