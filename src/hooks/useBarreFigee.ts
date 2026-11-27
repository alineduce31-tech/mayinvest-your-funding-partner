import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'

/**
 * Barre de recherche / filtres figée au défilement.
 * Sur grand écran (≥ 1280 px), elle remonte dans l'en-tête, juste à droite du titre de la page (.page-title).
 * À utiliser avec les classes CSS globales « barre-fige » et « colle » (styles.css).
 */
export function useBarreFigee<T extends HTMLElement = HTMLDivElement>() {
  const repere = useRef<HTMLDivElement>(null)
  const barre = useRef<T>(null)
  const [colle, setColle] = useState(false)
  const [decalage, setDecalage] = useState(0)

  useEffect(() => {
    const el = repere.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver(([e]) => setColle(!!e && !e.isIntersecting && e.boundingClientRect.top < 80), { rootMargin: '-72px 0px 0px 0px', threshold: 0 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Distance entre le début de la barre et la fin du titre de la page, mesurée avant décalage
  useLayoutEffect(() => {
    if (!colle) { setDecalage(0); return }
    const mesurer = () => {
      const titre = document.querySelector('.page-title')
      const b = barre.current
      if (!titre || !b) return
      const gauche = b.getBoundingClientRect().left - (parseFloat(getComputedStyle(b).marginLeft) || 0)
      // Fin du texte du titre (le titre lui-même occupe toute la largeur de l'en-tête)
      const plage = document.createRange()
      plage.selectNodeContents(titre)
      const finTexte = plage.getBoundingClientRect().right
      setDecalage(Math.max(0, Math.round(finTexte + 24 - gauche)))
    }
    mesurer()
    window.addEventListener('resize', mesurer)
    return () => window.removeEventListener('resize', mesurer)
  }, [colle])

  const style = { ['--decalage' as any]: `${decalage}px` } as CSSProperties
  return { repere, barre, colle, style, classe: `barre-fige${colle ? ' colle' : ''}` }
}
