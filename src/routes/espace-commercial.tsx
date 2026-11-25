import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import SkeletonPage from '@/components/SkeletonPage'
import { Logo } from '@/components/Logo'

export const Route = createFileRoute('/espace-commercial')({
  component: EspaceCommercialPage,
})

const MI = {
  blue: '#1A6BFF', blueDark: '#0051D4', blueSoft: '#EEF4FF',
  navy: '#0D1B3E', green: '#22C55E', greenSoft: '#D1FAE5',
  red: '#DC2626', redSoft: '#FEE2E2', gold: '#F59E0B', goldSoft: '#FEF3C7',
  violet: '#7C3AED', violetSoft: '#EDE9FE',
  grayBg: '#F7F8FA', grayBorder: '#F0F0F0', grayHair: '#F3F4F6',
  text: '#111', textMuted: '#6B7280', textFaint: '#9CA3AF',
}

type Session = { id: string; nom: string; prenom: string; email: string; telephone: string; ville: string; status: string; activated_at: string | null; ref_code?: string }
type Stats = { total_leads: number; leads_actifs: number; dossiers_finances: number; gains_total_xaf: number; gains_mois_xaf: number; classement: number }
type Lead = any

const SITE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://preselect.mayinvest.cg'
const xaf = (n: number) => new Intl.NumberFormat('fr-FR').format(n) + ' XAF'

function EspaceCommercialPage() {
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ identifiant: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'dashboard' | 'leads' | 'outils' | 'chat'>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [unreadChat, setUnreadChat] = useState(0)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [newLeadOpen, setNewLeadOpen] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem('mi_commercial_session')
    if (raw) { try { setSession(JSON.parse(raw)) } catch {} }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (session && session.status === 'valide') {
      loadStats()
      loadLeads()
      loadUnreadChat()
      // Realtime subscription chat
      const chan = supabase.channel(`chat-${session.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'commercial_chats', filter: `commercial_id=eq.${session.id}` },
          () => { loadUnreadChat() })
        .subscribe()
      return () => { supabase.removeChannel(chan) }
    }
    return undefined
  }, [session])

  async function loadUnreadChat() {
    if (!session) return
    const { count } = await supabase.from('commercial_chats').select('id', { count: 'exact', head: true })
      .eq('commercial_id', session.id).eq('sender_type', 'director').is('read_at', null)
    setUnreadChat(count || 0)
  }

  async function loadStats() {
    if (!session) return
    const { data } = await supabase.rpc('get_commercial_stats', { p_commercial_id: session.id })
    if (data) setStats(data as Stats)
  }
  async function loadLeads() {
    if (!session) return
    const { data } = await supabase.rpc('get_commercial_leads', { p_commercial_id: session.id })
    if (data) setLeads(data as Lead[])
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.identifiant || !form.password) { setError('Entre ton email/téléphone et ton mot de passe.'); return }
    setLoginLoading(true)
    const { data, error: rpcErr } = await supabase.rpc('connecter_commercial', {
      p_identifiant: form.identifiant, p_password: form.password,
    })
    setLoginLoading(false)
    if (rpcErr) { setError(rpcErr.message || 'Identifiants incorrects.'); return }
    if (data) {
      // Recharger pour avoir le ref_code (pas dans le RPC de connexion)
      const { data: full } = await supabase.from('commercial_candidates').select('*').eq('id', (data as any).id).single()
      const sess = { ...(data as any), ref_code: full?.ref_code }
      localStorage.setItem('mi_commercial_session', JSON.stringify(sess))
      setSession(sess as Session)
    }
  }

  function logout() {
    localStorage.removeItem('mi_commercial_session')
    setSession(null)
    setForm({ identifiant: '', password: '' })
    setTab('dashboard')
  }

  function resumeFormation() {
    if (!session) return
    localStorage.setItem('mi_candidate_id', session.id)
    localStorage.setItem('mi_candidate_name', session.prenom)
    if (session.status === 'formation') navigate({ to: '/formation' as any })
    else if (session.status === 'simulation_theo') navigate({ to: '/simulation' as any })
    else if (session.status === 'simulation_prat') navigate({ to: '/simulation-pratique' as any })
  }

  if (loading) return <SkeletonPage label="Chargement de ton espace…" />

  const refLink = session?.ref_code ? `${SITE_URL}/preselection?ref=${session.ref_code}` : ''

  return (
    <div style={{ minHeight: '100vh', background: MI.grayBg, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: MI.text }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
      <GlobalStyles/>

      {!session ? (
        // ========== LOGIN ==========
        <>
          <header className="ec-header">
            <Link to="/"><Logo height={56} tone="light"/></Link>
            <Link to="/" className="ec-nav-link muted">← Retour à l'accueil</Link>
          </header>
          <div className="login-wrap">
            <div className="login-card">
              <span className="login-pill">Espace commercial</span>
              <h1>Bon retour parmi nous.</h1>
              <p className="sub">Connecte-toi avec ton email ou ton téléphone pour accéder à ton espace.</p>
              {error && <div className="form-err">{error}</div>}
              <form onSubmit={handleLogin}>
                <div className="field">
                  <label>Email ou téléphone</label>
                  <input type="text" placeholder="toi@exemple.com ou 06 xx xx xx xx" value={form.identifiant} onChange={e => setForm({ ...form, identifiant: e.target.value })} autoComplete="username"/>
                </div>
                <div className="field">
                  <label>Mot de passe</label>
                  <div className="pwd-wrap">
                    <input type={showPwd ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} autoComplete="current-password" style={{ paddingRight: 44 }}/>
                    <button type="button" className="pwd-toggle" onClick={() => setShowPwd(!showPwd)} aria-label={showPwd ? 'Masquer' : 'Afficher'}>
                      {showPwd ? <EyeOff/> : <Eye/>}
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn-login" disabled={loginLoading}>
                  {loginLoading ? 'Connexion…' : 'Se connecter →'}
                </button>
              </form>
              <div className="login-footer">
                Pas encore inscrit ? <Link to={'/rejoindre-equipe' as any}>Rejoindre l'équipe</Link>
              </div>
            </div>
          </div>
        </>
      ) : session.status !== 'valide' ? (
        // ========== DASHBOARD PRÉ-VALIDATION ==========
        <>
          <header className="ec-header">
            <Link to="/"><Logo height={56} tone="light"/></Link>
            <button className="btn-logout" onClick={logout}>Déconnexion</button>
          </header>
          <div className="pre-wrap">
            <div className="welcome-card">
              <span className="welcome-badge"><span className="dot"/>Connecté</span>
              <h2>Bonjour {session.prenom} 👋</h2>
              <p>Voici où tu en es dans ton parcours Mayinvest.</p>
            </div>
            {session.status === 'formation' && (
              <StatusCard icon="inprogress" title="Formation en cours" subtitle="3 modules à compléter" body="Tu dois terminer les 3 modules de formation pour accéder à la simulation. Compte environ 1h30." cta="Reprendre la formation" onCta={resumeFormation}/>
            )}
            {(session.status === 'simulation_theo' || session.status === 'simulation_prat') && (
              <StatusCard icon="inprogress" title="Simulation en cours" subtitle="Évaluation de ta candidature" body="Continue la simulation pour valider ta candidature. Compte environ 30 min." cta="Reprendre la simulation" onCta={resumeFormation}/>
            )}
            {session.status === 'en_attente_validation' && (
              <StatusCard icon="pending" title="En attente de validation" subtitle="L'équipe Mayinvest examine ta candidature" body="Tu as terminé ta formation et ta simulation. L'équipe Mayinvest revient vers toi sous 24h par email avec sa décision."/>
            )}
            {session.status === 'refuse' && (
              <StatusCard icon="refuse" title="Candidature non retenue" subtitle="Pour cette fois" body="Tu peux repostuler dans 90 jours. En attendant, perfectionne-toi et reviens plus fort."/>
            )}
          </div>
        </>
      ) : (
        // ========== WORKSPACE COMMERCIAL VALIDÉ ==========
        <div className="workspace">
          {sidebarOpen && <div className="sidebar-ovr" onClick={() => setSidebarOpen(false)}/>}
          <aside className={`ws-sidebar ${sidebarOpen ? 'open' : ''}`}>
            <div className="ws-logo">
              <Link to="/"><Logo height={48} tone="light"/></Link>
            </div>
            <nav className="ws-nav">
              <NavItem icon={<IconGrid/>} label="Dashboard" active={tab === 'dashboard'} onClick={() => { setTab('dashboard'); setSidebarOpen(false) }}/>
              <NavItem icon={<IconUsers/>} label="Mes Leads" count={stats?.leads_actifs} active={tab === 'leads'} onClick={() => { setTab('leads'); setSidebarOpen(false) }}/>
              <NavItem icon={<IconLink/>} label="Outils" active={tab === 'outils'} onClick={() => { setTab('outils'); setSidebarOpen(false) }}/>
              <NavItem icon={<IconChat/>} label="Chat Mayinvest" count={unreadChat} active={tab === 'chat'} onClick={() => { setTab('chat'); setSidebarOpen(false) }}/>
            </nav>
            <div className="ws-sidebar-footer">
              <div className="ws-user">
                <div className="ws-avatar">{session.prenom[0]}{session.nom[0]}</div>
                <div>
                  <div className="ws-user-name">{session.prenom} {session.nom}</div>
                  <div className="ws-user-city">{session.ville}</div>
                </div>
              </div>
              <button className="btn-logout-sm" onClick={logout}>Se déconnecter</button>
            </div>
          </aside>

          <main className="ws-main">
            <header className="ws-topbar">
              <button className="ws-burger" onClick={() => setSidebarOpen(true)} aria-label="Menu">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round"/></svg>
              </button>
              <h1 className="ws-page-title">
                {tab === 'dashboard' && 'Dashboard'}
                {tab === 'leads' && 'Mes Leads'}
                {tab === 'outils' && 'Mes Outils'}
                {tab === 'chat' && 'Chat avec Mayinvest'}
              </h1>
            </header>

            <div className="ws-content">
              {tab === 'dashboard' && <DashboardTab session={session} stats={stats} leads={leads} onOpenLead={setSelectedLead}/>}
              {tab === 'leads' && <LeadsTab leads={leads} onReload={loadLeads} onOpenLead={setSelectedLead} onNewLead={() => setNewLeadOpen(true)}/>}
              {tab === 'outils' && <OutilsTab refCode={session.ref_code} refLink={refLink} session={session}/>}
              {tab === 'chat' && <ChatTab commercialId={session.id} onRead={loadUnreadChat}/>}
            </div>
          </main>

          {selectedLead && (
            <LeadDrawer
              lead={selectedLead}
              commercialId={session.id}
              onClose={() => setSelectedLead(null)}
              onUpdated={() => { loadLeads(); loadStats() }}
            />
          )}
          {newLeadOpen && (
            <NewLeadModal
              commercialId={session.id}
              onClose={() => setNewLeadOpen(false)}
              onCreated={() => { setNewLeadOpen(false); loadLeads(); loadStats() }}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ============ COMPONENTS ============

function NavItem({ icon, label, count, active, onClick }: { icon: React.ReactNode; label: string; count?: number | undefined; active: boolean; onClick: () => void }) {
  return (
    <button className={`ws-nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="ws-nav-icon">{icon}</span>
      <span className="ws-nav-lbl">{label}</span>
      {typeof count === 'number' && count > 0 && <span className="ws-nav-badge">{count}</span>}
    </button>
  )
}

function StatusCard({ icon, title, subtitle, body, cta, onCta }: { icon: 'inprogress' | 'pending' | 'refuse'; title: string; subtitle: string; body: string; cta?: string; onCta?: () => void }) {
  return (
    <div className="status-card">
      <div className="status-head">
        <div className={`status-ic ${icon}`}>
          {icon === 'inprogress' && <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>}
          {icon === 'pending' && <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
          {icon === 'refuse' && <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
        </div>
        <div><h3>{title}</h3><p>{subtitle}</p></div>
      </div>
      <div className="status-body">{body}</div>
      {cta && <button className="btn-resume" onClick={onCta}>{cta} →</button>}
    </div>
  )
}

// ============ DASHBOARD TAB ============
function DashboardTab({ session, stats, leads, onOpenLead }: { session: Session; stats: Stats | null; leads: Lead[]; onOpenLead: (l: Lead) => void }) {
  const recentLeads = leads.slice(0, 5)
  return (
    <>
      <div className="hero-strip">
        <div>
          <div className="hero-tag"><span className="dot"/>Commercial validé · {session.ville}</div>
          <h2>Salut {session.prenom} 👋</h2>
          <p>Voici tes résultats en temps réel.</p>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard tone="primary" label="Gains ce mois" value={stats ? xaf(stats.gains_mois_xaf) : '—'} sub={stats ? `${xaf(stats.gains_total_xaf)} au total` : ''}/>
        <KpiCard label="Leads actifs" value={stats?.leads_actifs ?? 0} sub={stats ? `${stats.total_leads} au total` : ''}/>
        <KpiCard label="Dossiers financés" value={stats?.dossiers_finances ?? 0} sub="50 000 XAF chacun"/>
        <KpiCard label="Classement mois" value={stats?.classement ? `#${stats.classement}` : '—'} sub="Parmi les commerciaux actifs"/>
      </div>

      <div className="section-card">
        <div className="section-head">
          <h3>Derniers leads</h3>
          <span className="section-sub">{leads.length} au total</span>
        </div>
        {recentLeads.length === 0 ? (
          <div className="empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <p>Aucun lead pour l'instant. Partage ton lien unique pour en recevoir !</p>
          </div>
        ) : (
          <div className="leads-mini">
            {recentLeads.map(l => (
              <div key={l.id} className="lead-mini" onClick={() => onOpenLead(l)} style={{ cursor: 'pointer' }}>
                <div className="lead-mini-name">{l.identite?.prenom || l.identite?.raison_sociale || 'Lead'} {l.identite?.nom || ''}</div>
                <div className="lead-mini-meta">{l.type === 'physique' ? 'Particulier' : 'PME'} · {l.activite} · {l.statut}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function KpiCard({ tone, label, value, sub }: { tone?: 'primary'; label: string; value: any; sub?: string }) {
  return (
    <div className={`kpi ${tone === 'primary' ? 'primary' : ''}`}>
      <div className="kpi-lbl">{label}</div>
      <div className="kpi-val">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}

// ============ LEADS TAB ============
function LeadsTab({ leads, onReload, onOpenLead, onNewLead }: { leads: Lead[]; onReload: () => void; onOpenLead: (l: Lead) => void; onNewLead: () => void }) {
  if (leads.length === 0) {
    return (
      <>
        <div className="empty-full">
          <div className="empty-ic"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg></div>
          <h3>Aucun lead pour l'instant</h3>
          <p>Dès qu'un prospect remplit le formulaire via ton lien unique, il apparaît ici. Tu peux aussi en créer un à la main si un prospect t'appelle.</p>
          <button className="btn-primary-sm" onClick={onNewLead} style={{ marginTop: 20 }}>+ Créer un lead à la main</button>
        </div>
      </>
    )
  }
  return (
    <div className="section-card">
      <div className="section-head">
        <h3>Tous tes leads</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-reload" onClick={onReload}>↻ Actualiser</button>
          <button className="btn-primary-sm" onClick={onNewLead}>+ Nouveau lead</button>
        </div>
      </div>
      <div className="leads-table">
        <div className="lt-head">
          <span>Nom</span><span>Type · Activité</span><span>Score</span><span>Statut</span><span className="r">Montant</span><span className="r">Date</span>
        </div>
        {leads.map(l => (
          <div key={l.id} className="lt-row" onClick={() => onOpenLead(l)} style={{ cursor: 'pointer' }}>
            <span className="lt-name">{l.identite?.prenom || l.identite?.raison_sociale || 'Lead'} {l.identite?.nom || ''}</span>
            <span className="lt-meta">{l.type === 'physique' ? 'Part.' : 'PME'} · {l.activite}</span>
            <span className="lt-score">{l.score || '—'}<small>/100</small></span>
            <span className="lt-statut">{l.statut}</span>
            <span className="r lt-amt">{l.montant_demande ? xaf(l.montant_demande) : '—'}</span>
            <span className="r lt-date">{new Date(l.created_at).toLocaleDateString('fr-FR')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============ LEAD DRAWER ============
const STATUTS_DISPO = ['Nouveau', 'Contacté', 'RDV', 'Éligible', 'Non Éligible', 'Dossier Déposé', 'Financé', 'Perdu']

function LeadDrawer({ lead, commercialId, onClose, onUpdated }: { lead: Lead; commercialId: string; onClose: () => void; onUpdated: () => void }) {
  const [statut, setStatut] = useState(lead.statut)
  const [saving, setSaving] = useState(false)
  async function changeStatut(newS: string) {
    setSaving(true)
    const { error } = await supabase.rpc('commercial_update_lead_status', {
      p_commercial_id: commercialId, p_lead_id: lead.id, p_statut: newS,
    })
    setSaving(false)
    if (!error) { setStatut(newS); onUpdated() }
  }
  const nom = lead.type === 'physique'
    ? `${lead.identite?.prenom || ''} ${lead.identite?.nom || ''}`.trim()
    : (lead.identite?.raison_sociale || lead.situation?.raison_sociale || '—')
  const tel = lead.identite?.telephone || lead.identite?.tel || ''
  const email = lead.identite?.email || ''
  return (
    <div className="drawer-ovr" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <button className="drawer-close" onClick={onClose} aria-label="Fermer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
        <div className="drawer-body">
          <h2 className="drawer-title">{nom}</h2>
          <div className="drawer-sub">{lead.type === 'physique' ? 'Particulier' : 'PME'} · {lead.activite} · {lead.identite?.ville || ''}</div>

          <div className="drawer-row">
            <div className="drawer-chip">Score {lead.score || '—'}/100</div>
            <select className="drawer-statut" value={statut} onChange={e => changeStatut(e.target.value)} disabled={saving}>
              {STATUTS_DISPO.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="drawer-sec">
            <div className="drawer-sec-title">Contact</div>
            <div className="info-row"><span>Téléphone</span><b>{tel || '—'}</b></div>
            <div className="info-row"><span>Email</span><b>{email || '—'}</b></div>
            <div className="drawer-actions-row">
              {tel && <a href={`tel:${tel}`} className="btn-mini">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                Appeler
              </a>}
              <button className="btn-mini" onClick={() => alert('La messagerie avec les prospects sera disponible dans la prochaine vague.')} style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                Messagerie
              </button>
            </div>
          </div>

          <div className="drawer-sec">
            <div className="drawer-sec-title">Besoin</div>
            <div className="info-row"><span>Montant demandé</span><b>{lead.montant_demande ? xaf(lead.montant_demande) : '—'}</b></div>
            <div className="info-row"><span>Objet</span><b>{lead.besoin?.objet || '—'}</b></div>
            <div className="info-row"><span>Banque actuelle</span><b>{lead.besoin?.banque || lead.banque_actuelle || '—'}</b></div>
          </div>

          <div className="drawer-sec">
            <div className="drawer-sec-title">Métadonnées</div>
            <div className="info-row"><span>Créé le</span><b>{new Date(lead.created_at).toLocaleString('fr-FR')}</b></div>
            <div className="info-row"><span>Mis à jour</span><b>{lead.updated_at ? new Date(lead.updated_at).toLocaleString('fr-FR') : '—'}</b></div>
            <div className="info-row"><span>Code accès</span><b>{lead.access_code || '—'}</b></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============ NEW LEAD MODAL ============
const ACTIVITES_PHYSIQUE = ['Fonctionnaire', 'Salarié Privé', 'Commerçant', 'Artisan', 'Profession Libérale', 'Agriculteur', 'Autre']
const ACTIVITES_PME = ['Commerce', 'Tourisme', 'BTP', 'Industrie/Bois', 'Agriculture', 'Transport', 'Santé', 'Tech', 'Autre']

function NewLeadModal({ commercialId, onClose, onCreated }: { commercialId: string; onClose: () => void; onCreated: () => void }) {
  const [type, setType] = useState<'physique' | 'morale'>('physique')
  const [activite, setActivite] = useState('')
  const [form, setForm] = useState({ nom: '', prenom: '', raison_sociale: '', tel: '', email: '', ville: '', montant: '', objet: '', banque: '' })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    setErr('')
    const nomOk = type === 'physique' ? (form.nom && form.prenom) : form.raison_sociale
    if (!nomOk || !form.tel || !form.ville || !activite || !form.montant) {
      setErr('Remplis tous les champs obligatoires.')
      return
    }
    setLoading(true)
    const identite = type === 'physique'
      ? { nom: form.nom, prenom: form.prenom, telephone: form.tel, email: form.email, ville: form.ville }
      : { raison_sociale: form.raison_sociale, telephone: form.tel, email: form.email, ville: form.ville }
    const besoin = { objet: form.objet, banque: form.banque }
    const { error } = await supabase.rpc('commercial_create_lead', {
      p_commercial_id: commercialId, p_type: type, p_activite: activite,
      p_identite: identite, p_besoin: besoin,
      p_montant_demande: parseInt(form.montant.replace(/\D/g, '')) || 0,
    })
    setLoading(false)
    if (error) { setErr(error.message || 'Erreur lors de la création.'); return }
    onCreated()
  }

  return (
    <div className="modal-ovr" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button className="drawer-close" onClick={onClose} aria-label="Fermer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
        <h2 className="modal-title">Nouveau lead</h2>
        <p className="modal-sub">Crée un lead à la main (ex : un prospect t'a appelé).</p>

        {err && <div className="form-err">{err}</div>}

        <div className="type-switch">
          <button className={type === 'physique' ? 'active' : ''} onClick={() => setType('physique')}>Particulier</button>
          <button className={type === 'morale' ? 'active' : ''} onClick={() => setType('morale')}>PME</button>
        </div>

        <div className="field"><label>Activité <span style={{ color: MI.red }}>*</span></label>
          <select value={activite} onChange={e => setActivite(e.target.value)}>
            <option value="">— Choisir —</option>
            {(type === 'physique' ? ACTIVITES_PHYSIQUE : ACTIVITES_PME).map(a => <option key={a}>{a}</option>)}
          </select>
        </div>

        {type === 'physique' ? (
          <div className="field-grid">
            <div className="field"><label>Prénom <span style={{ color: MI.red }}>*</span></label><input value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })}/></div>
            <div className="field"><label>Nom <span style={{ color: MI.red }}>*</span></label><input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })}/></div>
          </div>
        ) : (
          <div className="field"><label>Raison sociale <span style={{ color: MI.red }}>*</span></label><input value={form.raison_sociale} onChange={e => setForm({ ...form, raison_sociale: e.target.value })}/></div>
        )}

        <div className="field-grid">
          <div className="field"><label>Téléphone <span style={{ color: MI.red }}>*</span></label><input value={form.tel} onChange={e => setForm({ ...form, tel: e.target.value })}/></div>
          <div className="field"><label>Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/></div>
        </div>
        <div className="field-grid">
          <div className="field"><label>Ville <span style={{ color: MI.red }}>*</span></label><input value={form.ville} onChange={e => setForm({ ...form, ville: e.target.value })}/></div>
          <div className="field"><label>Montant (XAF) <span style={{ color: MI.red }}>*</span></label><input value={form.montant} onChange={e => setForm({ ...form, montant: e.target.value })}/></div>
        </div>
        <div className="field-grid">
          <div className="field"><label>Objet du crédit</label><input value={form.objet} onChange={e => setForm({ ...form, objet: e.target.value })}/></div>
          <div className="field"><label>Banque actuelle</label><input value={form.banque} onChange={e => setForm({ ...form, banque: e.target.value })}/></div>
        </div>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Annuler</button>
          <button className="btn-primary-full" onClick={submit} disabled={loading}>
            {loading ? 'Création…' : 'Créer le lead →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============ OUTILS TAB ============
function OutilsTab({ refCode, refLink, session }: { refCode?: string | undefined; refLink: string; session: Session }) {
  const [copied, setCopied] = useState<string | null>(null)
  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id); setTimeout(() => setCopied(null), 2000)
    })
  }
  const scripts = [
    { k: 'intro', title: 'Message d\'introduction', body: `Bonjour, je suis ${session.prenom} de Mayinvest Conseil. On aide les Congolais à obtenir leur crédit bancaire plus vite et sans se faire renvoyer. Vous remplissez un formulaire de 2 minutes, on vous dit en 24h si votre dossier est bancable. C'est gratuit, et vous ne payez que si on obtient votre financement. Voici le lien : ${refLink}` },
    { k: 'relance', title: 'Message de relance (après 48h sans réponse)', body: `Bonjour, je reviens vers vous pour votre projet de financement. 2 banques partenaires m'ont confirmé pouvoir traiter votre dossier cette semaine si on le dépose avant vendredi. Vous êtes toujours partant ?` },
    { k: 'pme', title: 'Message pour PME sans RCCM (upsell Pack)', body: `Bonjour, je comprends que vous n'avez pas encore de RCCM. Pas de problème : pour 50 000 XAF, on vous met en règle (RCCM, NIU, compte bancaire pro) en 2 semaines. Après ça, votre dossier crédit passe comme une lettre à la poste. On commence ?` },
  ]
  return (
    <>
      <div className="section-card">
        <div className="section-head">
          <h3>Ton lien unique de parrainage</h3>
          <span className="section-sub">Chaque prospect qui remplit via ce lien t'est attribué</span>
        </div>
        <div className="ref-box">
          <div className="ref-code-row">
            <div className="ref-code-label">Ton code</div>
            <div className="ref-code">{refCode || '—'}</div>
          </div>
          <div className="ref-link-row">
            <input readOnly value={refLink} className="ref-link-input"/>
            <button className="btn-copy" onClick={() => copy(refLink, 'link')}>
              {copied === 'link' ? '✓ Copié' : 'Copier'}
            </button>
          </div>
          <div className="ref-hint">Partage ce lien sur WhatsApp, Facebook, en face à face. Tu peux aussi générer un QR code sur n'importe quel site (ex: qr-code-generator.com).</div>
        </div>
      </div>

      <div className="section-card">
        <div className="section-head">
          <h3>Scripts de messagerie prêts à copier</h3>
          <span className="section-sub">À utiliser dans la messagerie interne du prospect</span>
        </div>
        {scripts.map(s => (
          <div key={s.k} className="script-card">
            <div className="script-head">
              <h4>{s.title}</h4>
              <button className="btn-copy-sm" onClick={() => copy(s.body, s.k)}>
                {copied === s.k ? '✓ Copié' : 'Copier'}
              </button>
            </div>
            <p className="script-body">{s.body}</p>
          </div>
        ))}
      </div>

      <div className="section-card">
        <div className="section-head">
          <h3>Calculateur de commission</h3>
          <span className="section-sub">50 000 XAF par dossier financé</span>
        </div>
        <CommissionCalc/>
      </div>
    </>
  )
}

function CommissionCalc() {
  const [nb, setNb] = useState(5)
  const total = nb * 50000
  return (
    <div className="calc-box">
      <div className="calc-row">
        <label>Nombre de dossiers financés ce mois :</label>
        <input type="number" min={0} max={100} value={nb} onChange={e => setNb(parseInt(e.target.value) || 0)}/>
      </div>
      <div className="calc-result">
        <div className="calc-result-lbl">Tes gains ce mois</div>
        <div className="calc-result-val">{xaf(total)}</div>
      </div>
    </div>
  )
}

// ============ CHAT TAB ============
type ChatMsg = { id: string; sender_type: 'commercial' | 'director'; body: string; created_at: string; read_at: string | null }

function ChatTab({ commercialId, onRead }: { commercialId: string; onRead: () => void }) {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useState<HTMLDivElement | null>(null)

  async function load() {
    const { data } = await supabase.from('commercial_chats').select('*').eq('commercial_id', commercialId).order('created_at', { ascending: true })
    if (data) setMessages(data as ChatMsg[])
  }
  async function markRead() {
    await supabase.rpc('mark_commercial_messages_read', { p_commercial_id: commercialId, p_reader_type: 'commercial' })
    onRead()
  }

  useEffect(() => {
    load()
    markRead()
    const chan = supabase.channel(`chat-tab-${commercialId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'commercial_chats', filter: `commercial_id=eq.${commercialId}` },
        (payload: any) => {
          setMessages(prev => [...prev, payload.new])
          if (payload.new.sender_type === 'director') markRead()
        })
      .subscribe()
    return () => { supabase.removeChannel(chan) }
  }, [commercialId])

  async function send() {
    if (!input.trim() || sending) return
    setSending(true)
    const body = input.trim()
    setInput('')
    await supabase.rpc('send_commercial_message', { p_commercial_id: commercialId, p_sender_type: 'commercial', p_body: body })
    setSending(false)
  }

  return (
    <div className="chat-wrap">
      <div className="chat-head">
        <div className="chat-ava">M</div>
        <div>
          <div className="chat-head-name">Équipe Mayinvest</div>
          <div className="chat-head-sub">Support commercial · Brazzaville</div>
        </div>
      </div>
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>Pas encore de messages. Dis bonjour à l'équipe Mayinvest ou pose une question sur un dossier !</p>
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`chat-msg ${m.sender_type === 'commercial' ? 'me' : 'them'}`}>
            <div className="chat-msg-body">{m.body}</div>
            <div className="chat-msg-time">{new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        ))}
      </div>
      <div className="chat-input-row">
        <input
          placeholder="Écris ton message à Mayinvest…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
          disabled={sending}
        />
        <button onClick={send} disabled={!input.trim() || sending}>
          {sending ? '…' : 'Envoyer'}
        </button>
      </div>
    </div>
  )
}

// ============ ICONS ============
const IconGrid = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
const IconUsers = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
const IconLink = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
const IconChat = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
const Eye = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
const EyeOff = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>

function GlobalStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      .ec-header { height: 72px; padding: 0 60px; display: flex; align-items: center; justify-content: space-between; background: white; border-bottom: 1px solid ${MI.grayBorder}; }
      @media (max-width: 640px) { .ec-header { height: 60px; padding: 0 16px; } }
      .ec-nav-link { color: ${MI.textMuted}; font-size: 13px; font-weight: 500; text-decoration: none; padding: 10px 12px; border-radius: 100px; display: inline-flex; align-items: center; gap: 6px; }
      .ec-nav-link:hover { background: ${MI.grayHair}; color: ${MI.text}; }

      /* ===== LOGIN ===== */
      .login-wrap { max-width: 440px; margin: 0 auto; padding: 60px 24px; }
      .login-card { background: white; border: 1px solid ${MI.grayBorder}; border-radius: 24px; padding: 40px 36px; box-shadow: 0 20px 40px rgba(13,23,41,0.06), 0 2px 6px rgba(13,23,41,0.03); }
      .login-pill { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; background: ${MI.blueSoft}; color: ${MI.blue}; border-radius: 100px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 16px; }
      .login-card h1 { font-size: 26px; font-weight: 800; color: ${MI.navy}; margin: 0 0 6px; letter-spacing: -0.02em; }
      .login-card p.sub { font-size: 13px; color: ${MI.textMuted}; margin: 0 0 24px; line-height: 1.5; }
      .field { margin-bottom: 14px; }
      .field label { display: block; font-size: 12px; font-weight: 600; color: ${MI.text}; margin-bottom: 5px; }
      .field input { width: 100%; padding: 12px 14px; background: #fff; border: 1px solid ${MI.grayBorder}; border-radius: 10px; font-size: 14px; font-family: inherit; color: ${MI.text}; transition: border-color 0.15s, box-shadow 0.15s; }
      .field input:focus { outline: none; border-color: ${MI.blue}; box-shadow: 0 0 0 3px rgba(26,107,255,0.12); }
      .field input::placeholder { color: ${MI.textFaint}; }
      .pwd-wrap { position: relative; }
      .pwd-toggle { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: ${MI.textMuted}; padding: 6px; }
      .form-err { background: ${MI.redSoft}; color: ${MI.red}; padding: 10px 14px; border-radius: 10px; font-size: 12px; margin-bottom: 14px; font-weight: 600; }
      .btn-login { width: 100%; padding: 14px; background: #111; color: white; border: none; border-radius: 100px; font-size: 14px; font-weight: 700; cursor: pointer; margin-top: 8px; font-family: inherit; }
      .btn-login:hover:not(:disabled) { background: ${MI.blue}; }
      .btn-login:disabled { opacity: 0.6; cursor: not-allowed; }
      .login-footer { font-size: 12px; color: ${MI.textMuted}; text-align: center; margin-top: 20px; }
      .login-footer a { color: ${MI.blue}; text-decoration: none; font-weight: 600; }

      /* ===== PRE-VALIDATION DASHBOARD ===== */
      .pre-wrap { max-width: 720px; margin: 0 auto; padding: 32px 24px; }
      .welcome-card { background: linear-gradient(135deg, ${MI.navy} 0%, #1A2F5F 100%); color: #fff; border-radius: 24px; padding: 36px; position: relative; overflow: hidden; margin-bottom: 20px; }
      .welcome-card::before { content: ''; position: absolute; top: -80px; right: -80px; width: 280px; height: 280px; background: radial-gradient(circle, rgba(26,107,255,0.25) 0%, transparent 65%); pointer-events: none; }
      .welcome-badge { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; background: rgba(255,255,255,0.15); border-radius: 100px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 14px; position: relative; }
      .welcome-badge .dot { width: 6px; height: 6px; background: ${MI.green}; border-radius: 50%; }
      .welcome-card h2 { font-size: 30px; font-weight: 800; margin: 0 0 8px; letter-spacing: -0.02em; position: relative; }
      .welcome-card p { font-size: 14px; color: rgba(255,255,255,0.75); margin: 0; line-height: 1.6; max-width: 540px; position: relative; }
      .status-card { background: white; border: 1px solid ${MI.grayBorder}; border-radius: 20px; padding: 28px; margin-bottom: 20px; box-shadow: 0 2px 6px rgba(13,23,41,0.03); }
      .status-head { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; }
      .status-ic { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
      .status-ic.inprogress { background: ${MI.blueSoft}; color: ${MI.blue}; }
      .status-ic.pending { background: ${MI.goldSoft}; color: #92400E; }
      .status-ic.refuse { background: ${MI.redSoft}; color: ${MI.red}; }
      .status-head h3 { font-size: 17px; font-weight: 800; margin: 0 0 3px; color: ${MI.navy}; }
      .status-head p { font-size: 12px; color: ${MI.textMuted}; margin: 0; }
      .status-body { font-size: 13px; color: ${MI.text}; line-height: 1.6; margin-bottom: 16px; }
      .btn-resume { padding: 12px 22px; background: ${MI.blue}; color: white; border: none; border-radius: 100px; font-size: 13px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; font-family: inherit; }
      .btn-logout { padding: 9px 18px; background: ${MI.grayHair}; color: ${MI.text}; border: 1px solid ${MI.grayBorder}; border-radius: 100px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }

      /* ===== WORKSPACE ===== */
      .workspace { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; }
      @media (max-width: 900px) { .workspace { grid-template-columns: 1fr; } }
      .ws-sidebar { background: #0D1B3E; color: #fff; padding: 20px 0 16px; position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column; z-index: 100; }
      @media (max-width: 900px) {
        .ws-sidebar { position: fixed; width: 260px; left: 0; top: 0; transform: translateX(-100%); transition: transform 0.25s; }
        .ws-sidebar.open { transform: translateX(0); }
      }
      .sidebar-ovr { position: fixed; inset: 0; background: rgba(13,27,62,0.6); z-index: 99; backdrop-filter: blur(4px); }
      .ws-logo { padding: 0 20px 20px; border-bottom: 1px solid rgba(255,255,255,0.08); }
      .ws-logo a { display: inline-block; filter: brightness(1.5) saturate(0); mix-blend-mode: screen; }
      .ws-nav { flex: 1; padding: 20px 12px; display: flex; flex-direction: column; gap: 2px; }
      .ws-nav-item { display: flex; align-items: center; gap: 12px; padding: 11px 14px; background: transparent; border: none; cursor: pointer; border-radius: 10px; color: rgba(255,255,255,0.65); font-family: inherit; font-size: 13px; font-weight: 600; text-align: left; }
      .ws-nav-item:hover { background: rgba(255,255,255,0.05); color: #fff; }
      .ws-nav-item.active { background: rgba(26,107,255,0.2); color: #fff; }
      .ws-nav-icon { display: inline-flex; }
      .ws-nav-lbl { flex: 1; }
      .ws-nav-badge { background: ${MI.blue}; color: #fff; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 100px; }
      .ws-sidebar-footer { padding: 16px 16px 8px; border-top: 1px solid rgba(255,255,255,0.08); }
      .ws-user { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
      .ws-avatar { width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, ${MI.blue}, ${MI.violet}); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
      .ws-user-name { font-size: 12px; font-weight: 700; color: #fff; }
      .ws-user-city { font-size: 10px; color: rgba(255,255,255,0.5); }
      .btn-logout-sm { width: 100%; padding: 8px; background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.65); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; font-size: 11px; font-weight: 600; cursor: pointer; font-family: inherit; }
      .btn-logout-sm:hover { background: rgba(255,255,255,0.1); color: #fff; }

      .ws-main { min-width: 0; }
      .ws-topbar { padding: 14px 32px; background: #fff; border-bottom: 1px solid ${MI.grayBorder}; display: flex; align-items: center; gap: 14px; position: sticky; top: 0; z-index: 10; }
      @media (max-width: 640px) { .ws-topbar { padding: 12px 16px; } }
      .ws-burger { display: none; background: none; border: none; padding: 8px; cursor: pointer; color: ${MI.text}; }
      @media (max-width: 900px) { .ws-burger { display: inline-flex; } }
      .ws-page-title { font-size: 18px; font-weight: 800; margin: 0; color: ${MI.navy}; letter-spacing: -0.01em; }
      .ws-content { padding: 24px 32px 60px; max-width: 1160px; }
      @media (max-width: 640px) { .ws-content { padding: 20px 16px 40px; } }

      .hero-strip { background: linear-gradient(135deg, ${MI.navy} 0%, #1A2F5F 100%); color: #fff; border-radius: 20px; padding: 28px 32px; margin-bottom: 20px; position: relative; overflow: hidden; }
      .hero-strip::before { content: ''; position: absolute; top: -40px; right: -40px; width: 200px; height: 200px; background: radial-gradient(circle, rgba(26,107,255,0.3) 0%, transparent 60%); }
      .hero-tag { display: inline-flex; align-items: center; gap: 6px; padding: 4px 11px; background: rgba(255,255,255,0.15); border-radius: 100px; font-size: 10px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 10px; position: relative; }
      .hero-tag .dot { width: 6px; height: 6px; background: ${MI.green}; border-radius: 50%; }
      .hero-strip h2 { font-size: 24px; font-weight: 800; margin: 0 0 4px; letter-spacing: -0.02em; position: relative; }
      .hero-strip p { font-size: 13px; color: rgba(255,255,255,0.7); margin: 0; position: relative; }

      .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
      @media (max-width: 820px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
      .kpi { background: #fff; border: 1px solid ${MI.grayBorder}; border-radius: 16px; padding: 18px 20px; box-shadow: 0 2px 4px rgba(13,23,41,0.03); }
      .kpi.primary { background: linear-gradient(135deg, ${MI.blue} 0%, ${MI.blueDark} 100%); color: #fff; border-color: transparent; }
      .kpi-lbl { font-size: 11px; color: ${MI.textMuted}; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; }
      .kpi.primary .kpi-lbl { color: rgba(255,255,255,0.75); }
      .kpi-val { font-size: 26px; font-weight: 800; color: ${MI.navy}; margin: 6px 0 3px; letter-spacing: -0.03em; }
      .kpi.primary .kpi-val { color: #fff; }
      .kpi-sub { font-size: 11px; color: ${MI.textFaint}; }
      .kpi.primary .kpi-sub { color: rgba(255,255,255,0.65); }

      .section-card { background: #fff; border: 1px solid ${MI.grayBorder}; border-radius: 16px; padding: 24px; margin-bottom: 16px; box-shadow: 0 2px 4px rgba(13,23,41,0.03); }
      .section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px; }
      .section-head h3 { font-size: 15px; font-weight: 800; color: ${MI.navy}; margin: 0; }
      .section-sub { font-size: 11px; color: ${MI.textMuted}; }
      .btn-reload { padding: 6px 12px; background: ${MI.grayHair}; color: ${MI.text}; border: 1px solid ${MI.grayBorder}; border-radius: 100px; font-size: 11px; font-weight: 600; cursor: pointer; font-family: inherit; }

      .empty { text-align: center; padding: 30px 20px; color: ${MI.textMuted}; }
      .empty svg { color: ${MI.textFaint}; margin-bottom: 12px; }
      .empty p { font-size: 13px; margin: 0; }
      .empty-full { background: #fff; border: 1px dashed ${MI.grayBorder}; border-radius: 20px; padding: 60px 20px; text-align: center; }
      .empty-ic { width: 60px; height: 60px; background: ${MI.blueSoft}; color: ${MI.blue}; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 14px; }
      .empty-full h3 { font-size: 18px; font-weight: 800; color: ${MI.navy}; margin: 0 0 8px; }
      .empty-full p { font-size: 13px; color: ${MI.textMuted}; margin: 0 auto; max-width: 440px; line-height: 1.6; }

      .leads-mini { display: flex; flex-direction: column; gap: 6px; }
      .lead-mini { padding: 12px 14px; background: ${MI.grayHair}; border-radius: 10px; }
      .lead-mini-name { font-size: 13px; font-weight: 700; color: ${MI.text}; }
      .lead-mini-meta { font-size: 11px; color: ${MI.textMuted}; margin-top: 2px; }

      /* Leads table */
      .leads-table { font-size: 12px; }
      .lt-head { display: grid; grid-template-columns: 2fr 2fr 70px 1.3fr 1fr 80px; gap: 12px; padding: 10px 14px; background: ${MI.grayHair}; border-radius: 10px; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: ${MI.textMuted}; margin-bottom: 4px; }
      .lt-head .r { text-align: right; }
      .lt-row { display: grid; grid-template-columns: 2fr 2fr 70px 1.3fr 1fr 80px; gap: 12px; padding: 12px 14px; border-bottom: 1px solid ${MI.grayHair}; align-items: center; }
      .lt-row .r { text-align: right; }
      .lt-name { font-weight: 700; color: ${MI.text}; }
      .lt-meta { color: ${MI.textMuted}; }
      .lt-score { font-weight: 800; color: ${MI.blue}; font-variant-numeric: tabular-nums; }
      .lt-score small { font-size: 9px; color: ${MI.textFaint}; font-weight: 500; }
      .lt-statut { padding: 3px 10px; background: ${MI.blueSoft}; color: ${MI.blue}; border-radius: 100px; font-size: 10px; font-weight: 700; text-align: center; text-transform: uppercase; letter-spacing: 0.04em; }
      .lt-amt { font-weight: 700; color: ${MI.text}; font-variant-numeric: tabular-nums; }
      .lt-date { color: ${MI.textFaint}; }
      @media (max-width: 720px) {
        .lt-head { display: none; }
        .lt-row { grid-template-columns: 1fr auto; gap: 6px; padding: 14px 12px; }
        .lt-row > * { grid-column: 1; }
        .lt-row .lt-amt, .lt-row .lt-date { grid-column: 2; text-align: right; }
      }

      /* Outils */
      .ref-box { background: linear-gradient(135deg, ${MI.blueSoft} 0%, #fff 60%); border: 1px solid ${MI.grayBorder}; border-radius: 14px; padding: 20px; }
      .ref-code-row { display: flex; align-items: center; gap: 14px; padding-bottom: 14px; border-bottom: 1px solid ${MI.grayBorder}; margin-bottom: 14px; }
      .ref-code-label { font-size: 11px; font-weight: 700; color: ${MI.textMuted}; letter-spacing: 0.05em; text-transform: uppercase; }
      .ref-code { font-size: 28px; font-weight: 800; letter-spacing: 0.1em; color: ${MI.navy}; font-family: 'SF Mono', Menlo, monospace; }
      .ref-link-row { display: flex; gap: 8px; }
      .ref-link-input { flex: 1; padding: 10px 12px; background: #fff; border: 1px solid ${MI.grayBorder}; border-radius: 8px; font-size: 12px; font-family: 'SF Mono', Menlo, monospace; color: ${MI.text}; }
      .btn-copy { padding: 10px 18px; background: #111; color: #fff; border: none; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; font-family: inherit; }
      .btn-copy:hover { background: ${MI.blue}; }
      .ref-hint { margin-top: 12px; font-size: 11px; color: ${MI.textMuted}; line-height: 1.5; }

      .script-card { background: ${MI.grayHair}; border-radius: 12px; padding: 16px; margin-bottom: 10px; }
      .script-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; gap: 10px; }
      .script-head h4 { font-size: 13px; font-weight: 700; color: ${MI.navy}; margin: 0; }
      .btn-copy-sm { padding: 6px 12px; background: #fff; color: ${MI.text}; border: 1px solid ${MI.grayBorder}; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; font-family: inherit; white-space: nowrap; }
      .btn-copy-sm:hover { background: ${MI.blue}; color: #fff; border-color: ${MI.blue}; }
      .script-body { font-size: 12px; color: ${MI.text}; line-height: 1.6; margin: 0; white-space: pre-wrap; }

      .calc-box { background: ${MI.grayHair}; border-radius: 12px; padding: 20px; }
      .calc-row { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; flex-wrap: wrap; }
      .calc-row label { font-size: 13px; color: ${MI.text}; font-weight: 600; flex: 1; min-width: 200px; }
      .calc-row input { width: 100px; padding: 10px 12px; background: #fff; border: 1px solid ${MI.grayBorder}; border-radius: 8px; font-size: 14px; font-weight: 700; text-align: center; font-family: inherit; }
      .calc-result { display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: ${MI.blue}; color: #fff; border-radius: 10px; }
      .calc-result-lbl { font-size: 12px; font-weight: 600; opacity: 0.85; }
      .calc-result-val { font-size: 20px; font-weight: 800; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }

      /* Bouton primary small */
      .btn-primary-sm { padding: 8px 14px; background: ${MI.blue}; color: #fff; border: none; border-radius: 100px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; }
      .btn-primary-sm:hover { background: ${MI.blueDark}; }

      /* ===== DRAWER LEAD ===== */
      .drawer-ovr { position: fixed; top: 0; right: 0; bottom: 0; left: 240px; background: rgba(13,27,62,0.5); backdrop-filter: blur(6px); z-index: 200; display: flex; justify-content: flex-end; }
      @media (max-width: 900px) { .drawer-ovr { left: 0; } }
      .drawer { background: #fff; width: 100%; max-width: 480px; height: 100vh; overflow-y: auto; animation: slideIn 0.25s cubic-bezier(0.4,0,0.2,1); box-shadow: -20px 0 60px rgba(13,27,62,0.15); position: relative; }
      @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
      .drawer-close { position: absolute; top: 20px; right: 20px; background: ${MI.grayHair}; border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; color: ${MI.textMuted}; display: inline-flex; align-items: center; justify-content: center; padding: 0; }
      .drawer-close:hover { background: ${MI.redSoft}; color: ${MI.red}; }
      .drawer-body { padding: 36px 28px 24px; }
      .drawer-title { font-size: 22px; font-weight: 800; color: ${MI.navy}; margin: 0 0 4px; letter-spacing: -0.01em; }
      .drawer-sub { font-size: 12px; color: ${MI.textMuted}; margin-bottom: 20px; }
      .drawer-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 20px; }
      .drawer-chip { padding: 5px 12px; background: ${MI.blueSoft}; color: ${MI.blue}; border-radius: 100px; font-size: 11px; font-weight: 700; }
      .drawer-statut { padding: 8px 14px; background: #fff; border: 1px solid ${MI.grayBorder}; border-radius: 10px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }
      .drawer-sec { margin-bottom: 22px; }
      .drawer-sec-title { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${MI.textMuted}; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid ${MI.grayBorder}; }
      .info-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; font-size: 13px; }
      .info-row span { color: ${MI.textMuted}; }
      .info-row b { color: ${MI.text}; font-weight: 700; text-align: right; }
      .drawer-actions-row { display: flex; gap: 8px; margin-top: 10px; }
      .btn-mini { padding: 8px 14px; background: ${MI.grayHair}; color: ${MI.text}; border: 1px solid ${MI.grayBorder}; border-radius: 100px; font-size: 12px; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
      .btn-mini:hover { background: ${MI.blue}; color: #fff; border-color: ${MI.blue}; }

      /* ===== MODAL NEW LEAD ===== */
      .modal-ovr { position: fixed; inset: 0; background: rgba(13,27,62,0.6); backdrop-filter: blur(6px); z-index: 300; display: flex; align-items: center; justify-content: center; padding: 20px; }
      .modal-card { background: #fff; border-radius: 20px; max-width: 540px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 36px 28px 28px; position: relative; box-shadow: 0 30px 60px rgba(13,27,62,0.25); }
      .modal-title { font-size: 22px; font-weight: 800; color: ${MI.navy}; margin: 0 0 4px; letter-spacing: -0.01em; }
      .modal-sub { font-size: 12px; color: ${MI.textMuted}; margin: 0 0 20px; }
      .type-switch { display: flex; gap: 6px; padding: 4px; background: ${MI.grayHair}; border-radius: 100px; margin-bottom: 16px; }
      .type-switch button { flex: 1; padding: 8px; background: transparent; border: none; border-radius: 100px; cursor: pointer; font-size: 12px; font-weight: 700; color: ${MI.textMuted}; font-family: inherit; }
      .type-switch button.active { background: #fff; color: ${MI.navy}; box-shadow: 0 1px 2px rgba(0,0,0,0.08); }
      .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      @media (max-width: 480px) { .field-grid { grid-template-columns: 1fr; } }
      .field select { width: 100%; padding: 12px 14px; background: #fff; border: 1px solid ${MI.grayBorder}; border-radius: 10px; font-size: 14px; font-family: inherit; color: ${MI.text}; }
      .field select:focus { outline: none; border-color: ${MI.blue}; box-shadow: 0 0 0 3px rgba(26,107,255,0.12); }
      .modal-actions { display: flex; gap: 10px; margin-top: 20px; padding-top: 16px; border-top: 1px solid ${MI.grayBorder}; }
      .btn-cancel { padding: 12px 20px; background: ${MI.grayHair}; color: ${MI.text}; border: 1px solid ${MI.grayBorder}; border-radius: 100px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
      .btn-primary-full { flex: 1; padding: 12px 20px; background: #111; color: #fff; border: none; border-radius: 100px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }
      .btn-primary-full:hover:not(:disabled) { background: ${MI.blue}; }

      /* ===== CHAT ===== */
      .chat-wrap { background: #fff; border: 1px solid ${MI.grayBorder}; border-radius: 16px; display: flex; flex-direction: column; height: calc(100vh - 180px); min-height: 500px; overflow: hidden; }
      .chat-head { padding: 16px 20px; background: ${MI.grayHair}; border-bottom: 1px solid ${MI.grayBorder}; display: flex; align-items: center; gap: 12px; }
      .chat-ava { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, ${MI.blue}, ${MI.violet}); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px; }
      .chat-head-name { font-size: 14px; font-weight: 700; color: ${MI.text}; }
      .chat-head-sub { font-size: 11px; color: ${MI.textMuted}; margin-top: 1px; }
      .chat-messages { flex: 1; overflow-y: auto; padding: 20px; background: ${MI.grayBg}; display: flex; flex-direction: column; gap: 10px; }
      .chat-empty { text-align: center; color: ${MI.textMuted}; font-size: 13px; padding: 40px 20px; }
      .chat-msg { max-width: 75%; }
      .chat-msg.me { align-self: flex-end; }
      .chat-msg.them { align-self: flex-start; }
      .chat-msg-body { padding: 10px 14px; border-radius: 14px; font-size: 13px; line-height: 1.5; }
      .chat-msg.me .chat-msg-body { background: ${MI.blue}; color: #fff; border-bottom-right-radius: 4px; }
      .chat-msg.them .chat-msg-body { background: #fff; color: ${MI.text}; border: 1px solid ${MI.grayBorder}; border-bottom-left-radius: 4px; }
      .chat-msg-time { font-size: 10px; color: ${MI.textFaint}; margin-top: 3px; padding: 0 4px; text-align: right; }
      .chat-msg.them .chat-msg-time { text-align: left; }
      .chat-input-row { padding: 14px 16px; border-top: 1px solid ${MI.grayBorder}; display: flex; gap: 8px; background: #fff; }
      .chat-input-row input { flex: 1; padding: 11px 16px; background: ${MI.grayHair}; border: 1px solid ${MI.grayBorder}; border-radius: 100px; font-size: 13px; font-family: inherit; color: ${MI.text}; }
      .chat-input-row input:focus { outline: none; border-color: ${MI.blue}; background: #fff; }
      .chat-input-row button { padding: 11px 20px; background: #111; color: #fff; border: none; border-radius: 100px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }
      .chat-input-row button:hover:not(:disabled) { background: ${MI.blue}; }
      .chat-input-row button:disabled { opacity: 0.5; cursor: not-allowed; }
    `}</style>
  )
}
