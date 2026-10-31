# Netflix Clone (React + Vite + TMDB API)

Website tampilan ala Netflix yang datanya diambil dari [The Movie Database (TMDB)](https://www.themoviedb.org/).

## Fitur
- Banner film trending dengan slider otomatis (cross-fade) + sinopsis
- Baris film horizontal yang bisa digulir (trending, rating tertinggi, aksi, komedi, horor, dokumenter)
- Pencarian film/serial
- Efek hover membesar ala Netflix
- Footer ala Netflix
- Loading skeleton & penanganan error
- Backend proxy yang menyembunyikan API key TMDB

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

### 2. Install & jalankan (mode development)
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

### 3. Build untuk produksi
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
