import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Logo } from '@/components/Logo'
import { formatPhoneInput } from '@/lib/phone'
import { AuthStyles, AuthHeader, AuthTitle, PasswordField, IconUserPlus, AlertIcon } from '@/components/AuthUI'
import { setCommercialToken } from '@/lib/session-tokens'

const VILLES = ['Brazzaville', 'Pointe-Noire', 'Dolisie', 'Nkayi', 'Ouesso', 'Owando', 'Mossendjo', 'Autre']

export const Route = createFileRoute('/rejoindre-equipe')({
  component: RejoindreEquipePage,
})

// Palette Mayinvest (depuis la landing)
const MI = {
  blue: '#2361EF',
  blueDark: '#1A4ECC',
  navy: '#0F1729',
  navyLight: '#1A2340',
  green: '#22C55E',
  grayBg: '#F7F8FA',
  grayCard: '#FFFFFF',
  grayBorder: '#E5E7EB',
  text: '#111827',
  textMuted: '#6B7280',
  gold: '#F59E0B',
}

function RejoindreEquipePage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'landing' | 'form' | 'success'>('landing')
  const [form, setForm] = useState({ prenom: '', nom: '', telephone: '', email: '', password: '', ville: '', motivation: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.prenom || !form.nom || !form.telephone || !form.email || !form.password || !form.ville) {
      setError('Les champs marqués d\'une étoile sont obligatoires.')
      return
    }
    if (form.telephone.replace(/\D/g, '').length !== 9) {
      setError('Téléphone invalide (9 chiffres).')
      return
    }
    if (form.password.length < 8) {
      setError('Le mot de passe doit faire au moins 8 caractères.')
      return
    }
    setLoading(true)
    const { data, error: rpcErr } = await supabase.rpc('inscrire_candidat', {
      p_nom: form.nom, p_prenom: form.prenom, p_telephone: form.telephone,
      p_email: form.email, p_password: form.password, p_ville: form.ville,
      p_motivation: form.motivation || null,
    })
    setLoading(false)
    if (rpcErr) { setError(rpcErr.message || 'Erreur d\'inscription.'); return }
    if (data?.id) {
      setCommercialToken((data as any).token)
      localStorage.setItem('mi_commercial_session', JSON.stringify({ id: data.id, nom: form.nom, prenom: form.prenom, email: form.email, telephone: form.telephone, ville: form.ville, status: 'formation', activated_at: null }))
      localStorage.setItem('mi_candidate_id', data.id)
      localStorage.setItem('mi_candidate_name', form.prenom)
      setStep('success')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: MI.grayBg, fontFamily: 'Inter, system-ui, sans-serif', color: MI.text }}>
      <style>{`
        * { box-sizing: border-box; }
        .mi-header { height: 72px; padding: 0 60px; display: flex; align-items: center; justify-content: space-between; background: white; border-bottom: 1px solid #F0F0F0; }
        @media (max-width: 640px) { .mi-header { height: 60px; padding: 0 16px; } }
        .mi-nav-actions { display: flex; align-items: center; gap: 10px; }
        @media (max-width: 640px) { .mi-nav-actions { gap: 6px; } }
        .mi-nav-link { color: #111; font-family: inherit; font-size: 14px; font-weight: 600; text-decoration: none; padding: 10px 16px; border-radius: 100px; display: flex; align-items: center; gap: 6px; white-space: nowrap; cursor: pointer; background: none; border: none; }
        .mi-nav-link:hover { background: #F5F5F5; }
        .mi-back-pill { background: #0D1B3E; color: #fff; border: none; padding: 10px 18px; border-radius: 100px; font-weight: 700; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-family: inherit; }
        .mi-back-pill:hover { background: #000; }
        .mi-nav-link.muted { color: #666; font-size: 13px; font-weight: 500; padding: 10px 12px; }
        @media (max-width: 640px) {
          .mi-nav-link { padding: 7px 12px; font-size: 13px; gap: 5px; }
          .mi-nav-link svg { width: 15px; height: 15px; }
          .mi-nav-link.hide-mobile { display: none; }
        }
        .mi-btn-primary { background: #111111; color: #fff; font-family: inherit; font-size: 14px; font-weight: 600; padding: 11px 22px; border-radius: 100px; border: none; cursor: pointer; display: flex; align-items: center; gap: 8px; white-space: nowrap; }
        @media (max-width: 640px) { .mi-btn-primary { padding: 8px 14px; font-size: 12px; gap: 5px; } .mi-btn-primary svg { width: 12px; height: 12px; } }

        .hero { padding: 60px 24px 80px; text-align: center; max-width: 920px; margin: 0 auto; }
        .hero-pill { display: inline-flex; align-items: center; gap: 10px; font-size: 14px; color: ${MI.text}; font-weight: 600; margin-bottom: 24px; }
.hero-pill .dot { width: 7px; height: 7px; background: #22C55E; border-radius: 50%; box-shadow: 0 0 0 4px rgba(34,197,94,0.15); animation: pulse-dot 2s ease-in-out infinite; }
.hero-pill b { color: #1A6BFF; font-weight: 800; border-bottom: 2px solid #1A6BFF; padding-bottom: 1px; }
@keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .hero h1 { font-size: 48px; font-weight: 800; line-height: 1.1; letter-spacing: -0.03em; margin: 0 0 20px; color: ${MI.navy}; }
        .hero h1 span { color: ${MI.blue}; }
        .hero p.sub { font-size: 16px; color: ${MI.textMuted}; max-width: 620px; margin: 0 auto 32px; line-height: 1.6; }
        .hero-ctas { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .btn-hero { padding: 18px 32px; border-radius: 100px; font-size: 16px; font-weight: 700; cursor: pointer; border: none; display: inline-flex; align-items: center; gap: 10px; text-decoration: none; font-family: inherit; }
        .btn-hero.primary { background: #111111; color: #fff; }
        .btn-hero.primary:hover { background: ${MI.blue}; }
        .btn-hero.secondary { background: #F5F5F5; color: #111; }
        .btn-hero.secondary:hover { background: #ECECEC; }
        @media (max-width: 640px) { .btn-hero { padding: 16px 24px; font-size: 14px; width: 100%; justify-content: center; } }

        @media (max-width: 640px) { .hero h1 { font-size: 34px; } .hero { padding: 40px 20px 60px; } }

        .benefits { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; max-width: 1040px; margin: 0 auto; padding: 0 24px 60px; }
        @media (max-width: 820px) { .benefits { grid-template-columns: 1fr; gap: 14px; } }
        .benefit { background: white; border: 1px solid ${MI.grayBorder}; border-radius: 20px; padding: 28px 24px; position: relative; overflow: hidden; transition: all 0.2s; }
        .benefit:hover { transform: translateY(-3px); box-shadow: 0 12px 30px rgba(13,23,41,0.07); }
        .benefit::before { content: attr(data-n); position: absolute; top: 14px; right: 22px; font-size: 52px; font-weight: 800; color: #F3F4F6; letter-spacing: -0.04em; line-height: 1; pointer-events: none; font-family: inherit; }
        .benefit-icon { width: 40px; height: 40px; border-radius: 12px; background: ${MI.navy}; color: #fff; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px; position: relative; }
        .benefit h3 { font-size: 17px; font-weight: 800; color: ${MI.navy}; margin: 0 0 8px; position: relative; letter-spacing: -0.01em; }
        .benefit p { font-size: 13px; color: ${MI.textMuted}; margin: 0; line-height: 1.6; position: relative; }
        .benefit p b { color: ${MI.text}; font-weight: 700; }

        .steps-box { background: ${MI.navy}; color: white; max-width: 1040px; margin: 0 auto 60px; padding: 40px 32px; border-radius: 20px; }
        .steps-box h2 { font-size: 22px; font-weight: 700; margin: 0 0 24px; text-align: center; letter-spacing: -0.02em; }
        .steps-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
        @media (max-width: 820px) { .steps-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 480px) { .steps-grid { grid-template-columns: 1fr; } }
        .step-item { text-align: center; }
        .step-num { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: ${MI.blue}; color: white; border-radius: 50%; font-weight: 800; margin-bottom: 10px; }
        .step-item h4 { font-size: 13px; font-weight: 700; margin: 0 0 4px; }
        .step-item p { font-size: 11px; color: rgba(255,255,255,0.7); margin: 0; line-height: 1.4; }

        .form-wrap { max-width: 540px; margin: 0 auto; padding: 40px 24px 80px; }
        .form-card {
          background: #fff;
          border: 1px solid #F0F0F0;
          border-radius: 24px;
          padding: 36px;
          box-shadow: 0 20px 40px rgba(13,23,41,0.06), 0 2px 6px rgba(13,23,41,0.03);
        }
        @media (max-width: 480px) { .form-card { padding: 24px 20px; border-radius: 20px; } }
        .form-card h2 { font-size: 24px; font-weight: 800; margin: 0 0 8px; color: ${MI.navy}; letter-spacing: -0.02em; }
        .form-card p.sub { font-size: 13px; color: ${MI.textMuted}; margin: 0 0 24px; }
        .field { margin-bottom: 14px; }
        .field label { display: block; font-size: 12px; font-weight: 600; color: ${MI.text}; margin-bottom: 5px; }
        .field label .req { color: #DC2626; }
        .field input, .field select, .field textarea {
          width: 100%; padding: 12px 14px; background: #fff;
          border: 1px solid ${MI.grayBorder}; border-radius: 10px;
          font-size: 14px; font-family: inherit; color: ${MI.text};
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .field input::placeholder, .field textarea::placeholder { color: ${MI.textMuted}; }
        .field input:hover, .field select:hover, .field textarea:hover { border-color: #C4C9D1; }
        .field input:focus, .field select:focus, .field textarea:focus {
          outline: none; border-color: ${MI.blue};
          box-shadow: 0 0 0 3px rgba(26,107,255,0.12);
        }
        .field select {
          appearance: none; -webkit-appearance: none; -moz-appearance: none;
          padding-right: 40px;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 14px center; background-size: 12px;
          cursor: pointer;
        }
        .field textarea { resize: vertical; min-height: 80px; }
        .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 480px) { .field-row { grid-template-columns: 1fr; } }
        .form-err { background: #FEE2E2; color: #991B1B; padding: 10px 14px; border-radius: 10px; font-size: 12px; margin-bottom: 14px; }
        .btn-submit { width: 100%; padding: 18px 24px; background: #111111; color: white; border: none; border-radius: 100px; font-size: 15px; font-weight: 700; cursor: pointer; margin-top: 8px; font-family: inherit; }
        .btn-submit:hover:not(:disabled) { background: ${MI.blue}; }
        .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

        .success-wrap { max-width: 540px; margin: 0 auto; padding: 60px 24px; text-align: center; }
        .success-icon { width: 72px; height: 72px; background: #D1FAE5; color: ${MI.green}; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px; }
        .success-wrap h2 { font-size: 26px; font-weight: 800; color: ${MI.navy}; margin: 0 0 10px; letter-spacing: -0.02em; }
        .success-wrap p { font-size: 14px; color: ${MI.textMuted}; margin: 0 0 24px; line-height: 1.6; }
      `}</style>

      <header className="mi-header">
        <Logo height={56} tone="light"/>
        <div className="mi-nav-actions">

          <Link to={'/espace-commercial' as any} className="mi-nav-link muted">
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><rect x="4" y="3" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            Déjà commercial ?
          </Link>
          <button className="mi-back-pill" onClick={() => navigate({ to: '/' })}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 7H3M6 4L3 7l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Accueil
          </button>
        </div>
      </header>

      {step === 'landing' && <>
        <section className="hero">
          <span className="hero-pill">
            <span className="dot"></span>
            Recrutement ouvert · <b>24 postes</b> au Congo
          </span>
          <h1>Rejoignez l'équipe commerciale <span>Mayinvest</span></h1>
          <p className="sub">Gagnez jusqu'à <b>500 000 XAF par mois</b> en aidant les Congolais à obtenir leur crédit bancaire. Formation payée, dashboard temps réel, paiement garanti sur chaque dossier financé.</p>
          <div className="hero-ctas">
            <button className="btn-hero primary" onClick={() => setStep('form')}>
              Postuler maintenant
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
            <a href="#benefits" className="btn-hero secondary">En savoir plus</a>
          </div>
        </section>

        <div className="benefits" id="benefits">
          <div className="benefit" data-n="01">
            <div className="benefit-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
            <h3>Commission attractive</h3>
            <p><b>50 000 XAF</b> par dossier financé. Paiement sous 7 jours après déblocage des fonds. Pas de plafond.</p>
          </div>
          <div className="benefit" data-n="02">
            <div className="benefit-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg></div>
            <h3>Dashboard temps réel</h3>
            <p>Suivi de tes gains, tes leads, ton classement. Lien unique de parrainage à partager sur WhatsApp.</p>
          </div>
          <div className="benefit" data-n="03">
            <div className="benefit-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
            <h3>Formation certifiée</h3>
            <p>3 modules (2h) + simulation pratique. Tu es accompagné dès le départ pour réussir tes premiers dossiers.</p>
          </div>
        </div>

        <div className="steps-box">
          <h2>Comment ça marche ?</h2>
          <div className="steps-grid">
            <div className="step-item"><div className="step-num">1</div><h4>Postule</h4><p>Formulaire de 2 minutes</p></div>
            <div className="step-item"><div className="step-num">2</div><h4>Formation</h4><p>3 modules + quiz obligatoires</p></div>
            <div className="step-item"><div className="step-num">3</div><h4>Simulation</h4><p>Scénarios + manipulation réelle</p></div>
            <div className="step-item"><div className="step-num">4</div><h4>Activation</h4><p>Dashboard commercial débloqué</p></div>
          </div>
        </div>
      </>}

      {step === 'form' && (
        <div className="ac-page" style={{ position: 'fixed', inset: 0, overflowY: 'auto', zIndex: 50 }}>
          <AuthStyles/>
          <AuthHeader onBack={() => setStep('landing')} backLabel="Retour" right={<Link to={'/espace-commercial' as any} className="ac-link hide-sm">Déjà commercial ?</Link>}/>
          <div className="ac-wrap">
            <div className="ac-card">
              <AuthTitle icon={<IconUserPlus/>} pill="Recrutement commercial" title="Postule en 2 minutes" subtitle="Crée ton compte, puis commence la formation tout de suite."/>
              <form onSubmit={handleSubmit}>
                <div className="ac-row">
                  <div className="ac-field">
                    <label>Prénom<span className="req"> *</span></label>
                    <input value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} autoComplete="given-name" placeholder="Ex : Jean"/>
                  </div>
                  <div className="ac-field">
                    <label>Nom<span className="req"> *</span></label>
                    <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} autoComplete="family-name" placeholder="Ex : Mabiala"/>
                  </div>
                </div>
                <div className="ac-field">
                  <label>Téléphone WhatsApp (9 chiffres)<span className="req"> *</span></label>
                  <input type="tel" inputMode="numeric" placeholder="Ex : 06 655 32 18" value={form.telephone} onChange={e => setForm({ ...form, telephone: formatPhoneInput(e.target.value) })} autoComplete="tel"/>
                </div>
                <div className="ac-field">
                  <label>Email<span className="req"> *</span></label>
                  <input type="email" placeholder="Ex : toi@exemple.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} autoComplete="email"/>
                </div>
                <PasswordField label="Mot de passe (8 caractères minimum)" required value={form.password} onChange={v => setForm({ ...form, password: v })} autoComplete="new-password" placeholder="Choisis un mot de passe"/>
                {form.password.length > 0 && form.password.length < 8 && <div className="ac-hint">Encore {8 - form.password.length} caractère(s)</div>}
                <div className="ac-field">
                  <label>Ville<span className="req"> *</span></label>
                  <div className="ac-chips">
                    {VILLES.map(v => (
                      <button type="button" key={v} className={'ac-chip ' + (form.ville === v ? 'on' : '')} onClick={() => setForm({ ...form, ville: v })}>{v}</button>
                    ))}
                  </div>
                </div>
                <div className="ac-field">
                  <label>Pourquoi rejoindre Mayinvest ? (facultatif)</label>
                  <textarea placeholder="En quelques phrases…" value={form.motivation} onChange={e => setForm({ ...form, motivation: e.target.value })}/>
                </div>
                <button type="submit" className="ac-btn" disabled={loading}>
                  {loading ? 'Envoi en cours…' : 'Envoyer ma candidature'}
                  {!loading && <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M4 9h10M10 5l4 4-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </button>
                {error && <div className="ac-err"><AlertIcon/>{error}</div>}
              </form>
              <div className="ac-foot">Déjà inscrit ? <Link to={'/espace-commercial' as any}>Se connecter</Link></div>
            </div>
          </div>
        </div>
      )}

      {step === 'success' && (
        <div className="success-wrap">
          <div className="success-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h2>Candidature reçue !</h2>
          <p>Merci {form.prenom}. Tu peux commencer la formation dès maintenant. Elle est obligatoire pour accéder à ton dashboard commercial.</p>
          <button className="btn-hero primary" onClick={() => navigate({ to: '/formation' as any })}>
            Commencer la formation
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      )}
    </div>
  )
}
