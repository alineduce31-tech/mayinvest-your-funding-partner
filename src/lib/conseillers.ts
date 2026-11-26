// Choix du conseiller à assigner : recherche, filtres et suggestion transparente.

export type Conseiller = {
  id: string
  nom: string
  ville: string
  enCours: number
  finances: number
  total: number
}

export type FiltreConseiller = 'suggeres' | 'ville' | 'moins' | 'meilleurs'

const norm = (t: string) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Convertit une ligne de get_all_commercials_with_stats. */
export function versConseiller(r: any): Conseiller {
  const nom = `${r?.prenom || ''} ${r?.nom || ''}`.trim() || String(r?.email || '').split('@')[0] || 'Conseiller'
  return {
    id: String(r?.id || ''),
    nom,
    ville: String(r?.ville || ''),
    enCours: Number(r?.leads_actifs) || 0,
    finances: Number(r?.dossiers_finances) || 0,
    total: Number(r?.total_leads) || 0,
  }
}

/** Taux de réussite en % (financés sur dossiers reçus), null sans historique. */
export function tauxReussite(c: Conseiller): number | null {
  return c.total > 0 ? Math.round((c.finances / c.total) * 100) : null
}

export const memeVille = (c: Conseiller, ville?: string) => !!ville && !!c.ville && norm(c.ville) === norm(ville)

/** Charge relative de 0 à 100, par rapport au conseiller le plus chargé de l'équipe (10 au minimum). */
export function charge(c: Conseiller, equipe: Conseiller[]): number {
  const max = Math.max(10, ...equipe.map(x => x.enCours))
  return Math.round(Math.min(100, (c.enCours / max) * 100))
}

/** Règle de suggestion : même ville d'abord, puis le moins de dossiers en cours, puis le plus de financés. */
export function ordreSuggestion(ville?: string) {
  return (a: Conseiller, b: Conseiller) =>
    Number(memeVille(b, ville)) - Number(memeVille(a, ville)) ||
    a.enCours - b.enCours ||
    b.finances - a.finances ||
    a.nom.localeCompare(b.nom, 'fr')
}

/** Identifiant du conseiller suggéré (le premier selon la règle), null si l'équipe est vide. */
export function suggere(equipe: Conseiller[], ville?: string): string | null {
  if (!equipe.length) return null
  return [...equipe].sort(ordreSuggestion(ville))[0]!.id
}

export function listeConseillers(equipe: Conseiller[], filtre: FiltreConseiller, q: string, ville?: string): Conseiller[] {
  const t = norm(q)
  let l = equipe.filter(c => !t || norm(c.nom).includes(t) || norm(c.ville).includes(t))
  if (filtre === 'ville') l = l.filter(c => memeVille(c, ville))
  const tri =
    filtre === 'moins' ? (a: Conseiller, b: Conseiller) => a.enCours - b.enCours || a.nom.localeCompare(b.nom, 'fr')
    : filtre === 'meilleurs' ? (a: Conseiller, b: Conseiller) => b.finances - a.finances || (tauxReussite(b) ?? -1) - (tauxReussite(a) ?? -1)
    : ordreSuggestion(ville)
  return [...l].sort(tri)
}
