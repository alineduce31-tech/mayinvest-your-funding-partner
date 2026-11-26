// Petites règles d'affichage partagées (module pur, testé) :
// libellé des pièces, état d'une pièce, montant abrégé, date relative, couleur du score et du statut.

export type EtatPiece = 'validated' | 'uploaded' | 'rejected' | 'pending'

/** "Bulletins de salaire (3 derniers mois)" -> titre + précision. */
export function decouperLibelle(label: string): { titre: string; precision: string } {
  const l = (label || 'Document').trim()
  const m = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(l)
  if (!m) return { titre: l, precision: '' }
  return { titre: (m[1] ?? l).trim(), precision: (m[2] ?? '').trim() }
}

/** Raccourcit les titres trop longs les plus courants. */
export function titreCourt(titre: string): string {
  return titre.replace(/^Carte Nationale d'Identité$/i, "Carte d'identité")
}

export function etatPiece(status: string | null | undefined): EtatPiece {
  if (status === 'validated' || status === 'uploaded' || status === 'rejected') return status
  return 'pending'
}

export const LIBELLE_ETAT: Record<EtatPiece, string> = {
  validated: 'Validée', uploaded: 'À vérifier', rejected: 'Refusée', pending: 'Manquante',
}

export function iconePiece(docType: string | null | undefined, label: string): 'id' | 'salaire' | 'banque' | 'attestation' | 'societe' | 'fiscal' | 'doc' {
  const t = `${docType || ''} ${label}`.toLowerCase()
  if (/cni|identit|passeport/.test(t)) return 'id'
  if (/bulletin|salaire/.test(t)) return 'salaire'
  if (/relev|bancaire|banque/.test(t)) return 'banque'
  if (/attestation|employeur/.test(t)) return 'attestation'
  if (/rccm|statut|soci/.test(t)) return 'societe'
  if (/niu|fiscal|impot|impôt|bilan|états financiers/.test(t)) return 'fiscal'
  return 'doc'
}

/** Pièces que le client doit encore envoyer (manquantes ou refusées). */
export function piecesARelancer<T extends { status?: string | null; doc_label?: string | null }>(docs: T[]): T[] {
  return docs.filter(d => { const e = etatPiece(d.status); return e === 'pending' || e === 'rejected' })
}

/** Répartition pour la barre de progression (en %). */
export function progressionPieces(docs: { status?: string | null }[]): { valide: number; aVerifier: number } {
  const n = docs.length
  if (!n) return { valide: 0, aVerifier: 0 }
  const v = docs.filter(d => etatPiece(d.status) === 'validated').length
  const u = docs.filter(d => etatPiece(d.status) === 'uploaded').length
  return { valide: Math.round((v / n) * 100), aVerifier: Math.round((u / n) * 100) }
}

/** 5 200 000 -> "5,2 M XAF" ; 850 000 -> "850 000 XAF" */
export function montantCourt(n: number | null | undefined): string {
  const v = Number(n) || 0
  if (!v) return '—'
  if (v >= 1_000_000) {
    const m = Math.round((v / 1_000_000) * 10) / 10
    return `${String(m).replace('.', ',')} M XAF`
  }
  return `${new Intl.NumberFormat('fr-FR').format(v).replace(/ | /g, ' ')} XAF`
}

/** "auj.", "hier", "il y a 3 j", puis "12/11" (même année) ou "12/11/2025". */
export function dateRelative(iso: string | null | undefined, now: number): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const a = new Date(d); a.setHours(0, 0, 0, 0)
  const b = new Date(now); b.setHours(0, 0, 0, 0)
  const j = Math.round((b.getTime() - a.getTime()) / 86_400_000)
  if (j <= 0) return 'auj.'
  if (j === 1) return 'hier'
  if (j < 7) return `il y a ${j} j`
  const jj = String(d.getDate()).padStart(2, '0'); const mm = String(d.getMonth() + 1).padStart(2, '0')
  return d.getFullYear() === new Date(now).getFullYear() ? `${jj}/${mm}` : `${jj}/${mm}/${d.getFullYear()}`
}

export function tonScore(score: number | null | undefined): 'vert' | 'orange' | 'rouge' | 'aucun' {
  const s = Number(score)
  if (!s && s !== 0) return 'aucun'
  if (!score) return 'aucun'
  if (s >= 70) return 'vert'
  if (s >= 40) return 'orange'
  return 'rouge'
}

export function tonStatut(statut: string | null | undefined): 'bleu' | 'violet' | 'vert' | 'gris' | 'orange' {
  switch (statut) {
    case 'Financé': case 'Éligible': return 'vert'
    case 'Dossier Déposé': return 'violet'
    case 'RDV': return 'orange'
    case 'Perdu': case 'Non Éligible': return 'gris'
    default: return 'bleu'
  }
}

export function initialesNom(nom: string): string {
  const p = nom.trim().split(/\s+/).filter(Boolean)
  if (!p.length) return '?'
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1]?.[0] ?? '' : p[0]?.[1] ?? '')).toUpperCase()
}

export type Segment = { type: 'texte'; texte: string } | { type: 'liste'; items: string[] }

/** Découpe un message : les lignes qui commencent par "-", "•" ou "*" deviennent une liste (affichée en étiquettes). */
export function segmentsMessage(contenu: string): Segment[] {
  const out: Segment[] = []
  for (const brut of (contenu || '').split('\n')) {
    const puce = /^\s*[-•*]\s+(.+)$/.exec(brut)
    const dernier = out[out.length - 1]
    if (puce) {
      const item = (puce[1] ?? '').trim()
      if (dernier && dernier.type === 'liste') dernier.items.push(item)
      else out.push({ type: 'liste', items: [item] })
    } else if (dernier && dernier.type === 'texte') {
      dernier.texte += `\n${brut}`
    } else {
      out.push({ type: 'texte', texte: brut })
    }
  }
  return out
    .map(s => (s.type === 'texte' ? { ...s, texte: s.texte.replace(/^\n+|\n+$/g, '') } : s))
    .filter(s => s.type === 'liste' || s.texte.trim() !== '')
}
