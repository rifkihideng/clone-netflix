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

Website tampilan ala Netflix yang datanya diambil dari [The Movie Database (TMDB)](https://www.themoviedb.org/).

## Fitur
- Banner film trending dengan slider otomatis (cross-fade) + sinopsis
- Baris film horizontal yang bisa digulir (trending, rating tertinggi, aksi, komedi, horor, dokumenter)
- Pencarian film/serial
- Efek hover membesar ala Netflix
- Footer ala Netflix
- Loading skeleton & penanganan error
- Backend proxy yang menyembunyikan API key TMDB
- Daftar Saya & riwayat tontonan tersimpan di database Turso (libSQL)

## Cara menjalankan

### 1. Siapkan API key TMDB
1. Daftar di https://www.themoviedb.org/signup
2. Buka https://www.themoviedb.org/settings/api dan buat API key
3. Salin `.env.example` menjadi `.env`:
   ```bash
   cp .env.example .env
   ```
4. Isi file `.env`:
   ```
   TMDB_API_KEY=api_key_kamu
   ```

### 2. (Opsional) Siapkan database Turso
Fitur **Daftar Saya** dan **Lanjutkan Menonton** tersimpan di [Turso](https://turso.tech)
(libSQL). Tanpa konfigurasi ini aplikasi tetap jalan, tapi data hanya disimpan
lokal di browser (localStorage).

1. Buat database di https://turso.tech (atau pakai CLI):
   ```bash
   turso db create netflix-clone
   turso db tokens create netflix-clone
   ```
2. Tambahkan ke `.env`:
   ```
   TURSO_DATABASE_URL=libsql://netflix-clone-nama-org.turso.io
   TURSO_AUTH_TOKEN=token_dari_langkah_di_atas
   ```
3. Tabel `my_list` dan `watch_history` dibuat otomatis saat server pertama kali
   dijalankan (server sudah tersambung ke Turso).

### 3. Install & jalankan (mode development)
```bash
npm install
```
Jalankan backend proxy di satu terminal:
```bash
npm run server
```
Lalu jalankan frontend di terminal lain:
```bash
npm run dev
```
Buka http://localhost:5173 di browser. Vite meneruskan request `/api/tmdb/*`
ke backend proxy di http://localhost:4000, sehingga API key tetap aman di server.

### 4. Build untuk produksi
```bash
npm run build
npm start
```
Server Express akan menyajikan folder `dist/` sekaligus proxy API TMDB.
Buka http://localhost:4000 di browser.

## Struktur folder
```
netflix-clone/
├── index.html
├── package.json
├── vite.config.js
├── .env.example
├── server/
│   └── index.js          # Backend proxy TMDB (Express)
└── src/
    ├── main.jsx          # Entry point
    ├── App.jsx           # Susunan halaman
    ├── App.css
    ├── index.css         # Style global
    ├── api.js            # Helper fetch TMDB + daftar endpoint
    ├── hooks/
    │   └── useFetch.js   # Hook untuk ambil data
    └── components/
        ├── Navbar.jsx    # Navigasi atas + pencarian
        ├── Banner.jsx    # Banner slider utama
        ├── Row.jsx       # Baris film horizontal
        ├── SearchResults.jsx  # Hasil pencarian
        └── Footer.jsx    # Footer
```
