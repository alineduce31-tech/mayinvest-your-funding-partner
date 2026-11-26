import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Rangée de boutons qui défile horizontalement quand elle est trop large.
 * Tactile : on glisse au doigt, un fondu et une flèche montrent qu'il y a la suite.
 * Souris : fine barre de défilement, la molette fait défiler la rangée, flèches cliquables.
 * Au-delà de 760 px la rangée passe sur plusieurs lignes (classe sr-wrap-desktop).
 */
export default function ScrollRow({ children, className = '', wrapOnDesktop = true }: { children: ReactNode; className?: string; wrapOnDesktop?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const update = () => {
      const max = el.scrollWidth - el.clientWidth
      setEdges({ left: el.scrollLeft > 2, right: max > 2 && el.scrollLeft < max - 2 })
    }
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
      el.scrollLeft += e.deltaY
      e.preventDefault()
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    el.addEventListener('wheel', onWheel, { passive: false })
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
    ro?.observe(el)
    Array.from(el.children).forEach(c => ro?.observe(c))
    window.addEventListener('resize', update)
    return () => {
      el.removeEventListener('scroll', update)
      el.removeEventListener('wheel', onWheel)
      ro?.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  const go = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * 180, behavior: 'smooth' })

  return (
    <div className={`sr-wrap ${edges.left ? 'l' : ''} ${edges.right ? 'r' : ''}`}>
      <div ref={ref} className={`sr-row ${wrapOnDesktop ? 'wrap-desktop' : ''} ${className}`}>{children}</div>
      {edges.left && <button type="button" className="sr-arrow left" onClick={() => go(-1)} aria-label="Voir les boutons précédents"><Chevron dir="left"/></button>}
      {edges.right && <button type="button" className="sr-arrow right" onClick={() => go(1)} aria-label="Voir les autres boutons"><Chevron dir="right"/></button>}
      <style>{`
        .sr-wrap { position: relative; min-width: 0; }
        .sr-row { display: flex; gap: 6px; align-items: center; flex-wrap: nowrap; overflow-x: auto; overscroll-behavior-x: contain; scroll-behavior: smooth; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        .sr-row::-webkit-scrollbar { display: none; }
        .sr-row > * { flex-shrink: 0; }
        @media (min-width: 761px) { .sr-row.wrap-desktop { flex-wrap: wrap; overflow: visible; } }
        @media (hover: hover) and (pointer: fine) {
          .sr-row { scrollbar-width: thin; scrollbar-color: #CBD5E1 transparent; padding-bottom: 4px; }
          .sr-row::-webkit-scrollbar { display: block; height: 6px; }
          .sr-row::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 6px; }
          .sr-row::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
          .sr-row::-webkit-scrollbar-track { background: transparent; }
        }
        .sr-wrap::before, .sr-wrap::after { content: ''; position: absolute; top: 0; bottom: 0; width: 44px; pointer-events: none; opacity: 0; transition: opacity 0.15s; z-index: 1; }
        .sr-wrap::before { left: 0; background: linear-gradient(90deg, #fff 30%, rgba(255,255,255,0)); }
        .sr-wrap::after { right: 0; background: linear-gradient(270deg, #fff 30%, rgba(255,255,255,0)); }
        .sr-wrap.l::before, .sr-wrap.r::after { opacity: 1; }
        .sr-arrow { position: absolute; top: 50%; transform: translateY(-50%); z-index: 2; width: 28px; height: 28px; border-radius: 50%; border: 1px solid #E5E7EB; background: #fff; box-shadow: 0 2px 8px rgba(13,27,62,0.14); display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; color: #1A6BFF; }
        .sr-arrow.left { left: 0; }
        .sr-arrow.right { right: 0; }
        @media (hover: hover) and (pointer: fine) { .sr-arrow { top: calc(50% - 2px); } }
      `}</style>
    </div>
  )
}

const Chevron = ({ dir }: { dir: 'left' | 'right' }) => (
  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d={dir === 'right' ? 'M5 3l4 4-4 4' : 'M9 3L5 7l4 4'} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
