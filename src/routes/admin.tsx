// ============================================================
// Mayinvest PréSelect - DashboardView v2 (4 blocs)
// Fichier: src/routes/admin.tsx
//
// INSTRUCTIONS DE COLLAGE:
// 1. Dans src/routes/admin.tsx, trouve la ligne qui commence par:
//    "function DashboardView("
// 2. Trouve la ligne juste AVANT "function CRMView("
// 3. Remplace TOUT ce qui se trouve entre les 2 (l'ancien DashboardView + sous-composants)
//    par le contenu ci-dessous.
// ============================================================

function DashboardView({ onOpen }: { onOpen: (lead: DashboardLead) => void }) {
  const [period, setPeriod] = useState<DashboardPeriod>('30j')
  const [now] = useState(() => Date.now())
  return (
    <section className="strategic-dashboard">
      <header className="sd-header">
        <div>
          <h1>Dashboard stratégique</h1>
          <p>Pilotage commercial et impact · Cahier des charges Mayinvest</p>
        </div>
        <div className="sd-period" role="group" aria-label="Période">
          {(['7j', '30j', '90j', 'YTD'] as const).map(p => (
            <Button key={p} variant="ghost" aria-pressed={p === period} onClick={() => setPeriod(p)}>
              {p}
            </Button>
          ))}
        </div>
      </header>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent period={period} now={now} onOpen={onOpen} />
      </Suspense>
    </section>
  )
}

function DashboardSkeleton() {
  return (
    <div className="sd-grid-6" aria-label="Chargement du dashboard" role="status">
      {Array.from({ length: 6 }, (_, i) => <div className="sd-skeleton" key={i} />)}
    </div>
  )
}

function DashboardContent({
  period, now, onOpen,
}: {
  period: DashboardPeriod
  now: number
  onOpen: (lead: DashboardLead) => void
}) {
  const navigate = useNavigate()
  const bounds = periodBounds(period, now)
  const { data: rows } = useSuspenseQuery({
    queryKey: ['admin-strategic-dashboard-v2', period, now],
    queryFn: async () => {
      const { data, error } = await supabase.from('leads').select('*')
        .gte('created_at', new Date(bounds.previousStart).toISOString())
        .lte('created_at', new Date(bounds.end).toISOString())
        .order('created_at', { ascending: false })
        .limit(10000)
      if (error) throw new Error("Impossible de charger les dossiers.")
      return (data ?? []) as DashboardLead[]
    },
    staleTime: 60000,
  })
  const m = useMemo(() => dashboardMetrics(rows, period, now), [rows, period, now])

  if (m.current.length === 0) {
    return <div className="sd-empty">Aucun lead sur la période sélectionnée</div>
  }

  return (
    <>
      <Bloc1KPI data={m.bloc1} />
      <Bloc2NonEligibles
        data={m.bloc2}
        onAction={(key) => navigate({ to: '/admin', search: { view: 'crm', reason: key } })}
      />
      <Bloc3Impact data={m.bloc3} onShowList={() => navigate({ to: '/admin', search: { view: 'crm', reason: 'pas_compte' } })} />
      <Bloc4Segments data={m.bloc4} />
    </>
  )
}

// ============================================================
// BLOC 1 - KPI GENERAUX
// ============================================================
function Bloc1KPI({ data }: { data: ReturnType<typeof import('@/lib/admin-dashboard').bloc1KPIs> }) {
  const nb = (n: number) => new Intl.NumberFormat('fr-FR').format(n)
  const cards = [
    { icon: '👥', label: 'Total Leads', value: nb(data.total), detail: 'Sur la période' },
    { icon: '✅', label: 'Éligibles Banque', value: nb(data.eligibles), detail: pct(data.pctEligibles), tone: 'positive' },
    { icon: '⚠️', label: 'Non Éligibles', value: nb(data.nonEligibles), detail: pct(data.pctNonEligibles), tone: 'warning' },
    { icon: '📄', label: 'Dossiers Déposés Banque', value: nb(data.deposes), detail: 'Statut Dossier Déposé' },
    { icon: '🏦', label: 'Dossiers Financés', value: nb(data.finances), detail: 'Taux Transfo : ' + pct(data.tauxTransfo) },
    { icon: '💰', label: 'CA Généré Mayinvest', value: xaf(data.caGenere), detail: 'Potentiel 4 catégories', tone: 'positive' },
  ]
  return (
    <section className="sd-pole bloc1">
      <h2>📊 BLOC 1 · KPI GÉNÉRAUX <span>· Cartes en haut du dashboard</span></h2>
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

// ============================================================
// BLOC 2 - ANALYSE DES NON-ELIGIBLES
// ============================================================
function Bloc2NonEligibles({
  data, onAction,
}: {
  data: ReturnType<typeof import('@/lib/admin-dashboard').bloc2NonEligibles>
  onAction: (key: 'pas_compte' | 'pas_rccm' | 'flux_faible' | 'refus') => void
}) {
  const total = data.reduce((s, r) => s + r.nb, 0)
  const totalCA = data.reduce((s, r) => s + r.potentiel, 0)
  return (
    <section className="sd-pole bloc2">
      <h2>💰 BLOC 2 · ANALYSE DES NON-ÉLIGIBLES · TON OR <span>· C'est ici que tu monétises le Pack Formalisation</span></h2>
      <div className="sd-table-wrap">
        <table className="sd-table-noneligibles">
          <thead>
            <tr>
              <th>Raison de Non-Éligibilité</th>
              <th className="num">Nb de Leads</th>
              <th className="num">%</th>
              <th className="num">Potentiel CA Pack</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.key}>
                <td><strong>{row.raison}</strong></td>
                <td className="num">{row.nb}</td>
                <td className="num">{pct(row.pct)}</td>
                <td className="num">{xaf(row.potentiel)}</td>
                <td>
                  <Button variant="outline" size="sm" onClick={() => onAction(row.key)}>
                    {row.action} <ArrowUpRight size={14} />
                  </Button>
                </td>
              </tr>
            ))}
            <tr className="total">
              <td><strong>TOTAL</strong></td>
              <td className="num"><strong>{total}</strong></td>
              <td className="num">100 %</td>
              <td className="num"><strong>{xaf(totalCA)}</strong></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="sd-hint">
        <em>Le système calcule auto : Si Pack Formalisation = 50 000 XAF alors Potentiel = Nb × 50 000</em>
      </p>
    </section>
  )
}

// ============================================================
// BLOC 3 - IMPACT MAYINVEST (bancarisation)
// ============================================================
function Bloc3Impact({
  data, onShowList,
}: {
  data: ReturnType<typeof import('@/lib/admin-dashboard').bloc3Impact>
  onShowList: () => void
}) {
  const nb = (n: number) => new Intl.NumberFormat('fr-FR').format(n)
  return (
    <section className="sd-pole bloc3">
      <h2>🎯 BLOC 3 · IMPACT MAYINVEST <span>· Performance de Bancarisation</span></h2>
      <p className="sd-subtitle">Le but : Prouver que tu crées des clients bancables</p>
      <div className="sd-impact-grid">
        <article className="sd-impact-chart">
          <h3>Bancarisés</h3>
          <div className="sd-bars">
            <div className="sd-bar-row">
              <span className="sd-bar-label">AVANT</span>
              <div className="sd-bar-wrap"><div className="sd-bar before" style={{ width: Math.min(100, data.pctBancariseAvant) + '%' }} /></div>
              <strong>{pct(data.pctBancariseAvant)}</strong>
            </div>
            <div className="sd-bar-row">
              <span className="sd-bar-label">APRÈS 3 MOIS</span>
              <div className="sd-bar-wrap"><div className="sd-bar after" style={{ width: Math.min(100, data.pctBancariseApres) + '%' }} /></div>
              <strong>{pct(data.pctBancariseApres)}</strong>
            </div>
          </div>
          <p className={data.deltaBancarise >= 0 ? 'sd-delta positive' : 'sd-delta negative'}>
            {data.deltaBancarise >= 0 ? '+' : ''}{data.deltaBancarise.toFixed(0)} pts
          </p>
        </article>
        <article className="sd-impact-chart">
          <h3>Avec RCCM</h3>
          <div className="sd-bars">
            <div className="sd-bar-row">
              <span className="sd-bar-label">AVANT</span>
              <div className="sd-bar-wrap"><div className="sd-bar before" style={{ width: Math.min(100, data.pctRccmAvant) + '%' }} /></div>
              <strong>{pct(data.pctRccmAvant)}</strong>
            </div>
            <div className="sd-bar-row">
              <span className="sd-bar-label">APRÈS 3 MOIS</span>
              <div className="sd-bar-wrap"><div className="sd-bar after" style={{ width: Math.min(100, data.pctRccmApres) + '%' }} /></div>
              <strong>{pct(data.pctRccmApres)}</strong>
            </div>
          </div>
          <p className={data.deltaRccm >= 0 ? 'sd-delta positive' : 'sd-delta negative'}>
            {data.deltaRccm >= 0 ? '+' : ''}{data.deltaRccm.toFixed(0)} pts
          </p>
        </article>
        <article className="sd-impact-detail">
          <h3>Détail : {nb(data.totalSansCompte)} "Sans Compte" détectés</h3>
          <ul className="sd-statut-list">
            {['Contacté', 'RDV', 'Compte Ouvert', 'Bancarisé', 'Financé'].map(s => (
              <li key={s}>
                <span>{s}</span>
                <strong>{data.sansCompteParStatut[s] || 0}</strong>
              </li>
            ))}
          </ul>
          <Button variant="outline" size="sm" onClick={onShowList}>
            Voir la liste complète <ArrowUpRight size={14} />
          </Button>
          {!data.enough && (
            <p className="sd-note">
              <em>Données complètes disponibles après 3 mois d'activité</em>
            </p>
          )}
        </article>
      </div>
    </section>
  )
}

// ============================================================
// BLOC 4 - PERFORMANCE PAR SEGMENT
// ============================================================
function Bloc4Segments({
  data,
}: {
  data: ReturnType<typeof import('@/lib/admin-dashboard').bloc4Segments>
}) {
  const nb = (n: number) => new Intl.NumberFormat('fr-FR').format(n)
  return (
    <section className="sd-pole bloc4">
      <h2>🎯 BLOC 4 · PERFORMANCE PAR SEGMENT <span>· Pour savoir où attaquer</span></h2>
      <div className="sd-segment-grid">
        <article className="sd-segment-card">
          <h3>Par Secteur</h3>
          <table className="sd-segment-table">
            <thead><tr><th>Secteur</th><th className="num">Total</th><th className="num">Élig.</th><th className="num">% Élig.</th></tr></thead>
            <tbody>
              {data.secteurs.slice(0, 8).map(s => (
                <tr key={s.label}>
                  <td>{s.label}</td>
                  <td className="num">{nb(s.total)}</td>
                  <td className="num">{nb(s.eligibles)}</td>
                  <td className="num"><strong>{pct(s.pct)}</strong></td>
                </tr>
              ))}
              {data.secteurs.length === 0 && <tr><td colSpan={4} className="sd-empty-row">Aucune donnée</td></tr>}
            </tbody>
          </table>
        </article>
        <article className="sd-segment-card">
          <h3>Par Tranche de Montant</h3>
          <table className="sd-segment-table">
            <thead><tr><th>Tranche</th><th className="num">Total</th><th className="num">Financ.</th><th className="num">Taux</th></tr></thead>
            <tbody>
              {data.tranches.map(t => (
                <tr key={t.label}>
                  <td>{t.label}</td>
                  <td className="num">{nb(t.total)}</td>
                  <td className="num">{nb(t.finances)}</td>
                  <td className="num"><strong>{pct(t.tauxTransfo)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
        <article className="sd-segment-card">
          <h3>Par Banque</h3>
          <table className="sd-segment-table">
            <thead><tr><th>Banque</th><th className="num">Demandes</th><th className="num">Accept.</th><th className="num">Taux</th></tr></thead>
            <tbody>
              {data.banques.slice(0, 8).map(b => (
                <tr key={b.label}>
                  <td>{b.label}</td>
                  <td className="num">{nb(b.total)}</td>
                  <td className="num">{nb(b.acceptes)}</td>
                  <td className="num"><strong>{pct(b.taux)}</strong></td>
                </tr>
              ))}
              {data.banques.length === 0 && <tr><td colSpan={4} className="sd-empty-row">Aucune donnée</td></tr>}
            </tbody>
          </table>
        </article>
      </div>
    </section>
  )
}
