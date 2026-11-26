import EquipeNav from '@/components/EquipeNav'
import { Users, Inbox, Landmark, Wallet } from 'lucide-react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, useMemo, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { formatPhone } from '@/lib/phone'

export const Route = createFileRoute('/equipe-commerciale')({
  component: EquipeCommercialePage,
})

const ADMIN_SESSION_KEY = 'mayinvest_admin_session'

type Commercial = {
  id: string; nom: string; prenom: string; email: string; telephone: string; ville: string;
  ref_code: string; status: string; activated_at: string | null; created_at: string;
  total_leads: number; leads_actifs: number; dossiers_finances: number;
  gains_total_xaf: number; gains_mois_xaf: number;
}

const xaf = (n: number) => new Intl.NumberFormat('fr-FR').format(n) + ' XAF'

function EquipeCommercialePage() {
  const navigate = useNavigate()
  const [authChecked, setAuthChecked] = useState(false)
  const [commercials, setCommercials] = useState<Commercial[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [villeFilter, setVilleFilter] = useState<string>('')
  const [sort, setSort] = useState<'activated_desc' | 'gains_desc' | 'leads_desc'>('activated_desc')
  const [deactivateModal, setDeactivateModal] = useState<Commercial | null>(null)
  const [deactivateReason, setDeactivateReason] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ADMIN_SESSION_KEY)
      if (!raw) { navigate({ to: '/mon-espace' as any }); return }
      const s = JSON.parse(raw)
      if (!s?.email || !s?.token || !s?.expiresAt || s.expiresAt < Date.now()) {
        navigate({ to: '/mon-espace' as any }); return
      }
      setAuthChecked(true)
    } catch { navigate({ to: '/mon-espace' as any }) }
  }, [navigate])

  useEffect(() => { if (authChecked) loadAll() }, [authChecked])

  async function loadAll() {
    setLoading(true)
    const { data } = await supabase.rpc('get_all_commercials_with_stats')
    if (data) setCommercials(data as Commercial[])
    setLoading(false)
  }

  async function deactivate() {
    if (!deactivateModal || !deactivateReason.trim()) return
    await supabase.rpc('deactivate_commercial', { p_commercial_id: deactivateModal.id, p_reason: deactivateReason })
    setDeactivateModal(null); setDeactivateReason('')
    await loadAll()
  }

  const filtered = useMemo(() => {
    let res = commercials
    if (search) {
      const q = search.toLowerCase()
      res = res.filter(c => (c.nom + ' ' + c.prenom + ' ' + c.email + ' ' + c.telephone).toLowerCase().includes(q))
    }
    if (villeFilter) res = res.filter(c => c.ville === villeFilter)
    if (sort === 'gains_desc') res = [...res].sort((a, b) => b.gains_total_xaf - a.gains_total_xaf)
    else if (sort === 'leads_desc') res = [...res].sort((a, b) => b.total_leads - a.total_leads)
    return res
  }, [commercials, search, villeFilter, sort])

  const villes = useMemo(() => Array.from(new Set(commercials.map(c => c.ville))).sort(), [commercials])

  const totals = useMemo(() => ({
    nb: commercials.length,
    totalLeads: commercials.reduce((s, c) => s + c.total_leads, 0),
    totalFinances: commercials.reduce((s, c) => s + c.dossiers_finances, 0),
    totalGains: commercials.reduce((s, c) => s + c.gains_total_xaf, 0),
  }), [commercials])

  if (!authChecked || loading) return <SkeletonPage/>

  return (
    <div className="eq-page" style={{ minHeight: '100vh', background: '#F5F5F7', color: '#1D1D1F' }}>
      <style>{`
        * { box-sizing: border-box; }
        .ec-header { padding: 20px 32px; background: #FFFFFF; margin: 20px 32px 0; border-radius: 16px; box-shadow: 0 2px 4px rgba(13,23,41,0.03); border: 1px solid #ECECEA; display: flex; align-items: center; gap: 20px; }
        @media (max-width: 640px) { .ec-header { margin: 12px 16px 0; padding: 16px 20px; gap: 14px; } }
        .ec-header-left { flex: 1; display: flex; align-items: center; gap: 16px; }
        .ec-header-right { text-align: right; }
        @media (max-width: 760px) { .ec-header { flex-wrap: wrap; align-items: flex-start; } .ec-header-right { order: -1; flex: 1 1 100%; text-align: left; } .ec-header-left { flex: 1 1 100%; min-width: 0; } .ec-header-left nav, .ec-nav { overflow-x: auto; scrollbar-width: none; flex-wrap: nowrap; max-width: 100%; } .ec-header-left nav a, .ec-nav a { white-space: nowrap; flex-shrink: 0; } .ec-header > div:last-child:not(.ec-header-left):not(.ec-header-right) { flex: 1 1 100%; } }
        .ec-header h1 { font-size: 22px; font-weight: 800; margin: 0; color: #0F1729; letter-spacing: -0.02em; line-height: 1.1; }
        @media (max-width: 640px) { .ec-header h1 { font-size: 18px; } }
        .ec-sub { font-size: 12px; color: #6B7280; margin-top: 4px; }
        .back-round { width: 40px; height: 40px; border-radius: 50%; background: #F3F4F6; border: 1px solid #E5E7EB; display: inline-flex; align-items: center; justify-content: center; color: #111; cursor: pointer; flex-shrink: 0; text-decoration: none; transition: all 0.15s; }
        .back-round:hover { background: #0D1B3E; color: #fff; border-color: #0D1B3E; transform: translateX(-2px); }
        .ec-nav { display: flex; gap: 6px; }
        .ec-nav a { padding: 7px 14px; border-radius: 100px; font-size: 12px; font-weight: 600; color: #6B7280; text-decoration: none; }
        .ec-nav a:hover { background: #F3F3F1; color: #111827; }
        .ec-nav a.active { background: #1A6BFF; color: #fff; }

        .wrap { max-width: 1200px; margin: 0 auto; padding: 24px 32px; }
        @media (max-width: 640px) { .wrap { padding: 20px 16px; } .ec-header { padding: 14px 16px; } }

        .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
        @media (max-width: 720px) { .kpi-row { grid-template-columns: repeat(2, 1fr); } }
        .kpi { background: #fff; border: 1px solid #ECECEA; border-radius: 14px; padding: 16px 18px; }
        .kpi-lbl { font-size: 11px; color: #6B7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
        .kpi-val { font-size: 22px; font-weight: 800; color: #0F1729; margin-top: 6px; letter-spacing: -0.02em; }

        .toolbar { background: #fff; border: 1px solid #ECECEA; border-radius: 12px; padding: 10px 14px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 14px; }
        .toolbar input { flex: 1; min-width: 180px; padding: 9px 13px; background: #F9FAFB; border: 1px solid #ECECEA; border-radius: 10px; font-size: 12.5px; font-family: inherit; color: #111827; }
        .toolbar input:focus { outline: none; border-color: #1A6BFF; background: #fff; box-shadow: 0 0 0 3px rgba(26,107,255,0.1); }

        /* === FilterSelect (custom dropdown) === */
        .fs-wrap { position: relative; }
        .fs-btn { padding: 9px 12px 9px 14px; background: #F9FAFB; border: 1px solid #ECECEA; border-radius: 10px; font-size: 12.5px; font-family: inherit; color: #111827; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; min-width: 150px; justify-content: space-between; transition: all 0.15s; font-weight: 500; }
        .fs-btn:hover { background: #fff; border-color: #D1D5DB; }
        .fs-btn.open { background: #fff; border-color: #1A6BFF; box-shadow: 0 0 0 3px rgba(26,107,255,0.1); }
        .fs-lbl { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .fs-chev { color: #6B7280; transition: transform 0.2s; flex-shrink: 0; }
        .fs-btn.open .fs-chev { transform: rotate(180deg); color: #1A6BFF; }

        .fs-panel { position: absolute; top: calc(100% + 6px); left: 0; min-width: 100%; background: #fff; border: 1px solid #ECECEA; border-radius: 12px; box-shadow: 0 20px 40px rgba(13,23,41,0.12), 0 2px 6px rgba(13,23,41,0.05); padding: 6px; z-index: 50; max-height: 320px; overflow-y: auto; animation: fsFadeIn 0.14s ease; }
        @keyframes fsFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .fs-opt { padding: 9px 12px; border-radius: 8px; cursor: pointer; font-size: 13px; color: #111827; display: flex; align-items: center; justify-content: space-between; gap: 10px; white-space: nowrap; }
        .fs-opt:hover { background: #EAF1FF; color: #0D1B3E; }
        .fs-opt.selected { background: #EAF1FF; color: #1A6BFF; font-weight: 700; }

        /* Flèche de tri propre (remplace le ↓ Unicode moche) */
        .sort-lbl { display: inline-flex; align-items: center; gap: 6px; }
        .sort-arrow { opacity: 0.6; flex-shrink: 0; }
        .fs-opt.selected .sort-arrow,
        .fs-btn .sort-arrow { opacity: 0.85; }

        .list { background: #fff; border: 1px solid #ECECEA; border-radius: 12px; overflow: hidden; }
        .row { display: grid; grid-template-columns: 2fr 1fr 110px 110px 130px 90px; gap: 12px; align-items: center; padding: 14px 18px; border-bottom: 1px solid #F3F3F1; font-size: 12px; }
        .row-head { background: #F9FAFB; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #6B7280; }
        .row-head .r, .row .r { text-align: right; }
        @media (max-width: 820px) {
          .row { grid-template-columns: 1fr auto; gap: 6px; }
          .row-head { display: none; }
          .row > *:not(.row-name):not(.row-action) { grid-column: 1; }
          .row .row-action { grid-column: 2; grid-row: 1; }
        }
        .row-name { display: flex; align-items: center; gap: 10px; }
        .ava { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #2361EF, #7C3AED); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; }
        .row-name strong { font-size: 13px; font-weight: 700; color: #111827; display: block; }
        .row-name small { font-size: 11px; color: #6B7280; display: block; margin-top: 1px; }
        .row-ville { color: #374151; font-weight: 500; }
        .row-count { font-weight: 700; font-variant-numeric: tabular-nums; color: #0F1729; }
        .row-finance { font-weight: 700; font-variant-numeric: tabular-nums; color: #1A6BFF; }
        .row-gains { font-weight: 700; font-variant-numeric: tabular-nums; color: #111827; text-align: right; }
        .row-action { text-align: right; }
        .btn-deact { background: #FEE2E2; color: #B42318; border: 1px solid #FCA5A5; border-radius: 100px; padding: 6px 12px; font-size: 11px; font-weight: 600; cursor: pointer; font-family: inherit; }
        .btn-deact:hover { background: #FCA5A5; color: #fff; }

        .ref-pill { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; background: #EEF4FF; color: #1A6BFF; border-radius: 100px; font-size: 10px; font-weight: 700; font-family: 'SF Mono', Menlo, monospace; letter-spacing: 0.04em; }

        .empty { padding: 60px 20px; text-align: center; color: #6B7280; font-size: 13px; }

        .modal-ovr { position: fixed; inset: 0; background: rgba(13,23,41,0.6); backdrop-filter: blur(4px); z-index: 300; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal { background: white; border-radius: 14px; max-width: 420px; width: 100%; padding: 24px; }
        .modal h3 { margin: 0 0 8px; font-size: 16px; font-weight: 700; }
        .modal p { font-size: 13px; color: #6B7280; margin: 0 0 14px; }
        .modal textarea { width: 100%; min-height: 80px; padding: 10px 12px; background: #F3F3F1; border: 1px solid #ECECEA; border-radius: 8px; font-size: 13px; font-family: inherit; }
        .modal-actions { display: flex; gap: 8px; margin-top: 16px; }
        .modal-actions button { flex: 1; padding: 10px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; border: none; font-family: inherit; }
        .modal-btn-cancel { background: #F3F3F1; color: #6B7280; }
        .modal-btn-confirm { background: #B42318; color: white; }
      `}</style>

      <header className="ec-header">
        <div className="ec-header-left">
          <EquipeNav actif="commerciaux"/>
        </div>
        <div className="ec-header-right">
          <h1>Équipe commerciale</h1>
          <div className="ec-sub">Admin · Gestion des commerciaux actifs</div>
        </div>
      </header>

      <div className="wrap">
        <div className="kpi-row">
          <div className="kpi"><i className="eq-ic b"><Users size={16}/></i><div className="kpi-lbl">Commerciaux actifs</div><div className="kpi-val">{totals.nb}</div></div>
          <div className="kpi"><i className="eq-ic n"><Inbox size={16}/></i><div className="kpi-lbl">Leads attribués</div><div className="kpi-val">{totals.totalLeads}</div></div>
          <div className="kpi"><i className="eq-ic g"><Landmark size={16}/></i><div className="kpi-lbl">Dossiers financés</div><div className="kpi-val">{totals.totalFinances}</div></div>
          <div className="kpi"><i className="eq-ic o"><Wallet size={16}/></i><div className="kpi-lbl">Commissions versées</div><div className="kpi-val">{xaf(totals.totalGains)}</div></div>
        </div>

        <div className="toolbar">
          <input placeholder="Rechercher par nom, email, téléphone…" value={search} onChange={e => setSearch(e.target.value)}/>
          <FilterSelect
            value={villeFilter}
            onChange={setVilleFilter}
            options={[{ k: '', label: 'Toutes les villes' }, ...villes.map(v => ({ k: v, label: v }))]}
          />
          <FilterSelect
            value={sort}
            onChange={(v) => setSort(v as any)}
            options={[
              { k: 'activated_desc', label: <SortLabel text="Plus récents" direction="desc"/> },
              { k: 'gains_desc',     label: <SortLabel text="Gains"        direction="desc"/> },
              { k: 'leads_desc',     label: <SortLabel text="Leads"        direction="desc"/> },
            ]}
          />

        </div>

        <div className="list">
          <div className="row row-head">
            <span>Commercial</span>
            <span>Ville · Code</span>
            <span>Leads</span>
            <span>Financés</span>
            <span className="r">Gains totaux</span>
            <span className="r">Action</span>
          </div>
          {filtered.length === 0 ? (
            <div className="empty">Aucun commercial trouvé.</div>
          ) : filtered.map(c => {
            const initials = ((c.prenom[0] || '') + (c.nom[0] || '')).toUpperCase()
            return (
              <div key={c.id} className="row">
                <div className="row-name">
                  <span className="ava">{initials}</span>
                  <div>
                    <strong>{c.prenom} {c.nom}</strong>
                    <small>{c.email} · {formatPhone(c.telephone)}</small>
                  </div>
                </div>
                <div className="row-ville">
                  {c.ville}<br/>
                  <span className="ref-pill">{c.ref_code}</span>
                </div>
                <div className="row-count">{c.total_leads}<br/><small style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 500 }}>{c.leads_actifs} actifs</small></div>
                <div className="row-finance">{c.dossiers_finances}</div>
                <div className="row-gains">
                  {xaf(c.gains_total_xaf)}
                  {c.gains_mois_xaf > 0 && <><br/><small style={{ fontSize: 10, color: '#1A6BFF', fontWeight: 500 }}>+{xaf(c.gains_mois_xaf)} ce mois</small></>}
                </div>
                <div className="row-action">
                  <button className="btn-deact" onClick={() => setDeactivateModal(c)}>Désactiver</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {deactivateModal && (
        <div className="modal-ovr" onClick={() => setDeactivateModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Désactiver {deactivateModal.prenom} {deactivateModal.nom}</h3>
            <p>Le commercial ne pourra plus se connecter à son workspace. Ses leads restent attribués (à redistribuer manuellement si besoin).</p>
            <textarea value={deactivateReason} onChange={e => setDeactivateReason(e.target.value)} placeholder="Raison (ex: inactivité prolongée, mauvaise conduite…)"/>
            <div className="modal-actions">
              <button className="modal-btn-cancel" onClick={() => { setDeactivateModal(null); setDeactivateReason('') }}>Annuler</button>
              <button className="modal-btn-confirm" onClick={deactivate} disabled={!deactivateReason.trim()}>Désactiver</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SkeletonPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        .skp-head { padding: 20px 32px; background: #fff; border-bottom: 1px solid #ECECEA; }
        .skp-bar { height: 14px; background: linear-gradient(90deg, #F3F4F6 0%, #E5E7EB 50%, #F3F4F6 100%); background-size: 200% 100%; animation: skp-shimmer 1.5s infinite; border-radius: 6px; margin-bottom: 8px; }
        .skp-wrap { max-width: 1200px; margin: 0 auto; padding: 24px 32px; }
        .skp-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
        @media (max-width: 720px) { .skp-kpis { grid-template-columns: repeat(2, 1fr); } }
        .skp-kpi { height: 88px; background: #fff; border: 1px solid #ECECEA; border-radius: 14px; padding: 16px 18px; }
        .skp-row { display: flex; align-items: center; gap: 14px; background: #fff; border: 1px solid #ECECEA; border-radius: 12px; padding: 16px; margin-bottom: 8px; }
        .skp-ava { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(90deg, #F3F4F6 0%, #E5E7EB 50%, #F3F4F6 100%); background-size: 200% 100%; animation: skp-shimmer 1.5s infinite; flex-shrink: 0; }
        .skp-lines { flex: 1; display: flex; flex-direction: column; gap: 6px; }
        .skp-line { height: 10px; border-radius: 5px; background: linear-gradient(90deg, #F3F4F6 0%, #E5E7EB 50%, #F3F4F6 100%); background-size: 200% 100%; animation: skp-shimmer 1.5s infinite; }
        .skp-line.long { width: 90%; }
        .skp-line.short { width: 55%; }
        @keyframes skp-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>
      <div className="skp-head">
        <div className="skp-bar" style={{ width: 70, height: 22, borderRadius: 100, marginBottom: 10 }}/>
        <div className="skp-bar" style={{ width: 240, height: 22, marginBottom: 6 }}/>
        <div className="skp-bar" style={{ width: 320, height: 10 }}/>
      </div>
      <div className="skp-wrap">
        <div className="skp-kpis">
          <div className="skp-kpi"><div className="skp-bar" style={{ width: '70%' }}/><div className="skp-bar" style={{ width: '40%', marginTop: 10, height: 20 }}/></div>
          <div className="skp-kpi"><div className="skp-bar" style={{ width: '70%' }}/><div className="skp-bar" style={{ width: '40%', marginTop: 10, height: 20 }}/></div>
          <div className="skp-kpi"><div className="skp-bar" style={{ width: '70%' }}/><div className="skp-bar" style={{ width: '40%', marginTop: 10, height: 20 }}/></div>
          <div className="skp-kpi"><div className="skp-bar" style={{ width: '70%' }}/><div className="skp-bar" style={{ width: '40%', marginTop: 10, height: 20 }}/></div>
        </div>
        {[1,2,3,4].map(i => (
          <div key={i} className="skp-row">
            <div className="skp-ava"/>
            <div className="skp-lines">
              <div className="skp-line long"/>
              <div className="skp-line short"/>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// FilterSelect : custom dropdown Mayinvest (chevron rotate + options en vert soft)
// ============================================================
function FilterSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { k: string; label: React.ReactNode }[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])
  const current = options.find(o => o.k === value) ?? options[0]!
  return (
    <div className="fs-wrap" ref={ref}>
      <button type="button" className={`fs-btn${open ? ' open' : ''}`} onClick={() => setOpen(v => !v)}>
        <span className="fs-lbl">{current.label}</span>
        <svg className="fs-chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div className="fs-panel">
          {options.map(o => (
            <div
              key={o.k}
              className={`fs-opt${value === o.k ? ' selected' : ''}`}
              onClick={() => { onChange(o.k); setOpen(false) }}
            >
              <span>{o.label}</span>
              {value === o.k && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// SortLabel : texte + petit SVG flèche (remplace le "↓" Unicode moche)
// ============================================================
function SortLabel({ text, direction }: { text: string; direction: 'asc' | 'desc' }) {
  return (
    <span className="sort-lbl">
      <span>{text}</span>
      <svg className="sort-arrow" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {direction === 'desc' ? (
          <>
            <line x1="12" y1="5" x2="12" y2="19"/>
            <polyline points="19 12 12 19 5 12"/>
          </>
        ) : (
          <>
            <line x1="12" y1="19" x2="12" y2="5"/>
            <polyline points="5 12 12 5 19 12"/>
          </>
        )}
      </svg>
    </span>
  )
}
