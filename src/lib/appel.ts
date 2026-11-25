// Appels téléphoniques (module pur, testé)
// Numéros congolais : 9 chiffres avec le 0 (ex : 06 655 32 18), indicatif +242.
import { normalizePhone, formatPhone } from './phone'

export function numeroInternational(raw: string | null | undefined): string | null {
  const d = normalizePhone(raw)
  return d.length === 9 ? `+242${d}` : null
}

export function lienTel(raw: string | null | undefined): string | null {
  const n = numeroInternational(raw)
  return n ? `tel:${n}` : null
}

export function lienWhatsapp(raw: string | null | undefined): string | null {
  const n = numeroInternational(raw)
  return n ? `https://wa.me/${n.slice(1)}` : null
}

export function numeroAffiche(raw: string | null | undefined): string {
  return formatPhone(raw)
}

/** Téléphone tactile à écran étroit : on lance l'appel directement. Sinon : fenêtre d'options. */
export function appelDirect(largeur: number, tactile: boolean): boolean {
  return tactile && largeur <= 760
}

export function noteAppel(numero: string, quand: Date, moyen: 'telephone' | 'ordinateur' | 'whatsapp' | 'manuel'): string {
  const h = quand.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const via = moyen === 'whatsapp' ? ' via WhatsApp' : moyen === 'ordinateur' ? ' depuis l\'ordinateur' : ''
  return `Appel vers ${numeroAffiche(numero)}${via} à ${h}.`
}
