import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Logo } from '@/components/Logo'

export const Route = createFileRoute('/mon-dossier')({
  component: MonDossier,
})

/* Avatar Haki — version haute résolution identique à /preselection */
function hakiAvatar(size: number) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" shapeRendering="geometricPrecision">
      <defs>
        <radialGradient id="md-eyeball" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffffff"/>
          <stop offset="55%" stopColor="#f5f5f5"/>
          <stop offset="85%" stopColor="#d8d8d8"/>
          <stop offset="100%" stopColor="#a8a8a8"/>
        </radialGradient>
        <radialGradient id="md-iris" cx="40%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#c88a4a"/>
          <stop offset="35%" stopColor="#8b5a2b"/>
          <stop offset="75%" stopColor="#4a2d14"/>
          <stop offset="100%" stopColor="#1a0d04"/>
        </radialGradient>
        <radialGradient id="md-innershadow" cx="50%" cy="50%" r="50%">
          <stop offset="75%" stopColor="rgba(0,0,0,0)"/>
          <stop offset="100%" stopColor="rgba(0,0,0,0.35)"/>
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="95" fill="url(#md-eyeball)"/>
      <circle cx="100" cy="100" r="95" fill="url(#md-innershadow)"/>
      <circle cx="100" cy="100" r="95" fill="none" stroke="#000" strokeWidth="4"/>
      <path d="M15 120 Q 40 115, 55 125" stroke="#f0a0a0" strokeWidth="1.2" fill="none" opacity="0.5"/>
      <path d="M185 90 Q 165 100, 150 90" stroke="#f0a0a0" strokeWidth="1.2" fill="none" opacity="0.5"/>
      <g className="md-eye-ball">
        <circle cx="100" cy="100" r="55" fill="url(#md-iris)"/>
        <circle cx="100" cy="100" r="55" fill="none" stroke="#1a0d04" strokeWidth="2.5" opacity="0.6"/>
        <circle cx="100" cy="100" r="40" fill="none" stroke="#2a1a0a" strokeWidth="1.5" opacity="0.4"/>
        <circle cx="100" cy="100" r="22" fill="#000"/>
        <ellipse cx="112" cy="85" rx="10" ry="8" fill="#fff" opacity="0.95"/>
        <circle cx="90" cy="110" r="4.5" fill="#fff" opacity="0.75"/>
        <circle cx="120" cy="112" r="2.5" fill="#fff" opacity="0.6"/>
      </g>
      <ellipse cx="60" cy="45" rx="30" ry="18" fill="#fff" opacity="0.35"/>
    </svg>
  )
}

/* Icon helpers */
function IconPhone() {
  return <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><rect x="5" y="2" width="10" height="16" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M9 15h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
}
function IconMail() {
  return <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M2.5 5l7.5 6 7.5-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
function IconEyeOn() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
}
function IconEyeOff() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
}
function IconArrowLeft() {
  return <svg width="14" height="14" viewBox="0 0 18 18" fill="none"><path d="M14 9H4M8 5L4 9l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
function IconArrowRight() {
  return <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M4 9h10M10 5l4 4-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
function IconAlert() {
  return <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.6"/><path d="M10 6v5M10 14h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
}
function IconWA() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
}

function MonDossier() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'phone' | 'email'>('phone')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [hakiOpen, setHakiOpen] = useState(false)

  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotMsg, setForgotMsg] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [iconIdx, setIconIdx] = useState(0)
  const [activeField, setActiveField] = useState<'none' | 'identifier' | 'password'>('none')
  const [autoMode, setAutoMode] = useState<boolean>(() => {
    try { return localStorage.getItem('mayinvest_haki_auto_global') !== '0' } catch { return true }
  })
  const [hakiDeclined, setHakiDeclined] = useState<boolean>(() => {
    try { return localStorage.getItem('mayinvest_haki_declined_login') === '1' } catch { return false }
  })
  const [showAutoHelp, setShowAutoHelp] = useState(false)

  // Démo interactive de Haki : étapes = 'idle' | 'mockup' | 'typing' | 'done'
  const [demoStage, setDemoStage] = useState<'idle' | 'mockup' | 'typing' | 'done'>('idle')
  const [demoId, setDemoId] = useState('')
  const [demoPwd, setDemoPwd] = useState('')
  const [demoChannel, setDemoChannel] = useState<'phone' | 'email'>('phone')

  // Refs pour cibler les vrais champs quand on clique "À votre tour"
  const phoneRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  // Simulation animée : tape caractère par caractère
  async function runDemo(channel: 'phone' | 'email') {
    setDemoChannel(channel)
    setDemoStage('mockup')
    setDemoId('')
    setDemoPwd('')
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

    await sleep(900)
    setDemoStage('typing')

    const idExample = channel === 'phone' ? '065313187' : 'jean.pierre@gmail.com'
    for (let i = 1; i <= idExample.length; i++) {
      setDemoId(idExample.slice(0, i))
      await sleep(channel === 'phone' ? 80 : 50)
    }

    await sleep(500)
    const pwdExample = 'Mayinvest2026'
    for (let i = 1; i <= pwdExample.length; i++) {
      setDemoPwd(pwdExample.slice(0, i))
      await sleep(70)
    }

    await sleep(600)
    setDemoStage('done')
  }

  // Transfert vers le vrai formulaire + focus
  function jumpToRealForm() {
    setTab(demoChannel)
    setDemoStage('idle')
    setDemoId(''); setDemoPwd('')
    // laisser le temps au tab de switch
    setTimeout(() => {
      if (demoChannel === 'phone') phoneRef.current?.focus()
      else emailRef.current?.focus()
      // scroll la carte au centre
      document.querySelector('.md-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }

  // Carrousel d'icônes : tourne toutes les 2s tant que l'utilisateur n'a rien rempli
  useEffect(() => {
    const t = setInterval(() => setIconIdx(i => (i + 1) % 4), 2000)
    return () => clearInterval(t)
  }, [])

  // Haki s'ouvre automatiquement si mode auto activé et pas décliné
  useEffect(() => {
    if (autoMode && !hakiDeclined) {
      const t = setTimeout(() => setHakiOpen(true), 600)
      return () => clearTimeout(t)
    }
  }, []) // eslint-disable-line

  // En mode auto : Haki s'ouvre quand on clique sur un champ ou en cas d'erreur
  useEffect(() => {
    if (autoMode && !hakiDeclined && activeField !== 'none') setHakiOpen(true)
  }, [activeField, autoMode, hakiDeclined])

  useEffect(() => {
    if (error && autoMode && !hakiDeclined) setHakiOpen(true)
  }, [error, autoMode, hakiDeclined])

  function toggleAutoMode() {
    const next = !autoMode
    setAutoMode(next)
    try { localStorage.setItem('mayinvest_haki_auto_global', next ? '1' : '0') } catch {}
  }

  function declineHaki() {
    setHakiDeclined(true)
    setHakiOpen(false)
    try { localStorage.setItem('mayinvest_haki_declined_login', '1') } catch {}
  }

  // Clic manuel sur l'œil : si l'utilisateur veut Haki, on réactive l'auto-ouverture aussi
  function toggleHakiManually() {
    if (!hakiOpen && hakiDeclined) {
      // Il a changé d'avis, on réactive Haki
      setHakiDeclined(false)
      try { localStorage.setItem('mayinvest_haki_declined_login', '0') } catch {}
    }
    setHakiOpen(!hakiOpen)
  }

  function openExpertWA() {
    const msg = encodeURIComponent("Bonjour, j'aimerais parler à un conseiller Mayinvest.")
    window.open('https://wa.me/24265313187?text=' + msg, '_blank')
  }

  async function tryLogin() {
    setError('')
    setLoading(true)
    try {
      if (tab === 'phone') {
        if (phone.length !== 9) {
          setError('Téléphone invalide (9 chiffres)')
          setLoading(false)
          return
        }
        const { data } = await supabase.rpc('verify_lead_password_by_phone', { p_phone: phone, p_password: password })
        const row: any = Array.isArray(data) && data[0] ? data[0] : null
        if (!row) {
          setError('Téléphone ou mot de passe incorrect')
          setLoading(false)
          return
        }
        navigate({ to: '/client/$id', params: { id: row.id } })
      } else {
        if (!email.includes('@')) {
          setError('Email invalide')
          setLoading(false)
          return
        }
        const { data: leadRows } = await supabase
          .from('leads').select('id, identite').ilike('identite->>email', email.trim()).limit(5)
        const match = (leadRows || []).find((l: any) => (l.identite?.email || '').toLowerCase().trim() === email.toLowerCase().trim())
        if (!match) {
          setError('Aucun dossier avec cet email')
          setLoading(false)
          return
        }
        const { data: lead } = await supabase.rpc('get_lead_by_password', { p_id: match.id, p_password: password })
        const row: any = Array.isArray(lead) && lead[0] ? lead[0] : null
        if (!row) {
          setError('Email ou mot de passe incorrect')
          setLoading(false)
          return
        }
        navigate({ to: '/client/$id', params: { id: row.id } })
      }
    } catch (e) {
      setError('Erreur de connexion')
      setLoading(false)
    }
  }

  async function sendResetEmail() {
    setForgotMsg('')
    setForgotLoading(true)
    try {
      const { data } = await supabase.rpc('request_password_reset', { p_email: forgotEmail })
      const row: any = Array.isArray(data) ? data[0] : data
      if (!row?.success) {
        setForgotMsg('Erreur: ' + (row?.message || 'Aucun dossier avec cet email'))
        setForgotLoading(false)
        return
      }
      const link = window.location.origin + '/reset-password?token=' + row.token
      const supaUrl = (supabase as any).supabaseUrl || ''
      const supaKey = (supabase as any).supabaseKey || ''
      const resp = await fetch(supaUrl + '/functions/v1/send-reset-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': supaKey, 'Authorization': 'Bearer ' + supaKey },
        body: JSON.stringify({ email: forgotEmail, link }),
      })
      if (!resp.ok) {
        setForgotMsg('Erreur envoi email. Contactez le support WhatsApp.')
      } else {
        setForgotMsg('OK Email envoyé ! Vérifiez votre boîte (et spams). Lien valable 1h.')
      }
    } catch {
      setForgotMsg('Erreur. Contactez le support WhatsApp.')
    }
    setForgotLoading(false)
  }

  const identifierOk = tab === 'phone' ? phone.length === 9 : email.includes('@')
  const canSubmit = !loading && password.length > 0 && identifierOk

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#F8FAFC', color: '#111', minHeight: '100vh' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        input { font-size: 16px !important; font-family: inherit; }
        .md-head { background: #fff; border-bottom: 1px solid #E5E7EB; padding: 14px 24px; display: flex; justify-content: space-between; align-items: center; }
        .md-logo { display: flex; align-items: center; }
        .md-back { background: #0D1B3E; color: #fff; border: none; padding: 10px 18px; border-radius: 100px; font-weight: 700; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-family: inherit; transition: all 0.15s; }
        .md-back:hover { background: #000; }
        .md-wrap { max-width: 440px; margin: 48px auto; padding: 0 20px; }
        .md-card { background: #fff; border-radius: 24px; padding: 36px 28px; box-shadow: 0 20px 50px rgba(13,27,62,0.08); border: 1px solid #F0F2F5; }
        .md-title { text-align: center; margin-bottom: 28px; }
        .md-title-icon { width: 56px; height: 56px; border-radius: 16px; background: #0D1B3E; display: inline-flex; align-items: center; justify-content: center; margin: 0 auto 16px; box-shadow: 0 10px 24px rgba(13,27,62,0.2); transition: background 0.5s ease, box-shadow 0.5s ease, transform 0.5s ease; overflow: hidden; }
        .md-title-icon.half { background: linear-gradient(135deg, #1A6BFF 0%, #0051D4 100%); box-shadow: 0 10px 24px rgba(26,107,255,0.3); }
        .md-title-icon.folder { background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); box-shadow: 0 10px 24px rgba(245,158,11,0.35); }
        .md-title-icon.ok { background: #16A34A; box-shadow: 0 10px 24px rgba(22,163,74,0.35); transform: scale(1.08); }
        .md-title-icon-inner { display: flex; align-items: center; justify-content: center; animation: md-icon-pop 0.5s cubic-bezier(0.34,1.56,0.64,1); }
        @keyframes md-icon-pop {
          0%   { transform: translateY(14px) scale(0.6); opacity: 0; }
          60%  { transform: translateY(-2px) scale(1.1); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        .md-title h1 { font-size: 24px; font-weight: 800; color: #0D1B3E; margin: 0 0 8px; letter-spacing: -0.02em; }
        .md-title p { font-size: 13px; color: #666; margin: 0; }
        .md-tabs { display: flex; gap: 6px; background: #F0F2F5; border-radius: 12px; padding: 4px; margin-bottom: 14px; }
        .md-tab { flex: 1; background: transparent; border: none; padding: 10px; border-radius: 9px; font-weight: 700; font-size: 13px; color: #666; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px; font-family: inherit; }
        .md-tab.on { background: #fff; color: #1A6BFF; box-shadow: 0 2px 6px rgba(13,27,62,0.08); }
        .md-field { background: #F8FAFC; border: 1.5px solid #E5E7EB; border-radius: 14px; padding: 12px 16px; margin-bottom: 10px; position: relative; }
        .md-field:focus-within { border-color: #1A6BFF; background: #fff; }
        .md-field.has-eye { padding-right: 48px; }
        .md-eye { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: transparent; border: none; cursor: pointer; padding: 8px; color: #888; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
        .md-eye:hover { background: #EEF4FF; color: #1A6BFF; }
        .md-field label { display: block; font-size: 10px; font-weight: 700; color: #888; margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.05em; }
        .md-field input { width: 100%; border: none; background: transparent; outline: none; font-weight: 600; padding: 0; color: #111; }
        .md-btn { width: 100%; background: linear-gradient(135deg, #1A6BFF 0%, #0051D4 100%); color: #fff; border: none; padding: 14px; border-radius: 100px; font-weight: 800; font-size: 14px; cursor: pointer; margin-top: 12px; box-shadow: 0 10px 25px rgba(26,107,255,0.3); display: flex; align-items: center; justify-content: center; gap: 8px; }
        .md-btn:disabled { background: #C7D0DB; cursor: not-allowed; box-shadow: none; }
        .md-err { background: #FEF2F2; border: 1px solid #FCA5A5; color: #B91C1C; padding: 10px 14px; border-radius: 10px; font-size: 12px; font-weight: 600; margin-top: 10px; display: flex; align-items: center; gap: 7px; }
        .md-forgot { text-align: center; margin-top: 16px; font-size: 13px; color: #666; }
        .md-forgot a { color: #1A6BFF; font-weight: 700; cursor: pointer; }
        .md-modal { position: fixed; inset: 0; background: rgba(13,27,62,0.6); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 100; }
        .md-modal-card { background: #fff; border-radius: 20px; padding: 24px; max-width: 400px; width: 100%; }
        .md-modal-close { background: #F0F2F5; border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; color: #64748B; padding: 0; }
        .md-modal-close:hover { background: #E5E7EB; color: #0D1B3E; }
        .md-whats { background: #25D366; color: #fff; border: none; padding: 12px; border-radius: 100px; font-weight: 700; font-size: 13px; cursor: pointer; width: 100%; margin-top: 14px; display: flex; align-items: center; justify-content: center; gap: 8px; font-family: inherit; }
        .md-msg-head { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px solid #F0F2F5; }
        .md-msg-ava { width: 44px; height: 44px; border-radius: 50%; overflow: hidden; background: transparent; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .md-msg-ava svg { width: 44px; height: 44px; display: block; }
        .md-msg-name { font-size: 14px; font-weight: 800; color: #0D1B3E; }
        .md-msg-sub { font-size: 11px; color: #666; display: flex; align-items: center; gap: 5px; margin-top: 2px; }
        .md-msg-sub::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #34D058; }
        .md-info { background: linear-gradient(135deg, #EEF4FF 0%, #DBE8FF 100%); border: 1.5px solid rgba(26,107,255,0.2); border-radius: 14px; padding: 12px 14px; font-size: 12.5px; color: #0D1B3E; line-height: 1.5; margin-bottom: 14px; }

        .hk-fab { position: fixed; bottom: 24px; right: 24px; z-index: 1000; width: 64px; height: 64px; border-radius: 50%; background: #fff; border: 3px solid #fff; box-shadow: 0 14px 32px rgba(13,27,62,0.25), 0 4px 10px rgba(13,27,62,0.08); cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; }
        .hk-fab:hover { transform: scale(1.08); }
        .hk-fab::after { content: ''; position: absolute; top: 2px; right: 2px; width: 14px; height: 14px; background: #34D058; border: 2.5px solid #fff; border-radius: 50%; animation: hk-pulse 2.2s infinite; }
        @keyframes hk-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(52,208,88,0.5); } 50% { box-shadow: 0 0 0 6px rgba(52,208,88,0); } }
        .hk-panel { position: fixed; bottom: 96px; right: 24px; z-index: 1000; background: #fff; border-radius: 20px; box-shadow: 0 24px 60px rgba(13,27,62,0.25); width: 360px; max-width: calc(100vw - 32px); max-height: calc(100vh - 120px); display: flex; flex-direction: column; overflow: hidden; }
        .hk-head { padding: 16px 52px 16px 16px; display: flex; align-items: center; gap: 12px; background: linear-gradient(135deg, #0D1B3E 0%, #1A2F5F 100%); color: #fff; position: relative; }
        .hk-ava-wrap { position: relative; flex-shrink: 0; }
        .hk-ava { width: 44px; height: 44px; border-radius: 50%; overflow: hidden; background: transparent; display: flex; align-items: center; justify-content: center; }
        .hk-ava svg { width: 44px; height: 44px; display: block; }
        .hk-status { position: absolute; bottom: -1px; right: -1px; width: 12px; height: 12px; border-radius: 50%; background: #34D058; border: 2px solid #0D1B3E; box-shadow: 0 0 8px rgba(52,208,88,0.6); }
        .hk-name { font-weight: 800; font-size: 15px; line-height: 1.2; }
        .hk-sub { font-size: 11px; color: rgba(255,255,255,0.7); display: flex; align-items: center; gap: 5px; margin-top: 3px; font-weight: 500; }
        .hk-sub::before { content: ''; width: 6px; height: 6px; background: #34D058; border-radius: 50%; flex-shrink: 0; }
        .hk-close { position: absolute; top: 14px; right: 14px; width: 30px; height: 30px; border-radius: 50%; background: rgba(255,255,255,0.12); border: none; color: #fff; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 0; line-height: 1; }
        .hk-close:hover { background: rgba(255,255,255,0.22); }
        .hk-close svg { display: block; margin: 0 auto; }

        .hk-head { flex-shrink: 0; }
        .hk-body { padding: 16px; overflow-y: auto; flex: 1 1 auto; min-height: 0; }
        .hk-settings { flex-shrink: 0; }
        .hk-row { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 14px; }
        .hk-mini-ava { width: 32px; height: 32px; border-radius: 50%; overflow: hidden; background: transparent; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .hk-mini-ava svg { width: 32px; height: 32px; display: block; }
        .hk-bubble { flex: 1; background: #F0F5FF; border: 1px solid rgba(26,107,255,0.15); border-radius: 14px; border-top-left-radius: 4px; padding: 12px 14px; font-size: 13px; color: #0D1B3E; line-height: 1.5; }
        .hk-bubble strong { color: #1A6BFF; font-weight: 700; }
        .hk-step { font-size: 10px; font-weight: 800; letter-spacing: 0.12em; color: #1A6BFF; margin-bottom: 6px; }

        .hk-actions { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }
        .hk-btn { padding: 11px 14px; border-radius: 10px; font-weight: 700; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-family: inherit; width: 100%; transition: all 0.15s; border: 1.5px solid transparent; }
        .hk-btn.primary { background: #1A6BFF; color: #fff; box-shadow: 0 4px 12px rgba(26,107,255,0.3); }
        .hk-btn.primary:hover { background: #0051D4; transform: translateY(-1px); }
        .hk-btn.outline { background: #fff; color: #0D1B3E; border-color: #E5E7EB; }
        .hk-btn.outline:hover { border-color: #1A6BFF; color: #1A6BFF; background: #F0F5FF; }
        .hk-ex { font-size: 11px; color: #64748B; text-align: center; margin-top: 4px; font-style: italic; }

        /* MAQUETTE DÉMO interactive */
        .hk-demo { display: flex; flex-direction: column; gap: 10px; animation: hk-demo-in 0.3s ease; }
        @keyframes hk-demo-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .hk-demo-head { font-size: 11.5px; font-weight: 800; color: #1A6BFF; text-align: center; letter-spacing: 0.04em; padding: 6px 0; }
        .hk-demo-card { background: linear-gradient(180deg, #F8FAFC 0%, #EEF4FF 100%); border: 2px dashed #1A6BFF; border-radius: 14px; padding: 14px; display: flex; flex-direction: column; gap: 10px; position: relative; }
        .hk-demo-field { background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; padding: 10px 12px; }
        .hk-demo-label { font-size: 9px; font-weight: 800; color: #94A3B8; letter-spacing: 0.08em; margin-bottom: 4px; }
        .hk-demo-value { font-size: 15px; font-weight: 700; color: #0D1B3E; min-height: 20px; font-family: 'JetBrains Mono', monospace, inherit; }
        .hk-demo-placeholder { color: #CBD5E1; font-weight: 500; font-family: inherit; }
        .hk-caret { display: inline-block; width: 2px; height: 16px; background: #1A6BFF; margin-left: 2px; vertical-align: middle; animation: hk-blink 0.6s step-end infinite; }
        @keyframes hk-blink { 50% { opacity: 0; } }
        .hk-demo-badge { background: #DCFCE7; color: #166534; border-radius: 100px; padding: 6px 12px; font-size: 11px; font-weight: 800; text-align: center; margin-top: 2px; }

        .hk-sep { text-align: center; font-size: 10px; font-weight: 700; color: #94A3B8; letter-spacing: 0.12em; margin: 14px 0 10px; position: relative; }
        .hk-sep::before, .hk-sep::after { content: ''; position: absolute; top: 50%; width: 20%; height: 1px; background: #E5E7EB; }
        .hk-sep::before { left: 0; }
        .hk-sep::after { right: 0; }
        .hk-btn-wa { background: #25D366; color: #fff; border: none; padding: 11px 14px; border-radius: 10px; font-weight: 700; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-family: inherit; width: 100%; justify-content: center; transition: all 0.15s; }
        .hk-btn-wa:hover { background: #1EB558; transform: translateY(-1px); }

        .hk-decline { background: transparent; border: none; color: #94A3B8; font-size: 11px; cursor: pointer; margin-top: 10px; width: 100%; text-align: center; font-family: inherit; text-decoration: underline; }
        .hk-decline:hover { color: #64748B; }

        /* Mode automatique */
        .hk-settings { padding: 12px 16px 14px; border-top: 1px solid #F0F2F5; background: #FAFBFD; }
        .hk-auto-row { display: flex; align-items: center; gap: 10px; }
        .hk-auto-label { font-size: 12px; font-weight: 700; color: #0D1B3E; }
        .hk-auto-state { font-size: 10px; color: #64748B; font-weight: 600; margin-top: 1px; }
        .hk-switch { width: 36px; height: 20px; border-radius: 100px; background: #D1D5DB; border: none; position: relative; cursor: pointer; transition: all 0.2s; flex-shrink: 0; margin-left: auto; padding: 0; }
        .hk-switch.on { background: #1A6BFF; }
        .hk-switch-knob { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.15); transition: all 0.2s; }
        .hk-switch.on .hk-switch-knob { left: 18px; }
        .hk-help-btn { width: 20px; height: 20px; border-radius: 50%; background: #E5E7EB; color: #64748B; border: none; font-size: 11px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; font-family: inherit; }
        .hk-help-btn:hover { background: #CBD5E1; color: #0D1B3E; }
        .hk-help-box { position: relative; margin-top: 10px; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; padding: 12px 28px 12px 12px; font-size: 11.5px; color: #334155; line-height: 1.5; }
        .hk-help-title { font-weight: 800; color: #0D1B3E; margin-bottom: 4px; font-size: 12px; }
        .hk-help-text strong { color: #1A6BFF; }
        .hk-help-close { position: absolute; top: 6px; right: 6px; background: transparent; border: none; cursor: pointer; color: #94A3B8; padding: 4px; }
        .hk-help-close:hover { color: #0D1B3E; }

        /* Animation du regard Haki : 6 directions, 12s, fluide, sans clignement */
        .md-eye-ball { transform-origin: 100px 100px; animation: md-eye-look 12s ease-in-out infinite; }
        @keyframes md-eye-look {
          0%, 10%    { transform: translate(0, 0); }
          16%, 26%   { transform: translate(20px, 0); }
          32%, 42%   { transform: translate(15px, 15px); }
          48%, 58%   { transform: translate(-15px, 15px); }
          64%, 74%   { transform: translate(-20px, 0); }
          80%, 90%   { transform: translate(0, -15px); }
          100%       { transform: translate(0, 0); }
        }

        @media (max-width: 640px) {
          .md-wrap { margin: 24px auto; }
          .md-head { padding: 12px 16px; }
          .hk-fab { bottom: 16px; right: 16px; }
          .hk-panel { bottom: 86px; right: 16px; }
        }
      `}</style>

      <div className="md-head">
        <div className="md-logo"><Logo height={44} tone="light" /></div>
        <button className="md-back" onClick={() => navigate({ to: '/' })}>
          <IconArrowLeft />
          Accueil
        </button>
      </div>

      <div className="md-wrap">
        <div className="md-card">
          <div className="md-title">
            {(() => {
              // Si l'utilisateur a rempli quelque chose → l'icône suit son progrès
              // Sinon → carrousel automatique qui cycle entre les 4 icônes
              const idx = canSubmit ? 3 : password ? 2 : identifierOk ? 1 : iconIdx
              const states = ['', 'half', 'folder', 'ok']
              const icons = [
                /* 0. Cadenas fermé */
                <svg key="0" width="26" height="26" viewBox="0 0 24 24" fill="none"><rect x="4" y="11" width="16" height="10" rx="2" stroke="#fff" strokeWidth="2"/><path d="M8 11V7a4 4 0 018 0v4" stroke="#fff" strokeWidth="2"/><circle cx="12" cy="16" r="1.5" fill="#fff"/></svg>,
                /* 1. Cadenas ouvert */
                <svg key="1" width="26" height="26" viewBox="0 0 24 24" fill="none"><rect x="4" y="11" width="16" height="10" rx="2" stroke="#fff" strokeWidth="2"/><path d="M8 11V7a4 4 0 017.5-2" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="16" r="1.5" fill="#fff"/></svg>,
                /* 2. Dossier */
                <svg key="2" width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" stroke="#fff" strokeWidth="2" strokeLinejoin="round"/></svg>,
                /* 3. Dossier avec coche */
                <svg key="3" width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" stroke="#fff" strokeWidth="2" strokeLinejoin="round"/><path d="M9 14l2 2 4-4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
              ]
              return (
                <div className={'md-title-icon ' + states[idx]}>
                  <div key={idx} className="md-title-icon-inner">
                    {icons[idx]}
                  </div>
                </div>
              )
            })()}
            <h1>Accédez à votre dossier</h1>
            <p>Identifiez-vous avec votre téléphone ou email + mot de passe.</p>
          </div>

          <div className="md-tabs">
            <button className={'md-tab ' + (tab === 'phone' ? 'on' : '')} onClick={() => { setTab('phone'); setError('') }}>
              <IconPhone />
              Téléphone
            </button>
            <button className={'md-tab ' + (tab === 'email' ? 'on' : '')} onClick={() => { setTab('email'); setError('') }}>
              <IconMail />
              Email
            </button>
          </div>

          {tab === 'phone' ? (
            <div className="md-field">
              <label>Téléphone (9 chiffres)</label>
              <input
                ref={phoneRef}
                type="tel"
                inputMode="numeric"
                placeholder="Ex : 06 53 13 187"
                maxLength={11}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                onFocus={() => setActiveField('identifier')}
                onBlur={() => setActiveField('none')}
              />
            </div>
          ) : (
            <div className="md-field">
              <label>Email</label>
              <input
                ref={emailRef}
                type="email"
                placeholder="Ex : jean.pierre@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setActiveField('identifier')}
                onBlur={() => setActiveField('none')}
              />
            </div>
          )}

          <div className="md-field has-eye">
            <label>Mot de passe</label>
            <input
              ref={passwordRef}
              type={showPwd ? 'text' : 'password'}
              placeholder="Ex : Mayinvest2026"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && canSubmit) tryLogin() }}
              onFocus={() => setActiveField('password')}
              onBlur={() => setActiveField('none')}
              autoComplete="current-password"
            />
            <button type="button" className="md-eye" onClick={() => setShowPwd(!showPwd)} aria-label={showPwd ? 'Masquer' : 'Afficher'}>
              {showPwd ? <IconEyeOff /> : <IconEyeOn />}
            </button>
          </div>

          <button className="md-btn" disabled={!canSubmit} onClick={tryLogin}>
            {loading ? 'Connexion…' : (<>Accéder à mon dossier <IconArrowRight /></>)}
          </button>

          {error && (
            <div className="md-err">
              <IconAlert />
              <span>{error}</span>
            </div>
          )}

          <div className="md-forgot">
            Mot de passe oublié ? <a onClick={() => setShowForgot(true)}>Réinitialiser par email</a>
          </div>
        </div>
      </div>

      {/* HAKI FLOATING WIDGET — assistant interactif contextuel */}
      {hakiOpen && (() => {
        // Priorité : erreur > champ actif > progression du formulaire
        const step = error ? 'error'
          : activeField === 'password' ? 'pwd-focus'
          : activeField === 'identifier' ? 'id-focus'
          : !identifierOk ? 'start'
          : !password ? 'pwd'
          : 'ready'
        const stepLabel = step === 'start' ? 'ÉTAPE 1 SUR 3 · IDENTIFICATION'
          : step === 'id-focus' ? '💡 ASTUCE · IDENTIFIANT'
          : step === 'pwd-focus' ? '💡 ASTUCE · MOT DE PASSE'
          : step === 'pwd' ? 'ÉTAPE 2 SUR 3 · SÉCURITÉ'
          : step === 'ready' ? 'ÉTAPE 3 SUR 3 · CONNEXION'
          : 'OUPS, UNE ERREUR'
        return (
          <div className="hk-panel">
            <div className="hk-head">
              <div className="hk-ava-wrap">
                <div className="hk-ava">{hakiAvatar(36)}</div>
                <span className="hk-status"/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="hk-name">Haki</div>
                <div className="hk-sub">En ligne · Assistante Mayinvest</div>
              </div>
              <button className="hk-close" onClick={() => setHakiOpen(false)} aria-label="Fermer">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="hk-body">
              {/* Mini avatar + bulle contextuelle */}
              <div className="hk-row">
                <div className="hk-mini-ava">{hakiAvatar(28)}</div>
                <div className="hk-bubble">
                  <div className="hk-step">{stepLabel}</div>
                  {step === 'start' && <>
                    <div><strong>Bienvenue sur Mayinvest ! 👋</strong></div>
                    <div style={{ marginTop: 6 }}>Comment préférez-vous vous connecter ?</div>
                  </>}
                  {step === 'id-focus' && <>
                    <div><strong>Je vous accompagne 👀</strong></div>
                    <div style={{ marginTop: 6 }}>{tab === 'phone' ? 'Tapez votre numéro à 9 chiffres sans espaces (ex : 065313187).' : 'Tapez l\'adresse email que vous avez utilisée à l\'inscription.'}</div>
                  </>}
                  {step === 'pwd-focus' && <>
                    <div><strong>Mot de passe sécurisé 🔒</strong></div>
                    <div style={{ marginTop: 6 }}>Minimum 8 caractères, lettres + chiffres. Cliquez sur l'œil 👁️ pour vérifier ce que vous tapez.</div>
                  </>}
                  {step === 'pwd' && <>
                    <div><strong>Super ! {tab === 'phone' ? '📱 ' + phone : '✉️ ' + email}</strong></div>
                    <div style={{ marginTop: 6 }}>Entrez maintenant votre mot de passe. Si vous l'avez oublié, pas de souci, je peux vous aider.</div>
                  </>}
                  {step === 'ready' && <>
                    <div><strong>Parfait, tout est prêt ! ✓</strong></div>
                    <div style={{ marginTop: 6 }}>Je peux vous connecter maintenant.</div>
                  </>}
                  {step === 'error' && <>
                    <div><strong>Oups 💪</strong></div>
                    <div style={{ marginTop: 6 }}>{error}. Essayons autre chose :</div>
                  </>}
                </div>
              </div>

              {/* Boutons d'action contextuels */}
              <div className="hk-actions">
                {(step === 'id-focus' || step === 'pwd-focus') && (
                  <div className="hk-ex" style={{ marginTop: 0, marginBottom: 4 }}>
                    💡 {step === 'pwd-focus' ? 'Exemples : Mayinvest2026, MonProjet123, Credit2025' : (tab === 'phone' ? 'Format : 06 ou 05 + 7 chiffres' : 'Format : nom.prenom@domaine.com')}
                  </div>
                )}
                {step === 'start' && demoStage === 'idle' && <>
                  <button className="hk-btn primary" onClick={() => runDemo('phone')}>
                    <IconPhone />
                    <span>Voir une démo · Téléphone</span>
                  </button>
                  <button className="hk-btn outline" onClick={() => runDemo('email')}>
                    <IconMail />
                    <span>Voir une démo · Email</span>
                  </button>
                  <div className="hk-ex">
                    💡 Je vais vous montrer comment faire avant de vous laisser essayer
                  </div>
                </>}

                {/* MAQUETTE DE DÉMO INTERACTIVE */}
                {demoStage !== 'idle' && (
                  <div className="hk-demo">
                    <div className="hk-demo-head">
                      {demoStage === 'mockup' && '👀 Regardez bien l\'exemple…'}
                      {demoStage === 'typing' && '⌨️ Simulation en cours…'}
                      {demoStage === 'done' && '✓ Voilà ! C\'est à votre tour'}
                    </div>
                    <div className="hk-demo-card">
                      <div className="hk-demo-field">
                        <div className="hk-demo-label">{demoChannel === 'phone' ? 'TÉLÉPHONE (9 CHIFFRES)' : 'EMAIL'}</div>
                        <div className="hk-demo-value">
                          {demoId || <span className="hk-demo-placeholder">{demoChannel === 'phone' ? 'Ex : 06 53 13 187' : 'Ex : jean.pierre@gmail.com'}</span>}
                          {demoStage === 'typing' && !demoPwd && <span className="hk-caret"/>}
                        </div>
                      </div>
                      <div className="hk-demo-field">
                        <div className="hk-demo-label">MOT DE PASSE</div>
                        <div className="hk-demo-value">
                          {demoPwd ? '•'.repeat(demoPwd.length) : <span className="hk-demo-placeholder">Ex : Mayinvest2026</span>}
                          {demoStage === 'typing' && demoId && demoPwd && demoPwd.length < 13 && <span className="hk-caret"/>}
                        </div>
                      </div>
                      {demoStage === 'done' && (
                        <div className="hk-demo-badge">✓ Formulaire rempli correctement</div>
                      )}
                    </div>

                    {demoStage === 'done' ? (
                      <>
                        <button className="hk-btn primary" onClick={jumpToRealForm}>
                          🚀 C'est à votre tour !
                        </button>
                        <button className="hk-btn outline" onClick={() => setDemoStage('idle')}>
                          Revoir une autre démo
                        </button>
                      </>
                    ) : (
                      <button className="hk-btn outline" onClick={() => { setDemoStage('idle'); setDemoId(''); setDemoPwd('') }}>
                        Annuler la démo
                      </button>
                    )}
                  </div>
                )}

                {step === 'pwd' && <>
                  <button className="hk-btn primary" onClick={() => { setShowForgot(true); setHakiOpen(false) }}>
                    🔑 J'ai oublié mon mot de passe
                  </button>
                  <button className="hk-btn outline" onClick={() => { setTab(tab === 'phone' ? 'email' : 'phone'); setError('') }}>
                    {tab === 'phone' ? <><IconMail /><span>Me connecter avec email</span></> : <><IconPhone /><span>Me connecter avec téléphone</span></>}
                  </button>
                </>}

                {step === 'ready' && <>
                  <button className="hk-btn primary" onClick={() => { setHakiOpen(false); tryLogin() }}>
                    ✓ Me connecter maintenant
                  </button>
                </>}

                {step === 'error' && <>
                  <button className="hk-btn primary" onClick={() => { setError(''); setPassword('') }}>
                    🔄 Je réessaie mon mot de passe
                  </button>
                  <button className="hk-btn outline" onClick={() => { setShowForgot(true); setHakiOpen(false); setError('') }}>
                    🔑 Mot de passe oublié
                  </button>
                  <button className="hk-btn outline" onClick={() => { setTab(tab === 'phone' ? 'email' : 'phone'); setError(''); setPassword('') }}>
                    {tab === 'phone' ? <><IconMail /><span>Essayer avec email</span></> : <><IconPhone /><span>Essayer avec téléphone</span></>}
                  </button>
                </>}
              </div>

              <div className="hk-sep">OU EN DERNIER RECOURS</div>

              <button className="hk-btn-wa" onClick={openExpertWA}>
                <IconWA />
                Parler à un conseiller
              </button>

              {/* Bouton décliner Haki */}
              <button className="hk-decline" onClick={declineHaki}>Non merci, je gère seul</button>
            </div>

            {/* Mode automatique toggle */}
            <div className="hk-settings">
              <div className="hk-auto-row">
                <div>
                  <div className="hk-auto-label">Mode automatique</div>
                  <div className="hk-auto-state">{autoMode ? 'Activé' : 'Désactivé'}</div>
                </div>
                <button className={'hk-switch ' + (autoMode ? 'on' : '')} onClick={toggleAutoMode} aria-label="Mode automatique">
                  <span className="hk-switch-knob"/>
                </button>
                <button className="hk-help-btn" onClick={() => setShowAutoHelp(h => !h)} aria-label="Aide">?</button>
              </div>
              {showAutoHelp && (
                <div className="hk-help-box">
                  <button className="hk-help-close" onClick={() => setShowAutoHelp(false)} aria-label="Fermer">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  </button>
                  <div className="hk-help-title">À quoi sert ce bouton ?</div>
                  <div className="hk-help-text">
                    <strong>Activé</strong> : je m'ouvre toute seule à chaque étape pour vous guider.<br/><br/>
                    <strong>Désactivé</strong> : je reste discrète. Cliquez sur l'œil quand vous avez besoin de moi.
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}
      <button className="hk-fab" onClick={toggleHakiManually} aria-label="Haki">
        {hakiAvatar(44)}
      </button>

      {showForgot && (
        <div className="md-modal" onClick={() => setShowForgot(false)}>
          <div className="md-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0D1B3E', letterSpacing: '-0.02em' }}>Réinitialiser</h3>
              <button className="md-modal-close" onClick={() => setShowForgot(false)} aria-label="Fermer">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="md-msg-head">
              <div className="md-msg-ava">{hakiAvatar(44)}</div>
              <div>
                <div className="md-msg-name">Haki vous aide</div>
                <div className="md-msg-sub">Je vous envoie le lien par email</div>
              </div>
            </div>
            <div className="md-info">
              📧 Entrez l'email de votre dossier. Je vous enverrai un lien pour choisir un nouveau mot de passe (valable 1h).
            </div>
            <div className="md-field">
              <label>Email du dossier</label>
              <input type="email" placeholder="Ex : jean.pierre@gmail.com" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
            </div>
            <button className="md-btn" disabled={forgotLoading || !forgotEmail.includes('@')} onClick={sendResetEmail}>
              {forgotLoading ? 'Envoi…' : 'Envoyer le lien par email'}
            </button>
            {forgotMsg && (
              <div style={{
                marginTop: 10,
                padding: 10,
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 600,
                background: forgotMsg.startsWith('OK') ? '#DCFCE7' : '#FEF2F2',
                color: forgotMsg.startsWith('OK') ? '#166534' : '#B91C1C',
              }}>{forgotMsg}</div>
            )}
            <button className="md-whats" onClick={() => window.open('https://wa.me/24265313187?text=Urgence%20mot%20de%20passe%20Mayinvest', '_blank')}>
              <IconWA />
              Urgence : WhatsApp conseiller
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
