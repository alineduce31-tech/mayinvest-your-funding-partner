import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

export const Route = createFileRoute('/reset-password')({
  component: ResetPassword,
})

/* Avatar Haki (œil 3D) */
function hakiAvatar(size: number) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <defs>
        <radialGradient id="r-eye" cx="35%" cy="30%" r="75%"><stop offset="0" stopColor="#fff"/><stop offset="0.55" stopColor="#f5f5f5"/><stop offset="1" stopColor="#a8a8a8"/></radialGradient>
        <radialGradient id="r-iris" cx="40%" cy="38%" r="65%"><stop offset="0" stopColor="#c88a4a"/><stop offset="0.5" stopColor="#7a4a22"/><stop offset="1" stopColor="#1a0d04"/></radialGradient>
      </defs>
      <circle cx="100" cy="100" r="95" fill="url(#r-eye)"/>
      <circle cx="100" cy="100" r="95" fill="none" stroke="#000" strokeWidth="4"/>
      <circle cx="100" cy="100" r="55" fill="url(#r-iris)"/>
      <circle cx="100" cy="100" r="22" fill="#000"/>
      <ellipse cx="112" cy="85" rx="10" ry="8" fill="#fff"/>
    </svg>
  )
}

function ResetPassword() {
  const navigate = useNavigate()
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const token = params?.get('token') || ''

  const [stage, setStage] = useState<'loading'|'valid'|'invalid'|'done'>('loading')
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [newPwdConfirm, setNewPwdConfirm] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    (async () => {
      if (!token) { setStage('invalid'); setError('Lien manquant'); return }
      const { data } = await supabase.rpc('verify_reset_token', { p_token: token })
      const row: any = Array.isArray(data) ? data[0] : data
      if (row?.valid) { setEmail(row.email); setStage('valid') }
      else { setStage('invalid'); setError(row?.message || 'Lien invalide ou expiré') }
    })()
  }, [token])

  async function submitNew() {
    setError(''); setBusy(true)
    if (newPwd.length < 8) { setError('Mot de passe trop court (min 8 caractères)'); setBusy(false); return }
    if (newPwd !== newPwdConfirm) { setError('Les mots de passe ne correspondent pas'); setBusy(false); return }
    const { data, error: err } = await supabase.rpc('reset_password_with_token', { p_token: token, p_new_password: newPwd })
    setBusy(false)
    const row: any = Array.isArray(data) ? data[0] : data
    if (err || !row?.success) { setError(row?.message || 'Erreur'); return }
    setStage('done')
  }

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#F8FAFC', color: '#111', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        input { font-size: 16px !important; font-family: inherit; }
        .r-card { background: #fff; border-radius: 24px; padding: 36px 28px; box-shadow: 0 20px 50px rgba(13,27,62,0.1); max-width: 440px; width: 100%; }
        .r-head { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #F0F2F5; }
        .r-ava { width: 48px; height: 48px; border-radius: 50%; overflow: hidden; flex-shrink: 0; border: 2px solid #EEF4FF; }
        .r-haki-name { font-size: 15px; font-weight: 800; color: #0D1B3E; }
        .r-haki-sub { font-size: 11px; color: #666; font-weight: 600; margin-top: 2px; display: flex; align-items: center; gap: 5px; }
        .r-haki-sub::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #34D058; }
        .r-haki-msg { background: linear-gradient(135deg, #EEF4FF 0%, #DBE8FF 100%); border: 1.5px solid rgba(26,107,255,0.2); border-radius: 14px; padding: 14px; margin-bottom: 20px; font-size: 13px; color: #0D1B3E; line-height: 1.5; }
        .r-h { font-size: 22px; font-weight: 800; margin: 0 0 10px; color: #0D1B3E; }
        .r-sub { font-size: 14px; color: #666; margin: 0 0 20px; line-height: 1.5; }
        .r-field { background: #F8FAFC; border: 1.5px solid #E5E7EB; border-radius: 14px; padding: 14px 18px; margin-bottom: 12px; }
        .r-field label { display: block; font-size: 11px; font-weight: 700; color: #888; margin-bottom: 4px; }
        .r-field input { width: 100%; border: none; background: transparent; outline: none; font-weight: 500; }
        .r-field:focus-within { border-color: #1A6BFF; background: #fff; }
        .r-btn { width: 100%; background: #1A6BFF; color: #fff; border: none; padding: 14px; border-radius: 100px; font-weight: 700; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 8px 20px rgba(26,107,255,0.3); }
        .r-btn:disabled { background: #C7D0DB; cursor: not-allowed; box-shadow: none; }
        .r-err { background: #FEF2F2; border: 1.5px solid #FCA5A5; color: #B91C1C; font-size: 13px; padding: 10px 14px; border-radius: 10px; margin-top: 10px; }
        .r-ok-icon { width: 72px; height: 72px; border-radius: 50%; background: #DCFCE7; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        .r-link { display: inline-block; color: #1A6BFF; font-weight: 700; text-decoration: none; margin-top: 14px; }
      `}</style>

      <div className="r-card">
        {stage !== 'loading' && (
          <div className="r-head">
            <div className="r-ava">{hakiAvatar(48)}</div>
            <div>
              <div className="r-haki-name">Haki</div>
              <div className="r-haki-sub">En ligne · Assistante Mayinvest</div>
            </div>
          </div>
        )}

        {stage === 'loading' && <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>Vérification du lien…</div>}

        {stage === 'invalid' && (
          <>
            <div className="r-haki-msg">
              ⚠ <strong>Ce lien n'est plus valide.</strong><br/><br/>
              Il a peut-être expiré (durée de vie 1 heure) ou déjà été utilisé. Demandez un nouveau lien depuis la page de connexion.
            </div>
            <h1 className="r-h">Lien invalide</h1>
            <div className="r-err">{error}</div>
            <button className="r-btn" style={{ marginTop: 14 }} onClick={() => navigate({ to: '/mon-espace' })}>
              Retour à la connexion
            </button>
          </>
        )}

        {stage === 'valid' && (
          <>
            <div className="r-haki-msg">
              👋 Bonjour ! Je vous aide à réinitialiser votre mot de passe pour le dossier associé à <strong>{email}</strong>.<br/><br/>
              Choisissez un nouveau mot de passe de <strong>8 caractères minimum</strong> (lettres et chiffres recommandés).
            </div>
            <h1 className="r-h">Nouveau mot de passe</h1>
            <div className="r-field">
              <label>Nouveau mot de passe</label>
              <input type="password" placeholder="8 caractères min" value={newPwd} onChange={e => setNewPwd(e.target.value)} autoComplete="new-password"/>
            </div>
            <div className="r-field">
              <label>Confirmer le mot de passe</label>
              <input type="password" placeholder="Retapez le même mot de passe" value={newPwdConfirm} onChange={e => setNewPwdConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitNew()} autoComplete="new-password"/>
              {newPwd && newPwdConfirm && newPwd !== newPwdConfirm && <div style={{ fontSize: 11, color: '#B91C1C', marginTop: 4, fontWeight: 600 }}>⚠ Les mots de passe ne correspondent pas</div>}
              {newPwd && newPwd.length >= 8 && newPwd === newPwdConfirm && <div style={{ fontSize: 11, color: '#166534', marginTop: 4, fontWeight: 600 }}>✓ Mots de passe identiques</div>}
            </div>
            <button className="r-btn" disabled={busy || newPwd.length < 8 || newPwd !== newPwdConfirm} onClick={submitNew}>
              {busy ? 'Enregistrement…' : 'Réinitialiser mon mot de passe'}
            </button>
            {error && <div className="r-err">{error}</div>}
          </>
        )}

        {stage === 'done' && (
          <>
            <div style={{ textAlign: 'center' }}>
              <div className="r-ok-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="#166534" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <h1 className="r-h">Mot de passe réinitialisé ✓</h1>
              <div className="r-haki-msg">
                🎉 <strong>Parfait !</strong> Votre nouveau mot de passe est enregistré. Vous pouvez maintenant vous connecter à votre dossier.
              </div>
              <button className="r-btn" onClick={() => navigate({ to: '/mon-espace' })}>
                Me connecter maintenant
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
