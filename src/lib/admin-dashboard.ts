// ============================================================
// Mayinvest PréSelect - Dashboard v3 avec Commission 2% Crédit
// Fichier: src/lib/admin-dashboard.ts (REMPLACEMENT COMPLET)
// ============================================================

// Prix officiels Impact (cahier des charges Mayinvest)
export const PRIX_OUVERTURE_COMPTE = 30_000       // XAF
export const PRIX_PACK_FORMALISATION = 50_000     // XAF
export const PRIX_COUVEUSE_3MOIS = 0              // XAF (service gratuit)
export const PRIX_RESTRUCTURATION = 50_000        // XAF

// NOUVEAU : Taux de commission sur crédit bancaire financé
export const TAUX_COMMISSION_CREDIT = 0.02        // 2% du montant finance

const DAY = 86_400_000
const MOIS_3 = 90 * DAY

export type DashboardPeriod = '7j' | '30j' | '90j' | 'YTD'
export type RaisonNonEligible = 'pas_compte' | 'pas_rccm' | 'flux_faible' | 'refus'
export type PriorityFilter = '' | 'ready' | 'impact' | 'followup'

export type DashboardLead = {
  id: string
  created_at: string
  updated_at?: string | null
  statut: string
  type?: string
  type_client?: string
  banque_actuelle?: string | null
  rccm?: string | null
  flux_mensuel?: number | null
  motif_refus?: string | null
  montant_demande?: number | string | null
  montant_finance?: number | string | null
  score?: number
  activite?: string | null
  ville?: string | null
  identite?: Record<string, unknown>
  situation?: Record<string, unknown>
}

const normalise = (v: unknown) => String(v ?? '').trim().toLowerCase()

export const isUnbanked = (l: DashboardLead) =>
  ['', 'aucune', 'non', 'aucun'].includes(normalise(l.banque_actuelle))

export const isCompany = (l: DashboardLead) =>
  ['morale', 'personne morale', 'pme'].includes(normalise(l.type_client ?? l.type))

export const rccmValue = (l: DashboardLead) =>
  normalise(l.rccm ?? l.situation?.['rccm'])

export const needsPack = (l: DashboardLead) =>
  isCompany(l) && rccmValue(l) === 'non'

export const hasFluxFaible = (l: DashboardLead) => {
  if (l.flux_mensuel != null) return Number(l.flux_mensuel) < 1_000_000
  return false
}

export const hasRefus = (l: DashboardLead) => {
  if (l.motif_refus) return /refus/i.test(l.motif_refus)
  return l.statut === 'Non Éligible'
}

export const amount = (v: unknown) =>
  Number.isFinite(Number(v)) ? Number(v) : 0

export const xaf = (v: number) =>
  new Intl.NumberFormat('fr-FR').format(v) + ' XAF'

export const pct = (v: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(v) + ' %'

export function raisonsNonEligibilite(l: DashboardLead): RaisonNonEligible[] {
  const raisons: RaisonNonEligible[] = []
  if (isUnbanked(l)) raisons.push('pas_compte')
  if (needsPack(l)) raisons.push('pas_rccm')
  if (hasFluxFaible(l)) raisons.push('flux_faible')
  if (hasRefus(l) && !isUnbanked(l) && !needsPack(l) && !hasFluxFaible(l)) raisons.push('refus')
  return raisons
}

export const isNonEligible = (l: DashboardLead) => raisonsNonEligibilite(l).length > 0
export const isEligible = (l: DashboardLead) => !isNonEligible(l)

export function periodBounds(period: DashboardPeriod, now: number) {
  const start = period === 'YTD'
    ? Date.UTC(new Date(now).getUTCFullYear(), 0, 1)
    : now - Number(period.slice(0, -1)) * DAY
  return { start, end: now, previousStart: start - (now - start) }
}

export const TRANCHES = [
  { label: '< 10M', min: 0, max: 10_000_000 },
  { label: '10M - 30M', min: 10_000_000, max: 30_000_000 },
  { label: '30M - 100M', min: 30_000_000, max: 100_000_000 },
  { label: '100M - 500M', min: 100_000_000, max: 500_000_000 },
  { label: '> 500M', min: 500_000_000, max: Infinity },
] as const

const STATUTS_BANCARISE = new Set(['Compte Ouvert', 'Bancarisé', 'Financé', 'Dossier Déposé', 'RDV'])
const STATUTS_FORMALISE = new Set(['Formalisé', 'Financé', 'Bancarisé', 'Dossier Déposé'])

// ============================================================
// BLOC 1 - KPI GENERAUX (avec commission credit 2%)
// ============================================================
export function bloc1KPIs(leads: DashboardLead[]) {
  const total = leads.length
  const eligibles = leads.filter(isEligible).length
  const nonEligibles = leads.filter(isNonEligible).length
  const deposes = leads.filter(l => l.statut === 'Dossier Déposé').length
  const finances = leads.filter(l => l.statut === 'Financé')
  const nbFinances = finances.length
  const tauxTransfo = eligibles ? nbFinances / eligibles * 100 : 0

  // CA Impact potentiel = somme des potentiels des 4 categories x prix
  const pasCompte = leads.filter(l => isUnbanked(l) && isNonEligible(l)).length
  const pasRccm = leads.filter(l => needsPack(l) && isNonEligible(l)).length
  const fluxFaible = leads.filter(l =>
    hasFluxFaible(l) && isNonEligible(l) && !isUnbanked(l) && !needsPack(l)
  ).length
  const refus = leads.filter(l =>
    hasRefus(l) && isNonEligible(l) && !isUnbanked(l) && !needsPack(l) && !hasFluxFaible(l)
  ).length

  const caImpactPotentiel =
    pasCompte * PRIX_OUVERTURE_COMPTE +
    pasRccm * PRIX_PACK_FORMALISATION +
    fluxFaible * PRIX_COUVEUSE_3MOIS +
    refus * PRIX_RESTRUCTURATION

  // NOUVEAU : CA Credit = 2% x somme des montants finances
  const montantTotalFinance = finances.reduce((s, l) => {
    // Priorite : montant_finance (vraie valeur bancaire), sinon montant_demande
    const m = amount(l.montant_finance) || amount(l.montant_demande)
    return s + m
  }, 0)
  const caCommissionCredit = montantTotalFinance * TAUX_COMMISSION_CREDIT

  // CA TOTAL MAYINVEST = Impact potentiel + Commission credit realisee
  const caTotal = caImpactPotentiel + caCommissionCredit

  return {
    total, eligibles, nonEligibles, deposes,
    finances: nbFinances,
    pctEligibles: total ? eligibles / total * 100 : 0,
    pctNonEligibles: total ? nonEligibles / total * 100 : 0,
    tauxTransfo,
    caImpactPotentiel,
    caCommissionCredit,
    caTotal,
    montantTotalFinance,
  }
}

// ============================================================
// BLOC 2 - ANALYSE DES NON-ELIGIBLES (inchange)
// ============================================================
export function bloc2NonEligibles(leads: DashboardLead[]) {
  const nonElig = leads.filter(isNonEligible)
  const total = nonElig.length

  const pasCompte = nonElig.filter(isUnbanked)
  const pasRccm = nonElig.filter(l => !isUnbanked(l) && needsPack(l))
  const fluxFaible = nonElig.filter(l => !isUnbanked(l) && !needsPack(l) && hasFluxFaible(l))
  const refus = nonElig.filter(l => !isUnbanked(l) && !needsPack(l) && !hasFluxFaible(l) && hasRefus(l))

  return [
    { key: 'pas_compte' as const, raison: 'Pas de compte bancaire', nb: pasCompte.length, pct: total ? pasCompte.length / total * 100 : 0, potentiel: pasCompte.length * PRIX_OUVERTURE_COMPTE, action: 'Proposer Ouverture Compte', prix: PRIX_OUVERTURE_COMPTE },
    { key: 'pas_rccm' as const, raison: 'Pas de RCCM', nb: pasRccm.length, pct: total ? pasRccm.length / total * 100 : 0, potentiel: pasRccm.length * PRIX_PACK_FORMALISATION, action: 'Proposer Pack Formalisation', prix: PRIX_PACK_FORMALISATION },
    { key: 'flux_faible' as const, raison: 'Flux < 1M/mois', nb: fluxFaible.length, pct: total ? fluxFaible.length / total * 100 : 0, potentiel: fluxFaible.length * PRIX_COUVEUSE_3MOIS, action: 'Mettre en couveuse 3 mois', prix: PRIX_COUVEUSE_3MOIS },
    { key: 'refus' as const, raison: 'Refus bancaire', nb: refus.length, pct: total ? refus.length / total * 100 : 0, potentiel: refus.length * PRIX_RESTRUCTURATION, action: 'Proposer Restructuration', prix: PRIX_RESTRUCTURATION },
  ]
}

// ============================================================
// BLOC 3 - IMPACT MAYINVEST (inchange)
// ============================================================
export function bloc3Impact(leads: DashboardLead[], now: number) {
  const pasCompte = leads.filter(isUnbanked)
  const pasRccm = leads.filter(needsPack)
  const pctBancariseAvant = leads.length ? (leads.length - pasCompte.length) / leads.length * 100 : 0
  const pctRccmAvant = leads.length ? (leads.length - pasRccm.length) / leads.length * 100 : 0

  const matures = leads.filter(l => now - Date.parse(l.created_at) >= MOIS_3)
  if (matures.length < 5) {
    return {
      enough: false,
      pctBancariseAvant, pctRccmAvant,
      pctBancariseApres: 0, pctRccmApres: 0,
      deltaBancarise: 0, deltaRccm: 0,
      totalSansCompte: pasCompte.length,
      sansCompteParStatut: {} as Record<string, number>,
    }
  }

  const matureBancarises = matures.filter(l => STATUTS_BANCARISE.has(l.statut)).length
  const matureFormalises = matures.filter(l => STATUTS_FORMALISE.has(l.statut)).length
  const pctBancariseApres = matures.length ? matureBancarises / matures.length * 100 : 0
  const pctRccmApres = matures.length ? matureFormalises / matures.length * 100 : 0

  const sansCompteParStatut: Record<string, number> = {}
  for (const l of pasCompte) {
    sansCompteParStatut[l.statut] = (sansCompteParStatut[l.statut] || 0) + 1
  }

  return {
    enough: true,
    pctBancariseAvant, pctBancariseApres,
    deltaBancarise: pctBancariseApres - pctBancariseAvant,
    pctRccmAvant, pctRccmApres,
    deltaRccm: pctRccmApres - pctRccmAvant,
    totalSansCompte: pasCompte.length,
    sansCompteParStatut,
  }
}

// ============================================================
// BLOC 4 - PERFORMANCE PAR SEGMENT (inchange)
// ============================================================
export function bloc4Segments(leads: DashboardLead[]) {
  const bySecteur: Record<string, { total: number; eligibles: number }> = {}
  for (const l of leads) {
    const s = l.activite || 'Non renseigné'
    if (!bySecteur[s]) bySecteur[s] = { total: 0, eligibles: 0 }
    bySecteur[s].total++
    if (isEligible(l)) bySecteur[s].eligibles++
  }
  const secteurs = Object.entries(bySecteur).map(([k, v]) => ({
    label: k, total: v.total, eligibles: v.eligibles,
    pct: v.total ? v.eligibles / v.total * 100 : 0,
  })).sort((a, b) => b.pct - a.pct)

  const tranches = TRANCHES.map(t => {
    const leadsDuTranche = leads.filter(l => {
      const m = amount(l.montant_demande)
      return m >= t.min && m < t.max
    })
    const finances = leadsDuTranche.filter(l => l.statut === 'Financé').length
    return {
      label: t.label, total: leadsDuTranche.length, finances,
      tauxTransfo: leadsDuTranche.length ? finances / leadsDuTranche.length * 100 : 0,
    }
  })

  const byBanque: Record<string, { total: number; acceptes: number }> = {}
  for (const l of leads) {
    if (!l.banque_actuelle || isUnbanked(l)) continue
    const b = String(l.banque_actuelle).trim()
    if (!byBanque[b]) byBanque[b] = { total: 0, acceptes: 0 }
    byBanque[b].total++
    if (l.statut === 'Financé') byBanque[b].acceptes++
  }
  const banques = Object.entries(byBanque).map(([k, v]) => ({
    label: k, total: v.total, acceptes: v.acceptes,
    taux: v.total ? v.acceptes / v.total * 100 : 0,
  })).sort((a, b) => b.taux - a.taux)

  return { secteurs, tranches, banques }
}

// ============================================================
// Agregateur principal
// ============================================================
export function dashboardMetrics(leads: DashboardLead[], period: DashboardPeriod, now: number) {
  const { start, end, previousStart } = periodBounds(period, now)
  const current = leads.filter(l =>
    Date.parse(l.created_at) >= start && Date.parse(l.created_at) <= end
  )
  return {
    bloc1: bloc1KPIs(current),
    bloc2: bloc2NonEligibles(current),
    bloc3: bloc3Impact(current, now),
    bloc4: bloc4Segments(current),
    period, start, end, previousStart, current,
  }
}

export function matchesPriority(lead: DashboardLead, filter: PriorityFilter, now: number): boolean {
  const created = Date.parse(lead.created_at)
  if (filter === 'ready') return (lead.score ?? 0) >= 80 && lead.statut === 'Nouveau' && created < now - 2 * DAY
  if (filter === 'impact') return isUnbanked(lead) && lead.statut === 'Nouveau' && created >= now - 7 * DAY && created <= now
  if (filter === 'followup') return lead.statut === 'RDV' && Date.parse(lead.updated_at || lead.created_at) < now - 7 * DAY
  return true
}

export function opportunity(lead: DashboardLead): 'Crédit' | 'Impact' | 'Crédit + Impact' | null {
  const nonElig = isNonEligible(lead)
  if (nonElig) {
    return amount(lead.montant_demande) >= 5_000_000 ? 'Crédit + Impact' : 'Impact'
  }
  return 'Crédit'
}
