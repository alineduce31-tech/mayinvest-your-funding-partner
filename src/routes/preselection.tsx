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
const VILLES = [
  'Brazzaville',
  'Pointe-Noire',
  'Dolisie',
  'Nkayi',
  'Ouesso',
  'Impfondo',
  'Owando',
  'Madingou',
  'Mossendjo',
  'Kinkala',
  'Loandjili',
  'Sibiti',
  'Djambala',
  'Gamboma',
  'Makoua',
  'Ewo',
  'Oyo',
  'Loutété',
  'Mindouli',
  'Boundji',
  'Kibangou',
  'Divénié',
  'Dongou',
  'Souanké',
  'Sembé',
  'Kellé',
  'Mbinda',
  'Mouyondzi',
  'Autre',
]
const CONTRATS = ['CDI', 'CDD', 'Intérim', 'Stage', 'Autre']

/* ---------- Validation par champ ---------- */
type FieldCheck = { ok: boolean; msg?: string; example?: string; label?: string }
function validateField(key: string, value: string, isP: boolean): FieldCheck {
  const v = (value || '').trim()
  switch (key) {
    case 'prenom': return v.length >= 2 ? { ok: true, label: 'Prénom' } : { ok: false, label: 'Prénom', msg: 'Prénom trop court', example: 'Ex : Jean-Pierre' }
    case 'nom': return v.length >= 2 ? { ok: true, label: 'Nom' } : { ok: false, label: 'Nom', msg: 'Nom trop court', example: 'Ex : Moukouama' }
    case 'raison_sociale': return v.length >= 2 ? { ok: true, label: 'Raison sociale' } : { ok: false, label: 'Raison sociale', msg: 'Nom de la société manquant', example: 'Ex : Jespere SARL' }
    case 'dirigeant': return v.length >= 2 ? { ok: true, label: 'Dirigeant' } : { ok: false, label: 'Dirigeant', msg: 'Nom du dirigeant manquant', example: 'Ex : Alain Mabiala' }
    case 'tel': return v.length === 9 ? { ok: true, label: 'Téléphone' } : { ok: false, label: 'Téléphone', msg: 'Le téléphone doit faire 9 chiffres (sans le +242)', example: 'Ex : 06 123 4567' }
    case 'email': return !v ? { ok: true, label: 'Email' } : (/\S+@\S+\.\S+/.test(v) ? { ok: true, label: 'Email' } : { ok: false, label: 'Email', msg: 'Format email invalide', example: 'Ex : jean.moukouama@gmail.com' })
    case 'ville': return v ? { ok: true, label: 'Ville' } : { ok: false, label: 'Ville', msg: 'Choisissez votre ville dans la liste', example: 'Ex : Brazzaville' }
    case 'employeur': return v.length >= 2 ? { ok: true, label: 'Employeur' } : { ok: false, label: 'Employeur', msg: 'Indiquez votre employeur ou administration', example: "Ex : Ministère de l'Économie, SOCOFRAN…" }
    case 'contrat': return v ? { ok: true, label: 'Contrat' } : { ok: false, label: 'Contrat', msg: 'Choisissez votre type de contrat', example: 'CDI, CDD, Intérim, Stage ou Autre' }
    case 'duree_restante': return parseInt(v || '0') > 0 ? { ok: true, label: 'Durée restante' } : { ok: false, label: 'Durée restante', msg: 'Indiquez combien de mois il reste à votre contrat', example: 'Ex : 18 (pour 18 mois restants)' }
    case 'anciennete_tr': return v ? { ok: true, label: 'Ancienneté' } : { ok: false, label: 'Ancienneté', msg: 'Choisissez votre ancienneté dans la liste', example: 'Ex : « 1 à 3 ans »' }
    case 'anciennete_soc_tr': return v ? { ok: true, label: 'Ancienneté société' } : { ok: false, label: 'Ancienneté société', msg: "Choisissez l'ancienneté de votre société", example: 'Ex : « 3 à 5 ans »' }
    case 'anciennete_cpt_tr': return v ? { ok: true, label: 'Compte ouvert depuis' } : { ok: false, label: 'Compte', msg: 'Depuis quand le compte est-il ouvert ?', example: 'Ex : « 1 à 3 ans »' }
    case 'revenu': return parseInt(v || '0') >= 50000 ? { ok: true, label: 'Revenu' } : { ok: false, label: 'Revenu', msg: 'Indiquez votre revenu net mensuel (minimum 50 000 XAF)', example: 'Ex : 350 000' }
    case 'ca_annuel': return parseInt(v || '0') >= 100000 ? { ok: true, label: 'CA annuel' } : { ok: false, label: 'CA annuel', msg: "Indiquez le chiffre d'affaires annuel", example: 'Ex : 50 000 000' }
    case 'rccm': return v ? { ok: true, label: 'RCCM' } : { ok: false, label: 'RCCM', msg: 'La société est-elle enregistrée au RCCM ?', example: 'Oui = enregistrée · Non = pas encore' }
    case 'niu': return v.length >= 5 ? { ok: true, label: 'NIU' } : { ok: false, label: 'NIU', msg: "Numéro d'Identification Unique de la société", example: 'Ex : M2019051234' }
    case 'montant': return parseInt(v || '0') >= 100000 ? { ok: true, label: 'Montant' } : { ok: false, label: 'Montant', msg: 'Montant minimum 100 000 XAF', example: 'Ex : 5 000 000' }
    case 'objet': return v ? { ok: true, label: 'Objet' } : { ok: false, label: 'Objet', msg: 'Choisissez pourquoi vous voulez le prêt', example: isP ? 'Consommation, Immobilier, Véhicule…' : 'Investissement, Fonds de roulement, Marché public…' }
    case 'flux_mois': return parseInt(v || '0') > 0 ? { ok: true, label: 'Flux mensuel' } : { ok: false, label: 'Flux mensuel', msg: 'Indiquez le flux mensuel moyen', example: 'Ex : 2 000 000' }
    case 'banque': return v ? { ok: true, label: 'Banque' } : { ok: false, label: 'Banque', msg: 'Choisissez votre banque actuelle', example: "Ex : BGFI Bank. Choisissez « Aucune » si vous n'en avez pas." }
    case 'salaire_domic': return v ? { ok: true, label: 'Domiciliation' } : { ok: false, label: 'Domiciliation', msg: 'Votre salaire est-il versé sur ce compte bancaire ?', example: 'Oui ou Non' }
    case 'compte_mouvemente': return v ? { ok: true, label: 'Compte mouvementé' } : { ok: false, label: 'Compte mouvementé', msg: 'Avez-vous des transactions régulières sur ce compte ?', example: 'Oui ou Non' }
    case 'refus_bancaire': return v ? { ok: true, label: 'Refus bancaire' } : { ok: false, label: 'Refus bancaire', msg: "Une banque a-t-elle déjà refusé un financement ?", example: 'Oui ou Non' }
    case 'garanties': return v ? { ok: true, label: 'Garanties' } : { ok: false, label: 'Garanties', msg: 'Avez-vous des biens à mettre en garantie ?', example: 'Terrain, véhicule, matériel…' }
    default: return { ok: true }
  }
}

/* ---------- Dropdown custom ---------- */
function CustomSelect({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])
  return (
    <div className="cs-wrap" ref={ref}>
      <button
        type="button"
        className={`cs-trigger ${!value ? 'empty' : ''} ${open ? 'open' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <span>{value || placeholder}</span>
        <svg className={`cs-chev ${open ? 'rot' : ''}`} width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 5l4 4 4-4" stroke="#888" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="cs-menu">
          {options.map(o => (
            <button
              key={o}
              type="button"
              className={`cs-opt ${o === value ? 'sel' : ''}`}
              onClick={() => { onChange(o); setOpen(false) }}
            >
              <span>{o}</span>
              {o === value && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-6" stroke="#1A6BFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

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

/* ---------- Mascotte "Haki" ---------- */
const TIPS: Record<string, { title: string; body: string }> = {
  'step1': { title: 'Bienvenue 👋', body: "Je m'appelle Haki, votre assistant Mayinvest. Choisissez votre profil pour démarrer." },
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

type HakiAction = { label: string; onClick: () => void; primary?: boolean; icon?: ReactNode }
type HakiChip = { label: string; onClick: () => void; selected?: boolean; icon?: ReactNode }
type HakiMsg = { title?: string; body: string; actions?: HakiAction[]; chips?: HakiChip[]; success?: boolean }

function HakiAssistant({ msg, open, onToggle, onDecline, accepted, autoMode, onToggleAuto }: {
  msg: HakiMsg
  open: boolean
  onToggle: () => void
  onDecline: () => void
  accepted: boolean
  autoMode: boolean
  onToggleAuto: () => void
}) {
  const [showAutoHelp, setShowAutoHelp] = useState(false)
  // Avatar Haki : globe oculaire 3D haute résolution (viewBox 200x200 pour netteté max)
  const avatar = (size: number) => (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" shapeRendering="geometricPrecision">
      <defs>
        {/* Blanc de l'œil avec rendu 3D */}
        <radialGradient id="haki-eyeball" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffffff"/>
          <stop offset="55%" stopColor="#f5f5f5"/>
          <stop offset="85%" stopColor="#d8d8d8"/>
          <stop offset="100%" stopColor="#a8a8a8"/>
        </radialGradient>
        {/* Iris marron 3D riche */}
        <radialGradient id="haki-iris" cx="40%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#c88a4a"/>
          <stop offset="35%" stopColor="#8b5a2b"/>
          <stop offset="75%" stopColor="#4a2d14"/>
          <stop offset="100%" stopColor="#1a0d04"/>
        </radialGradient>
        {/* Ombre interne de la sphère */}
        <radialGradient id="haki-inner-shadow" cx="50%" cy="50%" r="50%">
          <stop offset="75%" stopColor="rgba(0,0,0,0)"/>
          <stop offset="100%" stopColor="rgba(0,0,0,0.35)"/>
        </radialGradient>
      </defs>

      {/* Globe oculaire principal */}
      <circle cx="100" cy="100" r="95" fill="url(#haki-eyeball)"/>
      {/* Ombre interne pour profondeur 3D */}
      <circle cx="100" cy="100" r="95" fill="url(#haki-inner-shadow)"/>
      {/* Contour noir fin */}
      <circle cx="100" cy="100" r="95" fill="none" stroke="#000" strokeWidth="4"/>

      {/* Veines rouges légères */}
      <path d="M15 120 Q 40 115, 55 125" stroke="#f0a0a0" strokeWidth="1.2" fill="none" opacity="0.5"/>
      <path d="M185 90 Q 165 100, 150 90" stroke="#f0a0a0" strokeWidth="1.2" fill="none" opacity="0.5"/>

      {/* Groupe œil animé (iris + pupille + reflets) */}
      <g className="haki-eye-ball">
        <circle cx="100" cy="100" r="55" fill="url(#haki-iris)"/>
        <circle cx="100" cy="100" r="55" fill="none" stroke="#1a0d04" strokeWidth="2.5" opacity="0.6"/>
        <circle cx="100" cy="100" r="40" fill="none" stroke="#2a1a0a" strokeWidth="1.5" opacity="0.4"/>
        <circle cx="100" cy="100" r="22" fill="#000"/>
        <ellipse cx="112" cy="85" rx="10" ry="8" fill="#fff" opacity="0.95"/>
        <circle cx="90" cy="110" r="4.5" fill="#fff" opacity="0.75"/>
        <circle cx="120" cy="112" r="2.5" fill="#fff" opacity="0.6"/>
      </g>

      {/* Reflet spéculaire général sphère brillante */}
      <ellipse cx="60" cy="45" rx="30" ry="18" fill="#fff" opacity="0.35"/>
    </svg>
  )

  return (
    <>
      {/* Bouton flottant Haki (toujours visible) */}
      <button className={`haki-fab ${open ? 'on' : ''}`} onClick={onToggle} aria-label="Assistant Haki">
        <span className="haki-fab-inner">{avatar(44)}</span>
        {!open && accepted && <span className="haki-fab-dot" />}
        {!open && !accepted && <span className="haki-fab-badge">1</span>}
      </button>

      {/* Panneau Haki (chat-like) */}
      {open && (
        <div className="haki-panel">
          <div className="haki-head">
            <div className="haki-head-left">
              <div className="haki-avatar-wrap">
                {avatar(42)}
                <span className="haki-status" />
              </div>
              <div>
                <div className="haki-name">Haki</div>
                <div className="haki-sub"><span className="haki-dot" />En ligne · Assistante Mayinvest</div>
              </div>
            </div>
            <button className="haki-minimize" onClick={onToggle} aria-label="Fermer">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>

          <div className="haki-chat">
            <div className="haki-msg-row">
              <div className="haki-msg-avatar">{avatar(28)}</div>
              <div className={`haki-msg ${msg.success ? 'success' : ''}`}>
                {msg.title && <div className="haki-msg-title">{msg.title}</div>}
                <div className="haki-msg-body">{msg.body}</div>
              </div>
            </div>

            {msg.chips && msg.chips.length > 0 && (
              <div className="haki-chips">
                {msg.chips.map((c, i) => (
                  <button
                    key={i}
                    className={`haki-chip ${c.selected ? 'sel' : ''}`}
                    onClick={c.onClick}
                  >
                    {c.icon && <span className="haki-chip-ic">{c.icon}</span>}
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            )}
            {msg.actions && msg.actions.length > 0 && (
              <div className="haki-actions">
                {msg.actions.map((a, i) => (
                  <button
                    key={i}
                    className={`haki-btn ${a.primary ? 'primary' : ''}`}
                    onClick={a.onClick}
                  >
                    {a.icon}
                    <span>{a.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {!accepted && (
            <button className="haki-decline" onClick={onDecline}>Non merci, je gère seul</button>
          )}

          {/* Zone de réglage : Mode automatique — toujours visible */}
          <div className="haki-settings">
              <div className="haki-auto-row">
                <div className="haki-auto-info">
                  <div className="haki-auto-label">Mode automatique</div>
                  <div className="haki-auto-state">{autoMode ? 'Activé' : 'Désactivé'}</div>
                </div>
                <button
                  className={`haki-switch ${autoMode ? 'on' : ''}`}
                  onClick={onToggleAuto}
                  aria-label="Activer ou désactiver le mode automatique"
                >
                  <span className="haki-switch-knob"/>
                </button>
                <button
                  className="haki-help-btn"
                  onClick={() => setShowAutoHelp(h => !h)}
                  aria-label="Explication"
                >?</button>
              </div>
              {showAutoHelp && (
                <div className="haki-help-box">
                  <button className="haki-help-close" onClick={() => setShowAutoHelp(false)} aria-label="Fermer l'explication">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  </button>
                  <div className="haki-help-title">À quoi sert ce bouton ?</div>
                  <div className="haki-help-text">
                    <strong>Activé</strong> : Haki s'ouvre automatiquement à chaque étape pour vous expliquer quoi faire. Idéal si c'est votre première fois.<br/><br/>
                    <strong>Désactivé</strong> : Haki reste discret. Vous l'ouvrez quand vous avez besoin en cliquant sur le bouton bleu en bas.
                  </div>
                </div>
              )}
          </div>
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
          <line x1="90" y1="100" x2="90" y2="48" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
          <circle cx="90" cy="48" r="2.5" fill="#fff"/>
          <circle cx="90" cy="100" r="7" fill="#fff"/>
          <circle cx="90" cy="100" r="4" fill={color}/>
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

/* ---------- Confettis (step 4 si score >= 70) ---------- */
function Confetti() {
  const pieces = Array.from({ length: 60 }, (_, i) => i)
  const colors = ['#1A6BFF', '#34D058', '#FFB020', '#FF6B6B', '#A855F7', '#F59E0B', '#06B6D4']
  return (
    <div className="confetti-wrap" aria-hidden="true">
      {pieces.map(i => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${Math.random() * 100}%`,
            background: colors[i % colors.length],
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${2.5 + Math.random() * 2}s`,
            width: `${6 + Math.random() * 6}px`,
            height: `${10 + Math.random() * 8}px`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
    </div>
  )
}

/* ---------- Badge d'éligibilité (Gold / Silver / Bronze) ---------- */
function EligibilityBadge({ score }: { score: number }) {
  const level = score >= 85 ? 'gold' : score >= 65 ? 'silver' : score >= 45 ? 'bronze' : 'base'
  const label = level === 'gold' ? 'Dossier Premium' : level === 'silver' ? 'Dossier Argent' : level === 'bronze' ? 'Dossier Bronze' : 'Dossier Standard'
  const colors = {
    gold:   { bg: 'linear-gradient(135deg,#FFD700,#FFA500)', shadow: '0 8px 20px rgba(255,180,0,0.5)', fg: '#5c3a00' },
    silver: { bg: 'linear-gradient(135deg,#E8E8E8,#A8A8A8)', shadow: '0 8px 20px rgba(180,180,180,0.4)', fg: '#333' },
    bronze: { bg: 'linear-gradient(135deg,#CD7F32,#8B4513)', shadow: '0 8px 20px rgba(139,69,19,0.4)', fg: '#fff' },
    base:   { bg: 'linear-gradient(135deg,#64748B,#334155)', shadow: '0 8px 20px rgba(51,65,85,0.4)', fg: '#fff' },
  }[level]
  return (
    <div className="elig-badge" style={{ background: colors.bg, boxShadow: colors.shadow, color: colors.fg }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6z" fill="currentColor"/>
      </svg>
      <span>{label}</span>
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
  const [hakiAccepted, setHakiAccepted] = useState<boolean>(() => { try { return localStorage.getItem('mayinvest_haki_accepted') === '1' } catch { return false } })
  const [hakiDeclined, setHakiDeclined] = useState<boolean>(() => { try { return localStorage.getItem('mayinvest_haki_declined') === '1' } catch { return false } })
  // Mode auto : activé par défaut, mémorisé par le navigateur
  const [autoMode, setAutoMode] = useState<boolean>(() => { try { const v = localStorage.getItem('mayinvest_haki_auto'); return v === null ? true : v === '1' } catch { return true } })
  function toggleAutoMode() {
    setAutoMode(m => {
      const next = !m
      try { localStorage.setItem('mayinvest_haki_auto', next ? '1' : '0') } catch {}
      return next
    })
  }
  const [lastSuccess, setLastSuccess] = useState<string>('')
  const [fieldFeedback, setFieldFeedback] = useState<(FieldCheck & { field: string }) | null>(null)
  function onFieldBlur(key: string) {
    // Mode guidage détaillé actif uniquement si Haki a été accepté ET mode auto activé
    if (!hakiAccepted || !autoMode) return
    const result = validateField(key, form[key] || '', type === 'physique')
    setFieldFeedback({ ...result, field: key })
    setMascotOpen(true)
    // Succès → auto-ferme après 2.5s pour ne pas bloquer
    if (result.ok) {
      const t = setTimeout(() => {
        setFieldFeedback(f => f?.field === key ? null : f)
        setMascotOpen(false)
      }, 2500)
      return () => clearTimeout(t)
    }
  }
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

  // Haki s'ouvre AUTOMATIQUEMENT à chaque chargement de page si pas encore refusée
  // (le mode auto peut être désactivé via le toggle dans le panneau)
  useEffect(() => {
    if (!hakiDeclined) {
      const t = setTimeout(() => setMascotOpen(true), 900)
      return () => clearTimeout(t)
    }
  }, []) // ← [] = s'exécute une fois au chargement de la page

  // Si acceptée ET mode auto activé : s'ouvre à chaque changement d'étape pour guider
  useEffect(() => {
    if (hakiAccepted && autoMode) {
      const t = setTimeout(() => setMascotOpen(true), 400)
      return () => clearTimeout(t)
    }
  }, [step, activeSection, hakiAccepted, autoMode])

  function acceptHaki() {
    setHakiAccepted(true)
    try { localStorage.setItem('mayinvest_haki_accepted', '1'); localStorage.removeItem('mayinvest_haki_declined') } catch {}
  }
  function declineHaki() {
    setHakiDeclined(true)
    setMascotOpen(false)
    try { localStorage.setItem('mayinvest_haki_declined', '1') } catch {}
  }
  function toggleHaki() { setMascotOpen(o => !o) }

  // Contrat obligatoire uniquement pour Salarié privé (déclaré tôt pour TDZ)
  const needContrat = isP && activite === 'Salarié privé'
  const needDureeRestante = needContrat && (form['contrat'] === 'CDD' || form['contrat'] === 'Intérim' || form['contrat'] === 'Stage')

  // Validation de l'avancement des sections (step 3)
  const identiteOk = isP
    ? !!(form['prenom'] && form['nom'] && form['tel']?.length === 9 && form['ville'])
    : !!(form['raison_sociale'] && form['dirigeant'] && form['tel']?.length === 9 && form['ville'])
  const situationOk = isP
    ? !!(form['employeur'] && form['anciennete_tr'] && form['revenu'] && (!needContrat || form['contrat']) && (!needDureeRestante || form['duree_restante']))
    : !!(form['rccm'] && form['anciennete_soc_tr'] && form['ca_annuel'] && (form['rccm'] !== 'Oui' || form['niu']))
  const besoinOk = !!(form['montant'] && form['objet'] && (isP || form['flux_mois']))
  const eligibiliteOk = isP
    ? !!(form['banque'] && form['salaire_domic'] && (form['salaire_domic'] !== 'Oui' || form['anciennete_cpt_tr']))
    : !!(form['banque'] && form['compte_mouvemente'] && form['refus_bancaire'] && form['garanties'])

  // Détection des succès pour messages de félicitation
  useEffect(() => {
    if (!hakiAccepted) return
    if (step === 3) {
      if (activeSection === 'identite' && identiteOk && lastSuccess !== 'identite') setLastSuccess('identite')
      else if (activeSection === 'situation' && situationOk && lastSuccess !== 'situation') setLastSuccess('situation')
      else if (activeSection === 'besoin' && besoinOk && lastSuccess !== 'besoin') setLastSuccess('besoin')
      else if (activeSection === 'eligibilite' && eligibiliteOk && lastSuccess !== 'eligibilite') setLastSuccess('eligibilite')
    }
  }, [identiteOk, situationOk, besoinOk, eligibiliteOk, activeSection, step, hakiAccepted, lastSuccess])

  // Déclenche Haki après choix dans les sélecteurs non-input (chips, radios, selects custom)
  const prevForm = useRef<Record<string,string>>({})
  useEffect(() => {
    if (!hakiAccepted || !autoMode || step !== 3) return
    const chipFields = ['ville','objet','banque','anciennete_tr','anciennete_soc_tr','anciennete_cpt_tr','contrat','rccm','salaire_domic','compte_mouvemente','refus_bancaire','garanties']
    for (const k of chipFields) {
      const now = form[k] || ''
      const prev = prevForm.current[k] || ''
      if (now && now !== prev) {
        const result = validateField(k, now, isP)
        setFieldFeedback({ ...result, field: k })
        setMascotOpen(true)
        if (result.ok) {
          const t = setTimeout(() => {
            setFieldFeedback(f => f?.field === k ? null : f)
            setMascotOpen(false)
          }, 2500)
          prevForm.current = { ...form }
          return () => clearTimeout(t)
        }
      }
    }
    prevForm.current = { ...form }
  }, [form, hakiAccepted, autoMode, step, isP])

  // Message de Haki selon l'état
  // canSubmit déclaré AVANT hakiMsg (sinon TDZ)
  const canSubmit = (() => {
    if (!form['tel'] || form['tel'].length !== 9) return false
    if (!form['ville']) return false
    if (!form['password'] || form['password'].length !== 6) return false
    if (form['password'] !== form['password_confirm']) return false
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

  const hakiMsg: HakiMsg = (() => {
    // PRIORITÉ : feedback immédiat sur un champ qui vient d'être rempli / raté
    if (fieldFeedback && step === 3) {
      if (fieldFeedback.ok) {
        return {
          title: `✓ ${fieldFeedback.label} bien noté`,
          body: `Bravo, votre ${(fieldFeedback.label||'champ').toLowerCase()} est enregistré${fieldFeedback.label?.endsWith('e') ? 'e' : ''}. Continuez avec le champ suivant.`,
          success: true,
          actions: [{ label: 'Continuer', onClick: () => { setFieldFeedback(null); setMascotOpen(false) }, primary: true }],
        }
      }
      return {
        title: `⚠ Attention : ${fieldFeedback.label}`,
        body: `${fieldFeedback.msg}\n\n${fieldFeedback.example || ''}\n\nPas de panique, essayez à nouveau !`,
        actions: [{ label: "J'ai compris, je recommence", onClick: () => { setFieldFeedback(null); setMascotOpen(false) }, primary: true }],
      }
    }

    // Phase 0 : accueil, demande d'accompagnement
    if (!hakiAccepted && !hakiDeclined) {
      return {
        title: 'Bonjour 👋 Je suis Haki',
        body: "Je peux vous accompagner étape par étape pour remplir votre dossier de financement. Souhaitez-vous que je vous guide ?",
        actions: [
          { label: '✓ Oui, accompagne-moi', onClick: () => { acceptHaki() }, primary: true },
        ],
      }
    }

    // Phase 1 : choix du profil
    if (step === 1) {
      return {
        title: 'Étape 1 sur 4',
        body: "Pour commencer, dites-moi qui demande le financement : vous à titre personnel, ou une entreprise ?",
        actions: [
          { label: 'Je suis un particulier', onClick: () => { setType('physique'); setStep(2) }, primary: true },
          { label: "C'est pour mon entreprise", onClick: () => { setType('morale'); setStep(2) } },
        ],
      }
    }

    // Phase 2 : secteur / profession — chips de sélection directe dans Haki
    if (step === 2) {
      const list = isP ? ACTIVITES_PHYSIQUE : ACTIVITES_MORALE
      const iconMap = isP ? ICON_P : ICON_M
      return {
        title: `✓ Profil enregistré · Étape 2 sur 4`,
        body: isP
          ? "Choisissez votre profession ci-dessous. Haki adaptera les questions suivantes."
          : "Choisissez le secteur d'activité de votre entreprise.",
        success: true,
        chips: list.map(a => ({
          label: a,
          icon: iconMap[a],
          selected: activite === a,
          onClick: () => { setActivite(a); setStep(3) },
        })),
        actions: [
          { label: "Changer de profil", onClick: () => { setStep(1); setActivite('') } },
        ],
      }
    }

    // Phase 3 : formulaire — section par section
    if (step === 3) {
      // Section complétée → message de succès et passage à la suivante
      if (activeSection === 'identite' && identiteOk) {
        return {
          title: '✓ Identité complétée',
          body: "Bravo, votre identité est enregistrée. Passons maintenant à votre situation professionnelle.",
          success: true,
          actions: [{ label: 'Section suivante : Situation', onClick: () => { scrollToSection('situation') }, primary: true }],
        }
      }
      if (activeSection === 'situation' && situationOk) {
        return {
          title: '✓ Situation enregistrée',
          body: "Excellent ! Nous passons à votre besoin de financement.",
          success: true,
          actions: [{ label: 'Section suivante : Besoin', onClick: () => { scrollToSection('besoin') }, primary: true }],
        }
      }
      if (activeSection === 'besoin' && besoinOk) {
        return {
          title: '✓ Besoin bien noté',
          body: "Très bien. Dernière étape : l'éligibilité, pour calculer votre score.",
          success: true,
          actions: [{ label: 'Dernière section : Éligibilité', onClick: () => { scrollToSection('eligibilite') }, primary: true }],
        }
      }
      if (activeSection === 'eligibilite' && eligibiliteOk) {
        if (canSubmit) {
          return {
            title: '✓ Tout est prêt !',
            body: "Toutes les sections sont remplies. Cliquez sur « Voir mon score » en bas pour envoyer votre dossier.",
            success: true,
            actions: [{ label: 'Voir mon score', onClick: () => { soumettre() }, primary: true }],
          }
        }
        // Éligibilité OK mais d'autres champs manquent → lister les problèmes
        const missing: {label: string; section: 'identite'|'situation'|'besoin'}[] = []
        if (isP) {
          if (!form['prenom']) missing.push({ label: 'Prénom', section: 'identite' })
          if (!form['nom']) missing.push({ label: 'Nom', section: 'identite' })
        } else {
          if (!form['raison_sociale']) missing.push({ label: 'Raison sociale', section: 'identite' })
          if (!form['dirigeant']) missing.push({ label: 'Dirigeant', section: 'identite' })
        }
        if (!form['tel'] || form['tel'].length !== 9) missing.push({ label: 'Téléphone (9 chiffres)', section: 'identite' })
        if (!form['ville']) missing.push({ label: 'Ville', section: 'identite' })
        if (isP) {
          if (!form['employeur']) missing.push({ label: 'Employeur', section: 'situation' })
          if (!form['anciennete_tr']) missing.push({ label: 'Ancienneté', section: 'situation' })
          if (!form['revenu']) missing.push({ label: 'Revenu net mensuel', section: 'situation' })
          if (needContrat && !form['contrat']) missing.push({ label: 'Type de contrat (CDI/CDD...)', section: 'situation' })
          if (needDureeRestante && !form['duree_restante']) missing.push({ label: 'Durée restante du contrat', section: 'situation' })
        } else {
          if (!form['rccm']) missing.push({ label: 'RCCM Oui/Non', section: 'situation' })
          if (form['rccm'] === 'Oui' && !form['niu']) missing.push({ label: 'NIU', section: 'situation' })
          if (!form['anciennete_soc_tr']) missing.push({ label: 'Ancienneté société', section: 'situation' })
          if (!form['ca_annuel']) missing.push({ label: "Chiffre d'affaires annuel", section: 'situation' })
        }
        if (!form['montant']) missing.push({ label: 'Montant demandé', section: 'besoin' })
        if (!form['objet']) missing.push({ label: 'Objet du financement', section: 'besoin' })
        if (!isP && !form['flux_mois']) missing.push({ label: 'Flux mensuel moyen', section: 'besoin' })
        const firstMissingSection = missing[0]?.section || 'identite'
        const sectionLabel = { identite: 'Identité', situation: 'Situation', besoin: 'Besoin' }[firstMissingSection]
        return {
          title: '⚠ Encore un petit effort !',
          body: `Il manque ${missing.length} information${missing.length > 1 ? 's' : ''} :\n\n• ${missing.map(m => m.label).join('\n• ')}\n\nRetournez à la section ${sectionLabel} pour compléter.`,
          actions: [{ label: `Aller à ${sectionLabel}`, onClick: () => { scrollToSection(firstMissingSection as any); setMascotOpen(false) }, primary: true }],
        }
      }
      // En cours de section
      const sectionNames = { identite: 'Identité', situation: 'Situation', besoin: 'Besoin', eligibilite: 'Éligibilité' }
      const explanations = {
        identite: "Remplissez vos informations personnelles : nom, téléphone (9 chiffres), ville. L'email est facultatif.",
        situation: isP
          ? "Indiquez votre employeur, votre ancienneté par tranche, et votre revenu mensuel. Si vous êtes salarié privé, précisez le type de contrat."
          : "Précisez le statut RCCM de votre société, sa date de création et son chiffre d'affaires annuel.",
        besoin: "Indiquez le montant souhaité et l'objet du prêt. Soyez réaliste, j'ajusterai avec vous si besoin.",
        eligibilite: isP
          ? "Dites-moi dans quelle banque votre salaire est domicilié et depuis quand. C'est un critère important."
          : "Répondez franchement sur votre historique bancaire et vos garanties.",
      }
      return {
        title: `Étape 3 sur 4 · ${sectionNames[activeSection]}`,
        body: explanations[activeSection],
        actions: [
          { label: "J'ai compris, je remplis", onClick: () => { setMascotOpen(false) }, primary: true },
          { label: 'Me montrer la section', onClick: () => { scrollToSection(activeSection) } },
        ],
      }
    }

    // Phase 4 : dossier soumis — Haki aide pour les prochaines étapes
    if (step === 4) {
      const verdict = score >= 70 ? 'Excellent dossier !' : score >= 50 ? 'Dossier éligible' : 'Dossier à renforcer'
      const docs = isP
        ? '• CNI ou passeport\n• Bulletins de salaire (3 derniers)\n• Relevé bancaire (3 derniers mois)\n• Attestation d\'employeur'
        : '• RCCM + NIU de la société\n• Statuts de la société\n• Relevés bancaires (6 derniers mois)\n• Bilan et compte de résultat'
      return {
        title: `🎉 ${verdict} · Score ${score}/100`,
        body: `Votre dossier a bien été envoyé. Voici les 3 prochaines étapes :\n\n1️⃣ **Notez votre code** : ${accessCode}\n2️⃣ **Préparez vos documents** :\n${docs}\n3️⃣ **Un conseiller vous appelle sous 24h** pour la suite.`,
        success: true,
        actions: [
          { label: 'Parler à un conseiller maintenant', onClick: () => { window.open(`https://wa.me/242060000000?text=Bonjour Mayinvest, mon code: ${accessCode}. Mon score: ${score}/100.`, '_blank') }, primary: true },
          { label: 'Suivre mon dossier', onClick: () => { if (leadId) navigate({ to: '/client/$id', params: { id: leadId } }) } },
          { label: "Retour à l'accueil", onClick: () => { navigate({ to: '/' }) } },
        ],
      }
    }

    return { body: '' }
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
    // Enregistrer le mot de passe hashé via RPC
    if (!error && form['password']) {
      await supabase.rpc('set_lead_password', { p_id: generatedId, p_password: form['password'] })
    }
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
        .credit-meter { position: relative; margin: 0 auto 24px; z-index: 1; max-width: 280px; }
        .credit-value { font-size: 56px; font-weight: 800; line-height: 1; margin-top: 10px; letter-spacing: -2px; font-variant-numeric: tabular-nums; }
        .credit-sub { font-size: 13px; color: rgba(255,255,255,0.65); margin-top: 6px; font-weight: 600; }
        .verdict { font-size: 20px; font-weight: 800; margin-bottom: 6px; position: relative; z-index: 1; }
        .score-sub { font-size: 14px; color: rgba(255,255,255,0.65); line-height: 1.5; margin: 8px 0 24px; position: relative; z-index: 1; }
        .ref { background: rgba(255,255,255,0.06); border-radius: 12px; padding: 12px 16px; font-family: monospace; font-size: 11px; margin-bottom: 20px; color: rgba(255,255,255,0.7); position: relative; z-index: 1; word-break: break-all; }

        /* Confettis */
        .confetti-wrap { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 2; }
        .confetti-piece { position: absolute; top: -20px; border-radius: 2px; animation: confetti-fall linear infinite; opacity: 0.9; }
        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(600px) rotate(720deg); opacity: 0; }
        }

        /* Badge d'éligibilité */
        .elig-badge { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 100px; font-size: 13px; font-weight: 800; margin-bottom: 18px; position: relative; z-index: 1; letter-spacing: 0.02em; }

        /* Bouton partage */
        .btn-share { width: 100%; background: rgba(255,255,255,0.08); border: 1.5px solid rgba(255,255,255,0.2); color: #fff; font-family: inherit; font-size: 14px; font-weight: 700; padding: 14px 20px; border-radius: 100px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 10px; position: relative; z-index: 1; transition: all 0.15s; }
        .btn-share:hover { background: rgba(255,255,255,0.14); border-color: rgba(255,255,255,0.35); }
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

        /* ==== Dropdown custom (remplace les <select> natifs moches) ==== */
        .cs-wrap { position: relative; width: 100%; }
        .cs-trigger { width: 100%; background: transparent; border: none; padding: 0; font-family: inherit; font-size: 16px; font-weight: 500; color: #111; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 10px; text-align: left; }
        .cs-trigger.empty { color: #BBB; font-weight: 400; }
        .cs-trigger > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .cs-chev { transition: transform 0.2s; flex-shrink: 0; }
        .cs-chev.rot { transform: rotate(180deg); }
        .cs-menu { position: absolute; top: calc(100% + 10px); left: -16px; right: -16px; background: #fff; border: 1.5px solid #E5E7EB; border-radius: 16px; box-shadow: 0 20px 40px rgba(13,27,62,0.14), 0 6px 14px rgba(13,27,62,0.06); z-index: 30; padding: 8px; max-height: 320px; overflow-y: auto; animation: cs-pop 0.18s ease-out; }
        @keyframes cs-pop { from { opacity: 0; transform: translateY(-6px);} to { opacity: 1; transform: translateY(0);} }
        .cs-opt { width: 100%; background: transparent; border: none; padding: 14px 16px; font-family: inherit; font-size: 15px; font-weight: 500; color: #0D1B3E; cursor: pointer; border-radius: 10px; display: flex; align-items: center; justify-content: space-between; gap: 10px; text-align: left; transition: background 0.1s; }
        .cs-opt:hover { background: #EEF4FF; color: #1A6BFF; }
        .cs-opt.sel { background: #EEF4FF; color: #1A6BFF; font-weight: 700; }
        .cs-opt + .cs-opt { margin-top: 2px; }

        /* ==== Animation globe Haki : regard fluide 6 directions, SANS clignement ==== */
        .haki-eye-ball { transform-origin: 100px 100px; animation: haki-look 12s ease-in-out infinite; }
        @keyframes haki-look {
          0%, 10%    { transform: translate(0, 0); }         /* centre */
          16%, 26%   { transform: translate(20px, 0); }      /* droite */
          32%, 42%   { transform: translate(15px, 15px); }   /* bas-droite */
          48%, 58%   { transform: translate(-15px, 15px); }  /* bas-gauche */
          64%, 74%   { transform: translate(-20px, 0); }     /* gauche */
          80%, 90%   { transform: translate(0, -15px); }     /* haut */
          100%       { transform: translate(0, 0); }
        }

        /* ==== Haki Assistant — design pro type Intercom ==== */
        .haki-fab { position: fixed; right: 20px; bottom: 20px; width: 64px; height: 64px; border-radius: 50%; border: 3px solid #fff; background: transparent; box-shadow: 0 14px 32px rgba(13,27,62,0.25), 0 4px 10px rgba(13,27,62,0.08); cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 60; padding: 0; }
        .haki-fab-inner { display: flex; }
        .haki-fab-dot { position: absolute; top: 2px; right: 2px; width: 14px; height: 14px; border-radius: 50%; background: #34D058; border: 2.5px solid #fff; box-shadow: 0 0 0 0 rgba(52,208,88,0.5); animation: haki-pulse 2.2s infinite; }
        @keyframes haki-pulse { 0% { box-shadow: 0 0 0 0 rgba(52,208,88,0.5);} 70% { box-shadow: 0 0 0 12px rgba(52,208,88,0);} 100% { box-shadow: 0 0 0 0 rgba(52,208,88,0);} }
        .haki-fab-badge { position: absolute; top: -4px; right: -4px; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 100px; background: #FF3B30; color: #fff; font-size: 12px; font-weight: 800; display: flex; align-items: center; justify-content: center; border: 2px solid #fff; box-shadow: 0 2px 6px rgba(255,59,48,0.4); }

        .haki-panel { position: fixed; right: 20px; bottom: 96px; width: calc(100% - 40px); max-width: 360px; background: #fff; border-radius: 20px; box-shadow: 0 30px 60px rgba(13,27,62,0.22), 0 8px 20px rgba(13,27,62,0.08); z-index: 60; overflow: hidden; animation: haki-fade 0.18s ease-out; display: flex; flex-direction: column; max-height: calc(100vh - 130px); }
        @keyframes haki-fade { from { opacity: 0;} to { opacity: 1;} }
        @media (max-width: 480px) { .haki-panel { right: 10px; left: 10px; width: auto; max-width: none; bottom: 94px; } }

        .haki-head { background: linear-gradient(135deg, #0D1B3E 0%, #1A3380 100%); color: #fff; padding: 18px 18px 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; position: relative; overflow: hidden; }
        .haki-head::before { content: ''; position: absolute; top: -50px; right: -50px; width: 180px; height: 180px; background: radial-gradient(circle, rgba(26,107,255,0.4), transparent 65%); pointer-events: none; }
        .haki-head-left { display: flex; align-items: center; gap: 12px; min-width: 0; position: relative; z-index: 1; }
        .haki-avatar-wrap { position: relative; flex-shrink: 0; }
        .haki-status { position: absolute; bottom: 0; right: 0; width: 12px; height: 12px; border-radius: 50%; background: #34D058; border: 2.5px solid #0D1B3E; }
        .haki-name { font-size: 16px; font-weight: 800; letter-spacing: -0.3px; line-height: 1.1; }
        .haki-sub { font-size: 11px; color: rgba(255,255,255,0.7); margin-top: 3px; display: flex; align-items: center; gap: 5px; font-weight: 500; }
        .haki-dot { width: 6px; height: 6px; border-radius: 50%; background: #34D058; display: inline-block; }
        .haki-minimize { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); width: 32px; height: 32px; border-radius: 50%; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; padding: 0; position: relative; z-index: 1; transition: background 0.15s; }
        .haki-minimize:hover { background: rgba(255,255,255,0.18); }

        .haki-chat { padding: 18px 18px 16px; overflow-y: auto; flex: 1; background: #F8FAFC; }
        .haki-msg-row { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 14px; }
        .haki-msg-avatar { flex-shrink: 0; width: 28px; height: 28px; border-radius: 50%; overflow: hidden; margin-top: 2px; }
        .haki-msg { background: #fff; border-radius: 14px 14px 14px 4px; padding: 12px 14px; box-shadow: 0 2px 8px rgba(13,27,62,0.05); flex: 1; min-width: 0; }
        .haki-msg.success { background: linear-gradient(135deg, #DCFCE7 0%, #F0FDF4 100%); border: 1.5px solid #86EFAC; box-shadow: 0 4px 12px rgba(52,208,88,0.1); }
        .haki-msg-title { font-size: 11px; font-weight: 800; color: #1A6BFF; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
        .haki-msg.success .haki-msg-title { color: #166534; }
        .haki-msg-body { font-size: 14px; color: #0D1B3E; line-height: 1.5; font-weight: 500; }

        /* Chips de sélection Haki (ex: professions, secteurs) */
        .haki-chips { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; padding: 0 2px; margin-top: 6px; margin-bottom: 10px; }
        .haki-chip { background: #fff; border: 1.5px solid #E5E7EB; border-radius: 12px; padding: 10px 10px; font-family: inherit; font-size: 12px; font-weight: 700; color: #0D1B3E; cursor: pointer; display: flex; align-items: center; gap: 7px; transition: all 0.15s; text-align: left; min-height: 42px; box-shadow: 0 1px 3px rgba(13,27,62,0.04); }
        .haki-chip:hover { background: #EEF4FF; border-color: #1A6BFF; color: #1A6BFF; transform: translateY(-1px); }
        .haki-chip.sel { background: #1A6BFF; color: #fff; border-color: #1A6BFF; box-shadow: 0 6px 14px rgba(26,107,255,0.3); }
        .haki-chip-ic { display: inline-flex; flex-shrink: 0; }
        .haki-chip.sel .haki-chip-ic svg path,
        .haki-chip.sel .haki-chip-ic svg circle,
        .haki-chip.sel .haki-chip-ic svg rect { stroke: #fff; }

        .haki-actions { display: flex; flex-direction: column; gap: 8px; padding: 0 2px; margin-top: 6px; }
        .haki-btn { background: #fff; border: 1.5px solid #E5E7EB; border-radius: 12px; padding: 12px 14px; font-family: inherit; font-size: 13px; font-weight: 700; color: #0D1B3E; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.15s; box-shadow: 0 1px 3px rgba(13,27,62,0.04); }
        .haki-btn:hover { background: #EEF4FF; border-color: #1A6BFF; color: #1A6BFF; transform: translateY(-1px); box-shadow: 0 4px 10px rgba(26,107,255,0.15); }
        .haki-btn.primary { background: #1A6BFF; color: #fff; border-color: #1A6BFF; box-shadow: 0 6px 16px rgba(26,107,255,0.3); }
        .haki-btn.primary:hover { background: #1560E0; color: #fff; box-shadow: 0 8px 20px rgba(26,107,255,0.4); }

        .haki-decline { background: transparent; border: none; color: #888; font-family: inherit; font-size: 12px; font-weight: 600; padding: 10px; cursor: pointer; text-align: center; border-top: 1px solid #E5E7EB; }
        .haki-decline:hover { color: #B91C1C; }

        /* Zone réglages Mode auto */
        .haki-settings { border-top: 1px solid #E5E7EB; background: #FAFBFD; padding: 12px 16px 14px; }
        .haki-auto-row { display: flex; align-items: center; gap: 10px; }
        .haki-auto-info { flex: 1; min-width: 0; }
        .haki-auto-label { font-size: 13px; font-weight: 700; color: #0D1B3E; line-height: 1.2; }
        .haki-auto-state { font-size: 11px; color: #666; margin-top: 2px; font-weight: 600; }
        .haki-switch { position: relative; width: 44px; height: 24px; background: #D1D5DB; border: none; border-radius: 100px; cursor: pointer; padding: 0; transition: background 0.2s; flex-shrink: 0; }
        .haki-switch.on { background: #1A6BFF; }
        .haki-switch-knob { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; background: #fff; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: transform 0.2s; }
        .haki-switch.on .haki-switch-knob { transform: translateX(20px); }
        .haki-help-btn { width: 24px; height: 24px; border-radius: 50%; background: #EEF4FF; border: 1.5px solid #C7D7FF; color: #1A6BFF; font-weight: 800; font-size: 13px; cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-family: inherit; }
        .haki-help-btn:hover { background: #1A6BFF; color: #fff; border-color: #1A6BFF; }
        .haki-help-box { position: relative; margin-top: 10px; background: #fff; border: 1.5px solid #E5E7EB; border-radius: 10px; padding: 10px 32px 10px 12px; animation: haki-help-in 0.2s ease-out; }
        .haki-help-close { position: absolute; top: 8px; right: 8px; width: 20px; height: 20px; border-radius: 50%; background: #F3F4F6; border: none; color: #666; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; }
        .haki-help-close:hover { background: #E5E7EB; color: #111; }
        @keyframes haki-help-in { from { opacity: 0; transform: translateY(-4px);} to { opacity: 1; transform: translateY(0);} }
        .haki-help-title { font-size: 11px; font-weight: 800; color: #1A6BFF; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
        .haki-help-text { font-size: 12px; color: #444; line-height: 1.5; }
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

          <div className="form-stack">
            {/* 1. IDENTITÉ */}
            <div className="form-card" ref={sectionRefs.identite} onFocus={() => setActiveSection('identite')} tabIndex={-1}>
              <div className="card-title">1. Identité</div>
              <div className="fields">
                {isP ? <>
                  <div className="field"><label>Prénom *</label><input placeholder="Ex : Jean-Pierre" value={form['prenom']||''} onChange={e=>set('prenom',e.target.value)} onBlur={()=>onFieldBlur('prenom')}/></div>
                  <div className="field"><label>Nom *</label><input placeholder="Ex : Moukouama" value={form['nom']||''} onChange={e=>set('nom',e.target.value)} onBlur={()=>onFieldBlur('nom')}/></div>
                </> : <>
                  <div className="field"><label>Raison sociale *</label><input placeholder="Ex : Jespere SARL" value={form['raison_sociale']||''} onChange={e=>set('raison_sociale',e.target.value)} onBlur={()=>onFieldBlur('raison_sociale')}/></div>
                  <div className="field"><label>Nom du dirigeant *</label><input placeholder="Ex : Alain Mabiala" value={form['dirigeant']||''} onChange={e=>set('dirigeant',e.target.value)} onBlur={()=>onFieldBlur('dirigeant')}/></div>
                </>}
                <div className="field"><label>Téléphone *</label><input
                  type="tel" inputMode="numeric" placeholder="Ex : 06 123 4567" maxLength={11}
                  value={formatPhone(form['tel']||'')} onChange={e=>set('tel', cleanPhone(e.target.value))} onBlur={()=>onFieldBlur('tel')}/></div>
                <div className="field"><label>Email (facultatif)</label><input type="email" placeholder="Ex : jp.moukouama@gmail.com" value={form['email']||''} onChange={e=>set('email',e.target.value)} onBlur={()=>onFieldBlur('email')}/></div>
                <div className="field"><label>Ville *</label>
                  <CustomSelect value={form['ville']||''} onChange={v=>set('ville',v)} options={VILLES} placeholder="Sélectionner votre ville"/>
                </div>
                {/* Mot de passe (PIN 6 chiffres) */}
                <div className="field">
                  <label>Choisir un mot de passe (6 chiffres) *</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Ex : 123456"
                    maxLength={6}
                    value={form['password']||''}
                    onChange={e=>set('password', e.target.value.replace(/\D/g,'').slice(0,6))}
                    autoComplete="new-password"
                    style={{ letterSpacing: '0.3em', fontFamily: 'monospace', fontWeight: 700 }}
                  />
                </div>
                <div className="field">
                  <label>Confirmer le mot de passe *</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Retapez les 6 chiffres"
                    maxLength={6}
                    value={form['password_confirm']||''}
                    onChange={e=>set('password_confirm', e.target.value.replace(/\D/g,'').slice(0,6))}
                    autoComplete="new-password"
                    style={{ letterSpacing: '0.3em', fontFamily: 'monospace', fontWeight: 700 }}
                  />
                  {form['password'] && form['password_confirm'] && form['password'] !== form['password_confirm'] && (
                    <div className="field-hint" style={{ color: '#B91C1C' }}>⚠ Les mots de passe ne correspondent pas</div>
                  )}
                  {form['password'] && form['password'].length === 6 && form['password'] === form['password_confirm'] && (
                    <div className="field-hint" style={{ color: '#166534' }}>✓ Mots de passe identiques</div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. SITUATION */}
            <div className="form-card" ref={sectionRefs.situation} onFocus={() => setActiveSection('situation')} tabIndex={-1}>
              <div className="card-title">2. Situation {isP ? 'professionnelle' : 'juridique'}</div>
              <div className="fields">
                {isP ? <>
                  <div className="field"><label>Employeur / Administration *</label><input placeholder="Ex : Ministère de l'Économie" value={form['employeur']||''} onChange={e=>set('employeur',e.target.value)} onBlur={()=>onFieldBlur('employeur')}/></div>

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
                      onBlur={()=>onFieldBlur('duree_restante')}
                    /></div>
                  )}

                  {/* Ancienneté par tranches */}
                  <div className="field anc-wrap">
                    <label>Ancienneté dans l'emploi *</label>
                    <AncienneteChips value={form['anciennete_tr']||''} onChange={v=>set('anciennete_tr', v)}/>
                  </div>

                  <div className="field"><label>Revenu net mensuel (XAF) *</label><input
                    type="text" inputMode="numeric" placeholder="Ex : 350 000"
                    value={formatMoney(form['revenu']||'')} onChange={e=>set('revenu', cleanMoney(e.target.value))}
                    onBlur={()=>onFieldBlur('revenu')}
                  /></div>
                </> : <>
                  <div className="field radio-field"><label>RCCM *</label>
                    <div className="radio">{['Oui','Non'].map(v=><button key={v} type="button" className={form['rccm']===v?'sel':''} onClick={()=>set('rccm',v)}>{v}</button>)}</div>
                  </div>
                  {form['rccm'] === 'Oui' && (
                    <div className="field"><label>NIU *</label><input placeholder="Ex : M2019051234" value={form['niu']||''} onChange={e=>set('niu',e.target.value)} onBlur={()=>onFieldBlur('niu')}/></div>
                  )}
                  <div className="field anc-wrap">
                    <label>Ancienneté de la société *</label>
                    <AncienneteChips value={form['anciennete_soc_tr']||''} onChange={v=>set('anciennete_soc_tr', v)}/>
                  </div>
                  <div className="field"><label>Chiffre d'affaires annuel (XAF) *</label><input
                    type="text" inputMode="numeric" placeholder="Ex : 50 000 000"
                    value={formatMoney(form['ca_annuel']||'')} onChange={e=>set('ca_annuel', cleanMoney(e.target.value))}
                    onBlur={()=>onFieldBlur('ca_annuel')}
                  /></div>
                </>}
              </div>
            </div>

            {/* 3. BESOIN */}
            <div className="form-card" ref={sectionRefs.besoin} onFocus={() => setActiveSection('besoin')} tabIndex={-1}>
              <div className="card-title">3. Votre besoin</div>
              <div className="fields">
                <div className="field"><label>Montant demandé (XAF) *</label><input
                  type="text" inputMode="numeric" placeholder="Ex : 5 000 000"
                  value={formatMoney(form['montant']||'')} onChange={e=>set('montant', cleanMoney(e.target.value))}
                  onBlur={()=>onFieldBlur('montant')}
                /></div>
                <div className="field"><label>Objet du financement *</label>
                  <CustomSelect
                    value={form['objet']||''}
                    onChange={v=>set('objet',v)}
                    options={isP ? ['Consommation','Immobilier','Véhicule','Autre'] : ['Investissement','Fonds de roulement','Marché public','Autre']}
                    placeholder="Choisir l'objet"
                  />
                </div>
                {!isP && <div className="field"><label>Flux mensuel moyen (XAF) *</label><input
                  type="text" inputMode="numeric" placeholder="Ex : 2 000 000"
                  value={formatMoney(form['flux_mois']||'')} onChange={e=>set('flux_mois', cleanMoney(e.target.value))}
                  onBlur={()=>onFieldBlur('flux_mois')}
                /></div>}
              </div>
            </div>

            {/* 4. ÉLIGIBILITÉ */}
            <div className="form-card" ref={sectionRefs.eligibilite} onFocus={() => setActiveSection('eligibilite')} tabIndex={-1}>
              <div className="card-title">4. Éligibilité</div>
              <div className="fields">
                <div className="field"><label>Banque actuelle *</label>
                  <CustomSelect value={form['banque']||''} onChange={v=>set('banque',v)} options={BANQUES} placeholder="Choisir votre banque"/>
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
          {score >= 70 && <Confetti/>}
          <div className="score-badge">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 6l2 2 4-4" stroke="#34D058" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Dossier reçu · Score crédit
          </div>

          {/* Badge d'éligibilité (Gold / Silver / Bronze) */}
          <EligibilityBadge score={score} />

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

          {/* Bouton partage WhatsApp (envoyer le code à un proche / soi-même) */}
          <button className="btn-share" onClick={() => {
            const text = `Mon dossier Mayinvest : code d'accès ${accessCode} · Score ${score}/100. Suivre : ${window.location.origin}/client/${leadId}`
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8a3 3 0 10-2.83-4H9.83A3 3 0 106 8a3 3 0 00-3 3v5h2v6h4v-6h2v6h4v-6h2v-5a3 3 0 00-3-3z" opacity="0.3"/><path d="M12 2l3 3h-2v4h-2V5H9l3-3zm-6 10v5l-3 3h18l-3-3v-5h-3v3h-6v-3H6z"/></svg>
            Partager mon code avec un proche
          </button>

          <button className="btn-wa" style={{ background: '#1A6BFF', marginBottom: 10 }} onClick={() => navigate({ to: '/client/$id', params: { id: leadId } })}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" stroke="#fff" strokeWidth="1.8"/></svg>
            Accéder à mon dossier
          </button>
          <button className="btn-wa" onClick={() => window.open(`https://wa.me/242060000000?text=Bonjour Mayinvest, j'ai soumis mon dossier. Code: ${accessCode}`,'_blank')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M17.5 14.4l-2.4-1.2c-.3-.2-.7-.1-1 .2l-.7.8c-.2.2-.5.3-.8.1-.9-.4-1.8-1-2.6-1.7-.7-.8-1.3-1.7-1.7-2.6-.1-.3 0-.6.2-.8l.8-.7c.3-.2.4-.6.2-1L8.3 5c-.2-.4-.7-.5-1-.3L5.5 6c-.5.2-.8.7-.7 1.2.4 2.8 1.7 5.4 3.6 7.4 2 2 4.6 3.3 7.4 3.6.5.1 1-.2 1.2-.7l1.3-1.8c.2-.4.1-.9-.3-1.1l-.5-.2z"/></svg>
            Discuter avec un conseiller sur WhatsApp
          </button>
          <a className="btn-home" href="/" onClick={(e) => { e.preventDefault(); navigate({ to: '/' }) }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginRight: 8, verticalAlign: 'middle' }}>
              <path d="M11 7H3M6 4L3 7l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Retour à l'accueil
          </a>
        </div>}
      </div>

      <HakiAssistant msg={hakiMsg} open={mascotOpen} onToggle={toggleHaki} onDecline={declineHaki} accepted={hakiAccepted} autoMode={autoMode} onToggleAuto={toggleAutoMode} />
    </div>
  )
}
