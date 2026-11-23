import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Logo } from '@/components/Logo'

export const Route = createFileRoute('/espace-commercial')({
  component: EspaceCommercialPage,
})

const MI = {
  blue: '#1A6BFF', blueDark: '#0051D4', blueSoft: '#EEF4FF',
  navy: '#0D1B3E', green: '#22C55E', greenSoft: '#D1FAE5',
  red: '#DC2626', redSoft: '#FEE2E2', gold: '#F59E0B', goldSoft: '#FEF3C7',
  grayBg: '#F7F8FA', grayBorder: '#F0F0F0', grayHair: '#F3F4F6',
  text: '#111', textMuted: '#6B7280', textFaint: '#9CA3AF',
}

type Session = { id: string; nom: string; prenom: string; email: string; telephone: string; ville: string; status: string; activated_at: string | null }

function EspaceCommercialPage() {
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ identifiant: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const raw = localStorage.getItem('mi_commercial_session')
    if (raw) {
      try { setSession(JSON.parse(raw)) } catch {}
    }
    setLoading(false)
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.identifiant || !form.password) { setError('Entre ton email/téléphone et ton mot de passe.'); return }
    setLoginLoading(true)
    const { data, error: rpcErr } = await supabase.rpc('connecter_commercial', {
      p_identifiant: form.identifiant, p_password: form.password,
    })
    setLoginLoading(false)
    if (rpcErr) { setError(rpcErr.message || 'Identifiants incorrects.'); return }
    if (data) {
      localStorage.setItem('mi_commercial_session', JSON.stringify(data))
      setSession(data as Session)
    }
  }

  function logout() {
    localStorage.removeItem('mi_commercial_session')
    setSession(null)
    setForm({ identifiant: '', password: '' })
  }

  function resumeFormation() {
    if (!session) return
    localStorage.setItem('mi_candidate_id', session.id)
    localStorage.setItem('mi_candidate_name', session.prenom)
    if (session.status === 'formation') navigate({ to: '/formation' as any })
    else if (session.status === 'simulation_theo') navigate({ to: '/simulation' as any })
    else if (session.status === 'simulation_prat') navigate({ to: '/simulation-pratique' as any })
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}>Chargement…</div>

  return (
    <div style={{ minHeight: '100vh', background: MI.grayBg, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: MI.text }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
      <style>{`
        * { box-sizing: border-box; }
        .ec-header { height: 72px; padding: 0 60px; display: flex; align-items: center; justify-content: space-between; background: white; border-bottom: 1px solid ${MI.grayBorder}; }
        @media (max-width: 640px) { .ec-header { height: 60px; padding: 0 16px; } }
        .ec-nav-link { color: #111; font-size: 14px; font-weight: 600; text-decoration: none; padding: 10px 16px; border-radius: 100px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; background: none; border: none; font-family: inherit; }
        .ec-nav-link:hover { background: ${MI.grayHair}; }
        .ec-nav-link.muted { color: ${MI.textMuted}; font-size: 13px; font-weight: 500; padding: 10px 12px; }

        /* === LOGIN === */
        .login-wrap { max-width: 440px; margin: 0 auto; padding: 60px 24px; }
        .login-card { background: white; border: 1px solid ${MI.grayBorder}; border-radius: 24px; padding: 40px 36px; box-shadow: 0 20px 40px rgba(13,23,41,0.06), 0 2px 6px rgba(13,23,41,0.03); }
        .login-pill { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; background: ${MI.blueSoft}; color: ${MI.blue}; border-radius: 100px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 16px; }
        .login-card h1 { font-size: 26px; font-weight: 800; color: ${MI.navy}; margin: 0 0 6px; letter-spacing: -0.02em; }
        .login-card p.sub { font-size: 13px; color: ${MI.textMuted}; margin: 0 0 24px; line-height: 1.5; }
        .field { margin-bottom: 14px; }
        .field label { display: block; font-size: 12px; font-weight: 600; color: ${MI.text}; margin-bottom: 5px; }
        .field input {
          width: 100%; padding: 12px 14px; background: #fff;
          border: 1px solid ${MI.grayBorder}; border-radius: 10px;
          font-size: 14px; font-family: inherit; color: ${MI.text};
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .field input:focus { outline: none; border-color: ${MI.blue}; box-shadow: 0 0 0 3px rgba(26,107,255,0.12); }
        .field input::placeholder { color: ${MI.textFaint}; }
        .pwd-wrap { position: relative; }
        .pwd-toggle { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: ${MI.textMuted}; padding: 6px; }
        .form-err { background: ${MI.redSoft}; color: ${MI.red}; padding: 10px 14px; border-radius: 10px; font-size: 12px; margin-bottom: 14px; font-weight: 600; }
        .btn-login { width: 100%; padding: 14px; background: #111; color: white; border: none; border-radius: 100px; font-size: 14px; font-weight: 700; cursor: pointer; margin-top: 8px; font-family: inherit; }
        .btn-login:hover:not(:disabled) { background: ${MI.blue}; }
        .btn-login:disabled { opacity: 0.6; cursor: not-allowed; }
        .login-footer { font-size: 12px; color: ${MI.textMuted}; text-align: center; margin-top: 20px; }
        .login-footer a { color: ${MI.blue}; text-decoration: none; font-weight: 600; }

        /* === DASHBOARD === */
        .dash-wrap { max-width: 920px; margin: 0 auto; padding: 32px 24px; }
        .welcome-card { background: linear-gradient(135deg, ${MI.navy} 0%, #1A2F5F 100%); color: #fff; border-radius: 24px; padding: 36px; position: relative; overflow: hidden; margin-bottom: 20px; }
        .welcome-card::before { content: ''; position: absolute; top: -80px; right: -80px; width: 280px; height: 280px; background: radial-gradient(circle, rgba(26,107,255,0.25) 0%, transparent 65%); pointer-events: none; }
        .welcome-badge { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; background: rgba(255,255,255,0.15); border-radius: 100px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 14px; position: relative; }
        .welcome-badge .dot { width: 6px; height: 6px; background: ${MI.green}; border-radius: 50%; }
        .welcome-card h2 { font-size: 30px; font-weight: 800; margin: 0 0 8px; letter-spacing: -0.02em; position: relative; }
        .welcome-card p { font-size: 14px; color: rgba(255,255,255,0.75); margin: 0; line-height: 1.6; max-width: 540px; position: relative; }

        .status-card { background: white; border: 1px solid ${MI.grayBorder}; border-radius: 20px; padding: 28px; margin-bottom: 20px; box-shadow: 0 2px 6px rgba(13,23,41,0.03); }
        .status-head { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; }
        .status-ic { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .status-ic.ok { background: ${MI.greenSoft}; color: ${MI.green}; }
        .status-ic.pending { background: ${MI.goldSoft}; color: #92400E; }
        .status-ic.inprogress { background: ${MI.blueSoft}; color: ${MI.blue}; }
        .status-head h3 { font-size: 17px; font-weight: 800; margin: 0 0 3px; color: ${MI.navy}; }
        .status-head p { font-size: 12px; color: ${MI.textMuted}; margin: 0; }
        .status-body { font-size: 13px; color: ${MI.text}; line-height: 1.6; margin-bottom: 16px; }
        .status-body b { font-weight: 700; color: ${MI.navy}; }
        .btn-resume { padding: 12px 22px; background: ${MI.blue}; color: white; border: none; border-radius: 100px; font-size: 13px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; font-family: inherit; }
        .btn-resume:hover { background: ${MI.blueDark}; }

        .coming-soon { background: white; border: 1px dashed ${MI.grayBorder}; border-radius: 20px; padding: 36px; text-align: center; }
        .coming-ic { width: 56px; height: 56px; background: ${MI.goldSoft}; color: ${MI.gold}; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 14px; }
        .coming-soon h3 { font-size: 18px; font-weight: 800; color: ${MI.navy}; margin: 0 0 8px; }
        .coming-soon p { font-size: 13px; color: ${MI.textMuted}; margin: 0 auto; max-width: 420px; line-height: 1.6; }
        .coming-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; max-width: 460px; margin: 20px auto 0; text-align: left; }
        @media (max-width: 500px) { .coming-list { grid-template-columns: 1fr; } }
        .coming-item { background: ${MI.grayHair}; padding: 10px 14px; border-radius: 10px; font-size: 12px; color: ${MI.text}; display: flex; align-items: center; gap: 8px; }
        .coming-item svg { color: ${MI.textMuted}; flex-shrink: 0; }

        .btn-logout { padding: 9px 18px; background: ${MI.grayHair}; color: ${MI.text}; border: 1px solid ${MI.grayBorder}; border-radius: 100px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }
      `}</style>

      <header className="ec-header">
        <Link to="/"><Logo height={56} tone="light"/></Link>
        {session ? (
          <button className="btn-logout" onClick={logout}>Déconnexion</button>
        ) : (
          <Link to="/" className="ec-nav-link muted">← Retour à l'accueil</Link>
        )}
      </header>

      {!session ? (
        <div className="login-wrap">
          <div className="login-card">
            <span className="login-pill">Espace commercial</span>
            <h1>Bon retour parmi nous.</h1>
            <p className="sub">Connecte-toi avec ton email ou ton téléphone pour accéder à ton espace.</p>
            {error && <div className="form-err">{error}</div>}
            <form onSubmit={handleLogin}>
              <div className="field">
                <label>Email ou téléphone</label>
                <input type="text" placeholder="toi@exemple.com ou 06 xx xx xx xx" value={form.identifiant} onChange={e => setForm({ ...form, identifiant: e.target.value })} autoComplete="username"/>
              </div>
              <div className="field">
                <label>Mot de passe</label>
                <div className="pwd-wrap">
                  <input type={showPwd ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} autoComplete="current-password" style={{ paddingRight: 44 }}/>
                  <button type="button" className="pwd-toggle" onClick={() => setShowPwd(!showPwd)}>
                    {showPwd ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn-login" disabled={loginLoading}>
                {loginLoading ? 'Connexion…' : 'Se connecter →'}
              </button>
            </form>
            <div className="login-footer">
              Pas encore inscrit ? <Link to={'/rejoindre-equipe' as any}>Rejoindre l'équipe</Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="dash-wrap">
          <div className="welcome-card">
            <span className="welcome-badge"><span className="dot"/>Connecté</span>
            <h2>Bonjour {session.prenom} 👋</h2>
            <p>Ravi de te revoir. Voici où tu en es dans ton parcours Mayinvest.</p>
          </div>

          {/* État du parcours */}
          {session.status === 'formation' && (
            <div className="status-card">
              <div className="status-head">
                <div className="status-ic inprogress">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                </div>
                <div>
                  <h3>Formation en cours</h3>
                  <p>3 modules à compléter · reprends où tu t'étais arrêté</p>
                </div>
              </div>
              <div className="status-body">
                Tu dois terminer les 3 modules de formation pour accéder à la simulation. <b>Compte environ 1h30</b>.
              </div>
              <button className="btn-resume" onClick={resumeFormation}>
                Reprendre la formation →
              </button>
            </div>
          )}

          {(session.status === 'simulation_theo' || session.status === 'simulation_prat') && (
            <div className="status-card">
              <div className="status-head">
                <div className="status-ic inprogress">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                </div>
                <div>
                  <h3>Simulation en cours</h3>
                  <p>Tu es à l'étape pratique de ton évaluation</p>
                </div>
              </div>
              <div className="status-body">
                Continue la simulation pour valider ta candidature. <b>Compte environ 30 min</b>.
              </div>
              <button className="btn-resume" onClick={resumeFormation}>
                Reprendre la simulation →
              </button>
            </div>
          )}

          {session.status === 'en_attente_validation' && (
            <div className="status-card">
              <div className="status-head">
                <div className="status-ic pending">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div>
                  <h3>En attente de validation</h3>
                  <p>Aldo examine ta candidature</p>
                </div>
              </div>
              <div className="status-body">
                Tu as terminé ta formation et ta simulation. <b>Aldo revient vers toi sous 24h</b> par WhatsApp avec sa décision.
              </div>
            </div>
          )}

          {session.status === 'refuse' && (
            <div className="status-card">
              <div className="status-head">
                <div className="status-ic pending" style={{ background: MI.redSoft, color: MI.red }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                </div>
                <div>
                  <h3>Candidature non retenue</h3>
                  <p>Pour cette fois</p>
                </div>
              </div>
              <div className="status-body">
                Tu peux repostuler dans 90 jours. En attendant, perfectionne-toi et reviens plus fort.
              </div>
            </div>
          )}

          {session.status === 'valide' && (
            <div className="coming-soon">
              <div className="coming-ic">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              </div>
              <h3>Ton workspace commercial arrive bientôt</h3>
              <p>Tu es validé par Aldo ! Ton espace de travail (CRM, chat prospects, outils, tableau de bord des gains) est en construction. Tu seras notifié par WhatsApp dès qu'il sera prêt.</p>
              <div className="coming-list">
                <div className="coming-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>Dashboard personnel</div>
                <div className="coming-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>Chat avec prospects</div>
                <div className="coming-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>Suivi de tes gains</div>
                <div className="coming-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>Lien unique parrainage</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
