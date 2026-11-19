// ============================================================
// Mayinvest - Bloc 1 KPI mis à jour avec Commission 2%
// Fichier: src/routes/admin.tsx
//
// INSTRUCTIONS :
// Dans src/routes/admin.tsx, cherche la fonction `Bloc1KPI(`
// et REMPLACE-la entièrement par ce code ci-dessous.
// ============================================================

function Bloc1KPI({ data }: { data: ReturnType<typeof import('@/lib/admin-dashboard').bloc1KPIs> }) {
  const nb = (n: number) => new Intl.NumberFormat('fr-FR').format(n)
  const cards = [
    { icon: '👥', label: 'Total Leads', value: nb(data.total), detail: 'Sur la période' },
    { icon: '✅', label: 'Éligibles Banque', value: nb(data.eligibles), detail: pct(data.pctEligibles), tone: 'positive' },
    { icon: '⚠️', label: 'Non Éligibles', value: nb(data.nonEligibles), detail: pct(data.pctNonEligibles), tone: 'warning' },
    { icon: '📄', label: 'Dossiers Déposés', value: nb(data.deposes), detail: 'Statut Dossier Déposé' },
    {
      icon: '🏦',
      label: 'Financés + Comm. 2%',
      value: nb(data.finances),
      detail: `${xaf(data.caCommissionCredit)} · Taux : ${pct(data.tauxTransfo)}`,
      tone: 'positive'
    },
    {
      icon: '💰',
      label: 'CA Total Mayinvest',
      value: xaf(data.caTotal),
      detail: `Impact : ${xaf(data.caImpactPotentiel)} · Crédit : ${xaf(data.caCommissionCredit)}`,
      tone: 'positive'
    },
  ]
  return (
    <section className="sd-pole bloc1">
      <h2>📊 BLOC 1 · KPI GÉNÉRAUX <span>· Impact + Commission 2% sur crédits</span></h2>
      <div className="sd-grid-6">
        {cards.map(c => (
          <article key={c.label} className="sd-kpi">
            <span className="sd-kpi-icon" aria-hidden="true">{c.icon}</span>
            <h3>{c.label}</h3>
            <strong>{c.value}</strong>
            <p className={c.tone || ''}>{c.detail}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
