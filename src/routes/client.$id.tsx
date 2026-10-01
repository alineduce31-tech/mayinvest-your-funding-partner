import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'

export const Route = createFileRoute('/client/$id')({ component: ClientPortal })

type Tab = 'dossier' | 'messages' | 'documents' | 'devis'
type Lead = {
  id: string; score: number; statut: string; activite: string | null;
  montant_demande: number | null; banque_actuelle: string | null;
  type: string | null; identite: any; situation: any; besoin: any;
  eligibilite: any; raison_non_eligibilite: string | null; created_at: string;
}
type Message = { id: string; lead_id: string; expediteur: string; text: string; read: boolean; created_at: string }
type Doc = { id: string; lead_id: string; name: string; size: number; status: string; url: string | null; created_at: string }

function Logo() {
  return (
    <svg width="36" height="26" viewBox="0 0 72 52" fill="none" aria-label="Mayinvest">
      <path d="M4 32 Q 18 10, 36 26 T 68 20" stroke="#1A6BFF" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.3"/>
      <path d="M4 38 Q 18 16, 36 32 T 68 26" stroke="#1A6BFF" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.6"/>
      <path d="M4 44 Q 18 22, 36 38 T 68 32" stroke="#0D1B3E" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
    </svg>
  )
}

function ClientPortal() {
  const { id } = Route.useParams()
  const [tab, setTab] = useState<Tab>('dossier')
  const [lead, setLead] = useState<Lead | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [docs, setDocs] = useState<Doc[]>([])
  const [msgInput, setMsgInput] = useState('')
  const [sending, setSending] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    (async () => {
      const { data: l } = await supabase.from('leads').select('*').eq('id', id).single()
      if (l) setLead(l as Lead)
      const { data: m } = await supabase.from('messages').select('*').eq('lead_id', id).order('created_at')
      if (m) setMessages(m as Message[])
      const { data: d } = await supabase.from('documents').select('*').eq('lead_id', id).order('created_at')
      if (d) setDocs(d as Doc[])
    })()
    const ch = supabase.channel(`client-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `lead_id=eq.${id}` },
        (p) => setMessages(prev => [...prev, p.new as Message]))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [id])

  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' }) }, [messages])

  async function envoyer() {
    if (!msgInput.trim() || sending) return
    setSending(true)
    await supabase.from('messages').insert({ lead_id: id, expediteur: 'client', text: msgInput, read: false })
    setMsgInput(''); setSending(false)
  }

  const identite = lead?.identite || {}
  const nom = identite.prenom ? `${identite.prenom} ${identite.nom || ''}`.trim() : identite.raison_sociale || 'Client'
  const nonEligible = lead?.statut === 'Non Éligible' || lead?.eligibilite?.rccm === 'Non'
  const docsRecus = docs.filter(d => d.status === 'reçu')
  const docsAttendus = docs.filter(d => d.status === 'attendu')
  const progression = docs.length ? Math.round((docsRecus.length / docs.length) * 100) : 0
  const score = lead?.score || 0
  const verdict = score >= 70 ? 'Excellent' : score >= 50 ? 'Éligible' : 'À renforcer'
  const verdictColor = score >= 70 ? '#34D058' : score >= 50 ? '#FFB020' : '#FF6B6B'

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#F4F5F7', minHeight: '100vh', WebkitFontSmoothing: 'antialiased', color: '#111' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        .top { padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; background: #FFF; border-bottom: 1px solid #F0F0F0; }
        .brand { font-weight: 800; font-size: 15px; color: #0D1B3E; letter-spacing: -0.3px; }
        .brand-sub { font-size: 10px; color: #6B7280; }
        .user-chip { background: #F0F5FF; color: #1A6BFF; font-size: 11px; font-weight: 700; padding: 6px 12px; border-radius: 100px; }
        .tabs { padding: 10px 16px; background: #FFF; border-bottom: 1px solid #F0F0F0; display: flex; gap: 4px; overflow-x: auto; }
        .tab { padding: 10px 16px; color: #6B7280; font-size: 13px; font-weight: 600; white-space: nowrap; display: flex; align-items: center; gap: 7px; cursor: pointer; background: transparent; border: none; font-family: inherit; border-radius: 100px; }
        .tab.on { background: #0D1B3E; color: #fff; font-weight: 700; }
        .wrap { max-width: 560px; margin: 0 auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; }

        /* Carte score 3D navy */
        .score-card { background: #0D1B3E; border-radius: 24px; padding: 28px 24px; color: #fff; box-shadow: 0 30px 60px rgba(13,27,62,0.3); position: relative; overflow: hidden; transform: perspective(900px) rotateX(2deg); }
        .score-glow { position: absolute; top: -80px; right: -80px; width: 240px; height: 240px; pointer-events: none; }
        .score-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; position: relative; z-index: 1; }
        .score-label { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.4); letter-spacing: 0.1em; text-transform: uppercase; }
        .score-badge { font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 100px; display: flex; align-items: center; gap: 5px; }
        .score-row { display: flex; align-items: center; gap: 20px; position: relative; z-index: 1; }
        .ring { position: relative; width: 100px; height: 100px; flex-shrink: 0; }
        .ring-num { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }

        .card { background: #FFF; border-radius: 20px; padding: 22px; box-shadow: 0 4px 20px rgba(13,27,62,0.06); }
        .card-title { font-size: 11px; font-weight: 700; color: #1A6BFF; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 14px; }

        /* Timeline */
        .tl-item { display: flex; gap: 14px; padding-bottom: 16px; padding-left: 16px; margin-left: 8px; position: relative; }
        .tl-item.done { border-left: 2px solid #1A6BFF; }
        .tl-item.pending { border-left: 2px dashed #E5E7EB; }
        .tl-item.future { border-left: 2px dashed transparent; }
        .tl-dot { position: absolute; left: -9px; top: 0; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .tl-dot.done { background: #1A6BFF; }
        .tl-dot.pending { background: #FFF; border: 2px solid #1A6BFF; }
        .tl-dot.future { background: #E5E7EB; width: 12px; height: 12px; left: -7px; }

        .infos-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .info-box { background: #F9FAFB; border-radius: 12px; padding: 12px 14px; }
        .info-label { font-size: 11px; color: #6B7280; margin-bottom: 2px; }
        .info-val { font-size: 15px; font-weight: 700; color: #111; }

        .btn-wa { background: #25D366; color: #fff; font-family: inherit; font-size: 15px; font-weight: 700; padding: 16px; border-radius: 100px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 8px 20px rgba(37,211,102,0.3); width: 100%; }

        /* Chat WhatsApp */
        .chat-wrap { background: #ECE5DD; min-height: calc(100vh - 130px); display: flex; flex-direction: column; }
        .chat-top { padding: 14px 18px; background: #FFF; border-bottom: 1px solid #F0F0F0; display: flex; align-items: center; gap: 10px; }
        .cs-avatar { width: 38px; height: 38px; background: linear-gradient(135deg, #1A6BFF, #0D4FD1); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 13px; font-weight: 800; }
        .divider-v { width: 1px; height: 24px; background: #E5E7EB; }
        .chat-body { flex: 1; padding: 16px 12px 20px; display: flex; flex-direction: column; gap: 6px; overflow-y: auto; max-height: calc(100vh - 220px); }
        .date-chip { text-align: center; margin: 4px auto 10px; }
        .date-chip span { display: inline-block; background: #FDF4C9; color: #5F5445; font-size: 11px; font-weight: 600; padding: 5px 12px; border-radius: 8px; box-shadow: 0 1px 1px rgba(0,0,0,0.05); }
        .msg-row { display: flex; margin-bottom: 2px; }
        .msg-row.left { justify-content: flex-start; }
        .msg-row.right { justify-content: flex-end; }
        .bubble { position: relative; max-width: 78%; padding: 7px 11px 6px; box-shadow: 0 1px 1px rgba(0,0,0,0.08); border-radius: 8px; font-size: 14px; color: #111B21; line-height: 1.4; word-wrap: break-word; }
        .bubble.left { background: #FFF; border-top-left-radius: 0; }
        .bubble.left::before { content: ''; position: absolute; top: 0; left: -8px; width: 10px; height: 12px; overflow: hidden; }
        .bubble.right { background: #D9FDD3; border-top-right-radius: 0; }
        .time { font-size: 10px; color: #667781; margin-top: 2px; text-align: right; display: flex; justify-content: flex-end; align-items: center; gap: 4px; }
        .input-bar { padding: 10px 12px; background: #F0F2F5; display: flex; gap: 8px; align-items: center; }
        .input-attach { width: 40px; height: 40px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #54656F; }
        .input-field { flex: 1; background: #FFF; border-radius: 24px; padding: 10px 18px; min-height: 44px; display: flex; align-items: center; border: none; font-family: inherit; font-size: 14px; outline: none; }
        .input-send { width: 44px; height: 44px; background: #1A6BFF; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(26,107,255,0.35); }
        .input-send:disabled { background: #C7D0DB; cursor: not-allowed; box-shadow: none; }

        /* Docs */
        .doc-progress { background: linear-gradient(145deg, #0D1B3E, #0A1532); color: #fff; border-radius: 20px; padding: 22px; box-shadow: 0 20px 40px rgba(13,27,62,0.2); }
        .doc-pbar { height: 8px; background: rgba(255,255,255,0.1); border-radius: 100px; overflow: hidden; }
        .doc-pfill { height: 100%; background: linear-gradient(90deg, #1A6BFF, #34D058); border-radius: 100px; transition: width 0.5s ease; }
        .doc-section { display: flex; align-items: center; gap: 8px; margin-top: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
        .doc-row { background: #FFF; border-radius: 16px; padding: 14px 16px; display: flex; align-items: center; gap: 12px; box-shadow: 0 2px 10px rgba(13,27,62,0.05); }
        .doc-row.recu { border: 1.5px solid #DCFCE7; }
        .doc-row.attendu { background: #FFF7ED; border: 1.5px dashed #FED7AA; cursor: pointer; }
        .doc-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .doc-icon.recu { background: #DCFCE7; color: #16A34A; }
        .doc-icon.attendu { background: #FFEDD5; color: #EA580C; }
        .doc-name { font-size: 14px; font-weight: 700; color: #111; }
        .doc-sub { font-size: 11px; color: #6B7280; margin-top: 2px; }

        /* Devis */
        .alert { background: linear-gradient(145deg, #FFF7ED, #FFEDD5); border: 1.5px solid #FED7AA; border-radius: 20px; padding: 20px; box-shadow: 0 10px 30px rgba(234,88,12,0.1); display: flex; gap: 12px; align-items: flex-start; }
        .alert-icon { width: 40px; height: 40px; background: #EA580C; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #fff; }
        .pack-card { background: linear-gradient(145deg, #0D1B3E, #0A1532); border-radius: 24px; padding: 28px 24px; color: #fff; box-shadow: 0 30px 60px rgba(13,27,62,0.3); position: relative; overflow: hidden; transform: perspective(900px) rotateX(2deg); }
        .pack-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(124,58,237,0.2); color: #C4B5FD; font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 100px; margin-bottom: 18px; position: relative; z-index: 1; }
        .pack-feats { display: flex; flex-direction: column; gap: 12px; position: relative; z-index: 1; }
        .pack-feat { display: flex; gap: 10px; align-items: center; font-size: 13px; }
        .pack-feat-ic { width: 20px; height: 20px; background: rgba(52,208,88,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .btn-pay { background: #1A6BFF; color: #fff; font-family: inherit; font-size: 16px; font-weight: 700; padding: 18px 24px; border-radius: 100px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 10px 24px rgba(26,107,255,0.4); width: 100%; }
      `}</style>

      <div className="top">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Logo />
          <div>
            <div className="brand">Mayinvest</div>
            <div className="brand-sub">Mon espace</div>
          </div>
        </div>
        <div className="user-chip">{nom}</div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'dossier' ? 'on' : ''}`} onClick={() => setTab('dossier')}>
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" stroke="currentColor" strokeWidth="1.8"/></svg>
          Mon dossier
        </button>
        <button className={`tab ${tab === 'messages' ? 'on' : ''}`} onClick={() => setTab('messages')}>
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M3 7a2 2 0 012-2h10a2 2 0 012 2v6a2 2 0 01-2 2H8l-4 3v-3a2 2 0 01-1-1.73V7z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
          Messages
        </button>
        <button className={`tab ${tab === 'documents' ? 'on' : ''}`} onClick={() => setTab('documents')}>
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M15 7l-7 7a2.5 2.5 0 11-3.5-3.5L12 4a1.5 1.5 0 112 2L7 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
          Documents
        </button>
        {nonEligible && <button className={`tab ${tab === 'devis' ? 'on' : ''}`} onClick={() => setTab('devis')}>
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M6 2h8l4 4v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.8"/></svg>
          Pack
        </button>}
      </div>

      {tab === 'dossier' && <div className="wrap">
        <div className="score-card">
          <div className="score-glow" style={{ background: `radial-gradient(circle, ${verdictColor}44, transparent 65%)` }} />
          <div className="score-header">
            <div className="score-label">Votre score</div>
            <div className="score-badge" style={{ background: `${verdictColor}26`, color: verdictColor }}>
              <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3" fill={verdictColor}/></svg>
              {lead?.statut || verdict}
            </div>
          </div>
          <div className="score-row">
            <div className="ring">
              <svg viewBox="0 0 100 100" width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8"/>
                <circle cx="50" cy="50" r="42" fill="none" stroke={verdictColor} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(score/100)*264} 264`}/>
              </svg>
              <div className="ring-num">
                <div style={{ fontSize: 30, fontWeight: 800 }}>{score}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>/100</div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: verdictColor, marginBottom: 4 }}>{verdict}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
                {score >= 70 ? 'Un conseiller vous contacte sous 24h.' : score >= 50 ? "Notre équipe va renforcer votre dossier." : "Nous allons améliorer votre dossier ensemble."}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Avancement du dossier</div>
          <div className="tl-item done">
            <div className="tl-dot done"><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>Dossier reçu</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Score {score}/100 calculé</div>
            </div>
          </div>
          <div className={`tl-item ${lead?.statut !== 'Nouveau' ? 'done' : 'pending'}`}>
            <div className={`tl-dot ${lead?.statut !== 'Nouveau' ? 'done' : 'pending'}`}>
              {lead?.statut !== 'Nouveau' && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>Conseiller assigné</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Marie-Claire — Expert financement</div>
            </div>
          </div>
          <div className="tl-item pending">
            <div className="tl-dot pending" />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>Appel conseiller</div>
              <div style={{ fontSize: 12, color: '#1A6BFF', fontWeight: 600, marginTop: 4 }}>En attente</div>
            </div>
          </div>
          <div className="tl-item future">
            <div className="tl-dot future" />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#9CA3AF' }}>Dossier déposé en banque</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Résumé de votre demande</div>
          <div className="infos-grid">
            <div className="info-box"><div className="info-label">Montant</div><div className="info-val">{lead?.montant_demande ? `${(lead.montant_demande/1_000_000).toFixed(1)}M XAF` : '—'}</div></div>
            <div className="info-box"><div className="info-label">Objet</div><div className="info-val">{lead?.besoin?.objet || '—'}</div></div>
            <div className="info-box"><div className="info-label">Banque</div><div className="info-val">{lead?.banque_actuelle || '—'}</div></div>
            <div className="info-box"><div className="info-label">Activité</div><div className="info-val">{lead?.activite || '—'}</div></div>
          </div>
        </div>

        <button className="btn-wa" onClick={() => window.open(`https://wa.me/242060000000?text=Bonjour Mayinvest, mon dossier ${id}`, '_blank')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M17.5 14.4l-2.4-1.2c-.3-.2-.7-.1-1 .2l-.7.8c-.2.2-.5.3-.8.1-.9-.4-1.8-1-2.6-1.7-.7-.8-1.3-1.7-1.7-2.6-.1-.3 0-.6.2-.8l.8-.7c.3-.2.4-.6.2-1L8.3 5c-.2-.4-.7-.5-1-.3L5.5 6c-.5.2-.8.7-.7 1.2.4 2.8 1.7 5.4 3.6 7.4 2 2 4.6 3.3 7.4 3.6.5.1 1-.2 1.2-.7l1.3-1.8c.2-.4.1-.9-.3-1.1l-.5-.2z"/></svg>
          Contacter mon conseiller
        </button>
      </div>}

      {tab === 'messages' && <div className="chat-wrap">
        <div className="chat-top">
          <div className="cs-avatar">MC</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0D1B3E' }}>Marie-Claire</div>
            <div style={{ fontSize: 11, color: '#16A34A', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, background: '#16A34A', borderRadius: '50%' }} /> En ligne · Conseiller
            </div>
          </div>
        </div>
        <div className="chat-body" ref={chatRef}>
          <div className="date-chip"><span>Aujourd'hui</span></div>
          {messages.length === 0 && <div style={{ textAlign: 'center', color: '#54656F', fontSize: 13, padding: 20 }}>Démarrez la conversation avec votre conseiller.</div>}
          {messages.map(m => (
            <div key={m.id} className={`msg-row ${m.expediteur === 'client' ? 'right' : 'left'}`}>
              <div className={`bubble ${m.expediteur === 'client' ? 'right' : 'left'}`}>
                <div>{m.text}</div>
                <div className="time">
                  {new Date(m.created_at).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })}
                  {m.expediteur === 'client' && <svg width="14" height="10" viewBox="0 0 18 12" fill="none"><path d="M1 7l3 3L13 1M7 7l3 3L17 1" stroke={m.read ? '#53BDEB' : '#667781'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="input-bar">
          <button className="input-attach"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg></button>
          <input className="input-field" placeholder="Écrire un message..." value={msgInput} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') envoyer() }} />
          <button className="input-send" disabled={!msgInput.trim() || sending} onClick={envoyer}>
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none"><path d="M7 11V3M3 7l4-4 4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>}

      {tab === 'documents' && <div className="wrap">
        <div className="doc-progress">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Dossier à {progression}%</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{docsRecus.length} sur {docs.length || 5} pièces</div>
          </div>
          <div className="doc-pbar"><div className="doc-pfill" style={{ width: `${progression}%` }} /></div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 10 }}>
            {docsAttendus.length > 0 ? `Plus que ${docsAttendus.length} document${docsAttendus.length > 1 ? 's' : ''} à transmettre` : 'Dossier complet !'}
          </div>
        </div>

        {docsRecus.length > 0 && <>
          <div className="doc-section" style={{ color: '#16A34A' }}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" fill="#16A34A"/><path d="M6 10l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Reçus
          </div>
          {docsRecus.map(d => (
            <div key={d.id} className="doc-row recu">
              <div className="doc-icon recu"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg></div>
              <div style={{ flex: 1 }}>
                <div className="doc-name">{d.name}</div>
                <div className="doc-sub">{(d.size/1024).toFixed(0)} KB</div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
          ))}
        </>}

        {docsAttendus.length > 0 && <>
          <div className="doc-section" style={{ color: '#EA580C' }}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" fill="#EA580C"/><path d="M10 6v4M10 13v.5" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
            À fournir
          </div>
          {docsAttendus.map(d => (
            <div key={d.id} className="doc-row attendu">
              <div className="doc-icon attendu"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>
              <div style={{ flex: 1 }}>
                <div className="doc-name">{d.name}</div>
                <div style={{ fontSize: 11, color: '#EA580C', marginTop: 2, fontWeight: 600 }}>Appuyer pour téléverser</div>
              </div>
              <div style={{ width: 28, height: 28, background: '#EA580C', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
            </div>
          ))}
        </>}
      </div>}

      {tab === 'devis' && nonEligible && <div className="wrap">
        <div className="alert">
          <div className="alert-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#9A3412', marginBottom: 4 }}>Votre entreprise n'a pas de RCCM</div>
            <div style={{ fontSize: 13, color: '#9A3412', lineHeight: 1.5 }}>Les banques exigent un RCCM pour accorder un financement. Nous vous accompagnons dans la formalisation.</div>
          </div>
        </div>
        <div className="pack-card">
          <div style={{ position: 'absolute', top: -80, right: -80, width: 240, height: 240, background: 'radial-gradient(circle, rgba(124,58,237,0.3), transparent 65%)', pointerEvents: 'none' }} />
          <div className="pack-badge">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="#C4B5FD"><path d="M6 1l1.5 3L11 4.5l-2.5 2.5L9 10.5 6 9 3 10.5l.5-3.5L1 4.5 4.5 4z"/></svg>
            Recommandé
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4, color: '#fff', position: 'relative', zIndex: 1 }}>Pack Formalisation</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 20, position: 'relative', zIndex: 1 }}>Mise en conformité juridique complète</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 24, position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 40, fontWeight: 800, color: '#fff' }}>50 000</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>XAF</div>
          </div>
          <div className="pack-feats">
            {['Immatriculation RCCM', 'Obtention NIU', 'Ouverture compte pro bancaire', 'Accompagnement 3 mois', 'Garantie éligibilité banque'].map(f => (
              <div key={f} className="pack-feat" style={{ color: '#fff' }}>
                <div className="pack-feat-ic"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l2 2 4-4" stroke="#34D058" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                {f}
              </div>
            ))}
          </div>
        </div>
        <button className="btn-pay">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20"/></svg>
          Payer 50 000 XAF
        </button>
      </div>}

    </div>
  )
}
