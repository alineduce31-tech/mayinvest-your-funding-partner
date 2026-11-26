import CloseIcon from '@/components/CloseIcon'
import { useEffect, useRef, useState } from 'react'
import { DELAIS, SCROLL_TRIGGER_PX, TEASER_AUTO_HIDE_MS, TEXTES, cleSession, doitFermerParGlisse, estMobile, modeApparition, type HakiPage, TABLETTE_MAX_WIDTH } from '@/lib/haki-teaser'

function bulleVue(page: HakiPage) {
  try { return sessionStorage.getItem(cleSession(page)) === '1' } catch { return false }
}
function marquerVue(page: HakiPage) {
  try { sessionStorage.setItem(cleSession(page), '1') } catch {}
}
/** Mobile ou tablette : pas d'ouverture automatique du panneau. */
export function petitEcranActuel() {
  return typeof window !== 'undefined' && window.innerWidth <= TABLETTE_MAX_WIDTH
}
export function vueMobile() {
  return typeof window !== 'undefined' && estMobile(window.innerWidth)
}

/** Bulle d'invitation + déclenchement automatique de Haki selon l'écran. */
export function useHakiTeaser(page: HakiPage, opts: { autoActif: boolean; refuse: boolean; ouvrirPanneau: () => void; actif?: boolean }) {
  const [texte, setTexte] = useState<string | null>(null)
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function montrer(t?: string) {
    if (hideRef.current) clearTimeout(hideRef.current)
    setTexte(t || TEXTES[page])
    hideRef.current = setTimeout(() => { setTexte(null); marquerVue(page) }, TEASER_AUTO_HIDE_MS)
  }
  function fermer() {
    if (hideRef.current) clearTimeout(hideRef.current)
    setTexte(null)
    marquerVue(page)
  }

  useEffect(() => {
    if (opts.actif === false) return undefined
    const mode = modeApparition({ largeur: window.innerWidth, autoActif: opts.autoActif, refuse: opts.refuse, bulleDejaVue: bulleVue(page) })
    if (mode === 'rien') return undefined
    let fait = false
    const go = () => {
      if (fait) return
      fait = true
      if (mode === 'bulle') montrer()
      else opts.ouvrirPanneau()
    }
    const mobile = mode === 'bulle'
    const t = setTimeout(go, mobile ? DELAIS[page].mobile : DELAIS[page].desktop)
    const onScroll = () => { if (window.scrollY > SCROLL_TRIGGER_PX) go() }
    if (mobile) window.addEventListener('scroll', onScroll, { passive: true })
    return () => { clearTimeout(t); window.removeEventListener('scroll', onScroll) }
  }, [opts.actif]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { if (hideRef.current) clearTimeout(hideRef.current) }, [])

  return { texte, montrer, fermer }
}

/** Sur mobile, le panneau Haki devient un panneau du bas qu'on ferme en glissant. */
export function useSheetSwipe(open: boolean, selector: string, onClose: () => void) {
  useEffect(() => {
    if (!open || !vueMobile()) return undefined
    const panel = document.querySelector(selector) as HTMLElement | null
    if (!panel) return undefined
    const handle = (panel.firstElementChild as HTMLElement | null) || panel
    let startY = 0
    let dy = 0
    let dragging = false
    const start = (e: TouchEvent) => { startY = e.touches[0]?.clientY ?? 0; dy = 0; dragging = true; panel.style.transition = 'none' }
    const move = (e: TouchEvent) => {
      if (!dragging) return
      dy = Math.max(0, (e.touches[0]?.clientY ?? 0) - startY)
      panel.style.transform = `translateY(${dy}px)`
    }
    const end = () => {
      if (!dragging) return
      dragging = false
      panel.style.transition = 'transform 0.2s ease'
      if (doitFermerParGlisse(dy, panel.offsetHeight)) { panel.style.transform = 'translateY(100%)'; setTimeout(onClose, 180) }
      else panel.style.transform = ''
    }
    handle.addEventListener('touchstart', start, { passive: true })
    handle.addEventListener('touchmove', move, { passive: true })
    handle.addEventListener('touchend', end)
    return () => {
      handle.removeEventListener('touchstart', start)
      handle.removeEventListener('touchmove', move)
      handle.removeEventListener('touchend', end)
      panel.style.transform = ''
      panel.style.transition = ''
    }
  }, [open, selector]) // eslint-disable-line react-hooks/exhaustive-deps
}

export function HakiBulle({ texte, onOuvrir, onFermer, bottom = 92 }: { texte: string | null; onOuvrir: () => void; onFermer: () => void; bottom?: number }) {
  if (!texte) return null
  return (
    <div className="hkb" style={{ bottom }} role="dialog" aria-label="Haki, assistante Mayinvest">
      <button className="hkb-main" onClick={onOuvrir}>
        <span className="hkb-name">Haki</span>
        <span className="hkb-txt">{texte}</span>
      </button>
      <button className="hkb-x" onClick={onFermer} aria-label="Fermer la bulle"><CloseIcon size={11}/></button>
      <style>{`
        .hkb { position: fixed; right: 16px; z-index: 1001; max-width: min(300px, calc(100vw - 32px)); display: flex; align-items: flex-start; gap: 4px; background: #fff; border: 1px solid #E5E7EB; border-radius: 18px 18px 6px 18px; box-shadow: 0 16px 36px rgba(13,27,62,0.18); padding: 4px 4px 4px 0; animation: hkb-in 0.28s cubic-bezier(0.2,0.9,0.3,1.2); font-family: inherit; }
        @keyframes hkb-in { from { opacity: 0; transform: translateY(10px) scale(0.96); } to { opacity: 1; transform: none; } }
        .hkb-main { flex: 1; border: none; background: none; text-align: left; padding: 9px 4px 10px 14px; cursor: pointer; font-family: inherit; display: flex; flex-direction: column; gap: 2px; }
        .hkb-name { font-size: 11px; font-weight: 800; color: #1A6BFF; letter-spacing: 0.04em; }
        .hkb-txt { font-size: 13.5px; font-weight: 600; color: #0D1B3E; line-height: 1.4; }
        .hkb-x { border: none; background: #F1F5F9; color: #475569; width: 26px; height: 26px; border-radius: 50%; padding: 0; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; margin-top: 4px; }
        .hkb-x:hover { background: #E2E8F0; color: #0D1B3E; }
      `}</style>
    </div>
  )
}

/** Styles communs : panneau du bas sur mobile pour les panneaux Haki existants. */
export function HakiSheetStyles({ panel }: { panel: string }) {
  return <style>{`
    @media (max-width: 760px) {
      ${panel} { left: 0 !important; right: 0 !important; bottom: 0 !important; top: auto !important; width: 100% !important; max-width: none !important; max-height: 72vh !important; border-radius: 22px 22px 0 0 !important; padding-bottom: env(safe-area-inset-bottom); z-index: 1002 !important; animation: hk-sheet-in 0.25s ease-out !important; }
      ${panel} > :first-child { position: relative; padding-top: 18px !important; touch-action: none; }
      ${panel} > :first-child::before { content: ''; position: absolute; top: 7px; left: 50%; width: 40px; height: 4px; margin-left: -20px; border-radius: 4px; background: rgba(255,255,255,0.45); }
      @keyframes hk-sheet-in { from { transform: translateY(100%); } to { transform: none; } }
    }
  `}</style>
}
