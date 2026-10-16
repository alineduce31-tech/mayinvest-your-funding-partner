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
 * AUTH GATE — vérifie la session admin depuis /mon-espace
 * ============================================================ */
const ADMIN_SESSION_KEY = 'mayinvest_admin_session'

function AdminGate() {
  const navigate = useNavigate()
  const [session, setSession] = useState<any>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ADMIN_SESSION_KEY)
      if (!raw) {
        navigate({ to: '/mon-espace' })
        return
      }
      const s = JSON.parse(raw)
      if (!s?.email || !s?.expiresAt || s.expiresAt < Date.now()) {
        localStorage.removeItem(ADMIN_SESSION_KEY)
        navigate({ to: '/mon-espace' })
        return
      }
      setSession(s)
      setChecking(false)
    } catch {
      navigate({ to: '/mon-espace' })
    }
  }, [navigate])

  if (checking) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>Vérification de la session…</div>
  if (!session) return null
  return <Admin session={session} />
}

/* ============================================================
 * LOGIN SCREEN (gardé pour compatibilité, non utilisé)
 * ============================================================ */
function _UnusedLoginScreen() {
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

  function logout() {
    try { localStorage.removeItem('mayinvest_admin_session') } catch {}
    navigate({ to: '/mon-espace' })
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

  const ICON = {
    dashboard: <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="2.5" y="2.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="10.5" y="2.5" width="7" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="10.5" y="8.5" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="2.5" y="11.5" width="7" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6"/></svg>,
    crm: <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.6"/><path d="M1.5 17c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><circle cx="14" cy="6" r="2.3" stroke="currentColor" strokeWidth="1.6"/><path d="M12 11.5c2.5 0 4.5 1.8 4.5 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
    segments: <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.6"/><path d="M10 2.5v15M2.5 10h15" stroke="currentColor" strokeWidth="1.6"/><circle cx="10" cy="10" r="2.5" fill="currentColor"/></svg>,
    bank: <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M2.5 8L10 3l7.5 5v1h-15V8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M4.5 9v7M8 9v7M12 9v7M15.5 9v7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M2 17h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
    noelig: <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.6"/><path d="M4.5 4.5l11 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
    report: <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="2.5" y="2.5" width="15" height="15" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M6 14V9M10 14V6M14 14v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  }
  const NAV: { k: Page; label: string; icon: any }[] = [
    { k: 'general', label: 'Dashboard', icon: ICON.dashboard },
    { k: 'crm', label: 'CRM', icon: ICON.crm },
    { k: 'segments', label: 'Segments', icon: ICON.segments },
    { k: 'bancarisation', label: 'Bancarisation', icon: ICON.bank },
    { k: 'non-eligibles', label: 'Non éligibles', icon: ICON.noelig },
    { k: 'rapports', label: 'Rapports', icon: ICON.report },
  ]

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, system-ui, sans-serif", minHeight: '100vh', background: '#F8FAFC', color: '#0D1B3E' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        :root {
          --ink: #0D1B3E;
          --ink-2: #334155;
          --ink-dim: #64748B;
          --ink-mute: #94A3B8;
          --bg: #F8FAFC;
          --bg-2: #F1F5F9;
          --card: #FFFFFF;
          --border: #E2E8F0;
          --border-2: #F1F5F9;
          --blue: #1A6BFF;
          --blue-dark: #0051D4;
          --blue-soft: #EEF4FF;
          --blue-soft-2: #DBE8FF;
          --green: #16A34A;
          --green-soft: #DCFCE7;
          --red: #DC2626;
          --red-soft: #FEE2E2;
          --amber: #F59E0B;
          --amber-soft: #FEF3C7;
          --purple: #7C3AED;
          --purple-soft: #F3E8FF;
        }
        * { box-sizing: border-box; }
        input, select, textarea, button { font-family: inherit; font-size: 16px !important; }
        body { margin: 0; -webkit-font-smoothing: antialiased; }

        .app { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; }
        @media (max-width: 900px) { .app { grid-template-columns: 1fr; } }

        /* ============ SIDEBAR ============ */
        .sidebar { background: #0D1B3E; color: #fff; padding: 24px 0 16px;
          position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column; }
        @media (max-width: 900px) {
          .sidebar { position: fixed; width: 260px; z-index: 100;
            transform: translateX(-100%); transition: transform 0.25s; height: 100vh; }
          .sidebar.open { transform: translateX(0); }
          .sidebar-overlay { position: fixed; inset: 0; background: rgba(13,27,62,0.6); z-index: 99; backdrop-filter: blur(4px); }
        }
        .sb-logo { padding: 0 20px 22px; border-bottom: 1px solid rgba(255,255,255,0.08);
          margin-bottom: 18px; display: flex; align-items: center; gap: 12px; }
        .sb-logo svg, .sb-logo img { display: none !important; }
        .sb-logo::before {
          content: 'M'; width: 42px; height: 42px; border-radius: 11px;
          background: linear-gradient(135deg, #1A6BFF 0%, #0051D4 100%);
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 20px; color: #fff;
          box-shadow: 0 10px 24px rgba(26,107,255,0.5), inset 0 1px 0 rgba(255,255,255,0.3);
          letter-spacing: -0.02em;
        }
        .sb-logo::after {
          content: 'Mayinvest';
          font-weight: 800; font-size: 16px; letter-spacing: -0.02em; color: #fff;
        }

        .sb-section-label { padding: 0 14px 8px; font-size: 10px; font-weight: 700;
          color: rgba(255,255,255,0.35); letter-spacing: 0.14em; text-transform: uppercase;
          margin-top: 4px; }
        .sb-nav { flex: 1; padding: 0 12px; display: flex; flex-direction: column; gap: 2px; }
        .sb-link { display: flex; align-items: center; gap: 12px; padding: 11px 14px; border-radius: 10px;
          background: transparent; border: none; color: rgba(255,255,255,0.7);
          font-size: 14px; font-weight: 600; cursor: pointer; text-align: left; width: 100%;
          transition: all 0.15s; font-family: inherit; position: relative; }
        .sb-link:hover { background: rgba(255,255,255,0.06); color: #fff; }
        .sb-link.on { background: linear-gradient(90deg, rgba(26,107,255,0.25), rgba(26,107,255,0.05));
          color: #fff; }
        .sb-link.on::before { content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%);
          width: 3px; height: 20px; background: #1A6BFF; border-radius: 0 3px 3px 0;
          box-shadow: 0 0 12px rgba(26,107,255,0.8); }
        .sb-link svg { flex-shrink: 0; opacity: 0.75; }
        .sb-link.on svg { opacity: 1; color: #4D8CFF; }
        .sb-footer { padding: 16px 14px 4px; border-top: 1px solid rgba(255,255,255,0.08); }
        .sb-user { font-size: 11.5px; color: rgba(255,255,255,0.5);
          padding: 0 4px 12px; word-break: break-all; font-weight: 500;
          display: flex; align-items: center; gap: 7px; }
        .sb-user::before {
          content: ''; width: 7px; height: 7px; border-radius: 50%; background: #22C55E;
          box-shadow: 0 0 10px rgba(34,197,94,0.6); flex-shrink: 0;
          animation: pulse-sb 2s ease-in-out infinite;
        }
        @keyframes pulse-sb { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .sb-logout { width: 100%; background: transparent; border: 1px solid rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.85); font-size: 13px; font-weight: 700; padding: 12px;
          border-radius: 10px; cursor: pointer; font-family: inherit;
          transition: all 0.15s; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .sb-logout:hover { background: rgba(220,38,38,0.12); border-color: rgba(220,38,38,0.4); color: #FCA5A5; }

        /* ============ MAIN ============ */
        .main { padding: 24px 32px 60px; min-width: 0; }
        @media (max-width: 900px) { .main { padding: 16px 16px 40px; } }

        .top-bar { position: sticky; top: 0; z-index: 40;
          background: rgba(248,250,252,0.9); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
          margin: -24px -32px 24px; padding: 18px 32px;
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          border-bottom: 1px solid var(--border); }
        @media (max-width: 900px) { .top-bar { margin: -16px -16px 20px; padding: 14px 16px; } }
        .burger { display: none; width: 40px; height: 40px; border-radius: 10px; background: #fff;
          border: 1px solid var(--border); cursor: pointer; align-items: center; justify-content: center;
          color: var(--ink); box-shadow: 0 2px 6px rgba(13,27,62,0.04); }
        @media (max-width: 900px) { .burger { display: flex; } }
        .page-title { font-size: 26px; font-weight: 800; letter-spacing: -0.03em;
          margin: 0; flex: 1; color: var(--ink); }

        /* ============ KPI GRID ============ */
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 14px; margin-bottom: 24px; }
        .kpi { background: var(--card); border-radius: 16px; padding: 20px 22px;
          border: 1px solid var(--border); position: relative; overflow: hidden;
          transition: all 0.2s; cursor: default;
          box-shadow: 0 1px 3px rgba(13,27,62,0.04);
          display: flex; flex-direction: column; }
        .kpi:hover { border-color: var(--blue); box-shadow: 0 10px 30px rgba(26,107,255,0.1); transform: translateY(-2px); }
        .kpi::after {
          content: ''; position: absolute; top: 0; right: 0; width: 80px; height: 80px;
          background: radial-gradient(circle at top right, rgba(26,107,255,0.06), transparent 70%);
          pointer-events: none;
        }
        .kpi-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; }
        .kpi-icon { width: 38px; height: 38px; border-radius: 10px; background: var(--blue);
          color: #fff; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 6px 14px rgba(26,107,255,0.3); }
        .kpi-trend { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 100px;
          background: var(--green-soft); color: var(--green); display: flex; align-items: center; gap: 3px; }
        .kpi-l { font-size: 11.5px; color: var(--ink-dim); font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
        .kpi-v { font-size: 36px; font-weight: 800; margin: 0; letter-spacing: -0.03em;
          color: var(--ink); line-height: 1; font-variant-numeric: tabular-nums; }
        .kpi-s { font-size: 12px; color: var(--ink-dim); margin-top: 8px; font-weight: 600;
          padding-top: 8px; border-top: 1px solid var(--border-2); }

        /* ============ FUNNEL / CARDS ============ */
        .funnel, .card { background: var(--card); border-radius: 16px; padding: 24px 26px;
          border: 1px solid var(--border); margin-bottom: 18px;
          box-shadow: 0 1px 3px rgba(13,27,62,0.04); }
        .funnel-h, .card-h { font-size: 17px; font-weight: 800; color: var(--ink); margin: 0 0 22px;
          display: flex; align-items: center; gap: 10px; letter-spacing: -0.02em; }
        .funnel-h svg, .card-h svg { color: var(--blue); flex-shrink: 0; }

        .funnel-row { display: grid; grid-template-columns: 140px 1fr 60px; align-items: center;
          gap: 16px; margin-bottom: 12px; padding: 10px 0; border-bottom: 1px solid var(--border-2); }
        .funnel-row:last-child { border-bottom: none; }
        .funnel-l { font-size: 14px; font-weight: 700; color: var(--ink);
          display: flex; align-items: center; gap: 8px; }
        .funnel-l::before { content: ''; width: 10px; height: 10px; border-radius: 3px;
          background: currentColor; flex-shrink: 0; opacity: 0.7; }
        .funnel-bar { height: 28px; border-radius: 8px; position: relative;
          background: var(--bg-2); overflow: hidden; }
        .funnel-fill { height: 100%; border-radius: 8px;
          display: flex; align-items: center; justify-content: flex-start;
          padding-left: 14px; font-size: 12px; font-weight: 800; color: #fff;
          min-width: 48px; transition: width 0.6s cubic-bezier(0.4,0,0.2,1);
          font-variant-numeric: tabular-nums;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.2); }
        .funnel-count { font-size: 20px; font-weight: 800; color: var(--ink); text-align: right;
          font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }

        /* ============ TOOLBAR ============ */
        .toolbar { display: flex; gap: 10px; margin-bottom: 18px; flex-wrap: wrap; align-items: center; }
        .toolbar input, .toolbar select {
          background: var(--card); border: 1px solid var(--border); border-radius: 12px;
          padding: 12px 16px; font-weight: 500; color: var(--ink); font-size: 14px !important;
          transition: all 0.15s;
        }
        .toolbar input { flex: 1; min-width: 220px; }
        .toolbar input::placeholder { color: var(--ink-mute); }
        .toolbar input:focus, .toolbar select:focus {
          border-color: var(--blue); outline: none;
          box-shadow: 0 0 0 3px rgba(26,107,255,0.1);
        }
        .btn-export { background: var(--ink); color: #fff; border: none;
          padding: 12px 20px; border-radius: 100px; font-weight: 700; font-size: 13px;
          cursor: pointer; display: flex; align-items: center; gap: 8px;
          transition: all 0.15s; font-family: inherit; }
        .btn-export:hover { background: var(--blue); box-shadow: 0 8px 20px rgba(26,107,255,0.3); }

        /* ============ LEAD ROWS ============ */
        .lead-grid { display: grid; gap: 10px; }
        .lead-row { background: var(--card); border-radius: 14px; padding: 16px 20px;
          border: 1px solid var(--border);
          display: grid; grid-template-columns: 1fr auto; gap: 14px; align-items: center;
          cursor: pointer; transition: all 0.15s; }
        .lead-row:hover { border-color: var(--blue); box-shadow: 0 6px 20px rgba(26,107,255,0.08); transform: translateY(-1px); }
        .lead-l { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
        .lead-name { font-size: 15px; font-weight: 700; color: var(--ink);
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap; letter-spacing: -0.01em; }
        .lead-badge { font-size: 10px; padding: 3px 9px; border-radius: 100px;
          font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
        .lead-meta { font-size: 12.5px; color: var(--ink-dim); font-weight: 500; }
        .lead-r { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .lead-score { background: var(--blue-soft); color: var(--blue);
          font-size: 14px; font-weight: 800;
          padding: 7px 13px; border-radius: 10px; min-width: 50px; text-align: center;
          font-variant-numeric: tabular-nums; }
        .lead-score.hi { background: var(--green-soft); color: var(--green); }
        .lead-score.lo { background: var(--red-soft); color: var(--red); }
        .lead-statut-sel { background: var(--card); border: 1px solid var(--border);
          border-radius: 10px; padding: 8px 12px; font-size: 12px; font-weight: 600;
          cursor: pointer; color: var(--ink); font-family: inherit; }
        .msg-badge { background: var(--red); color: #fff;
          font-size: 10.5px; font-weight: 800; padding: 3px 8px; border-radius: 100px;
          min-width: 20px; text-align: center; }

        .empty { text-align: center; padding: 80px 20px; color: var(--ink-mute);
          font-size: 14px; font-weight: 500; }
        .empty-icon { width: 56px; height: 56px; border-radius: 16px; background: var(--bg-2);
          display: inline-flex; align-items: center; justify-content: center;
          color: var(--ink-mute); margin-bottom: 14px; }

        /* ============ DRAWER ============ */
        .drawer-ovr { position: fixed; inset: 0; background: rgba(13,27,62,0.5);
          backdrop-filter: blur(6px); z-index: 200; display: flex; justify-content: flex-end; }
        .drawer { background: var(--card); width: 100%; max-width: 580px; height: 100vh;
          overflow-y: auto; animation: slideIn 0.3s cubic-bezier(0.4,0,0.2,1);
          box-shadow: -20px 0 60px rgba(13,27,62,0.15); }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .dr-head { padding: 26px 28px 20px; border-bottom: 1px solid var(--border);
          position: sticky; top: 0; background: var(--card); z-index: 1; }
        .dr-close { position: absolute; top: 20px; right: 20px;
          background: var(--bg); border: 1px solid var(--border); width: 36px; height: 36px;
          border-radius: 50%; font-size: 18px; cursor: pointer; color: var(--ink-dim);
          transition: all 0.15s; display: flex; align-items: center; justify-content: center; }
        .dr-close:hover { background: var(--red-soft); color: var(--red); border-color: var(--red); }
        .dr-name { font-size: 22px; font-weight: 800; margin: 0 40px 6px 0;
          letter-spacing: -0.02em; color: var(--ink); }
        .dr-code { font-size: 11.5px; color: var(--ink-dim); letter-spacing: 0.05em;
          text-transform: uppercase; font-weight: 600; }
        .dr-tabs { display: flex; gap: 4px; padding: 0 28px; border-bottom: 1px solid var(--border); }
        .dr-tab { padding: 14px 16px; font-size: 13px; font-weight: 700; color: var(--ink-dim);
          background: transparent; border: none; cursor: pointer; border-bottom: 2px solid transparent;
          font-family: inherit; transition: all 0.15s; }
        .dr-tab:hover { color: var(--ink); }
        .dr-tab.on { color: var(--blue); border-color: var(--blue); }
        .dr-body { padding: 24px 28px 40px; }
        .dr-section { margin-bottom: 24px; }
        .dr-s-h { font-size: 11px; color: var(--blue); font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 14px;
          display: flex; align-items: center; gap: 8px; }
        .dr-s-h::before { content: ''; width: 4px; height: 12px; background: var(--blue); border-radius: 2px; }
        .dr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 500px) { .dr-grid { grid-template-columns: 1fr; } }
        .dr-field { padding: 12px 14px; background: var(--bg); border-radius: 12px; border: 1px solid var(--border-2); }
        .dr-k { font-size: 10.5px; color: var(--ink-mute); font-weight: 700;
          letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 4px; }
        .dr-v { font-size: 14px; font-weight: 600; color: var(--ink); word-break: break-word; }
        .dr-wa { background: #25D366; color: #fff; border: none;
          padding: 12px 20px; border-radius: 100px;
          font-weight: 700; font-size: 13px; cursor: pointer;
          display: inline-flex; align-items: center; gap: 8px; margin-top: 10px;
          font-family: inherit;
          box-shadow: 0 8px 20px rgba(37,211,102,0.3);
          transition: all 0.15s; }
        .dr-wa:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(37,211,102,0.4); }

        /* ============ CHAT ============ */
        .chat-wrap { display: flex; flex-direction: column; height: 60vh; min-height: 400px; }
        .chat-scroll { flex: 1; overflow-y: auto; padding: 12px 0;
          display: flex; flex-direction: column; gap: 10px; }
        .msg { max-width: 78%; padding: 11px 15px; border-radius: 16px; font-size: 14px;
          line-height: 1.45; word-break: break-word; }
        .msg.admin { align-self: flex-end; background: var(--blue); color: #fff;
          border-bottom-right-radius: 4px; }
        .msg.client { align-self: flex-start; background: var(--bg-2);
          color: var(--ink); border-bottom-left-radius: 4px; }
        .msg-meta { font-size: 10.5px; margin-top: 4px; opacity: 0.65;
          text-align: right; font-weight: 500; }
        .msg.client .msg-meta { text-align: left; }
        .chat-form { display: flex; gap: 8px; padding: 10px 10px 10px 14px;
          border: 1px solid var(--border); border-radius: 16px; margin-top: 10px;
          background: var(--card); transition: all 0.15s; }
        .chat-form:focus-within { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(26,107,255,0.1); }
        .chat-form textarea { flex: 1; border: none; outline: none; resize: none;
          min-height: 20px; max-height: 100px; font-family: inherit; font-size: 14px !important;
          color: var(--ink); background: transparent; }
        .chat-send-btn { background: var(--blue); color: #fff; border: none;
          width: 42px; height: 42px; border-radius: 12px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; transition: all 0.15s;
          box-shadow: 0 4px 10px rgba(26,107,255,0.3); }
        .chat-send-btn:hover:not(:disabled) { background: var(--blue-dark); transform: translateY(-1px); }
        .chat-send-btn:disabled { background: var(--border); color: var(--ink-mute); box-shadow: none; }
        .chat-empty { color: var(--ink-mute); text-align: center; padding: 40px 10px;
          font-size: 13px; font-weight: 500; }

        /* ============ TOAST ============ */
        .toast { position: fixed; top: 20px; right: 20px;
          background: var(--ink); color: #fff; padding: 16px 20px; border-radius: 14px;
          box-shadow: 0 20px 40px rgba(13,27,62,0.3); z-index: 300;
          display: flex; align-items: center; gap: 12px;
          animation: toastIn 0.35s cubic-bezier(0.4,0,0.2,1); max-width: 360px; }
        @keyframes toastIn { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .toast-sc { background: var(--blue); color: #fff;
          border-radius: 10px; padding: 8px 12px;
          font-weight: 800; font-size: 14px; flex-shrink: 0;
          font-variant-numeric: tabular-nums; }
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
            <div className="sb-user">{session.email}</div>
            <button className="sb-logout" onClick={logout}>
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                <path d="M8 15l5-5-5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13 10H3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M9 3h7v14H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
              </svg>
              Déconnexion
            </button>
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
  const KPI_ICONS = {
    today: <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="2.5" y="4" width="15" height="13" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M2.5 8h15M7 2v3M13 2v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><circle cx="10" cy="12.5" r="1.5" fill="currentColor"/></svg>,
    week: <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="2.5" y="4" width="15" height="13" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M2.5 8h15M7 2v3M13 2v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M6 11h2M9 11h2M12 11h2M6 14h2M9 14h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
    month: <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="2.5" y="4" width="15" height="13" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M2.5 8h15M7 2v3M13 2v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M6 11.5h8M6 14h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
    total: <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
    check: <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.6"/><path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    funnel: <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M2.5 3.5h15l-5.5 7v6l-4 1.5v-7.5l-5.5-7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
  }
  return (
    <>
      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-head">
            <div className="kpi-icon">{KPI_ICONS.today}</div>
          </div>
          <div className="kpi-l">Aujourd'hui</div>
          <div className="kpi-v">{kpi.jj}</div>
          <div className="kpi-s">nouveaux leads</div>
        </div>
        <div className="kpi">
          <div className="kpi-head">
            <div className="kpi-icon">{KPI_ICONS.week}</div>
          </div>
          <div className="kpi-l">7 jours</div>
          <div className="kpi-v">{kpi.j7}</div>
          <div className="kpi-s">leads cumulés</div>
        </div>
        <div className="kpi">
          <div className="kpi-head">
            <div className="kpi-icon">{KPI_ICONS.month}</div>
          </div>
          <div className="kpi-l">30 jours</div>
          <div className="kpi-v">{kpi.j30}</div>
          <div className="kpi-s">leads cumulés</div>
        </div>
        <div className="kpi">
          <div className="kpi-head">
            <div className="kpi-icon" style={{ background: '#0D1B3E' }}>{KPI_ICONS.total}</div>
          </div>
          <div className="kpi-l">Total</div>
          <div className="kpi-v">{total}</div>
          <div className="kpi-s">tous dossiers</div>
        </div>
        <div className="kpi">
          <div className="kpi-head">
            <div className="kpi-icon" style={{ background: '#16A34A' }}>{KPI_ICONS.check}</div>
          </div>
          <div className="kpi-l">Financés</div>
          <div className="kpi-v" style={{ color: '#16A34A' }}>{kpi.finances}</div>
          <div className="kpi-s">conversion {kpi.conv}%</div>
        </div>
      </div>

      <div className="funnel">
        <h3 className="funnel-h">{KPI_ICONS.funnel} Entonnoir de conversion</h3>
        {funnel.map((f: any) => {
          const pct = total ? (f.count / total) * 100 : 0
          return (
            <div key={f.statut} className="funnel-row">
              <div className="funnel-l" style={{ color: f.color.fg }}>{f.statut}</div>
              <div className="funnel-bar">
                <div className="funnel-fill" style={{ width: `${Math.max(pct, 3)}%`, background: f.color.fg }}>
                  {pct > 8 ? `${Math.round(pct)}%` : ''}
                </div>
              </div>
              <div className="funnel-count">{f.count}</div>
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
  const [tab, setTab] = useState<'infos' | 'chat' | 'docs'>('infos')
  const [messages, setMessages] = useState<any[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [documents, setDocuments] = useState<any[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const chatEnd = useRef<HTMLDivElement>(null)

  async function loadDocuments() {
    setDocsLoading(true)
    const { data } = await supabase.rpc('get_lead_documents', { p_id: lead.id })
    if (data) setDocuments(data)
    setDocsLoading(false)
  }

  async function validateDocument(docId: string) {
    await supabase.from('documents').update({ status: 'validated', admin_note: null }).eq('id', docId)
    loadDocuments()
  }
  async function rejectDocument(docId: string) {
    const note = prompt('Raison du rejet (visible par le client) :')
    if (!note) return
    await supabase.from('documents').update({ status: 'rejected', admin_note: note }).eq('id', docId)
    loadDocuments()
  }
  async function requestDocument() {
    const label = prompt('Nom du document à demander :')
    if (!label) return
    await supabase.from('documents').insert({
      lead_id: lead.id,
      doc_type: 'autre',
      doc_label: label,
      status: 'pending',
    })
    loadDocuments()
  }

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
    loadDocuments()
    const chan = supabase.channel(`drawer-${lead.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `lead_id=eq.${lead.id}` },
        (payload) => setMessages(p => [...p, payload.new]))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents', filter: `lead_id=eq.${lead.id}` },
        () => loadDocuments())
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
          <button className={`dr-tab ${tab === 'infos' ? 'on' : ''}`} onClick={() => setTab('infos')}>Infos</button>
          <button className={`dr-tab ${tab === 'chat' ? 'on' : ''}`} onClick={() => setTab('chat')}>
            Discussion {messages.filter(m => m.sender === 'client' && !m.read_at).length > 0 && <span className="msg-badge" style={{ marginLeft: 4 }}>{messages.filter(m => m.sender === 'client' && !m.read_at).length}</span>}
          </button>
          <button className={`dr-tab ${tab === 'docs' ? 'on' : ''}`} onClick={() => setTab('docs')}>
            Documents {documents.filter(d => d.status === 'uploaded').length > 0 && <span className="msg-badge" style={{ marginLeft: 4, background: '#FFB020' }}>{documents.filter(d => d.status === 'uploaded').length}</span>}
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

          {tab === 'docs' && (
            <div>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 10 }}>
                {documents.filter(d => d.status === 'validated').length} validés · {documents.filter(d => d.status === 'uploaded').length} à valider · {documents.filter(d => d.status === 'pending').length} en attente
              </div>
              {docsLoading && <div style={{ color: '#999', textAlign: 'center', padding: 20 }}>Chargement…</div>}
              {!docsLoading && documents.length === 0 && <div style={{ color: '#999', textAlign: 'center', padding: 20 }}>Aucun document.</div>}
              {documents.map(d => {
                const isUploaded = d.status === 'uploaded'
                const isValidated = d.status === 'validated'
                const isRejected = d.status === 'rejected'
                const isPending = d.status === 'pending'
                const isImage = d.mime_type?.startsWith('image/')
                const isPdf = d.mime_type === 'application/pdf'
                const statusColor = isValidated ? '#166534' : isUploaded ? '#B45309' : isRejected ? '#991B1B' : '#6B7280'
                const statusBg = isValidated ? '#DCFCE7' : isUploaded ? '#FFF4E5' : isRejected ? '#FEE2E2' : '#F3F4F6'
                return (
                  <div key={d.id} style={{ background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14, padding: 14, marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0D1B3E', marginBottom: 4 }}>{d.doc_label}</div>
                        <span style={{ display: 'inline-block', background: statusBg, color: statusColor, fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 100 }}>
                          {isValidated ? '✓ Validé' : isUploaded ? '📄 À valider' : isRejected ? '✗ Rejeté' : '⌛ En attente'}
                        </span>
                        {d.admin_note && <div style={{ fontSize: 11, color: '#991B1B', marginTop: 6, fontStyle: 'italic' }}>Note : {d.admin_note}</div>}
                      </div>
                    </div>
                    {d.file_url && (
                      <div style={{ marginBottom: 10 }}>
                        {isImage ? (
                          <a href={d.file_url} target="_blank" rel="noopener">
                            <img src={d.file_url} alt={d.file_name} style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, cursor: 'zoom-in', display: 'block' }}/>
                          </a>
                        ) : (
                          <a href={d.file_url} target="_blank" rel="noopener" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: '#F8FAFC', border: '1.5px solid #E5E7EB', borderRadius: 10, textDecoration: 'none', color: '#0D1B3E' }}>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: isPdf ? '#DC2626' : '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm0 7V3.5L18.5 9H14z"/></svg>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.file_name}</div>
                              <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{d.file_size ? (d.file_size/1024).toFixed(0) + ' Ko' : ''} · Cliquez pour ouvrir</div>
                            </div>
                          </a>
                        )}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {isUploaded && <>
                        <button onClick={() => validateDocument(d.id)} style={{ background: '#166534', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, padding: '8px 14px', borderRadius: 100, cursor: 'pointer' }}>✓ Valider</button>
                        <button onClick={() => rejectDocument(d.id)} style={{ background: '#DC2626', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, padding: '8px 14px', borderRadius: 100, cursor: 'pointer' }}>✗ Rejeter</button>
                      </>}
                      {isValidated && <button onClick={() => rejectDocument(d.id)} style={{ background: 'transparent', color: '#DC2626', border: '1.5px solid #DC2626', fontSize: 12, fontWeight: 700, padding: '8px 14px', borderRadius: 100, cursor: 'pointer' }}>Rejeter</button>}
                      {isRejected && <button onClick={() => validateDocument(d.id)} style={{ background: '#166534', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, padding: '8px 14px', borderRadius: 100, cursor: 'pointer' }}>Finalement valider</button>}
                      {isPending && <span style={{ color: '#999', fontSize: 12, fontStyle: 'italic' }}>En attente de l'upload du client</span>}
                    </div>
                  </div>
                )
              })}
              <button onClick={requestDocument} style={{ background: '#1A6BFF', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, padding: '10px 16px', borderRadius: 100, cursor: 'pointer', width: '100%', marginTop: 6 }}>
                + Demander un document supplémentaire
              </button>
            </div>
          )}

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
