import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useRef, type ReactNode } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Logo } from '@/components/Logo'

export const Route = createFileRoute('/preselection')({
  component: Simulation,
})

/* ---------- Helpers ---------- */
function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 9)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)} ${d.slice(2)}`
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`
}
function cleanPhone(v: string): string { return v.replace(/\D/g, '').slice(0, 9) }
function formatMoney(digits: string): string {
  const d = digits.replace(/\D/g, '')
  if (!d) return ''
  return d.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}
function cleanMoney(v: string): string { return v.replace(/\D/g, '') }
function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'MYI-'
  for (let i = 0; i < 7; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

/* ---------- Tranches d'ancienneté (plus simple qu'un date picker) ---------- */
const TRANCHES = [
  { key: '0-6',   label: 'Moins de 6 mois', months: 3 },
  { key: '6-12',  label: '6 mois à 1 an',   months: 9 },
  { key: '1-3',   label: '1 à 3 ans',       months: 24 },
  { key: '3-5',   label: '3 à 5 ans',       months: 48 },
  { key: '5-10',  label: '5 à 10 ans',      months: 84 },
  { key: '10+',   label: 'Plus de 10 ans',  months: 144 },
]
function tranche(key: string): number {
  return TRANCHES.find(t => t.key === key)?.months || 0
}

/* ---------- Icons & lists ---------- */
const ICON_P: Record<string, ReactNode> = {
  'Fonctionnaire': <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 7h14v10H3V7z" stroke="currentColor" strokeWidth="1.6"/><path d="M7 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.6"/></svg>,
  'Salarié privé': <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="3" y="7" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><path d="M7 7V5a2 2 0 012-2h2a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1.6"/></svg>,
  'Commerçant': <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 6h14l-1.5 9a1 1 0 01-1 1h-9a1 1 0 01-1-1L3 6z" stroke="currentColor" strokeWidth="1.6"/><path d="M7 9V6a3 3 0 016 0v3" stroke="currentColor" strokeWidth="1.6"/></svg>,
  'Artisan': <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M12 3l5 5-9 9H3v-5l9-9z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M10 5l5 5" stroke="currentColor" strokeWidth="1.6"/></svg>,
  'Profession libérale': <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="4" y="3" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  'Agriculteur': <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 17V9m0 0C7 9 4 7 4 4c3 0 6 2 6 5zm0 0c3 0 6-2 6-5-3 0-6 2-6 5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
  'Autre': <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="5" cy="10" r="1.5" fill="currentColor"/><circle cx="10" cy="10" r="1.5" fill="currentColor"/><circle cx="15" cy="10" r="1.5" fill="currentColor"/></svg>,
}
const ICON_M: Record<string, ReactNode> = {
  'Commerce': <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 6h14l-1.5 9a1 1 0 01-1 1h-9a1 1 0 01-1-1L3 6z" stroke="currentColor" strokeWidth="1.6"/><path d="M7 9V6a3 3 0 016 0v3" stroke="currentColor" strokeWidth="1.6"/></svg>,
  'Tourisme': <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 2l7 10H3L10 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  'BTP': <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 17h14M5 17V9l5-3 5 3v8" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><rect x="8" y="12" width="4" height="5" stroke="currentColor" strokeWidth="1.6"/></svg>,
  'Industrie / Bois': <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 17V8l4 2V8l4 2V8l4 2v7H3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
  'Agriculture': <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 17V9m0 0C7 9 4 7 4 4c3 0 6 2 6 5zm0 0c3 0 6-2 6-5-3 0-6 2-6 5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
  'Transport': <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="2" y="7" width="10" height="7" stroke="currentColor" strokeWidth="1.6"/><path d="M12 9h4l2 3v2h-6V9z" stroke="currentColor" strokeWidth="1.6"/><circle cx="6" cy="15" r="1.5" stroke="currentColor" strokeWidth="1.6"/><circle cx="14" cy="15" r="1.5" stroke="currentColor" strokeWidth="1.6"/></svg>,
  'Santé': <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M8 3h4v5h5v4h-5v5H8v-5H3V8h5V3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
  'Tech': <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="5" y="5" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.6"/><path d="M8 2v3M12 2v3M8 15v3M12 15v3M2 8h3M2 12h3M15 8h3M15 12h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  'Autre': <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="5" cy="10" r="1.5" fill="currentColor"/><circle cx="10" cy="10" r="1.5" fill="currentColor"/><circle cx="15" cy="10" r="1.5" fill="currentColor"/></svg>,
}
const ACTIVITES_PHYSIQUE = Object.keys(ICON_P)
const ACTIVITES_MORALE = Object.keys(ICON_M)
const BANQUES = ['BGFI Bank', 'UBA', 'LCB Bank', 'MUCODEC', 'Crédit du Congo', 'Ecobank', 'Autre', 'Aucune']
const VILLES = ['Brazzaville', 'Pointe-Noire', 'Dolisie', 'Nkayi', 'Ouesso', 'Autre']
const CONTRATS = ['CDI', 'CDD', 'Intérim', 'Stage', 'Autre']

/* ---------- Scoring (adapté aux nouveaux champs) ---------- */
function calc(type: string, d: Record<string, string>) {
  let s = 0
  if (type === 'physique') {
    const anc = tranche(d['anciennete_tr'] || '')
    if (anc >= 6) s += 25
    if (d['salaire_domic'] === 'Oui') s += 25
    if (parseInt(d['revenu'] || '0') >= 200000) s += 20
    if (d['banque'] && d['banque'] !== 'Aucune') s += 15
    if (parseInt(d['montant'] || '0') <= 10000000) s += 15
    // Bonus/malus contrat (Salarié privé uniquement)
    if (d['activite_sub'] === 'Salarié privé') {
      if (d['contrat'] === 'CDI') s += 5
      if (d['contrat'] === 'Stage') s -= 15
    }
  } else {
    const anc = tranche(d['anciennete_soc_tr'] || '')
    if (d['rccm'] === 'Oui') s += 30
    if (d['compte_mouvemente'] === 'Oui') s += 25
    if (anc >= 12) s += 20
    if (d['refus_bancaire'] === 'Non') s += 15
    if (d['garanties'] === 'Oui') s += 10
  }
  return Math.max(0, Math.min(s, 100))
}

/* ---------- Mascotte "Mia" ---------- */
const TIPS: Record<string, { title: string; body: string }> = {
  'step1': { title: 'Bienvenue 👋', body: "Je m'appelle Mia, votre assistant Mayinvest. Choisissez votre profil pour démarrer." },
  'step2-p': { title: 'Votre métier', body: 'Choisissez votre profession. Cela adapte les questions à votre situation.' },
  'step2-m': { title: 'Votre secteur', body: "Sélectionnez le secteur d'activité principal de votre entreprise." },
  'identite-p': { title: 'Identité', body: 'Nom, prénom, téléphone sont obligatoires. Email facultatif mais recommandé.' },
  'identite-m': { title: 'Identité société', body: 'Raison sociale et dirigeant obligatoires. Email facultatif.' },
  'situation-p': { title: 'Situation pro', body: "Employeur, type de contrat et ancienneté — ces infos déterminent les plafonds de prêt possibles." },
  'situation-m': { title: 'Infos société', body: "L'ancienneté de l'entreprise rassure la banque. Soyez précis." },
  'besoin': { title: 'Votre besoin', body: 'Montant et objet du prêt. Soyez réaliste, on étudiera la faisabilité ensemble.' },
  'eligibilite-p': { title: 'Éligibilité', body: 'La domiciliation du salaire est un critère majeur. Précisez depuis quand le compte est ouvert.' },
  'eligibilite-m': { title: 'Éligibilité PME', body: 'Compte mouvementé, antécédents bancaires, garanties — soyez honnête.' },
  'step4': { title: 'Félicitations 🎉', body: "Notez votre code d'accès ! Il vous permet de retrouver votre dossier à tout moment." },
}

/* Bandeau Mia visible en permanence au-dessus des sections */
function MiaStrip({ tipKey }: { tipKey: string }) {
  const tip = TIPS[tipKey] || TIPS['step1']
  return (
    <div className="mia-strip">
      <div className="mia-strip-avatar">
        <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
          <circle cx="11.5" cy="14" r="1.8" fill="#fff"/>
          <circle cx="20.5" cy="14" r="1.8" fill="#fff"/>
          <path d="M11 20c1.5 1.5 3 2 5 2s3.5-.5 5-2" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
        </svg>
      </div>
      <div className="mia-strip-text">
        <div className="mia-strip-name">Mia · {tip.title}</div>
        <div className="mia-strip-body">{tip.body}</div>
      </div>
    </div>
  )
}

type MiaAction = { label: string; onClick: () => void; primary?: boolean; icon?: ReactNode }
function Mascot({ tipKey, open, onClose, onOpen, actions }: { tipKey: string; open: boolean; onClose: () => void; onOpen: () => void; actions?: MiaAction[] }) {
  const tip = TIPS[tipKey] || TIPS['step1']
  return (
    <>
      <button className={`mascot-fab ${open ? 'on' : ''}`} onClick={() => open ? onClose() : onOpen()} aria-label="Aide">
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
          <button className="mascot-close" onClick={onClose} aria-label="Fermer">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </button>
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
          {actions && actions.length > 0 && (
            <div className="mascot-actions">
              {actions.map((a, i) => (
                <button key={i} className={`mascot-btn ${a.primary ? 'primary' : ''}`} onClick={() => { a.onClick(); }}>
                  {a.icon}
                  <span>{a.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}

/* ---------- Credit score animé "US style" ---------- */
function CreditScoreMeter({ score }: { score: number }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    const start = performance.now()
    const dur = 1600
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setV(Math.round(eased * score))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [score])
  const color = v >= 70 ? '#34D058' : v >= 50 ? '#FFB020' : '#FF6B6B'
  const label = v >= 70 ? 'Excellent' : v >= 50 ? 'Bon' : v >= 30 ? 'Moyen' : 'À renforcer'
  const R = 70
  const C = Math.PI * R
  const pct = v / 100
  return (
    <div className="credit-meter">
      <svg viewBox="0 0 180 110" width="100%" style={{ maxWidth: 260, display: 'block', margin: '0 auto' }}>
        <defs>
          <linearGradient id="grad-arc" x1="0" x2="1">
            <stop offset="0" stopColor="#FF6B6B"/>
            <stop offset="0.5" stopColor="#FFB020"/>
            <stop offset="1" stopColor="#34D058"/>
          </linearGradient>
        </defs>
        <path d="M20 100 A70 70 0 0 1 160 100" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="14" strokeLinecap="round"/>
        <path d="M20 100 A70 70 0 0 1 160 100" fill="none" stroke="url(#grad-arc)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${pct * C} ${C}`}/>
        <g transform={`rotate(${-90 + pct * 180} 90 100)`}>
          <line x1="90" y1="100" x2="90" y2="38" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
          <circle cx="90" cy="100" r="6" fill="#fff"/>
          <circle cx="90" cy="100" r="3" fill={color}/>
        </g>
      </svg>
      <div className="credit-value" style={{ color }}>{v}</div>
      <div className="credit-sub">/ 100 · <span style={{ color }}>{label}</span></div>
    </div>
  )
}

/* ---------- Sélecteur d'ancienneté (chips) ---------- */
function AncienneteChips({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="tranches">
      {TRANCHES.map(t => (
        <button
          key={t.key}
          type="button"
          className={`tranche-chip ${value === t.key ? 'sel' : ''}`}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

/* ---------- Component ---------- */
function Simulation() {
  const navigate = useNavigate()
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const initType: 'physique' | 'morale' | '' = params?.get('type') === 'morale' ? 'morale' : params?.get('type') === 'physique' ? 'physique' : ''
  const [step, setStep] = useState<1 | 2 | 3 | 4>(initType ? 2 : 1)
  const [type, setType] = useState<'physique' | 'morale' | ''>(initType)
  const [activite, setActivite] = useState('')
  const [form, setForm] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [score, setScore] = useState(0)
  const [leadId, setLeadId] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [codeCopied, setCodeCopied] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [mascotOpen, setMascotOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<'identite'|'situation'|'besoin'|'eligibilite'>('identite')
  const sectionRefs = {
    identite: useRef<HTMLDivElement>(null),
    situation: useRef<HTMLDivElement>(null),
    besoin: useRef<HTMLDivElement>(null),
    eligibilite: useRef<HTMLDivElement>(null),
  }
  const scrollToSection = (k: 'identite'|'situation'|'besoin'|'eligibilite') => {
    sectionRefs[k].current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveSection(k)
  }
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const isP = type === 'physique'

  // Dès que l'activité change, on la mémorise dans le form pour le scoring/contrat
  useEffect(() => { if (activite) set('activite_sub', activite) }, [activite])

  // Mia s'ouvre UNIQUEMENT à la première visite — le bandeau en haut est toujours visible et porte le même message
  useEffect(() => {
    const seen = (() => { try { return localStorage.getItem('mayinvest_mia_seen') } catch { return '1' } })()
    if (!seen) {
      const t = setTimeout(() => setMascotOpen(true), 900)
      // Auto-ferme après 6s pour ne pas bloquer
      const t2 = setTimeout(() => setMascotOpen(false), 6900)
      try { localStorage.setItem('mayinvest_mia_seen', '1') } catch {}
      return () => { clearTimeout(t); clearTimeout(t2) }
    }
  }, [])
  function closeMia() { setMascotOpen(false) }

  const tipKey = step === 1 ? 'step1'
    : step === 2 ? (isP ? 'step2-p' : 'step2-m')
    : step === 4 ? 'step4'
    : (activeSection === 'identite' ? (isP ? 'identite-p' : 'identite-m')
      : activeSection === 'situation' ? (isP ? 'situation-p' : 'situation-m')
      : activeSection === 'besoin' ? 'besoin'
      : (isP ? 'eligibilite-p' : 'eligibilite-m'))

  // Actions interactives de Mia : boutons qui guident l'utilisateur
  let miaActions: MiaAction[] = []
  if (step === 1) {
    miaActions = [
      { label: 'Je suis un particulier', onClick: () => { setType('physique'); setMascotOpen(false) }, primary: true },
      { label: 'Je suis une entreprise', onClick: () => { setType('morale'); setMascotOpen(false) } },
    ]
  } else if (step === 2 && type) {
    miaActions = [{ label: 'Revenir au choix du profil', onClick: () => { setStep(1); setMascotOpen(false) } }]
  } else if (step === 3) {
    miaActions = [
      { label: "Aller à l'identité", onClick: () => { scrollToSection('identite'); setMascotOpen(false) }, primary: activeSection === 'identite' },
      { label: 'Aller à la situation', onClick: () => { scrollToSection('situation'); setMascotOpen(false) }, primary: activeSection === 'situation' },
      { label: 'Aller au besoin', onClick: () => { scrollToSection('besoin'); setMascotOpen(false) }, primary: activeSection === 'besoin' },
      { label: "Aller à l'éligibilité", onClick: () => { scrollToSection('eligibilite'); setMascotOpen(false) }, primary: activeSection === 'eligibilite' },
    ]
  } else if (step === 4) {
    miaActions = [
      { label: 'Discuter avec un conseiller', onClick: () => { window.open(`https://wa.me/242060000000?text=Bonjour Mayinvest, mon code: ${accessCode}`, '_blank'); setMascotOpen(false) }, primary: true },
      { label: 'Accéder à mon dossier', onClick: () => { if (leadId) { navigate({ to: '/client/$id', params: { id: leadId } }); setMascotOpen(false) } } },
    ]
  }

  // Contrat obligatoire uniquement pour Salarié privé
  const needContrat = isP && activite === 'Salarié privé'
  const needDureeRestante = needContrat && (form['contrat'] === 'CDD' || form['contrat'] === 'Intérim' || form['contrat'] === 'Stage')

  const canSubmit = (() => {
    if (!form['tel'] || form['tel'].length !== 9) return false
    if (!form['ville']) return false
    if (!form['montant']) return false
    if (!form['objet']) return false
    if (isP) {
      if (!form['prenom'] || !form['nom']) return false
      if (!form['employeur']) return false
      if (!form['anciennete_tr']) return false
      if (!form['revenu']) return false
      if (!form['salaire_domic']) return false
      if (form['salaire_domic'] === 'Oui' && !form['anciennete_cpt_tr']) return false
      if (needContrat && !form['contrat']) return false
      if (needDureeRestante && !form['duree_restante']) return false
    } else {
      if (!form['raison_sociale'] || !form['dirigeant']) return false
      if (!form['rccm']) return false
      if (!form['anciennete_soc_tr']) return false
      if (form['rccm'] === 'Oui' && !form['niu']) return false
      if (!form['ca_annuel']) return false
      if (!form['compte_mouvemente'] || !form['refus_bancaire'] || !form['garanties']) return false
    }
    return true
  })()

  async function soumettre() {
    setLoading(true)
    setSubmitError('')
    const s = calc(type, form)
    const ancP = tranche(form['anciennete_tr'] || '')
    const ancM = tranche(form['anciennete_soc_tr'] || '')
    const ancCpt = tranche(form['anciennete_cpt_tr'] || '')
    const nonEligible = isP
      ? (ancP < 6) || form['salaire_domic'] === 'Non' || form['contrat'] === 'Stage'
      : form['rccm'] === 'Non'
    const code = generateAccessCode()
    const generatedId = crypto.randomUUID()
    const payload = {
      id: generatedId,
      type: isP ? 'physique' : 'morale',
      activite,
      ville: form['ville'] || '',
      montant_demande: parseInt(form['montant'] || '0'),
      banque_actuelle: form['banque'] || '',
      statut: 'Nouveau',
      score: s,
      access_code: code,
      identite: { nom: form['nom'], prenom: form['prenom'], tel: form['tel'], email: form['email'] || '' },
      situation: isP
        ? {
            employeur: form['employeur'],
            contrat: form['contrat'] || null,
            duree_restante: form['duree_restante'] || null,
            anciennete_tranche: form['anciennete_tr'],
            anciennete_mois_estim: ancP,
            revenu: form['revenu'],
          }
        : {
            raison_sociale: form['raison_sociale'],
            dirigeant: form['dirigeant'],
            rccm: form['rccm'],
            niu: form['niu'] || null,
            anciennete_tranche: form['anciennete_soc_tr'],
            anciennete_mois_estim: ancM,
            ca_annuel: form['ca_annuel'],
          },
      besoin: { montant: form['montant'], objet: form['objet'], banque: form['banque'], flux_mois: form['flux_mois'] },
      eligibilite: isP
        ? {
            anciennete_ok: ancP >= 6,
            salaire_domic: form['salaire_domic'],
            anciennete_compte_tranche: form['anciennete_cpt_tr'] || null,
            anciennete_compte_mois_estim: ancCpt,
            non_eligible: nonEligible,
          }
        : { compte_mouvemente: form['compte_mouvemente'], refus_bancaire: form['refus_bancaire'], garanties: form['garanties'], non_eligible: nonEligible },
    }
    const { error } = await supabase.from('leads').insert(payload)
    setLoading(false)
    if (error) {
      console.error('[Mayinvest] Erreur insert lead:', error)
      setSubmitError("Impossible d'enregistrer votre dossier : " + error.message)
      return
    }
    try {
      localStorage.setItem(`mayinvest_code_${generatedId}`, code)
      localStorage.setItem(`mayinvest_phone_${form['tel']}`, code)
      if (form['email']) localStorage.setItem(`mayinvest_email_${form['email'].toLowerCase()}`, code)
    } catch {}
    setLeadId(generatedId)
    setAccessCode(code)
    setScore(s)
    setStep(4)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(accessCode)
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    } catch {}
  }

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#FFFFFF', color: '#111', minHeight: '100vh', WebkitFontSmoothing: 'antialiased' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        input, select, textarea { font-size: 16px !important; }
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="number"] { -moz-appearance: textfield; appearance: textfield; }
        .field select {
          -webkit-appearance: none; -moz-appearance: none; appearance: none;
          background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M3 4.5l3 3 3-3' stroke='%23888' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 2px center; padding-right: 20px !important; cursor: pointer;
        }
        /* FIX blindé : "Sélectionner…" en gris comme un vrai placeholder (iOS/Android/desktop) */
        .field select.empty,
        .field select:invalid {
          color: #BBB !important;
          -webkit-text-fill-color: #BBB !important;
          font-weight: 400 !important;
        }
        .field select { color: #111; -webkit-text-fill-color: #111; }
        .field select option { color: #111; font-weight: 500; background: #fff; }
        .field select option[value=""], .field select option:disabled {
          color: #BBB !important;
          -webkit-text-fill-color: #BBB !important;
          font-weight: 400 !important;
        }

        .top { position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,0.92); backdrop-filter: saturate(180%) blur(14px); -webkit-backdrop-filter: saturate(180%) blur(14px); height: 72px; padding: 0 60px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #F0F0F0; }
        @media (max-width: 640px) { .top { height: 60px; padding: 0 16px; } }
        .back { background: #111; color: #fff; font-family: inherit; font-size: 14px; font-weight: 600; padding: 11px 22px; border-radius: 100px; border: none; cursor: pointer; display: flex; align-items: center; gap: 8px; white-space: nowrap; text-decoration: none; }
        @media (max-width: 640px) { .back { padding: 8px 14px; font-size: 12px; gap: 5px; } .back svg { width: 12px; height: 12px; } }
        .wrap { max-width: 560px; margin: 0 auto; padding: 32px 24px 60px; }
        .progress { display: flex; gap: 6px; margin-bottom: 10px; }
        .dot { height: 5px; flex: 1; border-radius: 100px; background: #F0F0F0; transition: background 0.3s; }
        .dot.on { background: #1A6BFF; }
        .etape { font-size: 11px; font-weight: 700; color: #1A6BFF; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 24px; }
        .h1 { font-size: 30px; font-weight: 800; letter-spacing: -1px; color: #111; line-height: 1.1; margin: 0 0 10px; }
        @media (min-width: 640px) { .h1 { font-size: 38px; } }
        .sub { font-size: 15px; color: #666; line-height: 1.5; margin: 0 0 28px; }
        .cards-3d { display: flex; flex-direction: column; gap: 28px; margin-bottom: 32px; perspective: 1200px; }
        .card-choix { border: none; cursor: pointer; font-family: inherit; text-align: left; padding: 28px 24px; border-radius: 22px; position: relative; overflow: hidden; transition: transform 0.4s cubic-bezier(.2,.9,.3,1), box-shadow 0.4s ease, outline-color 0.2s; transform-style: preserve-3d; }
        .card-choix.physique { background: linear-gradient(145deg, #0D1B3E 0%, #0A1532 100%); color: #fff; box-shadow: 0 30px 60px rgba(13,27,62,0.3), 0 12px 24px rgba(13,27,62,0.18), inset 0 1px 0 rgba(255,255,255,0.1); transform: perspective(900px) rotateX(4deg) rotateY(-3deg); }
        .card-choix.morale { background: linear-gradient(145deg, #FFFFFF 0%, #F5F7FB 100%); border: 1px solid rgba(13,27,62,0.08); color: #0D1B3E; box-shadow: 0 20px 40px rgba(13,27,62,0.1), 0 8px 16px rgba(13,27,62,0.06), inset 0 1px 0 rgba(255,255,255,0.9); transform: perspective(900px) rotateX(4deg) rotateY(3deg); }
        .card-choix.sel { outline: 3px solid #1A6BFF; outline-offset: 2px; transform: perspective(900px) rotateX(0deg) rotateY(0deg) translateY(-6px); }
        .card-choix:hover { transform: perspective(900px) rotateX(0deg) rotateY(0deg) translateY(-4px); }
        .glow { position: absolute; top: -60px; right: -60px; width: 200px; height: 200px; pointer-events: none; }
        .glow.a { background: radial-gradient(circle, rgba(26,107,255,0.35) 0%, transparent 65%); }
        .glow.b { background: radial-gradient(circle, rgba(26,107,255,0.1) 0%, transparent 65%); }
        .shine { position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(26,107,255,0.6), transparent); }
        .card-icon { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; margin-bottom: 18px; position: relative; z-index: 1; }
        .card-icon.on { background: linear-gradient(135deg, #1A6BFF 0%, #0D4FD1 100%); color: #fff; box-shadow: 0 8px 20px rgba(26,107,255,0.4); }
        .card-icon.off { background: linear-gradient(135deg, #EEF4FF 0%, #D9E7FF 100%); color: #1A6BFF; box-shadow: 0 4px 12px rgba(26,107,255,0.15), inset 0 1px 0 rgba(255,255,255,0.9); }
        .card-h3 { font-size: 20px; font-weight: 700; margin: 0 0 4px; position: relative; z-index: 1; }
        .card-p { font-size: 13px; margin: 0; position: relative; z-index: 1; }
        .physique .card-p { color: rgba(255,255,255,0.6); }
        .morale .card-p { color: #666; }
        .chips { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 32px; }
        @media (min-width: 480px) { .chips { grid-template-columns: repeat(3, 1fr); } }
        .chip { background: #F5F5F5; border: 1.5px solid transparent; border-radius: 14px; padding: 14px 16px; font-family: inherit; font-size: 14px; font-weight: 600; color: #111; cursor: pointer; text-align: left; transition: all 0.15s; display: flex; align-items: center; gap: 10px; }
        .chip:hover { background: #EEF4FF; }
        .chip.sel { background: #1A6BFF; color: #fff; border-color: #1A6BFF; box-shadow: 0 6px 14px rgba(26,107,255,0.3); }
        .chip svg { flex-shrink: 0; }
        .form-stack { display: flex; flex-direction: column; gap: 22px; margin-bottom: 24px; }
        .form-card { background: linear-gradient(145deg, #FFFFFF 0%, #F5F7FB 100%); border: 1.5px solid rgba(13,27,62,0.08); border-radius: 24px; padding: 24px 22px; box-shadow: 0 20px 40px rgba(13,27,62,0.08), 0 8px 16px rgba(13,27,62,0.05), inset 0 1px 0 rgba(255,255,255,0.9); position: relative; transition: all 0.3s ease; }
        .form-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(26,107,255,0.3), transparent); border-radius: 24px 24px 0 0; }
        .form-card:focus-within { border-color: rgba(26,107,255,0.5); box-shadow: 0 0 0 5px rgba(26,107,255,0.12), 0 20px 50px rgba(26,107,255,0.18), 0 8px 20px rgba(13,27,62,0.08), inset 0 1px 0 rgba(255,255,255,0.9); }
        .form-card:focus-within::before { background: linear-gradient(90deg, transparent, #1A6BFF, transparent); height: 2px; }
        .card-title { font-size: 11px; font-weight: 700; color: #1A6BFF; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 16px; }
        .fields { display: flex; flex-direction: column; gap: 10px; }
        .field { background: #fff; border: 1.5px solid #E5E7EB; border-radius: 14px; padding: 12px 16px; transition: all 0.15s; }
        .field:focus-within { border-color: #1A6BFF; box-shadow: 0 4px 12px rgba(26,107,255,0.12); }
        .field label { display: block; font-size: 11px; font-weight: 600; color: #888; margin-bottom: 2px; letter-spacing: 0.02em; }
        .field input, .field select { width: 100%; border: none; padding: 0; font-family: inherit; font-weight: 500; color: #111; background: transparent; outline: none; }
        .field input::placeholder { color: #BBB; font-weight: 400; }
        .field.radio-field { padding: 12px 16px 14px; }
        .field-hint { font-size: 11px; color: #1A6BFF; margin-top: 4px; font-weight: 600; }
        .radio { display: flex; gap: 8px; margin-top: 6px; }
        .radio button { flex: 1; border: 1.5px solid #E5E7EB; border-radius: 10px; padding: 10px; background: #fff; font-family: inherit; font-size: 13px; font-weight: 700; color: #666; cursor: pointer; transition: all 0.15s; }
        .radio button.sel { border-color: #1A6BFF; background: #EEF4FF; color: #1A6BFF; box-shadow: 0 4px 10px rgba(26,107,255,0.2); }

        /* Tranches d'ancienneté (chips) */
        .anc-wrap { padding: 10px 14px 14px; }
        .anc-wrap > label { display: block; font-size: 11px; font-weight: 600; color: #888; margin-bottom: 8px; }
        .tranches { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
        @media (min-width: 480px) { .tranches { grid-template-columns: repeat(3, 1fr); } }
        .tranche-chip { background: #fff; border: 1.5px solid #E5E7EB; border-radius: 10px; padding: 10px 8px; font-family: inherit; font-size: 12px; font-weight: 700; color: #666; cursor: pointer; transition: all 0.15s; text-align: center; }
        .tranche-chip:hover { background: #EEF4FF; color: #1A6BFF; }
        .tranche-chip.sel { background: #1A6BFF; color: #fff; border-color: #1A6BFF; box-shadow: 0 4px 10px rgba(26,107,255,0.25); }

        /* Chips contrat */
        .contrat-chips { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 6px; }
        @media (max-width: 400px) { .contrat-chips { grid-template-columns: repeat(2, 1fr); } }
        .contrat-chip { background: #fff; border: 1.5px solid #E5E7EB; border-radius: 10px; padding: 10px 6px; font-family: inherit; font-size: 12px; font-weight: 700; color: #666; cursor: pointer; transition: all 0.15s; text-align: center; }
        .contrat-chip:hover { background: #EEF4FF; color: #1A6BFF; }
        .contrat-chip.sel { background: #EEF4FF; color: #1A6BFF; border-color: #1A6BFF; box-shadow: 0 4px 10px rgba(26,107,255,0.2); }

        .badge { display: inline-flex; align-items: center; gap: 6px; background: #EEF4FF; color: #1A6BFF; font-size: 12px; font-weight: 700; padding: 5px 14px; border-radius: 100px; margin-bottom: 16px; }
        .submit-error { background: #FEF2F2; border: 1.5px solid #FCA5A5; color: #B91C1C; font-size: 13px; font-weight: 600; padding: 12px 16px; border-radius: 12px; margin-top: 12px; display: flex; align-items: flex-start; gap: 10px; }
        .btn-main { width: 100%; background: #1A6BFF; color: #fff; font-family: inherit; font-size: 16px; font-weight: 700; padding: 18px 24px; border-radius: 100px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 8px 20px rgba(26,107,255,0.35); transition: all 0.2s; }
        .btn-main:hover:not(:disabled) { background: #1560E0; transform: translateY(-1px); box-shadow: 0 12px 28px rgba(26,107,255,0.4); }
        .btn-main:disabled { background: #C7D0DB; cursor: not-allowed; box-shadow: none; }
        .btn-back { width: 100%; background: #F5F5F5; color: #111; font-family: inherit; font-size: 15px; font-weight: 700; padding: 16px; border-radius: 100px; border: none; cursor: pointer; margin-top: 12px; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .btn-back:hover { background: #EAEAEA; }
        .score-final { background: #0D1B3E; border-radius: 24px; padding: 36px 28px; color: #fff; box-shadow: 0 30px 60px rgba(13,27,62,0.3); position: relative; overflow: hidden; text-align: center; margin-top: 20px; }
        .score-final::before { content: ''; position: absolute; top: -80px; right: -80px; width: 260px; height: 260px; background: radial-gradient(circle, rgba(26,107,255,0.3) 0%, transparent 65%); pointer-events: none; }
        .score-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(52,208,88,0.15); color: #34D058; font-size: 12px; font-weight: 700; padding: 5px 14px; border-radius: 100px; margin-bottom: 20px; position: relative; z-index: 1; }
        .credit-meter { position: relative; margin: 0 auto 18px; z-index: 1; max-width: 280px; }
        .credit-value { font-size: 56px; font-weight: 800; line-height: 1; margin-top: -22px; letter-spacing: -2px; font-variant-numeric: tabular-nums; }
        .credit-sub { font-size: 13px; color: rgba(255,255,255,0.65); margin-top: 4px; font-weight: 600; }
        .verdict { font-size: 20px; font-weight: 800; margin-bottom: 6px; position: relative; z-index: 1; }
        .score-sub { font-size: 14px; color: rgba(255,255,255,0.65); line-height: 1.5; margin: 8px 0 24px; position: relative; z-index: 1; }
        .ref { background: rgba(255,255,255,0.06); border-radius: 12px; padding: 12px 16px; font-family: monospace; font-size: 11px; margin-bottom: 20px; color: rgba(255,255,255,0.7); position: relative; z-index: 1; word-break: break-all; }
        .code-box { background: linear-gradient(145deg, #1A6BFF, #0D4FD1); border-radius: 18px; padding: 20px; margin-bottom: 20px; position: relative; z-index: 1; box-shadow: 0 12px 28px rgba(26,107,255,0.4); border: 2px solid rgba(255,255,255,0.15); }
        .code-label { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.75); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 10px; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .code-value { font-family: 'SF Mono', 'Monaco', 'Consolas', monospace; font-size: 28px; font-weight: 800; color: #fff; letter-spacing: 0.08em; margin-bottom: 12px; }
        @media (max-width: 480px) { .code-value { font-size: 22px; } }
        .code-copy { background: rgba(255,255,255,0.15); border: 1.5px solid rgba(255,255,255,0.25); color: #fff; font-family: inherit; font-size: 12px; font-weight: 700; padding: 8px 20px; border-radius: 100px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s; }
        .code-copy:hover { background: rgba(255,255,255,0.25); }
        .code-copy.copied { background: #34D058; border-color: #34D058; }
        .code-warn { font-size: 11px; color: rgba(255,255,255,0.7); margin-top: 10px; line-height: 1.4; }
        .btn-wa { width: 100%; background: #25D366; color: #fff; font-family: inherit; font-size: 15px; font-weight: 700; padding: 16px 24px; border-radius: 100px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 10px; position: relative; z-index: 1; }
        .btn-home { width: 100%; background: transparent; color: rgba(255,255,255,0.7); border: 1.5px solid rgba(255,255,255,0.2); font-family: inherit; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 100px; cursor: pointer; position: relative; z-index: 1; text-decoration: none; display: block; text-align: center; box-sizing: border-box; }
        .btn-home:hover { color: #fff; border-color: rgba(255,255,255,0.4); }

        /* Mia bandeau inline (toujours visible au-dessus des cards) */
        .mia-strip { display: flex; align-items: flex-start; gap: 12px; background: linear-gradient(135deg, #EEF4FF 0%, #DBE8FF 100%); border: 1.5px solid rgba(26,107,255,0.2); border-radius: 16px; padding: 14px 16px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(26,107,255,0.08); position: relative; }
        .mia-strip-avatar { width: 40px; height: 40px; border-radius: 50%; background: #1A6BFF; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 10px rgba(26,107,255,0.3); animation: mia-float 3s ease-in-out infinite; }
        @keyframes mia-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        .mia-strip-text { flex: 1; min-width: 0; }
        .mia-strip-name { font-size: 12px; font-weight: 800; color: #1A6BFF; margin-bottom: 2px; display: flex; align-items: center; gap: 6px; }
        .mia-strip-name::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #34D058; display: inline-block; animation: mia-pulse-dot 2s infinite; }
        @keyframes mia-pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        .mia-strip-body { font-size: 13px; color: #0D1B3E; line-height: 1.45; font-weight: 500; }

        /* Mascotte flottante (bouton bas-droite) */
        .mascot-fab { position: fixed; right: 20px; bottom: 20px; width: 64px; height: 64px; border-radius: 50%; border: none; background: #1A6BFF; box-shadow: 0 12px 30px rgba(26,107,255,0.4), 0 2px 6px rgba(13,27,62,0.1); cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 60; transition: transform 0.2s; animation: mia-breathe 3s ease-in-out infinite; }
        @keyframes mia-breathe { 0%, 100% { box-shadow: 0 12px 30px rgba(26,107,255,0.4), 0 2px 6px rgba(13,27,62,0.1); } 50% { box-shadow: 0 12px 36px rgba(26,107,255,0.55), 0 2px 6px rgba(13,27,62,0.1); } }
        .mascot-fab:hover { transform: scale(1.08); }
        .mascot-fab.on { background: #0D4FD1; animation: none; }
        .mascot-pulse { position: absolute; top: 6px; right: 6px; width: 12px; height: 12px; border-radius: 50%; background: #34D058; border: 2px solid #fff; box-shadow: 0 0 0 0 rgba(52,208,88,0.6); animation: mia-pulse 2s infinite; }
        @keyframes mia-pulse { 0% { box-shadow: 0 0 0 0 rgba(52,208,88,0.6);} 70% { box-shadow: 0 0 0 10px rgba(52,208,88,0);} 100% { box-shadow: 0 0 0 0 rgba(52,208,88,0);} }
        .mascot-bubble { position: fixed; right: 20px; bottom: 94px; width: calc(100% - 40px); max-width: 320px; background: #fff; border-radius: 18px; box-shadow: 0 24px 50px rgba(13,27,62,0.2), 0 6px 14px rgba(13,27,62,0.08); padding: 16px 18px 18px; z-index: 60; border: 1.5px solid rgba(26,107,255,0.2); animation: mia-pop 0.25s ease-out; }
        @keyframes mia-pop { from { opacity: 0; transform: translateY(10px) scale(0.95);} to { opacity: 1; transform: translateY(0) scale(1);} }
        .mascot-close { position: absolute; top: 10px; right: 10px; background: #F3F4F6; border: none; width: 26px; height: 26px; border-radius: 50%; padding: 0; color: #666; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .mascot-close:hover { background: #E5E7EB; color: #111; }
        .mascot-close svg { display: block; }
        .mascot-title { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 800; color: #0D1B3E; margin-bottom: 8px; padding-right: 24px; }
        .mascot-avatar { width: 28px; height: 28px; border-radius: 50%; overflow: hidden; display: inline-flex; align-items: center; justify-content: center; background: #1A6BFF; }
        .mascot-body { font-size: 14px; color: #333; line-height: 1.5; }
        .mascot-actions { display: flex; flex-direction: column; gap: 6px; margin-top: 12px; }
        .mascot-btn { background: #F5F7FB; border: 1.5px solid #E5E7EB; border-radius: 10px; padding: 10px 12px; font-family: inherit; font-size: 13px; font-weight: 700; color: #0D1B3E; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.15s; }
        .mascot-btn:hover { background: #EEF4FF; border-color: #1A6BFF; color: #1A6BFF; }
        .mascot-btn.primary { background: #1A6BFF; color: #fff; border-color: #1A6BFF; box-shadow: 0 4px 10px rgba(26,107,255,0.3); }
        .mascot-btn.primary:hover { background: #1560E0; }
      `}</style>

      <div className="top">
        <Logo height={56} tone="light" />
        <a className="back" href="/" onClick={(e) => { e.preventDefault(); navigate({ to: '/' }) }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 7H3M6 4L3 7l3 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Retour à l'accueil
        </a>
      </div>

      <div className="wrap">
        <div className="progress">
          {[1, 2, 3, 4].map(n => <div key={n} className={`dot ${step >= n ? 'on' : ''}`} />)}
        </div>
        <div className="etape">Étape {step} sur 4</div>

        {step === 1 && <>
          <h1 className="h1">Qui demande le financement&nbsp;?</h1>
          <p className="sub">Choisissez votre profil pour accéder au formulaire adapté.</p>
          <MiaStrip tipKey={tipKey}/>
          <div className="cards-3d">
            <button className={`card-choix physique ${type === 'physique' ? 'sel' : ''}`} onClick={() => setType('physique')}>
              <div className="glow a" /><div className="shine" />
              <div className="card-icon on">
                <svg width="26" height="26" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="6.5" r="3.5" fill="white"/><path d="M3 17c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
              <h3 className="card-h3">Personne physique</h3>
              <p className="card-p">Particulier, salarié, commerçant, artisan…</p>
            </button>
            <button className={`card-choix morale ${type === 'morale' ? 'sel' : ''}`} onClick={() => setType('morale')}>
              <div className="glow b" />
              <div className="card-icon off">
                <svg width="26" height="26" viewBox="0 0 20 20" fill="none"><rect x="3" y="7" width="14" height="11" rx="1.5" stroke="#111" strokeWidth="2"/><path d="M7 18V13h6v5" stroke="#111" strokeWidth="2" strokeLinecap="round"/><path d="M6 7V4a1 1 0 011-1h6a1 1 0 011 1v3" stroke="#111" strokeWidth="2"/><rect x="7.5" y="9.5" width="2" height="2" rx="0.5" fill="#111"/><rect x="10.5" y="9.5" width="2" height="2" rx="0.5" fill="#111"/></svg>
              </div>
              <h3 className="card-h3" style={{ color: '#111' }}>Personne morale / PME</h3>
              <p className="card-p">Entreprise, coopérative, société…</p>
            </button>
          </div>
          <button className="btn-main" disabled={!type} onClick={() => setStep(2)}>
            Continuer
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9h10M10 5l4 4-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </>}

        {step === 2 && <>
          <div className="badge">{isP ? 'Personne physique' : 'Personne morale'}</div>
          <h1 className="h1">{isP ? 'Votre profession' : "Votre secteur d'activité"}</h1>
          <p className="sub">{isP ? 'Sélectionnez votre situation professionnelle.' : "Sélectionnez le secteur de votre entreprise."}</p>
          <MiaStrip tipKey={tipKey}/>
          <div className="chips">
            {(isP ? ACTIVITES_PHYSIQUE : ACTIVITES_MORALE).map(a =>
              <button key={a} className={`chip ${activite === a ? 'sel' : ''}`} onClick={() => setActivite(a)}>
                {(isP ? ICON_P : ICON_M)[a]}<span>{a}</span>
              </button>
            )}
          </div>
          <button className="btn-main" disabled={!activite} onClick={() => setStep(3)}>
            Continuer
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9h10M10 5l4 4-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button className="btn-back" onClick={() => setStep(1)}><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 7H3M6 4L3 7l3 3" stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>Retour</button>
        </>}

        {step === 3 && <>
          <div className="badge">{isP ? 'Personne physique' : 'Personne morale'} · {activite}</div>
          <h1 className="h1">Votre dossier</h1>
          <p className="sub">Cela prend moins de 2 minutes. Tous les champs sont obligatoires sauf l'email.</p>
          <MiaStrip tipKey={tipKey}/>

          <div className="form-stack">
            {/* 1. IDENTITÉ */}
            <div className="form-card" ref={sectionRefs.identite} onFocus={() => setActiveSection('identite')} tabIndex={-1}>
              <div className="card-title">1. Identité</div>
              <div className="fields">
                {isP ? <>
                  <div className="field"><label>Prénom *</label><input placeholder="Ex : Jean-Pierre" value={form['prenom']||''} onChange={e=>set('prenom',e.target.value)}/></div>
                  <div className="field"><label>Nom *</label><input placeholder="Ex : Moukouama" value={form['nom']||''} onChange={e=>set('nom',e.target.value)}/></div>
                </> : <>
                  <div className="field"><label>Raison sociale *</label><input placeholder="Ex : Jespere SARL" value={form['raison_sociale']||''} onChange={e=>set('raison_sociale',e.target.value)}/></div>
                  <div className="field"><label>Nom du dirigeant *</label><input placeholder="Ex : Alain Mabiala" value={form['dirigeant']||''} onChange={e=>set('dirigeant',e.target.value)}/></div>
                </>}
                <div className="field"><label>Téléphone *</label><input
                  type="tel" inputMode="numeric" placeholder="Ex : 06 123 4567" maxLength={11}
                  value={formatPhone(form['tel']||'')} onChange={e=>set('tel', cleanPhone(e.target.value))}/></div>
                <div className="field"><label>Email (facultatif)</label><input type="email" placeholder="Ex : jp.moukouama@gmail.com" value={form['email']||''} onChange={e=>set('email',e.target.value)}/></div>
                <div className="field"><label>Ville *</label>
                  <select
                    required
                    className={!form['ville'] ? 'empty' : ''}
                    value={form['ville']||''}
                    onChange={e=>set('ville',e.target.value)}
                  >
                    <option value="" disabled>Sélectionner…</option>
                    {VILLES.map(v=><option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* 2. SITUATION */}
            <div className="form-card" ref={sectionRefs.situation} onFocus={() => setActiveSection('situation')} tabIndex={-1}>
              <div className="card-title">2. Situation {isP ? 'professionnelle' : 'juridique'}</div>
              <div className="fields">
                {isP ? <>
                  <div className="field"><label>Employeur / Administration *</label><input placeholder="Ex : Ministère de l'Économie" value={form['employeur']||''} onChange={e=>set('employeur',e.target.value)}/></div>

                  {/* Type de contrat (uniquement Salarié privé) */}
                  {needContrat && (
                    <div className="field radio-field">
                      <label>Type de contrat *</label>
                      <div className="contrat-chips">
                        {CONTRATS.map(c => (
                          <button
                            key={c} type="button"
                            className={`contrat-chip ${form['contrat'] === c ? 'sel' : ''}`}
                            onClick={() => set('contrat', c)}
                          >{c}</button>
                        ))}
                      </div>
                      {form['contrat'] === 'CDI' && <div className="field-hint">✓ CDI = meilleure éligibilité</div>}
                      {form['contrat'] === 'Stage' && <div className="field-hint" style={{ color: '#B91C1C' }}>⚠ Les stagiaires ne sont généralement pas éligibles</div>}
                    </div>
                  )}

                  {/* Durée restante si CDD/Intérim/Stage */}
                  {needDureeRestante && (
                    <div className="field"><label>Durée restante du contrat (mois) *</label><input
                      type="number" placeholder="Ex : 18" min="0" max="120"
                      value={form['duree_restante']||''}
                      onChange={e=>set('duree_restante', e.target.value)}
                    /></div>
                  )}

                  {/* Ancienneté par tranches */}
                  <div className="field anc-wrap">
                    <label>Ancienneté dans l'emploi *</label>
                    <AncienneteChips value={form['anciennete_tr']||''} onChange={v=>set('anciennete_tr', v)}/>
                  </div>

                  <div className="field"><label>Revenu net mensuel (XAF) *</label><input
                    type="text" inputMode="numeric" placeholder="Ex : 350 000"
                    value={formatMoney(form['revenu']||'')} onChange={e=>set('revenu', cleanMoney(e.target.value))}/></div>
                </> : <>
                  <div className="field radio-field"><label>RCCM *</label>
                    <div className="radio">{['Oui','Non'].map(v=><button key={v} type="button" className={form['rccm']===v?'sel':''} onClick={()=>set('rccm',v)}>{v}</button>)}</div>
                  </div>
                  {form['rccm'] === 'Oui' && (
                    <div className="field"><label>NIU *</label><input placeholder="Ex : M2019051234" value={form['niu']||''} onChange={e=>set('niu',e.target.value)}/></div>
                  )}
                  <div className="field anc-wrap">
                    <label>Ancienneté de la société *</label>
                    <AncienneteChips value={form['anciennete_soc_tr']||''} onChange={v=>set('anciennete_soc_tr', v)}/>
                  </div>
                  <div className="field"><label>Chiffre d'affaires annuel (XAF) *</label><input
                    type="text" inputMode="numeric" placeholder="Ex : 50 000 000"
                    value={formatMoney(form['ca_annuel']||'')} onChange={e=>set('ca_annuel', cleanMoney(e.target.value))}/></div>
                </>}
              </div>
            </div>

            {/* 3. BESOIN */}
            <div className="form-card" ref={sectionRefs.besoin} onFocus={() => setActiveSection('besoin')} tabIndex={-1}>
              <div className="card-title">3. Votre besoin</div>
              <div className="fields">
                <div className="field"><label>Montant demandé (XAF) *</label><input
                  type="text" inputMode="numeric" placeholder="Ex : 5 000 000"
                  value={formatMoney(form['montant']||'')} onChange={e=>set('montant', cleanMoney(e.target.value))}/></div>
                <div className="field"><label>Objet du financement *</label>
                  <select
                    required
                    className={!form['objet'] ? 'empty' : ''}
                    value={form['objet']||''}
                    onChange={e=>set('objet',e.target.value)}
                  >
                    <option value="" disabled>Sélectionner…</option>
                    {(isP ? ['Consommation','Immobilier','Véhicule','Autre'] : ['Investissement','Fonds de roulement','Marché public','Autre']).map(o=><option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                {!isP && <div className="field"><label>Flux mensuel moyen (XAF) *</label><input
                  type="text" inputMode="numeric" placeholder="Ex : 2 000 000"
                  value={formatMoney(form['flux_mois']||'')} onChange={e=>set('flux_mois', cleanMoney(e.target.value))}/></div>}
              </div>
            </div>

            {/* 4. ÉLIGIBILITÉ */}
            <div className="form-card" ref={sectionRefs.eligibilite} onFocus={() => setActiveSection('eligibilite')} tabIndex={-1}>
              <div className="card-title">4. Éligibilité</div>
              <div className="fields">
                <div className="field"><label>Banque actuelle *</label>
                  <select
                    required
                    className={!form['banque'] ? 'empty' : ''}
                    value={form['banque']||''}
                    onChange={e=>set('banque',e.target.value)}
                  >
                    <option value="" disabled>Sélectionner…</option>
                    {BANQUES.map(b=><option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                {isP ? <>
                  <div className="field radio-field"><label>Salaire domicilié dans cette banque ? *</label>
                    <div className="radio">{['Oui','Non'].map(v=><button key={v} type="button" className={form['salaire_domic']===v?'sel':''} onClick={()=>set('salaire_domic',v)}>{v}</button>)}</div>
                  </div>
                  {form['salaire_domic'] === 'Oui' && (
                    <div className="field anc-wrap">
                      <label>Depuis quand le compte est-il ouvert ? *</label>
                      <AncienneteChips value={form['anciennete_cpt_tr']||''} onChange={v=>set('anciennete_cpt_tr', v)}/>
                    </div>
                  )}
                </> : <>
                  <div className="field radio-field"><label>Compte bancaire mouvementé ? *</label>
                    <div className="radio">{['Oui','Non'].map(v=><button key={v} type="button" className={form['compte_mouvemente']===v?'sel':''} onClick={()=>set('compte_mouvemente',v)}>{v}</button>)}</div>
                  </div>
                  <div className="field radio-field"><label>Refus bancaire antérieur ? *</label>
                    <div className="radio">{['Oui','Non'].map(v=><button key={v} type="button" className={form['refus_bancaire']===v?'sel':''} onClick={()=>set('refus_bancaire',v)}>{v}</button>)}</div>
                  </div>
                  <div className="field radio-field"><label>Garanties disponibles ? *</label>
                    <div className="radio">{['Oui','Non'].map(v=><button key={v} type="button" className={form['garanties']===v?'sel':''} onClick={()=>set('garanties',v)}>{v}</button>)}</div>
                  </div>
                </>}
              </div>
            </div>
          </div>

          <button className="btn-main" disabled={loading || !canSubmit} onClick={soumettre}>
            {loading ? 'Envoi en cours…' : 'Voir mon score'}
            {!loading && <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9h10M10 5l4 4-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </button>

          {submitError && <div className="submit-error">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="9" cy="9" r="7" stroke="#B91C1C" strokeWidth="1.6"/><path d="M9 5v4M9 12v.5" stroke="#B91C1C" strokeWidth="1.6" strokeLinecap="round"/></svg>
            <div>{submitError}</div>
          </div>}

          <button className="btn-back" onClick={() => setStep(2)}><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 7H3M6 4L3 7l3 3" stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>Retour</button>
        </>}

        {step === 4 && <div className="score-final">
          <div className="score-badge">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 6l2 2 4-4" stroke="#34D058" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Dossier reçu · Score crédit
          </div>
          <CreditScoreMeter score={score} />
          <div className="verdict" style={{ color: score>=70?'#34D058':score>=50?'#FFB020':'#FF6B6B' }}>
            {score >= 70 ? 'Dossier excellent' : score >= 50 ? 'Dossier éligible' : 'Dossier à renforcer'}
          </div>
          <p className="score-sub">{score >= 70 ? 'Votre dossier est très éligible. Un conseiller Mayinvest vous contacte sous 24h.' : score >= 50 ? 'Éligible. Notre équipe va renforcer votre dossier avec vous.' : 'Améliorons votre dossier ensemble. Un conseiller vous rappelle sous 24h.'}</p>

          <div className="code-box">
            <div className="code-label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="10" rx="2" stroke="#fff" strokeWidth="2"/><path d="M8 11V7a4 4 0 018 0v4" stroke="#fff" strokeWidth="2"/></svg>
              Votre code d'accès
            </div>
            <div className="code-value">{accessCode}</div>
            <button className={`code-copy ${codeCopied ? 'copied' : ''}`} onClick={copyCode}>
              {codeCopied ? <>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l2.5 2.5L10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Copié !
              </> : <>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><rect x="3" y="3" width="8" height="9" rx="1" stroke="#fff" strokeWidth="1.5"/><path d="M5 3V2a1 1 0 011-1h5a1 1 0 011 1v8a1 1 0 01-1 1h-1" stroke="#fff" strokeWidth="1.5"/></svg>
                Copier le code
              </>}
            </button>
            <div className="code-warn">⚠️ Notez ce code. Il vous servira à retrouver votre dossier (avec votre numéro ou email).</div>
          </div>

          <div className="ref">Réf. {leadId}</div>
          <button className="btn-wa" style={{ background: '#1A6BFF', marginBottom: 10 }} onClick={() => navigate({ to: '/client/$id', params: { id: leadId } })}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" stroke="#fff" strokeWidth="1.8"/></svg>
            Accéder à mon dossier
          </button>
          <button className="btn-wa" onClick={() => window.open(`https://wa.me/242060000000?text=Bonjour Mayinvest, j'ai soumis mon dossier. Code: ${accessCode}`,'_blank')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M17.5 14.4l-2.4-1.2c-.3-.2-.7-.1-1 .2l-.7.8c-.2.2-.5.3-.8.1-.9-.4-1.8-1-2.6-1.7-.7-.8-1.3-1.7-1.7-2.6-.1-.3 0-.6.2-.8l.8-.7c.3-.2.4-.6.2-1L8.3 5c-.2-.4-.7-.5-1-.3L5.5 6c-.5.2-.8.7-.7 1.2.4 2.8 1.7 5.4 3.6 7.4 2 2 4.6 3.3 7.4 3.6.5.1 1-.2 1.2-.7l1.3-1.8c.2-.4.1-.9-.3-1.1l-.5-.2z"/></svg>
            Discuter avec un conseiller sur WhatsApp
          </button>
          <a className="btn-home" href="/" onClick={(e) => { e.preventDefault(); navigate({ to: '/' }) }}>← Retour à l'accueil</a>
        </div>}
      </div>

      <Mascot tipKey={tipKey} open={mascotOpen} onClose={closeMia} onOpen={() => setMascotOpen(true)} actions={miaActions} />
    </div>
  )
}
