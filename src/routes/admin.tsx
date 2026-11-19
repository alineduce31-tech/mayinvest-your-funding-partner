import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, useRef, useMemo, Suspense } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { ArrowUpRight, Users, CheckCircle2, AlertTriangle, FileText, Landmark, Wallet, BarChart3, Coins, Flame, Briefcase, AlertOctagon, Target, MessageCircle, Copy, ChevronDown, ChevronUp, Crown, User, Phone, Mail, Check, X, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { dashboardMetrics, periodBounds, matchesPriority, isCompany, opportunity, amount, xaf, pct, type DashboardLead, type DashboardPeriod, type PriorityFilter } from '@/lib/admin-dashboard'
import { supabase } from '@/integrations/supabase/client'
import { Logo } from '@/components/Logo'
import { LEAD_ACTIONS, buildWhatsappUrl, fillTemplate, LIFECYCLE_STATUTS, STATUT_COLORS } from '@/lib/lead-templates'

// Estimates: Pack Formalisation = 500 000 XAF; dual credit/impact threshold = 5 000 000 XAF.
// See admin-dashboard.ts for cohort, date and financed-status proxies.
export const Route = createFileRoute('/admin')({
  validateSearch: (search: Record<string, unknown>): { view?: 'crm' | undefined; priority?: PriorityFilter | undefined } => ({
    view: search['view'] === 'crm' ? 'crm' : undefined,
    priority: ['ready', 'impact', 'followup'].includes(String(search['priority'])) ? search['priority'] as PriorityFilter : undefined,
  }),
  head: () => ({ meta: [
    { title: 'Dashboard stratégique · Mayinvest PréSelect' },
    { name: 'description', content: 'Pilotage commercial et impact des dossiers Mayinvest PréSelect.' },
    { property: 'og:title', content: 'Dashboard stratégique · Mayinvest PréSelect' },
    { property: 'og:description', content: 'Pilotage commercial et impact des dossiers Mayinvest PréSelect.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  component: AdminGate,
})

/* ============================================================
 * HELPERS
 * ============================================================ */
// Cycle de vie officiel du cahier des charges (10 statuts)
const STATUSES = LIFECYCLE_STATUTS
// Palette pipeline centralisée dans lead-templates.ts
const STATUS_COLORS = STATUT_COLORS
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
  const dashboardSearch = Route.useSearch()
  const [page, setPage] = useState<Page>(dashboardSearch.view === 'crm' ? 'crm' : 'general')
  useEffect(() => { if (dashboardSearch.view === 'crm') setPage('crm') }, [dashboardSearch.view, dashboardSearch.priority])
  const [leads, setLeads] = useState<any[]>([])
  const [msgCounts, setMsgCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('')
  const [filterActivite, setFilterActivite] = useState<string>('')
  const [filterAgent, setFilterAgent] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [teamMembers, setTeamMembers] = useState<any[]>([])

  // Role-based access : commercial ne voit que ses leads assignés
  const isDirector = session?.role === 'director'
  const isCommercial = session?.role === 'commercial'
  const [selectedLead, setSelectedLead] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toast, setToast] = useState<{ msg: string; score: number } | null>(null)

  async function loadLeads() {
    let query = supabase.from('leads').select('*').order('created_at', { ascending: false })
    // Commercial : filtre auto les leads qui lui sont assignés
    if (isCommercial && session?.id) {
      query = query.eq('agent_commercial_id', session.id)
    }
    const { data } = await query
    if (data) setLeads(data)
    const { data: msgs } = await supabase.from('messages').select('lead_id').eq('sender', 'client').is('read_at', null)
    const counts: Record<string, number> = {}
    msgs?.forEach(m => { counts[m.lead_id] = (counts[m.lead_id] || 0) + 1 })
    setMsgCounts(counts)
    setLoading(false)
  }

  // Charger la liste des membres de l'équipe (pour assignation)
  async function loadTeam() {
    const { data } = await supabase.rpc('list_admin_users')
    if (data) setTeamMembers(data)
  }

  useEffect(() => { loadTeam() }, [])

  async function assignLead(leadId: string, agentId: string | null) {
    const { error } = await supabase.rpc('assign_lead_agent', { p_lead_id: leadId, p_agent_id: agentId })
    if (!error) {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, agent_commercial_id: agentId } : l))
      if (selectedLead?.id === leadId) setSelectedLead({ ...selectedLead, agent_commercial_id: agentId })
    }
  }

  useEffect(() => {
    if (page !== 'general') loadLeads()
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

  useEffect(() => { if (page !== 'general') loadLeads() }, [page])

  async function updateStatut(id: string, statut: string) {
    const { error } = await supabase.from('leads').update({ statut, updated_at: new Date().toISOString() }).eq('id', id)
    if (!error) setLeads(prev => prev.map(l => l.id === id ? { ...l, statut } : l))
  }

  function logout() {
    try { localStorage.removeItem('mayinvest_admin_session') } catch {}
    navigate({ to: '/mon-espace' })
  }

  // Liste unique des activités pour le filtre
  const activitesList = useMemo(() => {
    const set = new Set<string>()
    leads.forEach(l => { if (l.activite) set.add(l.activite) })
    return Array.from(set).sort()
  }, [leads])

  // Filtering avec date range + activité + statut + type + agent commercial
  const filtered = useMemo(() => {
    const dFrom = dateFrom ? new Date(dateFrom).getTime() : 0
    const dTo = dateTo ? new Date(dateTo).getTime() + 86400000 : Infinity
    return leads.filter(l => {
      if (page === 'crm' && !matchesPriority(l, dashboardSearch.priority || '', Date.now())) return false
      if (filterStatut && l.statut !== filterStatut) return false
      if (filterType && l.type !== filterType) return false
      if (filterActivite && l.activite !== filterActivite) return false
      if (filterAgent) {
        if (filterAgent === 'none' && l.agent_commercial_id) return false
        if (filterAgent !== 'none' && l.agent_commercial_id !== filterAgent) return false
      }
      const created = Date.parse(l.created_at)
      if (created < dFrom || created > dTo) return false
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
  }, [leads, search, filterStatut, filterType, filterActivite, filterAgent, dateFrom, dateTo, page, dashboardSearch.priority])

  function resetFilters() {
    setSearch(''); setFilterStatut(''); setFilterType(''); setFilterActivite(''); setFilterAgent(''); setDateFrom(''); setDateTo('')
  }

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

  // Export Excel natif .xlsx avec formatage (charge SheetJS depuis CDN à la volée)
  async function exportExcel() {
    // Charge SheetJS depuis CDN si pas déjà chargé
    const w = window as any
    if (!w.XLSX) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Impossible de charger SheetJS'))
        document.head.appendChild(script)
      })
    }
    const XLSX = w.XLSX
    if (!XLSX) { alert('Librairie Excel non disponible'); return }

    // Prépare les données
    const headers = ['Date création', 'Type', 'Activité', 'Nom', 'Prénom/Dirigeant', 'Téléphone', 'Email', 'Ville', 'Montant XAF', 'Banque', 'RCCM', 'Flux mensuel', 'Score /100', 'Statut', 'Code accès', 'Créé le']
    const rows = filtered.map((l: any) => [
      new Date(l.created_at),
      l.type || '',
      l.activite || '',
      l.identite?.nom || l.situation?.raison_sociale || '',
      l.identite?.prenom || l.situation?.dirigeant || '',
      l.identite?.tel || '',
      l.identite?.email || '',
      l.ville || '',
      Number(l.montant_demande) || 0,
      l.banque_actuelle || '',
      l.rccm || '',
      Number(l.flux_mensuel) || 0,
      Number(l.score) || 0,
      l.statut || '',
      l.access_code || '',
      new Date(l.created_at).toLocaleString('fr-FR'),
    ])

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

    // Largeurs de colonnes
    ws['!cols'] = [
      { wch: 20 }, { wch: 12 }, { wch: 20 }, { wch: 18 }, { wch: 18 },
      { wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
      { wch: 8 }, { wch: 14 }, { wch: 10 }, { wch: 18 }, { wch: 12 }, { wch: 18 }
    ]

    // Format en-tête : bold + fond bleu + police blanche
    const headerStyle = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1A6BFF' } },
      alignment: { horizontal: 'left', vertical: 'center' }
    }
    for (let c = 0; c < headers.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c })
      if (ws[addr]) ws[addr].s = headerStyle
    }

    // Figer la 1ère ligne + activer autofilter
    ws['!freeze'] = { xSplit: 0, ySplit: 1 }
    ws['!autofilter'] = { ref: `A1:P${rows.length + 1}` }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Leads Mayinvest')

    // Métadonnées
    wb.Props = {
      Title: 'Mayinvest PréSelect · Export Leads',
      Author: 'Mayinvest',
      CreatedDate: new Date(),
    }

    const filename = `mayinvest-leads-${new Date().toISOString().slice(0, 10)}.xlsx`
    XLSX.writeFile(wb, filename)
  }

  // Export PDF via nouvelle fenêtre + impression navigateur (pas besoin de lib externe)
  function exportPDF() {
    const activeFilters: string[] = []
    if (filterStatut) activeFilters.push(`Statut: ${filterStatut}`)
    if (filterType) activeFilters.push(`Type: ${filterType}`)
    if (filterActivite) activeFilters.push(`Activité: ${filterActivite}`)
    if (dateFrom) activeFilters.push(`Du: ${dateFrom}`)
    if (dateTo) activeFilters.push(`Au: ${dateTo}`)
    if (search) activeFilters.push(`Recherche: "${search}"`)
    const filterLabel = activeFilters.length ? activeFilters.join(' · ') : 'Tous les leads'
    const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

    const rowsHtml = filtered.map(l => {
      const nom = l.identite?.nom || l.situation?.raison_sociale || '—'
      const prenom = l.identite?.prenom || l.situation?.dirigeant || ''
      const tel = l.identite?.tel || '—'
      const montant = l.montant_demande ? Number(l.montant_demande).toLocaleString('fr-FR') + ' XAF' : '—'
      const color = STATUS_COLORS[l.statut] || { bg: '#F1F5F9', fg: '#475569' }
      return `<tr>
        <td>${new Date(l.created_at).toLocaleDateString('fr-FR')}</td>
        <td><strong>${prenom} ${nom}</strong><br/><small>${l.type || ''}</small></td>
        <td>${l.activite || '—'}</td>
        <td>${l.ville || '—'}</td>
        <td>${tel}</td>
        <td style="text-align:right">${montant}</td>
        <td><strong>${l.score ?? 0}/100</strong></td>
        <td><span style="background:${color.bg};color:${color.fg};padding:4px 8px;border-radius:999px;font-size:11px;font-weight:700">${l.statut}</span></td>
      </tr>`
    }).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Mayinvest Leads · ${today}</title>
      <style>
        @page { size: A4 landscape; margin: 12mm; }
        body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #0D1B3E; margin: 0; padding: 20px; }
        .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 16px; border-bottom: 3px solid #1A6BFF; margin-bottom: 20px; }
        .logo { font-size: 24px; font-weight: 800; color: #1A6BFF; letter-spacing: -0.02em; }
        .logo-sub { font-size: 12px; color: #64748B; margin-top: 4px; font-weight: 500; }
        .date { font-size: 13px; color: #64748B; font-weight: 600; text-align: right; }
        .meta { background: #F8FAFC; border-left: 4px solid #1A6BFF; padding: 12px 16px; margin-bottom: 16px; border-radius: 6px; font-size: 12px; color: #334155; }
        .meta strong { color: #0D1B3E; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #0D1B3E; color: #fff; padding: 10px 8px; text-align: left; font-weight: 700; letter-spacing: 0.02em; text-transform: uppercase; font-size: 10px; }
        th:last-child, td:last-child { text-align: center; }
        td { padding: 10px 8px; border-bottom: 1px solid #E2E8F0; vertical-align: top; }
        tr:nth-child(even) { background: #F8FAFC; }
        small { color: #64748B; font-size: 10px; }
        .footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid #E2E8F0; font-size: 10px; color: #94A3B8; text-align: center; font-weight: 500; }
        .footer strong { color: #1A6BFF; }
      </style>
      </head><body>
      <div class="header">
        <div>
          <div class="logo">Mayinvest</div>
          <div class="logo-sub">PréSelect · Rapport Leads</div>
        </div>
        <div class="date">${today}<br/><small>${filtered.length} lead${filtered.length > 1 ? 's' : ''}</small></div>
      </div>
      <div class="meta"><strong>Filtres actifs :</strong> ${filterLabel}</div>
      <table>
        <thead><tr>
          <th>Créé le</th><th>Nom</th><th>Activité</th><th>Ville</th><th>Téléphone</th><th>Montant</th><th>Score</th><th>Statut</th>
        </tr></thead>
        <tbody>${rowsHtml || '<tr><td colspan="8" style="text-align:center;padding:40px;color:#94A3B8;font-style:italic">Aucun lead correspondant aux filtres</td></tr>'}</tbody>
      </table>
      <div class="footer">
        Rapport généré automatiquement par <strong>Mayinvest PréSelect</strong> · preselect.mayinvest.cg · +242 06 53 13 187
      </div>
      <script>window.onload = () => { setTimeout(() => window.print(), 300) }</script>
      </body></html>`
    const w = window.open('', '_blank')
    if (!w) { alert("Impossible d'ouvrir la fenêtre. Autorise les popups."); return }
    w.document.write(html); w.document.close()
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
        .btn-export.btn-pdf { background: #DC2626; }
        .btn-export.btn-pdf:hover { background: #B91C1C; box-shadow: 0 8px 20px rgba(220,38,38,0.3); }
        .btn-export.btn-xlsx { background: #15803D; }
        .btn-export.btn-xlsx:hover { background: #166534; box-shadow: 0 8px 20px rgba(21,128,61,0.3); }
        .sd-empty-banner { background: linear-gradient(90deg, #FEF3C7, #FDE68A); color: #92400E; padding: 12px 20px; border-radius: 10px; font-size: 13px; font-weight: 600; margin-bottom: 20px; border-left: 4px solid #F59E0B; }
        .export-group { display: flex; gap: 8px; }

        /* Filtres avancés */
        .toolbar-advanced { background: #FFFFFF; padding: 14px; border: 1px solid var(--border); border-radius: 14px; }
        .toolbar-advanced .date-range { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ink-dim); font-weight: 600; }
        .toolbar-advanced .date-range input[type="date"] { padding: 10px 12px; font-size: 13px !important; }
        .toolbar-advanced .date-range label { font-weight: 600; color: var(--ink-dim); }
        .btn-reset { background: var(--red-soft); color: var(--red); border: 1px solid var(--red); padding: 10px 16px; border-radius: 100px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .btn-reset:hover { background: var(--red); color: #fff; }
        .crm-stats { padding: 10px 14px; background: var(--blue-soft); color: var(--blue); border-radius: 10px; font-size: 12px; font-weight: 600; margin-bottom: 14px; }

        /* Badge agent commercial sur lead-row */
        .lead-agent { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; background: var(--green-soft); color: var(--green); margin-left: 4px; }
        .lead-agent.lead-agent-none { background: var(--amber-soft); color: var(--amber); }

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
            <div style={{ fontSize: 10, color: isDirector ? '#B45309' : '#0F766E', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0 4px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {isDirector ? <><Crown size={13} strokeWidth={1.75}/> Directeur</> : <><User size={13} strokeWidth={1.75}/> Commercial</>}
            </div>
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
            {page !== 'general' && <h1 className="page-title">{NAV.find(n => n.k === page)?.label}</h1>}
          </div>

          {page === 'general' && <DashboardView onOpen={setSelectedLead}/>}
          {page !== 'general' && (loading ? <div className="empty">Chargement…</div> : <>
            {page === 'crm' && dashboardSearch.priority && <div className="sd-filter-notice">Filtre prioritaire actif <Button variant="link" onClick={() => navigate({ to: '/admin', search: { view: 'crm' } })}>Effacer</Button></div>}
            {page === 'crm' && <CRMView leads={filtered} msgCounts={msgCounts} search={search} setSearch={setSearch} filterStatut={filterStatut} setFilterStatut={setFilterStatut} filterType={filterType} setFilterType={setFilterType} filterActivite={filterActivite} setFilterActivite={setFilterActivite} filterAgent={filterAgent} setFilterAgent={setFilterAgent} dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo} activitesList={activitesList} teamMembers={teamMembers} resetFilters={resetFilters} onOpen={setSelectedLead} updateStatut={updateStatut} exportCSV={exportCSV} exportPDF={exportPDF} exportExcel={exportExcel} isDirector={isDirector}/>}
            {page === 'segments' && <SegmentsView leads={leads}/>}
            {page === 'bancarisation' && <BancarisationView leads={leads} onOpen={setSelectedLead}/>}
            {page === 'non-eligibles' && <NonEligiblesView leads={leads} onOpen={setSelectedLead}/>}
            {page === 'rapports' && <RapportsView leads={leads} exportCSV={exportCSV}/>}
          </>)}
        </main>
      </div>

      {/* DRAWER DÉTAIL LEAD */}
      {selectedLead && (
        <LeadDrawer
          lead={selectedLead}
          onClose={() => { setSelectedLead(null); loadLeads() }}
          onStatutChange={(s: string) => { updateStatut(selectedLead.id, s); setSelectedLead({ ...selectedLead, statut: s }) }}
          msgCount={msgCounts[selectedLead.id] || 0}
          onMsgRead={() => setMsgCounts(c => ({ ...c, [selectedLead.id]: 0 }))}
          teamMembers={teamMembers}
          onAssignAgent={(agentId: string | null) => assignLead(selectedLead.id, agentId)}
          isDirector={isDirector}
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

function DashboardView({ onOpen }: { onOpen: (lead: DashboardLead) => void }) {
  const [period, setPeriod] = useState<DashboardPeriod>('30j')
  const [now] = useState(() => Date.now())
  return <section className="strategic-dashboard">
    <header className="sd-header">
      <div><h1>Dashboard stratégique</h1><p>Pilotage commercial et impact</p></div>
      <div className="sd-seg" role="group" aria-label="Période">
        {(['7j', '30j', '90j', 'YTD'] as const).map(p => (
          <button
            key={p}
            type="button"
            className={p === period ? 'active' : ''}
            aria-pressed={p === period}
            onClick={() => setPeriod(p)}
          >{p}</button>
        ))}
      </div>
    </header>
    <Suspense fallback={<DashboardSkeleton />}><DashboardContent period={period} now={now} onOpen={onOpen}/></Suspense>
  </section>
}

function DashboardSkeleton() {
  return <div className="sd-grid" aria-label="Chargement du dashboard" role="status">{Array.from({ length: 8 }, (_, i) => <div className="sd-skeleton" key={i}/>)}</div>
}

function DashboardContent({ period, now, onOpen }: { period: DashboardPeriod; now: number; onOpen: (lead: DashboardLead) => void }) {
  const navigate = useNavigate()
  const bounds = periodBounds(period, now)
  const { data: rows } = useSuspenseQuery({
    queryKey: ['admin-strategic-dashboard-v3', period, now],
    queryFn: async () => {
      const { data, error } = await supabase.from('leads').select('*')
        .gte('created_at', new Date(bounds.previousStart).toISOString())
        .lte('created_at', new Date(bounds.end).toISOString())
        .order('created_at', { ascending: false }).limit(10000)
      if (error) throw new Error('Impossible de charger les dossiers.')
      return (data ?? []) as DashboardLead[]
    },
    staleTime: 60000,
  })
  const m = useMemo(() => dashboardMetrics(rows, period, now), [rows, period, now])
  const number = (n: number) => new Intl.NumberFormat('fr-FR').format(n)
  const showCRM = (filter: PriorityFilter) => navigate({ to: '/admin', search: { view: 'crm', priority: filter } })

  const isEmpty = m.current.length === 0

  // BLOC 1 · KPI GÉNÉRAUX avec Commission 2%
  const bloc1Cards = [
    { icon: <Users size={18} strokeWidth={1.75}/>, label: 'Total Leads', value: number(m.bloc1.total), detail: 'Sur la période' },
    { icon: <CheckCircle2 size={18} strokeWidth={1.75}/>, label: 'Éligibles Banque', value: number(m.bloc1.eligibles), detail: pct(m.bloc1.pctEligibles), tone: 'positive' },
    { icon: <AlertTriangle size={18} strokeWidth={1.75}/>, label: 'Non Éligibles', value: number(m.bloc1.nonEligibles), detail: pct(m.bloc1.pctNonEligibles), tone: 'warning' },
    { icon: <FileText size={18} strokeWidth={1.75}/>, label: 'Dossiers Déposés', value: number(m.bloc1.deposes), detail: 'Statut Dossier Déposé' },
    { icon: <Landmark size={18} strokeWidth={1.75}/>, label: 'Financés + Comm. 2%', value: number(m.bloc1.finances), detail: `${xaf(m.bloc1.caCommissionCredit)} · Taux : ${pct(m.bloc1.tauxTransfo)}`, tone: 'positive' },
    { icon: <Wallet size={18} strokeWidth={1.75}/>, label: 'CA Total Mayinvest', value: xaf(m.bloc1.caTotal), detail: `Impact : ${xaf(m.bloc1.caImpactPotentiel)} · Crédit : ${xaf(m.bloc1.caCommissionCredit)}`, tone: 'positive' },
  ]

  return <>
    {isEmpty && (
      <div className="sd-empty-card" role="status">
        <div className="sd-empty-icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
        </div>
        <div className="sd-empty-body">
          <div className="sd-empty-title">Aucun lead sur la période sélectionnée</div>
          <div className="sd-empty-sub">Les métriques affichent 0. Essaie une période plus large (90j ou YTD).</div>
        </div>
      </div>
    )}
    <section className="sd-pole bloc1"><h2>Bloc 1 · KPI généraux <span>· Impact + Commission 2% sur crédits</span></h2>
      <div className="sd-grid">{bloc1Cards.map(card => <StrategicKPI key={card.label} {...card}/>)}</div>
    </section>

    <section className="sd-pole bloc2"><h2>Bloc 2 · Analyse des non-éligibles <span>· Monétiser le Pack Formalisation</span></h2>
      <div className="sd-table-wrap"><table className="sd-table"><thead><tr><th>Raison</th><th>Nb Leads</th><th>%</th><th>Potentiel CA</th><th>Action</th></tr></thead><tbody>
        {m.bloc2.map(row => <tr key={row.key}>
          <td><strong>{row.raison}</strong></td>
          <td>{row.nb}</td>
          <td>{pct(row.pct)}</td>
          <td>{xaf(row.potentiel)}</td>
          <td><button type="button" className="sd-chip-action" onClick={() => navigate({ to: '/admin', search: { view: 'crm', priority: 'impact' as PriorityFilter } })}>{row.action}<ArrowUpRight size={12} strokeWidth={2.3}/></button></td>
        </tr>)}
      </tbody></table></div>
      <p className="sd-hint"><em>Pack Formalisation = 50 000 XAF · Potentiel = Nb × Prix</em></p>
    </section>

    <section className="sd-section"><h2>Actions prioritaires</h2><div className="sd-alerts">
      <article className="sd-alert-row r">
        <div className="sd-alert-icon"><Flame size={18} strokeWidth={1.75}/></div>
        <div className="sd-alert-body">
          <div className="sd-alert-title">Dossiers prêts sans contact 48h</div>
          <div className="sd-alert-sub">Score ≥ 80 · à contacter en priorité</div>
        </div>
        <button type="button" className="sd-alert-link" onClick={() => showCRM('ready')}>Voir<ArrowUpRight size={12} strokeWidth={2.3}/></button>
      </article>
      <article className="sd-alert-row g">
        <div className="sd-alert-icon"><AlertOctagon size={18} strokeWidth={1.75}/></div>
        <div className="sd-alert-body">
          <div className="sd-alert-title">Non-bancarisés cette semaine</div>
          <div className="sd-alert-sub">Vendre Pack Formalisation</div>
        </div>
        <button type="button" className="sd-alert-link" onClick={() => showCRM('impact')}>Voir<ArrowUpRight size={12} strokeWidth={2.3}/></button>
      </article>
      <article className="sd-alert-row b">
        <div className="sd-alert-icon"><Briefcase size={18} strokeWidth={1.75}/></div>
        <div className="sd-alert-body">
          <div className="sd-alert-title">Pipeline à relancer</div>
          <div className="sd-alert-sub">{'RDV > 7j · relancer les dossiers en attente'}</div>
        </div>
        <button type="button" className="sd-alert-link" onClick={() => showCRM('followup')}>Voir<ArrowUpRight size={12} strokeWidth={2.3}/></button>
      </article>
    </div></section>

    <section className="sd-section"><h2>Performance par segment</h2><div className="sd-double">
      <article className="sd-seg-panel">
        <div className="sd-seg-head"><span className="sd-seg-title">Par Banque</span><span className="sd-seg-sub">Top acceptations</span></div>
        {m.bloc4.banques.length === 0 ? (
          <div className="sd-seg-skeleton">
            {[0,1,2].map(i => (
              <div className="sd-seg-sk-row" key={i}>
                <div className="sd-seg-sk-top"><div className="sd-seg-sk-label" style={{ width: `${55 - i*10}%` }}/><div className="sd-seg-sk-val"/></div>
                <div className="sd-seg-sk-bar"/>
              </div>
            ))}
            <div className="sd-seg-skf">En attente du premier financement</div>
          </div>
        ) : (
          <div className="sd-seg-rows">
            {m.bloc4.banques.slice(0, 6).map(b => (
              <div className="sd-seg-row" key={b.label}>
                <div className="sd-seg-row-top">
                  <span className="sd-seg-row-label">{b.label}</span>
                  <span className="sd-seg-row-val">{b.acceptes}/{b.total} · <b>{pct(b.taux)}</b></span>
                </div>
                <div className="sd-seg-bar"><span style={{ width: `${Math.round((b.taux || 0) * 100)}%` }}/></div>
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="sd-seg-panel">
        <div className="sd-seg-head"><span className="sd-seg-title">Par Secteur</span><span className="sd-seg-sub">% éligibles</span></div>
        {m.bloc4.secteurs.length === 0 ? (
          <div className="sd-seg-skeleton">
            {[0,1,2].map(i => (
              <div className="sd-seg-sk-row" key={i}>
                <div className="sd-seg-sk-top"><div className="sd-seg-sk-label" style={{ width: `${55 - i*10}%` }}/><div className="sd-seg-sk-val"/></div>
                <div className="sd-seg-sk-bar"/>
              </div>
            ))}
            <div className="sd-seg-skf">En attente des premiers dépôts</div>
          </div>
        ) : (
          <div className="sd-seg-rows">
            {m.bloc4.secteurs.slice(0, 6).map(s => (
              <div className="sd-seg-row" key={s.label}>
                <div className="sd-seg-row-top">
                  <span className="sd-seg-row-label">{s.label}</span>
                  <span className="sd-seg-row-val">{s.eligibles}/{s.total} · <b>{pct(s.pct)}</b></span>
                </div>
                <div className="sd-seg-bar"><span style={{ width: `${Math.round((s.pct || 0) * 100)}%` }}/></div>
              </div>
            ))}
          </div>
        )}
      </article>
    </div></section>

    <section className="sd-section"><h2>Derniers leads</h2>
      {m.current.length === 0 ? (
        <div className="sd-leads-empty">
          <div className="sd-leads-empty-icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div className="sd-leads-empty-title">Aucun lead pour l'instant</div>
          <div className="sd-leads-empty-sub">Les leads déposés via le formulaire de préselection apparaîtront ici en temps réel.</div>
        </div>
      ) : (
        <div className="sd-table-wrap"><table className="sd-table"><thead><tr>{['Nom', 'Type', 'Activité', 'Score', 'Statut', 'Opportunité', 'Montant XAF', 'Créé'].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>
          {[...m.current].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, 10).map(l => {
            const name = isCompany(l) ? String(l.situation?.['raison_sociale'] || l.identite?.['raison_sociale'] || l.identite?.['nom'] || 'Non renseigné') : [l.identite?.['prenom'], l.identite?.['nom']].filter(Boolean).join(' ') || 'Non renseigné'
            const op = opportunity(l)
            const color = STATUS_COLORS[l.statut]
            return <tr key={l.id}><td><Button variant="link" className="sd-name" onClick={() => onOpen(l)}>{name}</Button></td><td><span className="sd-badge type">{isCompany(l) ? 'Morale' : 'Physique'}</span></td><td>{l.activite || 'Non renseignée'}</td><td className="sd-score">{l.score ?? 0}<small>/100</small></td><td><span className="sd-badge" style={color ? { background: color.bg, color: color.fg } : undefined}>{l.statut}</span></td><td><span className={`sd-badge ${op === 'Crédit + Impact' ? 'dual' : op === 'Impact' ? 'impact' : 'commercial'}`}>{op || 'À qualifier'}</span></td><td>{xaf(amount(l.montant_demande))}</td><td>{new Date(l.created_at).toLocaleDateString('fr-FR')}</td></tr>
          })}
        </tbody></table></div>
      )}
    </section>
  </>
}

function StrategicKPI({ icon, label, value, detail, trend = '' }: { icon: React.ReactNode; label: string; value: string; detail: string; trend?: string }) {
  return <article className="sd-kpi"><span className="sd-kpi-icon" aria-hidden="true">{icon}</span><h3>{label}</h3><strong>{value}</strong><p className={trend}>{detail}</p></article>
}
function StrategicFunnel({ title, tone, rows }: { title: string; tone: string; rows: { label: string; count: number }[] }) {
  const max = Math.max(...rows.map(r => r.count), 1)
  return <article className={`sd-funnel ${tone}`}><h3>{title}</h3>{rows.map(row => <div className="sd-funnel-row" key={row.label}><div><span>{row.label}</span><strong>{row.count}</strong></div><progress max={max} value={row.count} aria-label={row.label}/></div>)}</article>
}

function CRMView({ leads, msgCounts, search, setSearch, filterStatut, setFilterStatut, filterType, setFilterType, filterActivite, setFilterActivite, filterAgent, setFilterAgent, dateFrom, setDateFrom, dateTo, setDateTo, activitesList, teamMembers, resetFilters, onOpen, updateStatut, exportCSV, exportPDF, exportExcel, isDirector }: any) {
  const activeFiltersCount = [filterStatut, filterType, filterActivite, filterAgent, dateFrom, dateTo, search].filter(Boolean).length
  const agentEmailById = (id: string | null | undefined): string => {
    if (!id) return ''
    const t = teamMembers?.find((m: any) => m.id === id)
    return t ? t.email.split('@')[0] : ''
  }
  return (
    <>
      <div className="toolbar toolbar-advanced">
        <input placeholder="Rechercher nom, téléphone, code…" value={search} onChange={e => setSearch(e.target.value)}/>
        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
          <option value="">Tous statuts</option>
          {STATUSES.map((s: string) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">Tous types</option>
          <option value="physique">Particulier</option>
          <option value="morale">PME</option>
        </select>
        <select value={filterActivite} onChange={e => setFilterActivite(e.target.value)}>
          <option value="">Toutes activités</option>
          {activitesList?.map((a: string) => <option key={a} value={a}>{a}</option>)}
        </select>
        {isDirector && (
          <select value={filterAgent} onChange={e => setFilterAgent(e.target.value)}>
            <option value="">Tous agents</option>
            <option value="none">Non assigné</option>
            {teamMembers?.filter((m: any) => m.role === 'commercial').map((m: any) => (
              <option key={m.id} value={m.id}>{m.email.split('@')[0]}</option>
            ))}
          </select>
        )}
        <div className="date-range">
          <label>Du</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}/>
          <label>Au</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}/>
        </div>
        {activeFiltersCount > 0 && (
          <button className="btn-reset" onClick={resetFilters} title="Réinitialiser les filtres">
            Réinitialiser ({activeFiltersCount})
          </button>
        )}
        <div className="sd-export-seg" role="group" aria-label="Exporter">
          <button type="button" onClick={exportCSV} title="Exporter en CSV">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            CSV
          </button>
          <button type="button" onClick={exportExcel} title="Exporter en Excel (.xlsx)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Excel
          </button>
          <button type="button" onClick={exportPDF} title="Exporter en PDF">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            PDF
          </button>
        </div>
      </div>

      <div className="crm-status">
        <span className="crm-status-dot" aria-hidden="true"/>
        {leads.length} lead{leads.length > 1 ? 's' : ''} affiché{leads.length > 1 ? 's' : ''}
        {activeFiltersCount > 0 && <> · {activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''}</>}
        {!isDirector && <span className="crm-status-me">· Mes leads uniquement</span>}
      </div>

      {leads.length === 0 ? (
        <div className="crm-empty">
          <div className="crm-empty-icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><path d="M8 11h6"/></svg>
          </div>
          <div className="crm-empty-title">Aucun lead trouvé avec ces filtres</div>
          <div className="crm-empty-sub">Essaie d'élargir la période ou de retirer un filtre (statut, type, activité, agent).</div>
          {activeFiltersCount > 0 && (
            <button type="button" className="crm-empty-cta" onClick={resetFilters}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16M3 21v-5h5"/></svg>
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : (
        <div className="lead-grid">
          {leads.map((l: any) => <LeadRow key={l.id} lead={l} msgCount={msgCounts[l.id] || 0} onOpen={onOpen} updateStatut={updateStatut} agentName={agentEmailById(l.agent_commercial_id)}/>)}
        </div>
      )}
    </>
  )
}

function LeadRow({ lead, msgCount, onOpen, updateStatut, agentName }: any) {
  const c = STATUS_COLORS[lead.statut] || { bg: '#F1F5F9', fg: '#475569' }
  const isP = lead.type === 'physique' || lead.type === 'Personne physique'
  const nom = isP ? `${lead.identite?.prenom || ''} ${lead.identite?.nom || ''}`.trim() : (lead.situation?.raison_sociale || lead.identite?.raison_sociale || '—')
  const scoreCls = lead.score >= 70 ? 'hi' : lead.score < 40 ? 'lo' : ''
  return (
    <div className="lead-row" onClick={() => onOpen(lead)}>
      <div className="lead-l">
        <div className="lead-name">
          <span>{nom || '—'}</span>
          <span className="lead-badge" style={{ background: c.bg, color: c.fg }}>{lead.statut}</span>
          {agentName ? (
            <span className="lead-agent">{agentName}</span>
          ) : (
            <span className="lead-agent lead-agent-none">Non assigné</span>
          )}
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

// Palette Mayinvest pour les donuts (5 segments, le 6e = "Autres" en gris)
const DONUT_PALETTE = ['#0F6E3E', '#5FA381', '#B4871F', '#D6B672', '#1E4FA3', '#9CA3AF']

function SegmentsView({ leads }: any) {
  const bySecteur = useMemo(() => {
    const m: Record<string, number> = {}
    leads.forEach((l: any) => { const k = l.activite || 'Non défini'; m[k] = (m[k] || 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: k, value: v as number }))
  }, [leads])
  const byVille = useMemo(() => {
    const m: Record<string, number> = {}
    leads.forEach((l: any) => { const k = l.ville || 'Non défini'; m[k] = (m[k] || 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: k, value: v as number }))
  }, [leads])
  const byMontant = useMemo(() => {
    const tranches = [{ k: '< 1M', min: 0, max: 1_000_000 }, { k: '1M–5M', min: 1_000_000, max: 5_000_000 }, { k: '5M–20M', min: 5_000_000, max: 20_000_000 }, { k: '20M+', min: 20_000_000, max: Infinity }]
    return tranches.map(t => ({ label: t.k, value: leads.filter((l: any) => (l.montant_demande || 0) >= t.min && (l.montant_demande || 0) < t.max).length }))
  }, [leads])
  const SICONS = {
    sector: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
    city: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    amount: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  }
  return (
    <div className="rep-grid">
      <Panel title="Par secteur / profession" icon={SICONS.sector}><Donut items={bySecteur} capLabel="leads"/></Panel>
      <Panel title="Par ville" icon={SICONS.city}><Donut items={byVille} capLabel="leads"/></Panel>
      <Panel title="Par tranche de montant" icon={SICONS.amount}><Donut items={byMontant} capLabel="leads"/></Panel>
    </div>
  )
}

function Panel({ title, children, icon }: { title: string; children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="rep-panel">
      <div className="rep-panel-head">
        <span className="rep-panel-ico" aria-hidden="true">{icon}</span>
        <span className="rep-panel-title">{title}</span>
      </div>
      {children}
    </div>
  )
}

function Donut({ items, capLabel }: { items: { label: string; value: number }[]; capLabel: string }) {
  // Regroupe à partir du 6e en "Autres"
  const topN = 5
  const sliced = items.slice(0, topN)
  const rest = items.slice(topN).reduce((s, i) => s + i.value, 0)
  const display = rest > 0 ? [...sliced, { label: 'Autres', value: rest }] : sliced
  const total = display.reduce((s, i) => s + i.value, 0)

  if (total === 0) {
    return (
      <div className="rep-empty">
        <div className="rep-empty-ring" aria-hidden="true"/>
        <div className="rep-empty-txt">En attente des premiers dépôts</div>
      </div>
    )
  }

  const C = 2 * Math.PI * 48   // circumference ~ 301.59
  let offset = 0
  const segments = display.map((item, i) => {
    const frac = item.value / total
    const len = C * frac
    const node = (
      <circle
        key={item.label}
        cx="60" cy="60" r="48" fill="none"
        stroke={DONUT_PALETTE[i % DONUT_PALETTE.length]}
        strokeWidth="14"
        strokeDasharray={`${len} ${C}`}
        strokeDashoffset={-offset}
      />
    )
    offset += len
    return node
  })

  return (
    <div className="rep-donut-wrap">
      <div className="rep-donut">
        <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="60" cy="60" r="48" fill="none" stroke="var(--mi-hairline)" strokeWidth="14"/>
          {segments}
        </svg>
        <div className="rep-donut-center">
          <div className="rep-donut-num">{total}</div>
          <div className="rep-donut-cap">{capLabel}</div>
        </div>
      </div>
      <div className="rep-legend">
        {display.map((item, i) => (
          <div key={item.label} className="rep-legend-row">
            <span className="rep-legend-dot" style={{ background: DONUT_PALETTE[i % DONUT_PALETTE.length] }}/>
            <span className="rep-legend-lbl" title={item.label}>{item.label}</span>
            <span className="rep-legend-val">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ListCard({ icon, title, subtitle, emptyIcon, emptyTitle, emptySub, list, onOpen }: {
  icon: React.ReactNode; title: string; subtitle?: string;
  emptyIcon: React.ReactNode; emptyTitle: string; emptySub: string;
  list: any[]; onOpen: (l: any) => void;
}) {
  return (
    <div className="lc-card">
      <div className="lc-head">
        <span className="lc-ico" aria-hidden="true">{icon}</span>
        <div className="lc-head-body">
          <span className="lc-title">{title}</span>
          {subtitle && <span className="lc-subtitle">{subtitle}</span>}
        </div>
        <span className="lc-badge">{list.length}</span>
      </div>
      {list.length === 0 ? (
        <div className="lc-empty">
          <div className="lc-empty-ico" aria-hidden="true">{emptyIcon}</div>
          <div className="lc-empty-t">{emptyTitle}</div>
          <div className="lc-empty-s">{emptySub}</div>
        </div>
      ) : (
        <div className="lc-body">
          <div className="lead-grid">{list.map((l: any) => <LeadRow key={l.id} lead={l} msgCount={0} onOpen={onOpen} updateStatut={() => {}}/>)}</div>
        </div>
      )}
    </div>
  )
}

function BancarisationView({ leads, onOpen }: any) {
  const list = leads.filter((l: any) => l.eligibilite?.salaire_domic === 'Non' || l.banque_actuelle === 'Aucune')
  const ICO = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
  const EMPTY_ICO = <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
  return (
    <ListCard
      icon={ICO}
      title="Prospects à bancariser"
      emptyIcon={EMPTY_ICO}
      emptyTitle="Aucun prospect à bancariser"
      emptySub="Les leads sans banque ou sans salaire domicilié apparaîtront ici. C'est là que tu vendras le service Ouverture Compte."
      list={list}
      onOpen={onOpen}
    />
  )
}

function NonEligiblesView({ leads, onOpen }: any) {
  const list = leads.filter((l: any) => l.eligibilite?.non_eligible === true || l.statut === 'Non Éligible' || l.situation?.rccm === 'Non')
  const ICO = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
  const EMPTY_ICO = <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
  return (
    <ListCard
      icon={ICO}
      title="Dossiers non éligibles"
      subtitle="Pack formalisation · up-sell · reconversion"
      emptyIcon={EMPTY_ICO}
      emptyTitle="Aucun dossier non éligible"
      emptySub="Les leads marqués non éligibles (pas de RCCM, flux insuffisants, refus bancaire) atterriront ici avec le script de relance Pack Formalisation."
      list={list}
      onOpen={onOpen}
    />
  )
}

function RapportsView({ leads, exportCSV }: any) {
  const totalMontant = leads.reduce((s: number, l: any) => s + (l.montant_demande || 0), 0)
  const avg = leads.length ? Math.round(totalMontant / leads.length) : 0
  const scoreAvg = leads.length ? Math.round(leads.reduce((s: number, l: any) => s + (l.score || 0), 0) / leads.length) : 0
  const RICONS = {
    total: <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 17V7l7-4 7 4v10M3 17h14M8 10h4M8 13h4M8 17v-4h4v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    avg: <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.6"/><path d="M6.5 10h7M10 6.5v7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
    score: <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 2l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8L10 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
    down: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v8M3 7l4 4 4-4M2 13h10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  }
  return <>
    <div className="kpi-grid">
      <div className="kpi">
        <div className="kpi-head"><div className="kpi-icon">{RICONS.total}</div></div>
        <div className="kpi-l">Total demandé</div>
        <div className="kpi-v" style={{ fontSize: 22 }}>{leads.length ? formatXAF(totalMontant) : '—'}</div>
        <div className="kpi-s">sur {leads.length} dossier(s)</div>
      </div>
      <div className="kpi">
        <div className="kpi-head"><div className="kpi-icon" style={{ background: '#0D1B3E' }}>{RICONS.avg}</div></div>
        <div className="kpi-l">Panier moyen</div>
        <div className="kpi-v" style={{ fontSize: 22 }}>{leads.length ? formatXAF(avg) : '—'}</div>
        <div className="kpi-s">par dossier</div>
      </div>
      <div className="kpi">
        <div className="kpi-head"><div className="kpi-icon" style={{ background: '#F59E0B' }}>{RICONS.score}</div></div>
        <div className="kpi-l">Score moyen</div>
        <div className="kpi-v">{scoreAvg}</div>
        <div className="kpi-s">/ 100</div>
      </div>
    </div>
    <button className="btn-export" onClick={exportCSV} style={{ padding: '14px 24px', fontSize: 14 }}>
      {RICONS.down}
      Exporter tous les leads en CSV
    </button>
  </>
}

/* ============================================================
 * DRAWER DÉTAIL + CHAT
 * ============================================================ */
function LeadDrawer({ lead, onClose, onStatutChange, msgCount, onMsgRead, teamMembers, onAssignAgent, isDirector }: any) {
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
            {isDirector && (
              <select
                value={lead.agent_commercial_id || ''}
                onChange={e => onAssignAgent(e.target.value || null)}
                style={{ background: lead.agent_commercial_id ? '#DCFCE7' : '#FEF3C7', color: lead.agent_commercial_id ? '#047857' : '#B45309', border: 'none', borderRadius: 8, padding: '6px 12px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                title="Assigner ce lead à un commercial"
              >
                <option value="">Non assigné</option>
                {teamMembers?.filter((m: any) => m.role === 'commercial').map((m: any) => (
                  <option key={m.id} value={m.id}>{m.email.split('@')[0]}</option>
                ))}
              </select>
            )}
            {!isDirector && lead.agent_commercial_id && (
              <span style={{ background: '#ECFDF5', color: '#047857', padding: '6px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, border: '1px solid #BBF7D0' }}>Assigné à moi</span>
            )}
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
                  <div className="dr-field"><div className="dr-k">Non éligible</div><div className="dr-v" style={{ color: lead.eligibilite?.non_eligible ? '#B91C1C' : '#166534' }}>{lead.eligibilite?.non_eligible ? 'Oui' : 'Non'}</div></div>
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

            <LeadActionsPanel lead={lead} />
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
                          {isValidated ? 'Validé' : isUploaded ? 'À valider' : isRejected ? 'Rejeté' : 'En attente'}
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

/* ============================================================
 * LEAD ACTIONS PANEL — 4 boutons WhatsApp (Ouverture Compte, Pack, Couveuse, Restructuration)
 * ============================================================ */
function LeadActionsPanel({ lead }: { lead: any }) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [openDrawer, setOpenDrawer] = useState<string | null>(null)

  const identite = (lead.identite || {}) as Record<string, string>
  const situation = (lead.situation || {}) as Record<string, string>
  const prenom = identite.prenom || identite.nom || situation.raison_sociale || 'Client'
  const nom = identite.nom || ''
  const raison_sociale = situation.raison_sociale || identite.raison_sociale || ''
  const telephone = identite.telephone || identite.tel || situation.telephone || ''

  const vars = { prenom, nom, raison_sociale, telephone }

  async function copyToClipboard(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
    } catch {
      alert('Copie impossible — sélectionne et copie le texte manuellement.')
    }
  }

  function openWhatsapp(template: string) {
    if (!telephone) {
      alert('Ce lead n\'a pas de numéro de téléphone enregistré.')
      return
    }
    const filled = fillTemplate(template, vars)
    window.open(buildWhatsappUrl(telephone, filled), '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="lead-actions-panel">
      <h3 className="lap-title">
        <Target size={16} strokeWidth={1.75}/> Actions commerciales
        <span className="lap-subtitle">4 relances WhatsApp disponibles</span>
      </h3>

      {!telephone && (
        <div className="lap-warning">
          <AlertTriangle size={14} strokeWidth={1.75}/> Aucun numéro de téléphone enregistré pour ce lead. Les scripts peuvent être copiés mais pas envoyés automatiquement.
        </div>
      )}

      <div className="lap-actions-grid">
        {LEAD_ACTIONS.map(action => {
          const isOpen = openDrawer === action.key
          const filled = fillTemplate(action.template, vars)
          return (
            <div key={action.key} className="lap-action-card">
              <div className="lap-action-head">
                <div className="lap-action-info">
                  <strong>{action.short}</strong>
                  <span className="lap-price">
                    {action.prix === 0 ? 'Gratuit' : new Intl.NumberFormat('fr-FR').format(action.prix) + ' XAF'}
                  </span>
                </div>
              </div>
              <div className="lap-action-buttons">
                <button
                  type="button"
                  className="lap-btn primary"
                  onClick={() => openWhatsapp(action.template)}
                  disabled={!telephone}
                  title={!telephone ? 'Numéro manquant' : 'Ouvrir WhatsApp avec le script pré-rempli'}
                >
                  <MessageCircle size={14} strokeWidth={1.75}/> WhatsApp
                </button>
                <button
                  type="button"
                  className="lap-btn secondary"
                  onClick={() => copyToClipboard(filled, action.key)}
                >
                  {copiedKey === action.key ? <><Check size={14} strokeWidth={1.75}/> Copié</> : <><Copy size={14} strokeWidth={1.75}/> Copier</>}
                </button>
                <button
                  type="button"
                  className="lap-btn ghost"
                  onClick={() => setOpenDrawer(isOpen ? null : action.key)}
                >
                  {isOpen ? <><ChevronUp size={14} strokeWidth={1.75}/> Masquer</> : <><ChevronDown size={14} strokeWidth={1.75}/> Aperçu</>}
                </button>
              </div>
              {isOpen && (
                <div className="lap-preview">
                  <pre>{filled}</pre>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
