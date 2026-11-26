// Logique de la liste déroulante maison (module pur, testé)
// Position de la carte sous le champ (ou au-dessus s'il manque de place),
// panneau du bas sur mobile, navigation au clavier.

export const MOBILE_MAX_WIDTH = 760
export const MARGE = 8
export const HAUTEUR_MAX = 320

export type Rect = { top: number; bottom: number; left: number; width: number }
export type Position = { top: number; left: number; width: number; maxHeight: number; versLeHaut: boolean }

export function estMobile(largeur: number): boolean {
  return largeur <= MOBILE_MAX_WIDTH
}

/** Place la carte sous le déclencheur ; au-dessus si la place manque en bas et qu'il y en a plus en haut. */
export function positionCarte(r: Rect, vue: { largeur: number; hauteur: number }, largeurMin = 220): Position {
  const width = Math.min(Math.max(r.width, largeurMin), vue.largeur - MARGE * 2)
  const left = Math.min(Math.max(MARGE, r.left), vue.largeur - width - MARGE)
  const placeBas = vue.hauteur - r.bottom - MARGE * 2
  const placeHaut = r.top - MARGE * 2
  const versLeHaut = placeBas < Math.min(HAUTEUR_MAX, 200) && placeHaut > placeBas
  const maxHeight = Math.max(120, Math.min(HAUTEUR_MAX, versLeHaut ? placeHaut : placeBas))
  const top = versLeHaut ? r.top - MARGE / 2 : r.bottom + MARGE / 2
  return { top, left, width, maxHeight, versLeHaut }
}

/** Option suivante ou précédente au clavier, en sautant les options désactivées, sans boucler. */
export function indexSuivant(actuel: number, sens: 1 | -1, desactives: boolean[]): number {
  const n = desactives.length
  if (n === 0) return -1
  let i = actuel
  for (let k = 0; k < n; k++) {
    const j = i + sens
    if (j < 0 || j >= n) return actuel < 0 ? premierActif(desactives, sens) : actuel
    i = j
    if (!desactives[i]) return i
  }
  return actuel
}

function premierActif(desactives: boolean[], sens: 1 | -1): number {
  const ordre = sens === 1 ? desactives.map((_, i) => i) : desactives.map((_, i) => desactives.length - 1 - i)
  for (const i of ordre) if (!desactives[i]) return i
  return -1
}

/** Saut à la première option qui commence par la lettre tapée. */
export function indexParLettre(lettre: string, libelles: string[], depuis: number): number {
  const l = lettre.toLowerCase()
  const n = libelles.length
  for (let k = 1; k <= n; k++) {
    const i = (depuis + k + n) % n
    if ((libelles[i] ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').startsWith(l)) return i
  }
  return depuis
}
