# PRD (Product Requirements Document) — Netflix Clone

> Dokumen kebutuhan produk untuk **Netflix Clone**. Berfungsi sebagai acuan
> fitur yang telah diimplementasikan serta batasan ruang lingkup proyek.

## 1. Ringkasan produk

Sebuah aplikasi web satu halaman (SPA) bergaya Netflix yang menampilkan
katalog film dan serial nyata dari TMDB. Seluruh konten dikunci di balik
halaman login (full-gate) dengan **OAuth GitHub**, dan data pribadi pengguna
— **Daftar Saya** serta **riwayat tontonan** — disimpan per akun di database
Turso/libSQL.

## 2. Latar belakang & masalah

| Masalah | Dampak |
| --- | --- |
| Ingin mempelajari alur full-stack nyata: UI React, backend proxy, dan database | Tanpa proyek terpadu, integrasi antar lapisan sulit dipahami |
| API key TMDB tidak boleh bocor ke browser | Perlu lapisan proxy di sisi server |
| Data pengguna harus bertahan dan terpisah per akun | Perlu autentikasi dan penyimpanan terpusat |
| Pengalaman browsing harus terasa cepat walau sumber data pihak ketiga lambat | Perlu strategi cache berlapis |

## 3. Tujuan & non-tujuan

**Tujuan (goals)**

1. Menyediakan pengalaman *browsing* katalog yang menyerupai Netflix: banner,
   baris kategori, pencarian, dan detail pemutaran.
2. Mengamankan kredensial TMDB di balik proxy server.
3. Memberi setiap pengguna ruang personal (Daftar Saya & riwayat) yang
   tersimpan per akun GitHub.
4. Tetap berfungsi meski database belum dikonfigurasi (fallback lokal).
5. Menerapkan praktik keamanan web dasar: header keamanan, CORS ketat,
   rate limiting, dan query parameterized.

**Non-tujuan (non-goals)**

- Bukan produk komersial; tidak memonetisasi konten, tidak menjual data.
- Tidak menyediakan pemutaran film penuh — hanya trailer YouTube.
- Tidak menggantikan langganan Netflix; seluruh konten milik TMDB/YouTube.
- Tidak menyediakan manajemen akun mandiri (daftar/reset password) — login
  sepenuhnya didelegasikan ke GitHub.

## 4. Persona & pengguna target

| Persona | Kebutuhan utama |
| --- | --- |
| **Pembelajar/pengembang** | Melihat contoh integrasi React + Express + database yang rapi |
| **Pengguna kasual** | Menjelajah katalog, mencari judul, menonton trailer |
| **Pengguna aktif** | Menyimpan judul ke Daftar Saya dan melanjutkan tontonan dari posisi terakhir |

## 5. Kebutuhan fungsional (functional requirements)

| ID | Kebutuhan | Kriteria penerimaan (acceptance criteria) |
| --- | --- | --- |
| FR-1 | **Login OAuth GitHub (full-gate)** | Aplikasi menampilkan halaman login bila belum ada sesi; profil GitHub tampil di navbar; tombol keluar menghapus sesi |
| FR-2 | **Banner berputar** | Banner menampilkan judul trending, berganti otomatis dengan transisi cross-fade, dan menampilkan sinopsis |
| FR-3 | **Baris konten per kategori** | Beranda menampilkan baris: tren minggu ini, rating tertinggi, aksi, komedi, horor, dokumenter; setiap baris bisa digeser horizontal |
| FR-4 | **Pagination "Lainnya"** | Tombol **Lainnya** memuat halaman berikutnya dari kategori tanpa meninggalkan halaman |
| FR-5 | **Pencarian lintas kategori** | Hasil menampilkan film & serial yang cocok, berpaginasi; placeholder kolom pencarian mengetik otomatis (typewriter) |
| FR-6 | **Interaksi kartu judul** | Kartu membesar saat kursor diarahkan, mengikuti interaksi khas Netflix |
| FR-7 | **Pemutar trailer (modal)** | Modal menampilkan trailer YouTube; mendukung mute/unmute, resume dari posisi terakhir, dan daftar pemeran |
| FR-8 | **Daftar Saya** | Pengguna dapat menambah/menghapus judul; data tersimpan per akun dan sinkron dengan server |
| FR-9 | **Lanjutkan Menonton** | Membuka judul mencatat riwayat beserta posisi tontonan; pemutaran bisa dilanjutkan dari menit yang sama |
| FR-10 | **Splash screen & halaman 404** | Loader bergaya Netflix tampil saat pertama dimuat; rute tak dikenal menampilkan halaman 404 |
| FR-11 | **Fallback lokal** | Bila Turso tidak dikonfigurasi, Daftar Saya disimpan di localStorage dan aplikasi tetap berfungsi |
| FR-12 | **Proxy & cache TMDB** | API key hanya ada di server; response TMDB di-cache di memori (server) dan dua lapis di klien (memori + localStorage) dengan stale-while-revalidate |

## 6. Kebutuhan non-fungsional (non-functional requirements)

| ID | Aspek | Persyaratan |
| --- | --- | --- |
| NFR-1 | **Keamanan** | Header keamanan via Helmet, CORS ketat (default tolak lintas-origin), rate limiting, whitelist endpoint TMDB, validasi input, dan query SQL parameterized |
| NFR-2 | **Performa** | Halaman utama langsung menampilkan data cache saat dikunjungi ulang, lalu refresh di latar belakang |
| NFR-3 | **Ketahanan** | Aplikasi tetap dapat dibuka meski TMDB/Turso bermasalah; error ditampilkan informatif per baris |
| NFR-4 | **Kompatibilitas** | Responsif pada perangkat seluler; tombol hapus selalu terlihat di layar sentuh |
| NFR-5 | **Privasi** | Identitas pengguna disimpan lewat cookie httpOnly; data Daftar Saya/riwayat terpisah per akun |

## 7. Alur pengguna utama (user flows)

1. **Login** — Pengguna membuka aplikasi → halaman login bergaya Netflix →
   klik **Masuk dengan GitHub** → izinkan akses → dialihkan ke beranda.
2. **Menjelajah** — Pengguna menggulir banner & baris kategori → arahkan kursor
   ke kartu → klik untuk membuka modal pemutar trailer.
3. **Mencari** — Pengguna mengetik judul di kolom pencarian → submit →
   melihat hasil film/serial.
4. **Menyimpan** — Pengguna menambahkan judul ke **Daftar Saya** → judul muncul
   di baris Daftar Saya → dapat dihapus kembali.
5. **Melanjutkan** — Pengguna membuka judul → posisi tontonan tercatat →
   judul muncul di **Lanjutkan Menonton** → pemutaran dilanjutkan dari posisi itu.

## 8. Ruang lingkup (scope)

**In scope**

- Katalog TMDB (trending, rating tertinggi, genre aksi/komedi/horor/dokumenter).
- Pencarian multi (film & serial), pemutar trailer, Daftar Saya, riwayat tontonan.
- Autentikasi OAuth GitHub, proxy TMDB, cache berlapis, dan lapisan keamanan.

**Out of scope**

- Pemutaran film/serial penuh (hanya trailer).
- Sistem pembayaran, langganan, dan manajemen profil majemuk.
- Back-office/admin dan moderasi konten.
- Dukungan multi-bahasa penuh (saat ini konten diminta dengan `id-ID`).

## 9. Metrik kesuksesan

- Semua permintaan TMDB berhasil lewat proxy tanpa membocorkan API key.
- Daftar Saya dan riwayat tontonan bertahan saat halaman dimuat ulang dan
  terpisah antar akun GitHub.
- Halaman utama terasa langsung tampil saat dikunjungi kembali berkat cache.
- Aplikasi tetap berfungsi saat database Turso belum dikonfigurasi.

## 10. Asumsi & ketergantungan

- Ketersediaan API TMDB dan kredensial yang valid (`TMDB_API_KEY`).
- Konfigurasi OAuth GitHub (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `APP_URL`).
- Ketersediaan database Turso untuk penyimpanan persisten (opsional).
- Trailer bersumber dari YouTube dan dapat disematkan lewat iframe.

## 11. Risiko & mitigasi

| Risiko | Mitigasi |
| --- | --- |
| Kuota/limit API TMDB habis | Proxy + cache berlapis + whitelist endpoint |
| API key bocor | API key hanya disimpan di sisi server |
| Penyalahgunaan endpoint (DoS) | Rate limiting, batas ukuran body, whitelist endpoint |
| SQL injection | Query sepenuhnya parameterized + validasi input |
| Database tidak tersedia | Fallback ke localStorage di sisi klien |
