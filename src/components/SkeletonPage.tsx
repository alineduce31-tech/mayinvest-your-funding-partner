// src/components/SkeletonPage.tsx
// Skeleton loader Mayinvest — UNIVERSEL
// Mime l'ossature d'une page admin (topbar + KPI cards + liste) en shimmer gris,
// avec un petit pulse Mayinvest en bas qui affiche le label de chargement.
//
// Usage :
//   import SkeletonPage from '@/components/SkeletonPage'
//   if (loading) return <SkeletonPage />
//   if (loading) return <SkeletonPage label="Chargement de ta formation…" />
//   if (loading) return <SkeletonPage variant="form" label="Préparation du formulaire…" />

import React from 'react'

type Variant = 'admin' | 'dashboard' | 'list' | 'form'

type Props = {
  /** Texte au bas de la page, à côté du pulse bleu Mayinvest */
  label?: string
  /** Mise en page du skeleton — 'admin' par défaut (topbar + KPIs + liste) */
  variant?: Variant
  /** Nombre de lignes de liste à afficher (défaut : 5) */
  rows?: number
}

const MI_BLUE = '#1A6BFF'
const MI_BLUE_SOFT = '#EAF1FF'
const BG = '#FAFAF8'
const CARD = '#FFFFFF'
const HAIRLINE = '#F3F3F1'
const MUTED = '#6B7280'

const CSS = `
  .skp-wrap { min-height: 100vh; background: ${BG}; padding: 16px 20px 80px; font-family: 'Inter', system-ui, sans-serif; position: relative; }
  .skp-bar {
    background: linear-gradient(90deg, #F3F4F6 0%, #E5E7EB 50%, #F3F4F6 100%);
    background-size: 200% 100%;
    animation: skp-shim 1.5s infinite;
    border-radius: 6px;
  }
  @keyframes skp-shim {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  @keyframes skp-pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }

  .skp-topbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 4px 16px;
    border-bottom: 1px solid ${HAIRLINE};
    margin-bottom: 20px;
  }
  .skp-logo-sk { display: flex; align-items: center; gap: 10px; }
  .skp-logo-mark {
    width: 32px; height: 32px;
    border-radius: 8px;
    background: ${MI_BLUE_SOFT};
    display: inline-flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .skp-logo-dot {
    width: 7px; height: 7px; border-radius: 50%; background: ${MI_BLUE};
    animation: skp-pulse 1.4s infinite ease-in-out;
  }
  .skp-nav { display: flex; gap: 8px; }

  .skp-content { max-width: 1200px; margin: 0 auto; }

  .skp-header-block { margin-bottom: 24px; }

  .skp-kpi-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
    margin-bottom: 20px;
  }
  .skp-card {
    background: ${CARD};
    border: 1px solid ${HAIRLINE};
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 1px 2px rgba(17, 24, 39, 0.03);
  }

  .skp-list-item {
    background: ${CARD};
    border: 1px solid ${HAIRLINE};
    border-radius: 12px;
    padding: 14px 16px;
    margin-bottom: 10px;
    display: flex; align-items: center; gap: 14px;
    box-shadow: 0 1px 2px rgba(17, 24, 39, 0.03);
  }
  .skp-avatar-sk {
    width: 36px; height: 36px; border-radius: 50%;
    background: ${HAIRLINE};
    flex-shrink: 0;
  }
  .skp-list-lines { flex: 1; display: flex; flex-direction: column; gap: 7px; min-width: 0; }
  .skp-score-chip { width: 48px; height: 18px; background: ${MI_BLUE_SOFT}; border-radius: 6px; flex-shrink: 0; }

  .skp-form-field { background: ${CARD}; border: 1px solid ${HAIRLINE}; border-radius: 10px; padding: 14px 16px; margin-bottom: 10px; }

  .skp-overlay {
    position: fixed; bottom: 24px; left: 0; right: 0;
    text-align: center;
    display: flex; align-items: center; justify-content: center; gap: 10px;
    font-size: 11px;
    color: ${MUTED};
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-weight: 600;
    pointer-events: none;
    z-index: 10;
  }
  .skp-overlay-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: ${MI_BLUE};
    animation: skp-pulse 1.4s infinite ease-in-out;
  }
`

function Topbar() {
  return (
    <div className="skp-topbar">
      <div className="skp-logo-sk">
        <span className="skp-logo-mark"><span className="skp-logo-dot"/></span>
        <div className="skp-bar" style={{ width: 90, height: 14 }}/>
      </div>
      <div className="skp-nav">
        <div className="skp-bar" style={{ width: 56, height: 26, borderRadius: 999 }}/>
        <div className="skp-bar" style={{ width: 56, height: 26, borderRadius: 999 }}/>
        <div className="skp-bar" style={{ width: 72, height: 26, borderRadius: 999 }}/>
      </div>
    </div>
  )
}

function HeaderBlock() {
  return (
    <div className="skp-header-block">
      <div className="skp-bar" style={{ height: 24, width: '32%', marginBottom: 10 }}/>
      <div className="skp-bar" style={{ height: 13, width: '48%' }}/>
    </div>
  )
}

function KpiRow() {
  return (
    <div className="skp-kpi-row">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="skp-card">
          <div className="skp-bar" style={{ height: 11, width: '60%', marginBottom: 10 }}/>
          <div className="skp-bar" style={{ height: 22, width: '45%' }}/>
        </div>
      ))}
    </div>
  )
}

function ListItems({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skp-list-item">
          <div className="skp-avatar-sk"/>
          <div className="skp-list-lines">
            <div className="skp-bar" style={{ height: 13, width: `${55 + (i % 3) * 8}%` }}/>
            <div className="skp-bar" style={{ height: 11, width: `${30 + (i % 4) * 6}%` }}/>
          </div>
          <div className="skp-score-chip"/>
        </div>
      ))}
    </>
  )
}

function FormFields({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skp-form-field">
          <div className="skp-bar" style={{ height: 10, width: '25%', marginBottom: 8 }}/>
          <div className="skp-bar" style={{ height: 14, width: `${50 + (i % 3) * 12}%` }}/>
        </div>
      ))}
    </>
  )
}

export default function SkeletonPage({ label = 'Chargement…', variant = 'admin', rows = 5 }: Props) {
  return (
    <div className="skp-wrap" role="status" aria-live="polite" aria-label={label}>
      <style>{CSS}</style>

      <Topbar/>

      <div className="skp-content">
        <HeaderBlock/>

        {(variant === 'admin' || variant === 'dashboard') && <KpiRow/>}

        {(variant === 'admin' || variant === 'list') && <ListItems count={rows}/>}

        {variant === 'dashboard' && <ListItems count={Math.min(rows, 3)}/>}

        {variant === 'form' && <FormFields count={rows + 2}/>}
      </div>

      <div className="skp-overlay">
        <span className="skp-overlay-dot"/>
        {label}
      </div>
    </div>
  )
}
