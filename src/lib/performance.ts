// Performance des commerciaux (module pur, testé) : mise en forme et messages pour relancer ou motiver.
// Les chiffres viennent de la base (admin_performance_commerciaux).

export type PeriodePerf = 'mois' | '3mois' | '12mois'
export const PERIODES_PERF: { k: PeriodePerf; label: string }[] = [
  { k: 'mois', label: 'Ce mois' }, { k: '3mois', label: '3 mois' }, { k: '12mois', label: '12 mois' },
]

export type Retard = { nom: string; depuis: string; ville?: string | null }
export type PerfCommercial = {
  id: string; rang: number; nom: string; ville?: string | null; telephone?: string | null
  recus: number; contactes: number; delai_h: number | null
  parcours: { recus: number; contactes: number; rdv: number; deposes: number; finances: number }
  deposes: number; finances: number; refus: number; taux_acceptation: number | null
  transfo: number | null; fiable: boolean; montant_finance: number; gains: number
  packs: number; bancarises: number; actifs: number; retard: number; retard_liste: Retard[]
  precedent: { recus: number; finances: number }
}

export type TypeMessage = 'relance' | 'felicitations' | 'encouragement'

/** Délai lisible : moins d'une heure, en heures, puis en jours. */
export function delaiTxt(h: number | null | undefined): string {
  if (h === null || h === undefined || !Number.isFinite(Number(h))) return '—'
  const v = Number(h)
  if (v < 1) return '< 1 h'
  if (v < 24) return `${Math.round(v)} h`
  return `${Math.round(v / 24)} j`
}

/** Délai du 1er contact : vert sous 24 h, orange au-delà (objectif : moins de 24 h). */
export function delaiOk(h: number | null | undefined): boolean | null {
  if (h === null || h === undefined) return null
  return Number(h) <= 24
}

/** Largeur des barres du parcours, en % des leads reçus. */
export function etapesParcours(p: PerfCommercial['parcours']): { label: string; n: number; pct: number }[] {
  const base = Math.max(1, Number(p.recus) || 0)
  return [
    { label: 'Reçus', n: p.recus }, { label: 'Contactés', n: p.contactes }, { label: 'RDV', n: p.rdv },
    { label: 'Déposés', n: p.deposes }, { label: 'Financés', n: p.finances },
  ].map(e => ({ ...e, n: Number(e.n) || 0, pct: Math.round(((Number(e.n) || 0) / base) * 100) }))
}

/** Message conseillé selon la situation : relance s'il a des leads en retard, félicitations s'il a financé, sinon encouragement. */
export function messageConseille(c: Pick<PerfCommercial, 'retard' | 'finances' | 'rang'>): TypeMessage {
  if (c.retard > 0) return 'relance'
  if (c.finances > 0) return 'felicitations'
  return 'encouragement'
}

const prenom = (nom: string) => (nom || '').trim().split(/\s+/)[0] || ''

/** Texte proposé (modifiable avant envoi), envoyé dans la messagerie d'équipe du commercial. */
export function texteMessage(type: TypeMessage, c: PerfCommercial, periode: string, nbCommerciaux: number): string {
  const p = prenom(c.nom)
  if (type === 'relance') {
    const liste = c.retard_liste.slice(0, 6).map(r => `• ${r.nom}${r.ville ? ` (${r.ville})` : ''}`).join('\n')
    const reste = c.retard_liste.length > 6 ? `\n… et ${c.retard_liste.length - 6} autre${c.retard_liste.length - 6 > 1 ? 's' : ''}` : ''
    return `Bonjour ${p}, ${c.retard} lead${c.retard > 1 ? 's attendent' : ' attend'} ton premier appel depuis plus de 48 h :\n${liste}${reste}\n\nPeux-tu les contacter aujourd'hui et mettre à jour leur statut ? Un client appelé vite a beaucoup plus de chances d'aller jusqu'au financement. Merci !`
  }
  if (type === 'felicitations') {
    const place = c.rang === 1 && nbCommerciaux > 1 ? ` Tu es 1er de l'équipe.` : ''
    return `Bravo ${p} ! ${c.finances} dossier${c.finances > 1 ? 's financés' : ' financé'} (${periode.toLowerCase()}).${place} Continue comme ça, ton travail fait la différence pour nos clients.`
  }
  const etape = c.recus === 0 ? 'Ajoute tes prospects dans ton espace pour lancer la machine.'
    : c.deposes === 0 ? 'Concentre-toi sur les dossiers les plus avancés pour les amener jusqu\'au dépôt en banque.'
    : 'Tes dossiers déposés sont en bonne voie, garde le contact avec la banque et le client.'
  return `Bonjour ${p}, merci pour ton engagement. ${etape} Si tu as besoin d'aide sur un dossier, écris-moi ici.`
}
