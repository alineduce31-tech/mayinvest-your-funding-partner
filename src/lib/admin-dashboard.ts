// Dashboard estimates: a formalisation pack represents 500,000 XAF potential revenue;
// an impact opportunity also targets credit when the requested amount is at least 5,000,000 XAF.
export const PACK_PRICE_XAF = 500_000
export const CREDIT_OPPORTUNITY_THRESHOLD_XAF = 5_000_000
const DAY = 86_400_000
export type DashboardPeriod = '7j' | '30j' | '90j' | 'YTD'
export type PriorityFilter = '' | 'ready' | 'impact' | 'followup'
export type DashboardLead = {
  id: string; created_at: string; updated_at?: string | null; statut: string
  type?: string; type_client?: string; banque_actuelle?: string | null; rccm?: string | null
  montant_demande?: number | string | null; montant_finance?: number | string | null
  score?: number; activite?: string | null
  identite?: Record<string, unknown>; situation?: Record<string, unknown>
}
const normalise = (value: unknown) => String(value ?? '').trim().toLowerCase()
export const isUnbanked = (lead: DashboardLead) => ['', 'aucune', 'non', 'aucun'].includes(normalise(lead.banque_actuelle))
export const isCompany = (lead: DashboardLead) => ['morale', 'personne morale', 'pme'].includes(normalise(lead.type_client ?? lead.type))
export const rccmValue = (lead: DashboardLead) => normalise(lead.rccm ?? lead.situation?.['rccm'])
export const needsPack = (lead: DashboardLead) => isCompany(lead) && rccmValue(lead) === 'non'
export const amount = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0
export const xaf = (value: number) => new Intl.NumberFormat('fr-FR').format(value) + ' XAF'
export function opportunity(lead: DashboardLead): 'Crédit' | 'Impact' | 'Crédit + Impact' | null {
  if (isUnbanked(lead) || rccmValue(lead) === 'non') {
    return amount(lead.montant_demande) >= CREDIT_OPPORTUNITY_THRESHOLD_XAF ? 'Crédit + Impact' : 'Impact'
  }
  return !isCompany(lead) || rccmValue(lead) === 'oui' ? 'Crédit' : null
}
export function periodBounds(period: DashboardPeriod, now: number) {
  const start = period === 'YTD' ? Date.UTC(new Date(now).getUTCFullYear(), 0, 1) : now - Number(period.slice(0, -1)) * DAY
  return { start, end: now, previousStart: start - (now - start) }
}
export function matchesPriority(lead: DashboardLead, filter: PriorityFilter, now: number): boolean {
  const created = Date.parse(lead.created_at)
  if (filter === 'ready') return (lead.score ?? 0) >= 80 && lead.statut === 'Nouveau' && created < now - 2 * DAY
  if (filter === 'impact') return isUnbanked(lead) && lead.statut === 'Nouveau' && created >= now - 7 * DAY && created <= now
  if (filter === 'followup') return lead.statut === 'RDV' && Date.parse(lead.updated_at || lead.created_at) < now - 7 * DAY
  return true
}
export function dashboardMetrics(leads: DashboardLead[], period: DashboardPeriod, now: number) {
  const { start, end, previousStart } = periodBounds(period, now)
  // Cohorts use created_at. updated_at is only an approximate deposit date, not a status history.
  const current = leads.filter(l => Date.parse(l.created_at) >= start && Date.parse(l.created_at) <= end)
  const previous = leads.filter(l => Date.parse(l.created_at) >= previousStart && Date.parse(l.created_at) < start)
  const deposits = current.filter(l => l.statut === 'Dossier Déposé')
  const previousDeposits = previous.filter(l => l.statut === 'Dossier Déposé').length
  const pipeline = current.filter(l => ['RDV', 'Dossier Déposé'].includes(l.statut))
  const financed = current.filter(l => l.statut === 'Financé')
  const unbanked = current.filter(isUnbanked)
  const packs = current.filter(needsPack)
  // Exclude lost/rejected leads: they are not active transformations.
  const transformed = unbanked.filter(l => ['Contacté', 'RDV', 'Dossier Déposé', 'Éligible', 'Pack Formalisation Vendu', 'Bancarisé', 'Financé'].includes(l.statut))
  const cycles = deposits.map(l => Math.max(0, (Date.parse(l.updated_at || l.created_at) - Date.parse(l.created_at)) / DAY))
  const fundedAmounts = financed.filter(l => l.montant_finance != null)
  return {
    current, deposits: deposits.length, previousDeposits,
    variation: previousDeposits ? (deposits.length - previousDeposits) / previousDeposits * 100 : null,
    pipeline: pipeline.length, pipelineAmount: pipeline.reduce((s, l) => s + amount(l.montant_demande), 0),
    financed: financed.length, financedAmount: fundedAmounts.reduce((s, l) => s + amount(l.montant_finance), 0),
    financedAmountKnown: fundedAmounts.length === financed.length,
    conversion: current.length ? deposits.length / current.length * 100 : 0,
    cycle: cycles.length ? cycles.reduce((s, v) => s + v, 0) / cycles.length : null,
    unbanked: unbanked.length, packs: packs.length, transformed: transformed.length,
    impactRate: unbanked.length ? transformed.length / unbanked.length * 100 : 0,
    potentialRevenue: packs.length * PACK_PRICE_XAF,
    creditFunnel: ['Nouveau', 'Contacté', 'RDV', 'Dossier Déposé', 'Financé'].map(label => ({ label, count: current.filter(l => l.statut === label).length })),
    // Requested proxies, pending dedicated pack-sale and bank-account history RPCs.
    impactFunnel: [
      { label: 'Non-bancarisé détecté', count: unbanked.length },
      { label: 'Pack Formalisation proposé', count: packs.length },
      { label: 'Pack vendu', count: packs.filter(l => l.statut === 'Financé').length },
      { label: 'Bancarisation réalisée', count: unbanked.filter(l => l.statut === 'Financé').length },
    ],
    ready: leads.filter(l => matchesPriority(l, 'ready', now)).length,
    inactiveImpact: leads.filter(l => matchesPriority(l, 'impact', now)).length,
    followupAmount: leads.filter(l => matchesPriority(l, 'followup', now)).reduce((s, l) => s + amount(l.montant_demande), 0),
    latest: [...current].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, 10),
  }
}