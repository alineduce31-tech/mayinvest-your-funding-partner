// Pack formalisation vendu sur la plateforme (module pur, testé).
// Le client souscrit, paie chez Mayinvest, un admin confirme, puis le conseiller coche les étapes.

export const PRIX_PACK = 50_000

export type StatutPack = 'en_attente_paiement' | 'paye' | 'termine' | 'annule'
export type ModePaiement = 'especes' | 'mobile_money' | 'virement'
export type EtapePack = 'formalites' | 'compte' | 'eligible'

export type Pack = {
  id: string
  lead_id?: string
  reference: string
  statut: StatutPack
  montant: number
  etapes: Record<string, string>
  paiement_mode?: ModePaiement | null
  paiement_montant?: number | null
  recu_numero?: string | null
  confirme_at?: string | null
  confirme_par_nom?: string | null
  created_at: string
  lead_nom?: string
  raison_sociale?: string | null
  telephone?: string | null
  ville?: string | null
  conseiller_nom?: string | null
}

export const CONTENU_PACK = ['RCCM', 'NIU et statuts', 'Ouverture du compte bancaire', 'Suivi par votre conseiller'] as const

/** Étapes que le conseiller coche après le paiement. */
export const ETAPES_PACK: { k: EtapePack; label: string }[] = [
  { k: 'formalites', label: 'RCCM, NIU et statuts' },
  { k: 'compte', label: 'Compte bancaire ouvert' },
  { k: 'eligible', label: 'Dossier éligible' },
]

export const MODES_PAIEMENT: { k: ModePaiement; label: string }[] = [
  { k: 'especes', label: 'Espèces' },
  { k: 'mobile_money', label: 'Mobile Money' },
  { k: 'virement', label: 'Virement' },
]

export function libelleStatutPack(s: StatutPack): string {
  return s === 'en_attente_paiement' ? 'En attente de paiement' : s === 'paye' ? 'Pack payé' : s === 'termine' ? 'Pack terminé' : 'Annulé'
}

export function libelleMode(m?: string | null): string {
  return MODES_PAIEMENT.find(x => x.k === m)?.label || '—'
}

export function estPaye(p?: Pick<Pack, 'statut'> | null): boolean {
  return !!p && (p.statut === 'paye' || p.statut === 'termine')
}

/** Suivi complet pour le client : souscrit, paiement confirmé, puis les 3 étapes du conseiller. */
export function suiviPack(p: Pick<Pack, 'statut' | 'etapes'>): { label: string; fait: boolean }[] {
  const e = p.etapes || {}
  return [
    { label: 'Souscrit', fait: true },
    { label: 'Paiement confirmé', fait: estPaye(p) },
    ...ETAPES_PACK.map(x => ({ label: x.label, fait: estPaye(p) && !!e[x.k] })),
  ]
}

/** Index de l'étape en cours (la première non faite), ou -1 si tout est fait. */
export function etapeEnCours(p: Pick<Pack, 'statut' | 'etapes'>): number {
  return suiviPack(p).findIndex(x => !x.fait)
}

type LeadPack = {
  statut?: string | null
  score?: number | string | null
  banque_actuelle?: string | null
  eligibilite?: { non_eligible?: boolean | undefined; salaire_domic?: string | undefined } | null
  situation?: { rccm?: string | undefined } | null
}

const DEJA_AVANCE = new Set(['Éligible', 'Dossier Déposé', 'Financé', 'Perdu'])

/** Faut-il proposer le pack à ce dossier ? (pas encore éligible) */
export function proposerPack(l: LeadPack): boolean {
  if (l.statut && DEJA_AVANCE.has(l.statut)) return false
  if (l.statut === 'Non Éligible' || l.eligibilite?.non_eligible === true) return true
  if (l.situation?.rccm === 'Non') return true
  if (l.banque_actuelle === 'Aucune' || l.eligibilite?.salaire_domic === 'Non') return true
  return l.score != null && l.score !== '' && Number(l.score) < 50
}

/** Contrôle du formulaire « Confirmer le paiement » : message d'erreur ou null. */
export function verifPaiement(f: { mode: string; montant: string; recu: string }): string | null {
  if (!MODES_PAIEMENT.some(m => m.k === f.mode)) return 'Choisissez le mode de paiement.'
  const n = Number(String(f.montant).replace(/\D/g, ''))
  if (!n) return 'Indiquez le montant reçu.'
  if (n > 10_000_000) return 'Montant reçu invalide.'
  if (!f.recu.trim()) return 'Indiquez le numéro du reçu.'
  return null
}

/** Chiffres de la page admin : à encaisser, encaissé, en cours. */
export function chiffresPacks(liste: Pick<Pack, 'statut' | 'montant' | 'paiement_montant'>[]) {
  const attente = liste.filter(p => p.statut === 'en_attente_paiement')
  const payes = liste.filter(p => estPaye(p))
  return {
    aEncaisser: attente.length,
    montantAEncaisser: attente.reduce((s, p) => s + (Number(p.montant) || PRIX_PACK), 0),
    payes: payes.length,
    encaisse: payes.reduce((s, p) => s + (Number(p.paiement_montant) || 0), 0),
    enCours: liste.filter(p => p.statut === 'paye').length,
    termines: liste.filter(p => p.statut === 'termine').length,
  }
}
