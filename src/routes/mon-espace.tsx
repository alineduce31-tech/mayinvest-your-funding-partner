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
  const [time, setTime] = useState('')

  // Horloge temps réel
  useEffect(() => {
    const update = () => {
      const d = new Date()
      setTime(d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Brazzaville' }))
    }
    update()
    const t = setInterval(update, 1000 * 30)
    return () => clearInterval(t)
  }, [])

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
      const session = { email: row.email, expiresAt: Date.now() + 8 * 60 * 60 * 1000 }
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session))
      navigate({ to: '/admin' })
    } catch {
      setError('Erreur de connexion')
      setLoading(false)
    }
  }

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="me-root">
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg-0: #060B1F;
          --bg-1: #0A1532;
          --bg-2: #121E42;
          --surface: rgba(255,255,255,0.03);
          --surface-2: rgba(255,255,255,0.06);
          --border: rgba(255,255,255,0.08);
          --border-strong: rgba(255,255,255,0.14);
          --ink: #F4F6FB;
          --ink-dim: #8B96B8;
          --ink-muted: #4A5578;
          --accent: #D4A24C;
          --accent-glow: rgba(212,162,76,0.4);
          --danger: #E05C5C;
        }
        html, body { height: 100%; }
        input { font-size: 16px !important; font-family: inherit; -webkit-text-fill-color: var(--ink); }

        .me-root {
          font-family: 'Inter', -apple-system, system-ui, sans-serif;
          background: var(--bg-0);
          color: var(--ink);
          min-height: 100vh;
          min-height: 100dvh;
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          position: relative;
          overflow: hidden;
        }
        /* Grain + glow background */
        .me-root::before {
          content: '';
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 60% 50% at 20% 30%, rgba(26,107,255,0.15), transparent 60%),
            radial-gradient(ellipse 50% 50% at 80% 70%, rgba(212,162,76,0.1), transparent 60%),
            linear-gradient(135deg, var(--bg-0) 0%, var(--bg-1) 50%, var(--bg-0) 100%);
          z-index: 0;
        }

        /* === LEFT PANEL === */
        .me-left {
          position: relative; z-index: 1;
          padding: 48px 56px;
          display: flex; flex-direction: column; justify-content: space-between;
          border-right: 1px solid var(--border);
        }
        .me-brand { display: flex; align-items: center; gap: 12px; }
        .me-brand-mark {
          width: 36px; height: 36px; border-radius: 10px;
          background: linear-gradient(135deg, var(--accent) 0%, #B88937 100%);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Space Grotesk', sans-serif; font-weight: 700; color: var(--bg-0); font-size: 18px;
          box-shadow: 0 10px 30px var(--accent-glow);
        }
        .me-brand-txt { font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 17px; letter-spacing: -0.01em; }
        .me-brand-sub { font-size: 10px; color: var(--ink-muted); letter-spacing: 0.18em; text-transform: uppercase; margin-top: 2px; }

        .me-hero {
          display: flex; flex-direction: column; gap: 24px;
          max-width: 460px;
        }
        .me-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px; color: var(--accent);
          letter-spacing: 0.12em; text-transform: uppercase;
        }
        .me-eyebrow::before {
          content: ''; width: 20px; height: 1px; background: var(--accent);
        }
        .me-title {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 500;
          font-size: clamp(32px, 4vw, 46px);
          line-height: 1.05;
          letter-spacing: -0.025em;
          color: var(--ink);
        }
        .me-title em {
          font-style: normal;
          color: var(--accent);
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600;
        }
        .me-tagline {
          font-size: 15px; color: var(--ink-dim); line-height: 1.6;
          max-width: 400px;
        }

        .me-meta {
          display: grid; grid-template-columns: auto auto auto; gap: 24px;
          padding-top: 24px; border-top: 1px solid var(--border);
          max-width: 460px;
        }
        .me-meta-item { }
        .me-meta-label { font-size: 10px; color: var(--ink-muted); letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 6px; }
        .me-meta-value { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--ink); font-weight: 500; }
        .me-dot-live { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #34D058; margin-right: 6px; box-shadow: 0 0 10px rgba(52,208,88,0.6); animation: me-pulse 2s ease-in-out infinite; }
        @keyframes me-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

        /* === RIGHT PANEL === */
        .me-right {
          position: relative; z-index: 1;
          padding: 48px;
          display: flex; align-items: center; justify-content: center;
        }
        .me-form-wrap {
          width: 100%; max-width: 400px;
        }
        .me-form-head {
          margin-bottom: 32px;
        }
        .me-form-badge {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 6px 12px; border-radius: 100px;
          background: rgba(212,162,76,0.08); border: 1px solid rgba(212,162,76,0.25);
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px; color: var(--accent); letter-spacing: 0.12em; text-transform: uppercase;
          margin-bottom: 20px;
        }
        .me-form-badge svg { width: 11px; height: 11px; }
        .me-form-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 26px; font-weight: 600; letter-spacing: -0.02em;
          margin-bottom: 8px;
        }
        .me-form-sub { font-size: 13.5px; color: var(--ink-dim); line-height: 1.5; }

        .me-field { position: relative; margin-bottom: 14px; }
        .me-field label {
          position: absolute; top: 10px; left: 16px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px; color: var(--ink-muted);
          letter-spacing: 0.1em; text-transform: uppercase;
          pointer-events: none;
        }
        .me-field input {
          width: 100%; background: var(--surface); border: 1px solid var(--border);
          border-radius: 10px; padding: 28px 16px 12px; color: var(--ink);
          font-family: inherit; font-weight: 500; outline: none;
          transition: all 0.2s;
        }
        .me-field input::placeholder { color: var(--ink-muted); }
        .me-field input:focus { border-color: var(--accent); background: var(--surface-2); box-shadow: 0 0 0 3px rgba(212,162,76,0.1); }

        .me-btn {
          width: 100%; margin-top: 8px;
          background: var(--ink); color: var(--bg-0);
          border: none; padding: 15px; border-radius: 10px;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600; font-size: 14px; letter-spacing: 0.01em;
          cursor: pointer; transition: all 0.2s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .me-btn:hover:not(:disabled) { background: var(--accent); transform: translateY(-1px); box-shadow: 0 15px 40px var(--accent-glow); }
        .me-btn:disabled { background: rgba(255,255,255,0.1); color: var(--ink-muted); cursor: not-allowed; }
        .me-btn svg { transition: transform 0.2s; }
        .me-btn:hover:not(:disabled) svg { transform: translateX(3px); }

        .me-err {
          margin-top: 14px; padding: 11px 14px;
          background: rgba(224,92,92,0.08); border: 1px solid rgba(224,92,92,0.25);
          border-radius: 10px;
          font-size: 12.5px; color: var(--danger); font-weight: 500;
          display: flex; align-items: center; gap: 8px;
        }

        .me-foot {
          margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--border);
          display: flex; justify-content: space-between; align-items: center;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px; color: var(--ink-muted); letter-spacing: 0.1em;
        }

        /* === RESPONSIVE === */
        @media (max-width: 900px) {
          .me-root { grid-template-columns: 1fr; }
          .me-left { padding: 32px 24px; border-right: none; border-bottom: 1px solid var(--border); }
          .me-right { padding: 32px 24px; }
          .me-hero { gap: 16px; }
          .me-meta { grid-template-columns: 1fr 1fr; gap: 16px; }
          .me-title { font-size: 28px; }
          .me-tagline { font-size: 14px; }
        }
      `}</style>

      {/* LEFT : brand + hero */}
      <div className="me-left">
        <div className="me-brand">
          <div className="me-brand-mark">M</div>
          <div>
            <div className="me-brand-txt">Mayinvest</div>
            <div className="me-brand-sub">Private Console</div>
          </div>
        </div>

        <div className="me-hero">
          <div className="me-eyebrow">Back-office · V1</div>
          <h1 className="me-title">
            Pilotez votre pipeline, <em>en temps réel.</em>
          </h1>
          <p className="me-tagline">
            Scoring automatique, segmentation par typologie, suivi des dossiers de la préselection au financement depuis un seul tableau de bord.
          </p>

          <div className="me-meta">
            <div className="me-meta-item">
              <div className="me-meta-label">Statut</div>
              <div className="me-meta-value"><span className="me-dot-live"/>Opérationnel</div>
            </div>
            <div className="me-meta-item">
              <div className="me-meta-label">Fuseau</div>
              <div className="me-meta-value">{time} · WAT</div>
            </div>
            <div className="me-meta-item">
              <div className="me-meta-label">Région</div>
              <div className="me-meta-value">Brazzaville</div>
            </div>
          </div>
        </div>

        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--ink-muted)', letterSpacing: '0.1em' }}>
          © 2026 MAYINVEST · {today.toUpperCase()}
        </div>
      </div>

      {/* RIGHT : login */}
      <div className="me-right">
        <div className="me-form-wrap">
          <div className="me-form-head">
            <div className="me-form-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>
              Zone restreinte
            </div>
            <h2 className="me-form-title">Authentification</h2>
            <p className="me-form-sub">Accès réservé à l'administration Mayinvest.</p>
          </div>

          <div className="me-field">
            <label>Email</label>
            <input type="email" placeholder=" " value={email} onChange={e => setEmail(e.target.value)} autoComplete="off"/>
          </div>
          <div className="me-field">
            <label>Mot de passe</label>
            <input type="password" placeholder=" " value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && email && password && tryLogin()} autoComplete="current-password"/>
          </div>

          <button className="me-btn" disabled={loading || !email || !password} onClick={tryLogin}>
            {loading ? 'Authentification…' : <>
              Entrer dans la console
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </>}
          </button>

          {error && (
            <div className="me-err">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01" strokeLinecap="round"/></svg>
              {error}
            </div>
          )}

          <div className="me-foot">
            <span>MAY · ADMIN · v1.0</span>
            <span>SSL · ENCRYPTED</span>
          </div>
        </div>
      </div>
    </div>
  )
}
