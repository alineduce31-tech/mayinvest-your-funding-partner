// Cartes de connexion / inscription au style du portail client (Mon dossier)
import { useState, type ReactNode } from 'react'
import { Logo } from '@/components/Logo'

export function AuthStyles() {
  return (
    <style>{`
      .ac-page { font-family: 'Plus Jakarta Sans', sans-serif; background: #F8FAFC; color: #111; min-height: 100vh; }
      .ac-page * { box-sizing: border-box; }
      .ac-page input, .ac-page select, .ac-page textarea { font-size: 16px !important; font-family: inherit; }
      .ac-head { background: #fff; border-bottom: 1px solid #E5E7EB; padding: 14px 24px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
      .ac-head-right { display: flex; align-items: center; gap: 8px; }
      .ac-link { color: #475569; font-size: 13px; font-weight: 700; text-decoration: none; padding: 9px 12px; border-radius: 100px; background: none; border: none; cursor: pointer; font-family: inherit; }
      .ac-link:hover { background: #F1F5F9; color: #0D1B3E; }
      @media (max-width: 520px) { .ac-link.hide-sm { display: none; } }
      .ac-back { background: #0D1B3E; color: #fff; border: none; padding: 10px 18px; border-radius: 100px; font-weight: 700; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-family: inherit; transition: background 0.15s; text-decoration: none; }
      .ac-back:hover { background: #000; }
      .ac-wrap { max-width: 460px; margin: 40px auto 60px; padding: 0 20px; }
      .ac-card { background: #fff; border-radius: 24px; padding: 34px 26px; box-shadow: 0 20px 50px rgba(13,27,62,0.08); border: 1px solid #F0F2F5; }
      .ac-title { text-align: center; margin-bottom: 24px; }
      .ac-icon { width: 56px; height: 56px; border-radius: 16px; background: linear-gradient(135deg, #1A6BFF 0%, #0051D4 100%); display: inline-flex; align-items: center; justify-content: center; margin: 0 auto 16px; box-shadow: 0 10px 24px rgba(26,107,255,0.3); }
      .ac-pill { display: inline-block; background: #EEF4FF; color: #1A6BFF; font-size: 10.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; padding: 5px 12px; border-radius: 100px; margin-bottom: 10px; }
      .ac-title h1 { font-size: 24px; font-weight: 800; color: #0D1B3E; margin: 0 0 8px; letter-spacing: -0.02em; }
      .ac-title p { font-size: 13px; color: #666; margin: 0; line-height: 1.5; }
      .ac-tabs { display: flex; gap: 6px; background: #F0F2F5; border-radius: 12px; padding: 4px; margin-bottom: 14px; }
      .ac-tab { flex: 1; background: transparent; border: none; padding: 10px; border-radius: 9px; font-weight: 700; font-size: 13px; color: #666; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px; font-family: inherit; }
      .ac-tab.on { background: #fff; color: #1A6BFF; box-shadow: 0 2px 6px rgba(13,27,62,0.08); }
      .ac-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      @media (max-width: 420px) { .ac-row { grid-template-columns: 1fr; } }
      .ac-field { background: #F8FAFC; border: 1.5px solid #E5E7EB; border-radius: 14px; padding: 12px 16px; margin-bottom: 10px; position: relative; }
      .ac-field:focus-within { border-color: #1A6BFF; background: #fff; }
      .ac-field.has-eye { padding-right: 48px; }
      .ac-field label { display: block; font-size: 10px; font-weight: 700; color: #888; margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.05em; }
      .ac-field label .req { color: #DC2626; }
      .ac-field input, .ac-field select, .ac-field textarea { width: 100%; border: none; background: transparent; outline: none; font-weight: 600; padding: 0; color: #111; }
      .ac-field textarea { resize: vertical; min-height: 64px; font-weight: 500; }
      .ac-field select { appearance: none; -webkit-appearance: none; cursor: pointer; }
      .ac-hint { font-size: 11px; color: #B45309; font-weight: 600; margin: -4px 0 10px 4px; }
      .ac-eye { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: transparent; border: none; cursor: pointer; padding: 8px; color: #888; border-radius: 8px; display: flex; }
      .ac-eye:hover { background: #EEF4FF; color: #1A6BFF; }
      .ac-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
      .ac-chip { background: #fff; border: 1.5px solid #E5E7EB; color: #334155; font-size: 13px; font-weight: 700; padding: 7px 12px; border-radius: 100px; cursor: pointer; font-family: inherit; }
      .ac-chip.on { background: #1A6BFF; border-color: #1A6BFF; color: #fff; }
      .ac-btn { width: 100%; background: linear-gradient(135deg, #1A6BFF 0%, #0051D4 100%); color: #fff; border: none; padding: 14px; border-radius: 100px; font-weight: 800; font-size: 14px; cursor: pointer; margin-top: 12px; box-shadow: 0 10px 25px rgba(26,107,255,0.3); display: flex; align-items: center; justify-content: center; gap: 8px; font-family: inherit; }
      .ac-btn:disabled { background: #C7D0DB; cursor: not-allowed; box-shadow: none; }
      .ac-err { background: #FEF2F2; border: 1px solid #FCA5A5; color: #B91C1C; padding: 10px 14px; border-radius: 10px; font-size: 12px; font-weight: 600; margin-top: 10px; display: flex; align-items: center; gap: 7px; }
      .ac-ok { background: #F0FDF4; border: 1px solid #86EFAC; color: #166534; padding: 10px 14px; border-radius: 10px; font-size: 12px; font-weight: 600; margin-top: 10px; }
      .ac-foot { text-align: center; margin-top: 16px; font-size: 13px; color: #666; line-height: 1.7; }
      .ac-foot a, .ac-foot button { color: #1A6BFF; font-weight: 700; cursor: pointer; background: none; border: none; font-family: inherit; font-size: 13px; padding: 0; text-decoration: none; }
    `}</style>
  )
}

const ArrowLeft = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 7H3M6 4L3 7l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
)

export function AuthHeader({ onBack, backLabel = 'Accueil', right }: { onBack: () => void; backLabel?: string; right?: ReactNode }) {
  return (
    <div className="ac-head">
      <div style={{ display: 'flex', alignItems: 'center' }}><Logo height={44} tone="light" /></div>
      <div className="ac-head-right">
        {right}
        <button className="ac-back" onClick={onBack}><ArrowLeft />{backLabel}</button>
      </div>
    </div>
  )
}

export function AuthTitle({ icon, pill, title, subtitle }: { icon: ReactNode; pill?: string; title: string; subtitle?: string }) {
  return (
    <div className="ac-title">
      <div className="ac-icon">{icon}</div>
      {pill && <div><span className="ac-pill">{pill}</span></div>}
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
  )
}

export function AuthTabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; icon?: ReactNode }[] }) {
  return (
    <div className="ac-tabs">
      {options.map(o => (
        <button key={o.value} type="button" className={'ac-tab ' + (value === o.value ? 'on' : '')} onClick={() => onChange(o.value)}>
          {o.icon}{o.label}
        </button>
      ))}
    </div>
  )
}

export function PasswordField({ label = 'Mot de passe', value, onChange, placeholder, autoComplete = 'current-password', required }: { label?: string; value: string; onChange: (v: string) => void; placeholder?: string; autoComplete?: string; required?: boolean }) {
  const [show, setShow] = useState(false)
  return (
    <div className="ac-field has-eye">
      <label>{label}{required && <span className="req"> *</span>}</label>
      <span className="mi-pw"><input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete} />
<button type="button" className="mi-eye" onClick={() => setShow(s => !s)} aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
        {show ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
        )}
      </button></span>
    </div>
  )
}

export const IconPhone = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="6" y="2" width="12" height="20" rx="2.5" stroke="currentColor" strokeWidth="2" /><path d="M11 18h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
)
export const IconMail = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
)
export const IconBriefcase = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="18" height="13" rx="2" stroke="#fff" strokeWidth="2" /><path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M3 12h18" stroke="#fff" strokeWidth="2" /></svg>
)
export const IconUserPlus = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><circle cx="10" cy="8" r="4" stroke="#fff" strokeWidth="2" /><path d="M3 20c0-3.9 3.1-7 7-7s7 3.1 7 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" /><path d="M19 8v6M16 11h6" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
)
export const IconKey = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><circle cx="8" cy="15" r="4" stroke="#fff" strokeWidth="2" /><path d="M11 12l9-9M17 6l3 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
)
export const AlertIcon = () => (
  <svg width="14" height="14" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}><circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.6" /><path d="M9 5v4M9 12v.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
)
