import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { useEffect, useState, useRef, type ReactNode } from 'react'
import { supabase } from '@/integrations/supabase/client'

export const Route = createFileRoute('/client/$id')({
  component: ClientPortal,
})

/* ---------- Helpers ---------- */
function formatCode(v: string): string {
  let s = v.toUpperCase().replace(/[^A-Z0-9-]/g, '')
  if (!s.startsWith('MYI-')) s = 'MYI-' + s.replace(/^MYI-?/, '')
  return s.slice(0, 11)
}
function formatXAF(n: any): string {
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

/* ---------- Avatar Haki (œil 3D) ---------- */
function hakiAvatar(size: number) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" shapeRendering="geometricPrecision">
      <defs>
        <radialGradient id="c-haki-eyeball" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffffff"/>
          <stop offset="55%" stopColor="#f5f5f5"/>
          <stop offset="85%" stopColor="#d8d8d8"/>
          <stop offset="100%" stopColor="#a8a8a8"/>
        </radialGradient>
        <radialGradient id="c-haki-iris" cx="40%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#c88a4a"/>
          <stop offset="35%" stopColor="#8b5a2b"/>
          <stop offset="75%" stopColor="#4a2d14"/>
          <stop offset="100%" stopColor="#1a0d04"/>
        </radialGradient>
        <radialGradient id="c-haki-shadow" cx="50%" cy="50%" r="50%">
          <stop offset="75%" stopColor="rgba(0,0,0,0)"/>
          <stop offset="100%" stopColor="rgba(0,0,0,0.35)"/>
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="95" fill="url(#c-haki-eyeball)"/>
      <circle cx="100" cy="100" r="95" fill="url(#c-haki-shadow)"/>
      <circle cx="100" cy="100" r="95" fill="none" stroke="#000" strokeWidth="4"/>
      <g className="c-haki-eye-ball">
        <circle cx="100" cy="100" r="55" fill="url(#c-haki-iris)"/>
        <circle cx="100" cy="100" r="55" fill="none" stroke="#1a0d04" strokeWidth="2.5" opacity="0.6"/>
        <circle cx="100" cy="100" r="22" fill="#000"/>
        <ellipse cx="112" cy="85" rx="10" ry="8" fill="#fff" opacity="0.95"/>
        <circle cx="90" cy="110" r="4.5" fill="#fff" opacity="0.75"/>
      </g>
      <ellipse cx="60" cy="45" rx="30" ry="18" fill="#fff" opacity="0.35"/>
    </svg>
  )
}

/* ---------- Haki Assistant ---------- */
type HakiAction = { label: string; onClick: () => void; primary?: boolean; icon?: ReactNode }
type HakiMsg = { title?: string; body: string; actions?: HakiAction[]; success?: boolean }

function HakiAssistant({ msg, open, onToggle, autoMode, onToggleAuto }: {
  msg: HakiMsg; open: boolean; onToggle: () => void; autoMode: boolean; onToggleAuto: () => void
}) {
  const [showHelp, setShowHelp] = useState(false)
  return (
    <>
      <button className={`c-haki-fab ${open ? 'on' : ''}`} onClick={onToggle} aria-label="Haki">
        <span className="c-haki-fab-inner">{hakiAvatar(44)}</span>
        {!open && <span className="c-haki-fab-dot"/>}
      </button>
      {open && (
        <div className="c-haki-panel">
          <div className="c-haki-head">
            <div className="c-haki-head-left">
              <div className="c-haki-avatar-wrap">{hakiAvatar(42)}<span className="c-haki-status"/></div>
              <div>
                <div className="c-haki-name">Haki</div>
                <div className="c-haki-sub"><span className="c-haki-dot"/>En ligne · Assistante Mayinvest</div>
              </div>
            </div>
            <button className="c-haki-close" onClick={onToggle} aria-label="Fermer">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>
          <div className="c-haki-chat">
            <div className="c-haki-msg-row">
              <div className="c-haki-msg-avatar">{hakiAvatar(28)}</div>
              <div className={`c-haki-msg ${msg.success ? 'success' : ''}`}>
                {msg.title && <div className="c-haki-msg-title">{msg.title}</div>}
                <div className="c-haki-msg-body" style={{ whiteSpace: 'pre-line' }}>{msg.body}</div>
              </div>
            </div>
            {msg.actions && msg.actions.length > 0 && (
              <div className="c-haki-actions">
                {msg.actions.map((a, i) => (
                  <button key={i} className={`c-haki-btn ${a.primary ? 'primary' : ''}`} onClick={a.onClick}>
                    {a.icon}<span>{a.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="c-haki-settings">
            <div className="c-haki-auto-row">
              <div className="c-haki-auto-info">
                <div className="c-haki-auto-label">Mode automatique</div>
                <div className="c-haki-auto-state">{autoMode ? 'Activé' : 'Désactivé'}</div>
              </div>
              <button className={`c-haki-switch ${autoMode ? 'on' : ''}`} onClick={onToggleAuto} aria-label="Toggle auto">
                <span className="c-haki-switch-knob"/>
              </button>
              <button className="c-haki-help-btn" onClick={() => setShowHelp(h => !h)}>?</button>
            </div>
            {showHelp && (
              <div className="c-haki-help-box">
                <button className="c-haki-help-close" onClick={() => setShowHelp(false)}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                </button>
                <div className="c-haki-help-title">À quoi sert ce bouton ?</div>
                <div className="c-haki-help-text">
                  <strong>Activé</strong> : Haki s'ouvre automatiquement pour vous guider.<br/><br/>
                  <strong>Désactivé</strong> : Haki reste discret. Vous l'ouvrez à la demande.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

/* ---------- Component principal ---------- */
function ClientPortal() {
  const navigate = useNavigate()
  const { id } = useParams({ from: '/client/$id' })
  const [stage, setStage] = useState<'loading' | 'needsCode' | 'portal'>('loading')
  const [codeInput, setCodeInput] = useState('MYI-')
  const [codeError, setCodeError] = useState('')
  const [codeLoading, setCodeLoading] = useState(false)
  const [lead, setLead] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [activeTab, setActiveTab] = useState<'suivi' | 'chat' | 'infos'>('suivi')
  const chatEnd = useRef<HTMLDivElement>(null)

  // Haki
  const [hakiOpen, setHakiOpen] = useState(false)
  const [autoMode, setAutoMode] = useState<boolean>(() => { try { const v = localStorage.getItem('mayinvest_haki_auto'); return v === null ? true : v === '1' } catch { return true } })
  function toggleAuto() { setAutoMode(m => { const n = !m; try { localStorage.setItem('mayinvest_haki_auto', n ? '1' : '0') } catch {}; return n }) }

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
    const { data } = await supabase.from('messages').select('*').eq('lead_id', id).order('created_at')
    if (data) setMessages(data)
  }

  useEffect(() => {
    if (stage !== 'portal') return
    const chan = supabase.channel(`client-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `lead_id=eq.${id}` },
        (p) => setMessages(prev => [...prev, p.new]))
      .subscribe()
    return () => { supabase.removeChannel(chan) }
  }, [stage, id])

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Auto-ouverture Haki selon le mode et le tab
  useEffect(() => {
    if (stage === 'needsCode' && autoMode) {
      const t = setTimeout(() => setHakiOpen(true), 800)
      return () => clearTimeout(t)
    }
  }, [stage, autoMode])
  useEffect(() => {
    if (stage === 'portal' && autoMode) {
      const t = setTimeout(() => setHakiOpen(true), 500)
      return () => clearTimeout(t)
    }
  }, [activeTab, stage, autoMode])

  async function envoyer() {
    if (!newMsg.trim() || sending) return
    setSending(true)
    const msg = newMsg.trim()
    setNewMsg('')
    const { error } = await supabase.from('messages').insert({ lead_id: id, sender: 'client', content: msg })
    setSending(false)
    if (error) { setNewMsg(msg); alert("Impossible d'envoyer : " + error.message) }
  }

  function deconnecter() {
    try { localStorage.removeItem(`mayinvest_code_${id}`) } catch {}
    navigate({ to: '/mon-espace' })
  }

  /* ---------- Message Haki selon contexte ---------- */
  const hakiMsg: HakiMsg = (() => {
    if (stage === 'needsCode') {
      return {
        title: '🔐 Accès sécurisé',
        body: "Pour voir votre dossier, entrez votre code d'accès reçu lors de l'inscription (format MYI-XXXXXXX). Ce code protège vos informations.",
        actions: [{ label: 'Code perdu ? Contacter un expert', onClick: () => window.open('https://wa.me/242060000000?text=Bonjour%20Mayinvest%2C%20j%27ai%20perdu%20mon%20code', '_blank') }],
      }
    }
    if (!lead) return { body: '' }
    const isP = lead.type === 'physique' || lead.type === 'Personne physique'
    const nom = isP ? (lead.identite?.prenom || 'cher client') : (lead.situation?.raison_sociale || lead.identite?.raison_sociale || 'cher client')
    const packNeeded = !isP && lead.situation?.rccm === 'Non'

    if (activeTab === 'suivi') {
      const statutIdx = STEPS.indexOf(lead.statut)
      const explanations: Record<string, string> = {
        'Nouveau': "Votre dossier vient d'être reçu. Un conseiller va le prendre en main sous 24h.",
        'Contacté': "Un conseiller vous a contacté. Répondez-lui pour avancer dans le processus.",
        'RDV': "Un rendez-vous est prévu. Préparez vos documents (CNI, justificatifs de revenus).",
        'Dossier Déposé': "Votre dossier est en analyse à la banque. Patience, cela prend quelques jours.",
        'Éligible': "Félicitations ! Votre dossier est accepté. La banque va vous proposer les conditions.",
        'Financé': "🎉 Votre prêt est débloqué ! Les fonds sont sur votre compte.",
        'Non Éligible': "Le dossier n'a pas pu aboutir cette fois. Discutons de solutions alternatives.",
        'Perdu': "Le dossier a été archivé. Vous pouvez relancer un nouveau dossier à tout moment.",
      }
      return {
        title: `Bonjour ${nom} 👋`,
        body: `Votre dossier est au statut : « ${lead.statut} » (étape ${statutIdx + 1} sur 6).\n\n${explanations[lead.statut] || "Suivez l'avancement dans la timeline."}`,
        success: ['Éligible','Financé'].includes(lead.statut),
        actions: [
          { label: 'Discuter sur WhatsApp', onClick: () => window.open(`https://wa.me/242060000000?text=Bonjour%2C%20mon%20dossier%20${lead.access_code || id}`, '_blank'), primary: true },
          ...(packNeeded ? [{ label: '📄 Je veux le Pack Formalisation', onClick: () => window.open(`https://wa.me/242060000000?text=Pack%20Formalisation%20${lead.access_code || id}`, '_blank') }] : []),
        ],
      }
    }
    if (activeTab === 'chat') {
      const unread = messages.filter(m => m.sender === 'admin' && !m.read_at).length
      return {
        title: unread > 0 ? `💬 ${unread} nouveau${unread > 1 ? 'x' : ''} message${unread > 1 ? 's' : ''}` : '💬 Discussion directe',
        body: unread > 0
          ? "Votre conseiller vous a écrit. Lisez le message et répondez-lui directement ici."
          : "Posez vos questions à votre conseiller Mayinvest. Il répond directement ici (vous recevez une notification).",
        actions: messages.length === 0 ? [{
          label: 'Démarrer : écrire au conseiller',
          onClick: () => { setHakiOpen(false); setTimeout(() => { (document.querySelector('.c-chat-input textarea') as HTMLTextAreaElement)?.focus() }, 300) },
          primary: true,
        }] : [],
      }
    }
    // infos
    return {
      title: 'ℹ️ Vos informations',
      body: "Voici le récap de votre demande. Pour modifier une information, envoyez un message à votre conseiller dans l'onglet Discussion, il la mettra à jour pour vous.",
      actions: [{ label: 'Aller à la Discussion', onClick: () => { setActiveTab('chat'); setHakiOpen(false) }, primary: true }],
    }
  })()

  const commonStyle = (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        input, textarea, select, button { font-size: 16px !important; font-family: inherit; }
        body { margin: 0; }

        .c-wrap { max-width: 720px; margin: 0 auto; padding: 20px 16px 100px; }
        @media (min-width: 640px) { .c-wrap { padding: 32px 20px 100px; } }

        /* Œil Haki animé */
        .c-haki-eye-ball { transform-origin: 100px 100px; animation: c-haki-look 12s ease-in-out infinite; }
        @keyframes c-haki-look {
          0%, 10%  { transform: translate(0, 0);}
          16%, 26% { transform: translate(20px, 0);}
          32%, 42% { transform: translate(15px, 15px);}
          48%, 58% { transform: translate(-15px, 15px);}
          64%, 74% { transform: translate(-20px, 0);}
          80%, 90% { transform: translate(0, -15px);}
          100%     { transform: translate(0, 0);}
        }

        /* Haki FAB & panel */
        .c-haki-fab { position: fixed; right: 20px; bottom: 20px; width: 64px; height: 64px; border-radius: 50%; border: 3px solid #fff; background: transparent; box-shadow: 0 14px 32px rgba(13,27,62,0.25), 0 4px 10px rgba(13,27,62,0.08); cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 60; padding: 0; }
        .c-haki-fab-inner { display: flex; }
        .c-haki-fab-dot { position: absolute; top: 2px; right: 2px; width: 14px; height: 14px; border-radius: 50%; background: #34D058; border: 2.5px solid #fff; animation: c-pulse 2.2s infinite; }
        @keyframes c-pulse { 0% { box-shadow: 0 0 0 0 rgba(52,208,88,0.5);} 70% { box-shadow: 0 0 0 12px rgba(52,208,88,0);} 100% { box-shadow: 0 0 0 0 rgba(52,208,88,0);} }
        .c-haki-panel { position: fixed; right: 20px; bottom: 96px; width: calc(100% - 40px); max-width: 360px; background: #fff; border-radius: 20px; box-shadow: 0 30px 60px rgba(13,27,62,0.22); z-index: 60; overflow: hidden; animation: c-fade 0.18s ease-out; display: flex; flex-direction: column; max-height: calc(100vh - 130px); }
        @keyframes c-fade { from { opacity: 0; } to { opacity: 1; } }
        @media (max-width: 480px) { .c-haki-panel { right: 10px; left: 10px; width: auto; max-width: none; bottom: 94px; } }
        .c-haki-head { background: linear-gradient(135deg, #0D1B3E 0%, #1A3380 100%); color: #fff; padding: 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .c-haki-head-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .c-haki-avatar-wrap { position: relative; flex-shrink: 0; }
        .c-haki-status { position: absolute; bottom: 0; right: 0; width: 12px; height: 12px; border-radius: 50%; background: #34D058; border: 2.5px solid #0D1B3E; }
        .c-haki-name { font-size: 16px; font-weight: 800; letter-spacing: -0.3px; }
        .c-haki-sub { font-size: 11px; color: rgba(255,255,255,0.7); margin-top: 3px; display: flex; align-items: center; gap: 5px; font-weight: 500; }
        .c-haki-dot { width: 6px; height: 6px; border-radius: 50%; background: #34D058; }
        .c-haki-close { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); width: 32px; height: 32px; border-radius: 50%; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; }
        .c-haki-chat { padding: 16px; overflow-y: auto; flex: 1; background: #F8FAFC; }
        .c-haki-msg-row { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 14px; }
        .c-haki-msg-avatar { flex-shrink: 0; width: 28px; height: 28px; border-radius: 50%; overflow: hidden; margin-top: 2px; }
        .c-haki-msg { background: #fff; border-radius: 14px 14px 14px 4px; padding: 12px 14px; box-shadow: 0 2px 8px rgba(13,27,62,0.05); flex: 1; }
        .c-haki-msg.success { background: linear-gradient(135deg, #DCFCE7 0%, #F0FDF4 100%); border: 1.5px solid #86EFAC; }
        .c-haki-msg-title { font-size: 11px; font-weight: 800; color: #1A6BFF; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
        .c-haki-msg.success .c-haki-msg-title { color: #166534; }
        .c-haki-msg-body { font-size: 14px; color: #0D1B3E; line-height: 1.5; font-weight: 500; }
        .c-haki-actions { display: flex; flex-direction: column; gap: 8px; margin-top: 6px; }
        .c-haki-btn { background: #fff; border: 1.5px solid #E5E7EB; border-radius: 12px; padding: 12px 14px; font-size: 13px; font-weight: 700; color: #0D1B3E; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .c-haki-btn:hover { background: #EEF4FF; border-color: #1A6BFF; color: #1A6BFF; }
        .c-haki-btn.primary { background: #1A6BFF; color: #fff; border-color: #1A6BFF; }
        .c-haki-btn.primary:hover { background: #1560E0; color: #fff; }
        .c-haki-settings { border-top: 1px solid #E5E7EB; background: #FAFBFD; padding: 12px 16px; }
        .c-haki-auto-row { display: flex; align-items: center; gap: 10px; }
        .c-haki-auto-info { flex: 1; }
        .c-haki-auto-label { font-size: 13px; font-weight: 700; color: #0D1B3E; }
        .c-haki-auto-state { font-size: 11px; color: #666; margin-top: 2px; font-weight: 600; }
        .c-haki-switch { position: relative; width: 44px; height: 24px; background: #D1D5DB; border: none; border-radius: 100px; cursor: pointer; padding: 0; transition: background 0.2s; }
        .c-haki-switch.on { background: #1A6BFF; }
        .c-haki-switch-knob { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; background: #fff; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: transform 0.2s; }
        .c-haki-switch.on .c-haki-switch-knob { transform: translateX(20px); }
        .c-haki-help-btn { width: 24px; height: 24px; border-radius: 50%; background: #EEF4FF; border: 1.5px solid #C7D7FF; color: #1A6BFF; font-weight: 800; font-size: 13px; cursor: pointer; padding: 0; }
        .c-haki-help-box { position: relative; margin-top: 10px; background: #fff; border: 1.5px solid #E5E7EB; border-radius: 10px; padding: 10px 32px 10px 12px; }
        .c-haki-help-close { position: absolute; top: 8px; right: 8px; width: 20px; height: 20px; border-radius: 50%; background: #F3F4F6; border: none; color: #666; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; }
        .c-haki-help-title { font-size: 11px; font-weight: 800; color: #1A6BFF; text-transform: uppercase; margin-bottom: 6px; }
        .c-haki-help-text { font-size: 12px; color: #444; line-height: 1.5; }

        /* ----- Gate (code entry) ----- */
        .c-gate-card { background: #fff; border-radius: 24px; padding: 36px 24px; box-shadow: 0 20px 50px rgba(13,27,62,0.1); max-width: 440px; margin: 40px auto 0; text-align: center; }
        .c-gate-icon { width: 72px; height: 72px; border-radius: 20px; background: #EEF4FF; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px; }
        .c-gate-h { font-size: 24px; font-weight: 800; margin: 0 0 10px; color: #0D1B3E; }
        .c-gate-sub { font-size: 14px; color: #666; margin: 0 0 24px; line-height: 1.5; }
        .c-gate-field { background: #F8FAFC; border: 1.5px solid #E5E7EB; border-radius: 14px; padding: 14px 18px; margin-bottom: 14px; text-align: left; }
        .c-gate-field label { display: block; font-size: 11px; font-weight: 700; color: #888; margin-bottom: 4px; }
        .c-gate-field input { width: 100%; border: none; padding: 0; font-family: 'SF Mono', 'Monaco', 'Consolas', monospace; font-weight: 800; letter-spacing: 0.08em; color: #111; background: transparent; outline: none; font-size: 18px !important; }
        .c-btn-main { width: 100%; background: #1A6BFF; color: #fff; font-size: 15px; font-weight: 700; padding: 15px 22px; border-radius: 100px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 8px 20px rgba(26,107,255,0.3); margin-top: 4px; }
        .c-btn-main:hover:not(:disabled) { background: #1560E0; }
        .c-btn-main:disabled { background: #C7D0DB; cursor: not-allowed; box-shadow: none; }
        .c-gate-err { background: #FEF2F2; border: 1.5px solid #FCA5A5; color: #B91C1C; font-size: 13px; font-weight: 600; padding: 12px 14px; border-radius: 12px; margin-top: 12px; text-align: left; }
        .c-gate-help { margin-top: 20px; font-size: 13px; color: #666; }
        .c-gate-help a { color: #1A6BFF; text-decoration: none; font-weight: 700; }

        /* ----- Portal : grand header unique mobile-first ----- */
        .c-portal-head { background: linear-gradient(135deg, #0D1B3E 0%, #1A3380 100%); color: #fff; border-radius: 24px; padding: 24px 20px; box-shadow: 0 20px 40px rgba(13,27,62,0.2); margin-bottom: 20px; position: relative; overflow: hidden; }
        .c-portal-head::before { content: ''; position: absolute; top: -80px; right: -80px; width: 260px; height: 260px; background: radial-gradient(circle, rgba(26,107,255,0.35), transparent 65%); pointer-events: none; }
        .c-head-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 16px; position: relative; z-index: 1; }
        .c-head-identity { min-width: 0; flex: 1; }
        .c-head-name { font-size: 24px; font-weight: 800; margin: 0 0 4px; letter-spacing: -0.5px; line-height: 1.15; word-break: break-word; }
        @media (min-width: 640px) { .c-head-name { font-size: 28px; } }
        .c-head-ref { font-size: 10px; color: rgba(255,255,255,0.55); font-family: monospace; word-break: break-all; }
        .c-head-score { background: linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05)); border: 1px solid rgba(255,255,255,0.2); border-radius: 16px; padding: 10px 14px; text-align: center; min-width: 70px; flex-shrink: 0; }
        .c-head-score-v { font-size: 24px; font-weight: 800; line-height: 1; }
        .c-head-score-l { font-size: 10px; color: rgba(255,255,255,0.6); margin-top: 2px; font-weight: 600; }
        .c-head-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; position: relative; z-index: 1; }
        .c-chip { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.12); border-radius: 100px; padding: 6px 12px; font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.95); }
        .c-chip-statut { font-weight: 800; }
        .c-head-actions { display: flex; gap: 8px; flex-wrap: wrap; position: relative; z-index: 1; }
        .c-btn-logout { flex: 1; min-width: 140px; background: #000; border: 1.5px solid #000; color: #fff; font-size: 13px; font-weight: 700; padding: 11px 14px; border-radius: 100px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .c-btn-logout:hover { background: #1a1a1a; }
        .c-btn-chat-head { flex: 1; min-width: 140px; background: #25D366; border: none; color: #fff; font-size: 13px; font-weight: 700; padding: 11px 14px; border-radius: 100px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .c-btn-chat-head:hover { background: #1EB354; }

        /* ----- Tabs ----- */
        .c-tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; background: #EEF2F7; padding: 5px; border-radius: 14px; margin-bottom: 16px; position: sticky; top: 10px; z-index: 10; }
        .c-tab { background: transparent; border: none; font-size: 13px; font-weight: 700; color: #666; padding: 10px; border-radius: 10px; cursor: pointer; position: relative; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .c-tab:hover { color: #111; }
        .c-tab.on { background: #fff; color: #1A6BFF; box-shadow: 0 2px 6px rgba(13,27,62,0.08); }
        .c-tab-badge { background: #FF3B30; color: #fff; font-size: 10px; font-weight: 800; padding: 1px 6px; border-radius: 100px; min-width: 16px; text-align: center; }

        /* ----- Cards ----- */
        .c-card { background: #fff; border-radius: 20px; padding: 20px 18px; box-shadow: 0 4px 14px rgba(13,27,62,0.05); margin-bottom: 14px; }
        .c-card-h { font-size: 11px; font-weight: 800; color: #1A6BFF; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 14px; }

        /* ----- Timeline ----- */
        .c-tl-step { display: flex; gap: 14px; padding: 8px 0; }
        .c-tl-dot { position: relative; width: 26px; display: flex; justify-content: center; flex-shrink: 0; }
        .c-tl-dot::before { content: ''; position: absolute; top: 26px; bottom: -8px; width: 2px; background: #E5E7EB; }
        .c-tl-step:last-child .c-tl-dot::before { display: none; }
        .c-tl-circle { width: 26px; height: 26px; border-radius: 50%; background: #E5E7EB; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: #fff; z-index: 1; }
        .c-tl-step.done .c-tl-circle { background: #34D058; }
        .c-tl-step.on .c-tl-circle { background: #1A6BFF; box-shadow: 0 0 0 4px rgba(26,107,255,0.15); }
        .c-tl-step.done .c-tl-dot::before { background: #34D058; }
        .c-tl-label { font-size: 14px; font-weight: 700; color: #111; padding-top: 3px; }
        .c-tl-step.pending .c-tl-label { color: #999; font-weight: 500; }

        /* ----- Infos grid ----- */
        .c-infos { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 12px; }
        @media (max-width: 420px) { .c-infos { grid-template-columns: 1fr; } }
        .c-info-k { font-size: 11px; color: #888; font-weight: 700; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.04em; }
        .c-info-v { font-size: 14px; font-weight: 600; color: #111; word-break: break-word; }
        .c-info-note { margin-top: 16px; padding: 14px; background: #EEF4FF; border-radius: 12px; font-size: 12px; color: #0D1B3E; line-height: 1.5; }

        /* ----- Pack formalisation ----- */
        .c-pack { background: linear-gradient(135deg, #FFF4E5, #FFFBF2); border: 1.5px solid #FFB020; border-radius: 18px; padding: 18px; }
        .c-pack-h { font-size: 14px; font-weight: 800; color: #B45309; margin-bottom: 6px; }
        .c-pack-p { font-size: 13px; color: #78350F; line-height: 1.5; margin-bottom: 12px; }
        .c-btn-pack { background: #B45309; color: #fff; font-size: 13px; font-weight: 700; padding: 11px 18px; border-radius: 100px; border: none; cursor: pointer; }

        /* ----- Contact expert ----- */
        .c-contact { background: linear-gradient(135deg, #E7F8EC, #D5F4DD); border: 1.5px solid #25D366; border-radius: 18px; padding: 18px; }
        .c-contact-h { font-size: 14px; font-weight: 800; color: #0C4A1E; display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .c-contact-sub { font-size: 12px; color: #166534; line-height: 1.5; margin-bottom: 12px; }
        .c-btn-wa { width: 100%; background: #25D366; color: #fff; border: none; padding: 13px 20px; border-radius: 100px; font-weight: 700; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; }

        /* ----- Chat ----- */
        .c-chat-wrap { display: flex; flex-direction: column; height: 60vh; min-height: 400px; max-height: 600px; }
        .c-chat-scroll { flex: 1; overflow-y: auto; padding: 4px 0; display: flex; flex-direction: column; gap: 10px; }
        .c-chat-empty { color: #999; text-align: center; padding: 60px 20px; font-size: 13px; line-height: 1.6; }
        .c-msg { max-width: 85%; padding: 11px 14px; border-radius: 18px; font-size: 14px; line-height: 1.4; word-break: break-word; }
        .c-msg.client { align-self: flex-end; background: #1A6BFF; color: #fff; border-bottom-right-radius: 6px; }
        .c-msg.admin { align-self: flex-start; background: #F0F3F8; color: #111; border-bottom-left-radius: 6px; }
        .c-msg-meta { font-size: 10px; margin-top: 3px; opacity: 0.65; }
        .c-msg.client .c-msg-meta { text-align: right; }
        .c-chat-input { display: flex; gap: 8px; padding: 10px 10px 10px 14px; border: 1.5px solid #E5E7EB; border-radius: 16px; background: #fff; margin-top: 12px; }
        .c-chat-input:focus-within { border-color: #1A6BFF; box-shadow: 0 4px 12px rgba(26,107,255,0.1); }
        .c-chat-input textarea { flex: 1; border: none; outline: none; resize: none; min-height: 24px; max-height: 100px; padding: 4px 0; }
        .c-chat-send { background: #1A6BFF; color: #fff; border: none; width: 42px; height: 42px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .c-chat-send:disabled { background: #C7D0DB; }
      `}</style>
    </>
  )

  /* ===== STAGE: LOADING ===== */
  if (stage === 'loading') {
    return (
      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#F8FAFC', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {commonStyle}
        <div style={{ color: '#666', fontSize: 14 }}>Chargement…</div>
      </div>
    )
  }

  /* ===== STAGE: NEEDS CODE ===== */
  if (stage === 'needsCode') {
    return (
      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#F8FAFC', color: '#111', minHeight: '100vh' }}>
        {commonStyle}
        <div className="c-wrap">
          <div className="c-gate-card">
            <div className="c-gate-icon">
              <svg width="36" height="36" viewBox="0 0 32 32" fill="none"><rect x="7" y="14" width="18" height="13" rx="2" stroke="#1A6BFF" strokeWidth="2.4"/><path d="M11 14v-4a5 5 0 0110 0v4" stroke="#1A6BFF" strokeWidth="2.4"/></svg>
            </div>
            <h1 className="c-gate-h">Accès à votre dossier</h1>
            <p className="c-gate-sub">Entrez le code d'accès reçu lors de votre inscription pour consulter votre dossier.</p>
            <div className="c-gate-field">
              <label>Code d'accès</label>
              <input placeholder="MYI-ABC1234" maxLength={11} value={codeInput} onChange={e => setCodeInput(formatCode(e.target.value))} onKeyDown={e => e.key === 'Enter' && codeInput.length === 11 && openWithCode(codeInput)}/>
            </div>
            <button className="c-btn-main" disabled={codeLoading || codeInput.length < 11} onClick={() => openWithCode(codeInput)}>
              {codeLoading ? 'Vérification…' : 'Déverrouiller'}
              {!codeLoading && <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M4 9h10M10 5l4 4-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </button>
            {codeError && <div className="c-gate-err">{codeError}</div>}
            <div className="c-gate-help">
              Code perdu ? <a href="https://wa.me/242060000000?text=Bonjour%20Mayinvest%2C%20j%27ai%20perdu%20mon%20code" target="_blank" rel="noopener">Contactez un expert</a>
            </div>
          </div>
        </div>
        <HakiAssistant msg={hakiMsg} open={hakiOpen} onToggle={() => setHakiOpen(o => !o)} autoMode={autoMode} onToggleAuto={toggleAuto}/>
      </div>
    )
  }

  /* ===== STAGE: PORTAL ===== */
  const isP = lead?.type === 'physique' || lead?.type === 'Personne physique'
  const nom = isP ? `${lead?.identite?.prenom || ''} ${lead?.identite?.nom || ''}`.trim() : (lead?.situation?.raison_sociale || lead?.identite?.raison_sociale || 'Mon dossier')
  const statutIdx = STEPS.indexOf(lead?.statut)
  const col = statutColor(lead?.statut)
  const packNeeded = !isP && lead?.situation?.rccm === 'Non'
  const tel = lead?.identite?.tel || ''
  const unreadMsgs = messages.filter(m => m.sender === 'admin' && !m.read_at).length

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#F8FAFC', color: '#111', minHeight: '100vh' }}>
      {commonStyle}

      <div className="c-wrap">
        {/* ----- HEADER UNIQUE (le navy card = seul header) ----- */}
        <div className="c-portal-head">
          <div className="c-head-top">
            <div className="c-head-identity">
              <h1 className="c-head-name">{nom || 'Mon dossier'}</h1>
              <div className="c-head-ref">Réf. {id}</div>
            </div>
            <div className="c-head-score">
              <div className="c-head-score-v">{lead?.score || 0}</div>
              <div className="c-head-score-l">/ 100</div>
            </div>
          </div>
          <div className="c-head-meta">
            <span className="c-chip c-chip-statut" style={{ background: col.bg, color: col.fg }}>● {lead?.statut}</span>
            <span className="c-chip">{isP ? 'Particulier' : 'PME'}{lead?.activite ? ' · ' + lead.activite : ''}</span>
            {lead?.ville && <span className="c-chip">📍 {lead.ville}</span>}
          </div>
          <div className="c-head-actions">
            <button className="c-btn-chat-head" onClick={() => setActiveTab('chat')}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H9l-5 4V5z" stroke="#fff" strokeWidth="2" strokeLinejoin="round"/></svg>
              Discuter avec mon conseiller
              {unreadMsgs > 0 && <span style={{ background: '#fff', color: '#25D366', fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 100, marginLeft: 4 }}>{unreadMsgs}</span>}
            </button>
            <button className="c-btn-logout" onClick={deconnecter}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 1h3v12H9M5 10l-3-3 3-3M2 7h8" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Déconnexion
            </button>
          </div>
        </div>

        {/* ----- Tabs ----- */}
        <div className="c-tabs">
          <button className={`c-tab ${activeTab === 'suivi' ? 'on' : ''}`} onClick={() => setActiveTab('suivi')}>Suivi</button>
          <button className={`c-tab ${activeTab === 'chat' ? 'on' : ''}`} onClick={() => setActiveTab('chat')}>
            Discussion{unreadMsgs > 0 && <span className="c-tab-badge">{unreadMsgs}</span>}
          </button>
          <button className={`c-tab ${activeTab === 'infos' ? 'on' : ''}`} onClick={() => setActiveTab('infos')}>Mes infos</button>
        </div>

        {/* ----- SUIVI ----- */}
        {activeTab === 'suivi' && <>
          <div className="c-card">
            <div className="c-card-h">Avancement de votre dossier</div>
            {STEPS.map((s, i) => {
              const cls = i < statutIdx ? 'done' : i === statutIdx ? 'on' : 'pending'
              return (
                <div key={s} className={`c-tl-step ${cls}`}>
                  <div className="c-tl-dot"><div className="c-tl-circle">{i < statutIdx ? '✓' : i + 1}</div></div>
                  <div className="c-tl-label">{s}</div>
                </div>
              )
            })}
          </div>

          {packNeeded && (
            <div className="c-card">
              <div className="c-pack">
                <div className="c-pack-h">📄 Pack Formalisation Mayinvest</div>
                <div className="c-pack-p">Votre société n'a pas encore de RCCM. Nous pouvons nous charger de la création : statuts, immatriculation, NIU et compte bancaire.</div>
                <button className="c-btn-pack" onClick={() => window.open('https://wa.me/242060000000?text=Pack%20Formalisation', '_blank')}>Je suis intéressé</button>
              </div>
            </div>
          )}

          <div className="c-card">
            <div className="c-card-h">Besoin d'aide ?</div>
            <div className="c-contact">
              <div className="c-contact-h">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#166534"><path d="M17.5 14.4l-2.4-1.2c-.3-.2-.7-.1-1 .2l-.7.8c-.2.2-.5.3-.8.1-.9-.4-1.8-1-2.6-1.7-.7-.8-1.3-1.7-1.7-2.6-.1-.3 0-.6.2-.8l.8-.7c.3-.2.4-.6.2-1L8.3 5c-.2-.4-.7-.5-1-.3L5.5 6c-.5.2-.8.7-.7 1.2.4 2.8 1.7 5.4 3.6 7.4 2 2 4.6 3.3 7.4 3.6.5.1 1-.2 1.2-.7l1.3-1.8c.2-.4.1-.9-.3-1.1l-.5-.2z"/></svg>
                Discuter avec un expert
              </div>
              <div className="c-contact-sub">Un conseiller Mayinvest vous répond directement sur WhatsApp sous 24h.</div>
              <button className="c-btn-wa" onClick={() => window.open(`https://wa.me/242060000000?text=Bonjour%20Mayinvest%2C%20mon%20dossier%20${lead?.access_code || id}`, '_blank')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M17.5 14.4l-2.4-1.2c-.3-.2-.7-.1-1 .2l-.7.8c-.2.2-.5.3-.8.1-.9-.4-1.8-1-2.6-1.7-.7-.8-1.3-1.7-1.7-2.6-.1-.3 0-.6.2-.8l.8-.7c.3-.2.4-.6.2-1L8.3 5c-.2-.4-.7-.5-1-.3L5.5 6c-.5.2-.8.7-.7 1.2.4 2.8 1.7 5.4 3.6 7.4 2 2 4.6 3.3 7.4 3.6.5.1 1-.2 1.2-.7l1.3-1.8c.2-.4.1-.9-.3-1.1l-.5-.2z"/></svg>
                Ouvrir WhatsApp
              </button>
            </div>
          </div>
        </>}

        {/* ----- CHAT ----- */}
        {activeTab === 'chat' && (
          <div className="c-card">
            <div className="c-card-h">Discussion avec votre conseiller</div>
            <div className="c-chat-wrap">
              <div className="c-chat-scroll">
                {messages.length === 0 && <div className="c-chat-empty">Aucun message pour le moment.<br/>Démarrez la conversation en écrivant ci-dessous.</div>}
                {messages.map(m => (
                  <div key={m.id} className={`c-msg ${m.sender === 'client' ? 'client' : 'admin'}`}>
                    <div>{m.content}</div>
                    <div className="c-msg-meta">{new Date(m.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                ))}
                <div ref={chatEnd}/>
              </div>
              <div className="c-chat-input">
                <textarea placeholder="Votre message…" value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyer() } }} rows={1}/>
                <button className="c-chat-send" onClick={envoyer} disabled={!newMsg.trim() || sending} aria-label="Envoyer">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 11l17-7-7 17-3-7-7-3z" stroke="#fff" strokeWidth="2" strokeLinejoin="round"/></svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ----- INFOS ----- */}
        {activeTab === 'infos' && (
          <div className="c-card">
            <div className="c-card-h">Récap de votre demande</div>
            <div className="c-infos">
              <div><div className="c-info-k">Type</div><div className="c-info-v">{isP ? 'Particulier' : 'PME'}</div></div>
              <div><div className="c-info-k">Activité</div><div className="c-info-v">{lead?.activite || '—'}</div></div>
              <div><div className="c-info-k">Montant demandé</div><div className="c-info-v">{formatXAF(lead?.montant_demande)}</div></div>
              <div><div className="c-info-k">Objet</div><div className="c-info-v">{lead?.besoin?.objet || '—'}</div></div>
              <div><div className="c-info-k">Banque</div><div className="c-info-v">{lead?.banque_actuelle || '—'}</div></div>
              <div><div className="c-info-k">Ville</div><div className="c-info-v">{lead?.ville || '—'}</div></div>
              {isP ? <>
                <div><div className="c-info-k">Employeur</div><div className="c-info-v">{lead?.situation?.employeur || '—'}</div></div>
                <div><div className="c-info-k">Revenu mensuel</div><div className="c-info-v">{formatXAF(lead?.situation?.revenu)}</div></div>
                <div><div className="c-info-k">Salaire domicilié</div><div className="c-info-v">{lead?.eligibilite?.salaire_domic || '—'}</div></div>
              </> : <>
                <div><div className="c-info-k">Dirigeant</div><div className="c-info-v">{lead?.situation?.dirigeant || '—'}</div></div>
                <div><div className="c-info-k">RCCM</div><div className="c-info-v">{lead?.situation?.rccm || '—'}</div></div>
                <div><div className="c-info-k">CA annuel</div><div className="c-info-v">{formatXAF(lead?.situation?.ca_annuel)}</div></div>
                <div><div className="c-info-k">Flux mensuel</div><div className="c-info-v">{formatXAF(lead?.besoin?.flux_mois)}</div></div>
              </>}
            </div>
            <div className="c-info-note">💡 Besoin de modifier une info ? Envoyez un message à votre conseiller dans l'onglet Discussion.</div>
          </div>
        )}
      </div>

      <HakiAssistant msg={hakiMsg} open={hakiOpen} onToggle={() => setHakiOpen(o => !o)} autoMode={autoMode} onToggleAuto={toggleAuto}/>
    </div>
  )
}
