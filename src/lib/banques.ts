// Filtre « Banque » du CRM (module pur, testé) : avec compte, sans compte, ou banque par banque.

export const AVEC_COMPTE = '__avec'
export const SANS_COMPTE = '__sans'

/** Nom de la banque du client, ou '' s'il n'a pas de compte. */
export function banqueDe(l: { banque_actuelle?: string | null }): string {
  const b = String(l.banque_actuelle ?? '').trim()
  return ['', 'aucune', 'aucun', 'non'].includes(b.toLowerCase()) ? '' : b
}

/** Options du filtre : avec / sans compte, puis chaque banque citée (du plus grand nombre de clients au plus petit). */
export function optionsBanques(leads: { banque_actuelle?: string | null }[]): { value: string; label: string }[] {
  const n = new Map<string, number>()
  let sans = 0
  for (const l of leads) {
    const b = banqueDe(l)
    if (!b) sans++
    else n.set(b, (n.get(b) || 0) + 1)
  }
  const avec = leads.length - sans
  const banques = [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'))
  return [
    { value: AVEC_COMPTE, label: `Avec un compte bancaire (${avec})` },
    { value: SANS_COMPTE, label: `Sans compte bancaire (${sans})` },
    ...banques.map(([b, c]) => ({ value: b, label: `${b} (${c})` })),
  ]
}

/** Le dossier passe-t-il le filtre ? Plusieurs choix = l'un ou l'autre. */
export function passeFiltreBanque(l: { banque_actuelle?: string | null }, choix: string[]): boolean {
  if (!choix.length) return true
  const b = banqueDe(l)
  return choix.some(c => c === AVEC_COMPTE ? !!b : c === SANS_COMPTE ? !b : b === c)
}

export function libelleChoixBanque(c: string): string {
  return c === AVEC_COMPTE ? 'Avec un compte' : c === SANS_COMPTE ? 'Sans compte' : c
}
