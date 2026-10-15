import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, useRef, useMemo } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Logo } from '@/components/Logo'

export const Route = createFileRoute('/admin')({
  component: AdminGate,
})

/* ============================================================
 * HELPERS
 * ============================================================ */
const STATUSES = ['Nouveau', 'Contacté', 'RDV', 'Dossier Déposé', 'Éligible', 'Financé', 'Non Éligible', 'Perdu']
const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  'Nouveau': { bg: '#EEF4FF', fg: '#1A6BFF' },
  'Contacté': { bg: '#FFF4E5', fg: '#B45309' },
  'RDV': { bg: '#F3E8FF', fg: '#6B21A8' },
  'Dossier Déposé': { bg: '#E0F2FE', fg: '#075985' },
  'Éligible': { bg: '#DCFCE7', fg: '#166534' },
  'Financé': { bg: '#D1FAE5', fg: '#065F46' },
  'Non Éligible': { bg: '#FEE2E2', fg: '#991B1B' },
  'Perdu': { bg: '#F3F4F6', fg: '#6B7280' },
}
const TRANCHE_LABELS: Record<string, string> = {
  '0-6': 'Moins de 6 mois', '6-12': '6 mois à 1 an', '1-3': '1 à 3 ans',
  '3-5': '3 à 5 ans', '5-10': '5 à 10 ans', '10+': 'Plus de 10 ans',
}
function formatXAF(n: any): string {
  if (!n) return '—'
  const v = typeof n === 'string' ? parseInt(n) : n
  if (isNaN(v) || !v) return '—'
  return v.toLocaleString('fr-FR').replace(/,/g, ' ') + ' XAF'
}
function daysBetween(iso: string): number {
  const d = new Date(iso)
  return Math.floor((Date.now() - d.getTime()) / 86400000)
}
function csvEscape(s: any): string {
  if (s === null || s === undefined) return ''
  const t = String(s).replace(/"/g, '""')
  return /[",\n]/.test(t) ? `"${t}"` : t
}
function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4)
    osc.connect(g); g.connect(ctx.destination)
    osc.start(); osc.stop(ctx.currentTime + 0.42)
  } catch {}
}

/* ============================================================
 * AUTH GATE
 * ============================================================ */
function AdminGate() {
  const [session, setSession] = useState<any>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecking(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => sub?.subscription?.unsubscribe()
  }, [])

  if (checking) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>Chargement…</div>
  if (!session) return <LoginScreen />
  return <Admin session={session} />
}

/* ============================================================
 * LOGIN SCREEN
 * ============================================================ */
function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [iconIdx, setIconIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setIconIdx(i => (i + 1) % 4), 2200)
    return () => clearInterval(t)
  }, [])

  async function login() {
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message)
  }

  const icons = [
    <svg key="lock" width="36" height="36" viewBox="0 0 32 32" fill="none"><rect x="7" y="14" width="18" height="13" rx="2" stroke="#1A6BFF" strokeWidth="2.4"/><path d="M11 14v-4a5 5 0 0110 0v4" stroke="#1A6BFF" strokeWidth="2.4"/></svg>,
    <svg key="shield" width="36" height="36" viewBox="0 0 32 32" fill="none"><path d="M16 3l10 4v8c0 7-4.5 12-10 14-5.5-2-10-7-10-14V7l10-4z" stroke="#1A6BFF" strokeWidth="2.4" strokeLinejoin="round"/></svg>,
    <svg key="key" width="36" height="36" viewBox="0 0 32 32" fill="none"><circle cx="11" cy="21" r="5" stroke="#1A6BFF" strokeWidth="2.4"/><path d="M14 18L26 6M22 10l4 4" stroke="#1A6BFF" strokeWidth="2.4" strokeLinecap="round"/></svg>,
    <svg key="chart" width="36" height="36" viewBox="0 0 32 32" fill="none"><path d="M5 25V7M5 25h22M9 20V13M14 20V9M19 20V15M24 20V11" stroke="#1A6BFF" strokeWidth="2.4" strokeLinecap="round"/></svg>,
  ]

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        input { font-size: 16px !important; }
        .login-card { background: #fff; border-radius: 24px; padding: 36px 28px; box-shadow: 0 20px 50px rgba(13,27,62,0.1); max-width: 400px; width: 100%; text-align: center; }
        .lg-icon { width: 72px; height: 72px; border-radius: 20px; background: #EEF4FF; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 18px; }
        .lg-dots { display: flex; gap: 5px; justify-content: center; margin-bottom: 20px; }
        .lg-dot { width: 5px; height: 5px; border-radius: 50%; background: #D1D5DB; transition: all 0.3s; }
        .lg-dot.on { background: #1A6BFF; width: 14px; border-radius: 100px; }
        .lg-h { font-size: 22px; font-weight: 800; color: #0D1B3E; margin: 0 0 8px; }
        .lg-sub { color: #666; font-size: 14px; margin: 0 0 24px; }
        .lg-field { background: #F8FAFC; border: 1.5px solid #E5E7EB; border-radius: 14px; padding: 12px 16px; text-align: left; margin-bottom: 10px; }
        .lg-field label { display: block; font-size: 11px; color: #888; font-weight: 600; margin-bottom: 2px; }
        .lg-field input { width: 100%; border: none; background: transparent; outline: none; font-family: inherit; font-weight: 500; }
        .lg-field:focus-within { border-color: #1A6BFF; }
        .lg-btn { width: 100%; background: #1A6BFF; color: #fff; font-family: inherit; font-size: 15px; font-weight: 700; padding: 14px; border-radius: 100px; border: none; cursor: pointer; margin-top: 10px; }
        .lg-btn:disabled { background: #C7D0DB; cursor: not-allowed; }
        .lg-err { background: #FEF2F2; border: 1.5px solid #FCA5A5; color: #B91C1C; font-size: 13px; padding: 10px; border-radius: 10px; margin-top: 10px; }
      `}</style>
      <div className="login-card">
        <div className="lg-icon">{icons[iconIdx]}</div>
        <div className="lg-dots">{icons.map((_, i) => <div key={i} className={`lg-dot ${i === iconIdx ? 'on' : ''}`}/>)}</div>
        <h1 className="lg-h">Mayinvest Admin</h1>
        <p className="lg-sub">Connectez-vous pour accéder au back-office</p>
        <div className="lg-field"><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@mayinvest.cg"/></div>
        <div className="lg-field"><label>Mot de passe</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()}/></div>
        <button className="lg-btn" disabled={loading || !email || !password} onClick={login}>{loading ? 'Connexion…' : 'Se connecter'}</button>
        {error && <div className="lg-err">{error}</div>}
      </div>
    </div>
  )
}

/* ============================================================
 * ADMIN APP
 * ============================================================ */
type Page = 'general' | 'crm' | 'segments' | 'bancarisation' | 'non-eligibles' | 'rapports'

function Admin({ session }: { session: any }) {
  const navigate = useNavigate()
  const [page, setPage] = useState<Page>('general')
  const [leads, setLeads] = useState<any[]>([])
  const [msgCounts, setMsgCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('')
  const [selectedLead, setSelectedLead] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toast, setToast] = useState<{ msg: string; score: number } | null>(null)

  async function loadLeads() {
    const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
    if (data) setLeads(data)
    // Compteur messages non lus par lead (de l'admin point de vue = messages client non lus)
    const { data: msgs } = await supabase.from('messages').select('lead_id').eq('sender', 'client').is('read_at', null)
    const counts: Record<string, number> = {}
    msgs?.forEach(m => { counts[m.lead_id] = (counts[m.lead_id] || 0) + 1 })
    setMsgCounts(counts)
    setLoading(false)
  }

  useEffect(() => {
    loadLeads()
    // Realtime : nouveaux leads + nouveaux messages
    const leadsChan = supabase.channel('admin-leads')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, (payload) => {
        const n = payload.new as any
        setLeads(prev => [n, ...prev])
        setToast({ msg: `Nouveau lead · ${n.activite || '?'} · ${n.ville || '?'}`, score: n.score || 0 })
        playBeep()
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Mayinvest · Nouveau lead', { body: `${n.activite} · Score ${n.score}/100` })
        }
        setTimeout(() => setToast(null), 5000)
      })
      .subscribe()
    const msgChan = supabase.channel('admin-msgs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const m = payload.new as any
        if (m.sender === 'client') {
          setMsgCounts(c => ({ ...c, [m.lead_id]: (c[m.lead_id] || 0) + 1 }))
          playBeep()
        }
      })
      .subscribe()
    // Demander permission notifications
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission()
    return () => { supabase.removeChannel(leadsChan); supabase.removeChannel(msgChan) }
  }, [])

  async function updateStatut(id: string, statut: string) {
    const { error } = await supabase.from('leads').update({ statut, updated_at: new Date().toISOString() }).eq('id', id)
    if (!error) setLeads(prev => prev.map(l => l.id === id ? { ...l, statut } : l))
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  // Filtering
  const filtered = useMemo(() => {
    return leads.filter(l => {
      if (filterStatut && l.statut !== filterStatut) return false
      if (filterType && l.type !== filterType) return false
      if (search) {
        const s = search.toLowerCase()
        const nom = (l.identite?.nom || l.situation?.raison_sociale || '').toLowerCase()
        const prenom = (l.identite?.prenom || l.situation?.dirigeant || '').toLowerCase()
        const tel = (l.identite?.tel || '').toLowerCase()
        const email = (l.identite?.email || '').toLowerCase()
        const code = (l.access_code || '').toLowerCase()
        if (!nom.includes(s) && !prenom.includes(s) && !tel.includes(s) && !email.includes(s) && !code.includes(s)) return false
      }
      return true
    })
  }, [leads, search, filterStatut, filterType])

  // KPIs J/J-7/J-30
  const kpi = useMemo(() => {
    const now = Date.now()
    const jj = leads.filter(l => daysBetween(l.created_at) === 0).length
    const j7 = leads.filter(l => daysBetween(l.created_at) <= 7).length
    const j30 = leads.filter(l => daysBetween(l.created_at) <= 30).length
    const finances = leads.filter(l => l.statut === 'Financé').length
    const conv = leads.length ? Math.round((finances / leads.length) * 100) : 0
    return { jj, j7, j30, conv, total: leads.length, finances }
  }, [leads])

  // Funnel
  const funnel = useMemo(() => {
    return STATUSES.map(s => ({ statut: s, count: leads.filter(l => l.statut === s).length, color: STATUS_COLORS[s] }))
  }, [leads])

  function exportCSV() {
    const headers = ['Date', 'Type', 'Activité', 'Nom', 'Prénom/Dirigeant', 'Téléphone', 'Email', 'Ville', 'Montant', 'Objet', 'Banque', 'Contrat', 'Durée restante', 'Ancienneté', 'Revenu/CA', 'Score', 'Statut', 'Code', 'Ref']
    const rows = filtered.map(l => [
      new Date(l.created_at).toLocaleString('fr-FR'),
      l.type,
      l.activite,
      l.identite?.nom || l.situation?.raison_sociale || '',
      l.identite?.prenom || l.situation?.dirigeant || '',
      l.identite?.tel || '',
      l.identite?.email || '',
      l.ville || '',
      l.montant_demande || 0,
      l.besoin?.objet || '',
      l.banque_actuelle || '',
      l.situation?.contrat || '',
      l.situation?.duree_restante || '',
      TRANCHE_LABELS[l.situation?.anciennete_tranche] || '',
      l.situation?.revenu || l.situation?.ca_annuel || '',
      l.score,
      l.statut,
      l.access_code || '',
      l.id,
    ])
    const csv = [headers, ...rows].map(r => r.map(csvEscape).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mayinvest-leads-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const NAV: { k: Page; label: string; icon: string }[] = [
    { k: 'general', label: 'Dashboard', icon: '📊' },
    { k: 'crm', label: 'CRM', icon: '👥' },
    { k: 'segments', label: 'Segments', icon: '🎯' },
    { k: 'bancarisation', label: 'Bancarisation', icon: '🏦' },
    { k: 'non-eligibles', label: 'Non éligibles', icon: '🚫' },
    { k: 'rapports', label: 'Rapports', icon: '📈' },
  ]

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", minHeight: '100vh', background: '#F5F7FA', color: '#111' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        input, select, textarea, button { font-family: inherit; font-size: 16px !important; }
        body { margin: 0; }

        .app { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; }
        @media (max-width: 900px) { .app { grid-template-columns: 1fr; } }

        .sidebar { background: #0D1B3E; color: #fff; padding: 24px 0; position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column; }
        @media (max-width: 900px) {
          .sidebar { position: fixed; width: 240px; z-index: 100; transform: translateX(-100%); transition: transform 0.25s; height: 100vh; }
          .sidebar.open { transform: translateX(0); }
          .sidebar-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 99; }
        }
        .sb-logo { padding: 0 24px 24px; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 16px; }
        .sb-nav { flex: 1; padding: 0 12px; display: flex; flex-direction: column; gap: 2px; }
        .sb-link { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 10px; background: transparent; border: none; color: rgba(255,255,255,0.7); font-size: 14px; font-weight: 600; cursor: pointer; text-align: left; width: 100%; transition: all 0.15s; }
        .sb-link:hover { background: rgba(255,255,255,0.06); color: #fff; }
        .sb-link.on { background: #1A6BFF; color: #fff; }
        .sb-footer { padding: 12px; border-top: 1px solid rgba(255,255,255,0.1); }
        .sb-user { font-size: 11px; color: rgba(255,255,255,0.5); padding: 0 14px 8px; word-break: break-all; }
        .sb-logout { width: 100%; background: transparent; border: 1px solid rgba(255,255,255,0.2); color: rgba(255,255,255,0.7); font-size: 12px; font-weight: 600; padding: 10px; border-radius: 10px; cursor: pointer; }

        .main { padding: 24px 32px 60px; min-width: 0; }
        @media (max-width: 900px) { .main { padding: 20px 16px 40px; } }

        .top-bar { position: sticky; top: 0; z-index: 40; background: rgba(245,247,250,0.9); backdrop-filter: blur(10px); margin: -24px -32px 20px; padding: 16px 32px; display: flex; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid #E5E7EB; }
        @media (max-width: 900px) { .top-bar { margin: -20px -16px 20px; padding: 14px 16px; } }
        .burger { display: none; width: 38px; height: 38px; border-radius: 10px; background: #fff; border: 1px solid #E5E7EB; cursor: pointer; align-items: center; justify-content: center; }
        @media (max-width: 900px) { .burger { display: flex; } }
        .page-title { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin: 0; flex: 1; }

        /* KPI grid */
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin-bottom: 24px; }
        .kpi { background: #fff; border-radius: 16px; padding: 18px; box-shadow: 0 2px 8px rgba(13,27,62,0.04); }
        .kpi-l { font-size: 11px; color: #888; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
        .kpi-v { font-size: 28px; font-weight: 800; margin-top: 4px; letter-spacing: -1px; }
        .kpi-s { font-size: 11px; color: #666; margin-top: 2px; }

        /* Funnel */
        .funnel { background: #fff; border-radius: 16px; padding: 20px; box-shadow: 0 2px 8px rgba(13,27,62,0.04); margin-bottom: 20px; }
        .funnel-h { font-size: 13px; font-weight: 700; color: #0D1B3E; margin: 0 0 14px; }
        .funnel-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .funnel-l { font-size: 12px; font-weight: 700; width: 120px; flex-shrink: 0; }
        .funnel-bar { flex: 1; height: 24px; border-radius: 8px; position: relative; background: #F3F4F6; overflow: hidden; }
        .funnel-fill { height: 100%; border-radius: 8px; display: flex; align-items: center; justify-content: flex-end; padding: 0 10px; font-size: 11px; font-weight: 800; color: #fff; min-width: 40px; }

        /* Toolbar */
        .toolbar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
        .toolbar input, .toolbar select { background: #fff; border: 1.5px solid #E5E7EB; border-radius: 10px; padding: 10px 14px; font-weight: 500; }
        .toolbar input { flex: 1; min-width: 180px; }
        .toolbar input:focus, .toolbar select:focus { border-color: #1A6BFF; outline: none; }
        .btn-export { background: #0D1B3E; color: #fff; border: none; padding: 10px 18px; border-radius: 10px; font-weight: 700; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px; }

        /* Table / Cards leads */
        .lead-grid { display: grid; gap: 10px; }
        .lead-row { background: #fff; border-radius: 14px; padding: 14px 16px; box-shadow: 0 1px 4px rgba(13,27,62,0.04); display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: center; cursor: pointer; transition: all 0.15s; border: 1.5px solid transparent; }
        .lead-row:hover { border-color: #1A6BFF; box-shadow: 0 4px 10px rgba(26,107,255,0.1); }
        .lead-l { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
        .lead-name { font-size: 14px; font-weight: 700; color: #111; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .lead-badge { font-size: 10px; padding: 2px 8px; border-radius: 100px; font-weight: 800; }
        .lead-meta { font-size: 12px; color: #666; }
        .lead-r { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .lead-score { background: #EEF4FF; color: #1A6BFF; font-size: 13px; font-weight: 800; padding: 5px 10px; border-radius: 8px; min-width: 42px; text-align: center; }
        .lead-score.hi { background: #DCFCE7; color: #166534; }
        .lead-score.lo { background: #FEE2E2; color: #991B1B; }
        .lead-statut-sel { background: #fff; border: 1.5px solid #E5E7EB; border-radius: 8px; padding: 6px 10px; font-size: 12px; font-weight: 700; cursor: pointer; }
        .msg-badge { background: #FF3B30; color: #fff; font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 100px; min-width: 18px; text-align: center; }

        .empty { text-align: center; padding: 60px 20px; color: #999; font-size: 14px; }

        /* Drawer détail lead */
        .drawer-ovr { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 200; display: flex; justify-content: flex-end; }
        .drawer { background: #fff; width: 100%; max-width: 540px; height: 100vh; overflow-y: auto; animation: slideIn 0.25s ease; }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .dr-head { padding: 20px 22px 16px; border-bottom: 1px solid #E5E7EB; position: sticky; top: 0; background: #fff; z-index: 1; }
        .dr-close { position: absolute; top: 14px; right: 14px; background: #F3F4F6; border: none; width: 32px; height: 32px; border-radius: 50%; font-size: 20px; cursor: pointer; }
        .dr-name { font-size: 20px; font-weight: 800; margin: 0 36px 4px 0; }
        .dr-code { font-size: 11px; color: #666; font-family: monospace; }
        .dr-tabs { display: flex; gap: 4px; padding: 10px 22px 0; border-bottom: 1px solid #E5E7EB; }
        .dr-tab { padding: 10px 16px; font-size: 13px; font-weight: 700; color: #666; background: transparent; border: none; cursor: pointer; border-bottom: 2px solid transparent; }
        .dr-tab.on { color: #1A6BFF; border-color: #1A6BFF; }
        .dr-body { padding: 20px 22px 40px; }
        .dr-section { margin-bottom: 20px; }
        .dr-s-h { font-size: 11px; color: #1A6BFF; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px; }
        .dr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 500px) { .dr-grid { grid-template-columns: 1fr; } }
        .dr-field { }
        .dr-k { font-size: 11px; color: #888; font-weight: 600; }
        .dr-v { font-size: 14px; font-weight: 600; color: #111; word-break: break-word; }
        .dr-wa { background: #25D366; color: #fff; border: none; padding: 10px 16px; border-radius: 100px; font-weight: 700; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; margin-top: 8px; }

        /* Chat */
        .chat-wrap { display: flex; flex-direction: column; height: 60vh; min-height: 400px; }
        .chat-scroll { flex: 1; overflow-y: auto; padding: 10px 0; display: flex; flex-direction: column; gap: 8px; }
        .msg { max-width: 80%; padding: 10px 14px; border-radius: 16px; font-size: 14px; line-height: 1.4; word-break: break-word; }
        .msg.admin { align-self: flex-end; background: #1A6BFF; color: #fff; border-bottom-right-radius: 4px; }
        .msg.client { align-self: flex-start; background: #F0F3F8; color: #111; border-bottom-left-radius: 4px; }
        .msg-meta { font-size: 10px; margin-top: 2px; opacity: 0.65; text-align: right; }
        .msg.client .msg-meta { text-align: left; }
        .chat-form { display: flex; gap: 8px; padding: 10px 10px 10px 14px; border: 1.5px solid #E5E7EB; border-radius: 14px; margin-top: 10px; }
        .chat-form:focus-within { border-color: #1A6BFF; }
        .chat-form textarea { flex: 1; border: none; outline: none; resize: none; min-height: 20px; max-height: 100px; font-family: inherit; }
        .chat-send-btn { background: #1A6BFF; color: #fff; border: none; width: 42px; height: 42px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .chat-send-btn:disabled { background: #C7D0DB; }
        .chat-empty { color: #999; text-align: center; padding: 40px 10px; font-size: 13px; }

        /* Toast */
        .toast { position: fixed; top: 16px; right: 16px; background: #0D1B3E; color: #fff; padding: 14px 18px; border-radius: 12px; box-shadow: 0 10px 24px rgba(0,0,0,0.2); z-index: 300; display: flex; align-items: center; gap: 12px; animation: toastIn 0.3s ease; max-width: 320px; }
        @keyframes toastIn { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .toast-sc { background: #1A6BFF; color: #fff; border-radius: 8px; padding: 6px 10px; font-weight: 800; font-size: 13px; flex-shrink: 0; }
      `}</style>

      <div className="app">
        {/* SIDEBAR */}
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}/>}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sb-logo">
            <Logo height={32} tone="dark"/>
          </div>
          <nav className="sb-nav">
            {NAV.map(n => (
              <button key={n.k} className={`sb-link ${page === n.k ? 'on' : ''}`} onClick={() => { setPage(n.k); setSidebarOpen(false) }}>
                <span>{n.icon}</span><span>{n.label}</span>
              </button>
            ))}
          </nav>
          <div className="sb-footer">
            <div className="sb-user">{session.user.email}</div>
            <button className="sb-logout" onClick={logout}>Déconnexion</button>
          </div>
        </aside>

        {/* MAIN */}
        <main className="main">
          <div className="top-bar">
            <button className="burger" onClick={() => setSidebarOpen(true)} aria-label="Menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M3 12h18M3 18h18" stroke="#111" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
            <h1 className="page-title">{NAV.find(n => n.k === page)?.label}</h1>
          </div>

          {loading ? <div className="empty">Chargement…</div> : <>
            {page === 'general' && <DashboardView kpi={kpi} funnel={funnel} total={leads.length}/>}
            {page === 'crm' && <CRMView leads={filtered} msgCounts={msgCounts} search={search} setSearch={setSearch} filterStatut={filterStatut} setFilterStatut={setFilterStatut} filterType={filterType} setFilterType={setFilterType} onOpen={setSelectedLead} updateStatut={updateStatut} exportCSV={exportCSV}/>}
            {page === 'segments' && <SegmentsView leads={leads}/>}
            {page === 'bancarisation' && <BancarisationView leads={leads} onOpen={setSelectedLead}/>}
            {page === 'non-eligibles' && <NonEligiblesView leads={leads} onOpen={setSelectedLead}/>}
            {page === 'rapports' && <RapportsView leads={leads} exportCSV={exportCSV}/>}
          </>}
        </main>
      </div>

      {/* DRAWER DÉTAIL LEAD */}
      {selectedLead && (
        <LeadDrawer
          lead={selectedLead}
          onClose={() => { setSelectedLead(null); loadLeads() }}
          onStatutChange={(s) => { updateStatut(selectedLead.id, s); setSelectedLead({ ...selectedLead, statut: s }) }}
          msgCount={msgCounts[selectedLead.id] || 0}
          onMsgRead={() => setMsgCounts(c => ({ ...c, [selectedLead.id]: 0 }))}
        />
      )}

      {/* TOAST */}
      {toast && (
        <div className="toast">
          <div className="toast-sc">{toast.score}</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13 }}>Nouveau dossier</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{toast.msg}</div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ============================================================
 * SUB-VIEWS
 * ============================================================ */

function DashboardView({ kpi, funnel, total }: any) {
  return (
    <>
      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-l">Aujourd'hui</div><div className="kpi-v">{kpi.jj}</div><div className="kpi-s">nouveaux leads</div></div>
        <div className="kpi"><div className="kpi-l">7 jours</div><div className="kpi-v">{kpi.j7}</div><div className="kpi-s">leads cumulés</div></div>
        <div className="kpi"><div className="kpi-l">30 jours</div><div className="kpi-v">{kpi.j30}</div><div className="kpi-s">leads cumulés</div></div>
        <div className="kpi"><div className="kpi-l">Total</div><div className="kpi-v">{total}</div><div className="kpi-s">tous dossiers</div></div>
        <div className="kpi"><div className="kpi-l">Financés</div><div className="kpi-v" style={{ color: '#166534' }}>{kpi.finances}</div><div className="kpi-s">conversion {kpi.conv}%</div></div>
      </div>

      <div className="funnel">
        <h3 className="funnel-h">Entonnoir de conversion</h3>
        {funnel.map((f: any) => {
          const pct = total ? (f.count / total) * 100 : 0
          return (
            <div key={f.statut} className="funnel-row">
              <div className="funnel-l">{f.statut}</div>
              <div className="funnel-bar">
                <div className="funnel-fill" style={{ width: `${Math.max(pct, 2)}%`, background: f.color.fg }}>{f.count}</div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

function CRMView({ leads, msgCounts, search, setSearch, filterStatut, setFilterStatut, filterType, setFilterType, onOpen, updateStatut, exportCSV }: any) {
  return (
    <>
      <div className="toolbar">
        <input placeholder="Rechercher nom, téléphone, code…" value={search} onChange={e => setSearch(e.target.value)}/>
        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
          <option value="">Tous statuts</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">Tous types</option>
          <option value="physique">Particulier</option>
          <option value="morale">PME</option>
        </select>
        <button className="btn-export" onClick={exportCSV}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v8M3 7l4 4 4-4M2 13h10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Export CSV
        </button>
      </div>

      {leads.length === 0 ? <div className="empty">Aucun lead trouvé.</div> : (
        <div className="lead-grid">
          {leads.map((l: any) => <LeadRow key={l.id} lead={l} msgCount={msgCounts[l.id] || 0} onOpen={onOpen} updateStatut={updateStatut}/>)}
        </div>
      )}
    </>
  )
}

function LeadRow({ lead, msgCount, onOpen, updateStatut }: any) {
  const c = STATUS_COLORS[lead.statut] || STATUS_COLORS['Nouveau']
  const isP = lead.type === 'physique' || lead.type === 'Personne physique'
  const nom = isP ? `${lead.identite?.prenom || ''} ${lead.identite?.nom || ''}`.trim() : (lead.situation?.raison_sociale || lead.identite?.raison_sociale || '—')
  const scoreCls = lead.score >= 70 ? 'hi' : lead.score < 40 ? 'lo' : ''
  return (
    <div className="lead-row" onClick={() => onOpen(lead)}>
      <div className="lead-l">
        <div className="lead-name">
          <span>{nom || '—'}</span>
          <span className="lead-badge" style={{ background: c.bg, color: c.fg }}>{lead.statut}</span>
          {msgCount > 0 && <span className="msg-badge">{msgCount}</span>}
        </div>
        <div className="lead-meta">{isP ? 'Particulier' : 'PME'} · {lead.activite} · {lead.ville || '—'} · {formatXAF(lead.montant_demande)} · {new Date(lead.created_at).toLocaleDateString('fr-FR')}</div>
      </div>
      <div className="lead-r" onClick={e => e.stopPropagation()}>
        <div className={`lead-score ${scoreCls}`}>{lead.score}</div>
        <select className="lead-statut-sel" value={lead.statut} onChange={e => updateStatut(lead.id, e.target.value)}>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
    </div>
  )
}

function SegmentsView({ leads }: any) {
  const bySecteur = useMemo(() => {
    const m: Record<string, number> = {}
    leads.forEach((l: any) => { const k = l.activite || 'Non défini'; m[k] = (m[k] || 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [leads])
  const byVille = useMemo(() => {
    const m: Record<string, number> = {}
    leads.forEach((l: any) => { const k = l.ville || 'Non défini'; m[k] = (m[k] || 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [leads])
  const byMontant = useMemo(() => {
    const tranches = [{ k: '< 1M', min: 0, max: 1_000_000 }, { k: '1M–5M', min: 1_000_000, max: 5_000_000 }, { k: '5M–20M', min: 5_000_000, max: 20_000_000 }, { k: '20M+', min: 20_000_000, max: Infinity }]
    return tranches.map(t => ({ k: t.k, c: leads.filter((l: any) => (l.montant_demande || 0) >= t.min && (l.montant_demande || 0) < t.max).length }))
  }, [leads])
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
      <Panel title="Par secteur / profession">
        {bySecteur.map(([k, v]) => <Bar key={k} label={k} value={v} total={leads.length}/>)}
      </Panel>
      <Panel title="Par ville">
        {byVille.map(([k, v]) => <Bar key={k} label={k} value={v} total={leads.length}/>)}
      </Panel>
      <Panel title="Par tranche de montant">
        {byMontant.map(t => <Bar key={t.k} label={t.k} value={t.c} total={leads.length}/>)}
      </Panel>
    </div>
  )
}

function Panel({ title, children }: any) {
  return <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(13,27,62,0.04)' }}><h3 style={{ fontSize: 13, fontWeight: 700, color: '#0D1B3E', margin: '0 0 14px' }}>{title}</h3>{children}</div>
}

function Bar({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total ? (value / total) * 100 : 0
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 3 }}><span>{label}</span><span>{value}</span></div>
      <div style={{ height: 6, background: '#F3F4F6', borderRadius: 100, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: '#1A6BFF', borderRadius: 100 }}/>
      </div>
    </div>
  )
}

function BancarisationView({ leads, onOpen }: any) {
  const list = leads.filter((l: any) => l.eligibilite?.salaire_domic === 'Non' || l.banque_actuelle === 'Aucune')
  return <>
    <p style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>Prospects à bancariser ({list.length})</p>
    {list.length === 0 ? <div className="empty">Aucun prospect à bancariser.</div> : (
      <div className="lead-grid">{list.map((l: any) => <LeadRow key={l.id} lead={l} msgCount={0} onOpen={onOpen} updateStatut={() => {}}/>)}</div>
    )}
  </>
}

function NonEligiblesView({ leads, onOpen }: any) {
  const list = leads.filter((l: any) => l.eligibilite?.non_eligible === true || l.statut === 'Non Éligible' || l.situation?.rccm === 'Non')
  return <>
    <p style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>Dossiers non éligibles ({list.length}) — pack formalisation, up-sell, reconversion</p>
    {list.length === 0 ? <div className="empty">Aucun dossier non éligible.</div> : (
      <div className="lead-grid">{list.map((l: any) => <LeadRow key={l.id} lead={l} msgCount={0} onOpen={onOpen} updateStatut={() => {}}/>)}</div>
    )}
  </>
}

function RapportsView({ leads, exportCSV }: any) {
  const totalMontant = leads.reduce((s: number, l: any) => s + (l.montant_demande || 0), 0)
  const avg = leads.length ? Math.round(totalMontant / leads.length) : 0
  return <>
    <div className="kpi-grid">
      <div className="kpi"><div className="kpi-l">Total demandé</div><div className="kpi-v" style={{ fontSize: 20 }}>{formatXAF(totalMontant)}</div></div>
      <div className="kpi"><div className="kpi-l">Panier moyen</div><div className="kpi-v" style={{ fontSize: 20 }}>{formatXAF(avg)}</div></div>
      <div className="kpi"><div className="kpi-l">Score moyen</div><div className="kpi-v">{leads.length ? Math.round(leads.reduce((s: number, l: any) => s + (l.score || 0), 0) / leads.length) : 0}</div></div>
    </div>
    <button className="btn-export" onClick={exportCSV}>📥 Exporter tous les leads en CSV</button>
  </>
}

/* ============================================================
 * DRAWER DÉTAIL + CHAT
 * ============================================================ */
function LeadDrawer({ lead, onClose, onStatutChange, msgCount, onMsgRead }: any) {
  const [tab, setTab] = useState<'infos' | 'chat'>('infos')
  const [messages, setMessages] = useState<any[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const chatEnd = useRef<HTMLDivElement>(null)

  const isP = lead.type === 'physique' || lead.type === 'Personne physique'
  const nom = isP ? `${lead.identite?.prenom || ''} ${lead.identite?.nom || ''}`.trim() : (lead.situation?.raison_sociale || lead.identite?.raison_sociale || '—')
  const tel = lead.identite?.tel || ''
  const waPhone = tel ? '242' + tel.replace(/\D/g, '') : ''

  async function loadMessages() {
    const { data } = await supabase.from('messages').select('*').eq('lead_id', lead.id).order('created_at')
    if (data) setMessages(data)
    // Marquer les messages client comme lus
    await supabase.rpc('mark_messages_read', { p_lead_id: lead.id, p_reader: 'admin' })
    onMsgRead()
  }

  useEffect(() => {
    loadMessages()
    const chan = supabase.channel(`drawer-${lead.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `lead_id=eq.${lead.id}` },
        (payload) => setMessages(p => [...p, payload.new]))
      .subscribe()
    return () => { supabase.removeChannel(chan) }
  }, [lead.id])

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function sendMsg() {
    if (!newMsg.trim() || sending) return
    setSending(true)
    const t = newMsg.trim()
    setNewMsg('')
    await supabase.from('messages').insert({ lead_id: lead.id, sender: 'admin', content: t })
    setSending(false)
  }

  return (
    <div className="drawer-ovr" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <div className="dr-head">
          <button className="dr-close" onClick={onClose}>×</button>
          <h2 className="dr-name">{nom}</h2>
          <div className="dr-code">{lead.access_code || '—'} · {lead.id}</div>
          <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={lead.statut} onChange={e => onStatutChange(e.target.value)} style={{ background: STATUS_COLORS[lead.statut]?.bg, color: STATUS_COLORS[lead.statut]?.fg, border: 'none', borderRadius: 8, padding: '6px 12px', fontWeight: 800, fontSize: 12 }}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span style={{ background: '#EEF4FF', color: '#1A6BFF', padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 800 }}>Score {lead.score}/100</span>
            {waPhone && <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noopener" className="dr-wa">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M17.5 14.4l-2.4-1.2c-.3-.2-.7-.1-1 .2l-.7.8c-.2.2-.5.3-.8.1-.9-.4-1.8-1-2.6-1.7-.7-.8-1.3-1.7-1.7-2.6-.1-.3 0-.6.2-.8l.8-.7c.3-.2.4-.6.2-1L8.3 5c-.2-.4-.7-.5-1-.3L5.5 6c-.5.2-.8.7-.7 1.2.4 2.8 1.7 5.4 3.6 7.4 2 2 4.6 3.3 7.4 3.6.5.1 1-.2 1.2-.7l1.3-1.8c.2-.4.1-.9-.3-1.1l-.5-.2z"/></svg>
              WhatsApp
            </a>}
          </div>
        </div>

        <div className="dr-tabs">
          <button className={`dr-tab ${tab === 'infos' ? 'on' : ''}`} onClick={() => setTab('infos')}>Infos dossier</button>
          <button className={`dr-tab ${tab === 'chat' ? 'on' : ''}`} onClick={() => setTab('chat')}>
            Discussion {messages.filter(m => m.sender === 'client' && !m.read_at).length > 0 && <span className="msg-badge" style={{ marginLeft: 4 }}>{messages.filter(m => m.sender === 'client' && !m.read_at).length}</span>}
          </button>
        </div>

        <div className="dr-body">
          {tab === 'infos' && <>
            <div className="dr-section">
              <div className="dr-s-h">Contact</div>
              <div className="dr-grid">
                <div className="dr-field"><div className="dr-k">Téléphone</div><div className="dr-v">{tel || '—'}</div></div>
                <div className="dr-field"><div className="dr-k">Email</div><div className="dr-v">{lead.identite?.email || '—'}</div></div>
                <div className="dr-field"><div className="dr-k">Ville</div><div className="dr-v">{lead.ville || '—'}</div></div>
                <div className="dr-field"><div className="dr-k">Activité</div><div className="dr-v">{lead.activite || '—'}</div></div>
              </div>
            </div>

            <div className="dr-section">
              <div className="dr-s-h">Situation {isP ? 'professionnelle' : 'juridique'}</div>
              <div className="dr-grid">
                {isP ? <>
                  <div className="dr-field"><div className="dr-k">Employeur</div><div className="dr-v">{lead.situation?.employeur || '—'}</div></div>
                  <div className="dr-field"><div className="dr-k">Type de contrat</div><div className="dr-v">{lead.situation?.contrat || '—'}</div></div>
                  {lead.situation?.duree_restante && <div className="dr-field"><div className="dr-k">Durée restante</div><div className="dr-v">{lead.situation.duree_restante} mois</div></div>}
                  <div className="dr-field"><div className="dr-k">Ancienneté</div><div className="dr-v">{TRANCHE_LABELS[lead.situation?.anciennete_tranche] || lead.situation?.anciennete || '—'}</div></div>
                  <div className="dr-field"><div className="dr-k">Revenu mensuel</div><div className="dr-v">{formatXAF(lead.situation?.revenu)}</div></div>
                </> : <>
                  <div className="dr-field"><div className="dr-k">Dirigeant</div><div className="dr-v">{lead.situation?.dirigeant || '—'}</div></div>
                  <div className="dr-field"><div className="dr-k">RCCM</div><div className="dr-v">{lead.situation?.rccm || '—'}</div></div>
                  <div className="dr-field"><div className="dr-k">NIU</div><div className="dr-v">{lead.situation?.niu || '—'}</div></div>
                  <div className="dr-field"><div className="dr-k">Ancienneté</div><div className="dr-v">{TRANCHE_LABELS[lead.situation?.anciennete_tranche] || '—'}</div></div>
                  <div className="dr-field"><div className="dr-k">CA annuel</div><div className="dr-v">{formatXAF(lead.situation?.ca_annuel)}</div></div>
                </>}
              </div>
            </div>

            <div className="dr-section">
              <div className="dr-s-h">Besoin</div>
              <div className="dr-grid">
                <div className="dr-field"><div className="dr-k">Montant demandé</div><div className="dr-v">{formatXAF(lead.montant_demande)}</div></div>
                <div className="dr-field"><div className="dr-k">Objet</div><div className="dr-v">{lead.besoin?.objet || '—'}</div></div>
                <div className="dr-field"><div className="dr-k">Banque actuelle</div><div className="dr-v">{lead.banque_actuelle || '—'}</div></div>
                {!isP && <div className="dr-field"><div className="dr-k">Flux mensuel</div><div className="dr-v">{formatXAF(lead.besoin?.flux_mois)}</div></div>}
              </div>
            </div>

            <div className="dr-section">
              <div className="dr-s-h">Éligibilité</div>
              <div className="dr-grid">
                {isP ? <>
                  <div className="dr-field"><div className="dr-k">Salaire domicilié</div><div className="dr-v">{lead.eligibilite?.salaire_domic || '—'}</div></div>
                  {lead.eligibilite?.anciennete_compte_tranche && <div className="dr-field"><div className="dr-k">Compte ouvert depuis</div><div className="dr-v">{TRANCHE_LABELS[lead.eligibilite.anciennete_compte_tranche]}</div></div>}
                  <div className="dr-field"><div className="dr-k">Non éligible</div><div className="dr-v" style={{ color: lead.eligibilite?.non_eligible ? '#B91C1C' : '#166534' }}>{lead.eligibilite?.non_eligible ? 'Oui ⚠' : 'Non ✓'}</div></div>
                </> : <>
                  <div className="dr-field"><div className="dr-k">Compte mouvementé</div><div className="dr-v">{lead.eligibilite?.compte_mouvemente || '—'}</div></div>
                  <div className="dr-field"><div className="dr-k">Refus bancaire antérieur</div><div className="dr-v">{lead.eligibilite?.refus_bancaire || '—'}</div></div>
                  <div className="dr-field"><div className="dr-k">Garanties</div><div className="dr-v">{lead.eligibilite?.garanties || '—'}</div></div>
                </>}
              </div>
            </div>

            <div className="dr-section">
              <div className="dr-s-h">Métadonnées</div>
              <div className="dr-grid">
                <div className="dr-field"><div className="dr-k">Créé le</div><div className="dr-v">{new Date(lead.created_at).toLocaleString('fr-FR')}</div></div>
                <div className="dr-field"><div className="dr-k">Mis à jour</div><div className="dr-v">{new Date(lead.updated_at).toLocaleString('fr-FR')}</div></div>
              </div>
            </div>
          </>}

          {tab === 'chat' && <div className="chat-wrap">
            <div className="chat-scroll">
              {messages.length === 0 && <div className="chat-empty">Aucun message. Démarrez la conversation.</div>}
              {messages.map(m => (
                <div key={m.id} className={`msg ${m.sender === 'admin' ? 'admin' : 'client'}`}>
                  <div>{m.content}</div>
                  <div className="msg-meta">{new Date(m.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              ))}
              <div ref={chatEnd}/>
            </div>
            <div className="chat-form">
              <textarea placeholder="Votre message au client…" value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg() } }} rows={1}/>
              <button className="chat-send-btn" disabled={!newMsg.trim() || sending} onClick={sendMsg} aria-label="Envoyer">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 11l17-7-7 17-3-7-7-3z" stroke="#fff" strokeWidth="2" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>}
        </div>
      </div>
    </div>
  )
}
