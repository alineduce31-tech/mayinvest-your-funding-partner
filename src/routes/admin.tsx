import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '@/integrations/supabase/client'

export const Route = createFileRoute('/admin')({ component: AdminGate })

type Lead = {
  id: string; type: string | null; activite: string | null; ville: string | null;
  montant_demande: number | null; banque_actuelle: string | null;
  statut: string; score: number; identite: any; situation: any; besoin: any;
  eligibilite: any; raison_non_eligibilite: string | null; created_at: string;
}

type Page = 'general' | 'non-eligibles' | 'bancarisation' | 'segments' | 'crm' | 'rapports'

function Logo() {
  return (
    <svg width="34" height="24" viewBox="0 0 72 52" fill="none" aria-label="Mayinvest">
      <path d="M4 32 Q 18 10, 36 26 T 68 20" stroke="#1A6BFF" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.4"/>
      <path d="M4 38 Q 18 16, 36 32 T 68 26" stroke="#1A6BFF" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.7"/>
      <path d="M4 44 Q 18 22, 36 38 T 68 32" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
    </svg>
  )
}

function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const paths: Record<string, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    alert: <><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></>,
    bank: <><path d="M3 9l9-6 9 6v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></>,
    bars: <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
    users: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></>,
    file: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></>,
    download: <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    search: <><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    arrow: <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></>,
    logout: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    bell: <><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
  }
  return <svg {...common}>{paths[name]}</svg>
}

const STATUSES = ['Nouveau', 'Contacté', 'RDV', 'Dossier Déposé', 'Éligible', 'Financé', 'Non Éligible', 'Perdu']

// ═══════════════════════════════════════════════════════════════
// GATE AUTH — affiche login si non connecté, sinon Admin
// ═══════════════════════════════════════════════════════════════
function AdminGate() {
  const [session, setSession] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (authLoading) {
    return (
      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#F4F5F7', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', fontSize: 14 }}>
        Chargement…
      </div>
    )
  }

  if (!session) return <LoginScreen />
  return <Admin session={session} />
}

// ═══════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ═══════════════════════════════════════════════════════════════
const LOGIN_ICONS = [
  // Cadenas
  <svg key="lock" width="26" height="26" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="10" rx="2" stroke="#fff" strokeWidth="2"/><path d="M8 11V7a4 4 0 018 0v4" stroke="#fff" strokeWidth="2"/><circle cx="12" cy="16" r="1.5" fill="#fff"/></svg>,
  // Bouclier
  <svg key="shield" width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 3l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z" stroke="#fff" strokeWidth="2" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  // Clé
  <svg key="key" width="26" height="26" viewBox="0 0 24 24" fill="none"><circle cx="8" cy="15" r="4" stroke="#fff" strokeWidth="2"/><path d="M10.5 12.5L20 3M17 6l3 3M15 8l2 2" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  // Graphique (admin stats)
  <svg key="chart" width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M3 20V10M9 20V4M15 20v-7M21 20V8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>,
]

function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [iconIdx, setIconIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setIconIdx(i => (i + 1) % LOGIN_ICONS.length), 2000)
    return () => clearInterval(t)
  }, [])

  async function login() {
    if (!email || !password) { setError('Entrez votre email et mot de passe'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError("Email ou mot de passe incorrect")
    // Si succès, le AuthStateChange gère le re-render automatiquement
  }

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#F4F5F7', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ background: 'linear-gradient(145deg, #0D1B3E 0%, #0A1532 100%)', borderRadius: 28, padding: 40, maxWidth: 420, width: '100%', color: '#fff', boxShadow: '0 40px 80px rgba(13,27,62,0.3)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 260, height: 260, background: 'radial-gradient(circle, rgba(26,107,255,0.3), transparent 65%)', pointerEvents: 'none' }} />
        {/* Icône animée (rotation 4 icônes toutes les 2s) */}
        <div style={{ width: 56, height: 56, background: '#1A6BFF', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, position: 'relative', zIndex: 1, boxShadow: '0 8px 20px rgba(26,107,255,0.4)', overflow: 'hidden' }}>
          <div style={{ position: 'relative', width: 26, height: 26 }}>
            {LOGIN_ICONS.map((Ic, i) => (
              <div key={i} style={{ position: 'absolute', inset: 0, opacity: i === iconIdx ? 1 : 0, transform: i === iconIdx ? 'scale(1) rotate(0)' : 'scale(0.6) rotate(-12deg)', transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(.2,.9,.3,1.2)' }}>
                {Ic}
              </div>
            ))}
          </div>
        </div>
        {/* Dots indicateurs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, position: 'relative', zIndex: 1 }} aria-hidden="true">
          {LOGIN_ICONS.map((_, i) => (
            <div key={i} style={{ width: i === iconIdx ? 16 : 5, height: 5, borderRadius: 100, background: i === iconIdx ? '#1A6BFF' : 'rgba(255,255,255,0.15)', transition: 'all 0.3s ease' }} />
          ))}
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 10px', position: 'relative', zIndex: 1 }}>Admin Mayinvest</h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: '0 0 24px', position: 'relative', zIndex: 1 }}>Connectez-vous pour accéder au back-office.</p>

        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 16px', marginBottom: 14, position: 'relative', zIndex: 1 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Email</label>
          <input type="email" autoComplete="username" placeholder="admin@mayinvest.cg" value={email} onChange={e => { setEmail(e.target.value); setError('') }} style={{ width: '100%', border: 'none', padding: 0, fontFamily: 'inherit', fontSize: 16, fontWeight: 600, color: '#fff', background: 'transparent', outline: 'none' }}/>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 16px', marginBottom: 14, position: 'relative', zIndex: 1 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Mot de passe</label>
          <input type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={e => { setPassword(e.target.value); setError('') }} onKeyDown={e => { if (e.key === 'Enter') login() }} style={{ width: '100%', border: 'none', padding: 0, fontFamily: 'inherit', fontSize: 16, fontWeight: 600, color: '#fff', background: 'transparent', outline: 'none' }}/>
        </div>

        <button disabled={loading} onClick={login} style={{ width: '100%', background: '#1A6BFF', color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, padding: 16, borderRadius: 100, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 8px 20px rgba(26,107,255,0.4)', position: 'relative', zIndex: 1, marginTop: 6 }}>
          {loading ? 'Connexion…' : 'Se connecter'}
          {!loading && <Icon name="arrow" size={14}/>}
        </button>

        {error && <div style={{ color: '#FF6B6B', fontSize: 13, marginTop: 12, textAlign: 'center', position: 'relative', zIndex: 1 }}>{error}</div>}

        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 20, textAlign: 'center', position: 'relative', zIndex: 1, lineHeight: 1.5 }}>
          Compte créé par un administrateur depuis le dashboard Supabase.<br/>
          Besoin d'aide ? Contactez votre équipe technique.
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════
function Admin({ session }: { session: any }) {
  const [page, setPage] = useState<Page>('general')
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatut, setFilterStatut] = useState('')
  const [filterType, setFilterType] = useState('')
  const [search, setSearch] = useState('')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [toast, setToast] = useState<{ msg: string; time: number } | null>(null)

  // Son de notification via Web Audio API (bip court et agréable)
  function playBeep() {
    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext
      if (!AC) return
      const ctx = new AC()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime) // La4
      osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.1) // Mi5
      gain.gain.setValueAtTime(0.18, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.start()
      osc.stop(ctx.currentTime + 0.4)
    } catch (e) {}
  }

  function showToast(msg: string) {
    setToast({ msg, time: Date.now() })
    setTimeout(() => setToast(t => (t && t.time === Date.now()) ? null : t), 5000)
  }

  // Permission notifications navigateur
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }, [])

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
      if (data) setLeads(data as Lead[])
      setLoading(false)
    })()
    const ch = supabase.channel('admin-leads')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, async (payload) => {
        const newLead = payload.new as Lead
        const nom = newLead.identite?.raison_sociale || `${newLead.identite?.prenom || ''} ${newLead.identite?.nom || ''}`.trim() || 'Nouveau prospect'
        // Toast
        showToast(`🎉 Nouveau lead : ${nom} · Score ${newLead.score}/100`)
        // Son
        playBeep()
        // Notification navigateur (si onglet pas focalisé)
        if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
          try {
            new Notification('Nouveau lead Mayinvest', {
              body: `${nom} · Score ${newLead.score}/100 · ${newLead.activite || ''}`,
              icon: '/favicon.ico',
              tag: `lead-${newLead.id}`,
            })
          } catch (e) {}
        }
        // Refresh liste
        const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
        if (data) setLeads(data as Lead[])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads' }, async () => {
        const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
        if (data) setLeads(data as Lead[])
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  async function logout() {
    await supabase.auth.signOut()
  }

  // ═══ STATS ═══
  const stats = useMemo(() => {
    const total = leads.length
    const eligibles = leads.filter(l => l.statut !== 'Non Éligible' && l.score >= 70).length
    const nonEligibles = leads.filter(l => l.statut === 'Non Éligible').length
    const contactes = leads.filter(l => l.statut === 'Contacté' || l.statut === 'RDV' || l.statut === 'Dossier Déposé' || l.statut === 'Financé').length
    const rdv = leads.filter(l => l.statut === 'RDV' || l.statut === 'Dossier Déposé' || l.statut === 'Financé').length
    const deposes = leads.filter(l => l.statut === 'Dossier Déposé' || l.statut === 'Financé').length
    const finances = leads.filter(l => l.statut === 'Financé').length

    // KPI temporels J / J-7 / J-30
    const now = new Date()
    const start_j = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const start_j7 = new Date(now.getTime() - 7*864e5)
    const start_j30 = new Date(now.getTime() - 30*864e5)
    const leadsJ = leads.filter(l => new Date(l.created_at) >= start_j).length
    const leadsJ7 = leads.filter(l => new Date(l.created_at) >= start_j7).length
    const leadsJ30 = leads.filter(l => new Date(l.created_at) >= start_j30).length

    const taux = total ? Math.round((finances / total) * 100) : 0
    return { total, eligibles, nonEligibles, contactes, rdv, deposes, finances, leadsJ, leadsJ7, leadsJ30, taux }
  }, [leads])

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      if (filterStatut && l.statut !== filterStatut) return false
      if (filterType && l.type !== filterType) return false
      if (search) {
        const txt = search.toLowerCase()
        const nom = (l.identite?.prenom || '') + ' ' + (l.identite?.nom || '') + ' ' + (l.identite?.raison_sociale || '')
        if (!nom.toLowerCase().includes(txt)) return false
      }
      return true
    })
  }, [leads, filterStatut, filterType, search])

  async function updateStatut(id: string, statut: string) {
    await supabase.from('leads').update({ statut }).eq('id', id)
  }

  function exportCSV() {
    const headers = ['Nom', 'Type', 'Activité', 'Ville', 'Montant', 'Score', 'Statut', 'Date', 'Téléphone', 'Email']
    const rows = filteredLeads.map(l => [
      (l.identite?.raison_sociale || `${l.identite?.prenom || ''} ${l.identite?.nom || ''}`.trim()),
      l.type || '', l.activite || '', l.ville || '',
      l.montant_demande || 0, l.score, l.statut,
      new Date(l.created_at).toLocaleDateString('fr'),
      l.identite?.tel || '', l.identite?.email || ''
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `mayinvest-leads-${new Date().toISOString().slice(0,10)}.csv`; a.click()
  }

  function nomOf(l: Lead) { return l.identite?.raison_sociale || `${l.identite?.prenom || ''} ${l.identite?.nom || ''}`.trim() || '—' }
  function pillColor(statut: string) {
    if (statut === 'Nouveau') return { bg: '#EEF4FF', c: '#1A6BFF' }
    if (statut === 'Contacté') return { bg: '#E0F7FA', c: '#0891B2' }
    if (statut === 'RDV') return { bg: '#FEF3C7', c: '#A16207' }
    if (statut === 'Éligible' || statut === 'Financé') return { bg: '#DCFCE7', c: '#16A34A' }
    if (statut === 'Dossier Déposé') return { bg: '#FEF9C3', c: '#854D0E' }
    if (statut === 'Non Éligible') return { bg: '#FFF0E6', c: '#EA580C' }
    if (statut === 'Perdu') return { bg: '#FEE2E2', c: '#DC2626' }
    return { bg: '#F5F5F5', c: '#6B7280' }
  }
  function scoreColor(s: number) { return s >= 70 ? '#16A34A' : s >= 50 ? '#CA8A04' : '#DC2626' }

  // Segments
  const parSecteur = useMemo(() => {
    const map = new Map<string, { total: number; eligibles: number }>()
    leads.forEach(l => {
      if (!l.activite) return
      const e = map.get(l.activite) || { total: 0, eligibles: 0 }
      e.total++; if (l.score >= 70) e.eligibles++
      map.set(l.activite, e)
    })
    return Array.from(map.entries()).map(([k, v]) => ({ label: k, pct: v.total ? Math.round((v.eligibles/v.total)*100) : 0, total: v.total }))
      .sort((a, b) => b.pct - a.pct).slice(0, 8)
  }, [leads])

  const parMontant = useMemo(() => {
    const buckets = [{ label: '< 5M', min: 0, max: 5e6 }, { label: '5M–10M', min: 5e6, max: 10e6 }, { label: '10M–30M', min: 10e6, max: 30e6 }, { label: '30M–50M', min: 30e6, max: 50e6 }, { label: '> 50M', min: 50e6, max: Infinity }]
    return buckets.map(b => {
      const inB = leads.filter(l => (l.montant_demande || 0) >= b.min && (l.montant_demande || 0) < b.max)
      const fin = inB.filter(l => l.statut === 'Financé').length
      return { label: b.label, pct: inB.length ? Math.round((fin/inB.length)*100) : 0, total: inB.length }
    })
  }, [leads])

  const parBanque = useMemo(() => {
    const map = new Map<string, { total: number; finances: number }>()
    leads.forEach(l => {
      if (!l.banque_actuelle) return
      const e = map.get(l.banque_actuelle) || { total: 0, finances: 0 }
      e.total++; if (l.statut === 'Financé') e.finances++
      map.set(l.banque_actuelle, e)
    })
    return Array.from(map.entries()).map(([k, v]) => ({ label: k, pct: v.total ? Math.round((v.finances/v.total)*100) : 0, total: v.total }))
      .sort((a, b) => b.pct - a.pct).slice(0, 8)
  }, [leads])

  // Funnel conversion
  const funnel = useMemo(() => {
    const total = stats.total
    const steps = [
      { label: 'Leads totaux', value: total, color: '#1A6BFF' },
      { label: 'Contactés', value: stats.contactes, color: '#0891B2' },
      { label: 'RDV conseiller', value: stats.rdv, color: '#A16207' },
      { label: 'Dossiers déposés', value: stats.deposes, color: '#854D0E' },
      { label: 'Financés', value: stats.finances, color: '#16A34A' },
    ]
    return steps.map((s, i) => ({
      ...s,
      pct: total ? Math.round((s.value / total) * 100) : 0,
      conversionFromPrev: i > 0 && steps[i-1].value > 0 ? Math.round((s.value / steps[i-1].value) * 100) : 100,
    }))
  }, [stats])

  const titles: Record<Page, string> = {
    general: 'Vue Générale', 'non-eligibles': "Non Éligibles — Mine d'or", bancarisation: 'Impact Bancarisation',
    segments: 'Performance par Segment', crm: 'CRM Leads', rapports: 'Rapports Automatiques'
  }

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#F4F5F7', minHeight: '100vh', WebkitFontSmoothing: 'antialiased', color: '#111827', display: 'flex' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        .sidebar { width: 220px; background: #0D1B3E; min-height: 100vh; display: flex; flex-direction: column; flex-shrink: 0; position: fixed; top: 0; left: 0; bottom: 0; z-index: 100; }
        .sb-logo { padding: 20px 20px 16px; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; gap: 10px; }
        .sb-brand { font-size: 15px; font-weight: 800; color: #fff; letter-spacing: -0.3px; }
        .sb-sub { font-size: 10px; color: rgba(255,255,255,0.4); font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase; }
        .sb-section { padding: 16px 16px 6px; font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.3); letter-spacing: 0.1em; text-transform: uppercase; }
        .sb-item { display: flex; align-items: center; gap: 10px; padding: 9px 16px; cursor: pointer; color: rgba(255,255,255,0.55); font-size: 13px; font-weight: 500; position: relative; background: transparent; border: none; font-family: inherit; width: 100%; text-align: left; }
        .sb-item:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.9); }
        .sb-item.on { background: rgba(26,107,255,0.2); color: #fff; font-weight: 600; }
        .sb-item.on::before { content: ''; position: absolute; left: 0; top: 4px; bottom: 4px; width: 3px; background: #1A6BFF; border-radius: 0 3px 3px 0; }
        .sb-badge { margin-left: auto; background: #1A6BFF; color: #fff; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 100px; }
        .sb-badge.o { background: #EA580C; }
        .sb-footer { padding: 16px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; gap: 10px; }
        .sb-avatar { width: 32px; height: 32px; background: #1A6BFF; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #fff; flex-shrink: 0; }
        .sb-user { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.85); max-width: 130px; overflow: hidden; text-overflow: ellipsis; }
        .sb-role { font-size: 10px; color: rgba(255,255,255,0.35); }
        .sb-logout { background: transparent; border: none; color: rgba(255,255,255,0.5); cursor: pointer; padding: 6px; margin-left: auto; display: flex; align-items: center; justify-content: center; border-radius: 6px; }
        .sb-logout:hover { background: rgba(255,255,255,0.08); color: #fff; }

        .main { margin-left: 220px; flex: 1; display: flex; flex-direction: column; min-height: 100vh; }
        .topbar { height: 60px; background: #FFF; border-bottom: 1px solid #E5E7EB; display: flex; align-items: center; justify-content: space-between; padding: 0 28px; position: sticky; top: 0; z-index: 50; }
        .topbar-title { font-size: 16px; font-weight: 700; color: #111827; }
        .topbar-right { display: flex; align-items: center; gap: 12px; }
        .btn { display: inline-flex; align-items: center; gap: 7px; padding: 8px 16px; border-radius: 100px; border: none; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 600; transition: opacity 0.15s; }
        .btn:hover { opacity: 0.85; }
        .btn-primary { background: #1A6BFF; color: #fff; }
        .btn-ghost { background: #F9FAFB; color: #111; border: 1px solid #E5E7EB; }
        .content { padding: 24px 28px; flex: 1; }

        /* Hero KPIs — J/J-7/J-30 (les 3 KPI stratégiques) */
        .hero-kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 20px; }
        .hero-kpi { background: linear-gradient(145deg, #0D1B3E 0%, #0A1532 100%); color: #fff; border-radius: 16px; padding: 20px 22px; position: relative; overflow: hidden; box-shadow: 0 8px 24px rgba(13,27,62,0.14); }
        .hero-kpi::before { content: ''; position: absolute; top: -40px; right: -40px; width: 160px; height: 160px; background: radial-gradient(circle, rgba(26,107,255,0.3), transparent 65%); pointer-events: none; }
        .hero-kpi .lbl { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; position: relative; z-index: 1; }
        .hero-kpi .val { font-size: 36px; font-weight: 800; line-height: 1; margin-bottom: 4px; position: relative; z-index: 1; }
        .hero-kpi .sub { font-size: 12px; color: rgba(255,255,255,0.5); position: relative; z-index: 1; }

        .kpi-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 14px; margin-bottom: 24px; }
        .kpi-card { background: #FFF; border: 1px solid #E5E7EB; border-radius: 14px; padding: 18px; box-shadow: 0 1px 3px rgba(13,27,62,0.04); }
        .kpi-label { font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; }
        .kpi-value { font-size: 28px; font-weight: 800; line-height: 1; margin-bottom: 4px; }
        .kpi-sub { font-size: 11px; color: #9CA3AF; }

        .charts-row { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-bottom: 24px; }
        .chart-card { background: #FFF; border: 1px solid #E5E7EB; border-radius: 14px; padding: 20px; box-shadow: 0 1px 3px rgba(13,27,62,0.04); }
        .chart-title { font-size: 14px; font-weight: 700; margin-bottom: 4px; color: #111; }
        .chart-sub { font-size: 12px; color: #6B7280; margin-bottom: 16px; }

        /* FUNNEL */
        .funnel { display: flex; flex-direction: column; gap: 8px; }
        .funnel-row { display: flex; align-items: center; gap: 12px; }
        .funnel-bar { flex: 1; background: #F9FAFB; border-radius: 10px; height: 44px; overflow: hidden; position: relative; display: flex; align-items: center; }
        .funnel-fill { height: 100%; border-radius: 10px; display: flex; align-items: center; padding: 0 14px; color: #fff; font-weight: 700; font-size: 13px; min-width: fit-content; transition: width 0.5s ease; }
        .funnel-pct { font-size: 12px; font-weight: 700; color: #111; width: 90px; text-align: right; }
        .funnel-arrow { color: #9CA3AF; font-size: 11px; padding: 2px 0 2px 12px; }

        .table-card { background: #FFF; border: 1px solid #E5E7EB; border-radius: 14px; overflow: hidden; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(13,27,62,0.04); }
        .table-head { padding: 16px 20px; border-bottom: 1px solid #E5E7EB; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
        .table-h-t { font-size: 14px; font-weight: 700; color: #111; }
        .filters { display: flex; gap: 8px; flex-wrap: wrap; }
        .filter-sel { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 7px 10px; font-family: inherit; font-size: 12px; color: #111; cursor: pointer; }
        .filter-inp { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 7px 12px; font-family: inherit; font-size: 12px; color: #111; width: 220px; outline: none; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; padding: 10px 16px; font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid #E5E7EB; background: #F9FAFB; }
        td { padding: 12px 16px; font-size: 13px; border-bottom: 1px solid #F0F0F0; color: #111; }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: #F9FAFB; cursor: pointer; }
        .pill { display: inline-flex; padding: 3px 10px; border-radius: 100px; font-size: 11px; font-weight: 600; white-space: nowrap; }
        .score-ring { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; font-size: 12px; font-weight: 800; border: 2.5px solid; }

        .bar-h { display: flex; flex-direction: column; gap: 10px; }
        .bar-h-row { display: flex; align-items: center; gap: 10px; }
        .bar-h-l { font-size: 12px; font-weight: 500; width: 90px; flex-shrink: 0; color: #111; }
        .bar-h-t { flex: 1; height: 8px; background: #F0F0F0; border-radius: 100px; overflow: hidden; }
        .bar-h-f { height: 100%; border-radius: 100px; background: #1A6BFF; }
        .bar-h-v { font-size: 12px; font-weight: 700; width: 48px; text-align: right; flex-shrink: 0; color: #111; }

        .seg-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 24px; }

        /* Toast notif */
        .toast { position: fixed; top: 80px; right: 28px; background: linear-gradient(145deg, #0D1B3E, #0A1532); color: #fff; padding: 14px 20px; border-radius: 14px; box-shadow: 0 12px 32px rgba(13,27,62,0.4); z-index: 300; display: flex; align-items: center; gap: 12px; font-size: 14px; font-weight: 600; animation: slideIn 0.3s ease-out; max-width: 400px; }
        .toast-ic { width: 32px; height: 32px; background: #1A6BFF; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        @keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

        /* Modal */
        .modal-ov { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal { background: #FFF; border-radius: 20px; width: 600px; max-width: 100%; max-height: 90vh; overflow-y: auto; }
        .modal-h { padding: 24px 28px 16px; display: flex; justify-content: space-between; align-items: start; border-bottom: 1px solid #F0F0F0; }
        .modal-t { font-size: 20px; font-weight: 800; color: #111; }
        .modal-close { background: #F9FAFB; border: none; border-radius: 50%; width: 34px; height: 34px; cursor: pointer; font-size: 18px; color: #6B7280; display: flex; align-items: center; justify-content: center; }
        .modal-b { padding: 20px 28px 28px; }
        .modal-sec { margin-bottom: 20px; }
        .modal-sec-t { font-size: 11px; font-weight: 700; color: #1A6BFF; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px; }
        .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .detail { background: #F9FAFB; border-radius: 10px; padding: 10px 14px; }
        .detail-l { font-size: 11px; color: #6B7280; margin-bottom: 2px; }
        .detail-v { font-size: 13px; font-weight: 600; color: #111; }
        .wa-btn { background: #25D366; color: #fff; border: none; border-radius: 12px; padding: 12px 18px; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; margin-bottom: 8px; }
        .devis-btn { background: #7C3AED; color: #fff; border: none; border-radius: 12px; padding: 12px 18px; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; }
        .client-link { background: #1A6BFF; color: #fff; border: none; border-radius: 12px; padding: 12px 18px; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; margin-bottom: 8px; text-decoration: none; }

        @media (max-width: 1200px) { .kpi-grid { grid-template-columns: repeat(3, 1fr); } .charts-row { grid-template-columns: 1fr; } .seg-grid { grid-template-columns: 1fr; } .hero-kpis { grid-template-columns: 1fr; } }
        @media (max-width: 900px) { .sidebar { transform: translateX(-100%); } .main { margin-left: 0; } }
      `}</style>

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sb-logo">
          <Logo />
          <div>
            <div className="sb-brand">Mayinvest</div>
            <div className="sb-sub">Admin</div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '12px 0' }}>
          <div className="sb-section">Tableaux de bord</div>
          <button className={`sb-item ${page === 'general' ? 'on' : ''}`} onClick={() => setPage('general')}><Icon name="grid"/>Vue Générale</button>
          <button className={`sb-item ${page === 'non-eligibles' ? 'on' : ''}`} onClick={() => setPage('non-eligibles')}><Icon name="alert"/>Non Éligibles<span className="sb-badge o">{stats.nonEligibles}</span></button>
          <button className={`sb-item ${page === 'bancarisation' ? 'on' : ''}`} onClick={() => setPage('bancarisation')}><Icon name="bank"/>Bancarisation</button>
          <button className={`sb-item ${page === 'segments' ? 'on' : ''}`} onClick={() => setPage('segments')}><Icon name="bars"/>Segments</button>
          <div className="sb-section">Gestion</div>
          <button className={`sb-item ${page === 'crm' ? 'on' : ''}`} onClick={() => setPage('crm')}><Icon name="users"/>CRM Leads<span className="sb-badge">{stats.total}</span></button>
          <button className={`sb-item ${page === 'rapports' ? 'on' : ''}`} onClick={() => setPage('rapports')}><Icon name="file"/>Rapports Auto</button>
        </nav>
        <div className="sb-footer">
          <div className="sb-avatar">{(session.user.email || 'A')[0].toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sb-user" title={session.user.email}>{session.user.email}</div>
            <div className="sb-role">Admin</div>
          </div>
          <button className="sb-logout" onClick={logout} title="Déconnexion"><Icon name="logout" size={16}/></button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main">
        <div className="topbar">
          <div className="topbar-title">{titles[page]}</div>
          <div className="topbar-right">
            <div style={{ fontSize: 12, color: '#6B7280' }}>{new Date().toLocaleDateString('fr', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div>
            <button className="btn btn-ghost" onClick={exportCSV}><Icon name="download" size={13}/>Export CSV</button>
          </div>
        </div>

        <div className="content">

          {page === 'general' && <>
            {/* ★ Les 3 KPI STRATÉGIQUES (hero) : J / J-7 / J-30 */}
            <div className="hero-kpis">
              <div className="hero-kpi">
                <div className="lbl">Aujourd'hui</div>
                <div className="val">{stats.leadsJ}</div>
                <div className="sub">Nouveaux leads du jour</div>
              </div>
              <div className="hero-kpi">
                <div className="lbl">7 derniers jours</div>
                <div className="val">{stats.leadsJ7}</div>
                <div className="sub">Volume semaine glissante</div>
              </div>
              <div className="hero-kpi">
                <div className="lbl">30 derniers jours</div>
                <div className="val">{stats.leadsJ30}</div>
                <div className="sub">Volume mois glissant</div>
              </div>
            </div>

            {/* FUNNEL de conversion */}
            <div className="chart-card" style={{ marginBottom: 24 }}>
              <div className="chart-title">Funnel de conversion</div>
              <div className="chart-sub">Du prospect au financement — taux de passage à chaque étape</div>
              <div className="funnel">
                {funnel.map((s, i) => (
                  <div key={s.label}>
                    <div className="funnel-row">
                      <div className="funnel-bar">
                        <div className="funnel-fill" style={{ width: `${Math.max(s.pct, 6)}%`, background: s.color }}>
                          {s.label} · {s.value}
                        </div>
                      </div>
                      <div className="funnel-pct">{s.pct}% total</div>
                    </div>
                    {i < funnel.length - 1 && (
                      <div className="funnel-arrow">↓ {s.conversionFromPrev}% passent à l'étape suivante</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="kpi-grid">
              <div className="kpi-card"><div className="kpi-label">Total Leads</div><div className="kpi-value" style={{ color: '#1A6BFF' }}>{stats.total}</div><div className="kpi-sub">Historique complet</div></div>
              <div className="kpi-card"><div className="kpi-label">Éligibles</div><div className="kpi-value" style={{ color: '#16A34A' }}>{stats.eligibles}</div><div className="kpi-sub">{stats.total ? Math.round((stats.eligibles/stats.total)*100) : 0}% des leads</div></div>
              <div className="kpi-card"><div className="kpi-label">Non Éligibles</div><div className="kpi-value" style={{ color: '#EA580C' }}>{stats.nonEligibles}</div><div className="kpi-sub">Potentiel Pack Formalisation</div></div>
              <div className="kpi-card"><div className="kpi-label">Dossiers Déposés</div><div className="kpi-value">{stats.deposes}</div><div className="kpi-sub">En instruction banque</div></div>
              <div className="kpi-card"><div className="kpi-label">Financés</div><div className="kpi-value" style={{ color: '#16A34A' }}>{stats.finances}</div><div className="kpi-sub">Taux {stats.taux}%</div></div>
              <div className="kpi-card"><div className="kpi-label">CA Mayinvest</div><div className="kpi-value" style={{ color: '#7C3AED', fontSize: 22 }}>{(stats.finances * 50000 / 1e6).toFixed(2)}M</div><div className="kpi-sub">XAF estimé</div></div>
            </div>

            <div className="table-card">
              <div className="table-head">
                <div className="table-h-t">Derniers leads</div>
                <div className="filters">
                  <input className="filter-inp" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}/>
                  <select className="filter-sel" value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
                    <option value="">Tous statuts</option>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                  <select className="filter-sel" value={filterType} onChange={e => setFilterType(e.target.value)}>
                    <option value="">Tous types</option>
                    <option value="physique">Physique</option>
                    <option value="morale">PME</option>
                  </select>
                </div>
              </div>
              <table>
                <thead><tr><th>Nom</th><th>Type</th><th>Activité</th><th>Montant XAF</th><th>Score</th><th>Statut</th><th>Date</th></tr></thead>
                <tbody>
                  {loading && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: '#6B7280' }}>Chargement…</td></tr>}
                  {!loading && filteredLeads.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: '#6B7280' }}>Aucun lead</td></tr>}
                  {filteredLeads.slice(0, 15).map(l => {
                    const p = pillColor(l.statut)
                    return (
                      <tr key={l.id} onClick={() => setSelectedLead(l)}>
                        <td style={{ fontWeight: 600 }}>{nomOf(l)}</td>
                        <td style={{ color: '#6B7280' }}>{l.type === 'morale' ? 'PME' : 'Physique'}</td>
                        <td style={{ color: '#6B7280' }}>{l.activite || '—'}</td>
                        <td style={{ color: '#6B7280', fontVariantNumeric: 'tabular-nums' }}>{l.montant_demande ? l.montant_demande.toLocaleString('fr') : '—'}</td>
                        <td><span className="score-ring" style={{ color: scoreColor(l.score), borderColor: scoreColor(l.score) }}>{l.score}</span></td>
                        <td><span className="pill" style={{ background: p.bg, color: p.c }}>{l.statut}</span></td>
                        <td style={{ color: '#6B7280' }}>{new Date(l.created_at).toLocaleDateString('fr')}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>}

          {page === 'non-eligibles' && <>
            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
              <div className="kpi-card"><div className="kpi-label">Total Non Éligibles</div><div className="kpi-value" style={{ color: '#EA580C' }}>{stats.nonEligibles}</div><div className="kpi-sub">{stats.total ? Math.round((stats.nonEligibles/stats.total)*100) : 0}% des leads</div></div>
              <div className="kpi-card"><div className="kpi-label">Pack Formalisation</div><div className="kpi-value" style={{ color: '#7C3AED', fontSize: 22 }}>{(leads.filter(l => l.eligibilite?.rccm === 'Non').length * 50000 / 1e6).toFixed(2)}M</div><div className="kpi-sub">XAF potentiel</div></div>
              <div className="kpi-card"><div className="kpi-label">Sans RCCM</div><div className="kpi-value">{leads.filter(l => l.eligibilite?.rccm === 'Non').length}</div><div className="kpi-sub">PME à formaliser</div></div>
              <div className="kpi-card"><div className="kpi-label">Refus bancaire</div><div className="kpi-value">{leads.filter(l => l.eligibilite?.refus_bancaire === 'Oui').length}</div><div className="kpi-sub">Restructuration</div></div>
            </div>
            <div className="table-card">
              <div className="table-head"><div className="table-h-t">Analyse des raisons</div></div>
              <table>
                <thead><tr><th>Raison</th><th>Nombre</th><th>%</th><th>Potentiel</th><th>Action</th></tr></thead>
                <tbody>
                  <tr><td style={{ fontWeight: 600 }}>Pas de RCCM</td><td>{leads.filter(l => l.eligibilite?.rccm === 'Non').length}</td><td>{stats.nonEligibles ? Math.round(leads.filter(l => l.eligibilite?.rccm === 'Non').length / stats.nonEligibles * 100) : 0}%</td><td style={{ color: '#7C3AED', fontWeight: 700 }}>{(leads.filter(l => l.eligibilite?.rccm === 'Non').length * 50000).toLocaleString('fr')} XAF</td><td><span className="pill" style={{ background: '#EDE9FE', color: '#7C3AED' }}>Pack Formalisation</span></td></tr>
                  <tr><td style={{ fontWeight: 600 }}>Ancienneté insuffisante</td><td>{leads.filter(l => l.eligibilite?.anciennete_ok === false).length}</td><td>—</td><td style={{ color: '#6B7280' }}>Couveuse 3 mois</td><td><span className="pill" style={{ background: '#F5F5F5', color: '#6B7280' }}>Couveuse</span></td></tr>
                  <tr><td style={{ fontWeight: 600 }}>Refus bancaire</td><td>{leads.filter(l => l.eligibilite?.refus_bancaire === 'Oui').length}</td><td>—</td><td style={{ color: '#DC2626' }}>Restructuration</td><td><span className="pill" style={{ background: '#FEE2E2', color: '#DC2626' }}>Restructuration</span></td></tr>
                </tbody>
              </table>
            </div>
          </>}

          {page === 'bancarisation' && <>
            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
              <div className="kpi-card"><div className="kpi-label">Avec banque</div><div className="kpi-value" style={{ color: '#16A34A' }}>{leads.filter(l => l.banque_actuelle && l.banque_actuelle !== 'Aucune').length}</div><div className="kpi-sub">{stats.total ? Math.round(leads.filter(l => l.banque_actuelle && l.banque_actuelle !== 'Aucune').length / stats.total * 100) : 0}% bancarisés</div></div>
              <div className="kpi-card"><div className="kpi-label">Sans banque</div><div className="kpi-value" style={{ color: '#EA580C' }}>{leads.filter(l => !l.banque_actuelle || l.banque_actuelle === 'Aucune').length}</div><div className="kpi-sub">À bancariser</div></div>
              <div className="kpi-card"><div className="kpi-label">Salaire domicilié</div><div className="kpi-value" style={{ color: '#1A6BFF' }}>{leads.filter(l => l.eligibilite?.salaire_domic === 'Oui').length}</div><div className="kpi-sub">Prospects sérieux</div></div>
            </div>
            <div className="chart-card"><div className="chart-title">Répartition par banque</div><div className="chart-sub">Volume de leads par institution bancaire</div><div className="bar-h">{parBanque.map(b => <div key={b.label} className="bar-h-row"><div className="bar-h-l">{b.label}</div><div className="bar-h-t"><div className="bar-h-f" style={{ width: `${Math.min(100, b.total / Math.max(...parBanque.map(x => x.total), 1) * 100)}%` }} /></div><div className="bar-h-v">{b.total}</div></div>)}</div></div>
          </>}

          {page === 'segments' && <>
            <div className="seg-grid">
              <div className="chart-card">
                <div className="chart-title">Par Secteur</div>
                <div className="chart-sub">Taux d'éligibilité</div>
                <div className="bar-h">{parSecteur.map(b => <div key={b.label} className="bar-h-row"><div className="bar-h-l">{b.label}</div><div className="bar-h-t"><div className="bar-h-f" style={{ width: `${b.pct}%` }} /></div><div className="bar-h-v">{b.pct}%</div></div>)}</div>
              </div>
              <div className="chart-card">
                <div className="chart-title">Par Montant</div>
                <div className="chart-sub">Taux de financement</div>
                <div className="bar-h">{parMontant.map(b => <div key={b.label} className="bar-h-row"><div className="bar-h-l">{b.label}</div><div className="bar-h-t"><div className="bar-h-f" style={{ width: `${b.pct}%`, background: '#7C3AED' }} /></div><div className="bar-h-v">{b.pct}%</div></div>)}</div>
              </div>
              <div className="chart-card">
                <div className="chart-title">Par Banque</div>
                <div className="chart-sub">Taux de succès</div>
                <div className="bar-h">{parBanque.map(b => <div key={b.label} className="bar-h-row"><div className="bar-h-l">{b.label}</div><div className="bar-h-t"><div className="bar-h-f" style={{ width: `${b.pct}%`, background: '#16A34A' }} /></div><div className="bar-h-v">{b.pct}%</div></div>)}</div>
              </div>
            </div>
          </>}

          {page === 'crm' && <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <input className="filter-inp" style={{ flex: 1, minWidth: 240 }} placeholder="Rechercher un lead..." value={search} onChange={e => setSearch(e.target.value)}/>
              <select className="filter-sel" value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
                <option value="">Tous les statuts</option>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
              {STATUSES.map(s => {
                const col = pillColor(s)
                const items = filteredLeads.filter(l => l.statut === s)
                return (
                  <div key={s} style={{ flex: '0 0 240px' }}>
                    <div style={{ padding: '10px 14px', background: col.bg, color: col.c, borderRadius: '10px 10px 0 0', fontSize: 12, fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                      <span>{s}</span><span>{items.length}</span>
                    </div>
                    <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: 8, display: 'flex', flexDirection: 'column', gap: 6, minHeight: 200 }}>
                      {items.map(l => (
                        <div key={l.id} onClick={() => setSelectedLead(l)} style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 8, padding: 10, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2, color: '#111' }}>{nomOf(l)}</div>
                          <div style={{ fontSize: 11, color: '#6B7280' }}>{l.activite} · {l.montant_demande ? `${(l.montant_demande/1e6).toFixed(1)}M` : '—'}</div>
                          <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4, color: scoreColor(l.score) }}>{l.score}/100</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </>}

          {page === 'rapports' && <>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Rapports automatiques</div>
              <div style={{ fontSize: 13, color: '#6B7280' }}>Alertes temps réel dans ce dashboard</div>
            </div>
            <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 14, padding: 20, marginBottom: 12, display: 'flex', gap: 16 }}>
              <div style={{ width: 44, height: 44, background: '#DCFCE7', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A', flexShrink: 0 }}><Icon name="bell" size={22}/></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: '#111' }}>Notification temps réel ACTIVE ✓</div>
                <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>Chaque nouveau lead déclenche un toast + un son + une notification navigateur (si l'onglet est en arrière-plan).</div>
              </div>
            </div>
            {[
              { t: 'Rapport hebdo', d: `${stats.leadsJ7} nouveaux leads · ${stats.finances} financés · Taux ${stats.taux}%`, when: 'Lundi 8h (manuel pour V1)' },
              { t: 'Rapport mensuel', d: `${stats.leadsJ30} leads sur 30 jours · ${stats.deposes} dossiers déposés`, when: '1er du mois (manuel pour V1)' },
            ].map(r => (
              <div key={r.t} style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 14, padding: 20, marginBottom: 12, display: 'flex', gap: 16 }}>
                <div style={{ width: 44, height: 44, background: '#EEF4FF', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1A6BFF', flexShrink: 0 }}><Icon name="file" size={22}/></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: '#111' }}>{r.t}</div>
                  <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>{r.d}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>Prochain : {r.when}</div>
                </div>
              </div>
            ))}
          </>}

        </div>
      </main>

      {/* Toast notification */}
      {toast && (
        <div className="toast">
          <div className="toast-ic"><Icon name="bell" size={16}/></div>
          <div>{toast.msg}</div>
        </div>
      )}

      {/* MODAL LEAD DETAIL */}
      {selectedLead && (() => {
        const l = selectedLead
        const identite = l.identite || {}
        const besoin = l.besoin || {}
        const nom = nomOf(l)
        return (
          <div className="modal-ov" onClick={() => setSelectedLead(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-h">
                <div>
                  <div className="modal-t">{nom}</div>
                  <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>{l.activite || '—'} · {l.ville || '—'}</div>
                </div>
                <button className="modal-close" onClick={() => setSelectedLead(null)}>×</button>
              </div>
              <div className="modal-b">

                <div className="modal-sec">
                  <div className="modal-sec-t">Score</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#F9FAFB', borderRadius: 12, padding: 16 }}>
                    <div style={{ width: 60, height: 60, borderRadius: '50%', border: `3px solid ${scoreColor(l.score)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: scoreColor(l.score) }}>{l.score}</div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: scoreColor(l.score) }}>{l.score >= 70 ? 'Excellent' : l.score >= 50 ? 'Éligible' : 'À renforcer'}</div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>Score calculé automatiquement</div>
                    </div>
                  </div>
                </div>

                <div className="modal-sec">
                  <div className="modal-sec-t">Contact</div>
                  <div className="detail-grid">
                    <div className="detail"><div className="detail-l">Téléphone</div><div className="detail-v">{identite.tel || '—'}</div></div>
                    <div className="detail"><div className="detail-l">Email</div><div className="detail-v">{identite.email || '—'}</div></div>
                  </div>
                </div>

                <div className="modal-sec">
                  <div className="modal-sec-t">Dossier</div>
                  <div className="detail-grid">
                    <div className="detail"><div className="detail-l">Montant</div><div className="detail-v">{l.montant_demande ? `${l.montant_demande.toLocaleString('fr')} XAF` : '—'}</div></div>
                    <div className="detail"><div className="detail-l">Objet</div><div className="detail-v">{besoin.objet || '—'}</div></div>
                    <div className="detail"><div className="detail-l">Banque</div><div className="detail-v">{l.banque_actuelle || '—'}</div></div>
                    <div className="detail"><div className="detail-l">Type</div><div className="detail-v">{l.type === 'morale' ? 'PME' : 'Physique'}</div></div>
                  </div>
                </div>

                <div className="modal-sec">
                  <div className="modal-sec-t">Statut</div>
                  <select className="filter-sel" style={{ width: '100%', padding: '10px 14px', fontSize: 13 }} value={l.statut} onChange={e => { updateStatut(l.id, e.target.value); setSelectedLead({ ...l, statut: e.target.value }) }}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>

                <div className="modal-sec">
                  <div className="modal-sec-t">Actions</div>
                  <a className="client-link" href={`/client/${l.id}`} target="_blank" rel="noopener noreferrer">
                    <Icon name="arrow" size={14}/>Ouvrir espace client
                  </a>
                  <button className="wa-btn" onClick={() => window.open(`https://wa.me/${(identite.tel || '').replace(/\D/g,'')}?text=Bonjour ${identite.prenom || ''}, Mayinvest Conseil au sujet de votre dossier.`, '_blank')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M17.5 14.4l-2.4-1.2c-.3-.2-.7-.1-1 .2l-.7.8c-.2.2-.5.3-.8.1-.9-.4-1.8-1-2.6-1.7-.7-.8-1.3-1.7-1.7-2.6-.1-.3 0-.6.2-.8l.8-.7c.3-.2.4-.6.2-1L8.3 5c-.2-.4-.7-.5-1-.3L5.5 6c-.5.2-.8.7-.7 1.2.4 2.8 1.7 5.4 3.6 7.4 2 2 4.6 3.3 7.4 3.6.5.1 1-.2 1.2-.7l1.3-1.8c.2-.4.1-.9-.3-1.1l-.5-.2z"/></svg>
                    Contacter sur WhatsApp
                  </button>
                  {l.eligibilite?.rccm === 'Non' && (
                    <button className="devis-btn">
                      <Icon name="file" size={14}/>Proposer Pack Formalisation 50 000 XAF
                    </button>
                  )}
                </div>

              </div>
            </div>
          </div>
        )
      })()}

    </div>
  )
}
