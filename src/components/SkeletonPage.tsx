// src/components/SkeletonPage.tsx
// Skeleton loader Mayinvest — shimmer gris animé.
// Usage : import SkeletonPage from '@/components/SkeletonPage'
//         if (loading) return <SkeletonPage />
//         if (loading) return <SkeletonPage label="Chargement de la formation…" />

import React from 'react'

type Props = {
  /** Texte optionnel (lu par les lecteurs d'écran, invisible à l'œil) */
  label?: string
  /** Nombre de cartes à afficher (défaut : 4) */
  rows?: number
}

export default function SkeletonPage({ label = 'Chargement…', rows = 4 }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      style={{
        minHeight: '100vh',
        background: '#FAFAF8',
        padding: '32px 24px',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      <style>{`
        .skp-bar {
          background: linear-gradient(90deg, #F3F4F6 0%, #E5E7EB 50%, #F3F4F6 100%);
          background-size: 200% 100%;
          animation: skp-shimmer 1.5s infinite;
          border-radius: 6px;
        }
        .skp-card {
          background: #fff;
          border: 1px solid #ECECEA;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 12px;
          box-shadow: 0 1px 2px rgba(13,23,41,0.03);
        }
        @keyframes skp-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Header skeleton */}
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div className="skp-bar" style={{ height: 28, width: '35%', marginBottom: 12 }}/>
        <div className="skp-bar" style={{ height: 14, width: '55%', marginBottom: 24 }}/>

        {/* KPI row skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="skp-card" style={{ marginBottom: 0 }}>
              <div className="skp-bar" style={{ height: 12, width: '60%', marginBottom: 10 }}/>
              <div className="skp-bar" style={{ height: 24, width: '40%' }}/>
            </div>
          ))}
        </div>

        {/* Content cards skeleton */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skp-card">
            <div className="skp-bar" style={{ height: 14, width: '30%', marginBottom: 10 }}/>
            <div className="skp-bar" style={{ height: 14, width: '80%', marginBottom: 8 }}/>
            <div className="skp-bar" style={{ height: 14, width: '65%' }}/>
          </div>
        ))}
      </div>
    </div>
  )
}
