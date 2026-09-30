import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/admin')({
  component: AdminPage,
})

// ─── Types ────────────────────────────────────────────────────────────────────
type LeadStatus = 'Nouveau' | 'Contacté' | 'Non Éligible' | 'Pack Vendu' | 'Éligible' | 'Dossier Déposé' | 'Financé' | 'Perdu'
interface Lead {
  id: number; nom: string; type: string; secteur: string; ville: string;
  montant: string; statut: LeadStatus; score: number; date: string;
  banque: string; rccm: boolean; flux: string; tel: string;
}

// ─── Sample data ──────────────────────────────────────────────────────────────
const LEADS: Lead[] = [
  { id: 1, nom: 'Jean-Pierre M.', type: 'Fonctionnaire', secteur: 'Physique', ville: 'Brazzaville', montant: '15 000 000', statut: 'Éligible', score: 90, date: '2024-01-15', banque: 'BGFI Bank', rccm: true, flux: '480 000', tel: '+242 06 123 4567' },
  { id: 2, nom: 'Aurore K.', type: 'PME Commerce', secteur: 'Commerce', ville: 'Brazzaville', montant: '8 000 000', statut: 'Non Éligible', score: 32, date: '2024-01-14', banque: 'Aucune', rccm: false, flux: '650 000', tel: '+242 05 234 5678' },
  { id: 3, nom: 'Lionel B.', type: 'PME Tourisme', secteur: 'Tourisme', ville: 'Pointe-Noire', montant: '50 000 000', statut: 'Dossier Déposé', score: 75, date: '2024-01-13', banque: 'UBA', rccm: true, flux: '3 200 000', tel: '+242 06 345 6789' },
  { id: 4, nom: 'Marie-Claire T.', type: 'Salarié Privé', secteur: 'Physique', ville: 'Dolisie', montant: '5 000 000', statut: 'Contacté', score: 61, date: '2024-01-12', banque: 'MUCODEC', rccm: true, flux: '320 000', tel: '+242 05 456 7890' },
  { id: 5, nom: 'Patrick N.', type: 'PME BTP', secteur: 'BTP', ville: 'Brazzaville', montant: '120 000 000', statut: 'Financé', score: 88, date: '2024-01-10', banque: 'BGFI Bank', rccm: true, flux: '8 500 000', tel: '+242 06 567 8901' },
  { id: 6, nom: 'Carine M.', type: 'PME Commerce', secteur: 'Commerce', ville: 'Brazzaville', montant: '25 000 000', statut: 'Pack Vendu', score: 45, date: '2024-01-09', banque: 'Aucune', rccm: false, flux: '1 100 000', tel: '+242 05 678 9012' },
  { id: 7, nom: 'Robert K.', type: 'Commerçant', secteur: 'Physique', ville: 'Pointe-Noire', montant: '3 000 000', statut: 'Nouveau', score: 55, date: '2024-01-08', banque: 'LCB Bank', rccm: true, flux: '280 000', tel: '+242 06 789 0123' },
  { id: 8, nom: 'Sylvie A.', type: 'PME Transport', secteur: 'Transport', ville: 'Brazzaville', montant: '80 000 000', statut: 'Non Éligible', score: 28, date: '2024-01-07', banque: 'Aucune', rccm: false, flux: '400 000', tel: '+242 05 890 1234' },
]

const LINE_DATA = [42,38,55,61,48,72,68,85,79,92,88,103,98,112,108,125,119,132,128,145,141,158,154,168,162,175,171,188,182,195]
const DONUT = [{ label: 'Éligibles', val: 27.8, color: '#16A34A' }, { label: 'Non Éligibles', val: 72.2, color: '#EA580C' }]
const NE_DATA = [
  { raison: 'Pas de compte bancaire', nb: 140, pct: 44.8, ca: '4 200 000', action: 'Proposer Ouverture Compte', color: '#EA580C' },
  { raison: 'Pas de RCCM', nb: 98, pct: 31.4, ca: '4 900 000', action: 'Proposer Pack Formalisation', color: '#7C3AED' },
  { raison: 'Flux < 1M/mois', nb: 45, pct: 14.4, ca: '0', action: 'Mettre en couveuse 3 mois', color: '#0891B2' },
  { raison: 'Refus bancaire', nb: 29, pct: 9.3, ca: '1 450 000', action: 'Proposer Restructuration', color: '#DC2626' },
]
const SEG_SECTEUR = [{ label: 'Tourisme', val: 80, color: '#16A34A' }, { label: 'BTP', val: 65, color: '#0891B2' }, { label: 'Physique', val: 58, color: '#1A6BFF' }, { label: 'Transport', val: 42, color: '#7C3AED' }, { label: 'Commerce', val: 20, color: '#EA580C' }]
const SEG_MONTANT = [{ label: '1M–10M', val: 15, color: '#1A6BFF' }, { label: '10M–30M', val: 25, color: '#16A34A' }, { label: '30M–100M', val: 18, color: '#0891B2' }, { label: '100M–500M', val: 8, color: '#7C3AED' }]
const SEG_BANQUE = [{ label: 'BGFI Bank', val: 55, color: '#1A6BFF' }, { label: 'UBA', val: 60, color: '#16A34A' }, { label: 'LCB Bank', val: 45, color: '#0891B2' }, { label: 'MUCODEC', val: 30, color: '#7C3AED' }]
const PIPELINE_COLS: { key: LeadStatus; color: string; bg: string }[] = [
  { key: 'Nouveau', color: '#1A6BFF', bg: '#EEF4FF' },
  { key: 'Contacté', color: '#0891B2', bg: '#E0F7FA' },
  { key: 'Non Éligible', color: '#EA580C', bg: '#FFF0E6' },
  { key: 'Pack Vendu', color: '#7C3AED', bg: '#EDE9FE' },
  { key: 'Éligible', color: '#16A34A', bg: '#DCFCE7' },
  { key: 'Dossier Déposé', color: '#854D0E', bg: '#FEF9C3' },
  { key: 'Financé', color: '#16A34A', bg: '#DCFCE7' },
]

// ─── Utils ────────────────────────────────────────────────────────────────────
function scoreClass(s: number) {
  if (s >= 70) return 'score-high'
  if (s >= 45) return 'score-med'
  return 'score-low'
}
function pillClass(s: LeadStatus) {
  const map: Record<LeadStatus, string> = {
    'Nouveau': 'pill-nouveau', 'Contacté': 'pill-contacte', 'Éligible': 'pill-eligible',
    'Non Éligible': 'pill-non-eligible', 'Pack Vendu': 'pill-pack', 'Financé': 'pill-finance',
    'Perdu': 'pill-perdu', 'Dossier Déposé': 'pill-depose'
  }
  return map[s] || 'pill-nouveau'
}
function exportCSV() {
  const header = 'Nom,Type,Secteur,Ville,Montant,Statut,Score,Date'
  const rows = LEADS.map(l => `${l.nom},${l.type},${l.secteur},${l.ville},${l.montant} XAF,${l.statut},${l.score}/100,${l.date}`)
  const csv = [header, ...rows].join('\n')
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = 'leads-mayinvest.csv'; a.click()
}

// ─── SVG Line Chart ───────────────────────────────────────────────────────────
function LineChart() {
  const [tip, setTip] = useState<{ x: number; y: number; val: number } | null>(null)
  const W = 560, H = 180, pad = { t: 10, r: 10, b: 30, l: 36 }
  const min = Math.min(...LINE_DATA), max = Math.max(...LINE_DATA)
  const scX = (i: number) => pad.l + (i / (LINE_DATA.length - 1)) * (W - pad.l - pad.r)
  const scY = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b)
  const pts = LINE_DATA.map((v, i) => `${scX(i)},${scY(v)}`).join(' ')
  const area = `M${scX(0)},${scY(LINE_DATA[0])} ` + LINE_DATA.map((v, i) => `L${scX(i)},${scY(v)}`).join(' ') + ` L${scX(LINE_DATA.length - 1)},${H - pad.b} L${scX(0)},${H - pad.b} Z`
  const ticks = [1, 8, 15, 22, 30]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', overflow: 'visible' }}>
      <defs>
        <linearGradient id="lgr" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1A6BFF" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#1A6BFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map(f => {
        const yy = pad.t + f * (H - pad.t - pad.b)
        return <line key={f} x1={pad.l} y1={yy} x2={W - pad.r} y2={yy} stroke="var(--border)" strokeWidth="1" />
      })}
      {ticks.map(i => (
        <text key={i} x={scX(i - 1)} y={H - pad.b + 18} textAnchor="middle" fontSize="10" fill="var(--fg3)">J-{30 - i}</text>
      ))}
      <path d={area} fill="url(#lgr)" />
      <polyline points={pts} fill="none" stroke="#1A6BFF" strokeWidth="2" strokeLinejoin="round" />
      {LINE_DATA.map((v, i) => (
        <circle key={i} cx={scX(i)} cy={scY(v)} r={tip?.val === v && tip.x === scX(i) ? 5 : 3}
          fill="#1A6BFF" stroke="var(--surface)" strokeWidth="2" style={{ cursor: 'pointer' }}
          onMouseEnter={e => setTip({ x: scX(i), y: scY(v), val: v })}
          onMouseLeave={() => setTip(null)} />
      ))}
      {tip && (
        <g>
          <rect x={tip.x - 28} y={tip.y - 28} width="56" height="20" rx="6" fill="#111827" />
          <text x={tip.x} y={tip.y - 14} textAnchor="middle" fontSize="11" fontWeight="700" fill="white">{tip.val} leads</text>
        </g>
      )}
    </svg>
  )
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart() {
  const [hov, setHov] = useState<number | null>(null)
  const R = 56, C = 80, strokeW = 16
  const circ = 2 * Math.PI * R
  let offset = 0
  const slices = DONUT.map((d, i) => {
    const len = (d.val / 100) * circ
    const el = { ...d, offset, len, i }
    offset += len
    return el
  })
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <svg width={C * 2} height={C * 2} viewBox={`0 0 ${C * 2} ${C * 2}`}>
        {slices.map(s => (
          <circle key={s.i} cx={C} cy={C} r={R} fill="none" stroke={s.color}
            strokeWidth={hov === s.i ? strokeW + 3 : strokeW}
            strokeDasharray={`${s.len} ${circ - s.len}`}
            strokeDashoffset={-s.offset} strokeLinecap="butt"
            style={{ transform: 'rotate(-90deg)', transformOrigin: `${C}px ${C}px`, cursor: 'pointer', transition: 'stroke-width 0.15s' }}
            onMouseEnter={() => setHov(s.i)} onMouseLeave={() => setHov(null)} />
        ))}
        <text x={C} y={C - 6} textAnchor="middle" fontSize="22" fontWeight="800" fill="var(--fg)">432</text>
        <text x={C} y={C + 14} textAnchor="middle" fontSize="11" fill="var(--fg2)">leads</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {DONUT.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{d.val}%</div>
              <div style={{ fontSize: 11, color: 'var(--fg2)' }}>{d.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Horizontal bar ───────────────────────────────────────────────────────────
function HBar({ data, unit = '%' }: { data: typeof SEG_SECTEUR; unit?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 500, width: 90, flexShrink: 0, color: 'var(--fg)' }}>{d.label}</div>
          <div style={{ flex: 1, height: 8, background: 'var(--border)', borderRadius: 100, overflow: 'hidden' }}>
            <div style={{ width: `${d.val}%`, height: '100%', background: d.color, borderRadius: 100, transition: 'width 0.5s ease' }} />
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, width: 44, textAlign: 'right', color: 'var(--fg)' }}>{d.val}{unit}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AdminPage() {
  const [page, setPage] = useState<'general' | 'ne' | 'banca' | 'segment' | 'crm' | 'rapports'>('general')
  const [modalLead, setModalLead] = useState<Lead | null>(null)
  const [filterStatut, setFilterStatut] = useState('Tous')
  const [filterType, setFilterType] = useState('Tous')

  const filteredLeads = LEADS.filter(l =>
    (filterStatut === 'Tous' || l.statut === filterStatut) &&
    (filterType === 'Tous' || l.secteur === filterType)
  )

  const navItems = [
    { key: 'general', label: 'Vue Générale', icon: '📊', badge: null },
    { key: 'ne', label: 'Non Éligibles', icon: '⚠️', badge: '312' },
    { key: 'banca', label: 'Bancarisation', icon: '🏦', badge: null },
    { key: 'segment', label: 'Performance', icon: '📈', badge: null },
    { key: 'crm', label: 'CRM Leads', icon: '👥', badge: '8' },
    { key: 'rapports', label: 'Rapports Auto', icon: '📋', badge: null },
  ] as const

  return (
    <>
      <style>{`
        :root {
          --bg: #F4F5F7; --surface: #FFFFFF; --surface2: #F9FAFB;
          --border: #E5E7EB; --fg: #111827; --fg2: #6B7280; --fg3: #9CA3AF;
          --accent: #1A6BFF; --accent-light: #EEF4FF;
          --green: #16A34A; --green-light: #DCFCE7;
          --orange: #EA580C; --orange-light: #FFF0E6;
          --red: #DC2626; --red-light: #FEE2E2;
          --purple: #7C3AED; --purple-light: #EDE9FE;
          --cyan: #0891B2; --cyan-light: #E0F7FA;
          --sidebar-w: 220px;
        }
        @media (prefers-color-scheme: dark) {
          :root:not([data-theme="light"]) {
            --bg: #0F1117; --surface: #1A1D27; --surface2: #22263A;
            --border: #2D3244; --fg: #F1F5F9; --fg2: #94A3B8; --fg3: #64748B;
            --accent-light: #1A2A4A; --green-light: #052E16; --orange-light: #1C0A00;
            --red-light: #1C0505; --purple-light: #1E0A40; --cyan-light: #001B25;
            color-scheme: dark;
          }
        }
        :root[data-theme="dark"] {
          --bg: #0F1117; --surface: #1A1D27; --surface2: #22263A;
          --border: #2D3244; --fg: #F1F5F9; --fg2: #94A3B8; --fg3: #64748B;
          --accent-light: #1A2A4A; --green-light: #052E16; --orange-light: #1C0A00;
          --red-light: #1C0505; --purple-light: #1E0A40; --cyan-light: #001B25;
          color-scheme: dark;
        }
        .adm-wrap { display: flex; min-height: 100vh; font-family: 'Inter', system-ui, sans-serif; background: var(--bg); color: var(--fg); }
        .adm-sidebar { width: var(--sidebar-w); background: #0D1B3E; min-height: 100vh; display: flex; flex-direction: column; flex-shrink: 0; position: sticky; top: 0; max-height: 100vh; overflow-y: auto; }
        .adm-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        .adm-topbar { height: 60px; background: var(--surface); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; padding: 0 28px; position: sticky; top: 0; z-index: 10; }
        .adm-content { padding: 24px 28px; flex: 1; }
        .adm-logo { padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .adm-logo-sq { width: 34px; height: 34px; background: #1A6BFF; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 800; color: #fff; }
        .adm-nav { flex: 1; padding: 12px 0; }
        .adm-nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 16px; cursor: pointer; color: rgba(255,255,255,0.55); font-size: 13px; font-weight: 500; transition: background 0.15s; position: relative; border: none; background: none; width: 100%; text-align: left; }
        .adm-nav-item:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.9); }
        .adm-nav-item.active { background: rgba(26,107,255,0.2); color: #fff; }
        .adm-nav-item.active::before { content: ''; position: absolute; left: 0; top: 4px; bottom: 4px; width: 3px; background: #1A6BFF; border-radius: 0 3px 3px 0; }
        .adm-badge { margin-left: auto; background: #1A6BFF; color: #fff; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 100px; }
        .adm-badge.org { background: var(--orange); }
        .kpi-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 14px; margin-bottom: 24px; }
        .kpi-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px; }
        .kpi-label { font-size: 11px; font-weight: 600; color: var(--fg2); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; }
        .kpi-value { font-size: 26px; font-weight: 800; line-height: 1; margin-bottom: 4px; font-variant-numeric: tabular-nums; }
        .kpi-sub { font-size: 11px; color: var(--fg3); }
        .badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 100px; margin-top: 6px; }
        .bg { background: var(--green-light); color: var(--green); }
        .bo { background: var(--orange-light); color: var(--orange); }
        .bb { background: var(--accent-light); color: var(--accent); }
        .bp { background: var(--purple-light); color: var(--purple); }
        .br { background: var(--red-light); color: var(--red); }
        .charts-row { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-bottom: 24px; }
        .chart-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 20px; }
        .tbl-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; margin-bottom: 24px; }
        .tbl-hdr { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
        .tbl-filters { display: flex; gap: 8px; flex-wrap: wrap; }
        .fsel { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 6px 10px; font-family: inherit; font-size: 12px; color: var(--fg); cursor: pointer; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; padding: 10px 16px; font-size: 11px; font-weight: 600; color: var(--fg2); text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid var(--border); background: var(--surface2); }
        td { padding: 12px 16px; font-size: 13px; border-bottom: 1px solid var(--border); }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: var(--surface2); }
        .spill { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 100px; font-size: 11px; font-weight: 600; white-space: nowrap; }
        .pill-nouveau { background: var(--accent-light); color: var(--accent); }
        .pill-contacte { background: var(--cyan-light); color: var(--cyan); }
        .pill-eligible { background: var(--green-light); color: var(--green); }
        .pill-non-eligible { background: var(--orange-light); color: var(--orange); }
        .pill-pack { background: var(--purple-light); color: var(--purple); }
        .pill-finance { background: var(--green-light); color: var(--green); }
        .pill-perdu { background: var(--red-light); color: var(--red); }
        .pill-depose { background: #FEF9C3; color: #854D0E; }
        .sr { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; font-size: 12px; font-weight: 800; border: 2.5px solid; }
        .score-high { border-color: var(--green); color: var(--green); }
        .score-med { border-color: #CA8A04; color: #CA8A04; }
        .score-low { border-color: var(--red); color: var(--red); }
        .abtn { padding: 4px 10px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface2); font-size: 11px; font-weight: 600; cursor: pointer; color: var(--fg); font-family: inherit; }
        .abtn:hover { background: var(--accent); color: #fff; border-color: var(--accent); }
        .btn { display: inline-flex; align-items: center; gap: 7px; padding: 8px 16px; border-radius: 100px; border: none; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 600; }
        .btn-primary { background: var(--accent); color: #fff; }
        .btn-ghost { background: var(--surface2); color: var(--fg); border: 1px solid var(--border); }
        .ne-row { display: grid; grid-template-columns: 1fr 72px 72px 140px 160px; gap: 14px; align-items: center; padding: 14px 20px; border-bottom: 1px solid var(--border); }
        .ne-row:last-child { border-bottom: none; }
        .ne-row:hover { background: var(--surface2); }
        .ne-hdr { background: var(--surface2); font-size: 11px; font-weight: 600; color: var(--fg2); text-transform: uppercase; letter-spacing: 0.06em; }
        .pb { height: 6px; background: var(--border); border-radius: 100px; overflow: hidden; margin-top: 4px; }
        .pbf { height: 100%; border-radius: 100px; }
        .banca-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
        .banca-cmp { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 24px; }
        .seg-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 24px; }
        .pipeline { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 12px; margin-bottom: 20px; }
        .pcol { flex: 0 0 190px; }
        .pcol-hdr { padding: 10px 14px; border-radius: 10px 10px 0 0; font-size: 12px; font-weight: 700; display: flex; justify-content: space-between; align-items: center; }
        .pcol-body { background: var(--surface2); border: 1px solid var(--border); border-top: none; border-radius: 0 0 10px 10px; padding: 8px; display: flex; flex-direction: column; gap: 6px; min-height: 180px; }
        .crm-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; cursor: pointer; transition: box-shadow 0.15s; }
        .crm-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .rpt-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 20px; margin-bottom: 12px; display: flex; align-items: flex-start; gap: 16px; }
        .rpt-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 22px; }
        .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 200; display: flex; align-items: center; justify-content: center; }
        .modal-box { background: var(--surface); border-radius: 20px; width: 540px; max-width: 95vw; max-height: 90vh; overflow-y: auto; padding: 28px; }
        .dg { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .di { background: var(--surface2); border-radius: 10px; padding: 10px 14px; }
        .lc { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
        .ls { padding: 5px 12px; border-radius: 100px; font-size: 11px; font-weight: 600; opacity: 0.35; }
        .ls.done { opacity: 1; }
        .ls.cur { opacity: 1; outline: 2px solid var(--accent); outline-offset: 2px; }
        .wa-btn { background: #25D366; color: #fff; border: none; border-radius: 10px; padding: 12px 18px; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; width: 100%; margin-bottom: 8px; }
        .dv-btn { background: var(--purple); color: #fff; border: none; border-radius: 10px; padding: 12px 18px; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; width: 100%; }
        @media (max-width: 1200px) { .kpi-grid { grid-template-columns: repeat(3, 1fr); } .charts-row { grid-template-columns: 1fr; } .seg-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 900px) { .adm-sidebar { display: none; } .banca-grid { grid-template-columns: 1fr; } }
        @media (max-width: 640px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } .seg-grid { grid-template-columns: 1fr; } .adm-content { padding: 16px; } }
      `}</style>

      <div className="adm-wrap">
        {/* SIDEBAR */}
        <aside className="adm-sidebar">
          <div className="adm-logo">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="adm-logo-sq">M</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Mayinvest</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Back-Office</div>
              </div>
            </div>
          </div>
          <nav className="adm-nav">
            <div style={{ padding: '16px 16px 6px', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Analytics</div>
            {navItems.map(n => (
              <button key={n.key} className={`adm-nav-item${page === n.key ? ' active' : ''}`} onClick={() => setPage(n.key)}>
                <span>{n.icon}</span>
                <span>{n.label}</span>
                {n.badge && <span className={`adm-badge${n.key === 'ne' ? ' org' : ''}`}>{n.badge}</span>}
              </button>
            ))}
          </nav>
          <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, background: '#1A6BFF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>A</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>Admin</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>Mayinvest CG</div>
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
              <span style={{ fontSize: 12, color: 'var(--fg2)' }}>Sept 2026</span>
              <button className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 14px' }} onClick={exportCSV}>⬇ Export CSV</button>
              <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 14px' }}>+ Nouveau Lead</button>
            </div>
          </div>

          <div className="adm-content">

            {/* ── PAGE 1 : VUE GÉNÉRALE ── */}
            {page === 'general' && (
              <>
                <div className="kpi-grid">
                  {[
                    { label: 'Total Leads', val: '432', sub: 'Depuis le début', badge: '+32 ce mois', bc: 'bb' },
                    { label: 'Éligibles Banque', val: '120', sub: '27.8% du total', badge: '27.8%', bc: 'bg' },
                    { label: 'Non Éligibles', val: '312', sub: '72.2% du total', badge: 'Mine d'or', bc: 'bo' },
                    { label: 'Dossiers Déposés', val: '45', sub: 'En cours', badge: '37.5% conv.', bc: 'bb' },
                    { label: 'Dossiers Financés', val: '18', sub: 'Taux transfo 15%', badge: '15%', bc: 'bg' },
                    { label: 'CA Mayinvest', val: '9.45M', sub: 'XAF générés', badge: '↑ +18%', bc: 'bg' },
                  ].map((k, i) => (
                    <div key={i} className="kpi-card">
                      <div className="kpi-label">{k.label}</div>
                      <div className="kpi-value">{k.val}</div>
                      <div className="kpi-sub">{k.sub}</div>
                      <div className={`badge ${k.bc}`}>{k.badge}</div>
                    </div>
                  ))}
                </div>
                <div className="charts-row">
                  <div className="chart-card">
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Leads sur 30 jours</div>
                    <div style={{ fontSize: 12, color: 'var(--fg2)', marginBottom: 16 }}>Nouveaux leads quotidiens — tendance mensuelle</div>
                    <LineChart />
                  </div>
                  <div className="chart-card">
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Éligibilité globale</div>
                    <div style={{ fontSize: 12, color: 'var(--fg2)', marginBottom: 16 }}>Répartition des 432 leads</div>
                    <DonutChart />
                  </div>
                </div>
                <div className="tbl-card">
                  <div className="tbl-hdr">
                    <div style={{ fontSize: 14, fontWeight: 700 }}>Derniers leads</div>
                    <div className="tbl-filters">
                      <select className="fsel" value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
                        <option>Tous</option>
                        {(['Nouveau','Contacté','Éligible','Non Éligible','Pack Vendu','Dossier Déposé','Financé','Perdu'] as LeadStatus[]).map(s => <option key={s}>{s}</option>)}
                      </select>
                      <select className="fsel" value={filterType} onChange={e => setFilterType(e.target.value)}>
                        <option>Tous</option>
                        {['Physique','Commerce','Tourisme','BTP','Transport','Agriculture'].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead><tr><th>Nom</th><th>Type</th><th>Ville</th><th>Montant (XAF)</th><th>Statut</th><th>Score</th><th>Date</th><th>Action</th></tr></thead>
                      <tbody>
                        {filteredLeads.map(l => (
                          <tr key={l.id}>
                            <td style={{ fontWeight: 600 }}>{l.nom}</td>
                            <td style={{ color: 'var(--fg2)' }}>{l.type}</td>
                            <td>{l.ville}</td>
                            <td style={{ fontVariantNumeric: 'tabular-nums' }}>{l.montant}</td>
                            <td><span className={`spill ${pillClass(l.statut)}`}>{l.statut}</span></td>
                            <td><div className={`sr ${scoreClass(l.score)}`}>{l.score}</div></td>
                            <td style={{ color: 'var(--fg2)', fontSize: 12 }}>{l.date}</td>
                            <td><button className="abtn" onClick={() => setModalLead(l)}>Voir</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* ── PAGE 2 : NON ÉLIGIBLES ── */}
            {page === 'ne' && (
              <>
                <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  {[
                    { label: 'Total Non Éligibles', val: '312', badge: '72.2%', bc: 'bo' },
                    { label: 'Potentiel Pack Forma.', val: '4.9M XAF', badge: '98 prospects', bc: 'bp' },
                    { label: 'Potentiel Ouv. Compte', val: '4.2M XAF', badge: '140 prospects', bc: 'bb' },
                    { label: 'Total Potentiel CA', val: '10.55M XAF', badge: '↑ à convertir', bc: 'bg' },
                  ].map((k, i) => (
                    <div key={i} className="kpi-card">
                      <div className="kpi-label">{k.label}</div>
                      <div className="kpi-value" style={{ fontSize: 22 }}>{k.val}</div>
                      <div className={`badge ${k.bc}`}>{k.badge}</div>
                    </div>
                  ))}
                </div>
                <div className="tbl-card">
                  <div className="ne-row ne-hdr">
                    <span>Raison de Non-Éligibilité</span><span>Leads</span><span>%</span><span>Potentiel CA</span><span>Action recommandée</span>
                  </div>
                  {NE_DATA.map((d, i) => (
                    <div key={i} className="ne-row">
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{d.raison}</div>
                        <div className="pb"><div className="pbf" style={{ width: `${d.pct}%`, background: d.color }} /></div>
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: d.color }}>{d.nb}</div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{d.pct}%</div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{d.ca === '0' ? '—' : `${d.ca} XAF`}</div>
                      <button className="abtn" style={{ whiteSpace: 'normal', textAlign: 'left', lineHeight: 1.3 }}>{d.action}</button>
                    </div>
                  ))}
                </div>
                <div className="chart-card">
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Projection — Pipeline de transformation</div>
                  <div style={{ fontSize: 12, color: 'var(--fg2)', marginBottom: 20 }}>312 non-éligibles → revenu potentiel sur 3 mois</div>
                  <HBar data={[
                    { label: 'Sans compte', val: 45, color: '#EA580C' },
                    { label: 'Sans RCCM', val: 31, color: '#7C3AED' },
                    { label: 'Flux < 1M', val: 14, color: '#0891B2' },
                    { label: 'Refus banque', val: 10, color: '#DC2626' },
                  ]} />
                </div>
              </>
            )}

            {/* ── PAGE 3 : BANCARISATION ── */}
            {page === 'banca' && (
              <>
                <div className="banca-grid">
                  <div className="chart-card">
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Bancarisation</div>
                    <div style={{ fontSize: 12, color: 'var(--fg2)', marginBottom: 16 }}>Avant → Après 3 mois Mayinvest</div>
                    <div className="banca-cmp">
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>AVANT</div>
                        <div style={{ fontSize: 48, fontWeight: 800, color: 'var(--orange)' }}>35%</div>
                        <div style={{ fontSize: 12, color: 'var(--fg2)', marginTop: 4 }}>bancarisés</div>
                      </div>
                      <div style={{ padding: '0 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)' }}>+43pts</div>
                        <div style={{ fontSize: 11, color: 'var(--fg2)' }}>progression</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>APRÈS</div>
                        <div style={{ fontSize: 48, fontWeight: 800, color: 'var(--green)' }}>78%</div>
                        <div style={{ fontSize: 12, color: 'var(--fg2)', marginTop: 4 }}>bancarisés</div>
                      </div>
                    </div>
                  </div>
                  <div className="chart-card">
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Formalisation RCCM</div>
                    <div style={{ fontSize: 12, color: 'var(--fg2)', marginBottom: 16 }}>Taux de PME avec RCCM</div>
                    <div className="banca-cmp">
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>AVANT</div>
                        <div style={{ fontSize: 48, fontWeight: 800, color: 'var(--orange)' }}>28%</div>
                        <div style={{ fontSize: 12, color: 'var(--fg2)', marginTop: 4 }}>avec RCCM</div>
                      </div>
                      <div style={{ padding: '0 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)' }}>+37pts</div>
                        <div style={{ fontSize: 11, color: 'var(--fg2)' }}>progression</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>APRÈS</div>
                        <div style={{ fontSize: 48, fontWeight: 800, color: 'var(--green)' }}>65%</div>
                        <div style={{ fontSize: 12, color: 'var(--fg2)', marginTop: 4 }}>avec RCCM</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="tbl-card">
                  <div className="tbl-hdr"><div style={{ fontSize: 14, fontWeight: 700 }}>Suivi individuel — Sans compte bancaire (140)</div></div>
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead><tr><th>Nom</th><th>Secteur</th><th>Ville</th><th>Statut</th><th>Action</th></tr></thead>
                      <tbody>
                        {[
                          { nom: 'Aurore K.', sect: 'Commerce', ville: 'Brazzaville', st: 'Contacté' },
                          { nom: 'Sylvie A.', sect: 'Transport', ville: 'Brazzaville', st: 'RDV Banque planifié' },
                          { nom: 'Marc D.', sect: 'Agriculture', ville: 'Dolisie', st: 'Compte Ouvert ✅' },
                          { nom: 'Béatrice L.', sect: 'Commerce', ville: 'Pointe-Noire', st: 'Nouveau' },
                          { nom: 'Guy-Noël F.', sect: 'BTP', ville: 'Brazzaville', st: 'Compte Ouvert ✅' },
                        ].map((l, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>{l.nom}</td>
                            <td>{l.sect}</td>
                            <td>{l.ville}</td>
                            <td><span className={`spill ${l.st.includes('✅') ? 'pill-finance' : l.st === 'Nouveau' ? 'pill-nouveau' : 'pill-contacte'}`}>{l.st}</span></td>
                            <td><button className="abtn">Script WhatsApp</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* ── PAGE 4 : PERFORMANCE SEGMENT ── */}
            {page === 'segment' && (
              <div className="seg-grid">
                <div className="chart-card">
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Par Secteur</div>
                  <div style={{ fontSize: 12, color: 'var(--fg2)', marginBottom: 20 }}>Taux d'éligibilité par secteur</div>
                  <HBar data={SEG_SECTEUR} />
                </div>
                <div className="chart-card">
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Par Montant demandé</div>
                  <div style={{ fontSize: 12, color: 'var(--fg2)', marginBottom: 20 }}>Taux de transformation par tranche</div>
                  <HBar data={SEG_MONTANT} />
                </div>
                <div className="chart-card">
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Par Banque partenaire</div>
                  <div style={{ fontSize: 12, color: 'var(--fg2)', marginBottom: 20 }}>Taux d'acceptation dossiers</div>
                  <HBar data={SEG_BANQUE} />
                </div>
              </div>
            )}

            {/* ── PAGE 5 : CRM ── */}
            {page === 'crm' && (
              <>
                <div className="pipeline">
                  {PIPELINE_COLS.map(col => {
                    const leads = LEADS.filter(l => l.statut === col.key)
                    return (
                      <div key={col.key} className="pcol">
                        <div className="pcol-hdr" style={{ background: col.bg, color: col.color }}>
                          {col.key}<span style={{ background: col.color, color: '#fff', borderRadius: 100, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>{leads.length}</span>
                        </div>
                        <div className="pcol-body">
                          {leads.map(l => (
                            <div key={l.id} className="crm-card" onClick={() => setModalLead(l)}>
                              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{l.nom}</div>
                              <div style={{ fontSize: 11, color: 'var(--fg2)' }}>{l.type} · {l.ville}</div>
                              <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4, color: l.score >= 70 ? 'var(--green)' : l.score >= 45 ? '#CA8A04' : 'var(--red)' }}>Score {l.score}/100</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* ── PAGE 6 : RAPPORTS ── */}
            {page === 'rapports' && (
              <>
                {[
                  { icon: '📅', bg: 'var(--accent-light)', title: 'Rapport Hebdomadaire', desc: 'Tous les lundis à 8h : nombre de nouveaux leads, non-éligibles, potentiel Pack Formalisation de la semaine.', time: 'Prochain : Lundi 07 Oct · 08:00', color: 'var(--accent)' },
                  { icon: '🏦', bg: 'var(--green-light)', title: 'Rapport Bancarisation Mensuel', desc: 'Chaque 1er du mois : PME bancarisées ce mois, nombre qui seront éligibles dans 3 mois, impact Mayinvest.', time: 'Prochain : 01 Nov · 08:00', color: 'var(--green)' },
                  { icon: '📊', bg: 'var(--purple-light)', title: 'Rapport Banque Mensuel', desc: 'Bilan par banque partenaire : UBA, BGFI, MUCODEC. Taux d'acceptation dossiers, montants financés.', time: 'Prochain : 01 Nov · 09:00', color: 'var(--purple)' },
                  { icon: '⚡', bg: 'var(--orange-light)', title: 'Alerte Nouveau Lead (Temps Réel)', desc: 'Notification WhatsApp + email immédiate à chaque soumission de formulaire. Score d'éligibilité inclus.', time: 'Actif en permanence', color: 'var(--orange)' },
                ].map((r, i) => (
                  <div key={i} className="rpt-card">
                    <div className="rpt-icon" style={{ background: r.bg, fontSize: 22 }}>{r.icon}</div>
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

          </div>
        </div>
      </div>

      {/* MODAL LEAD */}
      {modalLead && (
        <div className="modal-bg" onClick={e => { if (e.target === e.currentTarget) setModalLead(null) }}>
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{modalLead.nom}</div>
                <div style={{ fontSize: 12, color: 'var(--fg2)', marginTop: 2 }}>{modalLead.type} · {modalLead.ville}</div>
              </div>
              <button onClick={() => setModalLead(null)} style={{ background: 'var(--surface2)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 18, color: 'var(--fg2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Score d'éligibilité</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'var(--surface2)', borderRadius: 12, padding: 14 }}>
                <div className={`sr ${scoreClass(modalLead.score)}`} style={{ width: 56, height: 56, fontSize: 18 }}>{modalLead.score}</div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: modalLead.score >= 70 ? 'var(--green)' : modalLead.score >= 45 ? '#CA8A04' : 'var(--red)' }}>
                    {modalLead.score >= 70 ? 'Excellent — Très éligible' : modalLead.score >= 45 ? 'Moyen — À accompagner' : 'Faible — Non éligible'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fg2)' }}>Score calculé automatiquement sur 100</div>
                </div>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Informations</div>
              <div className="dg">
                <div className="di"><div style={{ fontSize: 11, color: 'var(--fg2)', marginBottom: 2 }}>Montant demandé</div><div style={{ fontSize: 13, fontWeight: 600 }}>{modalLead.montant} XAF</div></div>
                <div className="di"><div style={{ fontSize: 11, color: 'var(--fg2)', marginBottom: 2 }}>Banque actuelle</div><div style={{ fontSize: 13, fontWeight: 600 }}>{modalLead.banque}</div></div>
                <div className="di"><div style={{ fontSize: 11, color: 'var(--fg2)', marginBottom: 2 }}>RCCM</div><div style={{ fontSize: 13, fontWeight: 600 }}>{modalLead.rccm ? '✅ Oui' : '❌ Non'}</div></div>
                <div className="di"><div style={{ fontSize: 11, color: 'var(--fg2)', marginBottom: 2 }}>Flux mensuel</div><div style={{ fontSize: 13, fontWeight: 600 }}>{modalLead.flux} XAF</div></div>
                <div className="di"><div style={{ fontSize: 11, color: 'var(--fg2)', marginBottom: 2 }}>Téléphone</div><div style={{ fontSize: 13, fontWeight: 600 }}>{modalLead.tel}</div></div>
                <div className="di"><div style={{ fontSize: 11, color: 'var(--fg2)', marginBottom: 2 }}>Date soumission</div><div style={{ fontSize: 13, fontWeight: 600 }}>{modalLead.date}</div></div>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Cycle de vie</div>
              <div className="lc">
                {(['Nouveau','Contacté','Éligible','Dossier Déposé','Financé'] as LeadStatus[]).map((s, i, arr) => {
                  const steps: LeadStatus[] = ['Nouveau','Contacté','Éligible','Dossier Déposé','Financé']
                  const curIdx = steps.indexOf(modalLead.statut as LeadStatus)
                  const thisIdx = steps.indexOf(s)
                  return (
                    <span key={s}>
                      <span className={`ls ${thisIdx <= curIdx ? 'done' : ''} ${s === modalLead.statut ? 'cur' : ''}`}
                        style={{ background: thisIdx <= curIdx ? 'var(--accent-light)' : 'var(--border)', color: thisIdx <= curIdx ? 'var(--accent)' : 'var(--fg2)' }}>
                        {s}
                      </span>
                      {i < arr.length - 1 && <span style={{ color: 'var(--fg3)', fontSize: 12 }}>›</span>}
                    </span>
                  )
                })}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Actions rapides</div>
              <button className="wa-btn">📱 Envoyer script WhatsApp "Ouverture Compte"</button>
              <button className="dv-btn">📄 Envoyer Devis Pack Formalisation — 50 000 XAF</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
