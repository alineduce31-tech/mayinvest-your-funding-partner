import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/integrations/supabase/client'

export const Route = createFileRoute('/candidatures')({
  component: CandidaturesPage,
})

type Candidate = {
  id: string; nom: string; prenom: string; telephone: string; email: string | null;
  ville: string; motivation: string | null; status: string;
  score_quiz: number; score_simulation_theo: number; score_simulation_prat: number;
  score_total: number; time_total_seconds: number;
  refused_reason: string | null; activated_at: string | null;
  created_at: string;
}
type QuizAttempt = { candidate_id: string; module_id: string; score: number; passed: boolean; time_seconds: number }
type SimAttempt = { candidate_id: string; scenario_id: string; points_earned: number; time_seconds: number }
type PracAttempt = { candidate_id: string; epreuve: number; score: number; time_seconds: number }

const ADMIN_SESSION_KEY = 'mayinvest_admin_session'

function CandidaturesPage() {
  const navigate = useNavigate()
  const [authChecked, setAuthChecked] = useState(false)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'valide' | 'refuse'>('pending')
  const [selected, setSelected] = useState<Candidate | null>(null)
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([])
  const [simAttempts, setSimAttempts] = useState<SimAttempt[]>([])
  const [pracAttempts, setPracAttempts] = useState<PracAttempt[]>([])
  const [loading, setLoading] = useState(true)

  // Vérifie la session admin (réutilise celle de /mon-espace)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ADMIN_SESSION_KEY)
      if (!raw) { navigate({ to: '/mon-espace' as any }); return }
      const s = JSON.parse(raw)
      if (!s?.email || !s?.expiresAt || s.expiresAt < Date.now()) {
        navigate({ to: '/mon-espace' as any }); return
      }
      setAuthChecked(true)
    } catch { navigate({ to: '/mon-espace' as any }) }
  }, [navigate])
  const [refuseModal, setRefuseModal] = useState<Candidate | null>(null)
  const [refuseReason, setRefuseReason] = useState('')

  async function loadAll() {
    setLoading(true)
    const [cRes, qRes, sRes, pRes] = await Promise.all([
      supabase.from('commercial_candidates').select('*').order('created_at', { ascending: false }),
      supabase.from('quiz_attempts').select('*'),
      supabase.from('simulation_attempts').select('*'),
      supabase.from('practical_attempts').select('*'),
    ])
    if (cRes.data) setCandidates(cRes.data as Candidate[])
    if (qRes.data) setQuizAttempts(qRes.data as QuizAttempt[])
    if (sRes.data) setSimAttempts(sRes.data as SimAttempt[])
    if (pRes.data) setPracAttempts(pRes.data as PracAttempt[])
    setLoading(false)
  }
  useEffect(() => { if (authChecked) loadAll() }, [authChecked])

  const filtered = useMemo(() => {
    return candidates.filter(c => {
      if (filter === 'pending') return c.status === 'en_attente_validation'
      if (filter === 'valide') return c.status === 'valide'
      if (filter === 'refuse') return c.status === 'refuse'
      return true
    })
  }, [candidates, filter])

  const counts = useMemo(() => ({
    pending: candidates.filter(c => c.status === 'en_attente_validation').length,
    valide: candidates.filter(c => c.status === 'valide').length,
    refuse: candidates.filter(c => c.status === 'refuse').length,
    all: candidates.length,
  }), [candidates])

  // Médianes pour comparatif
  const medianTime = useMemo(() => {
    const times = candidates.filter(c => c.time_total_seconds > 0).map(c => c.time_total_seconds).sort((a, b) => a - b)
    return times.length ? times[Math.floor(times.length / 2)] : 0
  }, [candidates])

  if (!authChecked) return <div style={{ padding: 60, textAlign: 'center', fontSize: 13, color: '#6B7280' }}>Vérification…</div>

  async function validate(c: Candidate) {
    const { error } = await supabase.from('commercial_candidates').update({
      status: 'valide',
      activated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', c.id)
    if (!error) { await loadAll(); setSelected(null) }
  }

  async function refuse() {
    if (!refuseModal || !refuseReason.trim()) return
    const { error } = await supabase.from('commercial_candidates').update({
      status: 'refuse',
      refused_reason: refuseReason,
      updated_at: new Date().toISOString(),
    }).eq('id', refuseModal.id)
    if (!error) { await loadAll(); setRefuseModal(null); setRefuseReason(''); setSelected(null) }
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}>Chargement…</div>

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8', fontFamily: 'Inter, system-ui, sans-serif', color: '#111827' }}>
      <style>{`
        * { box-sizing: border-box; }
        .cd-header { padding: 18px 32px; background: #FFFFFF; border-bottom: 1px solid #ECECEA; display: flex; justify-content: space-between; align-items: center; }
        .cd-header h1 { font-size: 20px; font-weight: 800; margin: 0; color: #0F1729; letter-spacing: -0.02em; }
        .cd-back { font-size: 12px; color: #6B7280; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; }
        .cd-back:hover { color: #0F6E3E; }

        .cd-wrap { max-width: 1200px; margin: 0 auto; padding: 24px 32px; display: grid; grid-template-columns: ${selected ? '1fr 440px' : '1fr'}; gap: 20px; }
        @media (max-width: 980px) { .cd-wrap { grid-template-columns: 1fr; } }

        .cd-tabs { display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; }
        .cd-tab { padding: 8px 14px; background: #FFFFFF; border: 1px solid #ECECEA; border-radius: 999px; cursor: pointer; font-size: 12px; font-weight: 600; color: #6B7280; font-family: inherit; }
        .cd-tab.active { background: #0F6E3E; color: white; border-color: #0F6E3E; }
        .cd-tab-count { margin-left: 6px; font-weight: 700; opacity: 0.8; }

        .cd-list { background: white; border: 1px solid #ECECEA; border-radius: 12px; overflow: hidden; }
        .cd-row { display: grid; grid-template-columns: 1fr 100px 90px 100px 80px; align-items: center; gap: 12px; padding: 14px 18px; border-bottom: 1px solid #F3F3F1; cursor: pointer; transition: background 0.1s; }
        @media (max-width: 720px) { .cd-row { grid-template-columns: 1fr 70px 70px; } .cd-row .hide-mobile { display: none; } }
        .cd-row:hover { background: #E6F2EB; }
        .cd-row.selected { background: #E6F2EB; }
        .cd-row:last-child { border-bottom: none; }
        .cd-row-name { display: flex; align-items: center; gap: 10px; }
        .cd-ava { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #2361EF, #7C3AED); color: white; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; }
        .cd-row-name strong { font-size: 13px; font-weight: 700; color: #111827; display: block; }
        .cd-row-name small { font-size: 11px; color: #6B7280; display: block; margin-top: 1px; }
        .cd-score { font-size: 15px; font-weight: 800; text-align: center; font-variant-numeric: tabular-nums; }
        .cd-score.hi { color: #0F6E3E; }
        .cd-score.mid { color: #B4871F; }
        .cd-score.lo { color: #B42318; }
        .cd-score small { font-size: 10px; color: #9CA3AF; font-weight: 500; display: block; margin-top: 1px; }
        .cd-time { font-size: 11px; color: #6B7280; text-align: center; font-variant-numeric: tabular-nums; font-weight: 600; }
        .cd-time.fast { color: #0F6E3E; }
        .cd-time.slow { color: #B4871F; }
        .cd-status { padding: 3px 10px; border-radius: 999px; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; text-align: center; white-space: nowrap; }
        .cd-status.pending { background: #FEF3C7; color: #92400E; }
        .cd-status.valide { background: #D1FAE5; color: #047857; }
        .cd-status.refuse { background: #FEE2E2; color: #991B1B; }
        .cd-status.encours { background: #DBEAFE; color: #1D4ED8; }

        .cd-empty { padding: 60px 20px; text-align: center; color: #6B7280; font-size: 13px; }

        /* Panneau détail */
        .cd-panel { background: white; border: 1px solid #ECECEA; border-radius: 14px; padding: 0; overflow: hidden; height: fit-content; position: sticky; top: 90px; }
        .cd-panel-head { padding: 20px; background: linear-gradient(135deg, #E6F2EB 0%, transparent 60%); border-bottom: 1px solid #ECECEA; display: flex; justify-content: space-between; align-items: center; }
        .cd-panel-close { background: #F3F3F1; border: none; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #6B7280; }
        .cd-panel-body { padding: 20px; max-height: calc(100vh - 220px); overflow-y: auto; }
        .cd-panel h3 { font-size: 16px; font-weight: 700; margin: 0 0 4px; color: #0F1729; }
        .cd-panel .meta { font-size: 11px; color: #6B7280; margin: 0; }

        .cd-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; margin: 16px 0; font-size: 12px; }
        .cd-info-grid .k { color: #6B7280; font-weight: 500; }
        .cd-info-grid .v { color: #111827; font-weight: 600; text-align: right; }

        .cd-sec-title { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #6B7280; margin: 18px 0 10px; padding-bottom: 6px; border-bottom: 1px solid #F3F3F1; }

        .cd-breakdown { background: #F3F3F1; border-radius: 10px; padding: 12px; margin-bottom: 10px; }
        .cd-break-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; font-size: 12px; }
        .cd-break-row b { font-weight: 700; color: #111827; font-variant-numeric: tabular-nums; }
        .cd-break-row .pts { font-weight: 700; font-variant-numeric: tabular-nums; }
        .cd-break-row .pts.hi { color: #0F6E3E; }
        .cd-break-row .pts.mid { color: #B4871F; }
        .cd-break-row .pts.lo { color: #B42318; }
        .cd-break-time { font-size: 10px; color: #9CA3AF; margin-left: 8px; font-weight: 500; }

        .cd-chrono { background: #EDE9FE; border-radius: 10px; padding: 12px 14px; margin-top: 10px; }
        .cd-chrono-head { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #7C3AED; font-weight: 700; margin-bottom: 8px; letter-spacing: 0.05em; text-transform: uppercase; }
        .cd-chrono-row { display: flex; justify-content: space-between; font-size: 11px; color: #374151; padding: 3px 0; }
        .cd-chrono-row b { color: #111827; font-weight: 700; font-variant-numeric: tabular-nums; }
        .cd-chrono-bar { height: 5px; background: white; border-radius: 3px; overflow: hidden; margin: 6px 0 4px; }
        .cd-chrono-bar-fill { height: 100%; background: #7C3AED; }

        .cd-motivation { background: #FEF3C7; border-left: 3px solid #F59E0B; padding: 10px 14px; border-radius: 0 10px 10px 0; font-size: 12px; color: #92400E; font-style: italic; line-height: 1.5; }

        .cd-actions { display: flex; gap: 8px; margin-top: 18px; padding-top: 14px; border-top: 1px solid #ECECEA; }
        .cd-btn-val { flex: 1; padding: 12px; background: #0F6E3E; color: white; border: none; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; }
        .cd-btn-val:hover { background: #0A5530; }
        .cd-btn-ref { padding: 12px 18px; background: #FEE2E2; color: #B42318; border: 1px solid #FCA5A5; border-radius: 10px; font-size: 12px; font-weight: 600; cursor: pointer; }
        .cd-btn-ref:hover { background: #FCA5A5; color: white; }

        /* Modal refus */
        .modal-ovr { position: fixed; inset: 0; background: rgba(13,23,41,0.6); backdrop-filter: blur(4px); z-index: 300; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal { background: white; border-radius: 14px; max-width: 420px; width: 100%; padding: 24px; }
        .modal h3 { margin: 0 0 8px; font-size: 16px; font-weight: 700; }
        .modal p { font-size: 13px; color: #6B7280; margin: 0 0 14px; }
        .modal textarea { width: 100%; min-height: 80px; padding: 10px 12px; background: #F3F3F1; border: 1px solid #ECECEA; border-radius: 8px; font-size: 13px; font-family: inherit; }
        .modal-actions { display: flex; gap: 8px; margin-top: 16px; }
        .modal-actions button { flex: 1; padding: 10px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; border: none; font-family: inherit; }
        .modal-btn-cancel { background: #F3F3F1; color: #6B7280; }
        .modal-btn-confirm { background: #B42318; color: white; }
      `}</style>

      <header className="cd-header">
        <div>
          <h1>Candidatures commerciales</h1>
          <Link to="/admin" className="cd-back">← Retour à l'admin</Link>
        </div>
        <nav style={{ display: 'flex', gap: 6 }}>
          <Link to={'/candidatures' as any} style={{ padding: '7px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600, textDecoration: 'none', background: '#0F6E3E', color: '#fff' }}>Candidatures</Link>
          <Link to={'/equipe-commerciale' as any} style={{ padding: '7px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600, color: '#6B7280', textDecoration: 'none' }}>Équipe</Link>
        </nav>
        <div style={{ fontSize: 12, color: '#6B7280' }}>
          {counts.pending > 0 && <span style={{ color: '#B45309', fontWeight: 700 }}>{counts.pending} en attente</span>}
          {counts.pending > 0 && ' · '}
          {counts.all} candidat{counts.all > 1 ? 's' : ''} au total
        </div>
      </header>

      <div className="cd-wrap">
        <div>
          <div className="cd-tabs">
            <button className={`cd-tab${filter === 'pending' ? ' active' : ''}`} onClick={() => setFilter('pending')}>À valider <span className="cd-tab-count">{counts.pending}</span></button>
            <button className={`cd-tab${filter === 'valide' ? ' active' : ''}`} onClick={() => setFilter('valide')}>Validés <span className="cd-tab-count">{counts.valide}</span></button>
            <button className={`cd-tab${filter === 'refuse' ? ' active' : ''}`} onClick={() => setFilter('refuse')}>Refusés <span className="cd-tab-count">{counts.refuse}</span></button>
            <button className={`cd-tab${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>Tous <span className="cd-tab-count">{counts.all}</span></button>
          </div>

          <div className="cd-list">
            {filtered.length === 0 ? (
              <div className="cd-empty">Aucun candidat dans cette catégorie.</div>
            ) : filtered.map(c => {
              const totalPts = (c.score_quiz || 0) + (c.score_simulation_theo || 0) + (c.score_simulation_prat || 0)
              const totalMax = 15 + 100 + 60
              const scorePct = Math.round((totalPts / totalMax) * 100)
              const scoreCls = scorePct >= 70 ? 'hi' : scorePct >= 50 ? 'mid' : 'lo'
              const tCls = c.time_total_seconds && medianTime ? (c.time_total_seconds < medianTime * 0.85 ? 'fast' : c.time_total_seconds > medianTime * 1.3 ? 'slow' : '') : ''
              const statusCls = c.status === 'en_attente_validation' ? 'pending' : c.status === 'valide' ? 'valide' : c.status === 'refuse' ? 'refuse' : 'encours'
              const statusLbl = c.status === 'en_attente_validation' ? 'À valider' : c.status === 'valide' ? 'Validé' : c.status === 'refuse' ? 'Refusé' : c.status
              const mins = c.time_total_seconds ? Math.floor(c.time_total_seconds / 60) : 0
              const secs = c.time_total_seconds ? c.time_total_seconds % 60 : 0
              const initials = (c.prenom[0] + c.nom[0]).toUpperCase()
              return (
                <div key={c.id} className={`cd-row${selected?.id === c.id ? ' selected' : ''}`} onClick={() => setSelected(c)}>
                  <div className="cd-row-name">
                    <span className="cd-ava">{initials}</span>
                    <div><strong>{c.prenom} {c.nom}</strong><small>{c.ville} · {c.telephone}</small></div>
                  </div>
                  <div className={`cd-score ${scoreCls} hide-mobile`}>{scorePct}%<small>/100</small></div>
                  <div className={`cd-time ${tCls} hide-mobile`}>{c.time_total_seconds ? `${mins}:${String(secs).padStart(2, '0')}` : '—'}</div>
                  <span className={`cd-status ${statusCls}`}>{statusLbl}</span>
                  <div style={{ fontSize: 10, color: '#9CA3AF', textAlign: 'right' }} className="hide-mobile">
                    {new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {selected && (
          <div className="cd-panel">
            <div className="cd-panel-head">
              <div>
                <h3>{selected.prenom} {selected.nom}</h3>
                <p className="meta">{selected.ville} · Candidature {new Date(selected.created_at).toLocaleDateString('fr-FR')}</p>
              </div>
              <button className="cd-panel-close" onClick={() => setSelected(null)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="cd-panel-body">
              <div className="cd-info-grid">
                <div className="k">Téléphone</div><div className="v">{selected.telephone}</div>
                <div className="k">Email</div><div className="v">{selected.email || '—'}</div>
                <div className="k">Ville</div><div className="v">{selected.ville}</div>
                <div className="k">Statut</div><div className="v">{selected.status}</div>
              </div>

              {selected.motivation && (
                <>
                  <div className="cd-sec-title">Motivation</div>
                  <div className="cd-motivation">« {selected.motivation} »</div>
                </>
              )}

              <div className="cd-sec-title">Scores détaillés</div>
              <CandidateBreakdown candidate={selected} quizAttempts={quizAttempts} simAttempts={simAttempts} pracAttempts={pracAttempts}/>

              <div className="cd-sec-title">Chronomètre (vue admin)</div>
              <CandidateChrono candidate={selected} medianTime={medianTime}/>

              {selected.status === 'en_attente_validation' && (
                <div className="cd-actions">
                  <button className="cd-btn-val" onClick={() => validate(selected)}>
                    ✓ Valider — Activer le compte
                  </button>
                  <button className="cd-btn-ref" onClick={() => setRefuseModal(selected)}>
                    Refuser
                  </button>
                </div>
              )}
              {selected.status === 'refuse' && selected.refused_reason && (
                <div style={{ marginTop: 14, padding: 12, background: '#FEE2E2', borderLeft: '3px solid #B42318', borderRadius: '0 8px 8px 0', fontSize: 12, color: '#991B1B' }}>
                  <b style={{ display: 'block', marginBottom: 4 }}>Raison du refus</b>
                  {selected.refused_reason}
                </div>
              )}
              {selected.status === 'valide' && selected.activated_at && (
                <div style={{ marginTop: 14, padding: 12, background: '#D1FAE5', borderLeft: '3px solid #0F6E3E', borderRadius: '0 8px 8px 0', fontSize: 12, color: '#065F46' }}>
                  ✓ Compte activé le {new Date(selected.activated_at).toLocaleDateString('fr-FR')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {refuseModal && (
        <div className="modal-ovr" onClick={() => setRefuseModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Refuser la candidature de {refuseModal.prenom}</h3>
            <p>La raison sera envoyée au candidat par email/WhatsApp.</p>
            <textarea value={refuseReason} onChange={e => setRefuseReason(e.target.value)} placeholder="Explique brièvement pourquoi (ex: score trop faible, mauvaise compréhension du produit…)"/>
            <div className="modal-actions">
              <button className="modal-btn-cancel" onClick={() => { setRefuseModal(null); setRefuseReason('') }}>Annuler</button>
              <button className="modal-btn-confirm" onClick={refuse} disabled={!refuseReason.trim()}>Confirmer le refus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CandidateBreakdown({ candidate, quizAttempts, simAttempts, pracAttempts }:
  { candidate: Candidate; quizAttempts: QuizAttempt[]; simAttempts: SimAttempt[]; pracAttempts: PracAttempt[] }) {
  const quizForCand = quizAttempts.filter(q => q.candidate_id === candidate.id)
  const simForCand = simAttempts.filter(s => s.candidate_id === candidate.id)
  const pracForCand = pracAttempts.filter(p => p.candidate_id === candidate.id)

  const quizPassed = quizForCand.filter(q => q.passed).length
  const quizTime = quizForCand.reduce((s, q) => s + (q.time_seconds || 0), 0)
  const simPts = simForCand.reduce((s, x) => s + x.points_earned, 0)
  const simTime = simForCand.reduce((s, x) => s + (x.time_seconds || 0), 0)
  const pracByEp = [1, 2, 3].map(e => {
    const att = pracForCand.find(p => p.epreuve === e)
    return { ep: e, score: att?.score || 0, time: att?.time_seconds || 0 }
  })

  const fmt = (t: number) => t ? `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` : '—'
  const cls = (pts: number, max: number) => {
    const pct = (pts / max) * 100
    return pct >= 70 ? 'hi' : pct >= 50 ? 'mid' : 'lo'
  }

  return (
    <>
      <div className="cd-breakdown">
        <div className="cd-break-row">
          <span>Formation · Modules validés</span>
          <span><span className={`pts ${cls(quizPassed, 3)}`}>{quizPassed}/3</span><span className="cd-break-time">{fmt(quizTime)}</span></span>
        </div>
      </div>
      <div className="cd-breakdown">
        <div className="cd-break-row">
          <span>Simulation théorique · 5 scénarios</span>
          <span><span className={`pts ${cls(simPts, 100)}`}>{simPts}/100</span><span className="cd-break-time">{fmt(simTime)}</span></span>
        </div>
      </div>
      <div className="cd-breakdown">
        <div className="cd-break-row"><b>Simulation pratique</b></div>
        {pracByEp.map(p => (
          <div key={p.ep} className="cd-break-row">
            <span>Épreuve {p.ep} · {p.ep === 1 ? 'Chat' : p.ep === 2 ? 'Création lead' : 'Pilotage'}</span>
            <span><span className={`pts ${cls(p.score, 20)}`}>{p.score}/20</span><span className="cd-break-time">{fmt(p.time)}</span></span>
          </div>
        ))}
      </div>
    </>
  )
}

function CandidateChrono({ candidate, medianTime }: { candidate: Candidate; medianTime: number }) {
  if (!candidate.time_total_seconds) return <div style={{ fontSize: 12, color: '#9CA3AF' }}>Pas de données de temps.</div>
  const pct = medianTime ? Math.min(100, (candidate.time_total_seconds / medianTime) * 100) : 50
  const mins = Math.floor(candidate.time_total_seconds / 60)
  const secs = candidate.time_total_seconds % 60
  const medMins = Math.floor(medianTime / 60)
  const vitesse = candidate.time_total_seconds < medianTime * 0.85 ? 'rapide (top 25%)' : candidate.time_total_seconds > medianTime * 1.3 ? 'lent (bottom 25%)' : 'normal'
  return (
    <div className="cd-chrono">
      <div className="cd-chrono-head"><span>Temps total simulation</span><b>{mins}:{String(secs).padStart(2, '0')} min</b></div>
      <div className="cd-chrono-bar"><div className="cd-chrono-bar-fill" style={{ width: `${pct}%` }}/></div>
      <div className="cd-chrono-row"><span>Médiane des candidats</span><b>{medMins} min</b></div>
      <div className="cd-chrono-row"><span>Vitesse</span><b>{vitesse}</b></div>
    </div>
  )
}
