import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { getCommercialToken } from '@/lib/session-tokens'
import SkeletonPage from '@/components/SkeletonPage'

export const Route = createFileRoute('/simulation-pratique')({
  component: SimulationPage,
})

const MI = {
  blue: '#2361EF', blueDark: '#1A4ECC', blueSoft: '#DBEAFE',
  navy: '#0F1729', navyLight: '#1A2340',
  green: '#22C55E', greenSoft: '#D1FAE5',
  red: '#DC2626', redSoft: '#FEE2E2',
  gold: '#F59E0B', goldSoft: '#FEF3C7',
  violet: '#7C3AED', violetSoft: '#EDE9FE',
  grayBg: '#F7F8FA', grayCard: '#FFFFFF',
  grayBorder: '#E5E7EB', grayHair: '#F3F4F6',
  text: '#111827', textMuted: '#6B7280', textFaint: '#9CA3AF',
}

type Choice = { id: string; text: string; points?: number }
type Scenario = {
  id: string; position: number; title: string; tag: string;
  context: string; prospect_message: string | null;
  question: string; choices: Choice[]; best_choice_id?: string; feedback?: string;
}

function SimulationPage() {
  const navigate = useNavigate()
  const [candidateId, setCandidateId] = useState<string | null>(null)
  const [candidateName, setCandidateName] = useState('')
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [scores, setScores] = useState<number[]>([])
  const [startTime, setStartTime] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const cid = localStorage.getItem('mi_candidate_id')
    const cname = localStorage.getItem('mi_candidate_name') || ''
    if (!cid) { navigate({ to: '/rejoindre-equipe' as any }); return }
    if (!getCommercialToken()) { navigate({ to: '/espace-commercial' as any }); return }
    setCandidateId(cid)
    setCandidateName(cname)

    ;(async () => {
      // Vérifier que le candidat a bien fini la formation
      const { data: mods } = await supabase.from('training_modules').select('id').eq('is_active', true)
      const { data: attempts } = await supabase.from('quiz_attempts').select('module_id, passed').eq('candidate_id', cid).eq('passed', true)
      if (mods && attempts) {
        const uniq = new Set(attempts.map((a: any) => a.module_id))
        if (uniq.size < mods.length) {
          navigate({ to: '/formation' as any }); return
        }
      }

      const { data } = await supabase.rpc('commercial_scenarios')
      if (data) setScenarios(data as Scenario[])
      setStartTime(Date.now())
      setLoading(false)
    })()
  }, [navigate])

  const current = scenarios[currentIdx]
  const totalScore = scores.reduce((s, n) => s + n, 0)

  async function pickChoice(choiceId: string) {
    if (showFeedback || !candidateId || !current) return
    setSelected(choiceId)
    const timeSeconds = Math.round((Date.now() - startTime) / 1000)
    // Le serveur calcule les points et renvoie la correction seulement après la réponse
    const { data, error } = await supabase.rpc('commercial_pick_choice', { p_scenario_id: current.id, p_choice_id: choiceId, p_time_seconds: timeSeconds })
    if (error || !data) { setSelected(null); alert('Réponse non enregistrée : ' + (error?.message || 'réessayez.')); return }
    const r = data as { points: number; choice_id: string; choices: Choice[]; best_choice_id: string; feedback: string }
    setScenarios(list => list.map(sc => sc.id === current.id ? { ...sc, choices: r.choices, best_choice_id: r.best_choice_id, feedback: r.feedback } : sc))
    setSelected(r.choice_id)
    setScores([...scores, r.points])
    setShowFeedback(true)
  }

  async function next() {
    if (currentIdx < scenarios.length - 1) {
      setCurrentIdx(currentIdx + 1)
      setSelected(null)
      setShowFeedback(false)
      setStartTime(Date.now())
    } else {
      // Fin de la simu théorique → persiste le score dans commercial_candidates
      if (candidateId) {
        const { error } = await supabase.rpc('commercial_finish_theo')
        if (error) { alert('Score non enregistré : ' + error.message); return }
      }
      setDone(true)
    }
  }

  function goToPractical() {
    navigate({ to: '/simulation-pratique' as any })
  }

  if (loading) return <SkeletonPage label="Chargement de la simulation…" />
  if (!scenarios.length) return <div style={{ padding: 60, textAlign: 'center', color: MI.textMuted }}>Aucun scénario disponible.</div>

  return (
    <div style={{ minHeight: '100vh', background: MI.grayBg, fontFamily: 'Inter, system-ui, sans-serif', color: MI.text }}>
      <style>{`
        * { box-sizing: border-box; }
        .sm-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 32px; background: white; border-bottom: 1px solid ${MI.grayBorder}; position: sticky; top: 0; z-index: 10; }
        .sm-logo { display: flex; align-items: center; gap: 10px; font-size: 18px; font-weight: 800; color: ${MI.navy}; text-decoration: none; }
        .sm-logo-mark { width: 32px; height: 32px; background: ${MI.violet}; color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; }
        .sm-prog { display: flex; align-items: center; gap: 12px; }
        .sm-prog-bar { width: 180px; height: 6px; background: ${MI.grayBorder}; border-radius: 3px; overflow: hidden; }
        .sm-prog-fill { height: 100%; background: ${MI.violet}; transition: width 0.3s; }
        .sm-prog-txt { font-size: 12px; font-weight: 600; color: ${MI.text}; }
        .sm-user { font-size: 13px; color: ${MI.textMuted}; }
        .sm-user b { color: ${MI.text}; }

        .sm-wrap { max-width: 760px; margin: 0 auto; padding: 32px 24px; }
        .sm-banner { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; background: ${MI.violetSoft}; color: ${MI.violet}; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 16px; }

        .sm-card { background: white; border: 1px solid ${MI.grayBorder}; border-radius: 16px; padding: 32px; }
        .sm-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 16px; }
        .sm-head h1 { font-size: 20px; font-weight: 800; margin: 0; color: ${MI.navy}; letter-spacing: -0.02em; flex: 1; }
        .sm-tag { padding: 4px 12px; background: ${MI.goldSoft}; color: #92400E; border-radius: 999px; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; white-space: nowrap; }

        .sm-context { font-size: 14px; color: ${MI.text}; line-height: 1.6; margin-bottom: 16px; }
        .sm-msg { background: ${MI.grayHair}; border-left: 3px solid ${MI.violet}; padding: 14px 16px; border-radius: 0 10px 10px 0; font-size: 14px; color: ${MI.text}; font-style: italic; margin-bottom: 20px; line-height: 1.5; }

        .sm-question { font-size: 12px; font-weight: 700; color: ${MI.textMuted}; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 10px; }
        .sm-choices { display: grid; gap: 10px; }
        .sm-choice { display: block; width: 100%; text-align: left; padding: 14px 16px; background: ${MI.grayHair}; border: 2px solid ${MI.grayBorder}; border-radius: 12px; cursor: pointer; font-size: 13px; color: ${MI.text}; line-height: 1.5; font-family: inherit; transition: all 0.15s; }
        .sm-choice:hover:not(:disabled) { border-color: ${MI.violet}; background: white; }
        .sm-choice:disabled { cursor: not-allowed; }
        .sm-choice b { display: block; font-weight: 700; margin-bottom: 4px; font-size: 11px; letter-spacing: 0.03em; color: ${MI.navy}; }
        .sm-choice.selected-good { background: ${MI.greenSoft}; border-color: ${MI.green}; color: ${MI.text}; }
        .sm-choice.selected-good b { color: ${MI.green}; }
        .sm-choice.selected-bad { background: ${MI.redSoft}; border-color: ${MI.red}; color: ${MI.text}; }
        .sm-choice.selected-bad b { color: ${MI.red}; }
        .sm-choice.correct { background: ${MI.greenSoft}; border-color: ${MI.green}; }
        .sm-choice.correct b { color: ${MI.green}; }
        .sm-points { float: right; font-weight: 700; font-size: 11px; }

        .sm-feedback { background: ${MI.blueSoft}; border-left: 3px solid ${MI.blue}; padding: 14px 16px; border-radius: 0 10px 10px 0; font-size: 13px; color: ${MI.text}; margin-top: 16px; line-height: 1.5; }
        .sm-feedback b { color: ${MI.blue}; }

        .sm-actions { display: flex; justify-content: flex-end; margin-top: 20px; }
        .btn-next { padding: 12px 24px; background: ${MI.navy}; color: white; border: none; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
        .btn-next:hover { background: ${MI.violet}; }

        /* Récap final */
        .result-card { background: white; border: 1px solid ${MI.grayBorder}; border-radius: 20px; padding: 40px; text-align: center; }
        .result-score-wrap { position: relative; display: inline-block; margin-bottom: 16px; }
        .result-score { width: 140px; height: 140px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: conic-gradient(${MI.violet} var(--pct), ${MI.grayHair} var(--pct)); }
        .result-score-inner { width: 112px; height: 112px; background: white; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .result-score-num { font-size: 36px; font-weight: 800; color: ${MI.violet}; line-height: 1; }
        .result-score-lbl { font-size: 10px; color: ${MI.textMuted}; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; margin-top: 2px; }
        .result-title { font-size: 22px; font-weight: 800; color: ${MI.navy}; margin: 0 0 8px; letter-spacing: -0.02em; }
        .result-sub { font-size: 14px; color: ${MI.textMuted}; max-width: 440px; margin: 0 auto 24px; line-height: 1.6; }
        .result-cta { padding: 14px 28px; background: ${MI.navy}; color: white; border: none; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
        .result-cta:hover { background: ${MI.violet}; }

        .result-breakdown { background: ${MI.grayHair}; border-radius: 12px; padding: 16px; margin: 20px 0; text-align: left; }
        .result-breakdown-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; font-size: 12px; color: ${MI.text}; }
        .result-breakdown-row b { font-weight: 700; font-variant-numeric: tabular-nums; }
        .result-breakdown-row .pts-good { color: ${MI.green}; }
        .result-breakdown-row .pts-mid { color: ${MI.gold}; }
        .result-breakdown-row .pts-bad { color: ${MI.red}; }
      `}</style>

      <header className="sm-header">
        <Link to="/" className="sm-logo"><span className="sm-logo-mark">S</span>Simulation</Link>
        <div className="sm-prog">
          <div className="sm-prog-bar"><div className="sm-prog-fill" style={{ width: done ? '100%' : `${((currentIdx + (showFeedback ? 1 : 0)) / scenarios.length) * 100}%` }}/></div>
          <span className="sm-prog-txt">{done ? scenarios.length : currentIdx + (showFeedback ? 1 : 0)}/{scenarios.length}</span>
        </div>
        <div className="sm-user">Bonjour <b>{candidateName}</b></div>
      </header>

      <div className="sm-wrap">
        {!done && current ? (
          <>
            <span className="sm-banner">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              Scénario {current.position}/{scenarios.length}
            </span>

            <div className="sm-card">
              <div className="sm-head">
                <h1>{current.title}</h1>
                <span className="sm-tag">{current.tag}</span>
              </div>
              <p className="sm-context">{current.context}</p>
              {current.prospect_message && <div className="sm-msg">« {current.prospect_message} »</div>}

              <div className="sm-question">{current.question}</div>
              <div className="sm-choices">
                {current.choices.map((c, i) => {
                  const letter = String.fromCharCode(65 + i)
                  let cls = ''
                  if (showFeedback) {
                    if (c.id === selected) cls = (c.points ?? 0) > 0 ? 'selected-good' : 'selected-bad'
                    else if (c.id === current.best_choice_id) cls = 'correct'
                  }
                  return (
                    <button key={c.id} className={`sm-choice ${cls}`}
                      disabled={showFeedback} onClick={() => pickChoice(c.id)}>
                      <b>{letter} {showFeedback && <span className="sm-points">+{c.points ?? 0} pts</span>}</b>
                      {c.text}
                    </button>
                  )
                })}
              </div>

              {showFeedback && (
                <>
                  <div className="sm-feedback">
                    <b>Explication :</b> {current.feedback}
                  </div>
                  <div className="sm-actions">
                    <button className="btn-next" onClick={next}>
                      {currentIdx < scenarios.length - 1 ? 'Scénario suivant →' : 'Voir mon score →'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        ) : done ? (
          <div className="result-card">
            <div className="result-score-wrap">
              <div className="result-score" style={{ ['--pct' as any]: `${(totalScore / 100) * 360}deg` }}>
                <div className="result-score-inner">
                  <div className="result-score-num">{totalScore}</div>
                  <div className="result-score-lbl">/ 100</div>
                </div>
              </div>
            </div>
            <h2 className="result-title">
              {totalScore >= 70 ? `Bravo ${candidateName} !` : `Peut mieux faire ${candidateName}`}
            </h2>
            <p className="result-sub">
              {totalScore >= 70
                ? `Tu as les bons réflexes commerciaux. Prochaine étape : la simulation pratique (3 épreuves sur l'application réelle).`
                : `Il faut au moins 70/100 pour valider. Relis la formation et retente la simulation.`}
            </p>

            <div className="result-breakdown">
              {scenarios.map((s, i) => {
                const pts = scores[i] || 0
                const cls = pts >= 20 ? 'pts-good' : pts > 0 ? 'pts-mid' : 'pts-bad'
                return (
                  <div key={s.id} className="result-breakdown-row">
                    <span>Scénario {s.position} — {s.title}</span>
                    <b className={cls}>{pts}/20</b>
                  </div>
                )
              })}
            </div>

            {totalScore >= 70 ? (
              <button className="result-cta" onClick={goToPractical}>
                Passer à la simulation pratique →
              </button>
            ) : (
              <button className="result-cta" onClick={() => window.location.reload()}>
                Rejouer la simulation
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
