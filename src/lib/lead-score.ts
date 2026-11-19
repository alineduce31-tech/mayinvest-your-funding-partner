// ============================================================
// Mayinvest PréSelect - Helper Score Badge
// NOUVEAU FICHIER: src/lib/lead-score.ts
// ============================================================

export type LeadTier = 'Hot' | 'Warm' | 'Cold' | 'Non éligible'

export function leadTier(score: number | null | undefined): LeadTier {
  const s = Number(score ?? 0)
  if (s >= 80) return 'Hot'
  if (s >= 60) return 'Warm'
  if (s >= 40) return 'Cold'
  return 'Non éligible'
}

export const TIER_STYLES: Record<LeadTier, { bg: string; fg: string; icon: string }> = {
  'Hot':          { bg: '#D1FAE5', fg: '#047857', icon: '🟢' },
  'Warm':         { bg: '#FEF3C7', fg: '#B45309', icon: '🟡' },
  'Cold':         { bg: '#FED7AA', fg: '#C2410C', icon: '🟠' },
  'Non éligible': { bg: '#FEE2E2', fg: '#B91C1C', icon: '🔴' },
}

export function scoreColor(score: number | null | undefined): string {
  const s = Number(score ?? 0)
  if (s >= 80) return '#047857'
  if (s >= 60) return '#B45309'
  if (s >= 40) return '#C2410C'
  return '#B91C1C'
}

// Composant badge réutilisable (à utiliser dans la table CRM)
export function scoreTierLabel(score: number | null | undefined): string {
  const s = Number(score ?? 0)
  const tier = leadTier(s)
  return `${s}/100 · ${tier}`
}
