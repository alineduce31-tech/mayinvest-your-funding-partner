import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Logo } from '@/components/Logo'

export const Route = createFileRoute('/mon-espace')({
  component: MonEspace,
})

/* ---------- Helpers ---------- */
function formatPhone(d: string): string {
  const x = d.replace(/\D/g, '').slice(0, 9)
  if (x.length <= 2) return x
  if (x.length <= 5) return `${x.slice(0, 2)} ${x.slice(2)}`
  return `${x.slice(0, 2)} ${x.slice(2, 5)} ${x.slice(5)}`
}
function cleanPhone(v: string): string { return v.replace(/\D/g, '').slice(0, 9) }
function formatCode(v: string): string {
  let s = v.toUpperCase().replace(/[^A-Z0-9-]/g, '')
  if (!s.startsWith('MYI-')) s = 'MYI-' + s.replace(/^MYI-?/, '')
  return s.slice(0, 11)
}

/* ---------- Mascotte Mia ---------- */
const TIPS: Record<string, { title: string; body: string }> = {
  'phone': { title: 'Accès par téléphone', body: "Entrez votre numéro (celui du dossier) et votre code MYI-XXX. Vous retrouverez tous vos dossiers." },
  'code': { title: 'Accès par code', body: "Entrez uniquement votre code MYI-XXX, c'est le moyen le plus rapide." },
  'email': { title: 'Accès par email', body: "Entrez l'email utilisé lors de l'inscription et votre code MYI-XXX." },
  'nocode': { title: 'Code perdu ?', body: "Pas de panique. Contactez-nous sur WhatsApp, un conseiller retrouve votre dossier." },
}
function Mascot({ tipKey, open, setOpen }: { tipKey: string; open: boolean; setOpen: (v: boolean) => void }) {
  const tip = TIPS[tipKey] || TIPS['phone']
  return (
    <>
      <button className={`mascot-fab ${open ? 'on' : ''}`} onClick={() => setOpen(!open)} aria-label="Aide">
        <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="14" fill="#1A6BFF"/>
          <circle cx="11.5" cy="14" r="1.8" fill="#fff"/>
          <circle cx="20.5" cy="14" r="1.8" fill="#fff"/>
          <path d="M11 20c1.5 1.5 3 2 5 2s3.5-.5 5-2" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="23" cy="9" r="3" fill="#34D058"/>
        </svg>
        {!open && <span className="mascot-pulse" />}
      </button>
      {open && (
        <div className="mascot-bubble">
          <button className="mascot-close" onClick={() => setOpen(false)} aria-label="Fermer">×</button>
          <div className="mascot-title">
            <span className="mascot-avatar">
              <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="14" fill="#1A6BFF"/>
                <circle cx="11.5" cy="14" r="1.6" fill="#fff"/>
                <circle cx="20.5" cy="14" r="1.6" fill="#fff"/>
                <path d="M11 20c1.5 1.5 3 2 5 2s3.5-.5 5-2" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </span>
            <span>Mia · {tip.title}</span>
          </div>
          <div className="mascot-body">{tip.body}</div>
        </div>
      )}
    </>
  )
}

/* ---------- Composant ---------- */
type Mode = 'phone' | 'code' | 'email'

function MonEspace() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('phone')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('MYI-')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [mascotOpen, setMascotOpen] = useState(false)

  // Icône animée en rotation (folder / check / search / lock)
  const [iconIdx, setIconIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setIconIdx(i => (i + 1) % 4), 2200)
    return () => clearInterval(t)
  }, [])

  // Pré-remplir le code depuis localStorage selon le mode
  useEffect(() => {
    try {
      if (mode === 'phone' && phone.length === 9) {
        const stored = localStorage.getItem(`mayinvest_phone_${phone}`)
        if (stored) setCode(stored)
      } else if (mode === 'email' && email.includes('@')) {
        const stored = localStorage.getItem(`mayinvest_email_${email.toLowerCase()}`)
        if (stored) setCode(stored)
      }
    } catch {}
  }, [mode, phone, email])

  async function chercher() {
    setLoading(true)
    setError('')
    setResults([])
    if (code.length < 11) {
      setError("Code invalide. Format attendu : MYI-XXXXXXX")
      setLoading(false)
      return
    }
    try {
      let data: any = null; let err: any = null
      if (mode === 'phone') {
        if (phone.length !== 9) { setError('Numéro invalide (9 chiffres).'); setLoading(false); return }
        const r = await supabase.rpc('find_leads_by_phone_code', { p_phone: phone, p_code: code })
        data = r.data; err = r.error
      } else if (mode === 'email') {
        if (!email.includes('@')) { setError('Email invalide.'); setLoading(false); return }
        const r = await supabase.rpc('find_leads_by_email_code', { p_email: email.toLowerCase().trim(), p_code: code })
        data = r.data; err = r.error
      } else {
        const r = await supabase.rpc('find_lead_by_code', { p_code: code })
        data = r.data; err = r.error
      }
      setLoading(false)
      if (err) { setError("Impossible de retrouver votre dossier : " + err.message); return }
      if (!data || data.length === 0) { setError("Aucun dossier trouvé. Vérifiez vos informations ou contactez un conseiller."); return }
      setResults(data)
      // Si un seul résultat → redirection directe avec le code mémorisé
      if (data.length === 1) {
        try {
          localStorage.setItem(`mayinvest_code_${data[0].id}`, code)
          if (phone) localStorage.setItem(`mayinvest_phone_${phone}`, code)
          if (email) localStorage.setItem(`mayinvest_email_${email.toLowerCase()}`, code)
        } catch {}
        navigate({ to: '/client/$id', params: { id: data[0].id } })
      }
    } catch (e: any) {
      setLoading(false)
      setError('Erreur réseau : ' + (e?.message || 'inconnue'))
    }
  }

  function ouvrirDossier(id: string) {
    try { localStorage.setItem(`mayinvest_code_${id}`, code) } catch {}
    navigate({ to: '/client/$id', params: { id } })
  }

  const icons = [
    <svg key="f" width="36" height="36" viewBox="0 0 32 32" fill="none"><path d="M4 8h8l2 2h14v14a2 2 0 01-2 2H4a2 2 0 01-2-2V10a2 2 0 012-2z" stroke="#1A6BFF" strokeWidth="2.4" strokeLinejoin="round"/></svg>,
    <svg key="c" width="36" height="36" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="12" stroke="#34D058" strokeWidth="2.4"/><path d="M10 16l4 4 8-8" stroke="#34D058" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    <svg key="s" width="36" height="36" viewBox="0 0 32 32" fill="none"><circle cx="14" cy="14" r="8" stroke="#1A6BFF" strokeWidth="2.4"/><path d="M20 20l6 6" stroke="#1A6BFF" strokeWidth="2.4" strokeLinecap="round"/></svg>,
    <svg key="l" width="36" height="36" viewBox="0 0 32 32" fill="none"><rect x="7" y="14" width="18" height="13" rx="2" stroke="#0D1B3E" strokeWidth="2.4"/><path d="M11 14v-4a5 5 0 0110 0v4" stroke="#0D1B3E" strokeWidth="2.4"/></svg>,
  ]

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#F8FAFC', color: '#111', minHeight: '100vh', WebkitFontSmoothing: 'antialiased' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        input, select { font-size: 16px !important; }
        .top { position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,0.92); backdrop-filter: saturate(180%) blur(14px); -webkit-backdrop-filter: saturate(180%) blur(14px); height: 72px; padding: 0 60px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #F0F0F0; }
        @media (max-width: 640px) { .top { height: 60px; padding: 0 16px; } }
        .back { background: #111; color: #fff; font-size: 14px; font-weight: 600; padding: 11px 22px; border-radius: 100px; border: none; cursor: pointer; display: flex; align-items: center; gap: 8px; text-decoration: none; }
        @media (max-width: 640px) { .back { padding: 8px 14px; font-size: 12px; } .back svg { width: 12px; height: 12px; } }
        .wrap { max-width: 520px; margin: 0 auto; padding: 40px 24px 60px; }
        .hero-icon { width: 72px; height: 72px; border-radius: 20px; background: #fff; box-shadow: 0 12px 28px rgba(13,27,62,0.08), 0 4px 8px rgba(13,27,62,0.04); display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; position: relative; overflow: hidden; }
        .hero-icon .icon-slot { animation: iconFade 0.6s ease; }
        @keyframes iconFade { from { opacity: 0; transform: scale(0.7) rotate(-20deg);} to { opacity: 1; transform: scale(1) rotate(0);} }
        .h1 { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; text-align: center; margin: 0 0 8px; line-height: 1.15; }
        @media (min-width: 640px) { .h1 { font-size: 34px; } }
        .sub { font-size: 15px; color: #666; text-align: center; margin: 0 0 28px; }
        .tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; background: #EEF2F7; padding: 5px; border-radius: 14px; margin-bottom: 20px; }
        .tab { background: transparent; border: none; font-family: inherit; font-size: 13px; font-weight: 700; color: #666; padding: 10px 6px; border-radius: 10px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px; transition: all 0.15s; }
        .tab svg { width: 18px; height: 18px; }
        .tab:hover { color: #111; }
        .tab.on { background: #fff; color: #1A6BFF; box-shadow: 0 2px 6px rgba(13,27,62,0.08); }
        .card { background: #fff; border-radius: 20px; padding: 24px 22px; box-shadow: 0 10px 30px rgba(13,27,62,0.06), 0 2px 6px rgba(13,27,62,0.03); }
        .fields { display: flex; flex-direction: column; gap: 10px; }
        .field { background: #F8FAFC; border: 1.5px solid #E5E7EB; border-radius: 14px; padding: 12px 16px; transition: all 0.15s; }
        .field:focus-within { background: #fff; border-color: #1A6BFF; box-shadow: 0 4px 12px rgba(26,107,255,0.12); }
        .field label { display: block; font-size: 11px; font-weight: 600; color: #888; margin-bottom: 2px; }
        .field input { width: 100%; border: none; padding: 0; font-family: inherit; font-weight: 500; color: #111; background: transparent; outline: none; }
        .field input::placeholder { color: #BBB; font-weight: 400; }
        .btn-main { width: 100%; background: #1A6BFF; color: #fff; font-family: inherit; font-size: 15px; font-weight: 700; padding: 16px 24px; border-radius: 100px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 8px 20px rgba(26,107,255,0.3); margin-top: 16px; transition: all 0.2s; }
        .btn-main:hover:not(:disabled) { background: #1560E0; transform: translateY(-1px); }
        .btn-main:disabled { background: #C7D0DB; cursor: not-allowed; box-shadow: none; }
        .btn-wa { width: 100%; background: #25D366; color: #fff; font-family: inherit; font-size: 14px; font-weight: 700; padding: 14px 20px; border-radius: 100px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 10px; }
        .error { background: #FEF2F2; border: 1.5px solid #FCA5A5; color: #B91C1C; font-size: 13px; font-weight: 600; padding: 12px 16px; border-radius: 12px; margin-top: 12px; }
        .results { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
        .result { background: #fff; border: 1.5px solid #E5E7EB; border-radius: 14px; padding: 14px 16px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 12px; transition: all 0.15s; font-family: inherit; text-align: left; }
        .result:hover { border-color: #1A6BFF; box-shadow: 0 6px 14px rgba(26,107,255,0.1); }
        .result-l { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
        .result-title { font-size: 14px; font-weight: 700; color: #111; }
        .result-meta { font-size: 12px; color: #666; }
        .result-score { background: #EEF4FF; color: #1A6BFF; font-size: 12px; font-weight: 800; padding: 6px 10px; border-radius: 8px; flex-shrink: 0; }
        .help { text-align: center; margin-top: 18px; font-size: 13px; color: #666; }
        .help a { color: #1A6BFF; font-weight: 700; text-decoration: none; }

        /* Mascotte */
        .mascot-fab { position: fixed; right: 18px; bottom: 18px; width: 56px; height: 56px; border-radius: 50%; border: none; background: #fff; box-shadow: 0 10px 24px rgba(13,27,62,0.2), 0 2px 6px rgba(13,27,62,0.1); cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 60; transition: transform 0.2s; }
        .mascot-fab:hover { transform: scale(1.06); }
        .mascot-fab.on { background: #EEF4FF; }
        .mascot-pulse { position: absolute; top: 4px; right: 4px; width: 10px; height: 10px; border-radius: 50%; background: #34D058; box-shadow: 0 0 0 0 rgba(52,208,88,0.6); animation: mia-pulse 2s infinite; }
        @keyframes mia-pulse { 0% { box-shadow: 0 0 0 0 rgba(52,208,88,0.6);} 70% { box-shadow: 0 0 0 10px rgba(52,208,88,0);} 100% { box-shadow: 0 0 0 0 rgba(52,208,88,0);} }
        .mascot-bubble { position: fixed; right: 18px; bottom: 86px; width: calc(100% - 36px); max-width: 300px; background: #fff; border-radius: 16px; box-shadow: 0 20px 40px rgba(13,27,62,0.18), 0 6px 14px rgba(13,27,62,0.08); padding: 14px 16px 16px; z-index: 60; border: 1px solid #EEF4FF; animation: mia-pop 0.22s ease-out; }
        @keyframes mia-pop { from { opacity: 0; transform: translateY(8px) scale(0.98);} to { opacity: 1; transform: translateY(0) scale(1);} }
        .mascot-close { position: absolute; top: 6px; right: 10px; background: transparent; border: none; font-size: 20px; color: #888; cursor: pointer; line-height: 1; }
        .mascot-title { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 800; color: #0D1B3E; margin-bottom: 6px; padding-right: 20px; }
        .mascot-avatar { width: 26px; height: 26px; border-radius: 50%; overflow: hidden; display: inline-flex; align-items: center; justify-content: center; }
        .mascot-body { font-size: 13px; color: #444; line-height: 1.45; }
      `}</style>

      <div className="top">
        <Logo height={56} tone="light" />
        <a className="back" href="/" onClick={(e) => { e.preventDefault(); navigate({ to: '/' }) }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 7H3M6 4L3 7l3 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Retour à l'accueil
        </a>
      </div>

      <div className="wrap">
        <div className="hero-icon">
          <span key={iconIdx} className="icon-slot">{icons[iconIdx]}</span>
        </div>
        <h1 className="h1">Accédez à votre dossier</h1>
        <p className="sub">Choisissez votre mode d'accès.</p>

        <div className="tabs">
          <button className={`tab ${mode === 'phone' ? 'on' : ''}`} onClick={() => { setMode('phone'); setError('') }}>
            <svg viewBox="0 0 24 24" fill="none"><path d="M4 5a2 2 0 012-2h2l2 5-2 1a9 9 0 006 6l1-2 5 2v2a2 2 0 01-2 2A14 14 0 014 5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
            Téléphone
          </button>
          <button className={`tab ${mode === 'code' ? 'on' : ''}`} onClick={() => { setMode('code'); setError('') }}>
            <svg viewBox="0 0 24 24" fill="none"><rect x="4" y="7" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M8 12h.01M12 12h.01M16 12h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/></svg>
            Code
          </button>
          <button className={`tab ${mode === 'email' ? 'on' : ''}`} onClick={() => { setMode('email'); setError('') }}>
            <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M3 7l9 7 9-7" stroke="currentColor" strokeWidth="1.8"/></svg>
            Email
          </button>
        </div>

        <div className="card">
          <div className="fields">
            {mode === 'phone' && (
              <div className="field">
                <label>Numéro de téléphone</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="Ex : 06 123 4567"
                  maxLength={11}
                  value={formatPhone(phone)}
                  onChange={e => setPhone(cleanPhone(e.target.value))}
                />
              </div>
            )}
            {mode === 'email' && (
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="Ex : jp.moukouama@gmail.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            )}
            <div className="field">
              <label>Code d'accès</label>
              <input
                placeholder="MYI-ABC1234"
                maxLength={11}
                value={code}
                onChange={e => setCode(formatCode(e.target.value))}
                style={{ fontFamily: "'SF Mono', 'Monaco', 'Consolas', monospace", letterSpacing: '0.05em', fontWeight: 700 }}
              />
            </div>
          </div>

          <button
            className="btn-main"
            disabled={loading || code.length < 11 || (mode === 'phone' && phone.length !== 9) || (mode === 'email' && !email.includes('@'))}
            onClick={chercher}
          >
            {loading ? 'Recherche…' : 'Accéder à mon dossier'}
            {!loading && <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9h10M10 5l4 4-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </button>

          {error && <div className="error">{error}</div>}

          {results.length > 1 && (
            <div className="results">
              {results.map(r => (
                <button key={r.id} className="result" onClick={() => ouvrirDossier(r.id)}>
                  <div className="result-l">
                    <div className="result-title">{r.activite || 'Dossier'} · {r.type === 'physique' ? 'Particulier' : 'PME'}</div>
                    <div className="result-meta">{r.ville || ''} · {new Date(r.created_at).toLocaleDateString('fr-FR')} · {r.statut}</div>
                  </div>
                  <div className="result-score">{r.score}/100</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="help">
          Code perdu ?{' '}
          <a
            href="https://wa.me/242060000000?text=Bonjour%20Mayinvest%2C%20j%27ai%20perdu%20mon%20code%20d%27acc%C3%A8s"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMascotOpen(true)}
          >
            Contacter un conseiller sur WhatsApp
          </a>
        </div>

        <button className="btn-wa" onClick={() => window.open('https://wa.me/242060000000?text=Bonjour%20Mayinvest', '_blank')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M17.5 14.4l-2.4-1.2c-.3-.2-.7-.1-1 .2l-.7.8c-.2.2-.5.3-.8.1-.9-.4-1.8-1-2.6-1.7-.7-.8-1.3-1.7-1.7-2.6-.1-.3 0-.6.2-.8l.8-.7c.3-.2.4-.6.2-1L8.3 5c-.2-.4-.7-.5-1-.3L5.5 6c-.5.2-.8.7-.7 1.2.4 2.8 1.7 5.4 3.6 7.4 2 2 4.6 3.3 7.4 3.6.5.1 1-.2 1.2-.7l1.3-1.8c.2-.4.1-.9-.3-1.1l-.5-.2z"/></svg>
          Discuter avec un expert
        </button>
      </div>

      <Mascot tipKey={mode} open={mascotOpen} setOpen={setMascotOpen} />
    </div>
  )
}
