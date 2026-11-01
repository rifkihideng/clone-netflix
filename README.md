# Netflix Clone

<p align="center">
  <img src="https://zonalogo.com/assets/netflix-logo-png-svg.webp?asset=2015" alt="Logo Netflix" width="220" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?style=flat&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/Express-4-000000?style=flat&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/API-TMDB-01B4E4?style=flat&logo=themoviedatabase&logoColor=white" alt="TMDB API" />
  <img src="https://img.shields.io/badge/Database-Turso%2FlibSQL-4FF8D2?style=flat&logo=turso&logoColor=black" alt="Turso/libSQL" />
</p>

<p align="center">
  <em>Proyek klon untuk pembelajaran. Netflix adalah merek dagang milik Netflix, Inc.</em>
</p>

Ini proyek iseng bikin tampilan Netflix pakai React + Vite. Film dan serialnya
diambil langsung dari [The Movie Database (TMDB)](https://www.themoviedb.org/),
jadi bukan data dummy. Selain bisa cari dan tonton trailer, ada fitur simpan ke
**Daftar Saya** plus **riwayat tontonan** juga.

## Fitur

- Banner film trending yang berganti sendiri (cross-fade), lengkap dengan sinopsisnya.
- Deretan film yang bisa digeser ke samping: trending, rating tertinggi, aksi, komedi, horor, dan dokumenter.
- Pencarian film dan serial.
- Kartu film membesar saat disorot kursor, persis seperti rasanya pakai Netflix.
- Loading skeleton dan pesan error yang tidak bikin panik.
- API key TMDB dijaga di server lewat proxy, jadi tidak bocor ke browser.
- **Daftar Saya** dan riwayat tontonan tersimpan ke Turso (libSQL). Kalau belum dikonfigurasi, otomatis fallback ke localStorage di browser — aplikasi tetap jalan.

## Menjalankan di komputer sendiri

### 1. Siapkan API key TMDB

1. Daftar (gratis) di [themoviedb.org](https://www.themoviedb.org/signup).
2. Buka [halaman API settings](https://www.themoviedb.org/settings/api), lalu buat API key.
3. Salin `.env.example` menjadi `.env`:

   ```bash
   cp .env.example .env
   ```

4. Isi API key kamu di file `.env`:

   ```env
   TMDB_API_KEY=api_key_kamu
   ```

### 2. Database Turso (opsional, tapi disarankan)

Fitur **Daftar Saya** dan **Lanjutkan Menonton** lebih enak kalau datanya tersimpan
di [Turso](https://turso.tech) (libSQL), supaya tidak hilang saat browser dibersihkan.
Kalau langkah ini dilewati, data tetap tersimpan — cuma lokal di browser.

1. Buat database dan token-nya (lewat dashboard atau CLI):

   ```bash
   turso db create netflix-clone
   turso db tokens create netflix-clone
   ```

2. Tambahkan dua baris ini ke `.env`:

   ```env
   TURSO_DATABASE_URL=libsql://netflix-clone-nama-org.turso.io
   TURSO_AUTH_TOKEN=token_kamu
   ```

3. Tidak perlu bikin tabel manual. Server membuat tabel `my_list` dan
   `watch_history` otomatis saat pertama kali dijalankan.

### 3. Install dan jalankan (development)

```bash
pnpm install
```

Jalankan backend proxy di satu terminal:

```bash
pnpm run server
```

Lalu frontend di terminal lain:

```bash
pnpm run dev
```

Buka http://localhost:5173. Semua request ke `/api/tmdb/*` diteruskan Vite ke
backend proxy di http://localhost:4000, jadi API key tetap aman di sisi server.

### 4. Build untuk produksi

```bash
pnpm run build
pnpm start
```

`pnpm start` menjalankan server Express yang menyajikan folder `dist/` sekaligus
menjadi proxy API TMDB. Buka http://localhost:4000 untuk melihat hasilnya.

## Struktur folder

```
netflix-clone/
├── index.html
├── package.json
├── vite.config.js
├── .env.example
├── server/
│   └── index.js            # Proxy TMDB + koneksi Turso (Express)
└── src/
    ├── main.jsx            # Titik masuk aplikasi
    ├── App.jsx             # Susunan halaman utama
    ├── api.js              # Helper request ke TMDB
    ├── hooks/              # useFetch, useMyList, useWatchHistory, useDeviceId
    ├── lib/                # Util & pemetaan data film
    └── components/         # Navbar, Banner, Row, PlayerModal, SearchResults, dll.
```
