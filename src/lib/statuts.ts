// Sélecteur de statut (module pur, testé) : groupes, libellés et état de chaque statut par rapport au statut actuel.

export const PARCOURS = ['Nouveau', 'Contacté', 'RDV', 'Dossier Déposé', 'Éligible', 'Financé'] as const
export const ACCOMPAGNEMENT = ['Non Éligible', 'Pack Formalisation Vendu', 'Bancarisé'] as const
export const FIN = ['Perdu'] as const

const LIBELLES: Record<string, string> = {
  'Dossier Déposé': 'Dossier déposé',
  'Non Éligible': 'Non éligible',
  'Pack Formalisation Vendu': 'Pack formalisation vendu',
}

/** Libellé lisible (la valeur enregistrée ne change pas). */
export function libelleStatut(s: string | null | undefined): string {
  return s ? (LIBELLES[s] || s) : '—'
}

export type EtatStatut = 'fait' | 'actuel' | 'suivant' | 'a_venir' | 'hors'

/** État d'un statut du parcours par rapport au statut actuel du dossier. */
export function etatStatut(actuel: string | null | undefined, s: string): EtatStatut {
  if (s === actuel) return 'actuel'
  const iS = (PARCOURS as readonly string[]).indexOf(s)
  if (iS < 0) return 'hors'
  const iA = (PARCOURS as readonly string[]).indexOf(actuel || '')
  if (iA < 0) return 'a_venir'
  if (iS < iA) return 'fait'
  return iS === iA + 1 ? 'suivant' : 'a_venir'
}

export type GroupeStatuts = { titre: string | null; statuts: string[] }

/** Groupes à afficher, limités aux statuts autorisés (ex. liste réduite des commerciaux). */
export function groupesStatuts(autorises?: readonly string[]): GroupeStatuts[] {
  const ok = (s: string) => !autorises || autorises.includes(s)
  const g: GroupeStatuts[] = [
    { titre: 'Parcours du dossier', statuts: PARCOURS.filter(ok) },
    { titre: 'Accompagnement', statuts: ACCOMPAGNEMENT.filter(ok) },
    { titre: null, statuts: FIN.filter(ok) },
  ]
  // Statuts autorisés inconnus des groupes (au cas où la liste évolue)
  const connus = new Set<string>([...PARCOURS, ...ACCOMPAGNEMENT, ...FIN])
  const autres = (autorises || []).filter(s => !connus.has(s))
  if (autres.length) g.push({ titre: 'Autres', statuts: autres })
  return g.filter(x => x.statuts.length)
}
