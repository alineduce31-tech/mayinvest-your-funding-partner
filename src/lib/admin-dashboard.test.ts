import { describe, it as test, expect } from 'vitest'
import {
  dashboardMetrics,
  isUnbanked,
  needsPack,
  opportunity,
  periodBounds,
  matchesPriority,
  PRIX_OUVERTURE_COMPTE,
  PRIX_PACK_FORMALISATION,
  TAUX_COMMISSION_CREDIT,
  type DashboardLead,
} from './admin-dashboard'

const now = Date.UTC(2026, 10, 19)
const day = 86_400_000
const lead = (changes: Partial<DashboardLead> = {}): DashboardLead => ({
  id: 'test',
  statut: 'Nouveau',
  created_at: new Date(now - day).toISOString(),
  type: 'physique',
  banque_actuelle: 'Banque',
  ...changes,
})

describe('dashboard strategic rules', () => {
  test('detects null, blank, trimmed and case-insensitive unbanked values', () => {
    for (const banque_actuelle of [null, '', '  ', ' Aucune ', 'NON', 'aucun'])
      expect(isUnbanked(lead({ banque_actuelle }))).toBe(true)
    expect(isUnbanked(lead())).toBe(false)
  })

  test('formalisation targets Morale with RCCM Non including existing JSON fields', () => {
    expect(needsPack(lead({ type_client: 'Morale', rccm: ' Non ' }))).toBe(true)
    expect(needsPack(lead({ type: 'morale', situation: { rccm: 'Non' } }))).toBe(true)
    expect(needsPack(lead({ rccm: 'Non' }))).toBe(false)
  })

  test('impact revenue uses official prices per category', () => {
    const m = dashboardMetrics(
      [
        lead({ banque_actuelle: null }), // pas de compte -> ouverture compte
        lead({ type: 'morale', rccm: 'Non' }), // pas de RCCM -> pack formalisation
        lead({ statut: 'Non Éligible', motif_refus: 'Refus banque' }), // refus -> aucun service payant
      ],
      '30j',
      now,
    )
    expect(m.bloc1.caImpactPotentiel).toBe(
      PRIX_OUVERTURE_COMPTE + PRIX_PACK_FORMALISATION,
    )
  })

  test('credit commission is exactly 2% of financed amounts', () => {
    const m = dashboardMetrics(
      [lead({ statut: 'Financé', montant_finance: 10_000_000 })],
      '30j',
      now,
    )
    expect(m.bloc1.montantTotalFinance).toBe(10_000_000)
    expect(m.bloc1.caCommissionCredit).toBe(10_000_000 * TAUX_COMMISSION_CREDIT)
  })

  test('financed amount prefers montant_finance over montant_demande', () => {
    const m = dashboardMetrics(
      [lead({ statut: 'Financé', montant_finance: 8_000_000, montant_demande: 12_000_000 })],
      '30j',
      now,
    )
    expect(m.bloc1.montantTotalFinance).toBe(8_000_000)
  })

  test('dual opportunity begins at exactly 5000000 XAF', () => {
    expect(opportunity(lead({ banque_actuelle: null, montant_demande: 4_999_999 }))).toBe('Impact')
    expect(opportunity(lead({ banque_actuelle: null, montant_demande: 5_000_000 }))).toBe(
      'Crédit + Impact',
    )
    expect(opportunity(lead())).toBe('Crédit')
  })

  test('period filter keeps only leads created inside the window', () => {
    const rows = [
      lead({ created_at: new Date(now - 10 * day).toISOString() }),
      lead({ created_at: new Date(now - 40 * day).toISOString() }),
    ]
    const m = dashboardMetrics(rows, '30j', now)
    expect(m.current.length).toBe(1)
    expect(m.bloc1.total).toBe(1)
  })

  test('YTD starts January 1 and the previous interval has equal duration', () => {
    const b = periodBounds('YTD', now)
    expect(b.start).toBe(Date.UTC(2026, 0, 1))
    expect(b.start - b.previousStart).toBe(b.end - b.start)
  })

  test('priority filters use score 80, 48 hours, 7-day detection and stale RDV', () => {
    expect(
      matchesPriority(lead({ score: 80, created_at: new Date(now - 3 * day).toISOString() }), 'ready', now),
    ).toBe(true)
    expect(
      matchesPriority(lead({ score: 79, created_at: new Date(now - 3 * day).toISOString() }), 'ready', now),
    ).toBe(false)
    expect(matchesPriority(lead({ score: 80 }), 'ready', now)).toBe(false)
    expect(matchesPriority(lead({ banque_actuelle: null }), 'impact', now)).toBe(true)
    expect(
      matchesPriority(lead({ banque_actuelle: null, created_at: new Date(now - 8 * day).toISOString() }), 'impact', now),
    ).toBe(false)
    expect(
      matchesPriority(lead({ statut: 'RDV', updated_at: new Date(now - 8 * day).toISOString() }), 'followup', now),
    ).toBe(true)
    expect(
      matchesPriority(lead({ statut: 'RDV', updated_at: new Date(now - 6 * day).toISOString() }), 'followup', now),
    ).toBe(false)
  })

  test('empty periods return zero metrics', () => {
    const m = dashboardMetrics([], '30j', now)
    expect(m.bloc1.total).toBe(0)
    expect(m.bloc1.caTotal).toBe(0)
    expect(m.current).toEqual([])
  })
})

describe('noms de banque', () => {
  test('regroupe les variantes', async () => {
    const { nomBanque, bloc4Segments } = await import('./admin-dashboard')
    expect(nomBanque('BGFI')).toBe('BGFI')
    expect(nomBanque('BGFI Bank')).toBe('BGFI')
    expect(nomBanque(' boa ')).toBe('BOA')
    expect(nomBanque('Autre banque')).toBe('Autre banque')
    expect(nomBanque('BSCA')).toBe('BSCA Bank')
    expect(nomBanque('Afriland First Bank')).toBe('Afriland First Bank')
    expect(nomBanque('afriland')).toBe('Afriland First Bank')
    expect(nomBanque('La Banque Postale')).toBe('Banque Postale')
    expect(nomBanque('bci')).toBe('BCI')
    const l = (b: string, statut = 'Nouveau') => ({ id: b + statut, statut, created_at: new Date().toISOString(), banque_actuelle: b } as any)
    const r = bloc4Segments([l('BGFI', 'Financé'), l('BGFI Bank'), l('BOA'), l('BOA Bank')]).banques
    expect(r.map(x => [x.label, x.total, x.acceptes])).toEqual([['BGFI', 2, 1], ['BOA', 2, 0]])
  })
})
