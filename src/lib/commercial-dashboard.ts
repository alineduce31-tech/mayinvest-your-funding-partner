// Calculs du tableau de bord commercial (module pur, sans dépendance navigateur)

export const COMMISSION_PAR_DOSSIER = 50_000
export const OBJECTIF_MENSUEL = 3
export const DELAI_RELANCE_MS = 48 * 3_600_000

export type CommercialLead = {
  id: string
  statut: string
  created_at: string
  updated_at?: string | null
}

export type Etape = 'a_contacter' | 'rdv' | 'depose'

export const ETAPES: { key: Etape; label: string }[] = [
  { key: 'a_contacter', label: 'À contacter' },
  { key: 'rdv', label: 'Rendez-vous' },
  { key: 'depose', label: 'Déposé en banque' },
]

export function etapeDe(statut: string): Etape | null {
  if (statut === 'Nouveau' || statut === 'Contacté') return 'a_contacter'
  if (statut === 'RDV' || statut === 'Éligible') return 'rdv'
  if (statut === 'Dossier Déposé') return 'depose'
  return null
}

export function grouperParEtape<T extends CommercialLead>(leads: T[]): Record<Etape, T[]> {
  const out: Record<Etape, T[]> = { a_contacter: [], rdv: [], depose: [] }
  for (const l of leads) {
    const e = etapeDe(l.statut)
    if (e) out[e].push(l)
  }
  return out
}

function dateRef(l: CommercialLead): number {
  return new Date(l.updated_at || l.created_at).getTime()
}

export function financesCeMois(leads: CommercialLead[], now: number): number {
  const d = new Date(now)
  const debut = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)
  return leads.filter(l => l.statut === 'Financé' && dateRef(l) >= debut && dateRef(l) <= now).length
}

export function progressionObjectif(finances: number, objectif = OBJECTIF_MENSUEL) {
  const fait = Math.max(0, finances)
  const pct = objectif > 0 ? Math.min(100, Math.round((fait / objectif) * 100)) : 0
  return { fait, objectif, pct, reste: Math.max(0, objectif - fait), atteint: fait >= objectif }
}

export function gainsPour(nbDossiers: number): number {
  return Math.max(0, Math.floor(nbDossiers)) * COMMISSION_PAR_DOSSIER
}

export type Tache = { key: string; label: string; detail: string; nb: number; cible: 'clients' | 'leads' }

export function tachesDuJour(leads: CommercialLead[], clientsEnAttente: number, now: number): Tache[] {
  const nouveaux = leads.filter(l => l.statut === 'Nouveau').length
  const aRelancer = leads.filter(l => l.statut === 'Contacté' && now - dateRef(l) >= DELAI_RELANCE_MS).length
  const rdv = leads.filter(l => l.statut === 'RDV' || l.statut === 'Éligible').length
  const deposes = leads.filter(l => l.statut === 'Dossier Déposé').length
  const t: Tache[] = []
  if (clientsEnAttente > 0) t.push({ key: 'repondre', label: 'Répondre aux clients', detail: `${clientsEnAttente} message${clientsEnAttente > 1 ? 's' : ''} non lu${clientsEnAttente > 1 ? 's' : ''}`, nb: clientsEnAttente, cible: 'clients' })
  if (nouveaux > 0) t.push({ key: 'appeler', label: 'Appeler les nouveaux prospects', detail: `${nouveaux} à contacter`, nb: nouveaux, cible: 'leads' })
  if (aRelancer > 0) t.push({ key: 'relancer', label: 'Relancer sans réponse depuis 48 h', detail: `${aRelancer} dossier${aRelancer > 1 ? 's' : ''}`, nb: aRelancer, cible: 'leads' })
  if (rdv > 0) t.push({ key: 'rdv', label: 'Préparer les rendez-vous', detail: `${rdv} dossier${rdv > 1 ? 's' : ''} en RDV`, nb: rdv, cible: 'leads' })
  if (deposes > 0) t.push({ key: 'suivi', label: 'Suivre les dossiers en banque', detail: `${deposes} déposé${deposes > 1 ? 's' : ''}`, nb: deposes, cible: 'leads' })
  return t
}
