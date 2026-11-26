import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  Landmark, Briefcase, Store, Hammer, Award, Sprout, MoreHorizontal, ShoppingBag, Palmtree,
  HardHat, Factory, Truck, HeartPulse, Cpu, Check, ChevronDown,
} from 'lucide-react'
import { positionCarte, indexSuivant, indexParLettre, estMobile, type Position } from '../lib/nice-select'

export type NiceOption = { value: string; label: string; icon?: ReactNode; disabled?: boolean }

const ic = { size: 16, strokeWidth: 2 }
export const ICONES_ACTIVITE: Record<string, ReactNode> = {
  'Fonctionnaire': <Landmark {...ic}/>,
  'Salarié Privé': <Briefcase {...ic}/>,
  'Commerçant': <Store {...ic}/>,
  'Artisan': <Hammer {...ic}/>,
  'Profession Libérale': <Award {...ic}/>,
  'Agriculteur': <Sprout {...ic}/>,
  'Commerce': <ShoppingBag {...ic}/>,
  'Tourisme': <Palmtree {...ic}/>,
  'BTP': <HardHat {...ic}/>,
  'Industrie/Bois': <Factory {...ic}/>,
  'Agriculture': <Sprout {...ic}/>,
  'Transport': <Truck {...ic}/>,
  'Santé': <HeartPulse {...ic}/>,
  'Tech': <Cpu {...ic}/>,
  'Autre': <MoreHorizontal {...ic}/>,
}

/** Transforme une liste de textes en options, avec l'icône d'activité si elle existe. */
export function optionsActivite(liste: string[]): NiceOption[] {
  return liste.map(a => ({ value: a, label: a, icon: ICONES_ACTIVITE[a] }))
}

type Props = {
  value: string
  onChange: (v: string) => void
  options: NiceOption[]
  placeholder?: string
  /** Titre du panneau sur mobile */
  title?: string
  /** field : champ de formulaire pleine largeur ; compact : petite pastille (tableaux, fiches) */
  variant?: 'field' | 'compact'
  className?: string
  style?: CSSProperties
  disabled?: boolean
  ariaLabel?: string
}

export default function NiceSelect({ value, onChange, options, placeholder = 'Choisir', title, variant = 'field', className, style, disabled, ariaLabel }: Props) {
  const [open, setOpen] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [pos, setPos] = useState<Position | null>(null)
  const [actif, setActif] = useState(-1)
  const btn = useRef<HTMLButtonElement>(null)
  const carte = useRef<HTMLDivElement>(null)
  const choisi = options.find(o => o.value === value)

  function placer() {
    const b = btn.current
    if (!b) return
    const r = b.getBoundingClientRect()
    setPos(positionCarte({ top: r.top, bottom: r.bottom, left: r.left, width: r.width }, { largeur: window.innerWidth, hauteur: window.innerHeight }))
  }

  function ouvrir() {
    if (disabled) return
    setMobile(estMobile(window.innerWidth))
    placer()
    setActif(Math.max(0, options.findIndex(o => o.value === value)))
    setOpen(true)
  }
  function fermer(focus = true) {
    setOpen(false)
    if (focus) btn.current?.focus()
  }
  function choisir(o: NiceOption) {
    if (o.disabled) return
    if (o.value !== value) onChange(o.value)
    fermer()
  }

  useLayoutEffect(() => { if (open && !mobile) placer() }, [open, mobile])

  useEffect(() => {
    if (!open) return
    function dehors(e: MouseEvent | TouchEvent) {
      const t = e.target as Node
      if (btn.current?.contains(t) || carte.current?.contains(t)) return
      fermer(false)
    }
    function suivre() { if (!estMobile(window.innerWidth)) placer() }
    document.addEventListener('mousedown', dehors)
    document.addEventListener('touchstart', dehors)
    window.addEventListener('resize', suivre)
    window.addEventListener('scroll', suivre, true)
    return () => {
      document.removeEventListener('mousedown', dehors)
      document.removeEventListener('touchstart', dehors)
      window.removeEventListener('resize', suivre)
      window.removeEventListener('scroll', suivre, true)
    }
  }, [open])

  useEffect(() => {
    if (!open || actif < 0) return
    carte.current?.querySelector<HTMLElement>(`[data-i="${actif}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, actif])

  function clavier(e: React.KeyboardEvent) {
    const des = options.map(o => !!o.disabled)
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); ouvrir() }
      return
    }
    if (e.key === 'Escape') { e.preventDefault(); fermer() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActif(i => indexSuivant(i, 1, des)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActif(i => indexSuivant(i, -1, des)) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (options[actif]) choisir(options[actif]) }
    else if (e.key === 'Tab') fermer(false)
    else if (e.key.length === 1) setActif(i => indexParLettre(e.key, options.map(o => o.label), i))
  }

  const liste = (
    <div className="ns-list" role="listbox" aria-label={ariaLabel || title || placeholder}>
      {options.map((o, i) => {
        const sel = o.value === value
        return (
          <div key={o.value || `__${i}`} data-i={i} role="option" aria-selected={sel} aria-disabled={o.disabled || undefined}
            className={`ns-opt${sel ? ' sel' : ''}${i === actif ? ' act' : ''}${o.disabled ? ' dis' : ''}`}
            onMouseEnter={() => setActif(i)} onClick={() => choisir(o)}>
            {o.icon && <span className="ns-ic">{o.icon}</span>}
            <span className="ns-lbl">{o.label}</span>
            {sel && <Check size={16} strokeWidth={2.5} className="ns-check"/>}
          </div>
        )
      })}
    </div>
  )

  return (
    <>
      <NiceSelectStyles/>
      <button ref={btn} type="button" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel}
        className={`ns-btn ns-${variant}${open ? ' open' : ''}${choisi ? ' filled' : ''}${className ? ` ${className}` : ''}`}
        style={style} onClick={() => (open ? fermer() : ouvrir())} onKeyDown={clavier}>
        <span className="ns-val">
          {variant === 'field' && choisi?.icon && <span className="ns-ic sm">{choisi.icon}</span>}
          <span className="ns-txt">{choisi ? choisi.label : placeholder}</span>
        </span>
        <span className="ns-chev"><ChevronDown size={variant === 'field' ? 16 : 12} strokeWidth={2.5}/></span>
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        mobile ? (
          <div className="ns-ovr" onKeyDown={clavier} onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
            <div ref={carte} className="ns-sheet">
              <div className="ns-grip"/>
              {title && <div className="ns-title">{title}</div>}
              {liste}
            </div>
          </div>
        ) : pos && (
          <div ref={carte} className="ns-card" onKeyDown={clavier} onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}
            style={{ left: pos.left, width: pos.width, maxHeight: pos.maxHeight, ...(pos.versLeHaut ? { bottom: window.innerHeight - pos.top } : { top: pos.top }) }}>
            {liste}
          </div>
        ),
        document.body,
      )}
    </>
  )
}

export function NiceSelectStyles() {
  useEffect(() => {
    if (document.getElementById('ns-styles')) return
    const el = document.createElement('style')
    el.id = 'ns-styles'
    el.textContent = NS_CSS
    document.head.appendChild(el)
  }, [])
  return null
}

const NS_CSS = `
    .ns-card, .ns-ovr { font-family: 'Inter', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
    .ns-btn { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-family: inherit; cursor: pointer; text-align: left; color: #0D1B3E; }
    .ns-btn:disabled { cursor: default; opacity: .6; }
    .ns-val { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .ns-txt { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ns-field { width: 100%; height: 46px; padding: 0 9px 0 14px; background: #fff; border: 1px solid #E5E7EB; border-radius: 12px; font-size: 14px; transition: border-color .15s, box-shadow .15s; }
    .ns-field:not(.filled) .ns-txt { color: #9CA3AF; }
    .ns-field:hover:not(:disabled) { border-color: #CBD5E1; }
    .ns-field.open, .ns-field:focus-visible { outline: none; border-color: #1A6BFF; box-shadow: 0 0 0 3px rgba(26,107,255,.12); }
    .ns-field .ns-chev { width: 28px; height: 28px; flex: none; border-radius: 50%; background: #F3F4F6; color: #6B7280; display: flex; align-items: center; justify-content: center; transition: background .15s, color .15s; }
    .ns-field.open .ns-chev { background: #EEF4FF; color: #1A6BFF; }
    .ns-chev svg { transition: transform .15s; }
    .ns-btn.open .ns-chev svg { transform: rotate(180deg); }
    .ns-compact { padding: 6px 8px 6px 12px; border: 1px solid #E5E7EB; background: #fff; border-radius: 10px; font-size: 12px; font-weight: 600; max-width: 100%; }
    .ns-compact .ns-chev { display: flex; color: currentColor; opacity: .7; flex: none; }
    .ns-compact:focus-visible { outline: 2px solid #1A6BFF; outline-offset: 1px; }
    .ns-ic { width: 30px; height: 30px; flex: none; border-radius: 8px; background: #F3F4F6; color: #6B7280; display: flex; align-items: center; justify-content: center; }
    .ns-ic.sm { width: 28px; height: 28px; background: #EEF4FF; color: #1A6BFF; }
    .ns-card { position: fixed; z-index: 10000; background: #fff; border: 1px solid #E5E7EB; border-radius: 14px; padding: 6px; overflow-y: auto; box-shadow: 0 16px 40px rgba(13,27,62,.16), 0 2px 6px rgba(13,27,62,.06); animation: nsIn .12s ease-out; overscroll-behavior: contain; }
    @keyframes nsIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
    .ns-list { display: flex; flex-direction: column; gap: 2px; }
    .ns-opt { display: flex; align-items: center; gap: 12px; padding: 9px 10px; border-radius: 10px; font-size: 14px; color: #0D1B3E; cursor: pointer; user-select: none; }
    .ns-opt.act { background: #F6F7F9; }
    .ns-opt.sel { background: #EEF4FF; color: #1A6BFF; font-weight: 600; }
    .ns-opt.sel .ns-ic { background: #fff; color: #1A6BFF; }
    .ns-opt.dis { opacity: .45; cursor: default; }
    .ns-lbl { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ns-check { flex: none; }
    .ns-ovr { position: fixed; inset: 0; z-index: 10000; background: rgba(13,27,62,.35); display: flex; align-items: flex-end; animation: nsFade .15s ease-out; }
    @keyframes nsFade { from { opacity: 0; } to { opacity: 1; } }
    .ns-sheet { width: 100%; max-height: 75vh; overflow-y: auto; background: #fff; border-radius: 20px 20px 0 0; padding: 8px 12px calc(16px + env(safe-area-inset-bottom)); animation: nsUp .2s ease-out; overscroll-behavior: contain; }
    @keyframes nsUp { from { transform: translateY(100%); } to { transform: none; } }
    .ns-grip { width: 40px; height: 4px; border-radius: 4px; background: #E5E7EB; margin: 4px auto 10px; }
    .ns-title { font-size: 15px; font-weight: 700; color: #0D1B3E; padding: 2px 10px 10px; }
    .ns-sheet .ns-opt { padding: 12px 10px; font-size: 15px; }
`
