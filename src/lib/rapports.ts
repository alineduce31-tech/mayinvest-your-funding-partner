// Page Rapports : rapports automatiques du cahier des charges (module pur, testé).
// Les chiffres viennent de la base (admin_rapports) ; ici seulement la mise en forme.

export type TypeRapport = 'hebdo' | 'bancarisation' | 'banques' | 'commerciaux'

export type Envoi = {
  id: string
  type: TypeRapport
  status: 'sent' | 'failed' | string
  sent_at: string
  body_summary?: string | null
  periode?: string | null
  declencheur?: 'auto' | 'manuel' | string
  recipients?: string[] | null
}

export const RAPPORTS: { type: TypeRapport; titre: string; rythme: string; periode: string; precedente: string }[] = [
  { type: 'hebdo', titre: 'Rapport hebdo', rythme: 'Chaque lundi à 8 h', periode: 'la semaine écoulée', precedente: 'semaine précédente' },
  { type: 'bancarisation', titre: 'Rapport bancarisation', rythme: 'Le 1er du mois à 8 h', periode: 'le mois écoulé', precedente: 'mois précédent' },
  { type: 'banques', titre: 'Rapport banques', rythme: 'Le 1er du mois à 8 h', periode: 'le mois écoulé', precedente: 'mois précédent' },
  { type: 'commerciaux', titre: 'Performance commerciaux', rythme: 'Le 1er du mois à 8 h', periode: 'le mois écoulé', precedente: 'mois précédent' },
]

export const CATEGORIES_NON_ELIGIBLES: Record<string, { libelle: string; action: string }> = {
  pas_compte: { libelle: 'Pas de compte bancaire', action: 'Pack Formalisation' },
  pas_rccm: { libelle: 'Pas de RCCM', action: 'Pack Formalisation' },
  flux_faible: { libelle: 'Flux < 1 M/mois', action: 'Couveuse 3 mois (gratuit)' },
  refus: { libelle: 'Refus bancaire', action: 'Revoir le dossier' },
}

const TZ = 'Africa/Brazzaville'
const espaces = (t: string) => t.replace(/[  ]/g, ' ')
export const nombre = (n: unknown) => espaces(new Intl.NumberFormat('fr-FR').format(Number(n) || 0))
export const xafTxt = (n: unknown) => `${nombre(n)} XAF`
export const tauxTxt = (n: number | null | undefined) => (n === null || n === undefined ? '—' : `${n} %`)

/** Envois d'un type, du plus récent au plus ancien. */
export function envoisDe(envois: Envoi[] | null | undefined, type: TypeRapport): Envoi[] {
  return (envois || []).filter(e => e.type === type).sort((a, b) => Date.parse(b.sent_at) - Date.parse(a.sent_at))
}

/** État du dernier envoi : reçu, échec (et s'il a été renvoyé avec succès ensuite, c'est le succès qui compte). */
export function dernierEnvoi(envois: Envoi[] | null | undefined, type: TypeRapport): { ok: boolean; date: string; manuel: boolean } | null {
  const e = envoisDe(envois, type)[0]
  if (!e) return null
  return { ok: e.status === 'sent', date: e.sent_at, manuel: e.declencheur === 'manuel' }
}

export function dateCourte(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return espaces(d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ }))
}

export function dateHeure(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const j = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: TZ })
  const h = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
  return espaces(`${j} à ${h}`)
}

/** Écart avec la période précédente, formulé simplement. */
export function ecart(actuel: number, precedent: number | null | undefined, unite = ''): { sens: 'hausse' | 'baisse' | 'egal'; texte: string } {
  const d = (Number(actuel) || 0) - (Number(precedent) || 0)
  if (!d) return { sens: 'egal', texte: 'comme avant' }
  return { sens: d > 0 ? 'hausse' : 'baisse', texte: `${d > 0 ? '+' : '−'}${nombre(Math.abs(d))}${unite}` }
}

/** Le taux d'une banque est-il fiable ? En dessous de 5 décisions, on le signale. */
export function echantillonFaible(decisions: number | null | undefined): boolean {
  return (Number(decisions) || 0) < 5
}

/** Phrase du rapport découpée en lignes (le rapport banques a une ligne par banque). */
export function lignesPhrase(phrase: string | null | undefined): string[] {
  return String(phrase || '').split('\n').map(s => s.trim()).filter(Boolean)
}
