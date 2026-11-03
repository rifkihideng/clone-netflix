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
  <img src="https://img.shields.io/badge/React_Router-6-CA4245?style=flat&logo=reactrouter&logoColor=white" alt="React Router" />
  <img src="https://img.shields.io/badge/API-TMDB-01B4E4?style=flat&logo=themoviedatabase&logoColor=white" alt="TMDB API" />
  <img src="https://img.shields.io/badge/Database-Turso%2FlibSQL-4FF8D2?style=flat&logo=turso&logoColor=black" alt="Turso/libSQL" />
</p>

<p align="center">
  <em>Proyek klon untuk pembelajaran. Netflix adalah merek dagang milik Netflix, Inc.</em>
</p>

Aplikasi web yang mereplikasi pengalaman antarmuka Netflix menggunakan React dan Vite. Data film dan serial bersumber langsung dari [The Movie Database (TMDB)](https://www.themoviedb.org/) melalui proxy backend, sehingga seluruh konten yang ditampilkan merupakan data aktual. Proyek ini mencakup pencarian, pemutaran trailer, penyimpanan ke **Daftar Saya**, serta pencatatan riwayat dan posisi tontonan.

## Fitur

- Banner film trending yang berputar otomatis dengan transisi cross-fade, lengkap dengan sinopsis setiap judul.
- Baris konten yang dapat digeser horizontal: tren minggu ini, rating tertinggi, aksi, komedi, horor, dan dokumenter — setiap baris mendukung pemuatan halaman berikutnya lewat tombol **Lainnya**.
- Pencarian film dan serial lintas kategori dengan hasil paginasi; placeholder kolom pencarian mengetik otomatis (efek typewriter) dan profil pengguna direpresentasikan sebagai ikon.
- Kartu judul membesar saat kursor diarahkan, mengikuti interaksi khas Netflix.
- Pemutar trailer YouTube dalam modal: mendukung mute/unmute, resume dari posisi terakhir, dan daftar pemeran.
- Splash screen pembuka bergaya Netflix saat aplikasi pertama dimuat.
- Halaman **404** khusus untuk rute yang tidak dikenal (React Router).
- Loading skeleton dan penanganan error yang informatif pada setiap baris.
- Kredensial TMDB dijaga di sisi server melalui proxy yang dilengkapi cache, rate limiting, dan whitelist endpoint, sehingga tidak bocor dan tidak boros kuota.
- Keamanan HTTP: header keamanan via **Helmet** (Content-Security-Policy, `nosniff`, anti-clickjacking, dll.), **CORS ketat** (default tolak lintas-origin), validasi input (`device_id`, ID film, panjang string), dan query SQL yang sepenuhnya **parameterized** untuk mencegah SQL injection.
- **Daftar Saya** dan riwayat tontonan tersimpan di Turso (libSQL). **Lanjutkan Menonton** mencatat posisi terakhir sehingga pemutaran dapat dilanjutkan dari menit yang sama; tombol hapus pada kartu selalu terlihat di perangkat layar sentuh. Apabila Turso belum dikonfigurasi, aplikasi beralih ke penyimpanan lokal (localStorage).
- Cache TMDB dua lapis (memori + localStorage) dengan strategi stale-while-revalidate: halaman utama langsung menampilkan data yang tersimpan saat dikunjungi kembali, lalu memperbaruinya di latar belakang.

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

Fitur **Daftar Saya** dan **Lanjutkan Menonton** bekerja lebih baik jika datanya tersimpan
di [Turso](https://turso.tech) (libSQL), sehingga tidak hilang saat penyimpanan browser
dibersihkan. Jika langkah ini dilewati, data tetap tersimpan secara lokal di browser.

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

3. Tidak perlu bikin tabel manual. Server membuat skema relasional berikut
   otomatis saat pertama kali dijalankan (lihat [server/schema.js](server/schema.js)):

   - `devices` — identitas perangkat (user tanpa login).
   - `movies` — detail film/serial yang disimpan sekali.
   - `my_list` — relasi *device → movie* untuk Daftar Saya.
   - `watch_history` — relasi *device → movie* beserta posisi tontonan.

   Tabel `my_list` dan `watch_history` memakai foreign key ke `devices` dan
   `movies`. Skema lama (data film yang terduplikasi) dimigrasikan otomatis.

### 3. Install dan jalankan (development)

```bash
npm install
```

Jalankan backend proxy di satu terminal:

```bash
npm run server
```

Lalu frontend di terminal lain:

```bash
npm run dev
```

Buka http://localhost:5173. Semua request ke `/api/tmdb/*` diteruskan Vite ke
backend proxy di http://localhost:4000, jadi API key tetap aman di sisi server.

### 4. Build untuk produksi

```bash
npm run build
npm start
```

`npm start` menjalankan server Express yang menyajikan folder `dist/` sekaligus
menjadi proxy API TMDB. Buka http://localhost:4000 untuk melihat hasilnya.

## Deploy ke Vercel

Proyek ini sudah disiapkan untuk Vercel: frontend Vite di-build ke `dist/`,
sementara endpoint API dipindahkan ke serverless function di [api/index.js](api/index.js)
dan dikonfigurasi lewat [vercel.json](vercel.json). Vercel mendeteksi keduanya secara otomatis.

1. Pastikan semua perubahan sudah di-push ke GitHub, lalu impor repositori di
   [vercel.com/new](https://vercel.com/new).
2. Pada langkah environment variables, tambahkan nilai yang sama dengan file `.env`:

   | Nama | Wajib | Keterangan |
   | --- | --- | --- |
   | `TMDB_API_KEY` | Ya | API key dari The Movie Database |
   | `TURSO_DATABASE_URL` | Tidak | URL database Turso untuk Daftar Saya & riwayat |
   | `TURSO_AUTH_TOKEN` | Tidak | Token autentikasi Turso |

   Jika `TURSO_*` dikosongkan, aplikasi tetap berjalan dengan menyimpan
   Daftar Saya dan riwayat secara lokal di browser.
3. Klik **Deploy**. Setelah selesai, situs dapat diakses di domain `*.vercel.app`.

Alternatif lewat CLI:

```bash
npm i -g vercel
vercel        # deploy preview
vercel --prod # deploy produksi
```

Catatan: serverless function di Vercel memakai Web API (Request/Response),
sedangkan server Express di `server/` tetap dipakai untuk pengembangan lokal.

## Struktur folder

```
netflix-clone/
├── index.html
├── package.json
├── vite.config.js
├── vercel.json            # Konfigurasi build & deploy Vercel
├── .env.example
├── api/
│   └── index.js           # Serverless function Vercel (proxy TMDB + Turso)
├── server/
│   ├── index.js           # Proxy TMDB + koneksi Turso (Express, untuk dev lokal)
│   └── schema.js          # Skema relasional & migrasi database (dipakai bersama)
└── src/
    ├── main.jsx            # Titik masuk aplikasi
    ├── App.jsx             # Susunan halaman utama
    ├── api.js              # Helper request TMDB + cache dua lapis (memori & localStorage)
    ├── pages/              # Halaman 404 (react-router-dom)
    ├── hooks/              # useFetch, usePaginatedFetch, useMyList, useWatchHistory, useDeviceId, useTypewriter
    ├── lib/                # Util & pemetaan data film
    └── components/         # Navbar, Banner, Row, PlayerModal, SearchResults, NetflixLoader, dll.
```
