import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Logo } from '@/components/Logo'

export const Route = createFileRoute('/mon-espace')({ component: MonEspace })

type Lead = { id: string; score: number; statut: string; activite: string | null; montant_demande: number | null; identite: any; created_at: string }

// Auto-formatage téléphone congolais : "061234567" → "06 123 4567"
function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 9)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)} ${d.slice(2)}`
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`
}
function cleanPhone(v: string): string {
  return v.replace(/\D/g, '').slice(0, 9)
}

const ICONS = [
  <svg key="folder" width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" stroke="#fff" strokeWidth="2" strokeLinejoin="round"/></svg>,
  <svg key="check" width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" stroke="#fff" strokeWidth="2" strokeLinejoin="round"/><path d="M9 13l2 2 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  <svg key="search" width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M4 5h5l2 2h7a2 2 0 012 2v3" stroke="#fff" strokeWidth="2" strokeLinejoin="round"/><path d="M4 5v12a2 2 0 002 2h5" stroke="#fff" strokeWidth="2"/><circle cx="16" cy="16" r="3" stroke="#fff" strokeWidth="2"/><path d="M18.5 18.5L21 21" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>,
  <svg key="lock" width="26" height="26" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="10" rx="2" stroke="#fff" strokeWidth="2"/><path d="M8 11V7a4 4 0 018 0v4" stroke="#fff" strokeWidth="2"/><circle cx="12" cy="16" r="1.5" fill="#fff"/></svg>,
]

function MonEspace() {
  const navigate = useNavigate()
  const [tel, setTel] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<Lead[] | null>(null)
  const [iconIdx, setIconIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setIconIdx(i => (i + 1) % ICONS.length), 2000)
    return () => clearInterval(t)
  }, [])

  function nomOf(l: Lead) {
    return l.identite?.raison_sociale || `${l.identite?.prenom || ''} ${l.identite?.nom || ''}`.trim() || 'Dossier'
  }

  async function chercher() {
    if (!tel) { setError('Entrez votre numéro de téléphone'); return }
    setError(''); setLoading(true); setResults(null)
    // tel contient déjà uniquement des chiffres propres
    const last9 = tel.slice(-9)
    const { data, error: err } = await supabase.from('leads')
      .select('id, score, statut, activite, montant_demande, identite, created_at')
      .ilike('identite->>tel', `%${last9}%`)
      .order('created_at', { ascending: false })
    setLoading(false)
    if (err) { setError("Erreur de recherche. Réessayez."); return }
    if (!data || data.length === 0) {
      setError("Aucun dossier trouvé avec ce numéro. Vérifiez ou soumettez une nouvelle demande.")
      return
    }
    if (data.length === 1) {
      navigate({ to: '/client/$id', params: { id: data[0].id } })
      return
    }
    setResults(data as Lead[])
  }

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#FFFFFF', color: '#111', minHeight: '100vh', WebkitFontSmoothing: 'antialiased' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        .nav { height: 72px; padding: 0 60px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #F0F0F0; }
        @media (max-width: 640px) { .nav { height: 60px; padding: 0 16px; } }
        .nav-btn { background: #111; color: #fff; font-family: inherit; font-size: 14px; font-weight: 600; padding: 11px 22px; border-radius: 100px; border: none; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        @media (max-width: 640px) { .nav-btn { padding: 8px 14px; font-size: 12px; gap: 5px; } .nav-btn svg { width: 12px; height: 12px; } }
        .wrap { max-width: 440px; margin: 0 auto; padding: 60px 24px 80px; }
        @media (max-width: 640px) { .wrap { padding: 40px 20px 60px; } }
        .card { background: linear-gradient(145deg, #0D1B3E 0%, #0A1532 100%); border-radius: 28px; padding: 36px 32px; color: #fff; box-shadow: 0 40px 80px rgba(13,27,62,0.28); position: relative; overflow: hidden; transform: perspective(900px) rotateX(2deg); }
        .card::before { content: ''; position: absolute; top: -80px; right: -80px; width: 260px; height: 260px; background: radial-gradient(circle, rgba(26,107,255,0.3) 0%, transparent 65%); pointer-events: none; }
        .icon-wrap { width: 56px; height: 56px; background: #1A6BFF; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; position: relative; z-index: 1; box-shadow: 0 8px 20px rgba(26,107,255,0.4); overflow: hidden; }
        .icon-stage { position: relative; width: 26px; height: 26px; }
        .icon-dots { display: flex; gap: 4px; margin-bottom: 20px; position: relative; z-index: 1; }
        .icon-dots .d { width: 5px; height: 5px; border-radius: 100px; background: rgba(255,255,255,0.15); transition: all 0.3s ease; }
        .icon-dots .d.on { background: #1A6BFF; width: 16px; }
        h1 { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin: 0 0 10px; position: relative; z-index: 1; }
        .sub { font-size: 14px; color: rgba(255,255,255,0.6); line-height: 1.5; margin: 0 0 24px; position: relative; z-index: 1; }
        .field { background: rgba(255,255,255,0.08); border-radius: 14px; padding: 12px 16px; margin-bottom: 14px; position: relative; z-index: 1; border: 1.5px solid transparent; transition: all 0.15s; }
        .field:focus-within { border-color: #1A6BFF; background: rgba(255,255,255,0.12); }
        .field label { display: block; font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.5); margin-bottom: 4px; letter-spacing: 0.02em; }
        .field input { width: 100%; border: none; padding: 0; font-family: inherit; font-size: 16px; font-weight: 600; color: #fff; background: transparent; outline: none; }
        .field input::placeholder { color: rgba(255,255,255,0.3); font-weight: 400; }
        .btn { width: 100%; background: #1A6BFF; color: #fff; font-family: inherit; font-size: 15px; font-weight: 700; padding: 16px; border-radius: 100px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 8px 20px rgba(26,107,255,0.4); position: relative; z-index: 1; margin-top: 6px; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .err { color: #FF6B6B; font-size: 13px; margin-top: 10px; text-align: center; position: relative; z-index: 1; }
        .alt { text-align: center; font-size: 13px; color: #6B7280; margin-top: 24px; }
        .alt a { color: #1A6BFF; font-weight: 700; text-decoration: none; }
        .results { margin-top: 20px; display: flex; flex-direction: column; gap: 10px; }
        .result-item { background: rgba(255,255,255,0.08); border-radius: 14px; padding: 14px 16px; cursor: pointer; display: flex; align-items: center; gap: 12px; border: 1.5px solid transparent; transition: all 0.15s; position: relative; z-index: 1; }
        .result-item:hover { border-color: #1A6BFF; background: rgba(255,255,255,0.12); }
        .r-score { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 800; flex-shrink: 0; }
        .r-main { flex: 1; }
        .r-name { font-size: 14px; font-weight: 700; color: #fff; }
        .r-sub { font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 2px; }
      `}</style>

      <nav className="nav">
        <Logo height={56} tone="light" />
        <button className="nav-btn" onClick={() => navigate({ to: '/' })}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 7H3M6 4L3 7l3 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Retour à l'accueil
        </button>
      </nav>

      <div className="wrap">
        <div className="card">
          <div className="icon-wrap">
            <div className="icon-stage">
              {ICONS.map((Ic, i) => (
                <div key={i} style={{ position: 'absolute', inset: 0, opacity: i === iconIdx ? 1 : 0, transform: i === iconIdx ? 'scale(1) rotate(0)' : 'scale(0.6) rotate(-12deg)', transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(.2,.9,.3,1.2)' }}>
                  {Ic}
                </div>
              ))}
            </div>
          </div>
          <div className="icon-dots" aria-hidden="true">
            {ICONS.map((_, i) => <div key={i} className={`d ${i === iconIdx ? 'on' : ''}`} />)}
          </div>

          <h1>Mon dossier</h1>
          <p className="sub">Retrouvez l'état de votre dossier et échangez avec votre conseiller. Entrez le numéro de téléphone utilisé lors de votre demande.</p>

          <div className="field">
            <label>Téléphone</label>
            {/* ✅ Auto-formatage XX XXX XXXX pendant la saisie */}
            <input
              type="tel"
              inputMode="numeric"
              placeholder="06 123 4567"
              maxLength={11}
              value={formatPhone(tel)}
              onChange={e => { setTel(cleanPhone(e.target.value)); setError(''); setResults(null) }}
              onKeyDown={e => { if (e.key === 'Enter') chercher() }}
            />
          </div>

          <button className="btn" disabled={loading || tel.length < 9} onClick={chercher}>
            {loading ? 'Recherche...' : 'Voir mon dossier'}
            {!loading && <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </button>

          {error && <div className="err">{error}</div>}

          {results && results.length > 1 && <>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 20, marginBottom: 4, position: 'relative', zIndex: 1 }}>Plusieurs dossiers trouvés — choisissez :</div>
            <div className="results">
              {results.map(r => {
                const scoreColor = r.score >= 70 ? '#34D058' : r.score >= 50 ? '#FFB020' : '#FF6B6B'
                return (
                  <div key={r.id} className="result-item" onClick={() => navigate({ to: '/client/$id', params: { id: r.id } })}>
                    <div className="r-score" style={{ background: `${scoreColor}26`, color: scoreColor, border: `2px solid ${scoreColor}` }}>{r.score}</div>
                    <div className="r-main">
                      <div className="r-name">{nomOf(r)}</div>
                      <div className="r-sub">{r.activite || '—'} · {r.montant_demande ? `${(r.montant_demande/1e6).toFixed(1)}M XAF` : '—'} · {new Date(r.created_at).toLocaleDateString('fr')}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                )
              })}
            </div>
          </>}
        </div>

        <div className="alt">
          Pas encore de dossier ? <a href="/preselection" onClick={(e) => { e.preventDefault(); navigate({ to: '/preselection' }) }}>Démarrer ma présélection</a>
        </div>
      </div>
    </div>
  )
}
