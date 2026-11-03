// Skema database relasional (Turso/libSQL) untuk fitur Daftar Saya & riwayat
// tontonan. Modul ini dipakai bersama oleh server Express (server/index.js) dan
// Vercel Function (api/index.js) supaya definisi skema, migrasi, dan penulisan
// data tidak terduplikasi.
//
// Relasi antar tabel:
//
//   devices (1) ────< my_list       (N) >──── movies (1)
//   devices (1) ────< watch_history (N) >──── movies (1)
//
// Sebelumnya data film didenormalisasi (disalin) ke my_list & watch_history.
// Sekarang detail film hanya disimpan sekali di tabel `movies`, lalu tabel
// my_list/watch_history menyimpan kunci asing (device_id, movie_id).

const DEVICES_DDL = `
  CREATE TABLE IF NOT EXISTS devices (
    device_id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL
  )
`

const MOVIES_DDL = `
  CREATE TABLE IF NOT EXISTS movies (
    movie_id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    name TEXT NOT NULL,
    overview TEXT,
    poster_path TEXT,
    backdrop_path TEXT,
    vote_average REAL DEFAULT 0,
    media_type TEXT DEFAULT 'movie',
    updated_at INTEGER NOT NULL
  )
`

const MY_LIST_DDL = `
  CREATE TABLE IF NOT EXISTS my_list (
    device_id TEXT NOT NULL,
    movie_id INTEGER NOT NULL,
    added_at INTEGER NOT NULL,
    PRIMARY KEY (device_id, movie_id),
    FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE,
    FOREIGN KEY (movie_id) REFERENCES movies(movie_id) ON DELETE CASCADE
  )
`

const WATCH_HISTORY_DDL = `
  CREATE TABLE IF NOT EXISTS watch_history (
    device_id TEXT NOT NULL,
    movie_id INTEGER NOT NULL,
    progress_seconds REAL DEFAULT 0,
    duration REAL DEFAULT 0,
    watched_at INTEGER NOT NULL,
    PRIMARY KEY (device_id, movie_id),
    FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE,
    FOREIGN KEY (movie_id) REFERENCES movies(movie_id) ON DELETE CASCADE
  )
`

// Kolom yang dikembalikan ke klien untuk baris film tersimpan. Alias `id`
// dipertahankan supaya kontrak API ke frontend tidak berubah.
export const MOVIE_COLUMNS = `
  m.movie_id AS id, m.title, m.name, m.overview, m.poster_path, m.backdrop_path,
  m.vote_average, m.media_type
`

// Kolom tambahan untuk riwayat tontonan: posisi & durasi tontonan terakhir.
export const WATCH_COLUMNS = `
  m.movie_id AS id, m.title, m.name, m.overview, m.poster_path, m.backdrop_path,
  m.vote_average, m.media_type, l.progress_seconds, l.duration
`

// Pilih hanya field yang disimpan supaya payload dari klien tidak menulis kolom asing.
export function normalizeMovie(movie) {
  if (!movie || typeof movie !== 'object') return null
  const id = Number(movie.id)
  if (!Number.isFinite(id)) return null
  const isTV = movie.media_type === 'tv' || (!movie.media_type && movie.name && !movie.title)
  return {
    id,
    title: movie.title || movie.name || movie.original_name || '',
    name: movie.name || movie.title || movie.original_name || '',
    overview: movie.overview || '',
    poster_path: movie.poster_path || movie.backdrop_path || null,
    backdrop_path: movie.backdrop_path || movie.poster_path || null,
    vote_average: Number(movie.vote_average) || 0,
    media_type: movie.media_type || (isTV ? 'tv' : 'movie'),
  }
}

async function tableExists(db, table) {
  const result = await db.execute({
    sql: 'SELECT 1 FROM sqlite_master WHERE type = ? AND name = ? LIMIT 1',
    args: ['table', table],
  })
  return result.rows.length > 0
}

async function hasColumn(db, table, column) {
  if (!(await tableExists(db, table))) return false
  const result = await db.execute(`PRAGMA table_info(${table})`)
  return result.rows.some((row) => row.name === column)
}

// Migrasi skema lama (denormalisasi) ke skema relasional. Idempoten: aman
// dipanggil berulang kali. Data lama dipindahkan, lalu tabel lama dihapus.
async function migrate(db) {
  // Nonaktifkan enforcement FK selama migrasi agar urutan penyalinan data
  // (parent -> child) tidak terganggu. Pragma ini per-koneksi; untuk Turso
  // via HTTP berlaku per pernyataan sehingga hanya berpengaruh pada koneksi
  // lokal. Dibungkus try/catch karena sebagian backend libSQL menolak pragma
  // pengubah state lewat HTTP — bukan kondisi yang menggagalkan migrasi.
  try {
    await db.execute('PRAGMA foreign_keys = OFF')
  } catch {}

  await db.execute(DEVICES_DDL)
  await db.execute(MOVIES_DDL)

  // Skema lama ditandai dengan kolom `title` langsung di my_list/watch_history.
  const myListOld = await hasColumn(db, 'my_list', 'title')
  if (myListOld) await db.execute('ALTER TABLE my_list RENAME TO my_list_old')

  const watchOld = await hasColumn(db, 'watch_history', 'title')
  if (watchOld) await db.execute('ALTER TABLE watch_history RENAME TO watch_history_old')

  await db.execute(MY_LIST_DDL)
  await db.execute(WATCH_HISTORY_DDL)

  // Tabel *_old yang tersisa (baru direname di atas atau sisa migrasi yang
  // terpotong) harus diproses agar tidak ada data yang hilang.
  const legacyMyList = await tableExists(db, 'my_list_old')
  const legacyWatch = await tableExists(db, 'watch_history_old')

  if (legacyMyList || legacyWatch) {
    // devices: kumpulkan device_id dari kedua tabel lama.
    const deviceSources = []
    if (legacyMyList) deviceSources.push('SELECT device_id, added_at AS ts FROM my_list_old')
    if (legacyWatch) deviceSources.push('SELECT device_id, watched_at AS ts FROM watch_history_old')
    if (deviceSources.length > 0) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO devices (device_id, created_at)
              SELECT device_id, MIN(ts) FROM (${deviceSources.join(' UNION ALL ')}) GROUP BY device_id`,
      })
    }

    // movies: detail film yang sebelumnya terduplikasi, disatukan ke satu tabel.
    if (legacyMyList) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO movies
                (movie_id, title, name, overview, poster_path, backdrop_path, vote_average, media_type, updated_at)
              SELECT movie_id, title, name, overview, poster_path, backdrop_path, vote_average, media_type, added_at
              FROM my_list_old`,
      })
    }
    if (legacyWatch) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO movies
                (movie_id, title, name, overview, poster_path, backdrop_path, vote_average, media_type, updated_at)
              SELECT movie_id, title, name, overview, poster_path, backdrop_path, vote_average, media_type, watched_at
              FROM watch_history_old`,
      })
    }

    // my_list/watch_history kini hanya menyimpan relasi (kunci asing).
    if (legacyMyList) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO my_list (device_id, movie_id, added_at)
              SELECT device_id, movie_id, added_at FROM my_list_old`,
      })
    }
    if (legacyWatch) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO watch_history (device_id, movie_id, progress_seconds, duration, watched_at)
              SELECT device_id, movie_id, progress_seconds, duration, watched_at FROM watch_history_old`,
      })
    }

    if (legacyMyList) await db.execute('DROP TABLE IF EXISTS my_list_old')
    if (legacyWatch) await db.execute('DROP TABLE IF EXISTS watch_history_old')
  }

  try {
    await db.execute('PRAGMA foreign_keys = ON')
  } catch {}
}

// Memoisasi promise migrasi per klien db supaya tidak dijalankan ulang di
// setiap permintaan. Bila gagal, cache dihapus agar percobaan berikutnya
// mengulang migrasi dari awal.
const schemaPromises = new WeakMap()

export function ensureSchema(db) {
  let promise = schemaPromises.get(db)
  if (!promise) {
    promise = migrate(db).catch((err) => {
      schemaPromises.delete(db)
      throw err
    })
    schemaPromises.set(db, promise)
  }
  return promise
}

// Catat device (user tanpa login) bila belum ada. Dibuat sekali, lalu dipakai
// oleh relasi my_list/watch_history.
export async function upsertDevice(db, deviceId) {
  await db.execute({
    sql: `INSERT INTO devices (device_id, created_at) VALUES (?, ?)
          ON CONFLICT (device_id) DO NOTHING`,
    args: [deviceId, Date.now()],
  })
}

// Simpan/segarkan detail film ke tabel movies sebelum direlasikan.
export async function upsertMovie(db, movie) {
  await db.execute({
    sql: `INSERT INTO movies
            (movie_id, title, name, overview, poster_path, backdrop_path, vote_average, media_type, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT (movie_id) DO UPDATE SET
            title = excluded.title,
            name = excluded.name,
            overview = excluded.overview,
            poster_path = excluded.poster_path,
            backdrop_path = excluded.backdrop_path,
            vote_average = excluded.vote_average,
            media_type = excluded.media_type,
            updated_at = excluded.updated_at`,
    args: [
      movie.id,
      movie.title,
      movie.name,
      movie.overview,
      movie.poster_path,
      movie.backdrop_path,
      movie.vote_average,
      movie.media_type,
      Date.now(),
    ],
  })
}
