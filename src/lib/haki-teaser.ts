// Règles d'apparition de Haki (module pur, testé)
// Mobile : petite bulle d'abord, jamais de panneau qui s'ouvre tout seul.
// Ordinateur : le panneau peut s'ouvrir seul, après un délai.

export type HakiPage = 'home' | 'login' | 'form' | 'client'

export const MOBILE_MAX_WIDTH = 760
export const SCROLL_TRIGGER_PX = 150
export const TEASER_AUTO_HIDE_MS = 12_000

export const DELAIS: Record<HakiPage, { mobile: number; desktop: number }> = {
  home: { mobile: 7000, desktop: 7000 },
  login: { mobile: 2500, desktop: 1500 },
  form: { mobile: 6000, desktop: 2000 },
  client: { mobile: 6000, desktop: 3000 },
}

export const TEXTES: Record<HakiPage, string> = {
  home: 'Besoin d\'aide ? Je vérifie votre éligibilité avec vous en 2 minutes.',
  login: 'Un souci pour vous connecter ? Je vous guide.',
  form: 'Je peux remplir le dossier avec vous, étape par étape.',
  client: 'Une question sur votre dossier ? Je suis là.',
}

export function estMobile(largeur: number): boolean {
  return largeur <= MOBILE_MAX_WIDTH
}

export function modeApparition(p: { largeur: number; autoActif: boolean; refuse: boolean; bulleDejaVue: boolean }): 'rien' | 'bulle' | 'panneau' {
  if (!p.autoActif || p.refuse) return 'rien'
  if (estMobile(p.largeur)) return p.bulleDejaVue ? 'rien' : 'bulle'
  return 'panneau'
}

export function cleSession(page: HakiPage): string {
  return `mi_haki_bulle_${page}`
}

export function doitFermerParGlisse(deltaY: number, hauteur: number): boolean {
  return deltaY > Math.min(120, hauteur * 0.25)
}
