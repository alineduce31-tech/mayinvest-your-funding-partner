import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import PieceIcone from '@/components/PieceIcone'
import { CroixFermer, confirmer } from '@/components/Dialogue'
import { createPortal } from 'react-dom'
import { CheckCheck, Check, EyeOff, FolderCheck, Upload, MapPin, CalendarClock, ArrowUp, Sparkles, Clock, X, FileText, Download, FileBadge, Image as ImageIcon, Phone, Trash2, MoreHorizontal, Copy } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import {
  type BulleAffichee, heure, lireRdv, pieceJointe, blocCalendrier, phraseRdv, piecesDeCarte, estRecue,
} from '@/lib/conversation'
import { segmentsMessage, decouperLibelle, titreCourt, etatPiece } from '@/lib/affichage'
import { joursProposes, HEURES_PROPOSEES, combiner, heureTexte, estDansLeFutur } from '@/lib/rappels'
import { positionCarte, estMobile, type Position } from '@/lib/nice-select'

// ============ LISTE DES BULLES ============
export function Conversation({ bulles, viewer, docs = [], onUploadDoc, uploadingDocId, onRepondreRdv, vide, leadId, peutSupprimer, onSupprimer }: {
  bulles: BulleAffichee[]
  /** Qui peut supprimer quel message (par défaut : personne). */
  peutSupprimer?: ((b: BulleAffichee) => boolean) | undefined
  onSupprimer?: ((b: BulleAffichee) => Promise<void> | void) | undefined
  /** Dossier affiché (cartes « Pack » côté équipe). */
  leadId?: string | undefined
  viewer: 'client' | 'equipe'
  docs?: any[]
  onUploadDoc?: (doc: any, file: File) => void
  uploadingDocId?: string | null
  onRepondreRdv?: (b: BulleAffichee, rep: 'confirme' | 'autre') => Promise<void> | void
  vide?: ReactNode
}) {
  return (
    <div className="cv">
      <ConversationStyles/>
      {bulles.length === 0 && vide && <div className="cv-vide">{vide}</div>}
      {bulles.map(b => (
        <div key={b.id} className={`cv-ligne ${b.cote} ${b.debut ? 'debut' : ''} ${b.fin ? 'fin' : ''}`}>
          {b.jour && <div className="cv-jour">{b.jour}</div>}
          <div className="cv-row">
          {b.kind === 'supprime' ? <div className="cv-suppr"><Trash2 size={13}/>Message supprimé</div>
            : b.kind === 'pieces' ? <CartePieces b={b} viewer={viewer} docs={docs} onUploadDoc={onUploadDoc} uploadingDocId={uploadingDocId}/>
            : b.kind === 'rdv' ? <CarteRdv b={b} viewer={viewer} onRepondre={onRepondreRdv}/>
            : b.kind === 'pack' ? <CartePack viewer={viewer} leadId={leadId}/>
            : b.kind === 'evenement' ? <div className={`cv-ev ${b.payload?.etat || ''}`}>{b.payload?.icone === 'rdv' ? <CalendarClock size={14}/> : b.payload?.icone === 'appel' ? <Phone size={14}/> : <FileBadge size={14}/>}{b.payload?.texte}</div>
            : (
              <div className={`cv-bulle ${b.ton}`}>
                {b.debut && b.etiquette && <span className={`cv-tag ${b.ton}`}>{b.ton === 'note' && <EyeOff size={11}/>}{viewer === 'client' && b.ton === 'equipe' && <i className="cv-av">{initialesAuteur(b.auteur)}</i>}{b.etiquette}</span>}
                <Texte texte={b.contenu}/>
              </div>
            )}
          {b.kind !== 'supprime' && b.kind !== 'evenement' && onSupprimer && peutSupprimer?.(b) && <MenuMessage b={b} onSupprimer={onSupprimer}/>}
          </div>
          {b.fin && <Meta b={b}/>}
        </div>
      ))}
    </div>
  )
}

function initialesAuteur(n: string): string {
  const m = (n || '').trim().split(/\s+/).filter(Boolean)
  return ((m[0]?.[0] || '') + (m[1]?.[0] || '')).toUpperCase() || 'M'
}

function MenuMessage({ b, onSupprimer }: { b: BulleAffichee; onSupprimer: (b: BulleAffichee) => Promise<void> | void }) {
  const [open, setOpen] = useState(false)
  const [copie, setCopie] = useState(false)
  const zone = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const dehors = (e: MouseEvent | TouchEvent) => { if (!zone.current?.contains(e.target as Node)) setOpen(false) }
    const echap = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', dehors); document.addEventListener('touchstart', dehors); document.addEventListener('keydown', echap)
    return () => { document.removeEventListener('mousedown', dehors); document.removeEventListener('touchstart', dehors); document.removeEventListener('keydown', echap) }
  }, [open])
  async function copier() {
    try { await navigator.clipboard.writeText(b.contenu); setCopie(true); setTimeout(() => { setCopie(false); setOpen(false) }, 900) } catch { setOpen(false) }
  }
  async function supprimer() {
    setOpen(false)
    if (await confirmer({ titre: 'Supprimer ce message ?', texte: 'Il disparaît pour tout le monde dans la discussion. Une mention « Message supprimé » reste à sa place.', bouton: 'Supprimer', danger: true })) await onSupprimer(b)
  }
  return (
    <div ref={zone} className={`cv-mm ${open ? 'open' : ''}`}>
      <button type="button" className="cv-mm-b" onClick={() => setOpen(o => !o)} aria-label="Actions sur le message" title="Actions"><MoreHorizontal size={15}/></button>
      {open && (
        <div className="cv-mm-menu" role="menu">
          {b.kind === 'text' && b.contenu && <button type="button" role="menuitem" onClick={copier}>{copie ? <Check size={15}/> : <Copy size={15}/>}{copie ? 'Copié' : 'Copier'}</button>}
          <button type="button" role="menuitem" className="danger" onClick={supprimer}><Trash2 size={15}/>Supprimer</button>
        </div>
      )}
    </div>
  )
}

function Meta({ b }: { b: BulleAffichee }) {
  return (
    <div className={`cv-meta ${b.cote}`}>
      {b.cote === 'gauche' && b.ton !== 'equipe' ? `${b.auteur} · ` : ''}{heure(b.created_at)}
      {b.cote === 'droite' && b.ton !== 'note' && (b.vu ? <span className="cv-vu"><CheckCheck size={13}/>Vu</span> : <Check size={12} className="cv-envoye"/>)}
    </div>
  )
}

/** Texte d'un message : liens cliquables, lignes à tirets en étiquettes. */
function Texte({ texte }: { texte: string }) {
  const pj = pieceJointe(texte)
  if (pj) return (
    <div className="cv-txt">
      {pj.type === 'image'
        ? <ImageJointe url={pj.url} nom={pj.nom}/>
        : <a href={pj.url} target="_blank" rel="noopener noreferrer" className="cv-fichier"><span className={`cv-fichier-ic ${pj.type}`}><FileText size={18}/></span><span className="cv-fichier-t"><b>{pj.nom}</b><small>{pj.type === 'pdf' ? 'Document PDF' : 'Fichier'} · ouvrir</small></span><Download size={16}/></a>}
      {pj.reste && <div className="cv-par">{pj.reste}</div>}
    </div>
  )
  return (
    <div className="cv-txt">
      {segmentsMessage(texte).map((s, i) => s.type === 'texte'
        ? <div key={i} className="cv-par">{liens(s.texte)}</div>
        : <div key={i} className="cv-puces">{s.items.map((it, j) => <span key={j}><i className="cv-puce-ic" aria-hidden="true"><PieceIcone titre={it} size={13}/></i>{it}</span>)}</div>)}
    </div>
  )
}
function ImageJointe({ url, nom }: { url: string; nom: string }) {
  const [ko, setKo] = useState(false)
  if (ko) return <a href={url} target="_blank" rel="noopener noreferrer" className="cv-fichier"><span className="cv-fichier-ic img"><ImageIcon size={18}/></span><span className="cv-fichier-t"><b>{nom}</b><small>Photo · ouvrir</small></span><Download size={16}/></a>
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="cv-img">
      <img src={url} alt={nom} loading="lazy" onError={() => setKo(true)}/>
      <span className="cv-img-n"><ImageIcon size={12}/>{nom}</span>
    </a>
  )
}
function liens(t: string): ReactNode[] {
  return t.split(/(https?:\/\/\S+)/g).map((p, i) => /^https?:\/\//.test(p)
    ? <a key={i} href={p} target="_blank" rel="noopener noreferrer">{/\/lead-documents\//.test(p) ? 'Ouvrir le fichier' : p}</a>
    : p)
}

// ============ CARTE PIÈCES ============
function CartePieces({ b, viewer, docs, onUploadDoc, uploadingDocId }: { b: BulleAffichee; viewer: 'client' | 'equipe'; docs: any[]; onUploadDoc?: ((doc: any, file: File) => void) | undefined; uploadingDocId?: string | null | undefined }) {
  const liste = piecesDeCarte(b.payload, docs)
  if (!liste.length) return <div className={`cv-bulle ${b.ton}`}><Texte texte={b.contenu}/></div>
  const recues = liste.filter(d => estRecue(d.status)).length
  const pct = Math.round((recues / liste.length) * 100)
  const fini = recues === liste.length
  return (
    <div className="cv-carte">
      <div className="cv-carte-h">
        <span className="cv-carte-ic"><FolderCheck size={18}/></span>
        <div><b>{viewer === 'client' ? 'Pièces de votre dossier' : 'Pièces demandées'}</b><small>{fini ? 'Tout est reçu, merci !' : `${recues} sur ${liste.length} reçue${recues > 1 ? 's' : ''}`}</small></div>
      </div>
      <div className="cv-barre"><span style={{ width: `${pct}%` }}/></div>
      {liste.map(d => {
        const e = etatPiece(d.status)
        const ok = estRecue(d.status)
        const { titre } = decouperLibelle(d.doc_label || 'Document')
        return (
          <div key={d.id} className={`cv-piece ${ok ? 'ok' : ''}`}>
            <span className={`cv-coche ${e}`}>{ok && <Check size={12} strokeWidth={3}/>}{e === 'rejected' && <X size={12} strokeWidth={3}/>}</span>
            <span className="cv-piece-ic" aria-hidden="true"><PieceIcone docType={d.doc_type} titre={titre} size={15}/></span>
            <span className="cv-piece-t"><span className="cv-piece-nom">{titreCourt(titre)}</span>{e === 'rejected' && <small>Refusée, à renvoyer</small>}{e === 'rejected' && d.admin_note && <small className="cv-motif">Motif : {d.admin_note}</small>}{e === 'uploaded' && <small>Reçue, en vérification</small>}</span>
            {!ok && viewer === 'client' && onUploadDoc && !String(d.id).startsWith('texte-') && (
              <label className={`cv-envoyer ${uploadingDocId === d.id ? 'busy' : ''}`}>
                {uploadingDocId === d.id ? 'Envoi…' : <><Upload size={13}/>Envoyer</>}
                <input type="file" accept="image/*,application/pdf,.doc,.docx" hidden disabled={!!uploadingDocId}
                  onChange={ev => { const f = ev.target.files?.[0]; if (f) onUploadDoc(d, f); ev.currentTarget.value = '' }}/>
              </label>
            )}
            {!ok && (viewer === 'equipe' || String(d.id).startsWith('texte-')) && <span className="cv-attente">{e === 'rejected' ? 'à renvoyer' : 'à envoyer'}</span>}
          </div>
        )
      })}
      <div className="cv-carte-pied">{viewer === 'client' ? 'Photo ou PDF, 10 Mo maximum par pièce.' : 'La carte se met à jour dès que le client envoie une pièce.'}</div>
    </div>
  )
}

// ============ CARTE PACK FORMALISATION ============
type PackEtat = { id: string; reference: string; statut: 'en_attente_paiement' | 'paye' | 'termine' | 'annule'; etapes?: Record<string, string> } | null
const cachePack = new Map<string, { t: number; p: Promise<PackEtat> }>()
function lirePack(cle: string, charger: () => PromiseLike<{ data: any; error: any }>, force = false): Promise<PackEtat> {
  const c = cachePack.get(cle)
  if (!force && c && Date.now() - c.t < 15_000) return c.p
  const p = Promise.resolve(charger()).then(({ data, error }) => (error ? null : (data as PackEtat) || null))
  cachePack.set(cle, { t: Date.now(), p })
  return p
}
const ETAPES_PK = ['formalites', 'compte', 'eligible']

function CartePack({ viewer, leadId }: { viewer: 'client' | 'equipe'; leadId?: string | undefined }) {
  const [pack, setPack] = useState<PackEtat | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const cle = viewer === 'client' ? 'client' : `lead:${leadId || ''}`
  useEffect(() => {
    let vivant = true
    if (viewer === 'equipe' && !leadId) { setPack(null); return }
    lirePack(cle, () => viewer === 'client' ? supabase.rpc('client_pack') : supabase.rpc('lead_pack', { p_lead_id: leadId! })).then(p => { if (vivant) setPack(p) })
    return () => { vivant = false }
  }, [cle])

  async function souscrire() {
    setBusy(true); setErr('')
    const { data, error } = await supabase.rpc('client_pack_souscrire')
    setBusy(false)
    if (error) { setErr(error.message); return }
    cachePack.set('client', { t: Date.now(), p: Promise.resolve(data as PackEtat) })
    setPack(data as PackEtat)
  }

  const faites = pack ? ETAPES_PK.filter(k => pack.etapes?.[k]).length : 0
  const etat = !pack
    ? { cls: 'att', txt: viewer === 'client' ? '' : 'Proposé · pas encore souscrit' }
    : pack.statut === 'en_attente_paiement' ? { cls: 'att', txt: `Souscrit · ${pack.reference}` }
    : pack.statut === 'paye' ? { cls: 'ok', txt: `Pack payé · ${faites}/3 étapes` }
    : { cls: 'fin', txt: 'Pack terminé' }

  return (
    <div className="cv-carte cv-pk">
      <div className="cv-carte-h">
        <span className="cv-carte-ic"><FileBadge size={18}/></span>
        <div><b>{viewer === 'client' ? 'Pack formalisation' : 'Pack formalisation proposé'}</b><small>{viewer === 'client' ? 'Proposé par votre conseiller' : 'Visible par le client dans sa discussion'}</small></div>
        <span className="cv-pk-prix">50{'\u00A0'}000{'\u00A0'}XAF</span>
      </div>
      {viewer === 'client' && !pack && <p className="cv-pk-in">Il manque encore quelques éléments pour accéder au financement. Ce pack s'occupe de tout :</p>}
      <div className="cv-pk-l">
        {(viewer === 'client' ? ['RCCM', 'NIU et statuts', 'Ouverture du compte bancaire'] : ['RCCM, NIU et statuts', 'Ouverture du compte bancaire']).map(x => <div key={x}><Check size={15} strokeWidth={2.6}/>{x}</div>)}
      </div>
      <div className="cv-pk-pied">
        {pack === undefined ? <span className="cv-pk-st att">…</span>
          : viewer === 'client' && !pack ? <>
            <button className="cv-pk-btn" onClick={souscrire} disabled={busy}>{busy ? 'Un instant…' : 'Je souscris'}</button>
            <small>Paiement chez Mayinvest avec votre référence</small>
          </> : viewer === 'client' && pack ? <>
            <span className={`cv-pk-st ${etat.cls}`}>{pack.statut === 'en_attente_paiement' ? <Clock size={13}/> : <Check size={13} strokeWidth={2.6}/>}{etat.txt}</span>
            <small>{pack.statut === 'en_attente_paiement' ? `Réglez 50\u00A0000\u00A0XAF chez Mayinvest en donnant la référence ${pack.reference}.` : 'Suivez chaque étape dans l\'onglet Suivi.'}</small>
          </> : <div className="cv-pk-eq">
            <span className={`cv-pk-st ${etat.cls}`}>{pack && pack.statut !== 'en_attente_paiement' ? <Check size={13} strokeWidth={2.6}/> : <Clock size={13}/>}{etat.txt}</span>
            {pack?.statut === 'en_attente_paiement' && <b>À encaisser</b>}
          </div>}
        {err && <div className="cv-err">{err}</div>}
      </div>
    </div>
  )
}

// ============ CARTE RENDEZ-VOUS ============
function CarteRdv({ b, viewer, onRepondre }: { b: BulleAffichee; viewer: 'client' | 'equipe'; onRepondre?: ((b: BulleAffichee, rep: 'confirme' | 'autre') => Promise<void> | void) | undefined }) {
  const r = lireRdv(b.payload)
  const [busy, setBusy] = useState(false)
  if (!r) return <div className={`cv-bulle ${b.ton}`}><Texte texte={b.contenu}/></div>
  const cal = blocCalendrier(r.at)
  const passe = r.at < Date.now()
  async function rep(x: 'confirme' | 'autre') {
    if (!onRepondre || busy) return
    setBusy(true); await onRepondre(b, x); setBusy(false)
  }
  return (
    <div className="cv-carte">
      <div className="cv-rdv">
        <div className="cv-cal"><span>{cal.jour}</span><b>{cal.num}</b></div>
        <div className="cv-rdv-t">
          <b>Rendez-vous{r.lieu ? ' en agence' : ''}</b>
          <small>{phraseRdv(r.at)}</small>
          {r.lieu && <small className="cv-lieu"><MapPin size={12}/>{r.lieu}</small>}
        </div>
      </div>
      {r.statut === 'confirme' && <div className="cv-etat ok"><Check size={14} strokeWidth={3}/>Rendez-vous confirmé</div>}
      {r.statut === 'autre' && <div className="cv-etat gris"><CalendarClock size={14}/>Autre date demandée</div>}
      {r.statut === 'propose' && viewer === 'client' && !passe && onRepondre && (
        <div className="cv-actions">
          <button className="oui" disabled={busy} onClick={() => rep('confirme')}><Check size={14} strokeWidth={3}/>Je confirme</button>
          <button disabled={busy} onClick={() => rep('autre')}>Autre date</button>
        </div>
      )}
      {r.statut === 'propose' && (viewer === 'equipe' || passe) && <div className="cv-etat attente"><Clock size={14}/>{passe ? 'Date passée sans réponse' : 'En attente de la réponse du client'}</div>}
    </div>
  )
}

// ============ RÉPONSES SUGGÉRÉES ============
export function Suggestions({ items, onPick }: { items: string[]; onPick: (t: string) => void }) {
  if (!items.length) return null
  return (
    <div className="cv-sugg">
      {items.map((s, i) => <button key={s} type="button" onClick={() => onPick(s)}>{i === 0 && <Sparkles size={12} className="cv-spark"/>}{s}</button>)}
    </div>
  )
}

// ============ BARRE D'ÉCRITURE ============
export function ChatInput({ value, onChange, onSend, placeholder, disabled, sending, note, avant, inputRef }: {
  value: string; onChange: (v: string) => void; onSend: () => void; placeholder: string
  disabled?: boolean | undefined; sending?: boolean | undefined; note?: boolean | undefined; avant?: ReactNode; inputRef?: React.RefObject<HTMLTextAreaElement | null> | undefined
}) {
  const local = useRef<HTMLTextAreaElement>(null)
  const ref = inputRef || local
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = '36px'
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 36), 140)}px`
    el.style.overflowY = el.scrollHeight > 140 ? 'auto' : 'hidden'
  }, [value])
  return (
    <div className={`cv-input ${note ? 'note' : ''}`}>
      <ConversationStyles/>
      {avant}
      <textarea ref={ref as any} rows={1} value={value} placeholder={placeholder} disabled={disabled} aria-label="Message"
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 760) { e.preventDefault(); onSend() } }}/>
      <button type="button" className="cv-send" onClick={onSend} disabled={disabled || sending || !value.trim()} aria-label="Envoyer"><ArrowUp size={18} strokeWidth={2.6}/></button>
    </div>
  )
}

// ============ PROPOSER UN RENDEZ-VOUS ============
export function RdvComposer({ ancre, onSend, onClose, lieuDefaut = '' }: { ancre: HTMLElement | null; onSend: (at: number, lieu: string) => Promise<string | null>; onClose: () => void; lieuDefaut?: string }) {
  const now = Date.now()
  const jours = joursProposes(now, 10).slice(1)
  const [jour, setJour] = useState(0)
  const [h, setH] = useState<{ h: number; m: number } | null>(null)
  const [lieu, setLieu] = useState(lieuDefaut)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [pos, setPos] = useState<Position | null>(null)
  const [mobile] = useState(() => typeof window !== 'undefined' && estMobile(window.innerWidth))
  const carte = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (mobile || !ancre) return
    const r = ancre.getBoundingClientRect()
    setPos(positionCarte({ top: r.top, bottom: r.bottom, left: r.left, width: r.width }, { largeur: window.innerWidth, hauteur: window.innerHeight }, 340))
  }, [ancre, mobile])
  useEffect(() => {
    function dehors(e: MouseEvent | TouchEvent) {
      const t = e.target as Node
      if (carte.current?.contains(t) || ancre?.contains(t)) return
      onClose()
    }
    function esc(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', dehors); document.addEventListener('touchstart', dehors); document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', dehors); document.removeEventListener('touchstart', dehors); document.removeEventListener('keydown', esc) }
  }, [ancre, onClose])
  const jd = jours[jour]?.date ?? jours[0]!.date
  const at = h ? combiner(jd, h.h, h.m) : null
  async function envoyer() {
    if (!at) return
    if (!estDansLeFutur(at, Date.now())) { setErr('Cette heure est déjà passée.'); return }
    setBusy(true); const e = await onSend(at, lieu.trim()); setBusy(false)
    if (e) setErr(e); else onClose()
  }
  const contenu = (
    <div ref={carte} className={mobile ? 'cv-sheet' : 'cv-pop'} role="dialog" aria-label="Proposer un rendez-vous" onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}
      style={!mobile && pos ? { left: pos.left, width: Math.max(pos.width, 340), ...(pos.versLeHaut ? { bottom: window.innerHeight - pos.top } : { top: pos.top }) } : undefined}>
      {mobile && <div className="cv-grip"/>}
      <div className="cv-pop-h"><div><b>Proposer un rendez-vous</b><small>Le client confirme d'un clic dans la conversation.</small></div><CroixFermer onClick={onClose}/></div>
      <div className="cv-pop-sub">Jour</div>
      <div className="cv-chips">{jours.map((j, i) => <button key={i} className={i === jour ? 'on' : ''} onClick={() => { setJour(i); setErr('') }}>{j.libelle}</button>)}</div>
      <div className="cv-pop-sub">Heure</div>
      <div className="cv-heures">{HEURES_PROPOSEES.map(x => <button key={`${x.h}`} className={h && h.h === x.h ? 'on' : ''} onClick={() => { setH(x); setErr('') }}>{heureTexte(combiner(jd, x.h, x.m))}</button>)}</div>
      <div className="cv-pop-sub">Lieu</div>
      <input className="cv-lieu-in" value={lieu} onChange={e => setLieu(e.target.value)} placeholder="BGFI Pointe-Noire, nos bureaux, par téléphone…" maxLength={120}/>
      {err && <div className="cv-err">{err}</div>}
      <button className="cv-go" disabled={!at || busy} onClick={envoyer}><CalendarClock size={16}/>{busy ? 'Envoi…' : at ? `Proposer ${phraseRdv(at).toLowerCase()}` : 'Choisis une heure'}</button>
    </div>
  )
  if (typeof document === 'undefined') return null
  return createPortal(mobile ? <div className="cv-ovr">{contenu}</div> : (pos ? contenu : null), document.body)
}

// ============ STYLES ============
export function ConversationStyles() {
  useEffect(() => {
    if (document.getElementById('cv-styles')) return
    const el = document.createElement('style'); el.id = 'cv-styles'; el.textContent = CV_CSS; document.head.appendChild(el)
  }, [])
  return null
}

const CV_CSS = `
  .cv { display: flex; flex-direction: column; color: #0D1B3E; }
  .cv-vide { align-self: center; text-align: center; color: #86868B; font-size: 13.5px; line-height: 1.5; padding: 40px 16px; max-width: 320px; text-wrap: balance; }
  .cv-ligne { display: flex; flex-direction: column; margin-top: 2px; }
  .cv-ligne.debut { margin-top: 10px; }
  .cv-ligne.gauche { align-items: flex-start; } .cv-ligne.droite { align-items: flex-end; }
  .cv-row { display: flex; align-items: center; gap: 6px; max-width: 100%; width: 100%; }
  .cv-ligne.gauche .cv-row { justify-content: flex-start; } .cv-ligne.droite .cv-row { justify-content: flex-start; flex-direction: row-reverse; }
  .cv-ligne:has(> .cv-row > .cv-ev) .cv-row { justify-content: center; }
  .cv-mm { position: relative; flex: none; opacity: 0; transition: opacity .12s; }
  .cv-ligne:hover .cv-mm, .cv-mm.open, .cv-mm:focus-within { opacity: 1; }
  @media (hover: none) { .cv-mm { opacity: .7; } }
  .cv-mm-b { width: 28px; height: 28px; border-radius: 50%; border: none; background: #fff; color: #6E6E73; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 1px 3px rgba(13,27,62,.12); padding: 0; }
  .cv-mm-menu { position: absolute; z-index: 20; bottom: calc(100% + 6px); min-width: 160px; background: #fff; border-radius: 12px; box-shadow: 0 10px 28px rgba(13,27,62,.18); padding: 4px; display: flex; flex-direction: column; }
  .cv-ligne.droite .cv-mm-menu { right: 0; } .cv-ligne.gauche .cv-mm-menu { left: 0; }
  .cv-mm-menu button { display: flex; align-items: center; gap: 9px; border: none; background: none; border-radius: 9px; padding: 8px 10px; font-family: inherit; font-size: 13.5px; color: #1D1D1F; cursor: pointer; text-align: left; }
  .cv-mm-menu button:hover { background: #F5F5F7; } .cv-mm-menu button.danger { color: #DC2626; }
  .cv-suppr { display: inline-flex; align-items: center; gap: 6px; border: 1px dashed #C7C7CC; color: #8E8E93; border-radius: 18px; padding: 7px 13px; font-size: 13px; font-style: italic; }
  .cv-jour { align-self: center; font-size: 11.5px; font-weight: 600; color: #8A94A6; margin: 14px 0 6px; }
  .cv-bulle { max-width: min(78%, 560px); padding: 10px 14px; font-size: 14px; line-height: 1.45; display: flex; flex-direction: column; word-break: break-word; }
  .cv-ligne.gauche .cv-bulle { background: #fff; box-shadow: 0 1px 2px rgba(13,27,62,.07); border-radius: 6px 20px 20px 6px; }
  .cv-ligne.gauche.debut .cv-bulle { border-top-left-radius: 20px; }
  .cv-ligne.gauche.fin .cv-bulle { border-bottom-left-radius: 20px; }
  .cv-ligne.gauche.debut.fin .cv-bulle { border-radius: 20px 20px 20px 6px; }
  .cv-ligne.droite .cv-bulle { border-radius: 20px 6px 6px 20px; }
  .cv-ligne.droite.debut .cv-bulle { border-top-right-radius: 20px; }
  .cv-ligne.droite.debut.fin .cv-bulle { border-radius: 20px 20px 6px 20px; }
  .cv-bulle.moi { background: #E3ECFF; color: #0D1B3E; }
  .cv-ligne.droite .cv-bulle.equipe { background: #EDF0F5; color: #0D1B3E; }
  .cv-bulle.note { background: #F1ECFF; color: #3F2A8C; }
  .cv-tag { display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; font-size: 11px; font-weight: 600; border-radius: 999px; padding: 0; margin-bottom: 4px; background: none; color: #475569; }
  .cv-ligne.droite .cv-tag.equipe { color: #475569; }
  .cv-tag.note { background: rgba(108,76,224,.12); color: #5B3FC4; padding: 2px 9px; }
  .cv-tag.moi { background: none; color: #3D6FD6; padding: 0; font-weight: 600; font-size: 11px; margin-bottom: 3px; }
  .cv-tag .cv-av { width: 18px; height: 18px; border-radius: 50%; background: #E3ECFF; color: #2F5FC4; display: inline-flex; align-items: center; justify-content: center; font-size: 8.5px; font-weight: 800; font-style: normal; }
  .cv-txt { display: flex; flex-direction: column; gap: 6px; }
  .cv-par { white-space: pre-wrap; }
  .cv-par a { color: inherit; font-weight: 700; text-decoration: underline; }
  .cv-puces { display: flex; flex-wrap: wrap; gap: 5px; }
  .cv-puces span { display: inline-flex; align-items: center; gap: 6px; background: rgba(13,27,62,.06); border-radius: 999px; padding: 4px 11px 4px 5px; font-size: 12.5px; font-weight: 600; }
  .cv-puce-ic { width: 20px; height: 20px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; flex: none; font-style: normal; background: #E3ECFF; color: #3D6FD6; }
  .cv-ligne.droite .cv-bulle.equipe .cv-puces span { background: #fff; color: #0D1B3E; }
  .cv-bulle.moi .cv-puces span { background: #fff; color: #0D1B3E; }
  .cv-piece-ic { width: 28px; height: 28px; border-radius: 9px; display: inline-flex; align-items: center; justify-content: center; flex: none; background: #FFFFFF; color: #4A73C9; }
  .cv-piece.ok .cv-piece-ic { background: #F1F5F9; color: #94A3B8; }
  .cv-meta { display: flex; align-items: center; gap: 4px; font-size: 10.5px; color: #8A94A6; margin: 4px 8px 0; }
  .cv-vu { display: inline-flex; align-items: center; gap: 3px; color: #1A6BFF; font-weight: 600; margin-left: 2px; }
  .cv-envoye { margin-left: 2px; }
  .cv-carte { width: min(88%, 400px); background: linear-gradient(180deg, #EEF4FF 0%, #F8FAFF 55%, #FFFFFF 100%); border: 1px solid #E8EFFD; border-radius: 20px; box-shadow: 0 6px 18px rgba(13,27,62,.07); overflow: hidden; }
  .cv-carte-h { display: flex; align-items: center; gap: 10px; padding: 13px 14px 8px; }
  .cv-carte-h b { display: block; font-size: 14px; } .cv-carte-h small { font-size: 12px; color: #8A94A6; }
  .cv-carte-ic { width: 34px; height: 34px; border-radius: 10px; background: #FFFFFF; color: #1A6BFF; display: flex; align-items: center; justify-content: center; flex: none; }
  .cv-barre { height: 5px; border-radius: 5px; background: #EEF1F6; margin: 2px 14px 6px; overflow: hidden; }
  .cv-barre span { display: block; height: 100%; background: linear-gradient(90deg, #22C55E, #4ADE80); border-radius: 5px; transition: width .4s; }
  .cv-piece { display: flex; align-items: center; gap: 10px; padding: 8px 14px; font-size: 13.5px; }
  .cv-piece-t { flex: 1; min-width: 0; font-weight: 600; display: flex; flex-direction: column; }
  .cv-piece-t small { font-weight: 500; font-size: 11.5px; color: #B45309; }
  .cv-piece.ok .cv-piece-t { color: #8A94A6; font-weight: 500; }
  .cv-piece.ok .cv-piece-nom { text-decoration: line-through; }
  .cv-piece.ok .cv-piece-t small { color: #1E40AF; }
  .cv-coche { width: 20px; height: 20px; border-radius: 50%; flex: none; display: flex; align-items: center; justify-content: center; border: 2px solid #CBD5E1; }
  .cv-coche.validated { background: #DCFCE7; border-color: #DCFCE7; color: #16A34A; }
  .cv-coche.uploaded { background: #DBEAFE; border-color: #DBEAFE; color: #1D4ED8; }
  .cv-coche.rejected { background: #FEE2E2; border-color: #FEE2E2; color: #B91C1C; }
  .cv-envoyer { display: inline-flex; align-items: center; gap: 5px; background: #1A6BFF; color: #fff; font-size: 12px; font-weight: 700; padding: 6px 11px; border-radius: 999px; cursor: pointer; flex: none; }
  .cv-envoyer.busy { background: #93C5FD; cursor: default; }
  .cv-attente { font-size: 11px; color: #B45309; font-weight: 600; flex: none; }
  .cv-carte-pied { font-size: 11.5px; color: #8A94A6; padding: 6px 14px 13px; }
  .cv-ev { align-self: center; display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 600; padding: 6px 13px; border-radius: 999px; background: #FFF3E0; color: #B45309; margin: 4px 0; }
  .cv-ev.paye { background: #E8F8EE; color: #16A34A; }
  .cv-ev.ok { background: #E8F8EE; color: #16A34A; } .cv-ev.att { background: #FFF3E0; color: #B45309; } .cv-ev.neutre { background: #EDF0F5; color: #475569; }
  .cv-ligne:has(> .cv-row > .cv-ev) { align-items: center; }
  .cv-pk-prix { margin-left: auto; font-size: 14px; font-weight: 700; color: #0D1B3E; white-space: nowrap; }
  .cv-pk-in { margin: 0 14px 6px; font-size: 13px; color: #64748B; line-height: 1.5; }
  .cv-pk-l { padding: 0 14px 4px; } .cv-pk-l div { display: flex; align-items: center; gap: 9px; font-size: 13.5px; padding: 4px 0; color: #0F1729; } .cv-pk-l svg { color: #1A6BFF; flex: none; }
  .cv-pk-pied { border-top: 1px solid #EEF2F8; margin-top: 8px; padding: 12px 14px 13px; display: flex; flex-direction: column; gap: 7px; }
  .cv-pk-pied small { font-size: 11.5px; color: #8A94A6; text-align: center; line-height: 1.45; }
  .cv-pk-btn { width: 100%; height: 40px; border: none; border-radius: 999px; background: #1A6BFF; color: #fff; font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
  .cv-pk-btn:disabled { opacity: .6; cursor: default; }
  .cv-pk-st { display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; font-size: 12px; font-weight: 600; padding: 5px 11px; border-radius: 999px; }
  .cv-pk-st.att { background: #FFF3E0; color: #B45309; } .cv-pk-st.ok { background: #EAF1FF; color: #1A6BFF; } .cv-pk-st.fin { background: #E8F8EE; color: #16A34A; }
  .cv-pk-eq { display: flex; align-items: center; justify-content: space-between; gap: 8px; } .cv-pk-eq b { font-size: 12.5px; color: #1A6BFF; font-weight: 600; }
  .cv-err { background: #FDECEC; color: #B42318; border-radius: 10px; padding: 7px 10px; font-size: 12.5px; }
  .cv-rdv { display: flex; gap: 12px; align-items: center; padding: 14px; }
  .cv-cal { width: 54px; border-radius: 12px; overflow: hidden; text-align: center; box-shadow: 0 0 0 1px #E3E8F0; flex: none; background: #fff; }
  .cv-cal span { display: block; background: #EF4444; color: #fff; font-size: 10px; font-weight: 700; padding: 3px 0; letter-spacing: .04em; }
  .cv-cal b { display: block; font-size: 22px; padding: 4px 0 5px; }
  .cv-rdv-t { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .cv-rdv-t b { font-size: 14.5px; } .cv-rdv-t small { font-size: 12.5px; color: #64748B; }
  .cv-lieu { display: inline-flex; align-items: center; gap: 4px; }
  .cv-actions { display: flex; gap: 8px; padding: 0 14px 14px; }
  .cv-actions button { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; border-radius: 12px; border: none; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; background: #F1F5F9; color: #475569; }
  .cv-actions button.oui { background: #1A6BFF; color: #fff; box-shadow: 0 4px 12px rgba(26,107,255,.25); }
  .cv-actions button:disabled { opacity: .6; cursor: default; }
  .cv-etat { display: flex; align-items: center; gap: 6px; margin: 0 14px 14px; padding: 9px 12px; border-radius: 12px; font-size: 12.5px; font-weight: 700; }
  .cv-etat.ok { background: #DCFCE7; color: #15803D; } .cv-etat.gris { background: #F1F5F9; color: #64748B; } .cv-etat.attente { background: #FFF7ED; color: #C2410C; }
  .cv-sugg { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; }
  .cv-sugg::-webkit-scrollbar { display: none; }
  .cv-sugg button { flex: none; display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; border: none; background: #F5F5F7; border-radius: 999px; padding: 6px 12px; font-family: inherit; font-size: 12.5px; color: #334155; cursor: pointer; }
  .cv-sugg button:hover { border-color: #BFD4FF; color: #1A6BFF; }
  .cv-spark { color: #7C3AED; }
  .cv-input { flex: 1; min-width: 0; display: flex; align-items: flex-end; gap: 8px; background: #F5F5F7; border: 1px solid transparent; border-radius: 22px; padding: 4px 4px 4px 16px; transition: border-color .15s, background .15s; font-family: -apple-system, "SF Pro Text", Inter, system-ui, sans-serif; }
  .cv-input:focus-within { background: #fff; border-color: #CFE0FF; box-shadow: 0 0 0 3px rgba(26,107,255,.08); }
  .cv-input.note { background: #F6F2FF; } .cv-input.note:focus-within { border-color: #C9B8FF; box-shadow: 0 0 0 4px rgba(124,92,240,.12); }
  .cv-input textarea { flex: 1; min-width: 0; box-sizing: border-box !important; border: none !important; background: transparent !important; resize: none; outline: none; box-shadow: none !important; font-family: inherit; font-size: 15px !important; line-height: 20px !important; padding: 8px 0 !important; margin: 0; height: 36px; min-height: 36px !important; max-height: 140px; color: #1D1D1F; overflow-y: hidden; scrollbar-width: none; }
  .cv-input textarea::-webkit-scrollbar { display: none; }
  .cv-input textarea::placeholder { color: #A1A1A6; }
  .cv-send { width: 36px; height: 36px; flex: none; border-radius: 50%; border: none; background: #1A6BFF; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform .1s, opacity .15s; }
  .cv-send:active:not(:disabled) { transform: scale(.94); }
  .cv-send:disabled { background: #C7C7CC; box-shadow: none; cursor: default; }
  .cv-input.note .cv-send:not(:disabled) { background: #6D4AE0; }
  .cv-input.note .cv-send:not(:disabled):hover { background: #5A38CC; }
  .cv-pop, .cv-ovr { font-family: 'Inter', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; color: #0D1B3E; -webkit-font-smoothing: antialiased; }
  .cv-pop { position: fixed; z-index: 10000; background: #fff; border: 1px solid #E5E7EB; border-radius: 16px; padding: 14px; box-shadow: 0 16px 40px rgba(13,27,62,.16); }
  .cv-ovr { position: fixed; inset: 0; z-index: 10000; background: rgba(13,27,62,.35); display: flex; align-items: flex-end; }
  .cv-sheet { width: 100%; max-height: 88vh; overflow-y: auto; background: #fff; border-radius: 20px 20px 0 0; padding: 8px 16px calc(16px + env(safe-area-inset-bottom)); }
  .cv-grip { width: 40px; height: 4px; border-radius: 4px; background: #E5E7EB; margin: 4px auto 10px; }
  .cv-pop-h { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
  .cv-pop-h b { display: block; font-size: 15px; } .cv-pop-h small { font-size: 12px; color: #64748B; }
  .cv-pop-sub { font-size: 12px; font-weight: 600; color: #64748B; margin: 12px 0 7px; }
  .cv-chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .cv-heures { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
  .cv-chips button, .cv-heures button { border: 1px solid #E5E7EB; background: #fff; font-family: inherit; font-size: 13px; font-weight: 600; color: #334155; cursor: pointer; }
  .cv-chips button { padding: 7px 11px; border-radius: 999px; } .cv-heures button { padding: 8px 0; border-radius: 9px; }
  .cv-chips button.on, .cv-heures button.on { background: #EEF4FF; border-color: #1A6BFF; color: #1A6BFF; }
  .cv-lieu-in { width: 100%; box-sizing: border-box; border: 1px solid #E5E7EB; border-radius: 10px; padding: 10px 12px; font-family: inherit; font-size: 14px; color: #0D1B3E; }
  .cv-err { margin-top: 8px; font-size: 12.5px; color: #B91C1C; font-weight: 600; }
  .cv-go { width: 100%; margin-top: 14px; display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; border: none; border-radius: 999px; background: #111; color: #fff; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
  .cv-go:hover:not(:disabled) { background: #1A6BFF; }
  .cv-go:disabled { background: #E5E7EB; color: #9CA3AF; cursor: default; }
  .cv-img { display: block; border-radius: 14px; overflow: hidden; max-width: 240px; }
  .cv-img img { display: block; width: 100%; height: auto; }
  .cv-fichier { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 14px; background: rgba(13,27,62,.05); color: inherit; text-decoration: none; min-width: 200px; }
  .cv-bulle.moi .cv-fichier { background: rgba(255,255,255,.7); }
  .cv-fichier-ic.img { background: #3D6FD6; }
  .cv-img { position: relative; text-decoration: none !important; color: inherit !important; }
  .cv-img-n { display: flex; align-items: center; gap: 5px; font-size: 11.5px; padding: 6px 4px 0; opacity: .75; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cv-img img { border-radius: 14px; }
  .cv-motif { color: #64748B !important; font-weight: 500; }
  .cv-fichier-ic { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: #64748B; color: #fff; flex: none; }
  .cv-fichier-ic.pdf { background: #EF4444; }
  .cv-fichier-t { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .cv-fichier-t b { font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cv-fichier-t small { font-size: 11.5px; opacity: .7; }
  @media (max-width: 760px) { .cv-bulle { max-width: 86%; } .cv-carte { width: 92%; } }
`
