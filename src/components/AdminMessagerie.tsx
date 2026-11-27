import CloseIcon from '@/components/CloseIcon'
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase, onLiveEvent } from '@/integrations/supabase/client'
import { LIFECYCLE_STATUTS } from '@/lib/lead-templates'
import CallButton from '@/components/CallButton'
import PieceIcone from '@/components/PieceIcone'
import ConseillerPicker from '@/components/ConseillerPicker'
import ScrollRow from '@/components/ScrollRow'
import NiceSelect from '@/components/NiceSelect'
import { formatPhone } from '@/lib/phone'
import { Conversation, ChatInput, Suggestions, RdvComposer } from '@/components/Conversation'
import { regrouper, vueAdmin, vueEquipe, suggestions, texteSecoursRdv, texteSecoursPieces } from '@/lib/conversation'
import {
  filtrerInbox, filtrerEquipe, compteurs, heuresAttente, enRetard, apercu, heureCourte, initiales,
  MESSAGES_TYPES, type InboxRow, type TeamRow, type Filtre,
} from '@/lib/messagerie'

type Fil = { kind: 'lead'; id: string } | { kind: 'team'; id: string } | { kind: 'broadcast' } | null
type Mode = 'groupe' | 'note' | 'commercial'

const xaf = (n: any) => (n ? new Intl.NumberFormat('fr-FR').format(Number(n)) + ' XAF' : '')

const ArrowDot = () => (
  <span className="am-adot" aria-hidden="true">
    <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  </span>
)

export default function AdminMessagerie({ session, onOpenLead, onLeadChanged, onBack, initialLeadId }: {
  session: any
  initialLeadId?: string | undefined
  onOpenLead: (lead: any) => void
  onLeadChanged: () => void
  onBack?: (() => void) | undefined
}) {
  const [inbox, setInbox] = useState<InboxRow[]>([])
  const [team, setTeam] = useState<TeamRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState<Filtre>('tous')
  const [recherche, setRecherche] = useState('')
  const [fil, setFil] = useState<Fil>(initialLeadId ? { kind: 'lead', id: initialLeadId } : null)
  const [newOpen, setNewOpen] = useState(false)
  const [now, setNow] = useState(Date.now())
  const filRef = useRef<Fil>(null)
  filRef.current = fil
  const isDirector = session?.role === 'director'

  async function loadInbox() {
    const { data } = await supabase.rpc('admin_inbox')
    if (data) setInbox(data as InboxRow[])
  }
  async function loadTeam() {
    const { data } = await supabase.rpc('admin_team_threads')
    if (data) setTeam(data as TeamRow[])
  }
  async function loadAll() {
    await Promise.all([loadInbox(), loadTeam()])
    setLoading(false)
  }

  const [tick, setTick] = useState(0)
  useEffect(() => {
    loadAll()
    const t = setInterval(() => setNow(Date.now()), 60_000)
    const stop = onLiveEvent('admin-messagerie', (e) => {
      if (e.topic === 'msg' || e.topic === 'lead_upd' || e.topic === 'doc') loadInbox()
      if (e.topic === 'cchat') loadTeam()
      setTick(x => x + 1)
    })
    return () => { clearInterval(t); stop() }
  }, [])

  const c = compteurs(inbox, team, now)
  const listeLeads = filtrerInbox(inbox, filtre, recherche, now)
  const listeEquipe = filtre === 'equipe' || filtre === 'tous' ? filtrerEquipe(team, recherche) : []

  function ouvrir(f: Fil) { setFil(f) }

  return (
    <div className={`am-root ${onBack ? 'page' : ''}`}>
      <MessagerieStyles/>
      <div className="am-top">
        <div className="am-top-l">
          {onBack && (
            <button className="am-home" onClick={onBack} aria-label="Retour au tableau de bord">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 7H3M6 4L3 7l3 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}
          <span className="am-title">Messagerie</span>
          {c.nonLus > 0 && <span className="am-badge">{c.nonLus} non lu{c.nonLus > 1 ? 's' : ''}</span>}
          {c.enAttente > 0 && <button className="am-alert" onClick={() => setFiltre('attente')}>{c.enAttente} client{c.enAttente > 1 ? 's' : ''} attend{c.enAttente > 1 ? 'ent' : ''} depuis plus de 24 h</button>}
        </div>
        <div className="am-top-r">
          <button className="am-btn-ghost" onClick={() => ouvrir({ kind: 'broadcast' })}>Message à l'équipe</button>
          <button className="am-btn-primary" onClick={() => setNewOpen(true)}>Nouvelle conversation<ArrowDot/></button>
        </div>
      </div>

      <div className={`am-body ${fil ? 'has-fil' : ''}`}>
        <aside className="am-list">
          <div className="am-list-tools">
            <input className="am-search" placeholder="Rechercher un client, un commercial…" value={recherche} onChange={e => setRecherche(e.target.value)} aria-label="Rechercher"/>
            <div className="am-filters">
              {([
                ['tous', 'Tous'], ['non_lus', 'Non lus'], ['attente', 'En attente'],
                ['sans_conseiller', `Sans conseiller${c.sansConseiller ? ' · ' + c.sansConseiller : ''}`], ['equipe', 'Équipe'],
              ] as [Filtre, string][]).map(([k, l]) => (
                <button key={k} className={`am-chip ${filtre === k ? 'on' : ''}`} onClick={() => setFiltre(k)}>{l}</button>
              ))}
            </div>
          </div>
          <div className="am-items">
            {loading && <div className="am-empty">Chargement…</div>}
            {!loading && listeLeads.length === 0 && listeEquipe.length === 0 && (
              <div className="am-empty">Aucune conversation ici.{filtre !== 'tous' && <><br/><button className="am-link" onClick={() => setFiltre('tous')}>Tout afficher</button></>}</div>
            )}
            {filtre === 'tous' && listeEquipe.length > 0 && listeLeads.length > 0 && <div className="am-sep">Dossiers clients</div>}
            {listeLeads.map(r => {
              const retard = enRetard(r, now)
              const actif = fil?.kind === 'lead' && fil.id === r.lead_id
              return (
                <button key={r.lead_id} className={`am-item ${actif ? 'on' : ''} ${retard ? 'late' : ''}`} onClick={() => ouvrir({ kind: 'lead', id: r.lead_id })}>
                  <span className="am-av-duo">
                    <span className="am-av a">{initiales(r.nom)}</span>
                    {r.agent_nom ? <span className="am-av b">{initiales(r.agent_nom)}</span> : <span className="am-av q">?</span>}
                  </span>
                  <span className="am-item-txt">
                    <span className="am-item-row"><b>{r.nom || 'Client'}</b><small className={retard ? 'late' : ''}>{retard ? `${heuresAttente(r.waiting_since, now)} h` : heureCourte(r.last_at, now)}</small></span>
                    <span className={`am-item-kind ${r.agent_id ? '' : 'warn'}`}>{r.agent_id ? `Groupe · ${r.agent_nom || 'conseiller'}` : 'Sans conseiller'}</span>
                    <span className="am-item-row"><span className="am-item-prev">{apercu(r)}</span>{Number(r.unread) > 0 && <span className="am-count">{r.unread}</span>}</span>
                  </span>
                </button>
              )
            })}
            {filtre === 'tous' && listeEquipe.length > 0 && <div className="am-sep">Équipe commerciale</div>}
            {listeEquipe.map(t => {
              const actif = fil?.kind === 'team' && fil.id === t.commercial_id
              return (
                <button key={t.commercial_id} className={`am-item ${actif ? 'on' : ''}`} onClick={() => ouvrir({ kind: 'team', id: t.commercial_id })}>
                  <span className="am-av solo">{initiales(t.nom)}</span>
                  <span className="am-item-txt">
                    <span className="am-item-row"><b>{t.nom}</b><small>{heureCourte(t.last_at, now)}</small></span>
                    <span className="am-item-kind team">Commercial · {t.ville || '—'}</span>
                    <span className="am-item-row"><span className="am-item-prev">{t.last_body ? `${t.last_sender === 'director' ? 'Vous' : 'Lui'} : ${t.last_body}` : 'Pas encore de message'}</span>{Number(t.unread) > 0 && <span className="am-count">{t.unread}</span>}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </aside>

        <section className="am-main">
          {!fil && (
            <div className="am-placeholder">
              <div className="am-ph-ic"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
              <h3>Choisis une conversation</h3>
              <p>Chaque dossier a son groupe : le client, son commercial et la direction. Les notes internes restent entre vous.</p>
            </div>
          )}
          {fil?.kind === 'lead' && (
            <LeadThread key={fil.id} leadId={fil.id} row={inbox.find(r => r.lead_id === fil.id)} session={session} team={team} tick={tick}
              isDirector={isDirector} onBack={() => setFil(null)} onOpenLead={onOpenLead}
              onChanged={() => { loadInbox(); onLeadChanged() }}/>
          )}
          {fil?.kind === 'team' && (
            <TeamThread key={fil.id} row={team.find(t => t.commercial_id === fil.id)} commercialId={fil.id} tick={tick}
              dossiers={inbox.filter(r => r.agent_id === fil.id)} onBack={() => setFil(null)} onRead={loadTeam}
              onOpenDossier={(id) => setFil({ kind: 'lead', id })}/>
          )}
          {fil?.kind === 'broadcast' && (
            <Broadcast team={team} onBack={() => setFil(null)} onSent={loadTeam}/>
          )}
        </section>
      </div>

      {newOpen && <NouvelleConversation onClose={() => setNewOpen(false)} onPick={(id) => { setNewOpen(false); setFil({ kind: 'lead', id }) }}/>}
    </div>
  )
}

// ============ FIL DOSSIER (GROUPE) ============
function LeadThread({ leadId, row, session, team, tick, isDirector, onBack, onOpenLead, onChanged }: {
  leadId: string; row?: InboxRow | undefined; session: any; team: TeamRow[]; tick: number; isDirector: boolean
  onBack: () => void; onOpenLead: (l: any) => void; onChanged: () => void
}) {
  const [lead, setLead] = useState<any>(null)
  const [msgs, setMsgs] = useState<any[]>([])
  const [docs, setDocs] = useState<any[]>([])
  const [text, setText] = useState('')
  const [mode, setMode] = useState<Mode>('groupe')
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState('')
  const [typesOpen, setTypesOpen] = useState(false)
  const [rdvOpen, setRdvOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const rdvBtn = useRef<HTMLButtonElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  async function loadLead() {
    const { data } = await supabase.from('leads').select('*').eq('id', leadId).maybeSingle()
    setLead(data)
  }
  async function loadMsgs() {
    const { data } = await supabase.from('messages').select('*').eq('lead_id', leadId).order('created_at')
    if (data) setMsgs(data)
    const { data: n } = await supabase.rpc('mark_messages_read', { p_lead_id: leadId, p_reader: 'admin' })
    if (n) onChanged()
  }
  async function loadDocs() {
    const { data } = await supabase.rpc('get_lead_documents', { p_id: leadId })
    if (data) setDocs(data as any[])
  }
  useEffect(() => { loadLead(); loadDocs() }, [leadId])
  useEffect(() => { loadMsgs() }, [leadId, tick])
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [msgs.length])

  const agentId = lead?.agent_commercial_id || row?.agent_id || null
  const agentIsCommercial = !!agentId && team.some(t => t.commercial_id === agentId)
  const agentNom = row?.agent_nom || team.find(t => t.commercial_id === agentId)?.nom || null
  const isP = lead ? (lead.type === 'physique' || lead.type === 'Personne physique') : true
  const nom = row?.nom || (lead ? (isP ? `${lead.identite?.prenom || ''} ${lead.identite?.nom || ''}`.trim() : (lead.situation?.raison_sociale || lead.identite?.raison_sociale || 'Entreprise')) : '…')

  async function send() {
    const t = text.trim()
    if (!t || sending) return
    setSending(true); setErr('')
    let error: any = null
    if (mode === 'groupe') ({ error } = await supabase.rpc('send_lead_message', { p_lead_id: leadId, p_sender: 'admin', p_author_id: session.id, p_content: t }))
    else if (mode === 'note') ({ error } = await supabase.rpc('send_internal_note', { p_lead_id: leadId, p_content: t }))
    else ({ error } = await supabase.rpc('send_commercial_message', { p_commercial_id: agentId, p_sender_type: 'director', p_body: `[Dossier ${nom}] ${t}` }))
    setSending(false)
    if (error) { setErr(error.message || 'Message non envoyé'); return }
    setText('')
    loadMsgs(); onChanged()
  }

  async function sendCard(kind: 'pieces' | 'rdv', payload: any, secours: string): Promise<string | null> {
    setErr('')
    const { error } = await supabase.rpc('send_lead_card', { p_lead_id: leadId, p_sender: 'admin', p_author_id: session.id, p_kind: kind, p_payload: payload, p_content: secours })
    if (error) { setErr(error.message || 'Carte non envoyée'); return error.message || 'Carte non envoyée' }
    loadMsgs(); onChanged()
    return null
  }

  async function relancerPieces() {
    const restantes = docs.filter(d => d.status === 'pending' || d.status === 'rejected' || !d.status)
    if (!restantes.length) return
    await sendCard('pieces', { doc_ids: restantes.map(d => d.id) }, texteSecoursPieces(restantes.map(d => d.doc_label || 'Document')))
  }

  async function demanderPiece() {
    const label = prompt('Quelle pièce demander au client ?')
    if (!label || !label.trim()) return
    const { data: docId, error } = await supabase.rpc('admin_request_document', { p_admin_id: session.id, p_lead_id: leadId, p_label: label.trim() })
    if (error) { setErr(error.message); return }
    await loadDocs()
    await sendCard('pieces', { doc_ids: docId ? [String(docId)] : [] }, texteSecoursPieces([label.trim()]))
  }

  async function docStatus(id: string, status: 'validated' | 'rejected') {
    let note: string | null = null
    if (status === 'rejected') {
      note = prompt('Raison du refus (visible par le client) :')
      if (!note) return
    }
    await supabase.from('documents').update({ status, admin_note: note }).eq('id', id)
    loadDocs(); onChanged()
  }

  async function changerStatut(s: string) {
    const { error } = await supabase.rpc('admin_update_lead_status', { p_admin_id: session.id, p_lead_id: leadId, p_statut: s })
    if (error) { setErr(error.message); return }
    loadLead(); onChanged()
  }
  async function reattribuer(id: string) {
    const { error } = await supabase.rpc('assign_lead_agent', { p_lead_id: leadId, p_agent_id: id || null })
    if (error) { setErr(error.message); return }
    loadLead(); onChanged()
  }

  const placeholder = mode === 'groupe' ? 'Écrire au groupe (client, commercial, direction)…' : mode === 'note' ? 'Note interne : le client ne la verra pas…' : `Message privé à ${agentNom || 'son commercial'}…`
  const docsOk = docs.filter(d => d.status === 'validated').length

  return (
    <div className="am-thread-wrap">
      <div className="am-thread">
        <div className="am-th-head">
          <button className="am-back" onClick={onBack} aria-label="Retour à la liste">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 7H3M6 4L3 7l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div className="am-th-title">
            <b>{nom}{lead?.montant_demande ? ` · ${xaf(lead.montant_demande)}` : ''}</b>
            <small>{lead?.statut || row?.statut || ''}{lead?.ville ? ` · ${lead.ville}` : ''}</small>
          </div>
          <div className="am-members">
            <span className="am-mem">Client</span>
            <span className={`am-mem ${agentId ? 'blue' : 'warn'}`}>{agentNom || 'Sans conseiller'}</span>
            <span className="am-mem navy">Direction</span>
          </div>
          <CallButton tel={lead?.identite?.tel} nom={nom} leadId={leadId} className="am-call" onLogged={loadMsgs}>Appeler<span className="am-adot green"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" stroke="#fff" strokeWidth="2.4" strokeLinejoin="round"/></svg></span></CallButton>
          <button className="am-info-btn" onClick={() => setInfoOpen(o => !o)}>Dossier</button>
        </div>

        <div className="am-msgs">
          <Conversation viewer="equipe" docs={docs} bulles={regrouper(msgs.map(m => vueAdmin(m, session.id, nom)), Date.now())} vide="Pas encore de message. Écris le premier au groupe."/>
          <div ref={endRef}/>
        </div>

        <div className="am-composer">
          <ScrollRow className="am-tools">
            <div className="am-seg" role="tablist">
              <button className={mode === 'groupe' ? 'on' : ''} onClick={() => setMode('groupe')}>Au groupe</button>
              <button className={mode === 'note' ? 'on note' : ''} onClick={() => setMode('note')}>Note interne</button>
              <button className={mode === 'commercial' ? 'on' : ''} disabled={!agentIsCommercial} title={agentIsCommercial ? '' : 'Aucun commercial terrain sur ce dossier'} onClick={() => setMode('commercial')}>Au commercial seul</button>
            </div>
            <button className={`am-tool ${typesOpen ? 'active' : ''}`} onClick={() => { setTypesOpen(o => !o); setRdvOpen(false) }}>Message type</button>
            <button ref={rdvBtn} className={`am-tool ${rdvOpen ? 'active' : ''}`} onClick={() => { setRdvOpen(o => !o); setTypesOpen(false) }}>Proposer un RDV</button>
            <button className="am-tool" onClick={demanderPiece}>Demander une pièce</button>
            {docs.some(d => d.status === 'pending' || d.status === 'rejected' || !d.status) && <button className="am-tool" onClick={relancerPieces}>Relancer les pièces</button>}
          </ScrollRow>
          {typesOpen && (
            <div className="am-pop">
              {MESSAGES_TYPES.map(q => <button key={q.label} onClick={() => { setText(q.text); setMode('groupe'); setTypesOpen(false) }}><b>{q.label}</b><span>{q.text}</span></button>)}
            </div>
          )}
          {rdvOpen && <RdvComposer ancre={rdvBtn.current} onClose={() => setRdvOpen(false)}
            onSend={(at, lieu) => sendCard('rdv', { at: new Date(at).toISOString(), lieu }, texteSecoursRdv(at, lieu))}/>}
          {err && <div className="am-err">{err}</div>}
          {mode === 'groupe' && !text && <Suggestions items={suggestions('equipe', msgs.map(m => vueAdmin(m, session.id, nom)), nom.split(' ')[0])} onPick={t => setText(t)}/>}
          <ChatInput value={text} onChange={setText} onSend={send} sending={sending} note={mode === 'note'} placeholder={placeholder}/>
        </div>
      </div>

      <aside className={`am-side ${infoOpen ? 'open' : ''}`}>
        <div className="am-side-head"><span>Le dossier</span><button className="am-x" onClick={() => setInfoOpen(false)} aria-label="Fermer"><CloseIcon size={13}/></button></div>
        <div className="am-side-id">
          <span className="am-score">{lead?.score ?? '—'}</span>
          <div><b>{nom}</b><small>{lead?.activite || ''}{lead?.ville ? ` · ${lead.ville}` : ''}</small></div>
        </div>
        <div className="am-kv">
          <div><span>Statut</span>
            <NiceSelect variant="compact" value={lead?.statut || ''} onChange={changerStatut} title="Statut du dossier" ariaLabel="Statut du dossier" style={{ maxWidth: 170 }}
              options={LIFECYCLE_STATUTS.map(s => ({ value: s, label: s }))}/>
          </div>
          <div><span>Conseiller</span>
            {isDirector ? (
              <ConseillerPicker value={agentId || null} onChange={id => reattribuer(id || '')} villeLead={lead?.identite?.ville || lead?.ville} montant={lead?.montant_demande} nomSecours={agentNom || undefined} placeholder="Sans conseiller"/>
            ) : <b>{agentNom || 'Sans conseiller'}</b>}
          </div>
          <div><span>Pièces validées</span><b className={docsOk < docs.length ? 'warn' : 'ok'}>{docsOk} / {docs.length}</b></div>
          {lead?.identite?.tel && <div><span>Téléphone</span><CallButton tel={lead.identite.tel} nom={nom} leadId={leadId} className="am-tel" onLogged={loadMsgs}>{formatPhone(lead.identite.tel)}</CallButton></div>}
        </div>

        <div className="am-side-sub">Pièces du dossier</div>
        {docs.length === 0 ? <div className="am-empty sm">Aucune pièce pour l'instant.</div> : (
          <div className="am-docs">
            {docs.map(d => (
              <div key={d.id} className={`am-doc ${d.status}`}>
                <div className="am-doc-top">
                  <i className={`am-doc-ic ${d.status || 'pending'}`} aria-hidden="true"><PieceIcone docType={d.doc_type} titre={d.doc_label || d.file_name || 'Document'} size={15}/></i>
                  {d.file_url ? <a href={d.file_url} target="_blank" rel="noopener">{d.doc_label || d.file_name || 'Document'}</a> : <span>{d.doc_label || 'Document'}</span>}
                  <small>{d.status === 'validated' ? 'Validée' : d.status === 'rejected' ? 'Refusée' : d.status === 'uploaded' ? 'À vérifier' : 'Demandée'}</small>
                </div>
                {d.status === 'uploaded' && (
                  <div className="am-doc-act">
                    <button className="ok" onClick={() => docStatus(d.id, 'validated')}>Valider</button>
                    <button onClick={() => docStatus(d.id, 'rejected')}>Refuser</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <button className="am-btn-dark" onClick={() => lead && onOpenLead(lead)} disabled={!lead}>Ouvrir la fiche complète<ArrowDot/></button>
        <div className="am-hint"><b>Groupe dossier :</b> le client, son commercial et la direction échangent au même endroit. Les notes internes ne sont jamais visibles par le client.</div>
      </aside>
    </div>
  )
}


// ============ FIL DIRECTION <-> COMMERCIAL ============
function TeamThread({ commercialId, row, dossiers, tick, onBack, onRead, onOpenDossier }: {
  commercialId: string; row?: TeamRow | undefined; dossiers: InboxRow[]; tick: number
  onBack: () => void; onRead: () => void; onOpenDossier: (id: string) => void
}) {
  const [msgs, setMsgs] = useState<any[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  async function load() {
    const { data } = await supabase.from('commercial_chats').select('*').eq('commercial_id', commercialId).order('created_at')
    if (data) setMsgs(data)
    await supabase.rpc('mark_commercial_messages_read', { p_commercial_id: commercialId, p_reader_type: 'director' })
    onRead()
  }
  useEffect(() => { load() }, [commercialId, tick])
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [msgs.length])

  async function send() {
    const t = text.trim()
    if (!t || sending) return
    setSending(true); setErr('')
    const { error } = await supabase.rpc('send_commercial_message', { p_commercial_id: commercialId, p_sender_type: 'director', p_body: t })
    setSending(false)
    if (error) { setErr(error.message); return }
    setText(''); load()
  }

  return (
    <div className="am-thread-wrap">
      <div className="am-thread">
        <div className="am-th-head">
          <button className="am-back" onClick={onBack} aria-label="Retour à la liste">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 7H3M6 4L3 7l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div className="am-th-title"><b>{row?.nom || 'Commercial'}</b><small>Échange privé direction · {row?.ville || ''}</small></div>
        </div>
        <div className="am-msgs">
          <Conversation viewer="equipe" bulles={regrouper(msgs.map(m => vueEquipe(m, 'director', row?.nom || 'Commercial')), Date.now())} vide="Aucun échange pour l'instant."/>
          <div ref={endRef}/>
        </div>
        <div className="am-composer">
          {err && <div className="am-err">{err}</div>}
          <ChatInput value={text} onChange={setText} onSend={send} sending={sending} placeholder={`Écrire à ${row?.nom || 'ce commercial'}…`}/>
        </div>
      </div>
      <aside className="am-side static">
        <div className="am-side-head"><span>Le commercial</span></div>
        <div className="am-side-id"><span className="am-score blue">{initiales(row?.nom)}</span><div><b>{row?.nom}</b><small>{row?.ville}</small></div></div>
        {row?.telephone && <div className="am-kv"><div><span>Téléphone</span><CallButton tel={row.telephone} nom={row.nom} className="am-tel">{formatPhone(row.telephone)}</CallButton></div></div>}
        <div className="am-side-sub">Ses dossiers en discussion</div>
        {dossiers.length === 0 ? <div className="am-empty sm">Aucun dossier avec messages.</div> : (
          <div className="am-docs">
            {dossiers.map(d => (
              <button key={d.lead_id} className="am-doc link" onClick={() => onOpenDossier(d.lead_id)}>
                <div className="am-doc-top"><span>{d.nom}</span><small>{d.statut}</small></div>
              </button>
            ))}
          </div>
        )}
      </aside>
    </div>
  )
}

// ============ DIFFUSION ÉQUIPE ============
function Broadcast({ team, onBack, onSent }: { team: TeamRow[]; onBack: () => void; onSent: () => void }) {
  const villes = Array.from(new Set(team.map(t => t.ville).filter(Boolean))) as string[]
  const [ville, setVille] = useState('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [res, setRes] = useState('')
  const cibles = team.filter(t => !ville || t.ville === ville).length

  async function send() {
    if (!text.trim() || sending) return
    if (!confirm(`Envoyer ce message à ${cibles} commercial${cibles > 1 ? 'aux' : ''} ?`)) return
    setSending(true); setRes('')
    const { data, error } = await supabase.rpc('admin_broadcast_team', { p_ville: ville || null, p_body: text.trim() })
    setSending(false)
    if (error) { setRes(error.message); return }
    setRes(`Envoyé à ${data} commercial${Number(data) > 1 ? 'aux' : ''}.`)
    setText(''); onSent()
  }

  return (
    <div className="am-thread-wrap">
      <div className="am-thread">
        <div className="am-th-head">
          <button className="am-back" onClick={onBack} aria-label="Retour à la liste">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 7H3M6 4L3 7l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div className="am-th-title"><b>Message à l'équipe</b><small>Chaque commercial le reçoit dans son échange avec la direction</small></div>
        </div>
        <div className="am-bc">
          <label>Destinataires</label>
          <div className="am-filters">
            <button className={`am-chip ${ville === '' ? 'on' : ''}`} onClick={() => setVille('')}>Toute l'équipe · {team.length}</button>
            {villes.map(v => <button key={v} className={`am-chip ${ville === v ? 'on' : ''}`} onClick={() => setVille(v)}>{v} · {team.filter(t => t.ville === v).length}</button>)}
          </div>
          <label>Message</label>
          <textarea rows={6} value={text} onChange={e => setText(e.target.value)} placeholder="Ex : Objectif de la semaine : 5 rendez-vous chacun. Bon courage à tous."/>
          <div className="am-bc-foot">
            <span>{cibles} destinataire{cibles > 1 ? 's' : ''}</span>
            <button className="am-btn-primary" disabled={!text.trim() || sending || cibles === 0} onClick={send}>{sending ? 'Envoi…' : 'Envoyer à l\'équipe'}<ArrowDot/></button>
          </div>
          {res && <div className="am-ok">{res}</div>}
        </div>
      </div>
    </div>
  )
}

// ============ NOUVELLE CONVERSATION ============
function NouvelleConversation({ onClose, onPick }: { onClose: () => void; onPick: (id: string) => void }) {
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<any[]>([])
  useEffect(() => {
    let stop = false
    const t = setTimeout(async () => {
      const { data } = await supabase.from('leads').select('id, type, identite, situation, statut, ville, montant_demande').order('created_at', { ascending: false }).limit(200)
      if (stop || !data) return
      const s = q.trim().toLowerCase()
      const nomDe = (l: any) => (l.type === 'physique' || l.type === 'Personne physique') ? `${l.identite?.prenom || ''} ${l.identite?.nom || ''}`.trim() : (l.situation?.raison_sociale || l.identite?.raison_sociale || 'Entreprise')
      setRows(data.map((l: any) => ({ ...l, _nom: nomDe(l) })).filter((l: any) => !s || `${l._nom} ${l.ville || ''} ${l.identite?.tel || ''}`.toLowerCase().includes(s)).slice(0, 30))
    }, 200)
    return () => { stop = true; clearTimeout(t) }
  }, [q])
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])
  return (
    <div className="am-modal-bg" onClick={onClose}>
      <div className="am-modal" onClick={e => e.stopPropagation()}>
        <div className="am-side-head"><span>Nouvelle conversation</span><button className="am-x" onClick={onClose} aria-label="Fermer"><CloseIcon size={13}/></button></div>
        <input className="am-search" autoFocus placeholder="Nom, ville ou téléphone du client…" value={q} onChange={e => setQ(e.target.value)}/>
        <div className="am-modal-list">
          {rows.map(l => (
            <button key={l.id} className="am-item" onClick={() => onPick(l.id)}>
              <span className="am-av solo">{initiales(l._nom)}</span>
              <span className="am-item-txt"><b>{l._nom || 'Client'}</b><span className="am-item-prev">{l.statut} · {l.ville || '—'}{l.montant_demande ? ` · ${xaf(l.montant_demande)}` : ''}</span></span>
            </button>
          ))}
          {rows.length === 0 && <div className="am-empty">Aucun dossier trouvé.</div>}
        </div>
      </div>
    </div>
  )
}

function MessagerieStyles() {
  return <style>{`
    .am-root { display: flex; flex-direction: column; height: calc(100vh - 120px); min-height: 560px; background: #fff; border: 1px solid #E8ECF3; border-radius: 18px; overflow: hidden; position: relative; }
    .am-root.page { height: 100vh; height: 100dvh; min-height: 0; border: none; border-radius: 0; }
    .am-home { width: 36px; height: 36px; border-radius: 50%; border: none; background: rgba(255,255,255,0.12); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
    .am-home:hover { background: rgba(255,255,255,0.22); }
    .am-top { background: #0D1B3E; color: #fff; padding: 12px 18px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; }
    .am-top-l, .am-top-r { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .am-title { font-weight: 800; font-size: 17px; }
    .am-badge { background: #1A6BFF; border-radius: 100px; padding: 2px 10px; font-size: 12px; font-weight: 800; }
    .am-alert { background: rgba(245,158,11,0.18); color: #FCD34D; border: none; border-radius: 100px; padding: 5px 12px; font-family: inherit; font-size: 12px; font-weight: 800; cursor: pointer; }
    .am-adot { width: 24px; height: 24px; border-radius: 50%; background: #1A6BFF; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; transition: transform 0.15s; }
    .am-btn-primary { display: inline-flex; align-items: center; gap: 8px; border: none; background: #fff; color: #0D1B3E; padding: 4px 4px 4px 14px; border-radius: 100px; font-family: inherit; font-size: 13px; font-weight: 800; cursor: pointer; }
    .am-btn-primary:hover .am-adot { transform: translateX(2px); }
    .am-adot.green { background: #16A34A; }
    .am-call { border: none; display: inline-flex; align-items: center; gap: 8px; background: #DCFCE7 !important; color: #15803D; padding: 4px 4px 4px 13px; border-radius: 100px; font-size: 13px; font-weight: 800; flex-shrink: 0; }
    .am-call:hover { background: #BBF7D0 !important; }
    .am-tel { border: none; background: none !important; padding: 0; color: #1A6BFF; font-weight: 800; font-size: 13px; text-decoration: underline; text-underline-offset: 3px; }
    .am-btn-primary:disabled { opacity: 0.5; cursor: default; }
    .am-bc .am-btn-primary { background: #EEF4FF; color: #1A6BFF; }
    .am-btn-ghost { border: 1.5px solid rgba(255,255,255,0.25); background: transparent; color: #fff; padding: 7px 14px; border-radius: 100px; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
    .am-btn-dark { display: inline-flex; align-items: center; justify-content: space-between; gap: 8px; border: none; background: #0D1B3E; color: #fff; padding: 5px 5px 5px 16px; border-radius: 100px; font-family: inherit; font-size: 13px; font-weight: 800; cursor: pointer; margin-top: 14px; }
    .am-body { flex: 1; display: grid; grid-template-columns: 320px minmax(0, 1fr); min-height: 0; }
    .am-list { border-right: 1px solid #E8ECF3; display: flex; flex-direction: column; min-height: 0; min-width: 0; }
    .am-list-tools { padding: 12px; display: flex; flex-direction: column; gap: 10px; border-bottom: 1px solid #EEF2F8; }
    .am-search { border: 1.5px solid #E5E7EB; border-radius: 100px; padding: 9px 14px; font-family: inherit; font-size: 13.5px; outline: none; width: 100%; box-sizing: border-box; }
    .am-search:focus { border-color: #1A6BFF; }
    .am-filters { display: flex; gap: 6px; flex-wrap: wrap; }
    .am-chip { border: 1.5px solid #E5E7EB; background: #fff; color: #334155; padding: 5px 11px; border-radius: 100px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
    .am-chip.on { background: #0D1B3E; border-color: #0D1B3E; color: #fff; }
    .am-items { flex: 1; overflow-y: auto; }
    .am-sep { font-size: 10.5px; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em; padding: 12px 14px 4px; }
    .am-item { width: 100%; display: flex; gap: 10px; padding: 11px 14px; border: none; border-bottom: 1px solid #F3F5F9; border-left: 3px solid transparent; background: #fff; text-align: left; font-family: inherit; cursor: pointer; color: #0F1729; }
    .am-item:hover { background: #F8FAFC; }
    .am-item.on { background: #EEF4FF; border-left-color: #1A6BFF; }
    .am-item.late { background: #FFFBEB; }
    .am-item.late.on { background: #FEF3C7; }
    .am-av-duo { position: relative; width: 42px; height: 40px; flex-shrink: 0; }
    .am-av { border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; color: #fff; border: 2px solid #fff; }
    .am-av-duo .am-av { position: absolute; }
    .am-av.a { left: 0; top: 0; width: 28px; height: 28px; background: #0D1B3E; font-size: 11px; }
    .am-av.b, .am-av.q { right: 0; bottom: 0; width: 24px; height: 24px; font-size: 9.5px; background: #1A6BFF; }
    .am-av.q { background: #F59E0B; color: #0D1B3E; }
    .am-av.solo { width: 38px; height: 38px; background: #1A6BFF; font-size: 12px; flex-shrink: 0; }
    .am-item-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
    .am-item-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 13.5px; }
    .am-item-row b { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .am-item-row small { font-size: 11px; color: #64748B; flex-shrink: 0; }
    .am-item-row small.late { color: #B45309; font-weight: 800; }
    .am-item-kind { font-size: 11px; font-weight: 800; color: #1A6BFF; }
    .am-item-kind.warn { color: #B45309; }
    .am-item-kind.team { color: #15803D; }
    .am-item-prev { font-size: 12px; color: #64748B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .am-count { background: #1A6BFF; color: #fff; border-radius: 100px; padding: 0 7px; font-size: 11px; font-weight: 800; flex-shrink: 0; }
    .am-empty { padding: 28px 16px; text-align: center; color: #94A3B8; font-size: 13px; }
    .am-empty.sm { padding: 10px 0; text-align: left; }
    .am-link { background: none; border: none; color: #1A6BFF; font-family: inherit; font-weight: 800; cursor: pointer; margin-top: 6px; }
    .am-main { min-width: 0; min-height: 0; display: flex; background: #F8FAFC; }
    .am-placeholder { margin: auto; text-align: center; max-width: 340px; padding: 24px; color: #475569; }
    .am-placeholder h3 { margin: 12px 0 6px; color: #0D1B3E; font-size: 17px; }
    .am-placeholder p { font-size: 13.5px; line-height: 1.5; margin: 0; }
    .am-ph-ic { width: 60px; height: 60px; border-radius: 50%; background: #EEF4FF; color: #1A6BFF; display: inline-flex; align-items: center; justify-content: center; }
    .am-thread-wrap { flex: 1; display: flex; min-width: 0; min-height: 0; }
    .am-thread { flex: 1; display: flex; flex-direction: column; min-width: 0; min-height: 0; }
    .am-th-head { background: #fff; border-bottom: 1px solid #E8ECF3; padding: 10px 14px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .am-back { display: none; width: 34px; height: 34px; border-radius: 50%; border: 1.5px solid #E5E7EB; background: #fff; color: #0D1B3E; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
    .am-th-title { flex: 1; min-width: 160px; display: flex; flex-direction: column; }
    .am-th-title b { font-size: 14.5px; color: #0D1B3E; }
    .am-th-title small { font-size: 12px; color: #64748B; }
    .am-members { display: flex; gap: 5px; flex-wrap: wrap; }
    .am-mem { background: #EEF4FF; color: #0D1B3E; border-radius: 100px; padding: 4px 10px; font-size: 11.5px; font-weight: 700; }
    .am-mem.blue { color: #1A6BFF; }
    .am-mem.warn { background: #FEF3C7; color: #B45309; }
    .am-mem.navy { background: #0D1B3E; color: #fff; }
    .am-info-btn { display: none; border: 1.5px solid #E5E7EB; background: #fff; border-radius: 100px; padding: 6px 12px; font-family: inherit; font-size: 12px; font-weight: 800; color: #0D1B3E; cursor: pointer; }
    .am-msgs { flex: 1; overflow-y: auto; padding: 8px 18px 18px; display: flex; flex-direction: column; background: #F5F7FB; }
    .am-msg-block { display: flex; flex-direction: column; gap: 8px; }
    .am-day { align-self: center; font-size: 11px; color: #64748B; background: #EEF2F8; border-radius: 100px; padding: 3px 12px; font-weight: 700; text-transform: capitalize; margin: 6px 0; }
    .am-bubble { max-width: min(78%, 560px); padding: 9px 13px; font-size: 14px; line-height: 1.45; }
    .am-bubble.in { align-self: flex-start; background: #fff; border: 1px solid #E5E7EB; border-radius: 16px 16px 16px 4px; }
    .am-bubble.out { align-self: flex-end; background: #1A6BFF; color: #fff; border-radius: 16px 16px 4px 16px; }
    .am-bubble.out.com { background: #0D1B3E; }
    .am-bubble.note { background: #FEF3C7; color: #78350F; border: 1.5px dashed #F59E0B; }
    .am-who { font-size: 11px; font-weight: 800; margin-bottom: 2px; opacity: 0.85; }
    .am-txt { white-space: pre-wrap; word-break: break-word; }
    .am-time { font-size: 10.5px; opacity: 0.7; margin-top: 3px; text-align: right; }
    .am-composer { position: relative; background: #fff; border-top: 1px solid #E8ECF3; padding: 10px 14px; display: flex; flex-direction: column; gap: 8px; }
    .am-seg { display: flex; background: #F0F2F5; border-radius: 100px; padding: 3px; flex-shrink: 0; }
    .am-seg button { white-space: nowrap; }
    .am-seg button { border: none; background: transparent; color: #5B6478; padding: 6px 11px; border-radius: 100px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
    .am-seg button.on { background: #fff; color: #1A6BFF; font-weight: 800; box-shadow: 0 1px 4px rgba(13,27,62,0.08); }
    .am-seg button.on.note { color: #B45309; }
    .am-seg button:disabled { opacity: 0.4; cursor: not-allowed; }
    .am-tool { border: 1.5px solid #E5E7EB; background: #fff; padding: 6px 11px; border-radius: 100px; font-family: inherit; font-size: 12px; font-weight: 700; color: #334155; cursor: pointer; }
    .am-tool { white-space: nowrap; }
    .am-tool:hover, .am-tool.active { border-color: #BFD4FF; color: #1A6BFF; }
    .am-tool.active { background: #EEF4FF; }
    .am-pop { position: absolute; bottom: calc(100% + 6px); left: 14px; width: 320px; max-width: 80vw; background: #fff; border: 1px solid #E5E7EB; border-radius: 14px; box-shadow: 0 16px 40px rgba(13,27,62,0.16); padding: 6px; z-index: 20; display: flex; flex-direction: column; gap: 2px; max-height: 340px; overflow-y: auto; }
    .am-pop > button { border: none; background: none; text-align: left; padding: 8px 10px; border-radius: 10px; font-family: inherit; cursor: pointer; display: flex; flex-direction: column; gap: 2px; }
    .am-pop > button:hover { background: #F5F8FF; }
    .am-pop > button b { font-size: 12.5px; color: #0D1B3E; }
    .am-pop > button span { font-size: 12px; color: #64748B; }
    .am-pop.rdv { padding: 12px; gap: 8px; }
    .am-pop-title { font-size: 12.5px; font-weight: 800; color: #0D1B3E; }
    .am-sugg { display: flex; flex-wrap: wrap; gap: 5px; }
    .am-sugg button { border: 1.5px solid #E5E7EB; background: #fff; border-radius: 100px; padding: 4px 9px; font-family: inherit; font-size: 11.5px; font-weight: 700; cursor: pointer; color: #334155; }
    .am-pop.rdv input { border: 1.5px solid #E5E7EB; border-radius: 10px; padding: 8px 10px; font-family: inherit; font-size: 13px; outline: none; }
    .am-pop-act { display: flex; justify-content: flex-end; gap: 6px; }
    .am-pop-act button { border: 1.5px solid #E5E7EB; background: #fff; border-radius: 100px; padding: 6px 12px; font-family: inherit; font-size: 12px; font-weight: 800; cursor: pointer; }
    .am-pop-act button.primary { background: #1A6BFF; border-color: #1A6BFF; color: #fff; }
    .am-pop-act button:disabled { opacity: 0.5; }
    .am-input-row { display: flex; gap: 8px; align-items: flex-end; }
    .am-input-row textarea { flex: 1; min-width: 0; border: 1.5px solid #E5E7EB; border-radius: 22px; padding: 11px 16px; font-family: inherit; font-size: 14px; outline: none; resize: none; max-height: 140px; field-sizing: content; }
    .am-input-row textarea:focus { border-color: #1A6BFF; }
    .am-input-row.note textarea { background: #FFFBEB; border-color: #FCD34D; }
    .am-send { width: 44px; height: 44px; border-radius: 50%; border: none; background: #1A6BFF; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
    .am-send:disabled { background: #CBD5E1; cursor: default; }
    .am-err { background: #FEE2E2; color: #B91C1C; border-radius: 10px; padding: 8px 12px; font-size: 12.5px; font-weight: 600; }
    .am-ok { background: #DCFCE7; color: #166534; border-radius: 10px; padding: 8px 12px; font-size: 13px; font-weight: 700; }
    .am-side { width: 300px; flex-shrink: 0; background: #fff; border-left: 1px solid #E8ECF3; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; box-sizing: border-box; }
    .am-side-head { display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 800; color: #64748B; letter-spacing: 0.08em; text-transform: uppercase; }
    .am-x { display: none; border: none; background: #F1F5F9; width: 28px; height: 28px; border-radius: 50%; padding: 0; align-items: center; justify-content: center; cursor: pointer; color: #0D1B3E; }
    .am-modal .am-x { display: inline-flex; }
    .am-side-id { display: flex; gap: 12px; align-items: center; }
    .am-side-id b { display: block; font-size: 14px; color: #0D1B3E; }
    .am-side-id small { font-size: 12px; color: #64748B; }
    .am-score { width: 46px; height: 46px; border-radius: 50%; border: 4px solid #1A6BFF; display: flex; align-items: center; justify-content: center; font-weight: 800; color: #0D1B3E; flex-shrink: 0; font-size: 13px; }
    .am-score.blue { background: #1A6BFF; color: #fff; border-color: #EEF4FF; }
    .am-kv { background: #F8FAFC; border-radius: 12px; padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; font-size: 13px; }
    .am-kv > div { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .am-kv span { color: #64748B; }
    .am-kv b.warn { color: #B45309; }
    .am-kv b.ok { color: #15803D; }
    .am-kv select { max-width: 160px; border: 1.5px solid #E5E7EB; border-radius: 8px; padding: 5px 6px; font-family: inherit; font-size: 12.5px; font-weight: 700; color: #0D1B3E; background: #fff; }
    .am-side-sub { font-size: 11px; font-weight: 800; color: #64748B; letter-spacing: 0.08em; text-transform: uppercase; margin-top: 4px; }
    .am-docs { display: flex; flex-direction: column; gap: 6px; }
    .am-doc { border: 1px solid #E5E7EB; border-radius: 10px; padding: 8px 10px; font-size: 12.5px; background: #fff; text-align: left; font-family: inherit; }
    .am-doc.link { cursor: pointer; }
    .am-doc.link:hover { border-color: #BFD4FF; }
    .am-doc-top { display: flex; justify-content: space-between; gap: 8px; align-items: center; }
    .am-doc-ic { width: 28px; height: 28px; flex: none; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font-style: normal; background: #FEF3C7; color: #92400E; }
    .am-doc-ic.validated { background: #DCFCE7; color: #166534; } .am-doc-ic.uploaded { background: #DBEAFE; color: #1E40AF; } .am-doc-ic.rejected { background: #FEE2E2; color: #991B1B; }
    .am-doc-top a, .am-doc-top span { flex: 1; min-width: 0; font-weight: 700; color: #0D1B3E; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .am-doc-top a { color: #1A6BFF; }
    .am-doc-top small { font-size: 11px; font-weight: 800; color: #64748B; flex-shrink: 0; }
    .am-doc.validated .am-doc-top small { color: #15803D; }
    .am-doc.rejected .am-doc-top small { color: #B91C1C; }
    .am-doc.uploaded { border-color: #FCD34D; background: #FFFBEB; }
    .am-doc.uploaded .am-doc-top small { color: #B45309; }
    .am-doc-act { display: flex; gap: 6px; margin-top: 6px; }
    .am-doc-act button { border: 1.5px solid #E5E7EB; background: #fff; border-radius: 100px; padding: 4px 10px; font-family: inherit; font-size: 11.5px; font-weight: 800; cursor: pointer; }
    .am-doc-act button.ok { background: #16A34A; border-color: #16A34A; color: #fff; }
    .am-hint { background: #EEF4FF; border-radius: 12px; padding: 10px 12px; font-size: 12px; line-height: 1.5; color: #0D1B3E; margin-top: auto; }
    .am-bc { padding: 18px; display: flex; flex-direction: column; gap: 10px; max-width: 640px; }
    .am-bc label { font-size: 11px; font-weight: 800; color: #64748B; letter-spacing: 0.08em; text-transform: uppercase; }
    .am-bc textarea { border: 1.5px solid #E5E7EB; border-radius: 14px; padding: 12px 14px; font-family: inherit; font-size: 14px; outline: none; resize: vertical; }
    .am-bc textarea:focus { border-color: #1A6BFF; }
    .am-bc-foot { display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: 13px; color: #64748B; font-weight: 700; }
    .am-modal-bg { position: absolute; inset: 0; background: rgba(13,27,62,0.4); display: flex; align-items: flex-start; justify-content: center; padding: 60px 16px; z-index: 40; }
    .am-modal { background: #fff; border-radius: 18px; width: 100%; max-width: 480px; padding: 16px; display: flex; flex-direction: column; gap: 12px; max-height: 80%; box-shadow: 0 24px 60px rgba(13,27,62,0.3); }
    .am-modal-list { overflow-y: auto; border: 1px solid #F1F5F9; border-radius: 12px; }
    @media (max-width: 1180px) {
      .am-side:not(.static) { position: absolute; right: 0; top: 0; bottom: 0; z-index: 30; box-shadow: -12px 0 32px rgba(13,27,62,0.15); transform: translateX(100%); transition: transform 0.2s; }
      .am-side.open { transform: translateX(0); }
      .am-side:not(.static) .am-x { display: inline-flex; }
      .am-info-btn { display: inline-block; }
      .am-side.static { display: none; }
    }
    @media (max-width: 760px) {
      .am-root:not(.page) { height: calc(100vh - 90px); border-radius: 14px; }
      .am-top { padding: 10px 12px; }
      .am-btn-ghost { display: none; }
      .am-body { grid-template-columns: minmax(0, 1fr); }
      .am-body.has-fil .am-list { display: none; }
      .am-body:not(.has-fil) .am-main { display: none; }
      .am-back { display: inline-flex; }
      .am-members { display: none; }
      .am-call { font-size: 0; gap: 0; padding: 4px; }
      .am-bubble { max-width: 88%; }
    }
  `}</style>
}
