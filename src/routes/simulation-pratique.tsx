import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

export const Route = createFileRoute('/simulation-pratique')({
  component: SimulationPratiquePage,
})

const MI = {
  blue: '#2361EF', blueSoft: '#DBEAFE',
  navy: '#0F1729', green: '#22C55E', greenSoft: '#D1FAE5',
  red: '#DC2626', redSoft: '#FEE2E2',
  gold: '#F59E0B', goldSoft: '#FEF3C7',
  violet: '#7C3AED', violetSoft: '#EDE9FE',
  waBg: '#E7FFDB',
  grayBg: '#F7F8FA', grayCard: '#FFFFFF',
  grayBorder: '#E5E7EB', grayHair: '#F3F4F6',
  text: '#111827', textMuted: '#6B7280', textFaint: '#9CA3AF',
}

type Epreuve = 1 | 2 | 3
type Msg = { from: 'them' | 'me'; text: string }

function SimulationPratiquePage() {
  const navigate = useNavigate()
  const [candidateId, setCandidateId] = useState<string | null>(null)
  const [candidateName, setCandidateName] = useState('')
  const [epreuve, setEpreuve] = useState<Epreuve>(1)
  const [scores, setScores] = useState<Record<Epreuve, number>>({ 1: 0, 2: 0, 3: 0 })
  const [times, setTimes] = useState<Record<Epreuve, number>>({ 1: 0, 2: 0, 3: 0 })
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cid = localStorage.getItem('mi_candidate_id')
    const cname = localStorage.getItem('mi_candidate_name') || ''
    if (!cid) { navigate({ to: '/rejoindre-equipe' as any }); return }
    setCandidateId(cid)
    setCandidateName(cname)
    setLoading(false)
  }, [navigate])

  async function completeEpreuve(num: Epreuve, score: number, time: number, data: any) {
    setScores({ ...scores, [num]: score })
    setTimes({ ...times, [num]: time })
    if (candidateId) {
      await supabase.from('practical_attempts').insert({
        candidate_id: candidateId, epreuve: num, score, time_seconds: time, data,
      })
    }
    if (num < 3) {
      setEpreuve((num + 1) as Epreuve)
    } else {
      // Totalisation finale
      const totalPts = scores[1] + scores[2] + score  // use the latest score for 3
      const totalTime = times[1] + times[2] + time
      if (candidateId) {
        await supabase.from('commercial_candidates').update({
          score_simulation_prat: totalPts,
          time_total_seconds: totalTime,
          status: 'en_attente_validation',
          updated_at: new Date().toISOString(),
        }).eq('id', candidateId)
      }
      setDone(true)
    }
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: MI.textMuted }}>Chargement…</div>

  return (
    <div style={{ minHeight: '100vh', background: MI.grayBg, fontFamily: 'Inter, system-ui, sans-serif', color: MI.text }}>
      <GlobalStyles/>

      <header className="sp-header">
        <Link to="/" className="sp-logo"><span className="sp-logo-mark">P</span>Simulation Pratique</Link>
        <div className="sp-prog">
          <div className="sp-prog-bar"><div className="sp-prog-fill" style={{ width: done ? '100%' : `${((epreuve - 1) / 3) * 100}%` }}/></div>
          <span className="sp-prog-txt">Épreuve {done ? 3 : epreuve}/3</span>
        </div>
        <div className="sp-user">Bonjour <b>{candidateName}</b></div>
      </header>

      <div className="sp-wrap">
        {!done && epreuve === 1 && <Epreuve1Chat onComplete={(s, t, d) => completeEpreuve(1, s, t, d)}/>}
        {!done && epreuve === 2 && <Epreuve2Lead onComplete={(s, t, d) => completeEpreuve(2, s, t, d)}/>}
        {!done && epreuve === 3 && <Epreuve3Pilotage onComplete={(s, t, d) => completeEpreuve(3, s, t, d)}/>}
        {done && <FinalRecap candidateName={candidateName} scores={scores} times={times}/>}
      </div>
    </div>
  )
}

// ============================================================
// ÉPREUVE 1 — Chat avec client virtuel
// ============================================================
function Epreuve1Chat({ onComplete }: { onComplete: (score: number, time: number, data: any) => void }) {
  const [messages, setMessages] = useState<Msg[]>([
    { from: 'them', text: 'Bonjour, j\'ai vu votre annonce sur Facebook. Vous faites des crédits ?' },
  ])
  const [input, setInput] = useState('')
  const [extracted, setExtracted] = useState({ montant: false, usage: false, revenu: false, banque: false })
  const [startTime] = useState(Date.now())
  const [msgSent, setMsgSent] = useState(0)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const allExtracted = Object.values(extracted).every(Boolean)

  function send() {
    if (!input.trim()) return
    const text = input.trim().toLowerCase()
    const newMsgs: Msg[] = [...messages, { from: 'me', text: input.trim() }]
    const next = { ...extracted }
    let reply = ''

    // Logique scriptée du client virtuel
    const hasMontant = text.match(/montant|combien|somme|xaf|million/i)
    const hasUsage = text.match(/pourquoi|usage|projet|utilis|servir|faire|objet/i)
    const hasRevenu = text.match(/revenu|salaire|gagne|mensuel|salarié|employeur|travaill/i)
    const hasBanque = text.match(/banque|compte|uba|bgfi|lcb|mucodec|ecobank|crédit du congo/i)
    const hasGreeting = text.match(/bonjour|salut|bonsoir/i)
    const hasQualify = text.match(/question|rapide|minute|vérifi|éligib/i)

    if (hasMontant && !extracted.montant) { reply = 'J\'ai besoin de 15 millions pour construire ma maison.'; next.montant = true; next.usage = true }
    else if (hasUsage && !extracted.usage) { reply = 'C\'est pour construire ma maison à Pointe-Noire.'; next.usage = true }
    else if (hasRevenu && !extracted.revenu) { reply = 'Je suis fonctionnaire à l\'Education Nationale, je gagne 450 000 par mois, depuis 7 ans.'; next.revenu = true }
    else if (hasBanque && !extracted.banque) { reply = 'J\'ai un compte à UBA depuis 5 ans, mon salaire y est domicilié.'; next.banque = true }
    else if (hasGreeting) { reply = 'Bonjour, oui.' }
    else if (hasQualify) { reply = 'OK allez-y, posez vos questions.' }
    else if (allExtracted) { reply = 'Merci beaucoup. Quand est-ce qu\'on se rappelle ?' }
    else { reply = 'Oui, c\'est bien ça.' }

    newMsgs.push({ from: 'them', text: reply })
    setMessages(newMsgs)
    setInput('')
    setExtracted(next)
    setMsgSent(msgSent + 1)
  }

  function finish() {
    // Score : 20 si tout extrait en <=8 messages, dégressif
    const extractedCount = Object.values(extracted).filter(Boolean).length
    let score = Math.round((extractedCount / 4) * 20)
    if (msgSent > 10) score = Math.max(0, score - 4)
    if (msgSent > 15) score = Math.max(0, score - 4)
    const time = Math.round((Date.now() - startTime) / 1000)
    onComplete(score, time, { messages, extracted, msgSent })
  }

  return (
    <>
      <span className="sp-banner"><SparkIcon/> Épreuve 1 · Chat client virtuel</span>
      <div className="e1-grid">
        <div className="chat-pan">
          <div className="chat-head">
            <div className="avatar">JP</div>
            <div className="chat-head-info">
              <div className="chat-head-name">Jean-Pierre Mabiala</div>
              <div className="chat-head-meta"><span className="dot-live"/>En ligne · Pointe-Noire</div>
            </div>
            <span className="chat-head-fake">Virtuel</span>
          </div>
          <div className="chat-body">
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.from}`}>{m.text}</div>
            ))}
            <div ref={endRef}/>
          </div>
          <div className="chat-input">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Écris ta réponse…" disabled={allExtracted}/>
            <button onClick={send} disabled={!input.trim() || allExtracted}>Envoyer</button>
          </div>
        </div>

        <div>
          <div className="obj-box">
            <h4>Infos à extraire ({Object.values(extracted).filter(Boolean).length}/4)</h4>
            <ObjItem ok={extracted.montant} label="Montant du crédit"/>
            <ObjItem ok={extracted.usage} label="Usage / projet"/>
            <ObjItem ok={extracted.revenu} label="Revenu + situation pro"/>
            <ObjItem ok={extracted.banque} label="Banque actuelle"/>
          </div>
          <div className="hint-box">
            <b>Astuce</b>
            Pose une question à la fois, reste poli, conclus poliment quand tu as tout.
          </div>
          {allExtracted && (
            <button className="btn-finish" onClick={finish}>
              Terminer cette épreuve →
            </button>
          )}
          <div className="counter">Messages envoyés : <b>{msgSent}</b></div>
        </div>
      </div>
    </>
  )
}

// ============================================================
// ÉPREUVE 2 — Créer un lead
// ============================================================
function Epreuve2Lead({ onComplete }: { onComplete: (score: number, time: number, data: any) => void }) {
  const [startTime] = useState(Date.now())
  const [form, setForm] = useState({
    type: '', activite: '', raison: '', dirigeant: '', tel: '', email: '',
    ville: '', rccm: '', anciennete: '', ca: '', montant: '', objet: '', banque: '',
  })
  const [err, setErr] = useState('')

  const expected = {
    type: 'PME', activite: 'Commerce', raison: 'Boutique Marie Ntoumi', dirigeant: 'Marie Ntoumi',
    tel: '0665532', ville: 'Dolisie', rccm: 'Oui', ca_min: 15000000, montant: 2000000, banque: 'LCB',
  }

  function validate() {
    const score = computeScore(form, expected)
    if (score < 10) { setErr('Tu as trop d\'erreurs. Relis bien le brief et corrige les champs.'); return }
    const time = Math.round((Date.now() - startTime) / 1000)
    onComplete(score, time, { form })
  }

  return (
    <>
      <span className="sp-banner"><SparkIcon/> Épreuve 2 · Créer un lead à la main</span>
      <div className="brief-box">
        <h4>Mise en situation</h4>
        <p>
          <b>Marie Ntoumi</b> t'appelle au téléphone. Elle tient une <b>boutique de vêtements à Dolisie</b> depuis <b>6 ans</b>.
          Elle a besoin de <b>2 000 000 XAF</b> pour renouveler son stock. Elle a un <b>RCCM depuis 3 ans</b>, son <b>CA annuel est d'environ 18M XAF</b>,
          elle a un <b>compte à LCB bien mouvementé</b>. Pas de refus bancaire. Téléphone : <b>06 655 32 18</b>. Email : <b>m.ntoumi@gmail.com</b>.
        </p>
      </div>
      {err && <div className="form-err">{err}</div>}
      <div className="form-card">
        <div className="form-section-title">Type de client</div>
        <div className="form-grid">
          <Field label="Type" req value={form.type} onChange={v => setForm({ ...form, type: v })}
            options={['', 'Personne Physique', 'PME']}/>
          <Field label="Activité" req value={form.activite} onChange={v => setForm({ ...form, activite: v })}
            options={['', 'Commerce', 'Tourisme', 'BTP', 'Industrie/Bois', 'Agriculture', 'Transport', 'Santé', 'Tech', 'Autre']}/>
        </div>

        <div className="form-section-title">Identité</div>
        <div className="form-grid">
          <Field label="Raison sociale" req value={form.raison} onChange={v => setForm({ ...form, raison: v })}
            options={['', 'Boutique Marie Ntoumi', 'Ntoumi Commerce', 'Vêtements Dolisie SARL', 'Marie Mode']}/>
          <Field label="Dirigeant" req value={form.dirigeant} onChange={v => setForm({ ...form, dirigeant: v })}
            options={['', 'Marie Ntoumi', 'Ntoumi Marie', 'Mme Ntoumi']}/>
          <Field label="Téléphone" req value={form.tel} onChange={v => setForm({ ...form, tel: v })}/>
          <Field label="Email" value={form.email} onChange={v => setForm({ ...form, email: v })}/>
          <Field label="Ville" req value={form.ville} onChange={v => setForm({ ...form, ville: v })}
            options={['', 'Brazzaville', 'Pointe-Noire', 'Dolisie', 'Nkayi', 'Ouesso', 'Owando', 'Mossendjo', 'Autre']}/>
        </div>

        <div className="form-section-title">Situation juridique & Besoin</div>
        <div className="form-grid">
          <Field label="RCCM" value={form.rccm} onChange={v => setForm({ ...form, rccm: v })} options={['', 'Oui', 'Non']}/>
          <Field label="Ancienneté activité" value={form.anciennete} onChange={v => setForm({ ...form, anciennete: v })}/>
          <Field label="CA annuel (XAF)" req value={form.ca} onChange={v => setForm({ ...form, ca: v })}/>
          <Field label="Montant demandé (XAF)" req value={form.montant} onChange={v => setForm({ ...form, montant: v })}/>
          <Field label="Objet du crédit" value={form.objet} onChange={v => setForm({ ...form, objet: v })}
            options={['', 'Investissement', 'Fonds de roulement', 'Marché', 'Véhicule', 'Autre']}/>
          <Field label="Banque actuelle" value={form.banque} onChange={v => setForm({ ...form, banque: v })}
            options={['', 'UBA', 'BGFI', 'LCB', 'MUCODEC', 'Ecobank', 'Crédit du Congo', 'Aucune', 'Autre']}/>
        </div>

        <div className="form-actions">
          <button className="btn-submit" onClick={validate}>Enregistrer le lead →</button>
        </div>
      </div>
    </>
  )
}

function Field({ label, req, value, onChange, options }:
  { label: string; req?: boolean; value: string; onChange: (v: string) => void; options?: string[] }) {
  const filled = value.trim() !== ''
  return (
    <div className={`field${filled ? ' filled' : ''}`}>
      <label>{label} {req && <span className="req">*</span>}</label>
      {options ? (
        <CustomSelect value={value} onChange={onChange} options={options}/>
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)}/>
      )}
    </div>
  )
}

function CustomSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])
  const display = value || '— Choisir —'
  const realOptions = options.filter(o => o !== '')
  return (
    <div className="cs-wrap" ref={ref}>
      <button type="button" className={`cs-btn${value ? ' has-value' : ''}${open ? ' open' : ''}`} onClick={() => setOpen(!open)}>
        <span>{display}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div className="cs-panel">
          {realOptions.map(o => (
            <div key={o} className={`cs-opt${value === o ? ' selected' : ''}`}
              onClick={() => { onChange(o); setOpen(false) }}>
              <span>{o}</span>
              {value === o && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function computeScore(form: any, exp: any): number {
  let pts = 0
  // 2 pts par champ correct, 20 max
  if (form.type === exp.type) pts += 2
  if (form.activite === exp.activite) pts += 2
  if (form.raison.toLowerCase().includes('marie') || form.raison.toLowerCase().includes('ntoumi') || form.raison.toLowerCase().includes('boutique')) pts += 2
  if (form.dirigeant.toLowerCase().includes('marie') && form.dirigeant.toLowerCase().includes('ntoumi')) pts += 2
  if (form.tel.replace(/\s/g, '').includes(exp.tel)) pts += 2
  if (form.ville === exp.ville) pts += 2
  if (form.rccm === exp.rccm) pts += 1
  const caNum = parseInt(form.ca.replace(/\D/g, ''))
  if (caNum >= exp.ca_min * 0.9 && caNum <= exp.ca_min * 1.2) pts += 2
  const mntNum = parseInt(form.montant.replace(/\D/g, ''))
  if (mntNum === exp.montant) pts += 3
  if (form.banque.toUpperCase().includes(exp.banque)) pts += 2
  return pts
}

// ============================================================
// ÉPREUVE 3 — Pilotage d'un dossier complet
// ============================================================
function Epreuve3Pilotage({ onComplete }: { onComplete: (score: number, time: number, data: any) => void }) {
  const [startTime] = useState(Date.now())
  const [tab, setTab] = useState<'infos' | 'chat' | 'docs'>('infos')
  const [statut, setStatut] = useState<'Nouveau' | 'Contacté' | 'RDV' | 'Dossier Déposé'>('Nouveau')
  const [chatMsgs, setChatMsgs] = useState<Msg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [docsRequested, setDocsRequested] = useState<string[]>([])
  const [steps, setSteps] = useState({ lu: false, contacte: false, rdv: false, docs: false, depose: false })

  function markRead() { setSteps({ ...steps, lu: true }) }

  function sendChat() {
    if (!chatInput.trim()) return
    const text = chatInput.trim()
    setChatMsgs([...chatMsgs, { from: 'me', text }])
    setChatInput('')
    // Détecter type de message
    const t = text.toLowerCase()
    if (!steps.contacte && (t.match(/bonjour|salut|monsieur|m\./) )) {
      setSteps(prev => ({ ...prev, contacte: true }))
      setTimeout(() => setChatMsgs(prev => [...prev, { from: 'them', text: 'Bonjour, oui je suis bien Pierre Makosso.' }]), 800)
    }
    if (!steps.rdv && (t.match(/rendez-vous|rdv|rencontr|agence|banque/))) {
      setSteps(prev => ({ ...prev, rdv: true }))
      setTimeout(() => setChatMsgs(prev => [...prev, { from: 'them', text: 'Parfait, je suis disponible vendredi 15h.' }]), 800)
    }
    if (!steps.docs && (t.match(/document|pièce|bulletin|relevé|identité|pièce/))) {
      setSteps(prev => ({ ...prev, docs: true }))
      setTimeout(() => setChatMsgs(prev => [...prev, { from: 'them', text: 'Je vous les envoie demain.' }]), 800)
    }
  }

  function changeStatut(newS: typeof statut) {
    setStatut(newS)
    if (newS === 'Contacté') setSteps(prev => ({ ...prev, contacte: true }))
    if (newS === 'RDV') setSteps(prev => ({ ...prev, rdv: true }))
    if (newS === 'Dossier Déposé') {
      setSteps(prev => ({ ...prev, depose: true }))
    }
  }

  function requestDoc(doc: string) {
    if (docsRequested.includes(doc)) return
    setDocsRequested([...docsRequested, doc])
    if (docsRequested.length + 1 >= 3) setSteps(prev => ({ ...prev, docs: true }))
  }

  const allDone = Object.values(steps).every(Boolean) && statut === 'Dossier Déposé'

  function finish() {
    let score = 0
    if (steps.lu) score += 2
    if (steps.contacte) score += 4
    if (steps.rdv) score += 4
    if (steps.docs) score += 4
    if (steps.depose) score += 4
    if (docsRequested.length >= 3) score += 2
    const time = Math.round((Date.now() - startTime) / 1000)
    onComplete(score, time, { statut, chatMsgs, docsRequested, steps })
  }

  return (
    <>
      <span className="sp-banner"><SparkIcon/> Épreuve 3 · Piloter un dossier</span>
      <div className="e3-grid">
        <div className="e3-steps">
          <h4>Ton parcours</h4>
          <StepItem ok={steps.lu} num={1} label="Lire le dossier"/>
          <StepItem ok={steps.contacte} num={2} label="Contacter le client (chat)"/>
          <StepItem ok={statut === 'Contacté' || steps.rdv || steps.depose} num={3} label="Statut : Contacté"/>
          <StepItem ok={steps.rdv} num={4} label="Fixer un RDV & changer statut"/>
          <StepItem ok={steps.docs} num={5} label="Demander les documents (3 min)"/>
          <StepItem ok={steps.depose} num={6} label="Marquer « Dossier Déposé »"/>
        </div>

        <div className="e3-main">
          <div className="e3-main-head">
            <h3>Pierre Makosso · Salarié Privé · Brazzaville</h3>
            <span className="fake">Virtuel</span>
          </div>
          <div className="e3-tabs">
            <div className={`e3-tab${tab === 'infos' ? ' active' : ''}`} onClick={() => { setTab('infos'); markRead() }}>Infos</div>
            <div className={`e3-tab${tab === 'chat' ? ' active' : ''}`} onClick={() => setTab('chat')}>Discussion</div>
            <div className={`e3-tab${tab === 'docs' ? ' active' : ''}`} onClick={() => setTab('docs')}>Documents</div>
          </div>
          <div className="e3-body">
            <div className="status-row">
              <span className={`status-pill s-${statut.replace(/\s/g, '')}`}>{statut}</span>
              <select value={statut} onChange={e => changeStatut(e.target.value as any)}>
                <option>Nouveau</option><option>Contacté</option><option>RDV</option><option>Dossier Déposé</option>
              </select>
            </div>

            {tab === 'infos' && (
              <div className="info-grid">
                <div className="k">Téléphone</div><div className="v">066 42 18 03</div>
                <div className="k">Employeur</div><div className="v">Total Energies Congo</div>
                <div className="k">Ancienneté</div><div className="v">7 ans</div>
                <div className="k">Revenu net</div><div className="v">950 000 XAF</div>
                <div className="k">Montant demandé</div><div className="v">8 000 000 XAF</div>
                <div className="k">Objet</div><div className="v">Véhicule</div>
                <div className="k">Banque actuelle</div><div className="v">BGFI</div>
                <div className="k">Score</div><div className="v" style={{ color: MI.green }}>78/100</div>
              </div>
            )}

            {tab === 'chat' && (
              <div className="e3-chat">
                <div className="e3-chat-body">
                  {chatMsgs.length === 0 && <div className="e3-empty">Commence la conversation avec le client.</div>}
                  {chatMsgs.map((m, i) => <div key={i} className={`msg ${m.from}`}>{m.text}</div>)}
                </div>
                <div className="chat-input">
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="Message au client…"/>
                  <button onClick={sendChat} disabled={!chatInput.trim()}>Envoyer</button>
                </div>
              </div>
            )}

            {tab === 'docs' && (
              <div className="e3-docs">
                <div className="e3-docs-title">Clique sur les documents à demander (minimum 3) :</div>
                {['Pièce d\'identité', 'Fiche de paie (3 derniers mois)', 'Relevés de compte (3 mois)', 'Justificatif de domicile', 'Devis véhicule'].map(d => (
                  <button key={d} className={`doc-pill${docsRequested.includes(d) ? ' asked' : ''}`} onClick={() => requestDoc(d)}>
                    {docsRequested.includes(d) ? '✓ ' : '+ '}{d}
                  </button>
                ))}
                <div className="e3-docs-count">{docsRequested.length} document{docsRequested.length > 1 ? 's' : ''} demandé{docsRequested.length > 1 ? 's' : ''}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {allDone && (
        <button className="btn-finish wide" onClick={finish}>
          Terminer la simulation →
        </button>
      )}
    </>
  )
}

function StepItem({ ok, num, label }: { ok: boolean; num: number; label: string }) {
  return (
    <div className={`e3-step ${ok ? 'done' : 'todo'}`}>
      <span className="num">{ok ? '✓' : num}</span>
      <span className="txt">{label}</span>
    </div>
  )
}

// ============================================================
// Récap final
// ============================================================
function FinalRecap({ candidateName, scores, times }: { candidateName: string; scores: Record<Epreuve, number>; times: Record<Epreuve, number> }) {
  const total = scores[1] + scores[2] + scores[3]
  const totalTime = times[1] + times[2] + times[3]
  const mins = Math.floor(totalTime / 60)
  const secs = totalTime % 60

  return (
    <div className="final-card">
      <div className="final-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg></div>
      <h2>Bravo {candidateName}, simulation terminée !</h2>
      <p>Ton dossier passe à Aldo pour validation. Tu recevras un WhatsApp sous 24h avec son retour. Si c'est validé, ton dashboard commercial sera activé immédiatement.</p>
      <div className="final-score-row">
        <div className="final-score">
          <div className="final-score-num">{total}</div>
          <div className="final-score-lbl">/ 60 points</div>
        </div>
        <div className="final-time">
          <div className="final-time-num">{mins}min {secs}s</div>
          <div className="final-time-lbl">Temps total</div>
        </div>
      </div>
      <div className="final-breakdown">
        <div className="final-row"><span>Épreuve 1 · Chat</span><b>{scores[1]}/20</b></div>
        <div className="final-row"><span>Épreuve 2 · Création lead</span><b>{scores[2]}/20</b></div>
        <div className="final-row"><span>Épreuve 3 · Pilotage dossier</span><b>{scores[3]}/20</b></div>
      </div>
      <p className="final-sub">Statut de ta candidature : <b>En attente de validation</b></p>
    </div>
  )
}

function ObjItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`obj-item${ok ? ' ok' : ''}`}>
      <span className="chk">{ok && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}</span>
      <span>{label}</span>
    </div>
  )
}

function SparkIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
}

function GlobalStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      .sp-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 32px; background: white; border-bottom: 1px solid ${MI.grayBorder}; position: sticky; top: 0; z-index: 10; }
      .sp-logo { display: flex; align-items: center; gap: 10px; font-size: 18px; font-weight: 800; color: ${MI.navy}; text-decoration: none; }
      .sp-logo-mark { width: 32px; height: 32px; background: ${MI.violet}; color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; }
      .sp-prog { display: flex; align-items: center; gap: 12px; }
      .sp-prog-bar { width: 180px; height: 6px; background: ${MI.grayBorder}; border-radius: 3px; overflow: hidden; }
      .sp-prog-fill { height: 100%; background: ${MI.violet}; transition: width 0.3s; }
      .sp-prog-txt { font-size: 12px; font-weight: 600; color: ${MI.text}; }
      .sp-user { font-size: 13px; color: ${MI.textMuted}; }
      .sp-user b { color: ${MI.text}; }
      .sp-wrap { max-width: 1040px; margin: 0 auto; padding: 32px 24px; }
      .sp-banner { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; background: ${MI.violetSoft}; color: ${MI.violet}; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 16px; }

      /* ==== Épreuve 1 Chat ==== */
      .e1-grid { display: grid; grid-template-columns: 1fr 280px; gap: 16px; }
      @media (max-width: 780px) { .e1-grid { grid-template-columns: 1fr; } }
      .chat-pan { background: white; border: 1px solid ${MI.grayBorder}; border-radius: 14px; display: flex; flex-direction: column; overflow: hidden; height: 520px; }
      .chat-head { padding: 12px 16px; background: ${MI.grayHair}; border-bottom: 1px solid ${MI.grayBorder}; display: flex; align-items: center; gap: 10px; }
      .avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, ${MI.blue}, ${MI.violet}); color: white; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; }
      .chat-head-info { flex: 1; }
      .chat-head-name { font-size: 13px; font-weight: 700; color: ${MI.text}; }
      .chat-head-meta { font-size: 10px; color: ${MI.textMuted}; margin-top: 1px; display: flex; align-items: center; gap: 4px; }
      .dot-live { width: 6px; height: 6px; border-radius: 50%; background: ${MI.green}; display: inline-block; }
      .chat-head-fake { padding: 3px 8px; background: ${MI.violet}; color: white; border-radius: 999px; font-size: 9px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
      .chat-body { flex: 1; overflow-y: auto; padding: 14px 16px; background: ${MI.grayBg}; display: flex; flex-direction: column; gap: 8px; }
      .msg { max-width: 78%; padding: 9px 13px; border-radius: 14px; font-size: 13px; line-height: 1.4; }
      .msg.them { align-self: flex-start; background: white; border: 1px solid ${MI.grayBorder}; border-bottom-left-radius: 4px; color: ${MI.text}; }
      .msg.me { align-self: flex-end; background: ${MI.waBg}; color: ${MI.text}; border-bottom-right-radius: 4px; }
      .chat-input { padding: 12px 14px; border-top: 1px solid ${MI.grayBorder}; display: flex; gap: 8px; background: white; }
      .chat-input input { flex: 1; padding: 9px 14px; background: ${MI.grayHair}; border: 1px solid ${MI.grayBorder}; border-radius: 999px; font-size: 13px; font-family: inherit; color: ${MI.text}; }
      .chat-input button { padding: 9px 16px; background: ${MI.navy}; color: white; border: none; border-radius: 999px; font-size: 12px; font-weight: 700; cursor: pointer; }
      .chat-input button:disabled { opacity: 0.4; cursor: not-allowed; }

      .obj-box { background: white; border: 1px solid ${MI.grayBorder}; border-radius: 14px; padding: 16px; }
      .obj-box h4 { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${MI.textMuted}; margin: 0 0 10px; }
      .obj-item { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: ${MI.grayHair}; border-radius: 8px; margin-bottom: 6px; font-size: 12px; color: ${MI.text}; }
      .obj-item .chk { width: 16px; height: 16px; border-radius: 4px; background: ${MI.grayBorder}; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; color: transparent; }
      .obj-item.ok { color: ${MI.green}; font-weight: 600; }
      .obj-item.ok .chk { background: ${MI.green}; color: white; }
      .hint-box { margin-top: 12px; padding: 12px; background: ${MI.goldSoft}; color: #92400E; border-radius: 10px; font-size: 11px; line-height: 1.5; }
      .hint-box b { display: block; margin-bottom: 4px; font-size: 10px; letter-spacing: 0.05em; text-transform: uppercase; font-weight: 700; }
      .counter { margin-top: 10px; text-align: center; font-size: 11px; color: ${MI.textMuted}; }
      .counter b { color: ${MI.text}; font-weight: 700; }
      .btn-finish { display: block; width: 100%; margin-top: 12px; padding: 12px; background: ${MI.green}; color: white; border: none; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; }
      .btn-finish.wide { max-width: 320px; margin: 24px auto 0; }

      /* ==== Épreuve 2 Form ==== */
      .brief-box { background: ${MI.violetSoft}; border-left: 3px solid ${MI.violet}; padding: 14px 18px; border-radius: 0 12px 12px 0; margin-bottom: 16px; }
      .brief-box h4 { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${MI.violet}; margin: 0 0 6px; }
      .brief-box p { font-size: 13px; color: ${MI.text}; margin: 0; line-height: 1.6; }
      .brief-box b { color: ${MI.navy}; font-weight: 700; }
      .form-err { background: ${MI.redSoft}; color: ${MI.red}; padding: 10px 14px; border-radius: 10px; font-size: 12px; margin-bottom: 12px; font-weight: 600; }
      .form-card { background: white; border: 1px solid ${MI.grayBorder}; border-radius: 16px; padding: 24px; }
      .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 8px; }
      @media (max-width: 560px) { .form-grid { grid-template-columns: 1fr; } }
      .field { display: flex; flex-direction: column; gap: 4px; position: relative; }
      .field label { font-size: 11px; color: ${MI.textMuted}; font-weight: 600; }
      .field label .req { color: ${MI.red}; }
      .field input { padding: 10px 12px; background: #fff; border: 1px solid ${MI.grayBorder}; border-radius: 8px; font-size: 13px; font-family: inherit; color: ${MI.text}; transition: border-color 0.15s, box-shadow 0.15s; }
      .field input:focus { outline: none; border-color: ${MI.blue}; box-shadow: 0 0 0 3px rgba(35,97,239,0.12); }
      .field.filled input { border-color: ${MI.green}; background: ${MI.greenSoft}; color: ${MI.text}; font-weight: 500; }

      /* ===== Custom Select ===== */
      .cs-wrap { position: relative; width: 100%; }
      .cs-btn { width: 100%; padding: 10px 36px 10px 12px; background: #fff; border: 1px solid ${MI.grayBorder}; border-radius: 8px; font-size: 13px; font-family: inherit; color: ${MI.textMuted}; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 8px; text-align: left; position: relative; }
      .cs-btn:hover { border-color: #C4C9D1; }
      .cs-btn.open { border-color: ${MI.blue}; box-shadow: 0 0 0 3px rgba(35,97,239,0.12); }
      .cs-btn.has-value { color: ${MI.text}; font-weight: 500; }
      .field.filled .cs-btn.has-value { background: ${MI.greenSoft}; border-color: ${MI.green}; }
      .cs-btn svg { color: ${MI.textMuted}; flex-shrink: 0; }
      .cs-panel { position: absolute; top: calc(100% + 6px); left: 0; right: 0; background: #fff; border: 1px solid ${MI.grayBorder}; border-radius: 10px; box-shadow: 0 10px 30px rgba(13,23,41,0.12), 0 2px 6px rgba(13,23,41,0.05); padding: 6px; z-index: 20; max-height: 260px; overflow-y: auto; animation: csFadeIn 0.12s ease; }
      @keyframes csFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      .cs-opt { padding: 9px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; color: ${MI.text}; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .cs-opt:hover { background: ${MI.blue}15; color: ${MI.blue}; }
      .cs-opt.selected { background: ${MI.blue}15; color: ${MI.blue}; font-weight: 700; }
      .form-section-title { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${MI.textMuted}; margin: 16px 0 8px; }
      .form-actions { display: flex; justify-content: flex-end; margin-top: 20px; padding-top: 16px; border-top: 1px solid ${MI.grayBorder}; }
      .btn-submit { padding: 12px 24px; background: ${MI.navy}; color: white; border: none; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; }
      .btn-submit:hover { background: ${MI.blue}; }

      /* ==== Épreuve 3 Pilotage ==== */
      .e3-grid { display: grid; grid-template-columns: 260px 1fr; gap: 16px; }
      @media (max-width: 820px) { .e3-grid { grid-template-columns: 1fr; } }
      .e3-steps { background: white; border: 1px solid ${MI.grayBorder}; border-radius: 14px; padding: 16px; height: fit-content; }
      .e3-steps h4 { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${MI.textMuted}; margin: 0 0 10px; }
      .e3-step { display: flex; align-items: flex-start; gap: 10px; padding: 10px; border-radius: 8px; margin-bottom: 4px; font-size: 12px; }
      .e3-step .num { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; font-size: 11px; font-weight: 700; flex-shrink: 0; }
      .e3-step.done .num { background: ${MI.green}; color: white; }
      .e3-step.todo .num { background: ${MI.grayHair}; color: ${MI.textMuted}; border: 1px solid ${MI.grayBorder}; }
      .e3-step .txt { line-height: 1.3; color: ${MI.text}; }
      .e3-step.done .txt { color: ${MI.green}; font-weight: 600; }

      .e3-main { background: white; border: 1px solid ${MI.grayBorder}; border-radius: 14px; overflow: hidden; }
      .e3-main-head { padding: 14px 18px; background: ${MI.grayHair}; border-bottom: 1px solid ${MI.grayBorder}; display: flex; justify-content: space-between; align-items: center; }
      .e3-main-head h3 { font-size: 14px; font-weight: 700; margin: 0; color: ${MI.text}; }
      .e3-main-head .fake { padding: 3px 8px; background: ${MI.violet}; color: white; border-radius: 999px; font-size: 9px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
      .e3-tabs { display: flex; gap: 4px; padding: 0 18px; border-bottom: 1px solid ${MI.grayBorder}; }
      .e3-tab { padding: 12px 16px; font-size: 12px; font-weight: 600; color: ${MI.textMuted}; cursor: pointer; border-bottom: 2px solid transparent; }
      .e3-tab.active { color: ${MI.blue}; border-bottom-color: ${MI.blue}; }
      .e3-body { padding: 18px; }

      .status-row { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
      .status-pill { padding: 4px 14px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
      .status-pill.s-Nouveau { background: ${MI.grayHair}; color: ${MI.textMuted}; }
      .status-pill.s-Contacté { background: ${MI.blueSoft}; color: ${MI.blue}; }
      .status-pill.s-RDV { background: ${MI.violetSoft}; color: ${MI.violet}; }
      .status-pill.s-DossierDéposé { background: ${MI.goldSoft}; color: #92400E; }
      .status-row select { padding: 6px 10px; border: 1px solid ${MI.grayBorder}; border-radius: 8px; font-size: 12px; font-family: inherit; background: white; }

      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; font-size: 12px; margin-bottom: 16px; }
      @media (max-width: 480px) { .info-grid { grid-template-columns: 1fr; } }
      .info-grid .k { color: ${MI.textMuted}; font-weight: 500; }
      .info-grid .v { color: ${MI.text}; font-weight: 600; text-align: right; }

      .e3-chat { display: flex; flex-direction: column; height: 400px; border: 1px solid ${MI.grayBorder}; border-radius: 10px; overflow: hidden; }
      .e3-chat-body { flex: 1; overflow-y: auto; padding: 14px; background: ${MI.grayBg}; display: flex; flex-direction: column; gap: 8px; }
      .e3-empty { text-align: center; color: ${MI.textMuted}; font-size: 12px; padding: 20px; }

      .e3-docs-title { font-size: 12px; color: ${MI.textMuted}; margin-bottom: 10px; font-weight: 600; }
      .doc-pill { display: inline-block; margin: 0 6px 6px 0; padding: 6px 12px; background: ${MI.grayHair}; border: 1px solid ${MI.grayBorder}; border-radius: 999px; font-size: 12px; cursor: pointer; font-family: inherit; color: ${MI.text}; }
      .doc-pill.asked { background: ${MI.greenSoft}; color: ${MI.green}; border-color: ${MI.green}; font-weight: 600; }
      .e3-docs-count { margin-top: 10px; font-size: 11px; color: ${MI.textMuted}; }

      /* ==== Récap final ==== */
      .final-card { background: white; border: 1px solid ${MI.grayBorder}; border-radius: 20px; padding: 40px; text-align: center; max-width: 560px; margin: 0 auto; }
      .final-icon { width: 80px; height: 80px; background: ${MI.greenSoft}; color: ${MI.green}; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px; }
      .final-card h2 { font-size: 24px; font-weight: 800; color: ${MI.navy}; margin: 0 0 10px; letter-spacing: -0.02em; }
      .final-card p { font-size: 14px; color: ${MI.textMuted}; margin: 0 0 20px; line-height: 1.6; }
      .final-score-row { display: flex; gap: 20px; justify-content: center; margin: 20px 0; }
      .final-score, .final-time { background: ${MI.grayHair}; padding: 16px 24px; border-radius: 12px; }
      .final-score-num { font-size: 28px; font-weight: 800; color: ${MI.violet}; line-height: 1; }
      .final-score-lbl { font-size: 11px; color: ${MI.textMuted}; margin-top: 4px; }
      .final-time-num { font-size: 20px; font-weight: 700; color: ${MI.navy}; line-height: 1; }
      .final-time-lbl { font-size: 11px; color: ${MI.textMuted}; margin-top: 4px; }
      .final-breakdown { background: ${MI.grayHair}; border-radius: 12px; padding: 14px 18px; margin: 16px 0; text-align: left; }
      .final-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px; color: ${MI.text}; }
      .final-row b { font-weight: 700; color: ${MI.navy}; font-variant-numeric: tabular-nums; }
      .final-sub { font-size: 13px !important; color: ${MI.textMuted}; margin-top: 16px !important; }
      .final-sub b { color: ${MI.gold}; font-weight: 700; }
    `}</style>
  )
}
