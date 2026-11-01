import { Link } from 'react-router-dom'

// Halaman 404 sederhana ala Netflix. Dipakai untuk semua path yang tidak dikenal.
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#141414] px-4 text-center">
      <div className="animate-bounce text-7xl" aria-hidden="true">
        👻
      </div>
      <p className="mt-4 text-[7rem] font-black leading-none text-[#e50914]">404</p>
      <h1 className="mt-2 text-2xl font-bold">Halaman tidak ditemukan</h1>
      <p className="mt-2 max-w-md text-[#b3b3b3]">
        Halaman yang kamu cari mungkin sudah dipindahkan, dihapus, atau alamatnya salah ketik.
      </p>
      <Link
        to="/"
        className="mt-8 rounded bg-white px-6 py-3 font-bold text-black transition-colors duration-200 hover:bg-white/75"
      >
        Kembali ke Beranda
      </Link>
    </div>
  )
}
