import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

export const Route = createFileRoute('/mon-dossier')({
  component: MonDossier,
})

/* Avatar Haki (œil 3D brun) */
function hakiAvatar(size: number) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <defs>
        <radialGradient id="md-eye" cx="35%" cy="30%" r="75%"><stop offset="0" stopColor="#fff"/><stop offset="0.55" stopColor="#f5f5f5"/><stop offset="1" stopColor="#a8a8a8"/></radialGradient>
        <radialGradient id="md-iris" cx="40%" cy="38%" r="65%"><stop offset="0" stopColor="#c88a4a"/><stop offset="0.5" stopColor="#7a4a22"/><stop offset="1" stopColor="#1a0d04"/></radialGradient>
      </defs>
      <circle cx="100" cy="100" r="95" fill="url(#md-eye)"/>
      <circle cx="100" cy="100" r="95" fill="none" stroke="#000" strokeWidth="4"/>
      <circle cx="100" cy="100" r="55" fill="url(#md-iris)"/>
      <circle cx="100" cy="100" r="22" fill="#000"/>
      <ellipse cx="112" cy="85" rx="10" ry="8" fill="#fff"/>
    </svg>
  )
}

function MonDossier() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'phone'|'email'>('phone')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  // Reset email forgotten password
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotMsg, setForgotMsg] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)

  async function tryLogin() {
    setError(''); setLoading(true)
    try {
      if (tab === 'phone') {
        if (phone.length !== 9) { setError('Téléphone invalide (9 chiffres)'); setLoading(false); return }
        const { data } = await supabase.rpc('verify_lead_password_by_phone', { p_phone: phone, p_password: password })
        const row: any = Array.isArray(data) && data[0] ? data[0] : null
        if (!row) { setError('Téléphone ou mot de passe incorrect'); setLoading(false); return }
        navigate({ to: '/client/$id', params: { id: row.id } })
      } else {
        // Email mode : on cherche le lead par email, puis on vérifie le mdp
        if (!email.includes('@')) { setError('Email invalide'); setLoading(false); return }
        // On utilise request_password_reset qui retourne lead_id si l'email existe,
        // mais on veut vérifier le mdp. Idéalement un RPC dédié. Pour l'instant :
        const { data: leadRows } = await supabase
          .from('leads').select('id, identite').ilike('identite->>email', email.trim()).limit(5)
        const match = (leadRows || []).find((l: any) => (l.identite?.email || '').toLowerCase().trim() === email.toLowerCase().trim())
        if (!match) { setError('Aucun dossier avec cet email'); setLoading(false); return }
        const { data: lead } = await supabase.rpc('get_lead_by_password', { p_id: match.id, p_password: password })
        const row: any = Array.isArray(lead) && lead[0] ? lead[0] : null
        if (!row) { setError('Email ou mot de passe incorrect'); setLoading(false); return }
        navigate({ to: '/client/$id', params: { id: row.id } })
      }
    } catch (e) {
      setError('Erreur de connexion')
      setLoading(false)
    }
  }

  async function sendResetEmail() {
    setForgotMsg(''); setForgotLoading(true)
    try {
      const { data } = await supabase.rpc('request_password_reset', { p_email: forgotEmail })
      const row: any = Array.isArray(data) ? data[0] : data
      if (!row?.success) {
        setForgotMsg('⚠ ' + (row?.message || 'Aucun dossier avec cet email'))
        setForgotLoading(false); return
      }
      // Appel Edge Function pour envoyer l'email
      const link = `${window.location.origin}/reset-password?token=${row.token}`
      const supaUrl = (supabase as any).supabaseUrl || ''
      const supaKey = (supabase as any).supabaseKey || ''
      const resp = await fetch(`${supaUrl}/functions/v1/send-reset-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': supaKey, 'Authorization': `Bearer ${supaKey}` },
        body: JSON.stringify({ email: forgotEmail, link })
      })
      if (!resp.ok) {
        setForgotMsg('⚠ Erreur envoi email. Contactez le support WhatsApp.')
      } else {
        setForgotMsg('✓ Email envoyé ! Vérifiez votre boîte (et spams). Lien valable 1h.')
      }
    } catch {
      setForgotMsg('⚠ Erreur. Contactez le support WhatsApp.')
    }
    setForgotLoading(false)
  }

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#F8FAFC', color: '#111', minHeight: '100vh' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        input { font-size: 16px !important; font-family: inherit; }
        .md-head { background: #fff; border-bottom: 1px solid #E5E7EB; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; }
        .md-logo { font-weight: 800; color: #0D1B3E; font-size: 16px; }
        .md-back { background: #0D1B3E; color: #fff; border: none; padding: 8px 16px; border-radius: 100px; font-weight: 700; font-size: 13px; cursor: pointer; }
        .md-wrap { max-width: 460px; margin: 40px auto; padding: 0 20px; }
        .md-card { background: #fff; border-radius: 24px; padding: 32px 24px; box-shadow: 0 20px 50px rgba(13,27,62,0.08); }
        .md-haki-head { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; padding-bottom: 18px; border-bottom: 1px solid #F0F2F5; }
        .md-ava { width: 44px; height: 44px; border-radius: 50%; overflow: hidden; border: 2px solid #EEF4FF; flex-shrink: 0; }
        .md-haki-name { font-size: 14px; font-weight: 800; color: #0D1B3E; }
        .md-haki-sub { font-size: 11px; color: #666; display: flex; align-items: center; gap: 5px; margin-top: 2px; }
        .md-haki-sub::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #34D058; }
        .md-haki-msg { background: linear-gradient(135deg, #EEF4FF 0%, #DBE8FF 100%); border: 1.5px solid rgba(26,107,255,0.2); border-radius: 14px; padding: 12px 14px; font-size: 12.5px; color: #0D1B3E; line-height: 1.5; margin-bottom: 18px; }
        .md-tabs { display: flex; gap: 6px; background: #F0F2F5; border-radius: 12px; padding: 4px; margin-bottom: 14px; }
        .md-tab { flex: 1; background: transparent; border: none; padding: 10px; border-radius: 9px; font-weight: 700; font-size: 13px; color: #666; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .md-tab.on { background: #fff; color: #1A6BFF; box-shadow: 0 2px 6px rgba(13,27,62,0.08); }
        .md-field { background: #F8FAFC; border: 1.5px solid #E5E7EB; border-radius: 14px; padding: 12px 16px; margin-bottom: 10px; }
        .md-field:focus-within { border-color: #1A6BFF; background: #fff; }
        .md-field.has-eye { position: relative; padding-right: 48px; }
        .md-eye { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: transparent; border: none; cursor: pointer; padding: 8px; color: #888; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
        .md-eye:hover { background: #EEF4FF; color: #1A6BFF; }
        .md-field label { display: block; font-size: 10px; font-weight: 700; color: #888; margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.05em; }
        .md-field input { width: 100%; border: none; background: transparent; outline: none; font-weight: 600; padding: 0; color: #111; }
        .md-btn { width: 100%; background: linear-gradient(135deg, #1A6BFF 0%, #0051D4 100%); color: #fff; border: none; padding: 14px; border-radius: 100px; font-weight: 800; font-size: 14px; cursor: pointer; margin-top: 12px; box-shadow: 0 10px 25px rgba(26,107,255,0.3); display: flex; align-items: center; justify-content: center; gap: 8px; }
        .md-btn:disabled { background: #C7D0DB; cursor: not-allowed; box-shadow: none; }
        .md-err { background: #FEF2F2; border: 1px solid #FCA5A5; color: #B91C1C; padding: 10px 14px; border-radius: 10px; font-size: 12px; font-weight: 600; margin-top: 10px; }
        .md-forgot { text-align: center; margin-top: 16px; font-size: 13px; color: #666; }
        .md-forgot a { color: #1A6BFF; font-weight: 700; cursor: pointer; text-decoration: none; }
        .md-modal { position: fixed; inset: 0; background: rgba(13,27,62,0.6); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 100; }
        .md-modal-card { background: #fff; border-radius: 20px; padding: 28px 24px; max-width: 400px; width: 100%; }
        .md-modal-close { background: #F0F2F5; border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-weight: 700; }
        .md-whats { background: #25D366; color: #fff; border: none; padding: 12px; border-radius: 100px; font-weight: 700; font-size: 13px; cursor: pointer; width: 100%; margin-top: 14px; display: flex; align-items: center; justify-content: center; gap: 8px; }
      `}</style>

      <div className="md-head">
        <div className="md-logo">Mayinvest</div>
        <button className="md-back" onClick={() => navigate({ to: '/' })}>← Accueil</button>
      </div>

      <div className="md-wrap">
        <div className="md-card">
          <div className="md-haki-head">
            <div className="md-ava">{hakiAvatar(44)}</div>
            <div>
              <div className="md-haki-name">Haki</div>
              <div className="md-haki-sub">En ligne · Assistante Mayinvest</div>
            </div>
          </div>

          <div className="md-haki-msg">
            👋 Bonjour ! Pour accéder à votre dossier, identifiez-vous avec votre <strong>téléphone</strong> ou votre <strong>email</strong> + votre <strong>mot de passe</strong>.
          </div>

          <div className="md-tabs">
            <button className={`md-tab ${tab === 'phone' ? 'on' : ''}`} onClick={() => { setTab('phone'); setError('') }}>📱 Téléphone</button>
            <button className={`md-tab ${tab === 'email' ? 'on' : ''}`} onClick={() => { setTab('email'); setError('') }}>✉️ Email</button>
          </div>

          {tab === 'phone' ? (
            <div className="md-field">
              <label>Téléphone (9 chiffres)</label>
              <input type="tel" inputMode="numeric" placeholder="06 123 4567" maxLength={11}
                value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}/>
            </div>
          ) : (
            <div className="md-field">
              <label>Email</label>
              <input type="email" placeholder="votre@email.com" value={email} onChange={e => setEmail(e.target.value)}/>
            </div>
          )}

          <div className="md-field has-eye">
            <label>Mot de passe</label>
            <input type={showPwd ? 'text' : 'password'} placeholder="Votre mot de passe" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && password && tryLogin()}
              autoComplete="current-password"/>
            <button type="button" className="md-eye" onClick={() => setShowPwd(v => !v)} aria-label={showPwd ? 'Masquer' : 'Afficher'}>
              {showPwd ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>

          <button className="md-btn" disabled={loading || !password || (tab === 'phone' ? phone.length !== 9 : !email.includes('@'))} onClick={tryLogin}>
            {loading ? 'Connexion…' : <>Accéder à mon dossier
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M4 9h10M10 5l4 4-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </>}
          </button>

          {error && <div className="md-err">⚠ {error}</div>}

          <div className="md-forgot">
            Mot de passe oublié ? <a onClick={() => setShowForgot(true)}>Réinitialiser par email</a>
          </div>
        </div>
      </div>

      {showForgot && (
        <div className="md-modal" onClick={() => setShowForgot(false)}>
          <div className="md-modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: '#0D1B3E' }}>Réinitialiser</h3>
              <button className="md-modal-close" onClick={() => setShowForgot(false)}>×</button>
            </div>
            <div className="md-haki-head" style={{ marginBottom: 14, paddingBottom: 14 }}>
              <div className="md-ava">{hakiAvatar(44)}</div>
              <div>
                <div className="md-haki-name">Haki vous aide</div>
                <div className="md-haki-sub">Je vous envoie le lien</div>
              </div>
            </div>
            <div className="md-haki-msg">
              Entrez l'email de votre dossier. Je vous enverrai un lien pour choisir un nouveau mot de passe (valable 1h).
            </div>
            <div className="md-field">
              <label>Email du dossier</label>
              <input type="email" placeholder="votre@email.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}/>
            </div>
            <button className="md-btn" disabled={forgotLoading || !forgotEmail.includes('@')} onClick={sendResetEmail}>
              {forgotLoading ? 'Envoi…' : 'Envoyer le lien par email'}
            </button>
            {forgotMsg && <div style={{ marginTop: 10, padding: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: forgotMsg.startsWith('✓') ? '#DCFCE7' : '#FEF2F2', color: forgotMsg.startsWith('✓') ? '#166534' : '#B91C1C' }}>{forgotMsg}</div>}
            <button className="md-whats" onClick={() => window.open('https://wa.me/242060000000?text=Urgence%20mot%20de%20passe%20Mayinvest', '_blank')}>
              💬 Urgence : WhatsApp conseiller
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
