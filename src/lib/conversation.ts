// Conversation partagée (module pur, testé) : qui parle, de quel côté, regroupement des bulles,
// libellés de jour, cartes « pièces » et « rendez-vous », réponses suggérées.

export type Ton = 'moi' | 'client' | 'equipe' | 'note'
export type Bulle = {
  id: string
  cote: 'gauche' | 'droite'
  ton: Ton
  etiquette: string | null
  contenu: string
  kind: 'text' | 'pieces' | 'rdv' | 'pack' | 'evenement' | 'supprime'
  /** Message écrit par la personne qui regarde (elle peut le supprimer). */
  mien?: boolean
  payload: any
  created_at: string
  vu: boolean
  auteur: string
}
export type BulleAffichee = Bulle & { jour: string | null; debut: boolean; fin: boolean }

type RawLead = { id: string; sender: string; content: string; created_at: string; read_at?: string | null; author_id?: string | null; author_name?: string | null; visibility?: string | null; kind?: string | null; payload?: any; deleted_at?: string | null }

/** Anciens messages « il nous manque encore : - X - Y » envoyés en simple texte : pièces citées, ou null. */
export function piecesDansTexte(t: string | null | undefined): string[] | null {
  if (!t || !/il nous manque encore\s*:/i.test(t)) return null
  const items = t.split('\n').map(l => l.trim()).filter(l => /^[-•]\s+/.test(l)).map(l => l.replace(/^[-•]\s+/, '').trim()).filter(Boolean)
  return items.length ? items : null
}

export type Evenement = { texte: string; etat: 'souscrit' | 'paye' | 'ok' | 'att' | 'neutre'; icone: 'pack' | 'rdv' | 'appel' }

/** Messages écrits automatiquement par la plateforme → courte ligne d'événement avec icône. */
export function evenementPack(t: string | null | undefined): Evenement | null {
  if (!t) return null
  const ref = /\((?:référence\s+)?(PF-[A-Z0-9]+)\)/i.exec(t)?.[1]
  if (/^J'ai souscrit au Pack formalisation/i.test(t)) return { texte: `Pack formalisation souscrit${ref ? ` · ${ref}` : ''}`, etat: 'souscrit', icone: 'pack' }
  if (/^Paiement du Pack formalisation reçu/i.test(t)) return { texte: `Paiement du pack confirmé${ref ? ` · ${ref}` : ''}`, etat: 'paye', icone: 'pack' }
  const rdv = /^Je confirme le rendez-vous du (.+?)\.?$/i.exec(t.trim())
  if (rdv) return { texte: `Rendez-vous confirmé · ${rdv[1]}`, etat: 'ok', icone: 'rdv' }
  if (/^Cette date ne me convient pas/i.test(t)) return { texte: 'Le client demande une autre date', etat: 'att', icone: 'rdv' }
  const appel = /^Appel vers (.+?)(?: via WhatsApp| depuis l'ordinateur)? à (\d{1,2}[:h]\d{2})\.?$/i.exec(t.trim())
  if (appel) return { texte: `Appel · ${appel[1]}${/WhatsApp/i.test(t) ? ' · WhatsApp' : ''} · ${appel[2]!.replace(':', ' h ')}`, etat: 'neutre', icone: 'appel' }
  return null
}

/** Ancien message texte de proposition du Pack formalisation. */
export function estTextePack(t: string | null | undefined): boolean {
  return !!t && /pack formalisation/i.test(t) && /(50\s?000|tarif|souscri)/i.test(t) && t.length > 120
}

/** Type d'affichage et données de la carte (les anciens messages de pièces deviennent des cartes). */
export function carteDe(m: { kind?: string | null; payload?: any; content?: string | null; deleted_at?: string | null }): { kind: Bulle['kind']; payload: any } {
  if (m.deleted_at) return { kind: 'supprime', payload: null }
  if (m.kind === 'pieces' || m.kind === 'rdv' || m.kind === 'pack') return { kind: m.kind, payload: m.payload }
  // Messages automatiques du pack : petite ligne d'événement
  const ev = evenementPack(m.content)
  if (ev) return { kind: 'evenement', payload: ev }
  // Anciens messages texte proposant le Pack formalisation : affichés comme la carte
  if (estTextePack(m.content)) return { kind: 'pack', payload: { produit: 'pack_formalisation', montant: 50000 } }
  const labels = piecesDansTexte(m.content)
  return labels ? { kind: 'pieces', payload: { labels } } : { kind: 'text', payload: m.payload }
}
function prenom(n: string | null | undefined, defaut: string): string {
  return (n || '').trim().split(/\s+/)[0] || defaut
}

/** Fil client vu par le commercial du dossier. */
export function vueCommercial(m: RawLead, commercialId: string, nomClient: string): Bulle {
  const interne = m.visibility === 'internal'
  const moi = m.author_id === commercialId
  const client = m.sender === 'client'
  return {
    id: m.id, contenu: m.content, ...carteDe(m), created_at: m.created_at, mien: moi,
    cote: client || (!moi && !interne) ? 'gauche' : 'droite',
    ton: interne ? 'note' : client ? 'client' : moi ? 'moi' : 'equipe',
    etiquette: interne ? (moi ? 'Ta note · invisible pour le client' : 'Note de la direction · invisible pour le client') : client ? null : moi ? 'Vous' : `${m.author_name || 'Direction'} · direction`,
    vu: moi && !interne && !!m.read_at,
    auteur: client ? prenom(nomClient, 'Client') : moi ? 'Vous' : (m.author_name || 'Direction'),
  }
}

/** Fil client vu par la direction (admin). L'équipe est à droite, le client à gauche. */
export function vueAdmin(m: RawLead, adminId: string, nomClient: string): Bulle {
  const interne = m.visibility === 'internal'
  const client = m.sender === 'client'
  const moi = m.author_id === adminId
  const role = m.sender === 'commercial' ? 'conseiller' : 'direction'
  return {
    id: m.id, contenu: m.content, ...carteDe(m), created_at: m.created_at, mien: moi,
    cote: client ? 'gauche' : 'droite',
    ton: interne ? 'note' : client ? 'client' : moi ? 'moi' : 'equipe',
    etiquette: interne ? `Note interne · ${moi ? 'vous' : (m.author_name || role)}` : client ? null : moi ? 'Vous' : `${m.author_name || (role === 'conseiller' ? 'Conseiller' : 'Direction')} · ${role}`,
    vu: !client && !interne && !!m.read_at,
    auteur: client ? prenom(nomClient, 'Client') : moi ? 'Vous' : (m.author_name || role),
  }
}

/** Fil vu par le client : les notes internes ne lui parviennent pas (filtrées en base). */
export function vueClient(m: RawLead): Bulle {
  const moi = m.sender === 'client'
  return {
    id: m.id, contenu: m.content, ...carteDe(m), created_at: m.created_at, mien: moi,
    cote: moi ? 'droite' : 'gauche',
    ton: moi ? 'moi' : 'equipe',
    etiquette: !moi ? `${m.author_name || 'Mayinvest'} · ${m.sender === 'admin' ? 'Direction' : 'Conseiller'}` : null,
    vu: moi && !!m.read_at,
    auteur: moi ? 'Vous' : (m.author_name || 'Conseiller'),
  }
}

/** Fil direction <-> commercial. */
export function vueEquipe(m: { id: string; sender_type: string; body: string; created_at: string; read_at?: string | null; deleted_at?: string | null }, viewer: 'commercial' | 'director', nomCommercial = 'Commercial'): Bulle {
  const moi = m.sender_type === viewer
  return {
    id: m.id, contenu: m.body, kind: m.deleted_at ? 'supprime' : 'text', payload: null, created_at: m.created_at, mien: moi,
    cote: moi ? 'droite' : 'gauche',
    ton: moi ? 'moi' : 'equipe',
    etiquette: moi ? null : (m.sender_type === 'director' ? 'Direction Mayinvest' : nomCommercial),
    vu: moi && !!m.read_at,
    auteur: moi ? 'Vous' : (m.sender_type === 'director' ? 'Direction' : nomCommercial),
  }
}

const QUATRE_MIN = 4 * 60_000

/** Ajoute le séparateur de jour et regroupe les bulles consécutives d'une même personne (moins de 4 min d'écart). */
export function regrouper(bulles: Bulle[], now: number): BulleAffichee[] {
  return bulles.map((b, i) => {
    const prev = bulles[i - 1]; const next = bulles[i + 1]
    const jourB = new Date(b.created_at).toDateString()
    const nouveauJour = !prev || new Date(prev.created_at).toDateString() !== jourB
    const meme = (a?: Bulle) => !!a && a.ton === b.ton && a.auteur === b.auteur && a.kind === 'text' && b.kind === 'text'
      && Math.abs(new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) < QUATRE_MIN
    const nextMemeJour = !!next && new Date(next.created_at).toDateString() === jourB
    return {
      ...b,
      jour: nouveauJour ? libelleJour(b.created_at, now) : null,
      debut: nouveauJour || !meme(prev),
      fin: !nextMemeJour || !meme(next),
    }
  })
}

export function libelleJour(iso: string, now: number): string {
  const d = new Date(iso); const a = new Date(d); a.setHours(0, 0, 0, 0)
  const b = new Date(now); b.setHours(0, 0, 0, 0)
  const j = Math.round((b.getTime() - a.getTime()) / 86_400_000)
  if (j === 0) return "Aujourd'hui"
  if (j === 1) return 'Hier'
  const s = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function heure(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

// ============ Cartes ============
export type StatutRdv = 'propose' | 'confirme' | 'autre'

export function lireRdv(payload: any): { at: number; lieu: string; statut: StatutRdv } | null {
  const at = payload?.at ? new Date(payload.at).getTime() : NaN
  if (!Number.isFinite(at)) return null
  const s = payload?.statut
  return { at, lieu: String(payload?.lieu || ''), statut: s === 'confirme' || s === 'autre' ? s : 'propose' }
}

const JOURS = ['DIM.', 'LUN.', 'MAR.', 'MER.', 'JEU.', 'VEN.', 'SAM.']
export function blocCalendrier(at: number): { jour: string; num: number } {
  const d = new Date(at)
  return { jour: JOURS[d.getDay()] ?? '', num: d.getDate() }
}

/** "Vendredi 28 novembre à 15 h" */
export function phraseRdv(at: number): string {
  const d = new Date(at)
  const j = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const m = d.getMinutes()
  return `${j.charAt(0).toUpperCase()}${j.slice(1)} à ${d.getHours()} h${m ? ` ${String(m).padStart(2, '0')}` : ''}`
}

export function texteSecoursRdv(at: number, lieu: string): string {
  return `Je vous propose un rendez-vous le ${phraseRdv(at).toLowerCase()}${lieu ? ` (${lieu})` : ''}. Confirmez-le directement ici.`
}

export function reponseClientRdv(at: number, rep: 'confirme' | 'autre'): string {
  return rep === 'confirme'
    ? `Je confirme le rendez-vous du ${phraseRdv(at).toLowerCase()}.`
    : 'Cette date ne me convient pas, pouvez-vous m\'en proposer une autre ?'
}

/** Pièces d'une carte : celles listées dans la carte, sinon toutes celles qui restent à envoyer. */
const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim()

export function piecesDeCarte<T extends { id: string; status?: string | null; doc_label?: string | null }>(payload: any, docs: T[]): T[] {
  // Ancien message texte : on relie chaque pièce citée à celle du dossier (même intitulé), sinon « à envoyer »
  if (Array.isArray(payload?.labels)) {
    return (payload.labels as string[]).map((label, i) => {
      const n = norm(label)
      const doc = docs.find(d => d.doc_label && (norm(d.doc_label) === n || norm(d.doc_label).startsWith(n) || n.startsWith(norm(d.doc_label))))
      return doc || ({ id: `texte-${i}`, doc_label: label, status: 'pending' } as unknown as T)
    })
  }
  const ids: string[] = Array.isArray(payload?.doc_ids) ? payload.doc_ids : []
  if (ids.length) {
    const choisies = docs.filter(d => ids.includes(d.id))
    if (choisies.length) return choisies
  }
  return docs
}

export function estRecue(status: string | null | undefined): boolean {
  return status === 'validated' || status === 'uploaded'
}

export function texteSecoursPieces(labels: string[]): string {
  if (!labels.length) return 'Voici la liste des pièces de votre dossier.'
  return `Pour avancer sur votre dossier, il nous manque encore :\n${labels.map(l => `- ${l}`).join('\n')}\nVous pouvez les envoyer directement ici.`
}

// ============ Réponses suggérées ============
export function suggestions(viewer: 'client' | 'equipe', bulles: Bulle[], prenomClient = ''): string[] {
  const dernier = [...bulles].reverse().find(b => b.ton !== 'note')
  if (viewer === 'client') {
    if (dernier?.kind === 'pieces') return ["J'envoie mes pièces aujourd'hui.", 'Merci !', 'J\'ai une question sur une pièce.']
    if (dernier?.kind === 'rdv') return ['Merci, à bientôt !', 'Où se trouve l\'agence ?']
    return ['Merci !', 'D\'accord.', 'Où en est mon dossier ?']
  }
  const p = prenomClient ? ` ${prenomClient}` : ''
  if (!dernier) return [`Bonjour${p}, je prends en charge votre dossier.`, 'Je vous appelle aujourd\'hui.']
  if (dernier.ton === 'client') {
    const t = dernier.contenu.toLowerCase()
    if (/confirme le rendez-vous/.test(t)) return ['Parfait, à bientôt !', 'Pensez à apporter vos pièces originales.']
    if (/pi[eè]ce|document|envoy/.test(t)) return ['Merci, je vérifie vos documents.', 'Bien reçu, merci !']
    return [`Merci${p}, je regarde et je reviens vers vous.`, 'Je vous appelle dans la journée.']
  }
  return ['Avez-vous pu avancer ?', `Bonjour${p}, je reviens vers vous pour votre dossier.`]
}

/** Fichier partagé dans le chat ("📎 nom.ext" puis l'adresse) : nom, adresse, type et texte restant. */
export function pieceJointe(contenu: string): { nom: string; url: string; type: 'image' | 'pdf' | 'fichier'; reste: string } | null {
  const lignes = (contenu || '').split('\n')
  const f = lignes.find(l => l.startsWith('📎'))
  const u = lignes.find(l => /^https?:\/\//.test(l.trim()))
  if (!f || !u) return null
  const nom = f.replace('📎', '').trim() || 'Fichier'
  const ext = (nom.split('.').pop() || '').toLowerCase()
  const type = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? 'image' : ext === 'pdf' ? 'pdf' : 'fichier'
  const reste = lignes.filter(l => l !== f && l !== u).join('\n').trim()
  return { nom, url: u.trim(), type, reste }
}
