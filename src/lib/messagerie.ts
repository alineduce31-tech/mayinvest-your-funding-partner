// Logique de la messagerie direction (module pur, testé)

export type InboxRow = {
  lead_id: string
  nom: string | null
  statut: string | null
  type: string | null
  montant: number | null
  ville: string | null
  agent_id: string | null
  agent_nom: string | null
  last_message: string | null
  last_sender: string | null
  last_visibility: string | null
  last_at: string | null
  unread: number
  waiting_since: string | null
  docs_total: number
  docs_ok: number
}

export type TeamRow = {
  commercial_id: string
  nom: string
  ville: string | null
  telephone: string | null
  last_body: string | null
  last_sender: string | null
  last_at: string | null
  unread: number
}

export type Filtre = 'tous' | 'non_lus' | 'attente' | 'sans_conseiller' | 'equipe'

export const SEUIL_ATTENTE_H = 24

export function heuresAttente(waitingSince: string | null, now: number): number {
  if (!waitingSince) return 0
  return Math.max(0, Math.floor((now - new Date(waitingSince).getTime()) / 3_600_000))
}

export function enRetard(r: Pick<InboxRow, 'waiting_since'>, now: number): boolean {
  return heuresAttente(r.waiting_since, now) >= SEUIL_ATTENTE_H
}

function norm(s: string | null | undefined) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function filtrerInbox(rows: InboxRow[], filtre: Filtre, recherche: string, now: number): InboxRow[] {
  const q = norm(recherche.trim())
  return rows.filter(r => {
    if (filtre === 'non_lus' && Number(r.unread) === 0) return false
    if (filtre === 'attente' && !enRetard(r, now)) return false
    if (filtre === 'sans_conseiller' && r.agent_id) return false
    if (filtre === 'equipe') return false
    if (!q) return true
    return [r.nom, r.agent_nom, r.ville, r.statut, r.last_message].some(v => norm(v).includes(q))
  })
}

export function filtrerEquipe(rows: TeamRow[], recherche: string): TeamRow[] {
  const q = norm(recherche.trim())
  if (!q) return rows
  return rows.filter(r => [r.nom, r.ville, r.last_body].some(v => norm(v).includes(q)))
}

export function compteurs(rows: InboxRow[], team: TeamRow[], now: number) {
  return {
    nonLus: rows.reduce((n, r) => n + Number(r.unread || 0), 0) + team.reduce((n, r) => n + Number(r.unread || 0), 0),
    enAttente: rows.filter(r => enRetard(r, now)).length,
    sansConseiller: rows.filter(r => !r.agent_id).length,
  }
}

export function apercu(r: Pick<InboxRow, 'last_message' | 'last_sender' | 'last_visibility'>): string {
  const qui = r.last_sender === 'client' ? 'Client' : r.last_sender === 'commercial' ? 'Commercial' : 'Direction'
  const txt = (r.last_message || '').replace(/\s+/g, ' ').trim()
  return `${r.last_visibility === 'internal' ? 'Note · ' : ''}${qui} : ${txt}`
}

export function heureCourte(iso: string | null, now: number): string {
  if (!iso) return ''
  const d = new Date(iso)
  const n = new Date(now)
  if (d.toDateString() === n.toDateString()) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const hier = new Date(now - 86_400_000)
  if (d.toDateString() === hier.toDateString()) return 'Hier'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

export function initiales(nom: string | null | undefined): string {
  const p = (nom || '').trim().split(/\s+/).filter(Boolean)
  return ((p[0]?.[0] || '?') + (p[1]?.[0] || '')).toUpperCase()
}

export function messageRdv(creneaux: string[]): string {
  const liste = creneaux.filter(c => c.trim()).map(c => `- ${c.trim()}`).join('\n')
  return `Bonjour, je vous propose un rendez-vous pour avancer sur votre dossier. Quel créneau vous convient ?\n${liste}\nRépondez simplement avec le créneau choisi.`
}

export type MessageType = { cle: 'prise' | 'pieces' | 'depose' | 'relance' | 'merci'; label: string; text: string }

/** Message conseillé selon le statut du dossier (null si rien de particulier). */
export function messageConseille(statut: string | null | undefined): MessageType['cle'] | null {
  if (statut === 'Nouveau') return 'prise'
  if (statut === 'Contacté' || statut === 'RDV') return 'pieces'
  if (statut === 'Dossier Déposé') return 'depose'
  if (statut === 'Éligible' || statut === 'Financé') return 'merci'
  return null
}

/** Recherche sans accents dans le titre et le texte. */
export function filtrerMessages<T extends { label: string; text: string }>(liste: T[], q: string): T[] {
  const n = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const t = n(q.trim())
  return t ? liste.filter(m => n(`${m.label} ${m.text}`).includes(t)) : liste
}

export const MESSAGES_TYPES: MessageType[] = [
  { cle: 'prise', label: 'Prise en charge', text: 'Bonjour, je prends en charge votre dossier. Je reviens vers vous très vite avec les prochaines étapes.' },
  { cle: 'pieces', label: 'Pièces manquantes', text: 'Bonjour, pour avancer il nous manque quelques pièces. Vous pouvez les envoyer directement depuis votre espace, rubrique Documents.' },
  { cle: 'depose', label: 'Dossier déposé', text: 'Bonne nouvelle : votre dossier vient d\'être déposé à la banque. Nous suivons la réponse et vous tenons informé.' },
  { cle: 'relance', label: 'Relance', text: 'Bonjour, nous n\'avons pas eu de retour de votre part. Votre dossier est toujours en cours : avez-vous besoin d\'aide ?' },
  { cle: 'merci', label: 'Remerciement', text: 'Merci pour votre confiance. N\'hésitez pas à nous écrire ici à tout moment.' },
]
