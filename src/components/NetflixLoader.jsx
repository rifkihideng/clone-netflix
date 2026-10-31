import { useEffect, useState } from 'react'
import './NetflixLoader.css'

const FADE_DURATION = 600

// Splash screen ala Netflix: logo "NETFLIX" merah dengan efek kilau + bar progres.
// `active=false` memulai fade-out, lalu komponen di-unmount setelah transisi.
export default function NetflixLoader({ active }) {
  const [phase, setPhase] = useState('show')

  useEffect(() => {
    if (active) {
      setPhase('show')
      return undefined
    }

    setPhase('fade')
    const timer = setTimeout(() => setPhase('gone'), FADE_DURATION)
    return () => clearTimeout(timer)
  }, [active])

  if (phase === 'gone') return null

  return (
    <div
      className={`loader ${phase === 'fade' ? 'loader--hidden' : ''}`}
      aria-hidden={phase !== 'show'}
    >
      <div className="loader__inner">
        <div className="loader__logo">NETFLIX</div>
        <p className="loader__text">Loading…</p>
        <div className="loader__bar" aria-hidden="true">
          <span className="loader__bar-fill" />
        </div>
      </div>
    </div>
  )
}
