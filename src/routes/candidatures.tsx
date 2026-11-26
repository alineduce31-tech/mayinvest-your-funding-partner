import EquipeNav from '@/components/EquipeNav'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { formatPhone } from '@/lib/phone'

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
  const [filter, setFilter] = useState<'all' | 'pending' | 'valide' | 'refuse' | 'en_cours'>('pending')
  const [notifyCandidate, setNotifyCandidate] = useState<Candidate | null>(null)
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
      if (!s?.email || !s?.token || !s?.expiresAt || s.expiresAt < Date.now()) {
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
      if (filter === 'en_cours') return ['formation', 'simulation_theo', 'simulation_prat'].includes(c.status)
      return true
    })
  }, [candidates, filter])

  const counts = useMemo(() => ({
    pending: candidates.filter(c => c.status === 'en_attente_validation').length,
    valide: candidates.filter(c => c.status === 'valide').length,
    refuse: candidates.filter(c => c.status === 'refuse').length,
    en_cours: candidates.filter(c => ['formation', 'simulation_theo', 'simulation_prat'].includes(c.status)).length,
    all: candidates.length,
  }), [candidates])

  // Médianes pour comparatif
  const medianTime = useMemo(() => {
    const times = candidates.filter(c => c.time_total_seconds > 0).map(c => c.time_total_seconds).sort((a, b) => a - b)
    return times.length ? times[Math.floor(times.length / 2)] : 0
  }, [candidates])

  if (!authChecked) return <SkeletonPage/>

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

  if (loading) return <SkeletonPage/>

  return (
    <div className="eq-page" style={{ minHeight: '100vh', background: '#F5F5F7', color: '#1D1D1F' }}>
      <style>{`
        * { box-sizing: border-box; }
        .cd-header { padding: 20px 32px; background: #FFFFFF; border-bottom: 1px solid #ECECEA; margin: 20px 32px 0; border-radius: 16px; box-shadow: 0 2px 4px rgba(13,23,41,0.03); border: 1px solid #ECECEA; display: flex; align-items: center; gap: 20px; }
        @media (max-width: 640px) { .cd-header { margin: 12px 16px 0; padding: 16px 20px; gap: 14px; } }
        .cd-header-left { flex: 1; display: flex; align-items: center; gap: 16px; }
        .cd-header-right { text-align: right; }
        @media (max-width: 760px) { .cd-header { flex-wrap: wrap; align-items: flex-start; } .cd-header-right { order: -1; flex: 1 1 100%; text-align: left; } .cd-header-left { flex: 1 1 100%; min-width: 0; } .cd-header-left nav, .cd-nav { overflow-x: auto; scrollbar-width: none; flex-wrap: nowrap; max-width: 100%; } .cd-header-left nav a, .cd-nav a { white-space: nowrap; flex-shrink: 0; } .cd-header > div:last-child:not(.cd-header-left):not(.cd-header-right) { flex: 1 1 100%; } }
        .cd-header h1 { font-size: 22px; font-weight: 800; margin: 0; color: #0F1729; letter-spacing: -0.02em; line-height: 1.1; }
        @media (max-width: 640px) { .cd-header h1 { font-size: 18px; } }
        .cd-sub { font-size: 12px; color: #6B7280; margin-top: 4px; }
        .back-round { width: 40px; height: 40px; border-radius: 50%; background: #F3F4F6; border: 1px solid #E5E7EB; display: inline-flex; align-items: center; justify-content: center; color: #111; cursor: pointer; flex-shrink: 0; text-decoration: none; transition: all 0.15s; }
        .back-round:hover { background: #0D1B3E; color: #fff; border-color: #0D1B3E; transform: translateX(-2px); }

        .cd-wrap { max-width: 1200px; margin: 0 auto; padding: 24px 32px; display: grid; grid-template-columns: ${selected ? '1fr 440px' : '1fr'}; gap: 20px; }
        @media (max-width: 980px) { .cd-wrap { grid-template-columns: 1fr; } }

        .cd-tabs { display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; }
        .cd-tab { padding: 8px 14px; background: #FFFFFF; border: 1px solid #ECECEA; border-radius: 999px; cursor: pointer; font-size: 12px; font-weight: 600; color: #6B7280; font-family: inherit; }
        .cd-tab.active { background: #1A6BFF; color: white; border-color: #1A6BFF; }
        .cd-tab-count { margin-left: 6px; font-weight: 700; opacity: 0.8; }

        .cd-list { background: white; border: 1px solid #ECECEA; border-radius: 12px; overflow: hidden; }
        .cd-row { display: grid; grid-template-columns: 1fr 100px 90px 100px 80px; align-items: center; gap: 12px; padding: 14px 18px; border-bottom: 1px solid #F3F3F1; cursor: pointer; transition: background 0.1s; }
        @media (max-width: 720px) { .cd-row { grid-template-columns: 1fr 70px 70px; } .cd-row .hide-mobile { display: none; } }
        .cd-row:hover { background: #EAF1FF; }
        .cd-row.selected { background: #EAF1FF; }
        .cd-row:last-child { border-bottom: none; }
        .cd-row-name { display: flex; align-items: center; gap: 10px; }
        .cd-ava { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #2361EF, #7C3AED); color: white; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; }
        .cd-row-name strong { font-size: 13px; font-weight: 700; color: #111827; display: block; }
        .cd-row-name small { font-size: 11px; color: #6B7280; display: block; margin-top: 1px; }
        .cd-score { font-size: 15px; font-weight: 800; text-align: center; font-variant-numeric: tabular-nums; }
        .cd-score.hi { color: #1A6BFF; }
        .cd-score.mid { color: #B4871F; }
        .cd-score.lo { color: #B42318; }
        .cd-score small { font-size: 10px; color: #9CA3AF; font-weight: 500; display: block; margin-top: 1px; }
        .cd-time { font-size: 11px; color: #6B7280; text-align: center; font-variant-numeric: tabular-nums; font-weight: 600; }
        .cd-time.fast { color: #1A6BFF; }
        .cd-time.slow { color: #B4871F; }
        .cd-status { padding: 3px 10px; border-radius: 999px; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; text-align: center; white-space: nowrap; }
        .cd-status.pending { background: #FEF3C7; color: #92400E; }
        .cd-status.valide { background: #D1FAE5; color: #047857; }
        .cd-status.refuse { background: #FEE2E2; color: #991B1B; }
        .cd-status.encours { background: #DBEAFE; color: #1D4ED8; }
        .cd-status.encours.formation { background: #FDE68A; color: #92400E; }
        .cd-status.encours.simu-theo { background: #DDD6FE; color: #5B21B6; }
        .cd-status.encours.simu-prat { background: #BAE6FD; color: #075985; }

        .cd-notify-btn { background: #F3F3F1; border: 1px solid #E5E7EB; width: 28px; height: 28px; border-radius: 50%; color: #6B7280; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all 0.15s; flex-shrink: 0; }
        .cd-notify-btn:hover { background: #1A6BFF; color: white; border-color: #1A6BFF; transform: translateY(-1px); }

        .cd-empty { padding: 60px 20px; text-align: center; color: #6B7280; font-size: 13px; }

        /* Panneau détail */
        .cd-panel { background: white; border: 1px solid #ECECEA; border-radius: 20px; padding: 0; overflow: hidden; height: fit-content; position: sticky; top: 90px; box-shadow: 0 20px 40px rgba(13,23,41,0.08); }

        /* === HEADER VERT MAYINVEST === */
        .cd-panel-head { padding: 22px 24px 24px; background: linear-gradient(135deg, #1A6BFF 0%, #0D1B3E 100%); color: white; position: relative; }
        .cd-panel-head-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
        .cd-panel-ref { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.75; font-weight: 700; }
        .cd-panel-close { background: rgba(255,255,255,0.15); border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; color: white; transition: background 0.15s; }
        .cd-panel-close:hover { background: rgba(255,255,255,0.28); }

        .cd-identity { display: flex; align-items: center; gap: 18px; }
        .cd-ring { position: relative; width: 78px; height: 78px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .cd-ring-inner { width: 66px; height: 66px; background: #0D1B3E; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .cd-ring-num { font-size: 22px; font-weight: 800; color: white; line-height: 1; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
        .cd-ring-lbl { font-size: 8px; color: rgba(255,255,255,0.75); letter-spacing: 0.08em; text-transform: uppercase; font-weight: 700; margin-top: 2px; }
        .cd-identity-info { flex: 1; min-width: 0; }
        .cd-identity-info h3 { font-size: 22px; font-weight: 800; margin: 0 0 6px; color: white; letter-spacing: -0.02em; line-height: 1.1; }
        .cd-identity-info .meta { font-size: 12px; color: rgba(255,255,255,0.88); margin: 0; display: flex; gap: 10px; flex-wrap: wrap; }
        .cd-identity-info .meta span::before { content: '·'; margin-right: 10px; opacity: 0.6; }
        .cd-identity-info .meta span:first-child::before { content: ''; margin: 0; }

        /* === VERDICT === */
        .cd-verdict { padding: 14px 24px; background: #EAF1FF; border-bottom: 1px solid #ECECEA; font-size: 13px; color: #0D1B3E; line-height: 1.5; display: flex; align-items: flex-start; gap: 10px; }
        .cd-verdict svg { flex-shrink: 0; margin-top: 2px; }
        .cd-verdict b { font-weight: 700; }
        .cd-verdict.warn { background: #FEF3C7; color: #92400E; }
        .cd-verdict.danger { background: #FEE2E2; color: #991B1B; }

        .cd-panel-body { padding: 0; max-height: calc(100vh - 220px); overflow-y: auto; }

        /* === CONTACT === */
        .cd-contact { padding: 16px 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px 14px; border-bottom: 1px solid #F3F3F1; }
        @media (max-width: 520px) { .cd-contact { grid-template-columns: 1fr; } }
        .cd-contact-item { display: flex; align-items: center; gap: 9px; min-width: 0; font-size: 12.5px; }
        .cd-contact-item svg { width: 14px; height: 14px; color: #9CA3AF; flex-shrink: 0; }
        .cd-contact-item .t { color: #111827; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        /* === SECTION CONTAINER (ancienne cd-info-grid réutilisée ailleurs) === */
        .cd-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; margin: 16px 0; font-size: 12px; }
        .cd-info-grid .k { color: #6B7280; font-weight: 500; }
        .cd-info-grid .v { color: #111827; font-weight: 600; text-align: right; }

        /* === SECTION PADDING WRAPPER === */
        .cd-sec-wrap { padding: 18px 24px; }
        .cd-sec-wrap:not(:last-child) { border-bottom: 1px solid #F3F3F1; }

        .cd-sec-title { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #6B7280; margin: 18px 0 10px; padding-bottom: 6px; border-bottom: 1px solid #F3F3F1; }

        .cd-breakdown { background: #F3F3F1; border-radius: 10px; padding: 12px; margin-bottom: 10px; }
        .cd-break-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; font-size: 12px; }
        .cd-break-row b { font-weight: 700; color: #111827; font-variant-numeric: tabular-nums; }
        .cd-break-row .pts { font-weight: 700; font-variant-numeric: tabular-nums; }
        .cd-break-row .pts.hi { color: #1A6BFF; }
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

        /* === ACTIONS (boutons pill style landing) === */
        .cd-actions { padding: 18px 24px 22px; display: flex; flex-direction: column; gap: 10px; }
        .cd-btn { width: 100%; padding: 14px 20px; border-radius: 999px; border: none; font-size: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 12px; text-align: left; font-family: inherit; transition: all 0.15s; }
        .cd-btn-ic { width: 24px; height: 24px; border-radius: 50%; background: rgba(255,255,255,0.18); display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .cd-btn-tx { flex: 1; }
        .cd-btn-ar { width: 24px; height: 24px; border-radius: 50%; background: rgba(255,255,255,0.18); display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .cd-btn-val { background: #1A6BFF; color: white; box-shadow: 0 6px 18px rgba(26,107,255,0.25); }
        .cd-btn-val:hover { background: #0D1B3E; transform: translateY(-1px); box-shadow: 0 8px 22px rgba(26,107,255,0.32); }
        .cd-btn-ref { background: transparent; color: #B42318; border: 1.5px solid #ECECEA; }
        .cd-btn-ref .cd-btn-ic { background: #FEE2E2; }
        .cd-btn-ref .cd-btn-ar { background: #F3F3F1; }
        .cd-btn-ref:hover { background: #FEE2E2; border-color: #FEE2E2; }

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
        <div className="cd-header-left">
          <EquipeNav actif="candidatures"/>
        </div>
        <div className="cd-header-right">
          <h1>Candidatures commerciales</h1>
          <div className="cd-sub">Admin · Validation des commerciaux</div>
        </div>
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
            <button className={`cd-tab${filter === 'en_cours' ? ' active' : ''}`} onClick={() => setFilter('en_cours')}>En parcours <span className="cd-tab-count">{counts.en_cours}</span></button>
            <button className={`cd-tab${filter === 'valide' ? ' active' : ''}`} onClick={() => setFilter('valide')}>Validés <span className="cd-tab-count">{counts.valide}</span></button>
            <button className={`cd-tab${filter === 'refuse' ? ' active' : ''}`} onClick={() => setFilter('refuse')}>Refusés <span className="cd-tab-count">{counts.refuse}</span></button>
            <button className={`cd-tab${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>Tous <span className="cd-tab-count">{counts.all}</span></button>
          </div>

          <div className="cd-list">
            {filtered.length === 0 ? (
              <div className="cd-empty">Aucun candidat dans cette catégorie.</div>
            ) : filtered.map(c => {
              // Score global = moyenne pondérée (theo /100 + prat /60 ramené sur 100) → identique au drawer
              const theoList = Number(c.score_simulation_theo) || 0
              const pratRawList = Number(c.score_simulation_prat) || 0
              const pratPctList = Math.min(100, (pratRawList / 60) * 100)
              const hasAnyList = theoList > 0 || pratRawList > 0
              const scorePct = hasAnyList
                ? Math.round((theoList + pratPctList) / 2)
                : (c.score_total || 0)
              const scoreCls = scorePct >= 70 ? 'hi' : scorePct >= 50 ? 'mid' : 'lo'
              const tCls = c.time_total_seconds && medianTime ? (c.time_total_seconds < medianTime * 0.85 ? 'fast' : c.time_total_seconds > medianTime * 1.3 ? 'slow' : '') : ''
              // Labels humains + classe CSS par statut
              const statusMap: Record<string, { lbl: string; cls: string }> = {
                en_attente_validation: { lbl: 'À valider',           cls: 'pending' },
                valide:                { lbl: 'Validé',              cls: 'valide' },
                refuse:                { lbl: 'Refusé',              cls: 'refuse' },
                formation:             { lbl: 'En formation',        cls: 'encours formation' },
                simulation_theo:       { lbl: 'Simu théorique',      cls: 'encours simu-theo' },
                simulation_prat:       { lbl: 'Simu pratique',       cls: 'encours simu-prat' },
              }
              const s = statusMap[c.status] || { lbl: c.status, cls: 'encours' }
              const statusCls = s.cls
              const statusLbl = s.lbl
              const canNotify = ['formation', 'simulation_theo', 'simulation_prat', 'en_attente_validation'].includes(c.status)
              const mins = c.time_total_seconds ? Math.floor(c.time_total_seconds / 60) : 0
              const secs = c.time_total_seconds ? c.time_total_seconds % 60 : 0
              const initials = (c.prenom[0] + c.nom[0]).toUpperCase()
              return (
                <div key={c.id} className={`cd-row${selected?.id === c.id ? ' selected' : ''}`} onClick={() => setSelected(c)}>
                  <div className="cd-row-name">
                    <span className="cd-ava">{initials}</span>
                    <div><strong>{c.prenom} {c.nom}</strong><small>{c.ville} · {formatPhone(c.telephone)}</small></div>
                  </div>
                  <div className={`cd-score ${scoreCls} hide-mobile`}>{scorePct}%<small>/100</small></div>
                  <div className={`cd-time ${tCls} hide-mobile`}>{c.time_total_seconds ? `${mins}:${String(secs).padStart(2, '0')}` : '—'}</div>
                  <span className={`cd-status ${statusCls}`}>{statusLbl}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                    {canNotify && (
                      <button
                        className="cd-notify-btn"
                        onClick={(e) => { e.stopPropagation(); setNotifyCandidate(c) }}
                        title="Envoyer un email à ce candidat"
                        aria-label="Notifier"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>
                      </button>
                    )}
                    <div style={{ fontSize: 10, color: '#9CA3AF' }} className="hide-mobile">
                      {new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {selected && (() => {
          // Score global calculé : moyenne pondérée de la simu théorique (/100) et pratique (/60 ramené sur 100)
          const theo = Number(selected.score_simulation_theo) || 0
          const pratRaw = Number(selected.score_simulation_prat) || 0
          const pratPct = Math.min(100, (pratRaw / 60) * 100)
          const hasAny = theo > 0 || pratRaw > 0
          const score = hasAny
            ? Math.round((theo + pratPct) / 2)
            : (selected.score_total || 0)
          const verdictCls = score >= 70 ? '' : score >= 50 ? ' warn' : ' danger'
          const verdictWord = score >= 70 ? 'Profil recommandé pour validation.' : score >= 50 ? 'Profil limite, à examiner.' : 'Profil en-dessous des attentes.'
          const refNum = `MI-C-${new Date(selected.created_at).getFullYear()}-${selected.id.slice(0, 4).toUpperCase()}`
          const ringPct = Math.min(100, Math.max(0, score))
          return (
          <div className="cd-panel">

            {/* === HEADER VERT === */}
            <div className="cd-panel-head">
              <div className="cd-panel-head-top">
                <div className="cd-panel-ref">Dossier {refNum}</div>
                <button className="cd-panel-close" onClick={() => setSelected(null)} aria-label="Fermer">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div className="cd-identity">
                <div className="cd-ring" style={{ background: `conic-gradient(white calc(${ringPct} * 1%), rgba(255,255,255,0.2) 0)` }}>
                  <div className="cd-ring-inner">
                    <div className="cd-ring-num">{Math.round(score)}</div>
                    <div className="cd-ring-lbl">Score</div>
                  </div>
                </div>
                <div className="cd-identity-info">
                  <h3>{selected.prenom} {selected.nom}</h3>
                  <p className="meta">
                    <span>{selected.ville}</span>
                    <span>Candidature {new Date(selected.created_at).toLocaleDateString('fr-FR')}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* === VERDICT === */}
            <div className={`cd-verdict${verdictCls}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {score >= 70
                  ? <polyline points="20 6 9 17 4 12"/>
                  : <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>}
              </svg>
              <div>Score <b>{Math.round(score)}/100</b> · Simulation complète. {verdictWord}</div>
            </div>

            <div className="cd-panel-body">

              {/* === CONTACT === */}
              <div className="cd-contact">
                <div className="cd-contact-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2A19.86 19.86 0 013 5.18 2 2 0 015 3h3a2 2 0 012 1.72c.12.9.33 1.78.63 2.62a2 2 0 01-.45 2.11L8.91 10.91a16 16 0 006 6l1.46-1.27a2 2 0 012.11-.45c.84.3 1.72.5 2.62.63A2 2 0 0122 16.92z"/></svg>
                  <span className="t">{formatPhone(selected.telephone)}</span>
                </div>
                <div className="cd-contact-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>
                  <span className="t">{selected.email || '—'}</span>
                </div>
              </div>

              {selected.motivation && (
                <div className="cd-sec-wrap">
                  <div className="cd-sec-title" style={{ margin: '0 0 8px', border: 'none', padding: 0 }}>Motivation</div>
                  <div className="cd-motivation">« {selected.motivation} »</div>
                </div>
              )}

              <div className="cd-sec-wrap">
                <div className="cd-sec-title" style={{ margin: '0 0 10px', border: 'none', padding: 0 }}>Scores détaillés</div>
                <CandidateBreakdown candidate={selected} quizAttempts={quizAttempts} simAttempts={simAttempts} pracAttempts={pracAttempts}/>
              </div>

              <div className="cd-sec-wrap">
                <div className="cd-sec-title" style={{ margin: '0 0 10px', border: 'none', padding: 0 }}>Chronomètre (vue admin)</div>
                <CandidateChrono candidate={selected} medianTime={medianTime}/>
              </div>

              {selected.status === 'en_attente_validation' && (
                <div className="cd-actions">
                  <button className="cd-btn cd-btn-val" onClick={() => validate(selected)}>
                    <span className="cd-btn-ic">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </span>
                    <span className="cd-btn-tx">Valider et activer le compte</span>
                    <span className="cd-btn-ar">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </span>
                  </button>
                  <button className="cd-btn cd-btn-ref" onClick={() => setRefuseModal(selected)}>
                    <span className="cd-btn-ic">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </span>
                    <span className="cd-btn-tx">Refuser le candidat</span>
                    <span className="cd-btn-ar">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </span>
                  </button>
                </div>
              )}

              {selected.status === 'refuse' && selected.refused_reason && (
                <div style={{ margin: '0 24px 22px', padding: 14, background: '#FEE2E2', borderLeft: '3px solid #B42318', borderRadius: '0 10px 10px 0', fontSize: 12, color: '#991B1B' }}>
                  <b style={{ display: 'block', marginBottom: 4, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Raison du refus</b>
                  {selected.refused_reason}
                </div>
              )}
              {selected.status === 'valide' && selected.activated_at && (
                <div style={{ margin: '0 24px 22px', padding: 14, background: '#EAF1FF', borderLeft: '3px solid #1A6BFF', borderRadius: '0 10px 10px 0', fontSize: 12, color: '#065F46', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Compte activé le {new Date(selected.activated_at).toLocaleDateString('fr-FR')}
                </div>
              )}
            </div>
          </div>
          )
        })()}
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

      {notifyCandidate && <NotifyModal candidate={notifyCandidate} onClose={() => setNotifyCandidate(null)}/>}
    </div>
  )
}

// ============================================================
// MODAL : Notifier un candidat par email (ouvre le client mail)
// ============================================================
function NotifyModal({ candidate, onClose }: { candidate: Candidate; onClose: () => void }) {
  const stageMap: Record<string, { label: string; cta: string }> = {
    formation:             { label: 'En formation',   cta: 'reprendre votre formation' },
    simulation_theo:       { label: 'Simu théorique', cta: 'terminer la simulation théorique' },
    simulation_prat:       { label: 'Simu pratique',  cta: 'passer la simulation pratique' },
    en_attente_validation: { label: 'En attente',     cta: 'suivre la validation de votre candidature' },
  }
  const stage = stageMap[candidate.status] || { label: candidate.status, cta: 'continuer votre parcours' }

  const TEMPLATES = [
    {
      k: 'relance',
      title: '📣 Relance douce',
      subject: `Mayinvest · ${candidate.prenom}, on vous attend pour ${stage.cta}`,
      body: `Bonjour ${candidate.prenom},\n\nL'équipe Mayinvest remarque que votre parcours de recrutement commercial est actuellement en pause (étape : ${stage.label}).\n\nPrenez 10 minutes pour ${stage.cta} depuis votre espace :\n👉 https://preselect.mayinvest.cg/espace-commercial\n\nBesoin d'aide ? Répondez à cet email ou contactez-nous sur WhatsApp au +242 06 53 13 187.\n\nÀ très vite,\nL'équipe Mayinvest`,
    },
    {
      k: 'encourage',
      title: '🎉 Encouragement',
      subject: `${candidate.prenom}, vous êtes presque arrivé(e) !`,
      body: `Bonjour ${candidate.prenom},\n\nFélicitations pour votre engagement jusqu'ici ! Il ne vous reste qu'une étape (${stage.label}) avant de rejoindre officiellement l'équipe commerciale Mayinvest.\n\n💚 Chaque dossier financé = 50 000 XAF de commission.\n\nContinuez ici : https://preselect.mayinvest.cg/espace-commercial\n\nL'équipe Mayinvest`,
    },
    {
      k: 'urgent',
      title: '⏰ Dernier rappel',
      subject: `Dernier rappel · Finalisez votre inscription Mayinvest`,
      body: `Bonjour ${candidate.prenom},\n\nNous clôturons bientôt la campagne de recrutement en cours. Pour que votre candidature soit retenue, il faut ${stage.cta} dans les prochains jours.\n\nLien direct vers votre espace :\nhttps://preselect.mayinvest.cg/espace-commercial\n\nSi vous ne souhaitez plus participer, répondez simplement « STOP » à cet email.\n\nL'équipe Mayinvest`,
    },
  ]

  const [template, setTemplate] = useState(TEMPLATES[0].k)
  const current = TEMPLATES.find(t => t.k === template)!
  const [subject, setSubject] = useState(current.subject)
  const [body, setBody] = useState(current.body)

  function selectTpl(k: string) {
    const t = TEMPLATES.find(x => x.k === k)!
    setTemplate(k)
    setSubject(t.subject)
    setBody(t.body)
  }

  function openMail() {
    const to = encodeURIComponent(candidate.email || '')
    const sub = encodeURIComponent(subject)
    const bod = encodeURIComponent(body)
    window.open(`mailto:${to}?subject=${sub}&body=${bod}`, '_blank')
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(`À : ${candidate.email}\nObjet : ${subject}\n\n${body}`)
      alert('✓ Email copié dans le presse-papiers')
    } catch {
      alert('Impossible de copier automatiquement — sélectionnez le texte à la main.')
    }
  }

  return (
    <div className="modal-ovr" onClick={onClose}>
      <div className="modal nmodal" onClick={e => e.stopPropagation()}>
        <div className="nmodal-head">
          <div>
            <h3 style={{ margin: 0 }}>Notifier {candidate.prenom}</h3>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4, fontFamily: 'monospace' }}>{candidate.email || 'Email non renseigné'}</div>
          </div>
          <button className="nmodal-close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <div className="nmodal-body">
          <div className="nmodal-section-title">Choisir un modèle</div>
          <div className="nmodal-tpls">
            {TEMPLATES.map(t => (
              <button key={t.k} type="button" className={`nmodal-tpl${template === t.k ? ' active' : ''}`} onClick={() => selectTpl(t.k)}>
                {t.title}
              </button>
            ))}
          </div>

          <div className="nmodal-section-title" style={{ marginTop: 14 }}>Objet</div>
          <input className="nmodal-input" value={subject} onChange={e => setSubject(e.target.value)}/>

          <div className="nmodal-section-title" style={{ marginTop: 10 }}>Message</div>
          <textarea className="nmodal-textarea" rows={10} value={body} onChange={e => setBody(e.target.value)}/>
        </div>

        <div className="nmodal-actions">
          {!candidate.email ? (
            <div style={{ fontSize: 12, color: '#B45309', background: '#FEF3C7', padding: '10px 14px', borderRadius: 8, textAlign: 'center' }}>
              ⚠ Pas d'email — impossible d'envoyer. Contacte-le par téléphone : {formatPhone(candidate.telephone)}
            </div>
          ) : (
            <>
              <button className="nmodal-btn-sec" type="button" onClick={copyToClipboard}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                Copier
              </button>
              <button className="nmodal-btn-pri" type="button" onClick={openMail}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>
                Ouvrir mon client email
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        .nmodal { max-width: 560px !important; padding: 0 !important; overflow: hidden; }
        .nmodal-head { padding: 20px 24px 16px; display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #F3F3F1; }
        .nmodal-head h3 { font-size: 16px; font-weight: 700; color: #0F1729; letter-spacing: -0.01em; }
        .nmodal-close { background: #F3F3F1; border: none; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; color: #6B7280; font-size: 14px; flex-shrink: 0; }
        .nmodal-close:hover { background: #ECECEA; color: #0F1729; }

        .nmodal-body { padding: 18px 24px; max-height: 60vh; overflow-y: auto; }
        .nmodal-section-title { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #9CA3AF; margin-bottom: 8px; }

        .nmodal-tpls { display: flex; flex-wrap: wrap; gap: 6px; }
        .nmodal-tpl { padding: 8px 14px; background: #F3F3F1; border: 1px solid transparent; border-radius: 999px; font-size: 12.5px; font-weight: 600; color: #6B7280; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .nmodal-tpl:hover { background: #ECECEA; color: #0F1729; }
        .nmodal-tpl.active { background: #1A6BFF; color: white; border-color: #1A6BFF; box-shadow: 0 4px 10px rgba(26,107,255,0.2); }

        .nmodal-input { width: 100%; padding: 11px 14px; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 10px; font-size: 13px; font-family: inherit; color: #0F1729; }
        .nmodal-input:focus { outline: none; border-color: #1A6BFF; box-shadow: 0 0 0 3px rgba(26,107,255,0.12); }
        .nmodal-textarea { width: 100%; padding: 12px 14px; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 10px; font-size: 13px; font-family: inherit; color: #0F1729; line-height: 1.5; resize: vertical; min-height: 180px; }
        .nmodal-textarea:focus { outline: none; border-color: #1A6BFF; box-shadow: 0 0 0 3px rgba(26,107,255,0.12); }

        .nmodal-actions { padding: 16px 24px 20px; display: flex; gap: 10px; justify-content: flex-end; background: #FAFAF8; border-top: 1px solid #F3F3F1; flex-wrap: wrap; }
        .nmodal-btn-sec { padding: 11px 18px; background: #fff; color: #6B7280; border: 1.5px solid #E5E7EB; border-radius: 999px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 8px; }
        .nmodal-btn-sec:hover { background: #F3F3F1; color: #0F1729; }
        .nmodal-btn-pri { padding: 11px 22px; background: #1A6BFF; color: white; border: none; border-radius: 999px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 6px 16px rgba(26,107,255,0.25); }
        .nmodal-btn-pri:hover { background: #0D1B3E; transform: translateY(-1px); }
      `}</style>
    </div>
  )
}

function CandidateBreakdown({ candidate, quizAttempts, simAttempts, pracAttempts }:
  { candidate: Candidate; quizAttempts: QuizAttempt[]; simAttempts: SimAttempt[]; pracAttempts: PracAttempt[] }) {
  const quizForCand = quizAttempts.filter(q => q.candidate_id === candidate.id)
  const simForCand = simAttempts.filter(s => s.candidate_id === candidate.id)
  const pracForCand = pracAttempts.filter(p => p.candidate_id === candidate.id)

  // Formation : nombre de modules UNIQUES validés (pas les retries)
  const passedModules = new Set(quizForCand.filter(q => q.passed).map(q => q.module_id))
  const quizPassed = passedModules.size
  const quizTime = quizForCand.reduce((s, q) => s + (q.time_seconds || 0), 0)

  // Simu théorique : meilleur essai par scénario (dédupe les retries)
  const bestByScenario = new Map<string, SimAttempt>()
  for (const att of simForCand) {
    const current = bestByScenario.get(att.scenario_id)
    if (!current || att.points_earned > current.points_earned) {
      bestByScenario.set(att.scenario_id, att)
    }
  }
  const simBestAttempts = Array.from(bestByScenario.values())
  const simPts = Math.min(100, simBestAttempts.reduce((s, x) => s + x.points_earned, 0))
  const simTime = simBestAttempts.reduce((s, x) => s + (x.time_seconds || 0), 0)

  // Pratique : meilleur score par épreuve (1, 2, 3)
  const pracByEp = [1, 2, 3].map(e => {
    const atts = pracForCand.filter(p => p.epreuve === e)
    const best = atts.reduce<PracAttempt | null>((b, a) => (!b || a.score > b.score) ? a : b, null)
    return { ep: e, score: best?.score || 0, time: best?.time_seconds || 0 }
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

function SkeletonPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        .skp-head { padding: 20px 32px; background: #fff; border-bottom: 1px solid #ECECEA; }
        .skp-bar { height: 14px; background: linear-gradient(90deg, #F3F4F6 0%, #E5E7EB 50%, #F3F4F6 100%); background-size: 200% 100%; animation: skp-shimmer 1.5s infinite; border-radius: 6px; margin-bottom: 8px; }
        .skp-wrap { max-width: 1200px; margin: 0 auto; padding: 24px 32px; }
        .skp-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
        .skp-tab { width: 90px; height: 32px; border-radius: 100px; background: #F3F4F6; }
        .skp-row { display: flex; align-items: center; gap: 14px; background: #fff; border: 1px solid #ECECEA; border-radius: 12px; padding: 16px; margin-bottom: 8px; }
        .skp-ava { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(90deg, #F3F4F6 0%, #E5E7EB 50%, #F3F4F6 100%); background-size: 200% 100%; animation: skp-shimmer 1.5s infinite; flex-shrink: 0; }
        .skp-lines { flex: 1; display: flex; flex-direction: column; gap: 6px; }
        .skp-line { height: 10px; border-radius: 5px; background: linear-gradient(90deg, #F3F4F6 0%, #E5E7EB 50%, #F3F4F6 100%); background-size: 200% 100%; animation: skp-shimmer 1.5s infinite; }
        .skp-line.long { width: 90%; }
        .skp-line.short { width: 55%; }
        @keyframes skp-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>
      <div className="skp-head">
        <div className="skp-bar" style={{ width: 70, height: 22, borderRadius: 100, marginBottom: 10 }}/>
        <div className="skp-bar" style={{ width: 280, height: 22, marginBottom: 6 }}/>
        <div className="skp-bar" style={{ width: 340, height: 10 }}/>
      </div>
      <div className="skp-wrap">
        <div className="skp-tabs">
          <div className="skp-tab"/>
          <div className="skp-tab"/>
          <div className="skp-tab"/>
          <div className="skp-tab"/>
        </div>
        {[1,2,3,4].map(i => (
          <div key={i} className="skp-row">
            <div className="skp-ava"/>
            <div className="skp-lines">
              <div className="skp-line long"/>
              <div className="skp-line short"/>
            </div>
          </div>
        ))}
      </div>
    </div>
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
