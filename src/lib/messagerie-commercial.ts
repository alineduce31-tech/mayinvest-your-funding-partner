// Logique de la messagerie commerciale (module pur, testé)
import { COMMISSION_PAR_DOSSIER } from './commercial-dashboard'

export type ComRow = {
  lead_id: string
  nom: string | null
  statut: string | null
  type: string | null
  montant: number | null
  activite: string | null
  ville: string | null
  tel: string | null
  score: number | null
  last_message: string | null
  last_sender: string | null
  last_visibility: string | null
  last_at: string | null
  unread: number
  waiting_since: string | null
  docs_total: number
  docs_ok: number
  docs_uploaded: number
  created_at: string
}

export type FiltreCom = 'tous' | 'non_lus' | 'relancer'
export type Rappels = Record<string, number>

export const DELAI_SANS_REPONSE_MS = 48 * 3_600_000

export const SUIVI = [
  { key: 'contact', label: 'Contacté', statuts: ['Nouveau', 'Contacté'] },
  { key: 'rdv', label: 'Rendez-vous', statuts: ['RDV', 'Éligible'] },
  { key: 'depose', label: 'Déposé en banque', statuts: ['Dossier Déposé'] },
  { key: 'finance', label: 'Financé', statuts: ['Financé'] },
] as const

const CLOS = ['Perdu', 'Non Éligible']

export function indexSuivi(statut: string | null): number {
  if (!statut) return 0
  const i = SUIVI.findIndex(s => (s.statuts as readonly string[]).includes(statut))
  return i === -1 ? -1 : i
}

export function etapeSuivante(statut: string | null): string | null {
  switch (statut) {
    case 'Nouveau': return 'Contacté'
    case 'Contacté': return 'RDV'
    case 'RDV':
    case 'Éligible': return 'Dossier Déposé'
    case 'Dossier Déposé': return 'Financé'
    default: return null
  }
}

export function etapeFaite(statut: string | null, i: number): boolean {
  const cur = indexSuivi(statut)
  if (cur === -1) return false
  if (i < cur) return true
  return i === cur && (statut === 'Contacté' || statut === 'Financé')
}

export function piecesManquantes(r: Pick<ComRow, 'docs_total' | 'docs_ok' | 'docs_uploaded'>): number {
  return Math.max(0, Number(r.docs_total) - Number(r.docs_ok) - Number(r.docs_uploaded))
}

export function aRelancer(r: ComRow, now: number, rappels: Rappels = {}): boolean {
  const rappel = rappels[r.lead_id]
  if (rappel && rappel <= now) return true
  if (CLOS.includes(r.statut || '') || r.statut === 'Financé') return false
  if (!r.last_at || r.last_sender === 'client') return false
  if (r.last_visibility === 'internal') return false
  return now - new Date(r.last_at).getTime() >= DELAI_SANS_REPONSE_MS
}

export function heuresDepuis(iso: string | null, now: number): number {
  if (!iso) return 0
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 3_600_000))
}

function norm(s: string | null | undefined) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function filtrerCom(rows: ComRow[], filtre: FiltreCom, q: string, now: number, rappels: Rappels = {}): ComRow[] {
  const s = norm(q.trim())
  return rows
    .filter(r => {
      if (filtre === 'non_lus' && Number(r.unread) === 0) return false
      if (filtre === 'relancer' && !aRelancer(r, now, rappels)) return false
      return !s || [r.nom, r.ville, r.statut, r.tel, r.last_message].some(v => norm(v).includes(s))
    })
    .sort((a, b) => {
      const ua = Number(a.unread) > 0 ? 1 : 0
      const ub = Number(b.unread) > 0 ? 1 : 0
      if (ua !== ub) return ub - ua
      const ta = new Date(a.last_at || a.created_at).getTime()
      const tb = new Date(b.last_at || b.created_at).getTime()
      return tb - ta
    })
}

export type Action = 'repondre' | 'appeler' | 'pieces' | 'rdv' | 'etape' | null

export function prochaineEtape(r: ComRow, now: number): { texte: string; action: Action; bouton?: string; ton: 'info' | 'warn' | 'ok' } {
  const manque = piecesManquantes(r)
  if (Number(r.unread) > 0) {
    const h = heuresDepuis(r.waiting_since, now)
    return { texte: h >= 1 ? `Le client attend ta réponse depuis ${h} h. Réponds-lui en premier.` : 'Le client vient de t\'écrire. Réponds-lui vite.', action: 'repondre', ton: 'warn' }
  }
  if (r.statut === 'Financé') return { texte: `Dossier financé, bravo ! Ta commission : ${new Intl.NumberFormat('fr-FR').format(COMMISSION_PAR_DOSSIER)} XAF.`, action: null, ton: 'ok' }
  if (CLOS.includes(r.statut || '')) return { texte: 'Dossier clos. Tu peux garder le contact pour une prochaine demande.', action: null, ton: 'info' }
  if (r.statut === 'Nouveau') return { texte: 'Nouveau client : présente-toi et appelle-le aujourd\'hui.', action: 'appeler', bouton: 'Appeler', ton: 'info' }
  if (r.statut === 'Dossier Déposé') return { texte: 'Dossier en banque : suis la réponse et tiens le client informé.', action: null, ton: 'info' }
  if (r.statut === 'RDV' || r.statut === 'Éligible') {
    if (manque > 0) return { texte: `Il manque ${manque} pièce${manque > 1 ? 's' : ''} avant le dépôt en banque.`, action: 'pieces', bouton: 'Demander les pièces', ton: 'warn' }
    return { texte: 'Rendez-vous fait ? Passe le dossier en « Déposé en banque ».', action: 'etape', bouton: 'Étape suivante', ton: 'info' }
  }
  if (manque > 0) {
    return { texte: `Relance le client pour ${manque > 1 ? `les ${manque} pièces manquantes` : 'la pièce manquante'} avant le RDV.`, action: 'pieces', bouton: 'Relancer', ton: 'warn' }
  }
  if (Number(r.docs_uploaded) > 0) return { texte: `${r.docs_uploaded} pièce${Number(r.docs_uploaded) > 1 ? 's' : ''} en vérification par la direction. Propose déjà un rendez-vous.`, action: 'rdv', bouton: 'Proposer un RDV', ton: 'info' }
  return { texte: 'Toutes les pièces sont là : propose un rendez-vous au client.', action: 'rdv', bouton: 'Proposer un RDV', ton: 'ok' }
}

export function messagePieces(manquantes: string[]): string {
  if (manquantes.length === 0) return 'Bonjour, merci pour vos documents. Nous avons tout ce qu\'il faut pour avancer.'
  return `Bonjour, pour avancer sur votre dossier il nous manque encore :\n${manquantes.map(m => `- ${m}`).join('\n')}\nVous pouvez les envoyer directement depuis votre espace, rubrique Documents.`
}

export function demainMatin(now: number): number {
  const d = new Date(now)
  d.setDate(d.getDate() + 1)
  d.setHours(9, 0, 0, 0)
  return d.getTime()
}
