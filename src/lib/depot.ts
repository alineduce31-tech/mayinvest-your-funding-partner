// Banque de dépôt et montant financé (module pur, testé).
// Le rapport « Banques » attribue chaque dossier à la banque où il a été déposé ;
// on la demande au moment où le dossier passe à « Dossier déposé », « Éligible » ou « Financé ».

export const STATUTS_DEPOT = ['Dossier Déposé', 'Éligible', 'Financé'] as const

export type LeadDepot = {
  banque_depot?: string | null
  montant_finance?: number | string | null
  banque_actuelle?: string | null
  montant_demande?: number | string | null
}

const vide = (v: unknown) => v === null || v === undefined || String(v).trim() === ''

/** Faut-il demander la banque (et, au financement, le montant financé) ? */
export function doitDemanderDepot(statut: string, lead: LeadDepot | null | undefined): boolean {
  if (!(STATUTS_DEPOT as readonly string[]).includes(statut)) return false
  if (!lead || vide(lead.banque_depot)) return true
  return statut === 'Financé' && vide(lead.montant_finance)
}

/** Banque proposée par défaut : celle déjà saisie, sinon la banque du client s'il en a une. */
export function banqueParDefaut(lead: LeadDepot | null | undefined): string {
  if (!lead) return ''
  if (!vide(lead.banque_depot)) return String(lead.banque_depot).trim()
  const b = String(lead.banque_actuelle ?? '').trim()
  return ['', 'aucune', 'aucun', 'non'].includes(b.toLowerCase()) ? '' : b
}

/** « 25 000 000 », « 25000000 XAF », « 25,5 M » → nombre en XAF ; vide → null ; illisible → NaN. */
export function lireMontant(texte: string): number | null {
  const t = String(texte ?? '').trim().toLowerCase().replace(/xaf|fcfa|f\b/g, '').trim()
  if (!t) return null
  const m = t.match(/^([\d\s.,  ]+)\s*(m|millions?)?$/)
  if (!m) return NaN
  let chiffres = (m[1] ?? '').replace(/[\s  ]/g, '')
  if (m[2]) {
    chiffres = chiffres.replace(',', '.')
    const n = Number(chiffres)
    return Number.isFinite(n) ? Math.round(n * 1_000_000) : NaN
  }
  chiffres = chiffres.replace(/[.,]/g, '')
  const n = Number(chiffres)
  return Number.isFinite(n) ? n : NaN
}

export function formatMontant(n: number | string | null | undefined): string {
  const v = Number(n)
  if (n === null || n === undefined || n === '' || !Number.isFinite(v)) return ''
  return new Intl.NumberFormat('fr-FR').format(v).replace(/[  ]/g, ' ')
}
