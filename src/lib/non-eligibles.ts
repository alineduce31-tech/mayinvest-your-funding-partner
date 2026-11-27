// Page admin « Non éligibles » (module pur, testé) : pourquoi le dossier est refusé et quoi lui proposer.

import { PRIX_PACK_FORMALISATION } from './lead-templates'
import { nomLead, estPme, type LeadB } from './bancarisation'

export type LeadNE = LeadB & { score?: number | null }
export type Raison = { code: 'pack' | 'rccm' | 'score' | 'marque'; libelle: string }
export type Offre = { key: 'pack_formalisation' | 'repasser'; label: string }
export type FiltreNE = 'tous' | 'rccm' | 'score' | 'pack' | 'sans_conseiller'

const PACK = 'Pack Formalisation Vendu'
const SEUIL_SCORE = 40

export function estNonEligible(l: LeadNE): boolean {
  return l.eligibilite?.non_eligible === true || l.statut === 'Non Éligible' || l.situation?.rccm === 'Non' || l.statut === PACK
}

export function raison(l: LeadNE): Raison {
  if (l.statut === PACK) return { code: 'pack', libelle: 'Pack en cours' }
  if (l.situation?.rccm === 'Non') return { code: 'rccm', libelle: 'Pas de RCCM' }
  if (l.score != null && Number(l.score) < SEUIL_SCORE) return { code: 'score', libelle: `Score ${l.score}/100` }
  return { code: 'marque', libelle: 'Marqué non éligible' }
}

export function offre(l: LeadNE): Offre {
  const r = raison(l)
  if (r.code === 'pack') return { key: 'repasser', label: 'Repasser en éligible' }
  // Une seule offre : le Pack formalisation inclut RCCM, NIU, statuts et ouverture du compte bancaire
  return { key: 'pack_formalisation', label: 'Pack formalisation' }
}

export function chiffresNE(liste: LeadNE[]) {
  const actifs = liste.filter(l => l.statut !== PACK && l.statut !== 'Perdu')
  const sansRccm = actifs.filter(l => raison(l).code === 'rccm').length
  const packs = liste.filter(l => l.statut === PACK).length
  return {
    aReconvertir: actifs.length,
    sansConseiller: actifs.filter(l => !l.agent_commercial_id).length,
    sansRccm,
    packs,
    encaisse: packs * PRIX_PACK_FORMALISATION,
    potentiel: sansRccm * PRIX_PACK_FORMALISATION,
  }
}

export function compteFiltresNE(liste: LeadNE[]): Record<FiltreNE, number> {
  return {
    tous: liste.length,
    rccm: liste.filter(l => raison(l).code === 'rccm').length,
    score: liste.filter(l => raison(l).code === 'score').length,
    pack: liste.filter(l => raison(l).code === 'pack').length,
    sans_conseiller: liste.filter(l => !l.agent_commercial_id && l.statut !== 'Perdu').length,
  }
}

function sansAccents(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Filtre et recherche ; sans conseiller d'abord, puis plus gros montants ; packs vendus et perdus en bas. */
export function listeNE(liste: LeadNE[], filtre: FiltreNE, q: string): LeadNE[] {
  const t = sansAccents(q.trim())
  const rang = (l: LeadNE) => (l.statut === 'Perdu' ? 2 : l.statut === PACK ? 1 : 0)
  return liste
    .filter(l => {
      if (filtre === 'rccm' && raison(l).code !== 'rccm') return false
      if (filtre === 'score' && raison(l).code !== 'score') return false
      if (filtre === 'pack' && raison(l).code !== 'pack') return false
      if (filtre === 'sans_conseiller' && (l.agent_commercial_id || l.statut === 'Perdu')) return false
      if (!t) return true
      return sansAccents([nomLead(l), l.ville, l.identite?.ville, l.activite].filter(Boolean).join(' ')).includes(t)
    })
    .sort((a, b) => rang(a) - rang(b)
      || (a.agent_commercial_id ? 1 : 0) - (b.agent_commercial_id ? 1 : 0)
      || (Number(b.montant_demande) || 0) - (Number(a.montant_demande) || 0))
}

/** Variables des modèles WhatsApp existants. */
export function variablesModele(l: LeadNE): Record<string, string> {
  const id = l.identite || {}; const s = l.situation || {}
  return {
    prenom: id.prenom || id.nom || s.raison_sociale || 'Client',
    nom: id.nom || '',
    raison_sociale: s.raison_sociale || id.raison_sociale || (estPme(l) ? nomLead(l) : ''),
    telephone: id.telephone || id.tel || s.telephone || '',
  }
}
