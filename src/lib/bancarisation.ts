// Page admin « Bancarisation » (module pur, testé) : qui en fait partie, chiffres, filtres et tri.

export type LeadB = {
  id: string; statut: string; type?: string | null; created_at: string; montant_demande?: number | null
  agent_commercial_id?: string | null; banque_actuelle?: string | null; ville?: string | null; activite?: string | null
  eligibilite?: any; identite?: any; situation?: any
}
export type FiltreB = 'tous' | 'nouveaux' | 'contactes' | 'sans_conseiller' | 'pme'

const CLOS = ['Non Éligible', 'Perdu']

export function estABancariser(l: LeadB): boolean {
  return l.eligibilite?.salaire_domic === 'Non' || l.banque_actuelle === 'Aucune'
}
export function estPme(l: LeadB): boolean {
  return !(l.type === 'physique' || l.type === 'Personne physique')
}
export function nomLead(l: LeadB): string {
  if (!estPme(l)) return `${l.identite?.prenom || ''} ${l.identite?.nom || ''}`.trim() || 'Prospect'
  return l.situation?.raison_sociale || l.identite?.raison_sociale || 'Entreprise'
}

export function chiffresB(liste: LeadB[], now: number) {
  const semaine = now - 7 * 86_400_000
  const actifs = liste.filter(l => !CLOS.includes(l.statut) && l.statut !== 'Bancarisé')
  return {
    aBancariser: actifs.length,
    cetteSemaine: actifs.filter(l => new Date(l.created_at).getTime() >= semaine).length,
    montant: actifs.reduce((s, l) => s + (Number(l.montant_demande) || 0), 0),
    sansConseiller: actifs.filter(l => !l.agent_commercial_id).length,
    contactes: liste.filter(l => l.statut === 'Contacté').length,
    bancarises: liste.filter(l => l.statut === 'Bancarisé').length,
  }
}

export function compteFiltres(liste: LeadB[]): Record<FiltreB, number> {
  return {
    tous: liste.length,
    nouveaux: liste.filter(l => l.statut === 'Nouveau').length,
    contactes: liste.filter(l => l.statut === 'Contacté').length,
    sans_conseiller: liste.filter(l => !l.agent_commercial_id && !CLOS.includes(l.statut)).length,
    pme: liste.filter(estPme).length,
  }
}

function sansAccents(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Filtre, recherche, puis tri : actifs d'abord (sans conseiller en tête, plus anciens en premier), clos en bas. */
export function listeB(liste: LeadB[], filtre: FiltreB, q: string): LeadB[] {
  const t = sansAccents(q.trim())
  return liste
    .filter(l => {
      if (filtre === 'nouveaux' && l.statut !== 'Nouveau') return false
      if (filtre === 'contactes' && l.statut !== 'Contacté') return false
      if (filtre === 'sans_conseiller' && (l.agent_commercial_id || CLOS.includes(l.statut))) return false
      if (filtre === 'pme' && !estPme(l)) return false
      if (!t) return true
      return sansAccents([nomLead(l), l.ville, l.identite?.ville, l.activite].filter(Boolean).join(' ')).includes(t)
    })
    .sort((a, b) => {
      const ca = CLOS.includes(a.statut) ? 1 : 0, cb = CLOS.includes(b.statut) ? 1 : 0
      if (ca !== cb) return ca - cb
      const sa = a.agent_commercial_id ? 1 : 0, sb = b.agent_commercial_id ? 1 : 0
      if (sa !== sb) return sa - sb
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
}

export function estClos(statut: string): boolean {
  return CLOS.includes(statut)
}
