import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'

/**
 * Barre de recherche / filtres figée au défilement.
 * Sur grand écran (≥ 1280 px), elle remonte dans l'en-tête, juste à droite du titre de la page (.page-title).
 * À utiliser avec les classes CSS globales « barre-fige » et « colle » (styles.css).
 */
export function useBarreFigee<T extends HTMLElement = HTMLDivElement>({ titre: selTitre = '.page-title', haut = 72 }: { titre?: string; haut?: number } = {}) {
  const repere = useRef<HTMLDivElement>(null)
  const barre = useRef<T>(null)
  const [colle, setColle] = useState(false)
  const [decalage, setDecalage] = useState(0)
  // Vrai quand la barre ne tient pas en entier à côté du titre : elle reste alors sous l'en-tête
  const [etroit, setEtroit] = useState(false)

  // Écoute du défilement (fonctionne aussi si la barre apparaît après un chargement)
  useEffect(() => {
    const maj = () => { const el = repere.current; setColle(!!el && el.getBoundingClientRect().top < haut) }
    maj()
    window.addEventListener('scroll', maj, { passive: true })
    window.addEventListener('resize', maj)
    return () => { window.removeEventListener('scroll', maj); window.removeEventListener('resize', maj) }
  }, [haut])

  // Distance entre le début de la barre et la fin du titre de la page, mesurée avant décalage
  useLayoutEffect(() => {
    if (!colle) { setDecalage(0); setEtroit(false); return }
    const mesurer = () => {
      const titre = document.querySelector(selTitre)
      const b = barre.current
      if (!titre || !b) return
      const gauche = b.getBoundingClientRect().left - (parseFloat(getComputedStyle(b).marginLeft) || 0)
      // Fin du texte du titre (le titre lui-même occupe toute la largeur de l'en-tête)
      const plage = document.createRange()
      plage.selectNodeContents(titre)
      const finTexte = plage.getBoundingClientRect().right
      setDecalage(Math.max(0, Math.round(finTexte + 24 - gauche)))
    }
    const auRedim = () => { setEtroit(false); mesurer() }
    mesurer()
    window.addEventListener('resize', auRedim)
    return () => window.removeEventListener('resize', auRedim)
  }, [colle, selTitre])

  // Une fois placée à côté du titre, on vérifie que rien ne déborde (boutons coupés)
  useLayoutEffect(() => {
    if (!colle || etroit) return
    const b = barre.current
    if (!b || window.innerWidth < 1280) return
    if (b.scrollWidth > b.clientWidth + 1) setEtroit(true)
  })

  const style = { ['--decalage' as any]: `${decalage}px` } as CSSProperties
  return { repere, barre, colle, style, classe: `barre-fige${colle ? ' colle' : ''}${colle && etroit ? ' etroit' : ''}` }
}
