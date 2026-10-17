import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
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
        .md-modal-card { background: #fff; border-radius: 20px; padding: 28px 24px; max-width: 400px; width: 100%; }
        .md-modal-close { background: #F0F2F5; border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-weight: 700; font-size: 16px; }
        .md-whats { background: #25D366; color: #fff; border: none; padding: 12px; border-radius: 100px; font-weight: 700; font-size: 13px; cursor: pointer; width: 100%; margin-top: 14px; display: flex; align-items: center; justify-content: center; gap: 8px; font-family: inherit; }
        .md-msg-head { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px solid #F0F2F5; }
        .md-msg-ava { width: 44px; height: 44px; border-radius: 50%; overflow: hidden; border: 2px solid #EEF4FF; flex-shrink: 0; }
        .md-msg-name { font-size: 14px; font-weight: 800; color: #0D1B3E; }
        .md-msg-sub { font-size: 11px; color: #666; display: flex; align-items: center; gap: 5px; margin-top: 2px; }
        .md-msg-sub::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #34D058; }
        .md-info { background: linear-gradient(135deg, #EEF4FF 0%, #DBE8FF 100%); border: 1.5px solid rgba(26,107,255,0.2); border-radius: 14px; padding: 12px 14px; font-size: 12.5px; color: #0D1B3E; line-height: 1.5; margin-bottom: 14px; }

        .hk-fab { position: fixed; bottom: 24px; right: 24px; z-index: 1000; width: 64px; height: 64px; border-radius: 50%; background: #fff; border: 3px solid #fff; box-shadow: 0 14px 32px rgba(13,27,62,0.25), 0 4px 10px rgba(13,27,62,0.08); cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; }
        .hk-fab:hover { transform: scale(1.08); }
        .hk-fab::after { content: ''; position: absolute; top: 2px; right: 2px; width: 14px; height: 14px; background: #34D058; border: 2.5px solid #fff; border-radius: 50%; animation: hk-pulse 2.2s infinite; }
        @keyframes hk-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(52,208,88,0.5); } 50% { box-shadow: 0 0 0 6px rgba(52,208,88,0); } }
        .hk-panel { position: fixed; bottom: 96px; right: 24px; z-index: 1000; background: #fff; border-radius: 20px; box-shadow: 0 24px 60px rgba(13,27,62,0.25); width: 320px; max-width: calc(100vw - 32px); overflow: hidden; }
        .hk-head { padding: 18px 20px; display: flex; align-items: center; gap: 12px; background: linear-gradient(135deg, #0D1B3E 0%, #1A2F5F 100%); color: #fff; position: relative; }
        .hk-ava { width: 40px; height: 40px; border-radius: 50%; overflow: hidden; border: 2px solid rgba(255,255,255,0.2); flex-shrink: 0; }
        .hk-name { font-weight: 800; font-size: 14px; }
        .hk-sub { font-size: 11px; color: rgba(255,255,255,0.7); display: flex; align-items: center; gap: 5px; margin-top: 2px; }
        .hk-sub::before { content: ''; width: 7px; height: 7px; background: #34D058; border-radius: 50%; }
        .hk-close { position: absolute; top: 12px; right: 12px; width: 28px; height: 28px; border-radius: 50%; background: rgba(255,255,255,0.1); border: none; color: #fff; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .hk-body { padding: 18px; }
        .hk-msg { background: #EEF4FF; border: 1px solid rgba(26,107,255,0.15); border-radius: 12px; padding: 12px 14px; font-size: 13px; color: #0D1B3E; line-height: 1.5; margin-bottom: 14px; }
        .hk-btn-wa { background: #25D366; color: #fff; border: none; padding: 12px 16px; border-radius: 10px; font-weight: 700; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-family: inherit; width: 100%; justify-content: center; }
        .hk-phone { text-align: center; font-size: 11px; color: #666; margin-top: 12px; font-weight: 500; }
        .hk-phone strong { color: #0D1B3E; font-weight: 800; }

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
                type="tel"
                inputMode="numeric"
                placeholder="06 123 4567"
                maxLength={11}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
              />
            </div>
          ) : (
            <div className="md-field">
              <label>Email</label>
              <input
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}

          <div className="md-field has-eye">
            <label>Mot de passe</label>
            <input
              type={showPwd ? 'text' : 'password'}
              placeholder="Votre mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && canSubmit) tryLogin() }}
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

      {/* HAKI FLOATING WIDGET */}
      {hakiOpen && (
        <div className="hk-panel">
          <div className="hk-head">
            <div className="hk-ava">{hakiAvatar(40)}</div>
            <div style={{ flex: 1 }}>
              <div className="hk-name">Haki</div>
              <div className="hk-sub">En ligne · Assistante Mayinvest</div>
            </div>
            <button className="hk-close" onClick={() => setHakiOpen(false)} aria-label="Fermer">x</button>
          </div>
          <div className="hk-body">
            <div className="hk-msg">
              👋 Besoin d'aide pour vous connecter ou retrouver votre dossier ? Un conseiller Mayinvest répond directement sur WhatsApp.
            </div>
            <button className="hk-btn-wa" onClick={openExpertWA}>
              <IconWA />
              Discuter sur WhatsApp
            </button>
            <div className="hk-phone">Expert : <strong>+242 06 53 13 187</strong></div>
          </div>
        </div>
      )}
      <button className="hk-fab" onClick={() => setHakiOpen(!hakiOpen)} aria-label="Haki">
        {hakiAvatar(44)}
      </button>

      {showForgot && (
        <div className="md-modal" onClick={() => setShowForgot(false)}>
          <div className="md-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: '#0D1B3E' }}>Réinitialiser</h3>
              <button className="md-modal-close" onClick={() => setShowForgot(false)}>x</button>
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
              <input type="email" placeholder="votre@email.com" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
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
