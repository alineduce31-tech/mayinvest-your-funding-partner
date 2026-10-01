import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Logo } from '@/components/Logo'

export const Route = createFileRoute('/')({
  component: Index,
})

function LogoSVG({ height = 64, tone = 'light' }: { height?: number; tone?: 'light' | 'dark' }) {
  return <Logo height={height} tone={tone} />
}

function Index() {
  const navigate = useNavigate()
  const goto = () => navigate({ to: '/preselection' })
  const gotoP = () => { window.location.href = '/preselection?type=physique' }
  const gotoM = () => { window.location.href = '/preselection?type=morale' }
  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#FFFFFF', color: '#111111', minHeight: '100vh', WebkitFontSmoothing: 'antialiased' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }

        .nav { height: 72px; padding: 0 60px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #F0F0F0; }
        @media (max-width: 640px) { .nav { height: 60px; padding: 0 20px; } }

        .hero { padding: 90px 60px 80px; display: grid; grid-template-columns: 1fr 480px; gap: 60px; align-items: center; }
        @media (max-width: 900px) { .hero { grid-template-columns: 1fr; padding: 48px 32px 40px; gap: 40px; } }
        @media (max-width: 640px) { .hero { padding: 32px 20px 32px; gap: 32px; } }

        .hero h1 { font-size: 58px; font-weight: 800; line-height: 1.1; letter-spacing: -2px; color: #111; margin-bottom: 20px; }
        @media (max-width: 900px) { .hero h1 { font-size: 44px; } }
        @media (max-width: 640px) { .hero h1 { font-size: 34px; letter-spacing: -1px; } }

        .hero-sub { font-size: 17px; line-height: 1.65; color: #666; max-width: 420px; margin-bottom: 44px; }
        @media (max-width: 640px) { .hero-sub { font-size: 15px; margin-bottom: 28px; } }

        .hero-btns { display: flex; flex-direction: column; gap: 14px; max-width: 360px; }
        @media (max-width: 640px) { .hero-btns { max-width: 100%; } }

        .score-card { background: #0D1B3E; border-radius: 28px; padding: 36px; color: #fff; transform: perspective(900px) rotateY(-6deg) rotateX(3deg); box-shadow: 0 40px 80px rgba(13,27,62,0.28), 0 8px 24px rgba(13,27,62,0.16); position: relative; overflow: hidden; }
        @media (max-width: 900px) { .score-card { transform: none; } }
        @media (max-width: 640px) { .score-card { transform: none; padding: 24px; border-radius: 20px; } }

        .sc-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; }

        .proof { padding: 32px 60px; border-top: 1px solid #F0F0F0; border-bottom: 1px solid #F0F0F0; display: flex; align-items: center; gap: 48px; flex-wrap: wrap; }
        @media (max-width: 900px) { .proof { padding: 24px 32px; gap: 24px; } }
        @media (max-width: 640px) { .proof { padding: 20px; gap: 16px; display: grid; grid-template-columns: 1fr 1fr; } }
        .proof-divider { width: 1px; height: 40px; background: #EBEBEB; }
        @media (max-width: 640px) { .proof-divider { display: none; } }

        .steps { padding: 80px 60px; }
        @media (max-width: 900px) { .steps { padding: 56px 32px; } }
        @media (max-width: 640px) { .steps { padding: 40px 20px; } }
        .section-title { font-size: 42px; font-weight: 800; letter-spacing: -1.5px; color: #111; margin-bottom: 48px; line-height: 1.1; }
        @media (max-width: 640px) { .section-title { font-size: 28px; letter-spacing: -0.5px; margin-bottom: 28px; } }

        .dark-band { background: #111111; margin: 0 60px; border-radius: 28px; padding: 64px; display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: start; }
        @media (max-width: 900px) { .dark-band { margin: 0 32px; grid-template-columns: 1fr; padding: 40px; gap: 40px; } }
        @media (max-width: 640px) { .dark-band { margin: 0 16px; padding: 28px 20px; border-radius: 20px; gap: 28px; } }
        .db-title { font-size: 36px; font-weight: 800; color: #fff; letter-spacing: -1px; line-height: 1.15; margin-bottom: 16px; }
        @media (max-width: 640px) { .db-title { font-size: 26px; } }

        .cta-final { padding: 80px 60px; text-align: center; }
        @media (max-width: 640px) { .cta-final { padding: 48px 20px; } }
        .cta-final h2 { font-size: 44px; font-weight: 800; letter-spacing: -1.5px; margin-bottom: 12px; }
        @media (max-width: 640px) { .cta-final h2 { font-size: 28px; letter-spacing: -0.5px; } }
        .cta-row { display: flex; justify-content: center; gap: 14px; flex-wrap: wrap; }

        .footer { border-top: 1px solid #F0F0F0; padding: 32px 60px; display: flex; justify-content: space-between; align-items: center; }
        @media (max-width: 640px) { .footer { padding: 24px 20px; flex-direction: column; gap: 12px; text-align: center; } }

        .btn-main { background: #1A6BFF; color: #fff; font-family: inherit; font-size: 16px; font-weight: 700; padding: 18px 24px; border-radius: 100px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: space-between; width: 100%; }
        .btn-second { background: #F5F5F5; color: #111; font-family: inherit; font-size: 16px; font-weight: 700; padding: 18px 24px; border-radius: 100px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: space-between; width: 100%; }
        .nav-btn { background: #111111; color: #fff; font-family: inherit; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 100px; border: none; cursor: pointer; display: flex; align-items: center; gap: 8px; white-space: nowrap; }
        @media (max-width: 640px) { .nav-btn { padding: 10px 20px; font-size: 13px; } }
        .db-btn { background: #1A6BFF; color: #fff; font-family: inherit; font-size: 15px; font-weight: 700; padding: 16px 28px; border-radius: 100px; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
        .cta-blue { background: #1A6BFF; color: #fff; font-family: inherit; font-size: 16px; font-weight: 700; padding: 18px 32px; border-radius: 100px; border: none; cursor: pointer; display: flex; align-items: center; gap: 10px; }
        .cta-dark { background: #111; color: #fff; font-family: inherit; font-size: 16px; font-weight: 700; padding: 18px 32px; border-radius: 100px; border: none; cursor: pointer; display: flex; align-items: center; gap: 10px; }
        @media (max-width: 640px) { .cta-blue, .cta-dark { width: 100%; justify-content: center; } }
      `}</style>

      <nav className="nav">
        <LogoSVG height={56} tone="light" />
        <button className="nav-btn" onClick={goto}>
          Commencer
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </nav>

      <section className="hero">
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#EEF4FF', color: '#1A6BFF', fontSize: 13, fontWeight: 600, padding: '6px 16px', borderRadius: 100, marginBottom: 28 }}>
            <div style={{ width: 7, height: 7, background: '#1A6BFF', borderRadius: '50%' }}></div>
            Présélection gratuite · 2 minutes
          </div>
          <h1>
            Votre crédit,<br />évalué <span style={{ color: '#1A6BFF' }}>avant</span><br />la banque.
          </h1>
          <p className="hero-sub">Remplissez notre formulaire et recevez immédiatement votre score d'éligibilité. Un conseiller vous rappelle sous 24h.</p>
          <div className="hero-btns">
            <button className="btn-main" onClick={gotoP}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="6.5" r="3.5" fill="white"/><path d="M3 17c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                Je suis un particulier
              </span>
              <span style={{ opacity: 0.55, display: 'flex', alignItems: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9h10M10 5l4 4-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
            </button>
            <button className="btn-second" onClick={gotoM}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="7" width="14" height="11" rx="1.5" stroke="#111" strokeWidth="2"/><path d="M7 18V13h6v5" stroke="#111" strokeWidth="2" strokeLinecap="round"/><path d="M6 7V4a1 1 0 011-1h6a1 1 0 011 1v3" stroke="#111" strokeWidth="2"/><rect x="7.5" y="9.5" width="2" height="2" rx="0.5" fill="#111"/><rect x="10.5" y="9.5" width="2" height="2" rx="0.5" fill="#111"/></svg>
                Mon entreprise / PME
              </span>
              <span style={{ opacity: 0.55, display: 'flex', alignItems: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9h10M10 5l4 4-4 4" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
            </button>
          </div>
        </div>

        <div className="score-card">
          <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, background: 'radial-gradient(circle, rgba(26,107,255,0.25) 0%, transparent 65%)', pointerEvents: 'none' }}></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Mayinvest</div>
            <div style={{ background: 'rgba(26,107,255,0.2)', color: '#6DAFFF', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 100, display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 2.5" stroke="#6DAFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Pré-qualifié
            </div>
          </div>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Jean-Pierre M.</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Fonctionnaire · Brazzaville</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28, background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 20 }}>
            <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
              <svg viewBox="0 0 80 80" width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="40" cy="40" r="31" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7"/>
                <circle cx="40" cy="40" r="31" fill="none" stroke="#1A6BFF" strokeWidth="7" strokeLinecap="round" strokeDasharray="196" strokeDashoffset="20"/>
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800 }}>90</div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#34D058' }}>Excellent</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Score /100 · Très éligible</div>
            </div>
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.07)', marginBottom: 20 }} />
          <div className="sc-stats">
            <div><div style={{ fontSize: 17, fontWeight: 700 }}>15M</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Montant XAF</div></div>
            <div><div style={{ fontSize: 17, fontWeight: 700 }}>7 ans</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Ancienneté</div></div>
            <div><div style={{ fontSize: 17, fontWeight: 700 }}>24h</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Réponse</div></div>
          </div>
        </div>
      </section>

      <div className="proof">
        {[
          { icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="6" width="16" height="12" rx="2.5" stroke="#1A6BFF" strokeWidth="1.8"/><path d="M6 6V5a2 2 0 012-2h6a2 2 0 012 2v1" stroke="#1A6BFF" strokeWidth="1.8"/><path d="M7 11h8M7 14h5" stroke="#1A6BFF" strokeWidth="1.8" strokeLinecap="round"/></svg>, num: '+500', label: 'Dossiers traités' },
          { icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#1A6BFF" strokeWidth="1.8"/><path d="M7.5 11l2.5 2.5 4.5-4.5" stroke="#1A6BFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>, num: '87%', label: "Taux d'accord" },
          { icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#1A6BFF" strokeWidth="1.8"/><path d="M11 7v4l2.5 2.5" stroke="#1A6BFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>, num: '24h', label: 'Délai de réponse' },
          { icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 3L4 6v5c0 4.418 3.134 8.547 7 9.5C14.866 19.547 18 15.418 18 11V6L11 3z" stroke="#1A6BFF" strokeWidth="1.8" strokeLinejoin="round"/><path d="M8 11l2 2 4-4" stroke="#1A6BFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>, num: '100%', label: 'Gratuit & sans engagement' },
        ].map((item, i) => (
          <>
            {i > 0 && <div key={`div-${i}`} className="proof-divider"></div>}
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, background: '#F0F5FF', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{item.icon}</div>
              <div><div style={{ fontSize: 26, fontWeight: 800, color: '#111' }}>{item.num}</div><div style={{ fontSize: 13, color: '#999', marginTop: 2 }}>{item.label}</div></div>
            </div>
          </>
        ))}
      </div>

      <section className="steps">
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1A6BFF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Comment ça marche</div>
        <div className="section-title">3 étapes, c'est tout.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            { n: '01', title: 'Choisissez votre profil', desc: "Particulier ou entreprise. Chaque formulaire est adapté à votre situation exacte, pas de questions inutiles." },
            { n: '02', title: 'Remplissez en 2 minutes', desc: "Nom, profession, revenu et besoin. Pas de documents à cette étape. Depuis votre téléphone." },
            { n: '03', title: 'Recevez votre score', desc: "Un score sur 100 et un verdict clair. Notre conseiller vous contacte dans les 24 heures." },
          ].map((step) => (
            <div key={step.n} style={{ display: 'grid', gridTemplateColumns: '56px 1fr', gap: 24, alignItems: 'start', padding: '28px 0', borderBottom: '1px solid #F4F4F4' }}>
              <div style={{ width: 44, height: 44, background: '#111', color: '#fff', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>{step.n}</div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{step.title}</div>
                <div style={{ fontSize: 14, color: '#777', lineHeight: 1.6 }}>{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="dark-band">
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#6DAFFF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Ce que les banques vérifient</div>
          <div className="db-title">On analyse avant eux.</div>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, marginBottom: 32 }}>Notre algorithme évalue les mêmes critères que les banques partenaires, pour vous éviter les mauvaises surprises.</div>
          <button className="db-btn" onClick={goto}>
            Démarrer ma présélection
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="8" width="16" height="11" rx="2.5" stroke="#6DAFFF" strokeWidth="1.8"/><path d="M7 8V6a2 2 0 012-2h4a2 2 0 012 2v2" stroke="#6DAFFF" strokeWidth="1.8"/><path d="M3 13h16" stroke="#6DAFFF" strokeWidth="1.8" strokeLinecap="round"/></svg>, name: 'Stabilité professionnelle', detail: 'Ancienneté, employeur, type de contrat' },
            { icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="2" y="6" width="18" height="13" rx="2.5" stroke="#6DAFFF" strokeWidth="1.8"/><path d="M2 10h18" stroke="#6DAFFF" strokeWidth="1.8"/><circle cx="15.5" cy="14.5" r="1.5" fill="#6DAFFF"/><path d="M6 6V5a3 3 0 016 0v1" stroke="#6DAFFF" strokeWidth="1.8"/></svg>, name: 'Capacité de remboursement', detail: "Revenus nets, charges, taux d'endettement" },
            { icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M2 9l9-6 9 6" stroke="#6DAFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><rect x="4" y="9" width="3" height="7" rx="1" fill="#6DAFFF" opacity="0.5"/><rect x="9.5" y="9" width="3" height="7" rx="1" fill="#6DAFFF" opacity="0.5"/><rect x="15" y="9" width="3" height="7" rx="1" fill="#6DAFFF" opacity="0.5"/><path d="M2 18h18" stroke="#6DAFFF" strokeWidth="1.8" strokeLinecap="round"/></svg>, name: 'Domiciliation bancaire', detail: 'Banque actuelle, flux mensuels, ancienneté' },
            { icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 3L4 6v5c0 4.418 3.134 8.547 7 9.5C14.866 19.547 18 15.418 18 11V6L11 3z" stroke="#6DAFFF" strokeWidth="1.8" strokeLinejoin="round"/><path d="M8 11l2 2 4-4" stroke="#6DAFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>, name: 'Garanties disponibles', detail: 'Bien immobilier, caution, nantissement' },
          ].map((crit) => (
            <div key={crit.name} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, background: 'rgba(26,107,255,0.15)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{crit.icon}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{crit.name}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{crit.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <section className="cta-final">
        <h2>Prêt à savoir où vous en êtes ?</h2>
        <p style={{ fontSize: 16, color: '#888', marginBottom: 40 }}>Gratuit · Sans engagement · Résultat immédiat</p>
        <div className="cta-row">
          <button className="cta-blue" onClick={gotoP}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="5.5" r="3" fill="white"/><path d="M2.5 15.5c0-3.59 2.91-6.5 6.5-6.5s6.5 2.91 6.5 6.5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/></svg>
            Particulier
          </button>
          <button className="cta-dark" onClick={gotoM}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2.5" y="6" width="13" height="10" rx="1.5" stroke="white" strokeWidth="1.8"/><path d="M5.5 6V4a1 1 0 011-1h5a1 1 0 011 1v2" stroke="white" strokeWidth="1.8"/><rect x="6.5" y="8.5" width="2" height="2" rx="0.5" fill="white"/><rect x="9.5" y="8.5" width="2" height="2" rx="0.5" fill="white"/></svg>
            Entreprise / PME
          </button>
        </div>
      </section>

      <footer className="footer">
        <LogoSVG height={48} tone="light" />
        <div style={{ fontSize: 13, color: '#AAAAAA' }}>© 2026 Mayinvest · Brazzaville, Congo</div>
      </footer>
    </div>
  )
}
