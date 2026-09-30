import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

export const Route = createFileRoute('/admin')({
  component: AdminPage,
})

// ─── Supabase ─────────────────────────────────────────────────────────────────
const supabase = createClient(
  'https://vqjzsblllmdmthpysaio.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxanpzYmxsbG1kbXRocHlzYWlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwODI1MzEsImV4cCI6MjEwNTY1ODUzMX0.O9DRpJJJeStk4-oRnqYZJoTLWJgwFRzb2L2ngdg02XU'
)

// ─── Types ────────────────────────────────────────────────────────────────────
type LeadStatus = 'Nouveau' | 'Contacté' | 'Non Éligible' | 'Pack Vendu' | 'Éligible' | 'Dossier Déposé' | 'Financé' | 'Perdu'
interface Lead {
  id: string
  type: string
  activite: string
  ville: string
  montant_demande: number
  statut: LeadStatus
  score: number
  created_at: string
  banque_actuelle: string
  identite: { nom?: string; prenom?: string; tel?: string; email?: string }
  situation: Record<string, unknown>
  besoin: Record<string, unknown>
  eligibilite: Record<string, unknown>
  raison_non_eligibilite?: string
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function nom(l: Lead) { return `${l.identite?.prenom || ''} ${l.identite?.nom || ''}`.trim() || 'Sans nom' }
function scoreClass(s: number) { return s >= 70 ? 'score-high' : s >= 45 ? 'score-med' : 'score-low' }
function pillClass(s: string) {
  const map: Record<string, string> = {
    'Nouveau': 'pill-nouveau', 'Contacté': 'pill-contacte', 'Éligible': 'pill-eligible',
    'Non Éligible': 'pill-non-eligible', 'Pack Vendu': 'pill-pack', 'Financé': 'pill-finance',
    'Perdu': 'pill-perdu', 'Dossier Déposé': 'pill-depose'
  }
  return map[s] || 'pill-nouveau'
}
function fmt(n: number) { return n?.toLocaleString('fr-FR') || '—' }

const PIPELINE_COLS = [
  { key: 'Nouveau', color: '#1A6BFF', bg: '#EEF4FF' },
  { key: 'Contacté', color: '#0891B2', bg: '#E0F7FA' },
  { key: 'Non Éligible', color: '#EA580C', bg: '#FFF0E6' },
  { key: 'Pack Vendu', color: '#7C3AED', bg: '#EDE9FE' },
  { key: 'Éligible', color: '#16A34A', bg: '#DCFCE7' },
  { key: 'Dossier Déposé', color: '#854D0E', bg: '#FEF9C3' },
  { key: 'Financé', color: '#16A34A', bg: '#DCFCE7' },
]

const SEG_SECTEUR = [{ label: 'Tourisme', val: 80, color: '#16A34A' }, { label: 'BTP', val: 65, color: '#0891B2' }, { label: 'Physique', val: 58, color: '#1A6BFF' }, { label: 'Transport', val: 42, color: '#7C3AED' }, { label: 'Commerce', val: 20, color: '#EA580C' }]
const SEG_MONTANT = [{ label: '1M–10M', val: 15, color: '#1A6BFF' }, { label: '10M–30M', val: 25, color: '#16A34A' }, { label: '30M–100M', val: 18, color: '#0891B2' }, { label: '100M–500M', val: 8, color: '#7C3AED' }]
const SEG_BANQUE = [{ label: 'BGFI Bank', val: 55, color: '#1A6BFF' }, { label: 'UBA', val: 60, color: '#16A34A' }, { label: 'LCB Bank', val: 45, color: '#0891B2' }, { label: 'MUCODEC', val: 30, color: '#7C3AED' }]

function HBar({ data, unit = '%' }: { data: { label: string; val: number; color: string }[]; unit?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 500, width: 90, flexShrink: 0 }}>{d.label}</div>
          <div style={{ flex: 1, height: 8, background: 'var(--border)', borderRadius: 100, overflow: 'hidden' }}>
            <div style={{ width: `${d.val}%`, height: '100%', background: d.color, borderRadius: 100 }} />
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, width: 44, textAlign: 'right' }}>{d.val}{unit}</div>
        </div>
      ))}
    </div>
  )
}

export default function AdminPage() {
  const [page, setPage] = useState<'general' | 'ne' | 'banca' | 'segment' | 'crm' | 'rapports'>('general')
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [modalLead, setModalLead] = useState<Lead | null>(null)
  const [filterStatut, setFilterStatut] = useState('Tous')
  const [filterType, setFilterType] = useState('Tous')

  useEffect(() => {
    fetchLeads()
    // Temps réel — écoute les nouveaux leads
    const channel = supabase
      .channel('leads-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => fetchLeads())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function fetchLeads() {
    setLoading(true)
    const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
    if (data) setLeads(data as Lead[])
    setLoading(false)
  }

  async function updateStatut(id: string, statut: LeadStatus) {
    await supabase.from('leads').update({ statut }).eq('id', id)
    fetchLeads()
    setModalLead(null)
  }

  function exportCSV() {
    const header = 'Nom,Type,Activité,Ville,Montant,Statut,Score,Date'
    const rows = leads.map(l => `${nom(l)},${l.type},${l.activite},${l.ville},${fmt(l.montant_demande)} XAF,${l.statut},${l.score}/100,${l.created_at?.slice(0,10)}`)
    const csv = [header, ...rows].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'leads-mayinvest.csv'; a.click()
  }

  const filteredLeads = leads.filter(l =>
    (filterStatut === 'Tous' || l.statut === filterStatut) &&
    (filterType === 'Tous' || l.type === filterType)
  )

  const total = leads.length
  const eligibles = leads.filter(l => ['Éligible','Dossier Déposé','Financé'].includes(l.statut)).length
  const nonEligibles = leads.filter(l => l.statut === 'Non Éligible').length
  const finances = leads.filter(l => l.statut === 'Financé').length
  const deposes = leads.filter(l => l.statut === 'Dossier Déposé').length

  const navItems = [
    { key: 'general', label: 'Vue Générale', icon: '📊', badge: null },
    { key: 'ne', label: 'Non Éligibles', icon: '⚠️', badge: nonEligibles > 0 ? String(nonEligibles) : null },
    { key: 'banca', label: 'Bancarisation', icon: '🏦', badge: null },
    { key: 'segment', label: 'Performance', icon: '📈', badge: null },
    { key: 'crm', label: 'CRM Leads', icon: '👥', badge: total > 0 ? String(total) : null },
    { key: 'rapports', label: 'Rapports Auto', icon: '📋', badge: null },
  ] as const

  return (
    <>
      <style>{`
        :root {
          --bg:#F4F5F7;--surface:#fff;--surface2:#F9FAFB;--border:#E5E7EB;
          --fg:#111827;--fg2:#6B7280;--fg3:#9CA3AF;--accent:#1A6BFF;--accent-light:#EEF4FF;
          --green:#16A34A;--green-light:#DCFCE7;--orange:#EA580C;--orange-light:#FFF0E6;
          --red:#DC2626;--red-light:#FEE2E2;--purple:#7C3AED;--purple-light:#EDE9FE;
          --cyan:#0891B2;--cyan-light:#E0F7FA;--sidebar-w:220px;
        }
        @media(prefers-color-scheme:dark){:root:not([data-theme="light"]){
          --bg:#0F1117;--surface:#1A1D27;--surface2:#22263A;--border:#2D3244;
          --fg:#F1F5F9;--fg2:#94A3B8;--fg3:#64748B;--accent-light:#1A2A4A;
          --green-light:#052E16;--orange-light:#1C0A00;--red-light:#1C0505;
          --purple-light:#1E0A40;--cyan-light:#001B25;color-scheme:dark;
        }}
        :root[data-theme="dark"]{
          --bg:#0F1117;--surface:#1A1D27;--surface2:#22263A;--border:#2D3244;
          --fg:#F1F5F9;--fg2:#94A3B8;--fg3:#64748B;--accent-light:#1A2A4A;
          --green-light:#052E16;--orange-light:#1C0A00;--red-light:#1C0505;
          --purple-light:#1E0A40;--cyan-light:#001B25;color-scheme:dark;
        }
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'Inter',system-ui,sans-serif;background:var(--bg);color:var(--fg);-webkit-font-smoothing:antialiased;}
        .adm-wrap{display:flex;min-height:100vh;}
        .adm-sidebar{width:var(--sidebar-w);background:#0D1B3E;min-height:100vh;display:flex;flex-direction:column;flex-shrink:0;position:sticky;top:0;max-height:100vh;overflow-y:auto;}
        .adm-main{flex:1;display:flex;flex-direction:column;min-width:0;}
        .adm-topbar{height:60px;background:var(--surface);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 28px;position:sticky;top:0;z-index:10;}
        .adm-content{padding:24px 28px;flex:1;}
        .adm-nav-item{display:flex;align-items:center;gap:10px;padding:9px 16px;cursor:pointer;color:rgba(255,255,255,0.55);font-size:13px;font-weight:500;transition:background 0.15s;position:relative;border:none;background:none;width:100%;text-align:left;font-family:inherit;}
        .adm-nav-item:hover{background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.9);}
        .adm-nav-item.active{background:rgba(26,107,255,0.2);color:#fff;}
        .adm-nav-item.active::before{content:'';position:absolute;left:0;top:4px;bottom:4px;width:3px;background:#1A6BFF;border-radius:0 3px 3px 0;}
        .adm-badge{margin-left:auto;background:#1A6BFF;color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:100px;}
        .adm-badge.org{background:var(--orange);}
        .kpi-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:14px;margin-bottom:24px;}
        .kpi-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px;}
        .kpi-label{font-size:11px;font-weight:600;color:var(--fg2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;}
        .kpi-value{font-size:26px;font-weight:800;line-height:1;margin-bottom:4px;font-variant-numeric:tabular-nums;}
        .kpi-sub{font-size:11px;color:var(--fg3);}
        .badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;padding:2px 8px;border-radius:100px;margin-top:6px;}
        .bg{background:var(--green-light);color:var(--green);}
        .bo{background:var(--orange-light);color:var(--orange);}
        .bb{background:var(--accent-light);color:var(--accent);}
        .bp{background:var(--purple-light);color:var(--purple);}
        .charts-row{display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:24px;}
        .chart-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px;}
        .tbl-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:24px;}
        .tbl-hdr{padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;}
        .fsel{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:6px 10px;font-family:inherit;font-size:12px;color:var(--fg);cursor:pointer;}
        table{width:100%;border-collapse:collapse;}
        th{text-align:left;padding:10px 16px;font-size:11px;font-weight:600;color:var(--fg2);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border);background:var(--surface2);}
        td{padding:12px 16px;font-size:13px;border-bottom:1px solid var(--border);}
        tr:last-child td{border-bottom:none;}
        tr:hover td{background:var(--surface2);}
        .spill{display:inline-flex;align-items:center;padding:3px 10px;border-radius:100px;font-size:11px;font-weight:600;white-space:nowrap;}
        .pill-nouveau{background:var(--accent-light);color:var(--accent);}
        .pill-contacte{background:var(--cyan-light);color:var(--cyan);}
        .pill-eligible{background:var(--green-light);color:var(--green);}
        .pill-non-eligible{background:var(--orange-light);color:var(--orange);}
        .pill-pack{background:var(--purple-light);color:var(--purple);}
        .pill-finance{background:var(--green-light);color:var(--green);}
        .pill-perdu{background:var(--red-light);color:var(--red);}
        .pill-depose{background:#FEF9C3;color:#854D0E;}
        .sr{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;font-size:12px;font-weight:800;border:2.5px solid;}
        .score-high{border-color:var(--green);color:var(--green);}
        .score-med{border-color:#CA8A04;color:#CA8A04;}
        .score-low{border-color:var(--red);color:var(--red);}
        .abtn{padding:4px 10px;border-radius:6px;border:1px solid var(--border);background:var(--surface2);font-size:11px;font-weight:600;cursor:pointer;color:var(--fg);font-family:inherit;}
        .abtn:hover{background:var(--accent);color:#fff;border-color:var(--accent);}
        .btn{display:inline-flex;align-items:center;gap:7px;padding:8px 16px;border-radius:100px;border:none;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;}
        .btn-primary{background:var(--accent);color:#fff;}
        .btn-ghost{background:var(--surface2);color:var(--fg);border:1px solid var(--border);}
        .seg-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:24px;}
        .pipeline{display:flex;gap:12px;overflow-x:auto;padding-bottom:12px;}
        .pcol{flex:0 0 190px;}
        .pcol-hdr{padding:10px 14px;border-radius:10px 10px 0 0;font-size:12px;font-weight:700;display:flex;justify-content:space-between;align-items:center;}
        .pcol-body{background:var(--surface2);border:1px solid var(--border);border-top:none;border-radius:0 0 10px 10px;padding:8px;display:flex;flex-direction:column;gap:6px;min-height:180px;}
        .crm-card{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 12px;cursor:pointer;transition:box-shadow 0.15s;}
        .crm-card:hover{box-shadow:0 4px 12px rgba(0,0,0,0.1);}
        .rpt-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:12px;display:flex;align-items:flex-start;gap:16px;}
        .modal-bg{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:200;display:flex;align-items:center;justify-content:center;}
        .modal-box{background:var(--surface);border-radius:20px;width:540px;max-width:95vw;max-height:90vh;overflow-y:auto;padding:28px;}
        .dg{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
        .di{background:var(--surface2);border-radius:10px;padding:10px 14px;}
        .loading{display:flex;align-items:center;justify-content:center;padding:60px;color:var(--fg2);font-size:14px;}
        .statut-sel{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:6px 10px;font-family:inherit;font-size:12px;color:var(--fg);cursor:pointer;width:100%;margin-top:8px;}
        @media(max-width:1200px){.kpi-grid{grid-template-columns:repeat(3,1fr);}.charts-row{grid-template-columns:1fr;}.seg-grid{grid-template-columns:1fr 1fr;}}
        @media(max-width:900px){.adm-sidebar{display:none;}.adm-content{padding:16px;}}
        @media(max-width:640px){.kpi-grid{grid-template-columns:repeat(2,1fr);}.seg-grid{grid-template-columns:1fr;}}
      `}</style>

      <div className="adm-wrap">
        {/* SIDEBAR */}
        <aside className="adm-sidebar">
          <div style={{ padding: 20, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, background: '#1A6BFF', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff' }}>M</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Mayinvest</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Back-Office</div>
              </div>
            </div>
          </div>
          <nav style={{ flex: 1, padding: '12px 0' }}>
            <div style={{ padding: '16px 16px 6px', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Analytics</div>
            {navItems.map(n => (
              <button key={n.key} className={`adm-nav-item${page === n.key ? ' active' : ''}`} onClick={() => setPage(n.key)}>
                <span>{n.icon}</span><span>{n.label}</span>
                {n.badge && <span className={`adm-badge${n.key === 'ne' ? ' org' : ''}`}>{n.badge}</span>}
              </button>
            ))}
          </nav>
          <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, background: '#1A6BFF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>A</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>Admin</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>Mayinvest CG · {loading ? '⟳' : `${total} leads`}</div>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <div className="adm-main">
          <div className="adm-topbar">
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              {navItems.find(n => n.key === page)?.icon} {navItems.find(n => n.key === page)?.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--fg2)' }}>
                {loading ? 'Chargement…' : `${total} leads · temps réel ●`}
              </span>
              <button className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 14px' }} onClick={exportCSV}>⬇ Export CSV</button>
            </div>
          </div>

          <div className="adm-content">
            {loading ? (
              <div className="loading">Chargement des données Supabase…</div>
            ) : (
              <>
                {/* ── VUE GÉNÉRALE ── */}
                {page === 'general' && (
                  <>
                    <div className="kpi-grid">
                      {[
                        { label: 'Total Leads', val: total, sub: 'Depuis le début', badge: 'Temps réel', bc: 'bb' },
                        { label: 'Éligibles', val: eligibles, sub: `${total > 0 ? Math.round(eligibles/total*100) : 0}% du total`, badge: `${total > 0 ? Math.round(eligibles/total*100) : 0}%`, bc: 'bg' },
                        { label: 'Non Éligibles', val: nonEligibles, sub: `${total > 0 ? Math.round(nonEligibles/total*100) : 0}% — Mine d'or`, badge: 'À convertir', bc: 'bo' },
                        { label: 'Dossiers Déposés', val: deposes, sub: 'En cours banque', badge: 'En cours', bc: 'bb' },
                        { label: 'Dossiers Financés', val: finances, sub: `Taux ${total > 0 ? Math.round(finances/total*100) : 0}%`, badge: `${total > 0 ? Math.round(finances/total*100) : 0}%`, bc: 'bg' },
                        { label: 'Score Moyen', val: leads.length > 0 ? Math.round(leads.reduce((a,l) => a + (l.score||0), 0) / leads.length) : 0, sub: 'Sur 100', badge: '/100', bc: 'bp' },
                      ].map((k, i) => (
                        <div key={i} className="kpi-card">
                          <div className="kpi-label">{k.label}</div>
                          <div className="kpi-value">{k.val}</div>
                          <div className="kpi-sub">{k.sub}</div>
                          <div className={`badge ${k.bc}`}>{k.badge}</div>
                        </div>
                      ))}
                    </div>
                    <div className="tbl-card">
                      <div className="tbl-hdr">
                        <div style={{ fontSize: 14, fontWeight: 700 }}>Derniers leads — données réelles</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <select className="fsel" value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
                            <option>Tous</option>
                            {['Nouveau','Contacté','Éligible','Non Éligible','Pack Vendu','Dossier Déposé','Financé','Perdu'].map(s => <option key={s}>{s}</option>)}
                          </select>
                          <select className="fsel" value={filterType} onChange={e => setFilterType(e.target.value)}>
                            <option>Tous</option>
                            <option>Personne physique</option>
                            <option>Personne morale</option>
                          </select>
                        </div>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table>
                          <thead><tr><th>Nom</th><th>Type</th><th>Activité</th><th>Ville</th><th>Montant (XAF)</th><th>Statut</th><th>Score</th><th>Date</th><th>Action</th></tr></thead>
                          <tbody>
                            {filteredLeads.map(l => (
                              <tr key={l.id}>
                                <td style={{ fontWeight: 600 }}>{nom(l)}</td>
                                <td style={{ color: 'var(--fg2)', fontSize: 12 }}>{l.type}</td>
                                <td>{l.activite}</td>
                                <td>{l.ville}</td>
                                <td style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(l.montant_demande)}</td>
                                <td><span className={`spill ${pillClass(l.statut)}`}>{l.statut}</span></td>
                                <td><div className={`sr ${scoreClass(l.score)}`}>{l.score}</div></td>
                                <td style={{ color: 'var(--fg2)', fontSize: 12 }}>{l.created_at?.slice(0,10)}</td>
                                <td><button className="abtn" onClick={() => setModalLead(l)}>Voir</button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}

                {/* ── NON ÉLIGIBLES ── */}
                {page === 'ne' && (
                  <>
                    <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                      <div className="kpi-card">
                        <div className="kpi-label">Total Non Éligibles</div>
                        <div className="kpi-value">{nonEligibles}</div>
                        <div className={`badge bo`}>Mine d'or</div>
                      </div>
                      <div className="kpi-card">
                        <div className="kpi-label">Potentiel Pack Forma.</div>
                        <div className="kpi-value" style={{ fontSize: 20 }}>{fmt(nonEligibles * 50000)} XAF</div>
                        <div className={`badge bp`}>{nonEligibles} × 50 000 XAF</div>
                      </div>
                      <div className="kpi-card">
                        <div className="kpi-label">Potentiel Ouv. Compte</div>
                        <div className="kpi-value" style={{ fontSize: 20 }}>{fmt(nonEligibles * 30000)} XAF</div>
                        <div className={`badge bb`}>{nonEligibles} prospects</div>
                      </div>
                    </div>
                    <div className="tbl-card">
                      <div className="tbl-hdr"><div style={{ fontSize: 14, fontWeight: 700 }}>Leads non éligibles</div></div>
                      <div style={{ overflowX: 'auto' }}>
                        <table>
                          <thead><tr><th>Nom</th><th>Activité</th><th>Ville</th><th>Raison</th><th>Score</th><th>Action</th></tr></thead>
                          <tbody>
                            {leads.filter(l => l.statut === 'Non Éligible').map(l => (
                              <tr key={l.id}>
                                <td style={{ fontWeight: 600 }}>{nom(l)}</td>
                                <td>{l.activite}</td>
                                <td>{l.ville}</td>
                                <td style={{ color: 'var(--orange)', fontSize: 12 }}>{l.raison_non_eligibilite || '—'}</td>
                                <td><div className={`sr ${scoreClass(l.score)}`}>{l.score}</div></td>
                                <td><button className="abtn" onClick={() => setModalLead(l)}>Pack Forma.</button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}

                {/* ── BANCARISATION ── */}
                {page === 'banca' && (
                  <div className="chart-card">
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Impact Mayinvest — Bancarisation</div>
                    <div style={{ fontSize: 12, color: 'var(--fg2)', marginBottom: 24 }}>Transformation des non-bancarisés en clients bancables</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '24px 0' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>AVANT</div>
                        <div style={{ fontSize: 56, fontWeight: 800, color: 'var(--orange)' }}>35%</div>
                        <div style={{ fontSize: 12, color: 'var(--fg2)', marginTop: 4 }}>bancarisés</div>
                      </div>
                      <div style={{ padding: '0 32px', textAlign: 'center' }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--green)' }}>+43pts</div>
                        <div style={{ fontSize: 11, color: 'var(--fg2)' }}>progression</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>APRÈS 3 MOIS</div>
                        <div style={{ fontSize: 56, fontWeight: 800, color: 'var(--green)' }}>78%</div>
                        <div style={{ fontSize: 12, color: 'var(--fg2)', marginTop: 4 }}>bancarisés</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── PERFORMANCE ── */}
                {page === 'segment' && (
                  <div className="seg-grid">
                    <div className="chart-card">
                      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Par Secteur</div>
                      <div style={{ fontSize: 12, color: 'var(--fg2)', marginBottom: 20 }}>Taux d'éligibilité</div>
                      <HBar data={SEG_SECTEUR} />
                    </div>
                    <div className="chart-card">
                      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Par Montant</div>
                      <div style={{ fontSize: 12, color: 'var(--fg2)', marginBottom: 20 }}>Taux de transformation</div>
                      <HBar data={SEG_MONTANT} />
                    </div>
                    <div className="chart-card">
                      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Par Banque</div>
                      <div style={{ fontSize: 12, color: 'var(--fg2)', marginBottom: 20 }}>Taux d'acceptation</div>
                      <HBar data={SEG_BANQUE} />
                    </div>
                  </div>
                )}

                {/* ── CRM ── */}
                {page === 'crm' && (
                  <div className="pipeline">
                    {PIPELINE_COLS.map(col => {
                      const colLeads = leads.filter(l => l.statut === col.key)
                      return (
                        <div key={col.key} className="pcol">
                          <div className="pcol-hdr" style={{ background: col.bg, color: col.color }}>
                            {col.key}
                            <span style={{ background: col.color, color: '#fff', borderRadius: 100, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>{colLeads.length}</span>
                          </div>
                          <div className="pcol-body">
                            {colLeads.map(l => (
                              <div key={l.id} className="crm-card" onClick={() => setModalLead(l)}>
                                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{nom(l)}</div>
                                <div style={{ fontSize: 11, color: 'var(--fg2)' }}>{l.activite} · {l.ville}</div>
                                <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4, color: l.score >= 70 ? 'var(--green)' : l.score >= 45 ? '#CA8A04' : 'var(--red)' }}>Score {l.score}/100</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* ── RAPPORTS ── */}
                {page === 'rapports' && (
                  <>
                    {[
                      { icon: '📅', bg: 'var(--accent-light)', title: 'Rapport Hebdomadaire', desc: 'Tous les lundis à 8h : nouveaux leads, non-éligibles, potentiel Pack Formalisation.', time: 'Prochain : Lundi · 08:00', color: 'var(--accent)' },
                      { icon: '🏦', bg: 'var(--green-light)', title: 'Rapport Bancarisation Mensuel', desc: 'PME bancarisées ce mois, leads éligibles dans 3 mois, impact Mayinvest.', time: 'Prochain : 1er du mois · 08:00', color: 'var(--green)' },
                      { icon: '📊', bg: 'var(--purple-light)', title: 'Rapport Banque Mensuel', desc: 'Taux d'acceptation par banque partenaire, montants financés, dossiers déposés.', time: 'Prochain : 1er du mois · 09:00', color: 'var(--purple)' },
                      { icon: '⚡', bg: 'var(--orange-light)', title: 'Alerte Nouveau Lead', desc: 'Notification immédiate WhatsApp + email à chaque soumission. Score inclus.', time: 'Actif en permanence', color: 'var(--orange)' },
                    ].map((r, i) => (
                      <div key={i} className="rpt-card">
                        <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: r.bg, fontSize: 22 }}>{r.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{r.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--fg2)', lineHeight: 1.5 }}>{r.desc}</div>
                          <div style={{ fontSize: 11, color: r.color, marginTop: 6, fontWeight: 600 }}>🕐 {r.time}</div>
                        </div>
                        <button className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 14px', flexShrink: 0 }}>Configurer</button>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* MODAL LEAD */}
      {modalLead && (
        <div className="modal-bg" onClick={e => { if (e.target === e.currentTarget) setModalLead(null) }}>
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{nom(modalLead)}</div>
                <div style={{ fontSize: 12, color: 'var(--fg2)', marginTop: 2 }}>{modalLead.activite} · {modalLead.ville}</div>
              </div>
              <button onClick={() => setModalLead(null)} style={{ background: 'var(--surface2)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 18, color: 'var(--fg2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'var(--surface2)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <div className={`sr ${scoreClass(modalLead.score)}`} style={{ width: 56, height: 56, fontSize: 18 }}>{modalLead.score}</div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: modalLead.score >= 70 ? 'var(--green)' : modalLead.score >= 45 ? '#CA8A04' : 'var(--red)' }}>
                  {modalLead.score >= 70 ? 'Excellent — Très éligible' : modalLead.score >= 45 ? 'Moyen — À accompagner' : 'Faible — Non éligible'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--fg2)' }}>Score /100 · {modalLead.statut}</div>
              </div>
            </div>
            <div className="dg" style={{ marginBottom: 16 }}>
              <div className="di"><div style={{ fontSize: 11, color: 'var(--fg2)', marginBottom: 2 }}>Téléphone</div><div style={{ fontSize: 13, fontWeight: 600 }}>{modalLead.identite?.tel || '—'}</div></div>
              <div className="di"><div style={{ fontSize: 11, color: 'var(--fg2)', marginBottom: 2 }}>Email</div><div style={{ fontSize: 13, fontWeight: 600 }}>{modalLead.identite?.email || '—'}</div></div>
              <div className="di"><div style={{ fontSize: 11, color: 'var(--fg2)', marginBottom: 2 }}>Montant demandé</div><div style={{ fontSize: 13, fontWeight: 600 }}>{fmt(modalLead.montant_demande)} XAF</div></div>
              <div className="di"><div style={{ fontSize: 11, color: 'var(--fg2)', marginBottom: 2 }}>Banque actuelle</div><div style={{ fontSize: 13, fontWeight: 600 }}>{modalLead.banque_actuelle || '—'}</div></div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Changer le statut</div>
              <select className="statut-sel" value={modalLead.statut} onChange={e => updateStatut(modalLead.id, e.target.value as LeadStatus)}>
                {['Nouveau','Contacté','Non Éligible','Pack Vendu','Éligible','Dossier Déposé','Financé','Perdu'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ flex: 1, background: '#25D366', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                📱 WhatsApp
              </button>
              <button style={{ flex: 1, background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                📄 Devis Pack
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
