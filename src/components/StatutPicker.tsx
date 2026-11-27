import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Ban, FileBadge, Landmark, Archive } from 'lucide-react'
import { NiceSelectStyles } from '@/components/NiceSelect'
import { estMobile, positionCarte, type Position } from '@/lib/nice-select'
import { STATUT_COLORS } from '@/lib/lead-templates'
import { PARCOURS, etatStatut, groupesStatuts, libelleStatut } from '@/lib/statuts'

const ICONES: Record<string, ReactNode> = {
  'Non Éligible': <Ban size={13}/>, 'Pack Formalisation Vendu': <FileBadge size={13}/>, 'Bancarisé': <Landmark size={13}/>, 'Perdu': <Archive size={13}/>,
}
const TEINTES: Record<string, string> = { 'Non Éligible': 'o', 'Pack Formalisation Vendu': 'b', 'Bancarisé': 'n', 'Perdu': 'r' }

/**
 * Sélecteur de statut commun à toute la plateforme : parcours du dossier (étapes faites, actuelle, suivante),
 * accompagnement, puis « Perdu ». Pastille colorée comme déclencheur.
 */
export default function StatutPicker({ value, onChange, statuts, disabled, placeholder, style, className, title = 'Changer le statut' }: {
  value: string | null | undefined
  onChange: (s: string) => void
  /** Statuts autorisés (par défaut : tous). */
  statuts?: readonly string[]
  disabled?: boolean
  /** Texte du bouton quand aucun statut n'est choisi (ex. action groupée). */
  placeholder?: string
  style?: CSSProperties
  className?: string
  title?: string
}) {
  const [open, setOpen] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [pos, setPos] = useState<Position | null>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const carte = useRef<HTMLDivElement>(null)

  function placer() {
    const r = btn.current?.getBoundingClientRect()
    if (!r) return
    setPos(positionCarte({ top: r.top, bottom: r.bottom, left: r.left, width: r.width }, { largeur: window.innerWidth, hauteur: window.innerHeight }, 280))
  }
  function ouvrir() { if (disabled) return; setMobile(estMobile(window.innerWidth)); placer(); setOpen(true) }
  function fermer() { setOpen(false) }
  function choisir(s: string) { if (s !== value) onChange(s); fermer() }

  useLayoutEffect(() => { if (open && !mobile) placer() }, [open, mobile])
  useEffect(() => {
    if (!open) return
    const dehors = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node
      if (btn.current?.contains(t) || carte.current?.contains(t)) return
      fermer()
    }
    const suivre = () => { if (!estMobile(window.innerWidth)) placer() }
    const echap = (e: KeyboardEvent) => { if (e.key === 'Escape') fermer() }
    document.addEventListener('mousedown', dehors); document.addEventListener('touchstart', dehors)
    window.addEventListener('resize', suivre); window.addEventListener('scroll', suivre, true); document.addEventListener('keydown', echap)
    return () => {
      document.removeEventListener('mousedown', dehors); document.removeEventListener('touchstart', dehors)
      window.removeEventListener('resize', suivre); window.removeEventListener('scroll', suivre, true); document.removeEventListener('keydown', echap)
    }
  }, [open])

  const c = (value && STATUT_COLORS[value]) || { bg: '#F1F5F9', fg: '#475569' }
  const groupes = groupesStatuts(statuts)

  const contenu = (
    <div className="sp" role="listbox" aria-label="Statut du dossier">
      {groupes.map((g, gi) => (
        <div key={gi} className="sp-g">
          {gi > 0 && <div className="sp-sep"/>}
          {g.titre && <div className="sp-t">{g.titre}</div>}
          {g.statuts.map(s => {
            const e = etatStatut(value, s)
            const rang = (PARCOURS as readonly string[]).indexOf(s)
            return (
              <button key={s} type="button" role="option" aria-selected={e === 'actuel'} className={`sp-r ${e}`} onClick={() => choisir(s)}>
                {rang >= 0
                  ? <span className="sp-n">{e === 'fait' ? <Check size={12} strokeWidth={3}/> : rang + 1}</span>
                  : <span className={`sp-i ${TEINTES[s] || 'n'}`}>{ICONES[s] || <Check size={12}/>}</span>}
                <span className="sp-l">{libelleStatut(s)}</span>
                {e === 'actuel' && <small>actuel</small>}
                {e === 'suivant' && <small className="b">suivant</small>}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )

  return (
    <>
      <NiceSelectStyles/>
      <style>{SP_CSS}</style>
      <button ref={btn} type="button" aria-haspopup="listbox" aria-expanded={open} title={title} aria-label={title} disabled={disabled}
        className={`ns-btn ns-compact sp-btn${open ? ' open' : ''}${className ? ` ${className}` : ''}`}
        style={value ? { background: c.bg, color: c.fg, border: 'none', borderRadius: 999, ...style } : style}
        onClick={() => (open ? fermer() : ouvrir())}>
        <span className="ns-txt">{value ? libelleStatut(value) : (placeholder || 'Statut')}</span>
        <span className="ns-chev"><ChevronDown size={12} strokeWidth={2.5}/></span>
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        mobile ? (
          <div className="ns-ovr" onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
            <div ref={carte} className="ns-sheet sp-sheet"><div className="ns-grip"/><div className="ns-title">Statut du dossier</div>{contenu}</div>
          </div>
        ) : pos && (
          <div ref={carte} className="ns-card sp-card" onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}
            style={{ left: pos.left, width: Math.max(280, pos.width), maxHeight: Math.max(pos.maxHeight, 460), ...(pos.versLeHaut ? { bottom: window.innerHeight - pos.top } : { top: pos.top }) }}>
            {contenu}
          </div>
        ),
        document.body,
      )}
    </>
  )
}

const SP_CSS = `
  .sp-btn .ns-txt { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sp-btn { gap: 6px !important; }
  .sp-card { padding: 6px !important; }
  .sp { display: flex; flex-direction: column; font-family: -apple-system, "SF Pro Text", Inter, system-ui, sans-serif; color: #1D1D1F; }
  .sp-t { font-size: 11.5px; color: #86868B; font-weight: 500; padding: 6px 10px 4px; }
  .sp-sep { height: 1px; background: #F0F0F2; margin: 6px 6px; }
  .sp-r { width: 100%; display: flex; align-items: center; gap: 10px; border: none; background: none; padding: 7px 10px; border-radius: 10px; font-family: inherit; font-size: 13.5px !important; color: #1D1D1F; text-align: left; cursor: pointer; }
  .sp-r:hover { background: #F5F5F7; }
  .sp-r.fait { color: #86868B; }
  .sp-r.actuel { background: #EAF1FF; color: #1A6BFF; font-weight: 600; }
  .sp-r small { margin-left: auto; font-size: 11.5px; font-weight: 500; color: #1A6BFF; } .sp-r small.b { color: #1A6BFF; opacity: .85; }
  .sp-l { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sp-n { width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid #D2D2D7; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; color: #86868B; flex: none; }
  .sp-r.fait .sp-n { background: #E8F8EE; border-color: #E8F8EE; color: #16A34A; }
  .sp-r.actuel .sp-n { background: #1A6BFF; border-color: #1A6BFF; color: #fff; }
  .sp-i { width: 20px; height: 20px; border-radius: 7px; display: inline-flex; align-items: center; justify-content: center; flex: none; }
  .sp-i.o { background: #FFF3E0; color: #C2410C; } .sp-i.b { background: #EAF1FF; color: #1A6BFF; } .sp-i.n { background: #EDEFF4; color: #0D1B3E; } .sp-i.r { background: #FDECEC; color: #B42318; }
  .sp-r.hors:last-child .sp-l { }
  .sp-g:last-child .sp-r .sp-i.r ~ .sp-l { color: #B42318; }
  .sp-sheet .sp { padding: 0 6px 12px; } .sp-sheet .sp-r { padding: 10px 10px; font-size: 15px !important; }
`
