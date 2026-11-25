// src/lib/phone.ts
// Utilitaires de formatage des numéros de téléphone congolais.
// Format standard : XX XXX XX XX (9 chiffres).
// Exemples : "06 655 32 18" · "04 023 23 17"

/**
 * Formate un numéro pour AFFICHAGE : "040232317" → "04 023 23 17"
 * Accepte aussi les formats avec +242, espaces, tirets, parenthèses.
 * Retourne le texte brut si moins de 9 chiffres (ex: en cours de saisie).
 */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return '—'
  let d = String(raw).replace(/\D/g, '')
  if (d.startsWith('242')) d = d.slice(3)   // enlève l'indicatif pays
  if (d.length < 9) return String(raw)       // pas assez de chiffres, retourne tel quel
  d = d.slice(-9)                            // garde les 9 derniers chiffres
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`
}

/**
 * Normalise pour STOCKAGE / COMPARAISON : renvoie uniquement les 9 chiffres.
 * "04 023 23 17" → "040232317"
 */
export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return ''
  let d = String(raw).replace(/\D/g, '')
  if (d.startsWith('242')) d = d.slice(3)
  return d.length >= 9 ? d.slice(-9) : d
}

/**
 * Formate PROGRESSIVEMENT dans un input, pendant que l'utilisateur tape.
 * Usage : onChange={e => setForm({ ...form, tel: formatPhoneInput(e.target.value) })}
 * Permet au curseur de rester fluide, garde max 9 chiffres.
 */
export function formatPhoneInput(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 9)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)} ${d.slice(2)}`
  if (d.length <= 7) return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`
}

/** Vérifie qu'un numéro a bien 9 chiffres valides */
export function isValidPhone(raw: string | null | undefined): boolean {
  if (!raw) return false
  const d = normalizePhone(raw)
  return d.length === 9
}

/** URL tel: avec indicatif +242 (utile pour <a href={telHref(...)}>) */
export function telHref(raw: string | null | undefined): string {
  const d = normalizePhone(raw)
  return d.length === 9 ? `tel:+242${d}` : '#'
}

/** URL WhatsApp */
export function whatsappHref(raw: string | null | undefined, message = ''): string {
  const d = normalizePhone(raw)
  if (d.length !== 9) return '#'
  const msg = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/242${d}${msg}`
}
