import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

export const Route = createFileRoute('/mon-espace')({
  component: MonEspaceAdmin,
})

const ADMIN_SESSION_KEY = 'mayinvest_admin_session'

function MonEspaceAdmin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Si déjà connecté → redirige vers /admin
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ADMIN_SESSION_KEY)
      if (raw) {
        const s = JSON.parse(raw)
        if (s?.email && s?.expiresAt && s.expiresAt > Date.now()) {
          navigate({ to: '/admin' })
        }
      }
    } catch {}
  }, [navigate])

  async function tryLogin() {
    setError(''); setLoading(true)
    try {
      const { data } = await supabase.rpc('verify_admin_login', { p_email: email, p_password: password })
      const row: any = Array.isArray(data) ? data[0] : data
      if (!row?.success) {
        setError('Identifiants invalides')
        setLoading(false)
        return
      }
      // Session 8h en localStorage
      const session = { email: row.email, expiresAt: Date.now() + 8 * 60 * 60 * 1000 }
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session))
      navigate({ to: '/admin' })
    } catch (e) {
      setError('Erreur de connexion')
      setLoading(false)
    }
  }

  return (
    <div style={{
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      background: 'linear-gradient(135deg, #0D1B3E 0%, #1A2F5F 50%, #0D1B3E 100%)',
      color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        input { font-size: 16px !important; font-family: inherit; }
        .adm-card { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); backdrop-filter: blur(20px); border-radius: 20px; padding: 36px 28px; max-width: 400px; width: 100%; box-shadow: 0 30px 60px rgba(0,0,0,0.5); }
        .adm-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); padding: 6px 12px; border-radius: 100px; font-size: 11px; font-weight: 700; color: #B8C4E0; margin-bottom: 20px; }
        .adm-dot { width: 7px; height: 7px; border-radius: 50%; background: #FACC15; box-shadow: 0 0 10px rgba(250,204,21,0.6); }
        .adm-title { font-size: 24px; font-weight: 800; margin: 0 0 6px; letter-spacing: -0.02em; }
        .adm-sub { font-size: 13px; color: #B8C4E0; margin: 0 0 24px; }
        .adm-field { background: rgba(255,255,255,0.05); border: 1.5px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px 16px; margin-bottom: 12px; transition: all 0.2s; }
        .adm-field:focus-within { border-color: #1A6BFF; background: rgba(255,255,255,0.08); }
        .adm-field label { display: block; font-size: 10px; font-weight: 700; color: #8B9ACF; margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.08em; }
        .adm-field input { width: 100%; border: none; background: transparent; outline: none; color: #fff; font-weight: 600; padding: 0; }
        .adm-field input::placeholder { color: #4A5882; }
        .adm-btn { width: 100%; background: linear-gradient(135deg, #1A6BFF 0%, #0051D4 100%); color: #fff; border: none; padding: 14px; border-radius: 100px; font-weight: 800; font-size: 14px; cursor: pointer; margin-top: 10px; box-shadow: 0 10px 30px rgba(26,107,255,0.4); letter-spacing: 0.02em; }
        .adm-btn:disabled { background: #2A3A5F; cursor: not-allowed; box-shadow: none; opacity: 0.6; }
        .adm-err { background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); color: #FCA5A5; padding: 10px 14px; border-radius: 10px; font-size: 12px; margin-top: 10px; font-weight: 600; }
        .adm-foot { text-align: center; margin-top: 24px; font-size: 11px; color: #4A5882; letter-spacing: 0.05em; }
      `}</style>

      <div className="adm-card">
        <div className="adm-badge"><span className="adm-dot"/>ZONE RESTREINTE</div>
        <h1 className="adm-title">🔒 Back-office Mayinvest</h1>
        <p className="adm-sub">Accès réservé à l'administration.</p>

        <div className="adm-field">
          <label>Email administrateur</label>
          <input
            type="email"
            placeholder="votre.email@..."
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="adm-field">
          <label>Mot de passe</label>
          <input
            type="password"
            placeholder="••••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && email && password && tryLogin()}
            autoComplete="current-password"
          />
        </div>
        <button className="adm-btn" disabled={loading || !email || !password} onClick={tryLogin}>
          {loading ? 'Vérification…' : 'Se connecter'}
        </button>
        {error && <div className="adm-err">⚠ {error}</div>}

        <div className="adm-foot">MAYINVEST · ADMIN · v1</div>
      </div>
    </div>
  )
}
