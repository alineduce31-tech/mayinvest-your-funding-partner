// Jetons de session Mayinvest (admin, commercial/candidat, client).
// Ils sont envoyés à Supabase dans l'en-tête x-client-info, et la base
// ne montre que les données autorisées pour la personne connectée.

export const ADMIN_SESSION_KEY = 'mayinvest_admin_session'
export const COMMERCIAL_TOKEN_KEY = 'mi_commercial_token'
export const CLIENT_TOKEN_KEY = 'mayinvest_client_token'

const TOKEN_RE = /^[0-9a-f]{48}$/

function read(key: string): string | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function getAdminToken(): string | null {
  const raw = read(ADMIN_SESSION_KEY)
  if (!raw) return null
  try {
    const s = JSON.parse(raw)
    if (!s?.token || (s.expiresAt && s.expiresAt < Date.now())) return null
    return TOKEN_RE.test(s.token) ? s.token : null
  } catch {
    return null
  }
}

export function getCommercialToken(): string | null {
  const t = read(COMMERCIAL_TOKEN_KEY)
  return t && TOKEN_RE.test(t) ? t : null
}

export function getClientToken(): string | null {
  const t = read(CLIENT_TOKEN_KEY)
  return t && TOKEN_RE.test(t) ? t : null
}

export function setCommercialToken(token: string | null | undefined) {
  try {
    if (token) localStorage.setItem(COMMERCIAL_TOKEN_KEY, token)
    else localStorage.removeItem(COMMERCIAL_TOKEN_KEY)
  } catch {}
}

export function setClientToken(token: string | null | undefined) {
  try {
    if (token) localStorage.setItem(CLIENT_TOKEN_KEY, token)
    else localStorage.removeItem(CLIENT_TOKEN_KEY)
  } catch {}
}

export function sessionHeaderSuffix(): string {
  const parts: string[] = []
  const a = getAdminToken()
  const c = getCommercialToken()
  const l = getClientToken()
  if (a) parts.push(`mi-admin=${a}`)
  if (c) parts.push(`mi-commercial=${c}`)
  if (l) parts.push(`mi-client=${l}`)
  return parts.join(' ')
}
