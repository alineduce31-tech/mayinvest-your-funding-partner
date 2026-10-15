import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Logo } from '@/components/Logo'

export const Route = createFileRoute('/client/$id')({
  component: ClientPortal,
})

/* ---------- Helpers ---------- */
function formatCode(v: string): string {
  let s = v.toUpperCase().replace(/[^A-Z0-9-]/g, '')
  if (!s.startsWith('MYI-')) s = 'MYI-' + s.replace(/^MYI-?/, '')
  return s.slice(0, 11)
}
function formatXAF(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === '') return '—'
  const v = typeof n === 'string' ? parseInt(n) : n
  if (!v || isNaN(v)) return '—'
  return v.toLocaleString('fr-FR').replace(/,/g, ' ') + ' XAF'
}
function statutColor(s: string): { bg: string; fg: string } {
  switch (s) {
    case 'Nouveau': return { bg: '#EEF4FF', fg: '#1A6BFF' }
    case 'Contacté': return { bg: '#FFF4E5', fg: '#B45309' }
    case 'RDV': return { bg: '#F3E8FF', fg: '#6B21A8' }
    case 'Dossier Déposé': return { bg: '#E0F2FE', fg: '#075985' }
    case 'Éligible': return { bg: '#DCFCE7', fg: '#166534' }
    case 'Financé': return { bg: '#D1FAE5', fg: '#065F46' }
    case 'Non Éligible': return { bg: '#FEE2E2', fg: '#991B1B' }
    case 'Perdu': return { bg: '#F3F4F6', fg: '#6B7280' }
    default: return { bg: '#F3F4F6', fg: '#374151' }
  }
}

const STEPS = ['Nouveau', 'Contacté', 'RDV', 'Dossier Déposé', 'Éligible', 'Financé']

/* ---------- Mascotte Mia ---------- */
const TIPS: Record<string, { title: string; body: string }> = {
  'gate': { title: 'Accès sécurisé', body: "Entrez le code reçu lors de votre inscription. Il protège vos informations." },
  'portal': { title: 'Votre espace', body: "Suivez l'avancée de votre dossier, échangez avec votre conseiller et ajoutez vos pièces." },
  'chat': { title: 'Discussion directe', body: "Envoyez un message à votre conseiller. Il voit immédiatement et répond ici." },
  'docs': { title: 'Vos pièces', body: "Les pièces demandées apparaîtront ici. Vous pourrez les ajouter dès que votre conseiller les demande." },
}
function Mascot({ tipKey, open, setOpen }: { tipKey: string; open: boolean; setOpen: (v: boolean) => void }) {
  const tip = TIPS[tipKey] || TIPS['portal']
  return (
    <>
      <button className={`mascot-fab ${open ? 'on' : ''}`} onClick={() => setOpen(!open)} aria-label="Aide">
        <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="14" fill="#1A6BFF"/>
          <circle cx="11.5" cy="14" r="1.8" fill="#fff"/>
          <circle cx="20.5" cy="14" r="1.8" fill="#fff"/>
          <path d="M11 20c1.5 1.5 3 2 5 2s3.5-.5 5-2" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="23" cy="9" r="3" fill="#34D058"/>
        </svg>
        {!open && <span className="mascot-pulse" />}
      </button>
      {open && (
        <div className="mascot-bubble">
          <button className="mascot-close" onClick={() => setOpen(false)} aria-label="Fermer">×</button>
          <div className="mascot-title">
            <span className="mascot-avatar">
              <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="14" fill="#1A6BFF"/>
                <circle cx="11.5" cy="14" r="1.6" fill="#fff"/>
                <circle cx="20.5" cy="14" r="1.6" fill="#fff"/>
                <path d="M11 20c1.5 1.5 3 2 5 2s3.5-.5 5-2" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </span>
            <span>Mia · {tip.title}</span>
          </div>
          <div className="mascot-body">{tip.body}</div>
        </div>
      )}
    </>
  )
}

/* ---------- Component ---------- */
function ClientPortal() {
  const navigate = useNavigate()
  const { id } = useParams({ from: '/client/$id' })
  const [stage, setStage] = useState<'loading' | 'needsCode' | 'portal' | 'notfound'>('loading')
  const [codeInput, setCodeInput] = useState('MYI-')
  const [codeError, setCodeError] = useState('')
  const [codeLoading, setCodeLoading] = useState(false)
  const [lead, setLead] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [mascotOpen, setMascotOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'suivi' | 'chat' | 'docs'>('suivi')
  const chatEnd = useRef<HTMLDivElement>(null)

  // 1) Essaie code mémorisé puis affiche gate si besoin
  useEffect(() => {
    const tryCode = (() => { try { return localStorage.getItem(`mayinvest_code_${id}`) || '' } catch { return '' } })()
    if (tryCode) openWithCode(tryCode, true)
    else setStage('needsCode')
  }, [id])

  async function openWithCode(code: string, silent = false) {
    if (!silent) setCodeLoading(true)
    setCodeError('')
    const { data, error } = await supabase.rpc('get_lead_by_code', { p_id: id, p_code: code })
    if (!silent) setCodeLoading(false)
    if (error || !data || (Array.isArray(data) && data.length === 0)) {
      if (silent) { setStage('needsCode'); return }
      setCodeError("Code incorrect. Vérifiez votre code d'accès.")
      return
    }
    const leadRow = Array.isArray(data) ? data[0] : data
    setLead(leadRow)
    try { localStorage.setItem(`mayinvest_code_${id}`, code) } catch {}
    setStage('portal')
    loadMessages()
  }

  async function loadMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('lead_id', id)
      .order('created_at', { ascending: true })
    if (data) setMessages(data)
  }

  // Realtime chat
  useEffect(() => {
    if (stage !== 'portal') return
    const channel = supabase
      .channel(`client-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `lead_id=eq.${id}` },
        (payload) => setMessages(prev => [...prev, payload.new]))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [stage, id])

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function envoyer() {
    if (!newMsg.trim() || sending) return
    setSending(true)
    const msg = newMsg.trim()
    setNewMsg('')
    const { error } = await supabase.from('messages').insert({
      lead_id: id,
      sender: 'client',
      content: msg,
    })
    setSending(false)
    if (error) { setNewMsg(msg); alert('Impossible d\'envoyer : ' + error.message) }
  }

  function deconnecter() {
    try { localStorage.removeItem(`mayinvest_code_${id}`) } catch {}
    navigate({ to: '/mon-espace' })
  }

  /* ========== RENDER ========== */

  const commonStyle = (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        input, textarea, select { font-size: 16px !important; }
        .top { position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,0.92); backdrop-filter: saturate(180%) blur(14px); -webkit-backdrop-filter: saturate(180%) blur(14px); height: 72px; padding: 0 60px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #F0F0F0; }
        @media (max-width: 640px) { .top { height: 60px; padding: 0 16px; } }
        .back { background: #111; color: #fff; font-size: 14px; font-weight: 600; padding: 11px 22px; border-radius: 100px; border: none; cursor: pointer; display: flex; align-items: center; gap: 8px; text-decoration: none; }
        @media (max-width: 640px) { .back { padding: 8px 14px; font-size: 12px; } .back svg { width: 12px; height: 12px; } }
        .wrap { max-width: 720px; margin: 0 auto; padding: 32px 20px 60px; }

        /* Mascotte */
        .mascot-fab { position: fixed; right: 18px; bottom: 18px; width: 56px; height: 56px; border-radius: 50%; border: none; background: #fff; box-shadow: 0 10px 24px rgba(13,27,62,0.2), 0 2px 6px rgba(13,27,62,0.1); cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 60; transition: transform 0.2s; }
        .mascot-fab:hover { transform: scale(1.06); }
        .mascot-fab.on { background: #EEF4FF; }
        .mascot-pulse { position: absolute; top: 4px; right: 4px; width: 10px; height: 10px; border-radius: 50%; background: #34D058; box-shadow: 0 0 0 0 rgba(52,208,88,0.6); animation: mia-pulse 2s infinite; }
        @keyframes mia-pulse { 0% { box-shadow: 0 0 0 0 rgba(52,208,88,0.6);} 70% { box-shadow: 0 0 0 10px rgba(52,208,88,0);} 100% { box-shadow: 0 0 0 0 rgba(52,208,88,0);} }
        .mascot-bubble { position: fixed; right: 18px; bottom: 86px; width: calc(100% - 36px); max-width: 300px; background: #fff; border-radius: 16px; box-shadow: 0 20px 40px rgba(13,27,62,0.18), 0 6px 14px rgba(13,27,62,0.08); padding: 14px 16px 16px; z-index: 60; border: 1px solid #EEF4FF; animation: mia-pop 0.22s ease-out; }
        @keyframes mia-pop { from { opacity: 0; transform: translateY(8px) scale(0.98);} to { opacity: 1; transform: translateY(0) scale(1);} }
        .mascot-close { position: absolute; top: 6px; right: 10px; background: transparent; border: none; font-size: 20px; color: #888; cursor: pointer; line-height: 1; }
        .mascot-title { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 800; color: #0D1B3E; margin-bottom: 6px; padding-right: 20px; }
        .mascot-avatar { width: 26px; height: 26px; border-radius: 50%; overflow: hidden; display: inline-flex; align-items: center; justify-content: center; }
        .mascot-body { font-size: 13px; color: #444; line-height: 1.45; }

        /* Gate */
        .gate-card { background: #fff; border-radius: 20px; padding: 32px 26px; box-shadow: 0 10px 30px rgba(13,27,62,0.08); max-width: 420px; margin: 60px auto 0; text-align: center; }
        .gate-icon { width: 60px; height: 60px; border-radius: 16px; background: #EEF4FF; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        .gate-h { font-size: 22px; font-weight: 800; margin: 0 0 8px; color: #0D1B3E; }
        .gate-sub { font-size: 14px; color: #666; margin: 0 0 20px; }
        .gate-field { background: #F8FAFC; border: 1.5px solid #E5E7EB; border-radius: 14px; padding: 12px 16px; margin-bottom: 12px; text-align: left; }
        .gate-field label { display: block; font-size: 11px; font-weight: 600; color: #888; margin-bottom: 2px; }
        .gate-field input { width: 100%; border: none; padding: 0; font-family: inherit; font-weight: 700; letter-spacing: 0.06em; color: #111; background: transparent; outline: none; font-family: 'SF Mono', 'Monaco', 'Consolas', monospace; }
        .btn-main { width: 100%; background: #1A6BFF; color: #fff; font-family: inherit; font-size: 15px; font-weight: 700; padding: 14px 22px; border-radius: 100px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 8px 20px rgba(26,107,255,0.3); transition: all 0.2s; }
        .btn-main:hover:not(:disabled) { background: #1560E0; transform: translateY(-1px); }
        .btn-main:disabled { background: #C7D0DB; cursor: not-allowed; box-shadow: none; }
        .btn-wa { width: 100%; background: #25D366; color: #fff; font-family: inherit; font-size: 14px; font-weight: 700; padding: 13px 20px; border-radius: 100px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; }
        .gate-err { background: #FEF2F2; border: 1.5px solid #FCA5A5; color: #B91C1C; font-size: 13px; font-weight: 600; padding: 10px 14px; border-radius: 12px; margin-top: 12px; text-align: left; }
        .gate-help { margin-top: 16px; font-size: 12px; color: #666; }
        .gate-help a { color: #1A6BFF; text-decoration: none; font-weight: 700; }

        /* Portal */
        .hdr-card { background: linear-gradient(135deg, #0D1B3E 0%, #1A3380 100%); color: #fff; border-radius: 22px; padding: 24px 22px; box-shadow: 0 20px 40px rgba(13,27,62,0.2); margin-bottom: 20px; position: relative; overflow: hidden; }
        .hdr-card::before { content: ''; position: absolute; top: -60px; right: -60px; width: 220px; height: 220px; background: radial-gradient(circle, rgba(26,107,255,0.3), transparent 65%); pointer-events: none; }
        .hdr-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; position: relative; z-index: 1; gap: 10px; }
        .hdr-name { font-size: 22px; font-weight: 800; margin: 0 0 4px; letter-spacing: -0.5px; }
        .hdr-ref { font-size: 11px; color: rgba(255,255,255,0.6); font-family: monospace; word-break: break-all; }
        .hdr-score { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); border-radius: 14px; padding: 10px 14px; text-align: center; min-width: 72px; flex-shrink: 0; }
        .hdr-score-v { font-size: 24px; font-weight: 800; line-height: 1; }
        .hdr-score-l { font-size: 10px; color: rgba(255,255,255,0.6); margin-top: 2px; }
        .hdr-meta { display: flex; flex-wrap: wrap; gap: 10px; position: relative; z-index: 1; }
        .chip { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); border-radius: 100px; padding: 6px 12px; font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.9); }
        .btn-logout { background: transparent; border: 1px solid rgba(255,255,255,0.3); color: #fff; font-family: inherit; font-size: 11px; font-weight: 700; padding: 6px 12px; border-radius: 100px; cursor: pointer; }

        .tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; background: #EEF2F7; padding: 5px; border-radius: 14px; margin-bottom: 16px; }
        .tab { background: transparent; border: none; font-family: inherit; font-size: 13px; font-weight: 700; color: #666; padding: 10px; border-radius: 10px; cursor: pointer; transition: all 0.15s; }
        .tab:hover { color: #111; }
        .tab.on { background: #fff; color: #1A6BFF; box-shadow: 0 2px 6px rgba(13,27,62,0.08); }

        .card { background: #fff; border-radius: 20px; padding: 22px 20px; box-shadow: 0 8px 20px rgba(13,27,62,0.05); margin-bottom: 16px; }
        .card-h { font-size: 11px; font-weight: 700; color: #1A6BFF; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 14px; }

        /* Timeline suivi */
        .timeline { display: flex; flex-direction: column; gap: 0; }
        .tl-step { display: flex; gap: 14px; padding: 10px 0; }
        .tl-dot { position: relative; width: 24px; display: flex; justify-content: center; }
        .tl-dot::before { content: ''; position: absolute; top: 24px; bottom: -10px; width: 2px; background: #E5E7EB; }
        .tl-step:last-child .tl-dot::before { display: none; }
        .tl-circle { width: 24px; height: 24px; border-radius: 50%; background: #E5E7EB; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; color: #fff; z-index: 1; }
        .tl-step.done .tl-circle { background: #34D058; }
        .tl-step.on .tl-circle { background: #1A6BFF; box-shadow: 0 0 0 4px rgba(26,107,255,0.15); }
        .tl-step.done .tl-dot::before { background: #34D058; }
        .tl-body { padding-top: 2px; }
        .tl-label { font-size: 14px; font-weight: 700; color: #111; }
        .tl-step.pending .tl-label { color: #999; font-weight: 500; }

        /* Infos */
        .infos-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 480px) { .infos-grid { grid-template-columns: 1fr; } }
        .info-item { }
        .info-k { font-size: 11px; color: #888; font-weight: 600; margin-bottom: 2px; letter-spacing: 0.02em; }
        .info-v { font-size: 14px; color: #111; font-weight: 600; word-break: break-word; }

        /* Chat */
        .chat-scroll { max-height: 420px; overflow-y: auto; padding-right: 4px; margin-bottom: 14px; display: flex; flex-direction: column; gap: 8px; }
        .msg { max-width: 78%; padding: 10px 14px; border-radius: 16px; font-size: 14px; line-height: 1.4; word-break: break-word; }
        .msg.client { align-self: flex-end; background: #1A6BFF; color: #fff; border-bottom-right-radius: 4px; }
        .msg.admin { align-self: flex-start; background: #F0F3F8; color: #111; border-bottom-left-radius: 4px; }
        .msg-meta { font-size: 10px; color: rgba(255,255,255,0.65); margin-top: 2px; text-align: right; }
        .msg.admin .msg-meta { color: #999; text-align: left; }
        .chat-input { display: flex; gap: 8px; border: 1.5px solid #E5E7EB; border-radius: 14px; padding: 10px 10px 10px 14px; background: #fff; }
        .chat-input:focus-within { border-color: #1A6BFF; box-shadow: 0 4px 12px rgba(26,107,255,0.1); }
        .chat-input textarea { flex: 1; border: none; outline: none; resize: none; font-family: inherit; font-weight: 500; max-height: 100px; min-height: 20px; padding: 0; }
        .chat-send { background: #1A6BFF; color: #fff; border: none; border-radius: 10px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
        .chat-send:disabled { background: #C7D0DB; cursor: not-allowed; }
        .chat-empty { text-align: center; padding: 30px 10px; color: #999; font-size: 13px; }

        /* Pack formalisation */
        .pack { background: linear-gradient(135deg, #FFF4E5, #FFFBF2); border: 1.5px solid #FFB020; border-radius: 18px; padding: 18px 18px 20px; }
        .pack-h { font-size: 14px; font-weight: 800; color: #B45309; margin-bottom: 6px; }
        .pack-p { font-size: 13px; color: #78350F; line-height: 1.5; margin-bottom: 12px; }
        .btn-pack { background: #B45309; color: #fff; font-family: inherit; font-size: 13px; font-weight: 700; padding: 10px 16px; border-radius: 100px; border: none; cursor: pointer; }

        /* Contact expert (WhatsApp uniquement) */
        .contact-card { background: linear-gradient(135deg, #E7F8EC 0%, #D5F4DD 100%); border: 1.5px solid #25D366; border-radius: 18px; padding: 18px; display: flex; flex-direction: column; gap: 10px; }
        .contact-h { font-size: 13px; font-weight: 800; color: #0C4A1E; display: flex; align-items: center; gap: 8px; }
        .contact-sub { font-size: 12px; color: #166534; line-height: 1.4; }
      `}</style>
    </>
  )

  /* ----- STAGE: LOADING ----- */
  if (stage === 'loading') {
    return (
      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#F8FAFC', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {commonStyle}
        <div style={{ color: '#666', fontSize: 14 }}>Chargement…</div>
      </div>
    )
  }

  /* ----- STAGE: NEEDS CODE (Gate) ----- */
  if (stage === 'needsCode') {
    return (
      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#F8FAFC', color: '#111', minHeight: '100vh' }}>
        {commonStyle}
        <div className="top">
          <Logo height={56} tone="light" />
          <a className="back" href="/mon-espace" onClick={(e) => { e.preventDefault(); navigate({ to: '/mon-espace' }) }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 7H3M6 4L3 7l3 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Mon espace
          </a>
        </div>
        <div className="wrap">
          <div className="gate-card">
            <div className="gate-icon">
              <svg width="30" height="30" viewBox="0 0 32 32" fill="none"><rect x="7" y="14" width="18" height="13" rx="2" stroke="#1A6BFF" strokeWidth="2.4"/><path d="M11 14v-4a5 5 0 0110 0v4" stroke="#1A6BFF" strokeWidth="2.4"/></svg>
            </div>
            <h1 className="gate-h">Accès sécurisé</h1>
            <p className="gate-sub">Entrez votre code d'accès pour consulter votre dossier.</p>
            <div className="gate-field">
              <label>Code d'accès</label>
              <input
                placeholder="MYI-ABC1234"
                maxLength={11}
                value={codeInput}
                onChange={e => setCodeInput(formatCode(e.target.value))}
                onKeyDown={e => { if (e.key === 'Enter' && codeInput.length === 11) openWithCode(codeInput) }}
              />
            </div>
            <button className="btn-main" disabled={codeLoading || codeInput.length < 11} onClick={() => openWithCode(codeInput)}>
              {codeLoading ? 'Vérification…' : 'Déverrouiller'}
              {!codeLoading && <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M4 9h10M10 5l4 4-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </button>
            {codeError && <div className="gate-err">{codeError}</div>}
            <div className="gate-help">
              Code perdu ?{' '}
              <a href="https://wa.me/242060000000?text=Bonjour%20Mayinvest%2C%20j%27ai%20perdu%20mon%20code%20d%27acc%C3%A8s" target="_blank" rel="noopener noreferrer">
                Contactez un expert sur WhatsApp
              </a>
            </div>
          </div>
        </div>
        <Mascot tipKey="gate" open={mascotOpen} setOpen={setMascotOpen} />
      </div>
    )
  }

  /* ----- STAGE: PORTAL ----- */
  const isP = lead?.type === 'physique'
  const nom = isP ? `${lead?.identite?.prenom || ''} ${lead?.identite?.nom || ''}`.trim() : (lead?.identite?.raison_sociale || lead?.situation?.raison_sociale || 'Mon dossier')
  const statutIdx = STEPS.indexOf(lead?.statut)
  const col = statutColor(lead?.statut)
  const sc = statutColor(lead?.statut)
  const packNeeded = !isP && (lead?.situation?.rccm === 'Non')

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#F8FAFC', color: '#111', minHeight: '100vh' }}>
      {commonStyle}
      <div className="top">
        <Logo height={56} tone="light" />
        <button className="back" onClick={deconnecter}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 7H3M6 4L3 7l3 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Mon espace
        </button>
      </div>

      <div className="wrap">
        {/* En-tête dossier */}
        <div className="hdr-card">
          <div className="hdr-top">
            <div style={{ minWidth: 0 }}>
              <h1 className="hdr-name">{nom}</h1>
              <div className="hdr-ref">Réf. {id}</div>
            </div>
            <div className="hdr-score">
              <div className="hdr-score-v">{lead?.score || 0}</div>
              <div className="hdr-score-l">/ 100</div>
            </div>
          </div>
          <div className="hdr-meta">
            <span className="chip" style={{ background: col.bg, color: col.fg, borderColor: 'transparent' }}>● {lead?.statut}</span>
            <span className="chip">{isP ? 'Particulier' : 'PME'} · {lead?.activite}</span>
            {lead?.ville && <span className="chip">{lead.ville}</span>}
            <button className="btn-logout" onClick={deconnecter} style={{ marginLeft: 'auto' }}>Se déconnecter</button>
          </div>
        </div>

        {/* Onglets */}
        <div className="tabs">
          <button className={`tab ${activeTab === 'suivi' ? 'on' : ''}`} onClick={() => setActiveTab('suivi')}>Suivi</button>
          <button className={`tab ${activeTab === 'chat' ? 'on' : ''}`} onClick={() => setActiveTab('chat')}>
            Discussion {messages.filter(m => m.sender === 'admin').length > 0 && <span style={{ display: 'inline-block', background: '#1A6BFF', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 100, marginLeft: 4 }}>{messages.filter(m => m.sender === 'admin').length}</span>}
          </button>
          <button className={`tab ${activeTab === 'docs' ? 'on' : ''}`} onClick={() => setActiveTab('docs')}>Mes infos</button>
        </div>

        {/* SUIVI */}
        {activeTab === 'suivi' && <>
          <div className="card">
            <div className="card-h">Avancement de votre dossier</div>
            <div className="timeline">
              {STEPS.map((s, i) => {
                const cls = i < statutIdx ? 'done' : i === statutIdx ? 'on' : 'pending'
                return (
                  <div key={s} className={`tl-step ${cls}`}>
                    <div className="tl-dot">
                      <div className="tl-circle">{i < statutIdx ? '✓' : i + 1}</div>
                    </div>
                    <div className="tl-body"><div className="tl-label">{s}</div></div>
                  </div>
                )
              })}
            </div>
          </div>

          {packNeeded && (
            <div className="card">
              <div className="pack">
                <div className="pack-h">📄 Pack Formalisation Mayinvest</div>
                <div className="pack-p">Votre société n'a pas encore de RCCM. Nous pouvons nous charger de la création : statuts, immatriculation, NIU et compte bancaire.</div>
                <button className="btn-pack" onClick={() => window.open('https://wa.me/242060000000?text=Bonjour%20Mayinvest%2C%20je%20suis%20int%C3%A9ress%C3%A9%20par%20le%20Pack%20Formalisation', '_blank')}>Je suis intéressé</button>
              </div>
            </div>
          )}

          {/* Contact expert WhatsApp uniquement — plus de "appeler" */}
          <div className="card">
            <div className="card-h">Besoin d'aide ?</div>
            <div className="contact-card">
              <div className="contact-h">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#166534"><path d="M17.5 14.4l-2.4-1.2c-.3-.2-.7-.1-1 .2l-.7.8c-.2.2-.5.3-.8.1-.9-.4-1.8-1-2.6-1.7-.7-.8-1.3-1.7-1.7-2.6-.1-.3 0-.6.2-.8l.8-.7c.3-.2.4-.6.2-1L8.3 5c-.2-.4-.7-.5-1-.3L5.5 6c-.5.2-.8.7-.7 1.2.4 2.8 1.7 5.4 3.6 7.4 2 2 4.6 3.3 7.4 3.6.5.1 1-.2 1.2-.7l1.3-1.8c.2-.4.1-.9-.3-1.1l-.5-.2z"/></svg>
                Discuter avec un expert
              </div>
              <div className="contact-sub">Un conseiller Mayinvest vous répond directement sur WhatsApp sous 24h.</div>
              <button className="btn-wa" onClick={() => window.open(`https://wa.me/242060000000?text=Bonjour%20Mayinvest%2C%20mon%20dossier%20${lead?.access_code || id}`, '_blank')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M17.5 14.4l-2.4-1.2c-.3-.2-.7-.1-1 .2l-.7.8c-.2.2-.5.3-.8.1-.9-.4-1.8-1-2.6-1.7-.7-.8-1.3-1.7-1.7-2.6-.1-.3 0-.6.2-.8l.8-.7c.3-.2.4-.6.2-1L8.3 5c-.2-.4-.7-.5-1-.3L5.5 6c-.5.2-.8.7-.7 1.2.4 2.8 1.7 5.4 3.6 7.4 2 2 4.6 3.3 7.4 3.6.5.1 1-.2 1.2-.7l1.3-1.8c.2-.4.1-.9-.3-1.1l-.5-.2z"/></svg>
                Ouvrir WhatsApp
              </button>
            </div>
          </div>
        </>}

        {/* CHAT */}
        {activeTab === 'chat' && (
          <div className="card">
            <div className="card-h">Discussion avec votre conseiller</div>
            <div className="chat-scroll">
              {messages.length === 0 && <div className="chat-empty">Aucun message pour le moment.<br/>Envoyez le premier à votre conseiller.</div>}
              {messages.map(m => (
                <div key={m.id} className={`msg ${m.sender === 'client' ? 'client' : 'admin'}`}>
                  <div>{m.content}</div>
                  <div className="msg-meta">{new Date(m.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              ))}
              <div ref={chatEnd} />
            </div>
            <div className="chat-input">
              <textarea
                placeholder="Votre message…"
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyer() } }}
                rows={1}
              />
              <button className="chat-send" onClick={envoyer} disabled={!newMsg.trim() || sending} aria-label="Envoyer">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 11l17-7-7 17-3-7-7-3z" stroke="#fff" strokeWidth="2" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>
        )}

        {/* INFOS */}
        {activeTab === 'docs' && (
          <div className="card">
            <div className="card-h">Récap de votre demande</div>
            <div className="infos-grid">
              <div className="info-item"><div className="info-k">Type</div><div className="info-v">{isP ? 'Particulier' : 'PME'}</div></div>
              <div className="info-item"><div className="info-k">Activité</div><div className="info-v">{lead?.activite || '—'}</div></div>
              <div className="info-item"><div className="info-k">Montant demandé</div><div className="info-v">{formatXAF(lead?.montant_demande)}</div></div>
              <div className="info-item"><div className="info-k">Objet</div><div className="info-v">{lead?.besoin?.objet || '—'}</div></div>
              <div className="info-item"><div className="info-k">Banque</div><div className="info-v">{lead?.banque_actuelle || '—'}</div></div>
              <div className="info-item"><div className="info-k">Ville</div><div className="info-v">{lead?.ville || '—'}</div></div>
              {isP ? <>
                <div className="info-item"><div className="info-k">Employeur</div><div className="info-v">{lead?.situation?.employeur || '—'}</div></div>
                <div className="info-item"><div className="info-k">Revenu mensuel</div><div className="info-v">{formatXAF(lead?.situation?.revenu)}</div></div>
                <div className="info-item"><div className="info-k">Salaire domicilié</div><div className="info-v">{lead?.eligibilite?.salaire_domic || '—'}</div></div>
              </> : <>
                <div className="info-item"><div className="info-k">Dirigeant</div><div className="info-v">{lead?.situation?.dirigeant || '—'}</div></div>
                <div className="info-item"><div className="info-k">RCCM</div><div className="info-v">{lead?.situation?.rccm || '—'}</div></div>
                <div className="info-item"><div className="info-k">CA annuel</div><div className="info-v">{formatXAF(lead?.situation?.ca_annuel)}</div></div>
                <div className="info-item"><div className="info-k">Flux mensuel</div><div className="info-v">{formatXAF(lead?.besoin?.flux_mois)}</div></div>
              </>}
            </div>
            <div style={{ marginTop: 16, padding: 12, background: '#F8FAFC', borderRadius: 12, fontSize: 12, color: '#666' }}>
              💡 Besoin de modifier une info ? Envoyez un message à votre conseiller dans l'onglet Discussion.
            </div>
          </div>
        )}
      </div>

      <Mascot tipKey={activeTab === 'chat' ? 'chat' : activeTab === 'docs' ? 'docs' : 'portal'} open={mascotOpen} setOpen={setMascotOpen} />
    </div>
  )
}
