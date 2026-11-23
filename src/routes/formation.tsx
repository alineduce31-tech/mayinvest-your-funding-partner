import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/integrations/supabase/client'

export const Route = createFileRoute('/formation')({
  component: FormationPage,
})

const MI = {
  blue: '#2361EF', blueDark: '#1A4ECC', blueSoft: '#DBEAFE',
  navy: '#0F1729', navyLight: '#1A2340',
  green: '#22C55E', greenSoft: '#D1FAE5',
  red: '#DC2626', redSoft: '#FEE2E2',
  gold: '#F59E0B', goldSoft: '#FEF3C7',
  grayBg: '#F7F8FA', grayCard: '#FFFFFF',
  grayBorder: '#E5E7EB', grayHair: '#F3F4F6',
  text: '#111827', textMuted: '#6B7280', textFaint: '#9CA3AF',
}

type Module = { id: string; position: number; title: string; subtitle: string; duration_minutes: number; content_md: string; objectifs: string }
type Question = { id: string; position: number; question: string; options: { id: string; text: string }[]; correct_option_id: string; explanation: string }

function FormationPage() {
  const navigate = useNavigate()
  const [candidateId, setCandidateId] = useState<string | null>(null)
  const [candidateName, setCandidateName] = useState('')
  const [modules, setModules] = useState<Module[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [completedModules, setCompletedModules] = useState<Set<string>>(new Set())
  const [mode, setMode] = useState<'content' | 'quiz' | 'result'>('content')
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [quizStartTime, setQuizStartTime] = useState<number>(0)
  const [lastScore, setLastScore] = useState<{ score: number; passed: boolean } | null>(null)
  const [loading, setLoading] = useState(true)

  // Charger le candidat + modules + tentatives déjà faites
  useEffect(() => {
    const cid = localStorage.getItem('mi_candidate_id')
    const cname = localStorage.getItem('mi_candidate_name') || ''
    if (!cid) { navigate({ to: '/rejoindre-equipe' as any }); return }
    setCandidateId(cid)
    setCandidateName(cname)

    ;(async () => {
      const { data: mods } = await supabase.from('training_modules').select('*').eq('is_active', true).order('position')
      if (mods) setModules(mods as Module[])

      const { data: attempts } = await supabase.from('quiz_attempts').select('module_id, passed').eq('candidate_id', cid).eq('passed', true)
      if (attempts) setCompletedModules(new Set(attempts.map((a: any) => a.module_id)))

      // Trouve le premier module non complété
      if (mods && attempts) {
        const firstTodo = (mods as Module[]).findIndex((m: Module) => !attempts.some((a: any) => a.module_id === m.id))
        if (firstTodo >= 0) setCurrentIdx(firstTodo)
      }
      setLoading(false)
    })()
  }, [navigate])

  const currentModule = modules[currentIdx]
  const allCompleted = modules.length > 0 && modules.every(m => completedModules.has(m.id))

  async function startQuiz() {
    if (!currentModule) return
    const { data } = await supabase.from('quiz_questions').select('*').eq('module_id', currentModule.id).order('position')
    if (data) setQuestions(data as Question[])
    setAnswers({})
    setQuizStartTime(Date.now())
    setMode('quiz')
  }

  async function submitQuiz() {
    if (!candidateId || !currentModule) return
    let score = 0
    questions.forEach(q => { if (answers[q.id] === q.correct_option_id) score++ })
    const passed = score >= 4
    const timeSeconds = Math.round((Date.now() - quizStartTime) / 1000)

    await supabase.from('quiz_attempts').insert({
      candidate_id: candidateId,
      module_id: currentModule.id,
      answers: answers,
      score,
      passed,
      time_seconds: timeSeconds,
    })

    if (passed) {
      setCompletedModules(new Set([...completedModules, currentModule.id]))
    }
    setLastScore({ score, passed })
    setMode('result')
  }

  function goToModule(idx: number) {
    if (idx < 0 || idx >= modules.length) return
    // Pas sauter un module non complété
    if (idx > 0 && !completedModules.has(modules[idx - 1].id)) return
    setCurrentIdx(idx)
    setMode('content')
    setLastScore(null)
  }

  function finishFormation() {
    navigate({ to: '/simulation' as any })
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: MI.textMuted }}>Chargement de ta formation…</div>

  const progressPct = modules.length ? Math.round((completedModules.size / modules.length) * 100) : 0

  return (
    <div style={{ minHeight: '100vh', background: MI.grayBg, fontFamily: 'Inter, system-ui, sans-serif', color: MI.text }}>
      <style>{`
        * { box-sizing: border-box; }
        .fm-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 32px; background: white; border-bottom: 1px solid ${MI.grayBorder}; position: sticky; top: 0; z-index: 10; }
        .fm-logo { display: flex; align-items: center; gap: 10px; font-size: 18px; font-weight: 800; color: ${MI.navy}; text-decoration: none; }
        .fm-logo-mark { width: 32px; height: 32px; background: ${MI.blue}; color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; }
        .fm-prog { display: flex; align-items: center; gap: 12px; }
        .fm-prog-bar { width: 180px; height: 6px; background: ${MI.grayBorder}; border-radius: 3px; overflow: hidden; }
        .fm-prog-fill { height: 100%; background: ${MI.green}; transition: width 0.3s; }
        .fm-prog-txt { font-size: 12px; font-weight: 600; color: ${MI.text}; }
        .fm-user { font-size: 13px; color: ${MI.textMuted}; }
        .fm-user b { color: ${MI.text}; }

        .fm-wrap { max-width: 1100px; margin: 0 auto; padding: 32px 24px; display: grid; grid-template-columns: 280px 1fr; gap: 24px; }
        @media (max-width: 860px) { .fm-wrap { grid-template-columns: 1fr; } }

        .fm-sidebar { background: white; border: 1px solid ${MI.grayBorder}; border-radius: 16px; padding: 16px; height: fit-content; position: sticky; top: 100px; }
        .fm-sidebar h3 { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${MI.textMuted}; margin: 0 0 12px; padding: 4px 10px; }
        .fm-mod-item { display: flex; align-items: center; gap: 10px; padding: 12px 10px; border-radius: 10px; margin-bottom: 4px; cursor: pointer; }
        .fm-mod-item:hover:not(.locked) { background: ${MI.grayHair}; }
        .fm-mod-item.active { background: ${MI.blueSoft}; }
        .fm-mod-item.locked { opacity: 0.5; cursor: not-allowed; }
        .fm-mod-icon { width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; font-weight: 700; font-size: 13px; }
        .fm-mod-item.done .fm-mod-icon { background: ${MI.green}; color: white; }
        .fm-mod-item.active .fm-mod-icon { background: ${MI.blue}; color: white; }
        .fm-mod-item.todo .fm-mod-icon { background: ${MI.grayHair}; color: ${MI.textMuted}; border: 1px solid ${MI.grayBorder}; }
        .fm-mod-title { font-size: 13px; font-weight: 600; color: ${MI.text}; line-height: 1.2; }
        .fm-mod-sub { font-size: 11px; color: ${MI.textFaint}; margin-top: 2px; }

        .fm-main { background: white; border: 1px solid ${MI.grayBorder}; border-radius: 16px; padding: 32px; }
        .fm-main h1 { font-size: 24px; font-weight: 800; margin: 0 0 6px; color: ${MI.navy}; letter-spacing: -0.02em; }
        .fm-meta { font-size: 12px; color: ${MI.textMuted}; margin-bottom: 20px; }
        .fm-meta span { margin-right: 16px; display: inline-flex; align-items: center; gap: 5px; }

        .fm-objectifs { background: ${MI.blueSoft}; border-left: 3px solid ${MI.blue}; padding: 12px 16px; border-radius: 0 10px 10px 0; margin-bottom: 20px; font-size: 13px; color: ${MI.text}; }
        .fm-objectifs b { display: block; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: ${MI.blue}; margin-bottom: 4px; font-weight: 700; }

        .fm-video { background: ${MI.navy}; border-radius: 12px; height: 220px; display: flex; align-items: center; justify-content: center; color: white; margin-bottom: 20px; }
        .fm-video-play { width: 56px; height: 56px; border-radius: 50%; background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; }

        .fm-content { font-size: 14px; line-height: 1.7; color: ${MI.text}; }
        .fm-content h2 { font-size: 16px; font-weight: 700; color: ${MI.navy}; margin: 20px 0 8px; }
        .fm-content ul { padding-left: 22px; margin: 8px 0; }
        .fm-content li { margin-bottom: 5px; }
        .fm-content p { margin: 10px 0; }
        .fm-content strong { color: ${MI.navy}; }
        .fm-content code { background: ${MI.grayHair}; padding: 1px 6px; border-radius: 4px; font-size: 12px; font-family: monospace; color: ${MI.navy}; }

        .fm-actions { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 28px; padding-top: 20px; border-top: 1px solid ${MI.grayBorder}; }
        .btn-prev { padding: 10px 18px; background: ${MI.grayHair}; color: ${MI.text}; border: 1px solid ${MI.grayBorder}; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; }
        .btn-prev:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-quiz { padding: 12px 24px; background: ${MI.navy}; color: white; border: none; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
        .btn-quiz:hover { background: ${MI.blue}; }

        /* Quiz */
        .quiz-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .quiz-head h2 { font-size: 18px; font-weight: 700; color: ${MI.navy}; margin: 0; }
        .quiz-prog { font-size: 12px; color: ${MI.textMuted}; font-weight: 600; }
        .quiz-q { background: ${MI.grayHair}; border-radius: 12px; padding: 20px; margin-bottom: 12px; }
        .quiz-q-num { font-size: 11px; font-weight: 700; color: ${MI.blue}; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 6px; }
        .quiz-q-txt { font-size: 14px; font-weight: 600; color: ${MI.text}; margin-bottom: 14px; }
        .quiz-opt { display: block; width: 100%; text-align: left; padding: 11px 14px; background: white; border: 2px solid ${MI.grayBorder}; border-radius: 10px; margin-bottom: 6px; cursor: pointer; font-size: 13px; color: ${MI.text}; transition: all 0.1s; }
        .quiz-opt:hover { border-color: ${MI.blue}; }
        .quiz-opt.selected { border-color: ${MI.blue}; background: ${MI.blueSoft}; color: ${MI.blue}; font-weight: 600; }

        /* Résultat */
        .result-wrap { text-align: center; padding: 20px; }
        .result-score { width: 120px; height: 120px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 36px; font-weight: 800; margin-bottom: 16px; }
        .result-score.ok { background: ${MI.greenSoft}; color: ${MI.green}; }
        .result-score.ko { background: ${MI.redSoft}; color: ${MI.red}; }
        .result-title { font-size: 22px; font-weight: 800; color: ${MI.navy}; margin: 0 0 8px; letter-spacing: -0.02em; }
        .result-sub { font-size: 13px; color: ${MI.textMuted}; max-width: 440px; margin: 0 auto 20px; line-height: 1.6; }
        .result-cta { padding: 12px 24px; background: ${MI.navy}; color: white; border: none; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; }
        .result-cta.retry { background: ${MI.gold}; }

        .fm-done-card { background: linear-gradient(135deg, ${MI.greenSoft}, ${MI.blueSoft}); border-radius: 16px; padding: 32px; text-align: center; }
        .fm-done-icon { width: 72px; height: 72px; background: ${MI.green}; color: white; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        .fm-done-card h2 { font-size: 22px; font-weight: 800; color: ${MI.navy}; margin: 0 0 8px; letter-spacing: -0.02em; }
        .fm-done-card p { font-size: 14px; color: ${MI.text}; margin: 0 0 20px; max-width: 460px; margin-left: auto; margin-right: auto; line-height: 1.6; }
      `}</style>

      <header className="fm-header">
        <Link to="/" className="fm-logo"><span className="fm-logo-mark">M</span>Formation Commercial</Link>
        <div className="fm-prog">
          <div className="fm-prog-bar"><div className="fm-prog-fill" style={{ width: `${progressPct}%` }}/></div>
          <span className="fm-prog-txt">{completedModules.size}/{modules.length}</span>
        </div>
        <div className="fm-user">Bonjour <b>{candidateName}</b></div>
      </header>

      <div className="fm-wrap">
        <aside className="fm-sidebar">
          <h3>Les 3 modules</h3>
          {modules.map((m, idx) => {
            const isDone = completedModules.has(m.id)
            const isActive = idx === currentIdx && !allCompleted
            const isLocked = idx > 0 && !completedModules.has(modules[idx - 1].id) && !isDone
            const cls = isDone ? 'done' : isActive ? 'active' : 'todo'
            return (
              <div key={m.id} className={`fm-mod-item ${cls}${isLocked ? ' locked' : ''}`} onClick={() => !isLocked && goToModule(idx)}>
                <span className="fm-mod-icon">{isDone ? '✓' : m.position}</span>
                <div>
                  <div className="fm-mod-title">{m.title}</div>
                  <div className="fm-mod-sub">{m.duration_minutes} min · {isDone ? 'Terminé' : isLocked ? 'Verrouillé' : 'À faire'}</div>
                </div>
              </div>
            )
          })}
        </aside>

        <main>
          {allCompleted ? (
            <div className="fm-main">
              <div className="fm-done-card">
                <div className="fm-done-icon"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg></div>
                <h2>Bravo {candidateName}, formation terminée !</h2>
                <p>Tu maîtrises les bases Mayinvest. Prochaine étape : la simulation (5 scénarios + 3 épreuves pratiques) pour valider que tu sais mettre en application.</p>
                <button className="result-cta" onClick={finishFormation}>Passer à la simulation →</button>
              </div>
            </div>
          ) : currentModule && mode === 'content' ? (
            <div className="fm-main">
              <h1>Module {currentModule.position} : {currentModule.title}</h1>
              <div className="fm-meta">
                <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> {currentModule.duration_minutes} min</span>
                <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg> Quiz à la fin (4/5 pour valider)</span>
              </div>
              <div className="fm-objectifs">
                <b>Objectifs</b>
                {currentModule.objectifs}
              </div>
              <div className="fm-video">
                <div className="fm-video-play"><svg width="22" height="22" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>
              </div>
              <div className="fm-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(currentModule.content_md) }}/>
              <div className="fm-actions">
                <button className="btn-prev" onClick={() => goToModule(currentIdx - 1)} disabled={currentIdx === 0}>← Module précédent</button>
                <button className="btn-quiz" onClick={startQuiz}>
                  Passer le quiz →
                </button>
              </div>
            </div>
          ) : mode === 'quiz' ? (
            <div className="fm-main">
              <div className="quiz-head">
                <h2>Quiz · Module {currentModule?.position}</h2>
                <span className="quiz-prog">{Object.keys(answers).length}/{questions.length} répondues</span>
              </div>
              {questions.map((q, i) => (
                <div key={q.id} className="quiz-q">
                  <div className="quiz-q-num">Question {i + 1}</div>
                  <div className="quiz-q-txt">{q.question}</div>
                  {q.options.map(opt => (
                    <button key={opt.id} className={`quiz-opt${answers[q.id] === opt.id ? ' selected' : ''}`}
                      onClick={() => setAnswers({ ...answers, [q.id]: opt.id })}>
                      {opt.text}
                    </button>
                  ))}
                </div>
              ))}
              <div className="fm-actions">
                <button className="btn-prev" onClick={() => setMode('content')}>← Retour au contenu</button>
                <button className="btn-quiz" onClick={submitQuiz} disabled={Object.keys(answers).length < questions.length}>
                  Valider le quiz →
                </button>
              </div>
            </div>
          ) : mode === 'result' && lastScore ? (
            <div className="fm-main">
              <div className="result-wrap">
                <div className={`result-score ${lastScore.passed ? 'ok' : 'ko'}`}>{lastScore.score}/5</div>
                <h2 className="result-title">{lastScore.passed ? 'Quiz validé !' : 'Pas tout à fait…'}</h2>
                <p className="result-sub">
                  {lastScore.passed
                    ? `Bravo, tu passes le module ${currentModule?.position}. Tu peux continuer vers le suivant.`
                    : `Il faut au moins 4 bonnes réponses sur 5. Relis le module et retente le quiz.`}
                </p>
                {lastScore.passed ? (
                  currentIdx < modules.length - 1 ? (
                    <button className="result-cta" onClick={() => goToModule(currentIdx + 1)}>Module suivant →</button>
                  ) : (
                    <button className="result-cta" onClick={finishFormation}>Passer à la simulation →</button>
                  )
                ) : (
                  <button className="result-cta retry" onClick={() => setMode('content')}>Relire le module</button>
                )}
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  )
}

// Mini markdown renderer (headings + bold + lists + code)
function renderMarkdown(md: string): string {
  if (!md) return ''
  let html = md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
  // Lists
  html = html.replace(/(^- .+$\n?)+/gm, (match) => {
    const items = match.trim().split('\n').map(l => '<li>' + l.replace(/^- /, '') + '</li>').join('')
    return '<ul>' + items + '</ul>'
  })
  // Paragraphs (lignes seules)
  html = html.split(/\n\n+/).map(block => {
    if (block.match(/^<(h2|ul|li|strong)/)) return block
    return '<p>' + block.replace(/\n/g, '<br/>') + '</p>'
  }).join('\n')
  return html
}
