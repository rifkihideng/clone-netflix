// Helper bersama untuk login GitHub (OAuth) & sesi cookie.
// Dipakai oleh server Express (server/index.js) dan Vercel Function
// (api/index.js) supaya logika cookie, pembuatan token, dan panggilan ke
// GitHub tidak diduplikasi.

import crypto from 'node:crypto'

export const SESSION_COOKIE = 'nf_session'
export const OAUTH_STATE_COOKIE = 'nf_oauth_state'

export const GITHUB_OAUTH = {
  authorizeUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  userUrl: 'https://api.github.com/user',
  scope: 'read:user',
}

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60 // 30 hari
const OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60 // 10 menit

// URL dasar frontend (tanpa trailing slash). Dipakai untuk menyusun
// redirect_uri dan tujuan redirect setelah login/callback.
export function appUrl() {
  return (process.env.APP_URL || 'http://localhost:5173').replace(/\/+$/, '')
}

export function redirectUri() {
  return `${appUrl()}/api/auth/callback`
}

// Cookie hanya dikirim lewat HTTPS di produksi (APP_URL diawali https).
export function isSecureCookie() {
  return appUrl().startsWith('https://')
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex')
}

export function sessionMaxAgeSeconds() {
  return SESSION_MAX_AGE_SECONDS
}

export function oauthStateMaxAgeSeconds() {
  return OAUTH_STATE_MAX_AGE_SECONDS
}

// Susun header Set-Cookie. Encode nama/value dengan benar; atribut lain
// dibiarkan sebagai string tetap (semuanya berasal dari kode kita).
export function buildCookie(
  name,
  value,
  { httpOnly = true, path = '/', sameSite = 'Lax', maxAge, secure = false } = {},
) {
  const parts = [`${name}=${encodeURIComponent(value)}`]
  if (httpOnly) parts.push('HttpOnly')
  parts.push(`Path=${path}`)
  parts.push(`SameSite=${sameSite}`)
  if (typeof maxAge === 'number') parts.push(`Max-Age=${maxAge}`)
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

// Parse header Cookie (mis. "a=1; b=2") menjadi objek { a: '1', b: '2' }.
export function parseCookies(cookieHeader) {
  const out = {}
  if (!cookieHeader) return out
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const name = part.slice(0, idx).trim()
    const raw = part.slice(idx + 1).trim()
    if (!name) continue
    try {
      out[name] = decodeURIComponent(raw)
    } catch {
      out[name] = raw
    }
  }
  return out
}

// Tukar kode OAuth dengan access token GitHub.
export async function exchangeCodeForToken({ code, clientId, clientSecret }) {
  const response = await fetch(GITHUB_OAUTH.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri(),
    }),
  })
  const data = await response.json().catch(() => ({}))
  return data.access_token ?? null
}

// Ambil profil pengguna GitHub dari access token.
export async function fetchGithubUser(accessToken) {
  const response = await fetch(GITHUB_OAUTH.userUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'User-Agent': 'netflix-clone',
    },
  })
  if (!response.ok) return null
  return response.json()
}

// URL tujuan login GitHub (termasuk state anti-CSRF).
export function githubAuthorizeUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID || '',
    redirect_uri: redirectUri(),
    scope: GITHUB_OAUTH.scope,
    state,
  })
  return `${GITHUB_OAUTH.authorizeUrl}?${params.toString()}`
}
