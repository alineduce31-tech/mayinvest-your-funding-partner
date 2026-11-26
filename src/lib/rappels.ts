// Rappels programmés par le commercial (module pur, testé)
// Choix rapides, choix libre (jour + heure), libellés courts et détection des rappels à sonner.

export type ChoixRapide = { cle: 'heure' | 'soir' | 'demain' | 'lundi'; libelle: string; at: number }

const H = 3_600_000
const JOURS_COURTS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']

function a(d: Date, h: number, m = 0): number {
  const x = new Date(d)
  x.setHours(h, m, 0, 0)
  return x.getTime()
}
function plusJours(now: number, n: number): Date {
  const d = new Date(now)
  d.setDate(d.getDate() + n)
  return d
}

/** Dans 1 heure, arrondi aux 5 minutes supérieures. */
export function dansUneHeure(now: number): number {
  const t = now + H
  const cinq = 5 * 60_000
  return Math.ceil(t / cinq) * cinq
}

export function choixRapides(now: number): ChoixRapide[] {
  const d = new Date(now)
  const out: ChoixRapide[] = [{ cle: 'heure', libelle: 'Dans 1 heure', at: dansUneHeure(now) }]
  if (d.getHours() < 17) out.push({ cle: 'soir', libelle: 'Ce soir', at: a(d, 18) })
  out.push({ cle: 'demain', libelle: 'Demain matin', at: a(plusJours(now, 1), 9) })
  const jusquaLundi = ((8 - d.getDay()) % 7) || 7
  if (jusquaLundi > 1) out.push({ cle: 'lundi', libelle: 'Lundi matin', at: a(plusJours(now, jusquaLundi), 9) })
  return out
}

/** Les 7 prochains jours proposés en pastilles (aujourd'hui compris). */
export function joursProposes(now: number, n = 7): { libelle: string; date: Date }[] {
  return Array.from({ length: n }, (_, i) => {
    const date = plusJours(now, i)
    date.setHours(0, 0, 0, 0)
    const libelle = i === 0 ? 'Auj.' : i === 1 ? 'Demain' : `${cap(JOURS_COURTS[date.getDay()] ?? '')} ${date.getDate()}`
    return { libelle, date }
  })
}

export const HEURES_PROPOSEES: { h: number; m: number }[] = [
  { h: 8, m: 0 }, { h: 9, m: 0 }, { h: 10, m: 0 }, { h: 11, m: 0 },
  { h: 12, m: 0 }, { h: 14, m: 0 }, { h: 15, m: 0 }, { h: 16, m: 0 },
  { h: 17, m: 0 }, { h: 18, m: 0 },
]

export function combiner(jour: Date, h: number, m: number): number {
  return a(jour, h, m)
}

/** Lit "14:30" (champ heure) ; null si invalide. */
export function lireHeure(v: string): { h: number; m: number } | null {
  const r = /^(\d{1,2}):(\d{2})$/.exec(v.trim())
  if (!r) return null
  const h = Number(r[1]); const m = Number(r[2])
  if (h > 23 || m > 59) return null
  return { h, m }
}

export function heureTexte(t: number): string {
  const d = new Date(t)
  const m = d.getMinutes()
  return `${d.getHours()} h${m ? ` ${String(m).padStart(2, '0')}` : ''}`
}

/** "auj. 14 h 30", "demain 9 h", "ven. 27 à 9 h" */
export function libelleRappel(at: number, now: number): string {
  const j = new Date(at); j.setHours(0, 0, 0, 0)
  const n = new Date(now); n.setHours(0, 0, 0, 0)
  const ecart = Math.round((j.getTime() - n.getTime()) / (24 * H))
  if (ecart === 0) return `auj. ${heureTexte(at)}`
  if (ecart === 1) return `demain ${heureTexte(at)}`
  return `${JOURS_COURTS[j.getDay()]} ${j.getDate()} à ${heureTexte(at)}`
}

export function estDansLeFutur(at: number, now: number): boolean {
  return at > now + 60_000
}

/** Rappels arrivés à échéance et pas encore sonnés. La clé tient compte de l'heure : reprogrammer fait sonner à nouveau. */
export function aSonner(rappels: Record<string, number>, now: number, dejaSonnes: Set<string>): string[] {
  return Object.entries(rappels)
    .filter(([id, at]) => at <= now && now - at < 12 * H && !dejaSonnes.has(cleSonnerie(id, at)))
    .sort((x, y) => x[1] - y[1])
    .map(([id]) => id)
}

export function cleSonnerie(leadId: string, at: number): string {
  return `${leadId}:${at}`
}

function cap(s: string): string {
  return s ? s[0]!.toUpperCase() + s.slice(1) : s
}
