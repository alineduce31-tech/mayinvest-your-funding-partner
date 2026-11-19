import { describe, it as test } from 'node:test'
import assert from 'node:assert/strict'
const expect = (actual: unknown) => ({
  toBe: (expected: unknown) => assert.strictEqual(actual, expected),
  toEqual: (expected: unknown) => assert.deepStrictEqual(actual, expected),
})
import { dashboardMetrics, isUnbanked, needsPack, opportunity, periodBounds, matchesPriority, type DashboardLead } from './admin-dashboard'
const now = Date.UTC(2026, 10, 19)
const day = 86_400_000
const lead = (changes: Partial<DashboardLead> = {}): DashboardLead => ({ id: 'test', statut: 'Nouveau', created_at: new Date(now - day).toISOString(), type: 'physique', banque_actuelle: 'Banque', ...changes })
describe('dashboard strategic rules', () => {
  test('detects null, blank, trimmed and case-insensitive unbanked values', () => {
    for (const banque_actuelle of [null, '', '  ', ' Aucune ', 'NON', 'aucun']) expect(isUnbanked(lead({ banque_actuelle }))).toBe(true)
    expect(isUnbanked(lead())).toBe(false)
  })
  test('formalisation targets Morale with RCCM Non including existing JSON fields', () => {
    expect(needsPack(lead({ type_client: 'Morale', rccm: ' Non ' }))).toBe(true)
    expect(needsPack(lead({ type: 'morale', situation: { rccm: 'Non' } }))).toBe(true)
    expect(needsPack(lead({ rccm: 'Non' }))).toBe(false)
  })
  test('potential revenue uses exactly 500000 XAF per pack', () => {
    expect(dashboardMetrics([lead({ type: 'morale', rccm: 'Non' })], '30j', now).potentialRevenue).toBe(500000)
  })
  test('dual opportunity begins at exactly 5000000 XAF', () => {
    expect(opportunity(lead({ banque_actuelle: null, montant_demande: 4999999 }))).toBe('Impact')
    expect(opportunity(lead({ banque_actuelle: null, montant_demande: 5000000 }))).toBe('Crédit + Impact')
    expect(opportunity(lead())).toBe('Crédit')
  })
  test('compares 30-day cohorts and computes deposit cycle and pipeline amounts', () => {
    const rows = [lead({ statut: 'Dossier Déposé', created_at: new Date(now - 10 * day).toISOString(), updated_at: new Date(now - 7 * day).toISOString(), montant_demande: 5000000 }), lead({ statut: 'Dossier Déposé' }), lead({ statut: 'Dossier Déposé', created_at: new Date(now - 40 * day).toISOString() })]
    const m = dashboardMetrics(rows, '30j', now)
    expect(m.deposits).toBe(2); expect(m.variation).toBe(100); expect(m.conversion).toBe(100); expect(m.cycle).toBe(1.5); expect(m.pipelineAmount).toBe(5000000)
  })
  test('YTD starts January 1 and the previous interval has equal duration', () => {
    const b = periodBounds('YTD', now)
    expect(b.start).toBe(Date.UTC(2026, 0, 1)); expect(b.start - b.previousStart).toBe(b.end - b.start)
  })
  test('impact transformation excludes rejected and lost leads and uses financed proxies', () => {
    const m = dashboardMetrics(['Contacté', 'Non Éligible', 'Perdu', 'Financé'].map(statut => lead({ statut, banque_actuelle: null, type: 'morale', rccm: 'Non' })), '30j', now)
    expect(m.transformed).toBe(2); expect(m.impactRate).toBe(50)
    expect(m.impactFunnel.map(f => f.count)).toEqual([4, 4, 1, 1])
  })
  test('priority filters use score 80, 48 hours, 7-day detection and stale RDV', () => {
    expect(matchesPriority(lead({ score: 80, created_at: new Date(now - 3 * day).toISOString() }), 'ready', now)).toBe(true)
    expect(matchesPriority(lead({ score: 79, created_at: new Date(now - 3 * day).toISOString() }), 'ready', now)).toBe(false)
    expect(matchesPriority(lead({ score: 80 }), 'ready', now)).toBe(false)
    expect(matchesPriority(lead({ banque_actuelle: null }), 'impact', now)).toBe(true)
    expect(matchesPriority(lead({ banque_actuelle: null, created_at: new Date(now - 8 * day).toISOString() }), 'impact', now)).toBe(false)
    expect(matchesPriority(lead({ statut: 'RDV', updated_at: new Date(now - 8 * day).toISOString() }), 'followup', now)).toBe(true)
    expect(matchesPriority(lead({ statut: 'RDV', updated_at: new Date(now - 6 * day).toISOString() }), 'followup', now)).toBe(false)
  })
  test('missing funded amount is not passed off as requested amount', () => {
    const m = dashboardMetrics([lead({ statut: 'Financé', montant_demande: 10000000 })], '30j', now)
    expect(m.financedAmountKnown).toBe(false); expect(m.financedAmount).toBe(0)
  })
  test('empty periods return zero metrics and no latest rows', () => {
    const m = dashboardMetrics([], '30j', now)
    expect(m.conversion).toBe(0); expect(m.impactRate).toBe(0); expect(m.latest).toEqual([]); expect(m.variation).toBe(null)
  })
})