import CloseIcon from '@/components/CloseIcon'
import { useEffect, useMemo, useRef, useState } from 'react'
import DemandePieces from '@/components/DemandePieces'
import { confirmer, demanderTexte, informer } from '@/components/Dialogue'
import { supabase, onLiveEvent } from '@/integrations/supabase/client'
import { initiales, heureCourte } from '@/lib/messagerie'
import { COMMISSION_PAR_DOSSIER } from '@/lib/commercial-dashboard'
import { PackSuivi } from '@/components/PackAdmin'
import CallButton from '@/components/CallButton'
import ScrollRow from '@/components/ScrollRow'
import { useRappels, RappelPicker } from '@/components/Rappels'
import { Conversation, ChatInput, Suggestions, RdvComposer } from '@/components/Conversation'
import { regrouper, vueCommercial, vueEquipe, suggestions, texteSecoursRdv, texteSecoursPieces } from '@/lib/conversation'
import { EyeOff, Send, Check } from 'lucide-react'
import PieceIcone from '@/components/PieceIcone'
import MessagesTypesMenu from '@/components/MessagesTypesMenu'
import { MessageSquareText, CalendarPlus, FolderPlus } from 'lucide-react'
import type { MessageType } from '@/lib/messagerie'
import { decouperLibelle, titreCourt, etatPiece, LIBELLE_ETAT, piecesARelancer, progressionPieces } from '@/lib/affichage'


import {
  SUIVI, aRelancer, etapeFaite, etapeSuivante, filtrerCom, heuresDepuis, indexSuivi,
  prochaineEtape, type ComRow, type FiltreCom, type Rappels,
} from '@/lib/messagerie-commercial'

type Sel = { kind: 'dir' } | { kind: 'lead'; id: string } | null

const fmtXaf = (n: any) => new Intl.NumberFormat('fr-FR').format(Number(n || 0)) + ' XAF'

const MESSAGES_TYPES: MessageType[] = [
  { cle: 'prise', label: 'Prise en charge', text: "Bonjour, je suis votre conseiller Mayinvest. J'ai bien reçu votre dossier et je m'en occupe. Avez-vous un moment pour un appel aujourd'hui ?" },
  { cle: 'pieces', label: 'Pièces à fournir', text: "Pour avancer, merci de déposer dans votre espace, rubrique Documents : votre pièce d'identité, vos 3 derniers bulletins de salaire et vos relevés bancaires des 3 derniers mois." },
  { cle: 'depose', label: 'Dossier déposé', text: "Bonne nouvelle : votre dossier vient d'être déposé à la banque. Je suis la réponse et je vous tiens informé." },
  { cle: 'relance', label: 'Relance', text: "Bonjour, je reviens vers vous au sujet de votre dossier. Êtes-vous toujours intéressé ? Je reste disponible pour répondre à vos questions." },
  { cle: 'merci', label: 'Merci', text: "Merci pour votre confiance. N'hésitez pas à m'écrire ici à tout moment." },
]

const ArrowDot = () => (
  <span className="cm-adot" aria-hidden="true">
    <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  </span>
)
const BackIcon = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 7H3M6 4L3 7l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
const PhoneIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round"/></svg>

export default function CommercialMessagerie({ commercialId, onCountsChange, onThreadOpen, initialLeadId }: { commercialId: string; onCountsChange: () => void; onThreadOpen?: ((open: boolean) => void) | undefined; initialLeadId?: string | null | undefined }) {
  const [rows, setRows] = useState<ComRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dirLast, setDirLast] = useState<{ body: string; sender_type: string; created_at: string } | null>(null)
  const [dirUnread, setDirUnread] = useState(0)
  const [filtre, setFiltre] = useState<FiltreCom>('tous')
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<Sel>(initialLeadId ? { kind: 'lead', id: initialLeadId } : null)
  const [tick, setTick] = useState(0)
  const [now, setNow] = useState(Date.now())
  const { rappels, poser } = useRappels(commercialId)
  useEffect(() => { onThreadOpen?.(sel !== null); return () => onThreadOpen?.(false) }, [sel !== null])

  async function loadRows() {
    const { data } = await supabase.rpc('commercial_inbox')
    if (data) setRows((data as any[]).map(r => ({ ...r, unread: Number(r.unread || 0), docs_total: Number(r.docs_total || 0), docs_ok: Number(r.docs_ok || 0), docs_uploaded: Number(r.docs_uploaded || 0) })))
    setLoading(false)
  }
  async function loadDir() {
    const { data } = await supabase.from('commercial_chats').select('body, sender_type, created_at, read_at').eq('commercial_id', commercialId).order('created_at', { ascending: false }).limit(50)
    const list = (data || []) as any[]
    setDirLast(list[0] || null)
    setDirUnread(list.filter(m => m.sender_type === 'director' && !m.read_at).length)
  }

  useEffect(() => {
    loadRows(); loadDir()
    const t = setInterval(() => setNow(Date.now()), 60_000)
    const stop = onLiveEvent(`cm-${commercialId}`, (e) => {
      if (e.topic === 'msg' || e.topic === 'doc' || e.topic === 'lead_upd' || e.topic === 'lead') loadRows()
      if (e.topic === 'cchat' && e.ref === commercialId) loadDir()
      setTick(x => x + 1)
    })
    return () => { clearInterval(t); stop() }
  }, [commercialId])

  const liste = filtrerCom(rows, filtre, q, now, rappels)
  const nbNonLus = rows.filter(r => r.unread > 0).length
  const nbRelance = rows.filter(r => aRelancer(r, now, rappels)).length
  const current = sel?.kind === 'lead' ? rows.find(r => r.lead_id === sel.id) : undefined

  function refreshCounts() { loadRows(); loadDir(); onCountsChange() }

  return (
    <div className={`cm-root ${sel ? 'has-sel' : ''}`}>
      <CmStyles/>
      <aside className="cm-list">
        <div className="cm-list-tools">
          <input className="cm-search" placeholder="Rechercher un client…" value={q} onChange={e => setQ(e.target.value)} aria-label="Rechercher un client"/>
          <div className="cm-filters">
            <button className={`cm-chip ${filtre === 'tous' ? 'on' : ''}`} onClick={() => setFiltre('tous')}>Tous</button>
            <button className={`cm-chip ${filtre === 'non_lus' ? 'on' : ''}`} onClick={() => setFiltre('non_lus')}>Non lus{nbNonLus ? ` · ${nbNonLus}` : ''}</button>
            <button className={`cm-chip ${filtre === 'relancer' ? 'on' : ''}`} onClick={() => setFiltre('relancer')}>À relancer{nbRelance ? ` · ${nbRelance}` : ''}</button>
          </div>
        </div>
        <div className="cm-items">
          <button className={`cm-item dir ${sel?.kind === 'dir' ? 'on' : ''}`} onClick={() => setSel({ kind: 'dir' })}>
            <span className="cm-av sq">DIR</span>
            <span className="cm-item-txt">
              <span className="cm-row"><b>Direction Mayinvest</b>{dirUnread > 0 ? <span className="cm-count">{dirUnread}</span> : <small>{heureCourte(dirLast?.created_at || null, now)}</small>}</span>
              <span className="cm-kind navy">Épinglé · consignes et questions</span>
              <span className="cm-prev">{dirLast ? `${dirLast.sender_type === 'commercial' ? 'Vous : ' : ''}${dirLast.body}` : 'Écris à la direction pour toute question'}</span>
            </span>
          </button>
          {loading && <div className="cm-empty">Chargement…</div>}
          {!loading && liste.length === 0 && (
            <div className="cm-empty">
              {rows.length === 0 ? <>Aucun client pour l'instant.<br/>Les dossiers qui te sont attribués apparaissent ici.</> : <>Rien dans ce filtre.<br/><button className="cm-link" onClick={() => setFiltre('tous')}>Tout afficher</button></>}
            </div>
          )}
          {liste.map(r => {
            const attente = r.unread > 0 ? heuresDepuis(r.waiting_since, now) : 0
            const retard = attente >= 24
            const relance = aRelancer(r, now, rappels)
            const on = sel?.kind === 'lead' && sel.id === r.lead_id
            return (
              <button key={r.lead_id} className={`cm-item ${on ? 'on' : ''} ${retard ? 'late' : ''}`} onClick={() => setSel({ kind: 'lead', id: r.lead_id })}>
                <span className={`cm-av ${retard ? 'warn' : r.unread > 0 ? 'blue' : 'grey'}`}>{initiales(r.nom)}</span>
                <span className="cm-item-txt">
                  <span className="cm-row"><b>{r.nom || 'Client'}</b>{retard ? <small className="late">{attente} h</small> : <small>{heureCourte(r.last_at, now)}</small>}</span>
                  <span className={`cm-kind ${retard ? 'warn' : statutTone(r.statut)}`}>
                    {retard ? 'Attend ta réponse' : `${r.statut || ''}${r.montant ? ' · ' + fmtXaf(r.montant) : ''}`}
                    {relance && !retard && <span className="cm-tag">À relancer</span>}
                  </span>
                  <span className="cm-row"><span className="cm-prev">{r.last_message ? `${r.last_sender === 'client' ? '' : r.last_visibility === 'internal' ? 'Note : ' : 'Vous : '}${r.last_message}` : r.last_at ? 'Message supprimé' : 'Pas encore de message'}</span>{r.unread > 0 && <span className="cm-count">{r.unread}</span>}</span>
                </span>
              </button>
            )
          })}
        </div>
      </aside>

      <section className="cm-main">
        {!sel && (
          <div className="cm-placeholder">
            <div className="cm-ph-ic"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
            <h3>Choisis une conversation</h3>
            <p>Réponds d'abord aux clients qui attendent. La direction voit aussi tes échanges et peut t'aider.</p>
          </div>
        )}
        {sel?.kind === 'dir' && <DirectionThread key="dir" commercialId={commercialId} tick={tick} onBack={() => setSel(null)} onRead={refreshCounts}/>}
        {sel?.kind === 'lead' && current && (
          <LeadThread key={current.lead_id} row={current} commercialId={commercialId} tick={tick} now={now}
            rappel={rappels[current.lead_id] || null}
            onRappel={(at) => poser(current.lead_id, at)}
            onBack={() => setSel(null)} onChanged={refreshCounts}/>
        )}
        {sel?.kind === 'lead' && !current && !loading && <div className="cm-placeholder"><p>Ce dossier n'est plus dans ta liste.</p></div>}
      </section>
    </div>
  )
}

function statutTone(s: string | null) {
  if (s === 'Dossier Déposé') return 'violet'
  if (s === 'Financé') return 'green'
  if (s === 'Perdu' || s === 'Non Éligible') return 'grey'
  return 'blue'
}

// ============ FIL CLIENT ============
function LeadThread({ row, commercialId, tick, now, rappel, onRappel, onBack, onChanged }: {
  row: ComRow; commercialId: string; tick: number; now: number; rappel: number | null
  onRappel: (at: number | null) => Promise<string | null>; onBack: () => void; onChanged: () => void
}) {
  const [msgs, setMsgs] = useState<any[]>([])
  const [docs, setDocs] = useState<any[]>([])
  const [relanceOk, setRelanceOk] = useState(false)
  const [text, setText] = useState('')
  const [note, setNote] = useState(false)
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState('')
  const [pop, setPop] = useState<'types' | 'rdv' | null>(null)
  const [piecesOpen, setPiecesOpen] = useState(false)
  const [sideOpen, setSideOpen] = useState(false)
  const [busyStep, setBusyStep] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const rdvBtn = useRef<HTMLButtonElement>(null)

  async function loadMsgs() {
    const { data } = await supabase.from('messages').select('*').eq('lead_id', row.lead_id).order('created_at')
    if (data) setMsgs(data)
    const { data: n } = await supabase.rpc('mark_messages_read', { p_lead_id: row.lead_id, p_reader: 'commercial' })
    if (n) onChanged()
  }
  async function loadDocs() {
    const { data } = await supabase.rpc('get_lead_documents', { p_id: row.lead_id })
    if (data) setDocs(data as any[])
  }
  useEffect(() => { loadMsgs(); loadDocs() }, [row.lead_id, tick])
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [msgs.length])

  async function send(body?: string, asNote?: boolean) {
    const t = (body ?? text).trim()
    if (!t || sending) return
    setSending(true); setErr('')
    const n = asNote ?? note
    const { error } = n
      ? await supabase.rpc('send_internal_note', { p_lead_id: row.lead_id, p_content: t })
      : await supabase.rpc('send_lead_message', { p_lead_id: row.lead_id, p_sender: 'commercial', p_author_id: commercialId, p_content: t })
    setSending(false)
    if (error) { setErr(error.message || 'Message non envoyé'); return false }
    if (body === undefined) setText('')
    loadMsgs(); onChanged()
    return true
  }

  async function sendCard(kind: 'pieces' | 'rdv', payload: any, secours: string): Promise<string | null> {
    setErr('')
    const { error } = await supabase.rpc('send_lead_card', { p_lead_id: row.lead_id, p_sender: 'commercial', p_author_id: commercialId, p_kind: kind, p_payload: payload, p_content: secours })
    if (error) { setErr(error.message || 'Carte non envoyée'); return error.message || 'Carte non envoyée' }
    loadMsgs(); onChanged()
    return null
  }

  async function passerEtape() {
    const next = etapeSuivante(row.statut)
    if (!next || busyStep) return
    if (next === 'Financé' && !(await confirmer({ titre: 'La banque a-t-elle financé ce dossier ?', texte: 'Le dossier passera au statut « Financé ».', bouton: 'Oui, financé' }))) return
    setBusyStep(true); setErr('')
    const { error } = await supabase.rpc('commercial_update_lead_status', { p_commercial_id: commercialId, p_lead_id: row.lead_id, p_statut: next })
    setBusyStep(false)
    if (error) { setErr(error.message); return }
    onChanged()
  }

  const step = prochaineEtape(row, now)
  function doAction() {
    if (step.action === 'pieces') setPiecesOpen(true)
    else if (step.action === 'rdv') setPop('rdv')
    else if (step.action === 'etape') passerEtape()
    else if (step.action === 'repondre') inputRef.current?.focus()
  }

  const idx = indexSuivi(row.statut)
  const next = etapeSuivante(row.statut)

  return (
    <div className="cm-wrap">
      <div className="cm-thread">
        <div className="cm-head">
          <button className="cm-back" onClick={onBack} aria-label="Retour à la liste"><BackIcon/></button>
          <div className="cm-head-t">
            <b>{row.nom || 'Client'}{row.montant ? ` · ${fmtXaf(row.montant)}` : ''}</b>
            <small>{[row.activite, row.statut, row.ville].filter(Boolean).join(' · ')}</small>
          </div>
          <CallButton tel={row.tel} nom={row.nom} leadId={row.lead_id} className="cm-call" onLogged={loadMsgs}>Appeler<span className="cm-adot green"><PhoneIcon/></span></CallButton>
          <button className="cm-side-btn" onClick={() => setSideOpen(true)}>Dossier</button>
        </div>

        <div className={`cm-next ${step.ton}`}>
          <div><b>Prochaine étape :</b> {step.texte}</div>
          {step.bouton && (step.action === 'appeler'
            ? <CallButton tel={row.tel} nom={row.nom} leadId={row.lead_id} className="cm-pill" onLogged={loadMsgs}>{step.bouton}<ArrowDot/></CallButton>
            : <button className="cm-pill" onClick={doAction} disabled={busyStep}>{step.bouton}<ArrowDot/></button>)}
        </div>

        <div className="cm-msgs">
          <Conversation viewer="equipe" leadId={row.lead_id} peutSupprimer={b => !!b.mien} onSupprimer={async (b) => { const { error } = await supabase.rpc('delete_lead_message', { p_id: b.id }); if (error) informer(error.message); else loadMsgs() }} docs={docs} bulles={regrouper(msgs.map(m => vueCommercial(m, commercialId, row.nom || 'Client')), now)}
            vide="Pas encore de message. Présente-toi avec un message type ou une suggestion ci-dessous."/>
          <div ref={endRef}/>
        </div>

        <div className="cm-composer">
          <ScrollRow className="cm-tools">
            <div className="cm-seg">
              <button className={!note ? 'on' : ''} onClick={() => setNote(false)}>Au client</button>
              <button className={note ? 'on note' : ''} onClick={() => setNote(true)}>Note pour la direction</button>
            </div>
            <button data-mt-toggle className={`cm-tool ${pop === 'types' ? 'active' : ''}`} onClick={() => setPop(p => (p === 'types' ? null : 'types'))}><MessageSquareText size={14}/>Message type</button>
            <button ref={rdvBtn} className={`cm-tool ${pop === 'rdv' ? 'active' : ''}`} onClick={() => setPop(p => (p === 'rdv' ? null : 'rdv'))}><CalendarPlus size={14}/>Proposer un RDV</button>
            <button className="cm-tool" onClick={() => setPiecesOpen(true)}><FolderPlus size={14}/>Demander une pièce</button>
            <RappelPicker className="cm-tool" value={rappel} onChange={onRappel}/>
          </ScrollRow>
          {pop === 'types' && (
            <MessagesTypesMenu messages={MESSAGES_TYPES} statut={row.statut} onClose={() => setPop(null)} onPick={t => { setText(t); setNote(false); setPop(null); inputRef.current?.focus() }}/>
          )}
          {pop === 'rdv' && <RdvComposer ancre={rdvBtn.current} onClose={() => setPop(null)}
            onSend={(at, lieu) => sendCard('rdv', { at: new Date(at).toISOString(), lieu }, texteSecoursRdv(at, lieu))}/>}
          {err && <div className="cm-err">{err}</div>}
          {!note && !text && <Suggestions items={suggestions('equipe', msgs.map(m => vueCommercial(m, commercialId, row.nom || 'Client')), (row.nom || '').split(' ')[0])} onPick={t => { setText(t); inputRef.current?.focus() }}/>}
          <ChatInput inputRef={inputRef} value={text} onChange={setText} onSend={() => send()} sending={sending} note={note}
            placeholder={note ? 'Note interne : seule la direction la verra…' : "Écris au client (la direction voit aussi l'échange)…"}/>
        </div>
      </div>

      {sideOpen && <div className="cm-sheet-bg" onClick={() => setSideOpen(false)}/>}
      <aside className={`cm-side ${sideOpen ? 'open' : ''}`}>
        <div className="cm-grab" aria-hidden="true"/>
        <div className="cm-side-h"><span>Mon client</span><button className="cm-x" onClick={() => setSideOpen(false)} aria-label="Fermer"><CloseIcon size={13}/></button></div>
        <div className="cm-id">
          <span className="cm-score">{row.score ?? '—'}</span>
          <div><b>{row.nom || 'Client'}</b><small>{[row.activite, row.ville].filter(Boolean).join(' · ')}</small></div>
        </div>

        <div className="cm-side-h"><span>Où en est le dossier</span></div>
        {idx === -1 ? <div className="cm-closed">Dossier clos · {row.statut}</div> : (
          <ol className="cm-steps">
            {SUIVI.map((s, i) => {
              const done = etapeFaite(row.statut, i)
              const active = !done && (i === 0 || etapeFaite(row.statut, i - 1))
              return <li key={s.key} className={done ? 'done' : active ? 'active' : ''}><span className="cm-dot">{done && <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M3 7.5l2.5 2.5L11 4.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}</span>{s.label}</li>
            })}
          </ol>
        )}
        {next && <button className="cm-dark" onClick={passerEtape} disabled={busyStep}>{busyStep ? 'Mise à jour…' : `Passer à « ${next === 'Dossier Déposé' ? 'Déposé en banque' : next === 'RDV' ? 'Rendez-vous' : next} »`}</button>}

        <div className="cm-side-h"><span>Pièces</span><small>{docs.filter(d => etatPiece(d.status) === 'validated').length} sur {docs.length} validée{docs.filter(d => etatPiece(d.status) === 'validated').length > 1 ? 's' : ''}</small></div>
        <div className="cm-docs">
          {docs.length === 0 && <div className="cm-empty sm">Aucune pièce demandée.</div>}
          {docs.length > 0 && (() => { const p = progressionPieces(docs); return (
            <div className="cm-prog" aria-hidden="true"><span className="v" style={{ width: `${p.valide}%` }}/><span className="u" style={{ width: `${p.aVerifier}%` }}/></div>
          ) })()}
          {docs.map(d => {
            const e = etatPiece(d.status)
            const { titre, precision } = decouperLibelle(d.doc_label || d.file_name || 'Document')
            const detail = e === 'rejected' && d.admin_note ? d.admin_note : precision
            return (
              <div key={d.id} className="cm-doc">
                <span className={`cm-doc-ic ${e}`}><PieceIcone docType={d.doc_type} titre={titre}/></span>
                <div className="cm-doc-txt"><b>{titreCourt(titre)}</b>{detail && <small>{detail}</small>}</div>
                <span className={`cm-doc-pill ${e}`}>{LIBELLE_ETAT[e]}</span>
              </div>
            )
          })}
          {(() => {
            const aRelancerPieces = piecesARelancer(docs)
            if (!aRelancerPieces.length) return null
            const n = aRelancerPieces.length
            return (
              <button className="cm-doc-relance" disabled={sending || relanceOk} onClick={async () => {
                const e = await sendCard('pieces', { doc_ids: aRelancerPieces.map(d => d.id) }, texteSecoursPieces(aRelancerPieces.map(d => d.doc_label || 'Document')))
                if (!e) { setRelanceOk(true); setTimeout(() => setRelanceOk(false), 4000) }
              }}>
                {relanceOk ? <><Check size={14}/>Message envoyé</> : <><Send size={14}/>Relancer pour {n > 1 ? `${n} pièces` : '1 pièce'}</>}
              </button>
            )
          })()}
        </div>

        <PackSuivi leadId={row.lead_id} nom={row.nom || 'Client'} onChange={loadMsgs}/>
        <div className="cm-commission"><span>Ta commission si financé</span><b>{fmtXaf(COMMISSION_PAR_DOSSIER)}</b></div>
      </aside>

      {piecesOpen && (
        <DemandePieces docs={docs} onClose={() => setPiecesOpen(false)} onSend={async (ids, labels, extra) => {
          const nouveaux: string[] = []
          for (const l of extra) {
            const { data, error } = await supabase.rpc('commercial_request_document', { p_lead_id: row.lead_id, p_label: l })
            if (error) { setErr(error.message); return }
            if (data) nouveaux.push(String(data))
          }
          const e = await sendCard('pieces', { doc_ids: [...ids, ...nouveaux] }, texteSecoursPieces([...labels, ...extra]))
          if (!e) { setPiecesOpen(false); loadDocs() }
        }}/>
      )}
    </div>
  )
}

// ============ FIL DIRECTION ============
function DirectionThread({ commercialId, tick, onBack, onRead }: { commercialId: string; tick: number; onBack: () => void; onRead: () => void }) {
  const [msgs, setMsgs] = useState<any[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  async function load() {
    const { data } = await supabase.from('commercial_chats').select('*').eq('commercial_id', commercialId).order('created_at')
    if (data) setMsgs(data)
    if ((data || []).some((m: any) => m.sender_type === 'director' && !m.read_at)) {
      await supabase.rpc('mark_commercial_messages_read', { p_commercial_id: commercialId, p_reader_type: 'commercial' })
      onRead()
    }
  }
  useEffect(() => { load() }, [commercialId, tick])
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [msgs.length])

  async function send() {
    const t = text.trim()
    if (!t || sending) return
    setSending(true); setErr('')
    const { error } = await supabase.rpc('send_commercial_message', { p_commercial_id: commercialId, p_sender_type: 'commercial', p_body: t })
    setSending(false)
    if (error) { setErr(error.message); return }
    setText(''); load()
  }

  return (
    <div className="cm-wrap">
      <div className="cm-thread">
        <div className="cm-head">
          <button className="cm-back" onClick={onBack} aria-label="Retour à la liste"><BackIcon/></button>
          <span className="cm-av sq small">DIR</span>
          <div className="cm-head-t"><b>Direction Mayinvest</b><small>Consignes, questions sur un dossier, aide</small></div>
        </div>
        <div className="cm-msgs">
          <Conversation viewer="equipe" peutSupprimer={b => !!b.mien} onSupprimer={async (b) => { const { error } = await supabase.rpc('delete_team_message', { p_id: b.id }); if (error) informer(error.message); else load() }} bulles={regrouper(msgs.map(m => vueEquipe(m, 'commercial')), Date.now())} vide="Pas encore de message. Pose ta question à la direction."/>
          <div ref={endRef}/>
        </div>
        <div className="cm-composer">
          {err && <div className="cm-err">{err}</div>}
          <ChatInput value={text} onChange={setText} onSend={send} sending={sending} placeholder="Écris à la direction…"/>
        </div>
      </div>
    </div>
  )
}

function CmStyles() {
  return <style>{`
    .cm-root { display: grid; grid-template-columns: 320px minmax(0, 1fr); height: calc(100vh - 56px); height: calc(100dvh - 56px); background: #fff; font-family: inherit; color: #0F1729; position: relative; overflow: hidden; }
    .cm-list { border-right: 1px solid #E8ECF3; display: flex; flex-direction: column; min-height: 0; background: #fff; }
    .cm-list-tools { padding: 12px; display: flex; flex-direction: column; gap: 10px; border-bottom: 1px solid #EEF2F8; }
    .cm-search { border: 1.5px solid #E5E7EB; border-radius: 100px; padding: 10px 14px; font-family: inherit; font-size: 14px; outline: none; width: 100%; box-sizing: border-box; background: #fff; }
    .cm-search:focus { border-color: #1A6BFF; }
    .cm-filters { display: flex; gap: 6px; flex-wrap: wrap; }
    .cm-chip { border: 1.5px solid #E5E7EB; background: #fff; color: #334155; padding: 6px 12px; border-radius: 100px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
    .cm-chip.on { background: #0D1B3E; border-color: #0D1B3E; color: #fff; font-weight: 800; }
    .cm-items { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; }
    .cm-item { width: 100%; display: flex; gap: 10px; padding: 12px 14px; border: none; border-bottom: 1px solid #F3F5F9; border-left: 3px solid transparent; background: #fff; text-align: left; font-family: inherit; cursor: pointer; color: inherit; }
    .cm-item:hover { background: #F8FAFC; }
    .cm-item.dir { background: #F8FAFC; }
    .cm-item.on { background: #EEF4FF; border-left-color: #1A6BFF; }
    .cm-item.late { background: #FFFBEB; }
    .cm-item.late.on { background: #FEF3C7; }
    .cm-av { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; flex-shrink: 0; color: #fff; background: #1A6BFF; }
    .cm-av.sq { border-radius: 12px; background: #0D1B3E; font-size: 12px; }
    .cm-av.small { width: 34px; height: 34px; font-size: 10.5px; }
    .cm-av.warn { background: #F59E0B; color: #0D1B3E; }
    .cm-av.grey { background: #E2E8F0; color: #0D1B3E; }
    .cm-item-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
    .cm-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 13.5px; }
    .cm-row b { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cm-row small { font-size: 11px; color: #64748B; flex-shrink: 0; }
    .cm-row small.late { color: #B45309; font-weight: 800; }
    .cm-kind { font-size: 11px; font-weight: 800; display: flex; align-items: center; gap: 6px; white-space: nowrap; overflow: hidden; }
    .cm-tag { flex-shrink: 0; }
    .cm-kind.blue { color: #1A6BFF; } .cm-kind.navy { color: #0D1B3E; } .cm-kind.warn { color: #B45309; }
    .cm-kind.violet { color: #7C3AED; } .cm-kind.green { color: #15803D; } .cm-kind.grey { color: #64748B; }
    .cm-tag { background: #FEF3C7; color: #B45309; border-radius: 100px; padding: 0 7px; font-size: 10px; }
    .cm-prev { font-size: 12px; color: #64748B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; min-width: 0; }
    .cm-count { background: #1A6BFF; color: #fff; border-radius: 100px; padding: 0 7px; font-size: 11px; font-weight: 800; flex-shrink: 0; }
    .cm-empty { padding: 28px 16px; text-align: center; color: #94A3B8; font-size: 13px; line-height: 1.5; }
    .cm-empty.sm { padding: 6px 0; text-align: left; }
    .cm-link { background: none; border: none; color: #1A6BFF; font-family: inherit; font-weight: 800; cursor: pointer; margin-top: 6px; }
    .cm-main { min-width: 0; min-height: 0; display: flex; background: #F8FAFC; }
    .cm-placeholder { margin: auto; text-align: center; max-width: 340px; padding: 24px; color: #475569; }
    .cm-placeholder h3 { margin: 12px 0 6px; color: #0D1B3E; font-size: 17px; }
    .cm-placeholder p { font-size: 13.5px; line-height: 1.5; margin: 0; }
    .cm-ph-ic { width: 60px; height: 60px; border-radius: 50%; background: #EEF4FF; color: #1A6BFF; display: inline-flex; align-items: center; justify-content: center; }
    .cm-wrap { flex: 1; display: flex; min-width: 0; min-height: 0; }
    .cm-thread { flex: 1; display: flex; flex-direction: column; min-width: 0; min-height: 0; }
    .cm-head { background: #fff; border-bottom: 1px solid #E8ECF3; padding: 10px 16px; display: flex; align-items: center; gap: 10px; }
    .cm-head-t { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .cm-head-t b { font-size: 15px; color: #0D1B3E; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cm-head-t small { font-size: 12px; color: #64748B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cm-back { display: none; width: 36px; height: 36px; border-radius: 50%; border: 1.5px solid #E5E7EB; background: #fff; color: #0D1B3E; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
    .cm-adot { width: 26px; height: 26px; border-radius: 50%; background: #1A6BFF; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; transition: transform 0.15s; }
    .cm-adot.green { background: #16A34A; }
    .cm-call { border: none; display: inline-flex; align-items: center; gap: 8px; background: #DCFCE7; color: #15803D; padding: 4px 4px 4px 14px; border-radius: 100px; font-size: 13px; font-weight: 800; text-decoration: none; flex-shrink: 0; }
    .cm-call:hover { color: #15803D; background: #BBF7D0; }
    .cm-side-btn { display: none; border: 1.5px solid #E5E7EB; background: #fff; border-radius: 100px; padding: 8px 12px; font-family: inherit; font-size: 12px; font-weight: 800; color: #0D1B3E; cursor: pointer; flex-shrink: 0; }
    .cm-next { margin: 12px 16px 0; border-radius: 14px; padding: 10px 12px 10px 14px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; font-size: 13px; color: #0D1B3E; line-height: 1.45; }
    .cm-next.info { background: #EEF4FF; border: 1px solid #BFD4FF; }
    .cm-next.warn { background: #FFFBEB; border: 1px solid #FCD34D; }
    .cm-next.ok { background: #F0FDF4; border: 1px solid #BBF7D0; }
    .cm-next > div { flex: 1 1 240px; }
    .cm-pill { display: inline-flex; align-items: center; gap: 8px; background: #fff; color: #1A6BFF; border: none; padding: 4px 4px 4px 13px; border-radius: 100px; font-family: inherit; font-size: 12.5px; font-weight: 800; text-decoration: none; cursor: pointer; white-space: nowrap; box-shadow: 0 1px 4px rgba(13,27,62,0.06); }
    .cm-pill:hover .cm-adot { transform: translateX(2px); }
    .cm-pill.solid { background: #1A6BFF; color: #fff; }
    .cm-pill.solid .cm-adot { background: rgba(255,255,255,0.22); }
    .cm-pill:disabled { opacity: 0.5; cursor: default; }
    .cm-msgs { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 8px 18px 18px; display: flex; flex-direction: column; background: #F5F7FB; }
    .cm-block { display: flex; flex-direction: column; gap: 8px; }
    .cm-day { align-self: center; font-size: 11px; color: #64748B; background: #E8ECF2; border-radius: 100px; padding: 3px 12px; font-weight: 700; margin: 6px 0; }
    .cm-bubble { max-width: min(76%, 560px); padding: 10px 14px; font-size: 14px; line-height: 1.45; border-radius: 20px; }
    .cm-bubble.in, .cm-bubble.staff { align-self: flex-start; background: #fff; color: #0D1B3E; box-shadow: 0 1px 2px rgba(13,27,62,0.08); }
    .cm-bubble.out { align-self: flex-end; background: #1A6BFF; color: #fff; }
    .cm-bubble.note { align-self: flex-end; background: #F1ECFF; color: #3F2A8C; }
    .cm-tag { display: inline-flex; align-items: center; gap: 5px; align-self: flex-start; background: #0D1B3E; color: #fff; font-size: 10.5px; font-weight: 700; border-radius: 999px; padding: 2px 9px; margin-bottom: 5px; }
    .cm-tag.note { background: rgba(108,76,224,.12); color: #5B3FC4; }
    .cm-bubble { display: flex; flex-direction: column; }
    .cm-txt { display: flex; flex-direction: column; gap: 6px; word-break: break-word; }
    .cm-par { white-space: pre-wrap; }
    .cm-puces { display: flex; flex-wrap: wrap; gap: 5px; }
    .cm-puce { background: rgba(13,27,62,0.06); border-radius: 999px; padding: 4px 10px; font-size: 12.5px; font-weight: 600; }
    .cm-bubble.out .cm-puce { color: #fff; background: rgba(255,255,255,0.2); }
    .cm-bubble.note .cm-puce { background: rgba(120,53,15,0.1); }
    .cm-time { font-size: 10.5px; opacity: 0.65; margin-top: 4px; text-align: right; }
    .cm-bubble.in .cm-time, .cm-bubble.staff .cm-time { text-align: left; }
    .cm-composer { position: relative; background: #fff; border-top: 1px solid #E8ECF3; padding: 10px 14px calc(10px + env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 8px; }
    
    .cm-tools::-webkit-scrollbar { display: none; }
    .cm-seg { display: flex; background: #F0F2F5; border-radius: 100px; padding: 3px; flex-shrink: 0; }
    .cm-seg button { border: none; background: transparent; color: #5B6478; padding: 6px 11px; border-radius: 100px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; }
    .cm-seg button.on { background: #fff; color: #1A6BFF; font-weight: 800; box-shadow: 0 1px 4px rgba(13,27,62,0.08); }
    .cm-seg button.on.note { color: #5B3FC4; }
    .cm-tool { display: inline-flex; align-items: center; gap: 6px; border: 1.5px solid #E5E7EB; background: #fff; padding: 6px 11px; border-radius: 100px; font-family: inherit; font-size: 12px; font-weight: 700; color: #334155; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
    .cm-tool:hover { border-color: #BFD4FF; color: #1A6BFF; }
    .cm-tool.active { border-color: #1A6BFF; color: #1A6BFF; background: #EEF4FF; }
    .cm-tool.on { border-color: #FCD34D; background: #FFFBEB; color: #B45309; }
        .cm-pop { position: absolute; bottom: calc(100% + 6px); left: 14px; width: 340px; max-width: calc(100% - 28px); background: #fff; border: 1px solid #E5E7EB; border-radius: 14px; box-shadow: 0 16px 40px rgba(13,27,62,0.16); padding: 6px; z-index: 30; display: flex; flex-direction: column; gap: 2px; max-height: 50vh; overflow-y: auto; }
    .cm-pop > button { border: none; background: none; text-align: left; padding: 9px 10px; border-radius: 10px; font-family: inherit; cursor: pointer; display: flex; flex-direction: column; gap: 2px; }
    .cm-pop > button:hover { background: #F5F8FF; }
    .cm-pop > button b { font-size: 12.5px; color: #0D1B3E; }
    .cm-pop > button span { font-size: 12px; color: #64748B; }
    .cm-pop.rdv { padding: 12px; gap: 8px; }
    .cm-pop-t { font-size: 12.5px; font-weight: 800; color: #0D1B3E; }
    .cm-sugg { display: flex; flex-wrap: wrap; gap: 5px; }
    .cm-sugg button { border: 1.5px solid #E5E7EB; background: #fff; border-radius: 100px; padding: 5px 9px; font-family: inherit; font-size: 11.5px; font-weight: 700; cursor: pointer; color: #334155; }
    .cm-pop.rdv input { border: 1.5px solid #E5E7EB; border-radius: 10px; padding: 9px 10px; font-family: inherit; font-size: 14px; outline: none; }
    .cm-pop-act, .cm-modal-foot { display: flex; justify-content: flex-end; gap: 6px; align-items: center; }
    .cm-pop-act button { border: 1.5px solid #E5E7EB; background: #fff; border-radius: 100px; padding: 7px 13px; font-family: inherit; font-size: 12px; font-weight: 800; cursor: pointer; }
    .cm-pop-act button.primary { background: #1A6BFF; border-color: #1A6BFF; color: #fff; }
    .cm-pop-act button:disabled { opacity: 0.5; }
    .cm-input { display: flex; gap: 8px; align-items: flex-end; }
    .cm-input textarea { flex: 1; min-width: 0; border: 1.5px solid #E5E7EB; border-radius: 22px; padding: 11px 16px; font-family: inherit; font-size: 16px; outline: none; resize: none; max-height: 140px; field-sizing: content; line-height: 1.35; }
    .cm-input textarea:focus { border-color: #1A6BFF; }
    .cm-input.note textarea { background: #F6F2FF; border-color: #C9B8FF; }
    .cm-send { width: 46px; height: 46px; border-radius: 50%; border: none; background: #1A6BFF; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
    .cm-send:disabled { background: #CBD5E1; cursor: default; }
    .cm-err { background: #FEE2E2; color: #B91C1C; border-radius: 10px; padding: 8px 12px; font-size: 12.5px; font-weight: 600; }
    .cm-side { width: 300px; flex-shrink: 0; background: #fff; border-left: 1px solid #E8ECF3; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; box-sizing: border-box; }
    .cm-grab { display: none; }
    .cm-side-h { display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 800; color: #64748B; letter-spacing: 0.08em; text-transform: uppercase; }
    .cm-side-h small { font-size: 12px; letter-spacing: 0; text-transform: none; color: #0D1B3E; }
    .cm-x { display: none; border: none; background: #F1F5F9; width: 30px; height: 30px; border-radius: 50%; padding: 0; align-items: center; justify-content: center; cursor: pointer; color: #0D1B3E; }
    .cm-x.show { display: inline-flex; }
    .cm-id { display: flex; gap: 12px; align-items: center; }
    .cm-id b { display: block; font-size: 14.5px; color: #0D1B3E; }
    .cm-id small { font-size: 12px; color: #64748B; }
    .cm-score { width: 50px; height: 50px; border-radius: 50%; border: 5px solid #1A6BFF; display: flex; align-items: center; justify-content: center; font-weight: 800; color: #0D1B3E; flex-shrink: 0; box-sizing: border-box; }
    .cm-steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
    .cm-steps li { display: flex; gap: 10px; align-items: center; font-size: 13px; padding: 6px 0; color: #94A3B8; position: relative; }
    .cm-steps li:not(:last-child)::after { content: ''; position: absolute; left: 9.5px; top: 27px; height: 10px; width: 1.5px; background: #E2E8F0; }
    .cm-steps .cm-dot { width: 20px; height: 20px; border-radius: 50%; border: 2px solid #CBD5E1; box-sizing: border-box; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .cm-steps li.done { color: #0D1B3E; }
    .cm-steps li.done .cm-dot { background: #16A34A; border-color: #16A34A; }
    .cm-steps li.active { color: #1A6BFF; font-weight: 800; }
    .cm-steps li.active .cm-dot { background: #1A6BFF; border-color: #1A6BFF; box-shadow: 0 0 0 4px #DCE8FF; }
    .cm-closed { background: #F1F5F9; border-radius: 10px; padding: 10px 12px; font-size: 13px; font-weight: 700; color: #475569; }
    .cm-dark { border: none; background: #0D1B3E; color: #fff; padding: 12px; border-radius: 100px; font-family: inherit; font-size: 13px; font-weight: 800; cursor: pointer; }
    .cm-dark:disabled { opacity: 0.6; }
    .cm-docs { background: #fff; border: 1px solid #EEF0F3; border-radius: 14px; padding: 12px 12px 8px; display: flex; flex-direction: column; }
    .cm-prog { height: 6px; border-radius: 6px; background: #F1F5F9; overflow: hidden; display: flex; margin-bottom: 6px; }
    .cm-prog .v { background: #22C55E; } .cm-prog .u { background: #93C5FD; }
    .cm-doc { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid #F1F5F9; }
    .cm-doc:last-of-type { border-bottom: none; }
    .cm-doc-ic { width: 30px; height: 30px; flex: none; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
    .cm-doc-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .cm-doc-txt b { font-size: 13px; font-weight: 700; color: #0F1729; line-height: 1.3; }
    .cm-doc-txt small { font-size: 11.5px; color: #94A3B8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cm-doc-pill { flex: none; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 999px; white-space: nowrap; }
    .cm-doc-ic.validated, .cm-doc-pill.validated { background: #DCFCE7; color: #166534; }
    .cm-doc-ic.uploaded, .cm-doc-pill.uploaded { background: #DBEAFE; color: #1E40AF; }
    .cm-doc-ic.pending, .cm-doc-pill.pending { background: #FEF3C7; color: #92400E; }
    .cm-doc-ic.rejected, .cm-doc-pill.rejected { background: #FEE2E2; color: #991B1B; }
    .cm-doc-relance { margin: 8px 0 4px; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; border-radius: 10px; border: 1.5px dashed #CBD5E1; background: #fff; font-family: inherit; font-size: 12.5px; font-weight: 700; color: #475569; cursor: pointer; }
    .cm-doc-relance:hover:not(:disabled) { border-color: #1A6BFF; color: #1A6BFF; background: #F5F8FF; }
    .cm-doc-relance:disabled { cursor: default; border-style: solid; border-color: #BBF7D0; color: #15803D; background: #F0FDF4; }
    .cm-commission { margin-top: auto; background: linear-gradient(135deg, #1A6BFF, #0051D4); color: #fff; border-radius: 14px; padding: 14px; display: flex; justify-content: space-between; align-items: center; gap: 10px; }
    .cm-commission span { font-size: 12.5px; font-weight: 700; }
    .cm-commission b { font-size: 18px; white-space: nowrap; }
    .cm-sheet-bg, .cm-modal-bg { position: absolute; inset: 0; background: rgba(13,27,62,0.35); z-index: 35; }
    .cm-modal-bg { display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 50; }
    .cm-modal { background: #fff; border-radius: 18px; width: 100%; max-width: 440px; padding: 16px; display: flex; flex-direction: column; gap: 10px; max-height: 85%; overflow-y: auto; box-shadow: 0 24px 60px rgba(13,27,62,0.3); }
    .cm-check { display: flex; gap: 10px; align-items: center; padding: 10px 12px; border: 1.5px solid #E5E7EB; border-radius: 12px; font-size: 14px; cursor: pointer; }
    .cm-check input { width: 18px; height: 18px; accent-color: #1A6BFF; }
    .cm-check small { color: #B91C1C; font-weight: 700; }
    @media (max-width: 1180px) {
      .cm-side { position: absolute; right: 0; top: 0; bottom: 0; z-index: 40; box-shadow: -12px 0 32px rgba(13,27,62,0.15); transform: translateX(105%); transition: transform 0.22s ease; }
      .cm-side.open { transform: translateX(0); }
      .cm-side .cm-x { display: inline-flex; }
      .cm-side-btn { display: inline-block; }
    }
    @media (max-width: 900px) { .cm-root { grid-template-columns: 280px minmax(0, 1fr); height: calc(100dvh - 56px - var(--bnav-h, 0px)); } }
    @media (max-width: 760px) {
      .cm-root { grid-template-columns: 1fr; }
      .cm-root.has-sel .cm-list { display: none; }
      .cm-root:not(.has-sel) .cm-main { display: none; }
      .cm-back { display: inline-flex; }
      .cm-head { padding: 8px 10px; gap: 8px; }
      .cm-call { padding: 4px; }
      .cm-call { font-size: 0; gap: 0; }
      .cm-next { margin: 8px 10px 0; font-size: 12.5px; }
      .cm-msgs { padding: 10px; }
      .cm-bubble { max-width: 86%; }
      .cm-composer { padding: 8px 10px calc(8px + env(safe-area-inset-bottom)); }
      .cm-side { top: auto; left: 0; right: 0; width: 100%; max-height: 82%; border-left: none; border-radius: 20px 20px 0 0; transform: translateY(105%); box-shadow: 0 -12px 32px rgba(13,27,62,0.18); }
      .cm-side.open { transform: translateY(0); }
      .cm-grab { display: block; width: 40px; height: 4px; border-radius: 4px; background: #CBD5E1; margin: -6px auto 0; }
      .cm-commission { margin-top: 4px; }
      .cm-pop { left: 10px; max-width: calc(100% - 20px); }
    }
  `}</style>
}
