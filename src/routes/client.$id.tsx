import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/client/$id')({
  component: ClientSpace,
})

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: number
  from: 'client' | 'conseiller'
  text: string
  time: string
  read: boolean
}
interface Document {
  id: number
  name: string
  size: string
  status: 'validé' | 'en attente' | 'requis'
  date: string
}

// ─── Sample data (sera remplacé par Supabase) ─────────────────────────────────
const CLIENT = {
  nom: 'Jean-Pierre Moukouama',
  type: 'Fonctionnaire',
  ville: 'Brazzaville',
  tel: '+242 06 123 4567',
  montant: '15 000 000',
  objet: 'Immobilier',
  statut: 'Éligible',
  score: 90,
  conseiller: 'Aline D.',
  dateDepot: '15 Jan 2024',
  etape: 3,
}

const ETAPES = ['Soumis', 'En analyse', 'Éligible', 'Dossier déposé', 'Financé']

const MESSAGES: Message[] = [
  { id: 1, from: 'conseiller', text: 'Bonjour Jean-Pierre, nous avons bien reçu votre dossier. Notre équipe l'analyse actuellement. Nous vous recontactons sous 24h.', time: '15 Jan · 10:23', read: true },
  { id: 2, from: 'client', text: 'Merci beaucoup ! Est-ce que je dois fournir des documents supplémentaires ?', time: '15 Jan · 11:05', read: true },
  { id: 3, from: 'conseiller', text: 'Oui, nous aurons besoin de vos 3 derniers bulletins de salaire et d'une pièce d'identité. Vous pouvez les uploader directement dans l'onglet Documents.', time: '15 Jan · 14:30', read: true },
  { id: 4, from: 'conseiller', text: 'Bonne nouvelle 🎉 Votre dossier est éligible ! Votre score est de 90/100. Nous allons maintenant préparer le dossier bancaire. RDV possible cette semaine ?', time: '16 Jan · 09:15', read: false },
]

const DOCUMENTS: Document[] = [
  { id: 1, name: 'Pièce d'identité', size: '1.2 MB', status: 'validé', date: '15 Jan' },
  { id: 2, name: 'Bulletin de salaire (Jan)', size: '0.8 MB', status: 'validé', date: '15 Jan' },
  { id: 3, name: 'Bulletin de salaire (Déc)', size: '0.9 MB', status: 'en attente', date: '15 Jan' },
  { id: 4, name: 'Bulletin de salaire (Nov)', size: '—', status: 'requis', date: '—' },
  { id: 5, name: 'Attestation de domiciliation', size: '—', status: 'requis', date: '—' },
]

// ─── Component ────────────────────────────────────────────────────────────────
export default function ClientSpace() {
  const [tab, setTab] = useState<'accueil' | 'messages' | 'documents' | 'activites'>('accueil')
  const [newMsg, setNewMsg] = useState('')
  const [messages, setMessages] = useState(MESSAGES)
  const unread = messages.filter(m => !m.read && m.from === 'conseiller').length

  function sendMessage() {
    if (!newMsg.trim()) return
    setMessages(prev => [...prev, {
      id: Date.now(), from: 'client', text: newMsg.trim(),
      time: 'À l'instant', read: true
    }])
    setNewMsg('')
  }

  return (
    <>
      <style>{`
        :root {
          --bg: #F0F4FF; --surface: #FFFFFF; --surface2: #F4F6FB;
          --border: #E5E9F2; --fg: #111827; --fg2: #6B7280; --fg3: #9CA3AF;
          --accent: #1A6BFF; --accent-light: #EEF4FF;
          --green: #16A34A; --green-light: #DCFCE7;
          --orange: #EA580C; --orange-light: #FFF0E6;
          --red: #DC2626; --red-light: #FEE2E2;
          --purple: #7C3AED; --purple-light: #EDE9FE;
          --gold: #CA8A04; --gold-light: #FEF9C3;
        }
        @media (prefers-color-scheme: dark) {
          :root:not([data-theme="light"]) {
            --bg: #0A0F1E; --surface: #131929; --surface2: #1A2235;
            --border: #243050; --fg: #F1F5F9; --fg2: #94A3B8; --fg3: #64748B;
            --accent-light: #0F1F40; --green-light: #052E16; --orange-light: #1C0A00;
            --red-light: #1C0505; --purple-light: #1E0A40; --gold-light: #1C1400;
            color-scheme: dark;
          }
        }
        :root[data-theme="dark"] {
          --bg: #0A0F1E; --surface: #131929; --surface2: #1A2235;
          --border: #243050; --fg: #F1F5F9; --fg2: #94A3B8; --fg3: #64748B;
          --accent-light: #0F1F40; --green-light: #052E16; --orange-light: #1C0A00;
          --red-light: #1C0505; --purple-light: #1E0A40; --gold-light: #1C1400;
          color-scheme: dark;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--fg); -webkit-font-smoothing: antialiased; }

        .cl-wrap { min-height: 100vh; display: flex; flex-direction: column; max-width: 480px; margin: 0 auto; background: var(--surface); position: relative; box-shadow: 0 0 60px rgba(0,0,0,0.08); }

        /* HEADER */
        .cl-header { background: #0D1B3E; padding: 20px 20px 0; position: sticky; top: 0; z-index: 50; }
        .cl-header-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .cl-logo { display: flex; align-items: center; gap: 8px; }
        .cl-logo-sq { width: 30px; height: 30px; background: #1A6BFF; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 800; color: #fff; }
        .cl-logo-name { font-size: 14px; font-weight: 700; color: #fff; }
        .cl-notif { position: relative; width: 36px; height: 36px; background: rgba(255,255,255,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; border: none; }
        .cl-notif-dot { position: absolute; top: 6px; right: 6px; width: 8px; height: 8px; background: #EA580C; border-radius: 50%; border: 2px solid #0D1B3E; }
        .cl-user { display: flex; align-items: center; gap: 10px; padding-bottom: 16px; }
        .cl-avatar { width: 40px; height: 40px; background: linear-gradient(135deg, #1A6BFF, #7C3AED); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 800; color: #fff; flex-shrink: 0; }
        .cl-user-name { font-size: 14px; font-weight: 700; color: #fff; }
        .cl-user-type { font-size: 11px; color: rgba(255,255,255,0.5); }

        /* TABS */
        .cl-tabs { display: flex; background: #0D1B3E; padding: 0 4px; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .cl-tab { flex: 1; padding: 11px 4px; text-align: center; font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.45); cursor: pointer; border: none; background: none; border-bottom: 2px solid transparent; transition: all 0.15s; white-space: nowrap; font-family: inherit; position: relative; }
        .cl-tab.active { color: #fff; border-bottom-color: #1A6BFF; }
        .cl-tab-badge { position: absolute; top: 6px; right: calc(50% - 24px); background: #EA580C; color: #fff; font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 100px; }

        /* CONTENT */
        .cl-content { flex: 1; padding: 20px 16px; overflow-y: auto; }

        /* SCORE CARD */
        .score-hero { background: linear-gradient(135deg, #0D1B3E 0%, #1A3A6B 100%); border-radius: 18px; padding: 20px; margin-bottom: 16px; color: #fff; }
        .score-hero-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .score-label { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.06em; }
        .score-num { font-size: 48px; font-weight: 800; color: #fff; line-height: 1; }
        .score-sub { font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 2px; }
        .score-ring-wrap { position: relative; width: 72px; height: 72px; flex-shrink: 0; }
        .score-verdict { display: inline-flex; align-items: center; gap: 6px; background: rgba(22,163,74,0.2); color: #4ADE80; padding: 5px 12px; border-radius: 100px; font-size: 12px; font-weight: 700; }

        /* ETAPES */
        .etapes-card { background: var(--surface2); border: 1px solid var(--border); border-radius: 14px; padding: 16px; margin-bottom: 16px; }
        .etapes-title { font-size: 12px; font-weight: 700; color: var(--fg2); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 14px; }
        .etapes-track { display: flex; align-items: center; gap: 0; }
        .etape-dot { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; z-index: 1; }
        .etape-dot.done { background: var(--green); color: #fff; }
        .etape-dot.current { background: var(--accent); color: #fff; box-shadow: 0 0 0 4px var(--accent-light); }
        .etape-dot.pending { background: var(--border); color: var(--fg3); }
        .etape-line { flex: 1; height: 2px; }
        .etape-line.done { background: var(--green); }
        .etape-line.pending { background: var(--border); }
        .etapes-labels { display: flex; justify-content: space-between; margin-top: 8px; }
        .etape-lbl { font-size: 9px; font-weight: 600; text-align: center; flex: 1; color: var(--fg3); }
        .etape-lbl.active { color: var(--accent); }
        .etape-lbl.done { color: var(--green); }

        /* INFO CARD */
        .info-card { background: var(--surface2); border: 1px solid var(--border); border-radius: 14px; padding: 16px; margin-bottom: 16px; }
        .info-title { font-size: 12px; font-weight: 700; color: var(--fg2); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 12px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .info-item { background: var(--surface); border-radius: 10px; padding: 10px 12px; border: 1px solid var(--border); }
        .info-lbl { font-size: 10px; color: var(--fg3); margin-bottom: 2px; }
        .info-val { font-size: 13px; font-weight: 600; }

        /* NEXT STEP BANNER */
        .next-step { background: linear-gradient(135deg, var(--accent-light), #E0ECFF); border: 1px solid #C7DCFF; border-radius: 14px; padding: 14px 16px; margin-bottom: 16px; display: flex; align-items: center; gap: 12px; }
        .next-step-icon { width: 40px; height: 40px; background: var(--accent); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
        .next-step-title { font-size: 13px; font-weight: 700; color: var(--accent); margin-bottom: 2px; }
        .next-step-desc { font-size: 12px; color: var(--fg2); }

        /* MESSAGERIE */
        .msg-wrap { display: flex; flex-direction: column; height: calc(100vh - 200px); }
        .msg-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding-bottom: 8px; }
        .msg-bubble { max-width: 82%; padding: 10px 14px; border-radius: 16px; font-size: 13px; line-height: 1.5; }
        .msg-bubble.conseiller { background: var(--surface2); border: 1px solid var(--border); border-bottom-left-radius: 4px; align-self: flex-start; }
        .msg-bubble.client { background: var(--accent); color: #fff; border-bottom-right-radius: 4px; align-self: flex-end; }
        .msg-time { font-size: 10px; color: var(--fg3); margin-top: 4px; }
        .msg-time.right { text-align: right; }
        .msg-from { font-size: 10px; font-weight: 600; color: var(--accent); margin-bottom: 4px; }
        .msg-input-row { display: flex; gap: 8px; padding-top: 12px; border-top: 1px solid var(--border); margin-top: 8px; }
        .msg-input { flex: 1; background: var(--surface2); border: 1px solid var(--border); border-radius: 100px; padding: 10px 16px; font-family: inherit; font-size: 13px; color: var(--fg); outline: none; }
        .msg-input:focus { border-color: var(--accent); }
        .msg-send { width: 40px; height: 40px; background: var(--accent); border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

        /* DOCUMENTS */
        .doc-item { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border); }
        .doc-item:last-child { border-bottom: none; }
        .doc-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
        .doc-name { font-size: 13px; font-weight: 600; margin-bottom: 2px; }
        .doc-meta { font-size: 11px; color: var(--fg3); }
        .doc-status { margin-left: auto; flex-shrink: 0; }
        .dpill { padding: 3px 10px; border-radius: 100px; font-size: 11px; font-weight: 600; }
        .dpill-v { background: var(--green-light); color: var(--green); }
        .dpill-w { background: var(--gold-light); color: var(--gold); }
        .dpill-r { background: var(--red-light); color: var(--red); }
        .upload-btn { width: 100%; margin-top: 16px; padding: 14px; background: var(--accent-light); border: 2px dashed #93B8FF; border-radius: 12px; text-align: center; cursor: pointer; color: var(--accent); font-size: 13px; font-weight: 600; font-family: inherit; }
        .upload-btn:hover { background: #E0ECFF; }

        /* ACTIVITES */
        .act-item { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border); }
        .act-item:last-child { border-bottom: none; }
        .act-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; margin-top: 4px; }
        .act-text { font-size: 13px; font-weight: 500; margin-bottom: 2px; }
        .act-time { font-size: 11px; color: var(--fg3); }

        /* CONSEILLER CARD */
        .conseiller-card { background: linear-gradient(135deg, #0D1B3E, #1A3A6B); border-radius: 14px; padding: 16px; color: #fff; display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .cons-avatar { width: 44px; height: 44px; background: #1A6BFF; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 800; flex-shrink: 0; }
        .cons-name { font-size: 14px; font-weight: 700; }
        .cons-role { font-size: 11px; color: rgba(255,255,255,0.5); margin-bottom: 8px; }
        .wa-pill { display: inline-flex; align-items: center; gap: 6px; background: #25D366; color: #fff; padding: 6px 12px; border-radius: 100px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; font-family: inherit; }
      `}</style>

      <div className="cl-wrap">
        {/* HEADER */}
        <div className="cl-header">
          <div className="cl-header-top">
            <div className="cl-logo">
              <div className="cl-logo-sq">M</div>
              <div className="cl-logo-name">Mayinvest</div>
            </div>
            <button className="cl-notif">
              <span style={{ fontSize: 16 }}>🔔</span>
              {unread > 0 && <div className="cl-notif-dot" />}
            </button>
          </div>
          <div className="cl-user">
            <div className="cl-avatar">{CLIENT.nom[0]}</div>
            <div>
              <div className="cl-user-name">{CLIENT.nom}</div>
              <div className="cl-user-type">{CLIENT.type} · {CLIENT.ville}</div>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="cl-tabs">
          {[
            { key: 'accueil', label: '🏠 Accueil' },
            { key: 'messages', label: '💬 Messages', badge: unread },
            { key: 'documents', label: '📎 Documents' },
            { key: 'activites', label: '📋 Activités' },
          ].map(t => (
            <button key={t.key} className={`cl-tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key as typeof tab)}>
              {t.label}
              {t.badge ? <span className="cl-tab-badge">{t.badge}</span> : null}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        <div className="cl-content">

          {/* ── ACCUEIL ── */}
          {tab === 'accueil' && (
            <>
              {/* Score hero */}
              <div className="score-hero">
                <div className="score-hero-top">
                  <div>
                    <div className="score-label">Votre score d'éligibilité</div>
                    <div className="score-num">{CLIENT.score}<span style={{ fontSize: 20, opacity: 0.5 }}>/100</span></div>
                    <div className="score-sub">Calculé automatiquement</div>
                  </div>
                  <div className="score-ring-wrap">
                    <svg viewBox="0 0 72 72" width="72" height="72">
                      <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="7" />
                      <circle cx="36" cy="36" r="28" fill="none" stroke="#4ADE80" strokeWidth="7"
                        strokeLinecap="round"
                        strokeDasharray={`${(CLIENT.score / 100) * 175.9} 175.9`}
                        strokeDashoffset="0"
                        style={{ transform: 'rotate(-90deg)', transformOrigin: '36px 36px' }} />
                    </svg>
                  </div>
                </div>
                <div className="score-verdict">✅ Excellent — Très éligible</div>
              </div>

              {/* Prochaine étape */}
              <div className="next-step">
                <div className="next-step-icon">📋</div>
                <div>
                  <div className="next-step-title">Prochaine étape</div>
                  <div className="next-step-desc">Votre dossier bancaire est en préparation. Un RDV vous sera proposé sous 48h.</div>
                </div>
              </div>

              {/* Progression */}
              <div className="etapes-card">
                <div className="etapes-title">Progression de votre dossier</div>
                <div className="etapes-track">
                  {ETAPES.map((e, i) => (
                    <div key={e} style={{ display: 'flex', alignItems: 'center', flex: i < ETAPES.length - 1 ? 1 : 0 }}>
                      <div className={`etape-dot ${i < CLIENT.etape ? 'done' : i === CLIENT.etape ? 'current' : 'pending'}`}>
                        {i < CLIENT.etape ? '✓' : i + 1}
                      </div>
                      {i < ETAPES.length - 1 && (
                        <div className={`etape-line ${i < CLIENT.etape ? 'done' : 'pending'}`} />
                      )}
                    </div>
                  ))}
                </div>
                <div className="etapes-labels">
                  {ETAPES.map((e, i) => (
                    <div key={e} className={`etape-lbl ${i < CLIENT.etape ? 'done' : i === CLIENT.etape ? 'active' : ''}`}>{e}</div>
                  ))}
                </div>
              </div>

              {/* Infos dossier */}
              <div className="info-card">
                <div className="info-title">Votre dossier</div>
                <div className="info-grid">
                  <div className="info-item">
                    <div className="info-lbl">Montant demandé</div>
                    <div className="info-val">{CLIENT.montant} XAF</div>
                  </div>
                  <div className="info-item">
                    <div className="info-lbl">Objet du financement</div>
                    <div className="info-val">{CLIENT.objet}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-lbl">Statut</div>
                    <div className="info-val" style={{ color: 'var(--green)' }}>✅ {CLIENT.statut}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-lbl">Date de dépôt</div>
                    <div className="info-val">{CLIENT.dateDepot}</div>
                  </div>
                </div>
              </div>

              {/* Conseiller */}
              <div className="conseiller-card">
                <div className="cons-avatar">A</div>
                <div style={{ flex: 1 }}>
                  <div className="cons-name">{CLIENT.conseiller}</div>
                  <div className="cons-role">Votre conseiller Mayinvest</div>
                  <button className="wa-pill">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Contacter sur WhatsApp
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── MESSAGES ── */}
          {tab === 'messages' && (
            <div className="msg-wrap">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 36, height: 36, background: '#1A6BFF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff' }}>A</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{CLIENT.conseiller}</div>
                  <div style={{ fontSize: 11, color: 'var(--green)' }}>● En ligne</div>
                </div>
              </div>
              <div className="msg-list">
                {messages.map(m => (
                  <div key={m.id}>
                    {m.from === 'conseiller' && (
                      <div className="msg-from">Mayinvest · {CLIENT.conseiller}</div>
                    )}
                    <div className={`msg-bubble ${m.from}`}>{m.text}</div>
                    <div className={`msg-time ${m.from === 'client' ? 'right' : ''}`}>{m.time}</div>
                  </div>
                ))}
              </div>
              <div className="msg-input-row">
                <input className="msg-input" placeholder="Écrire un message..." value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()} />
                <button className="msg-send" onClick={sendMessage}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" /></svg>
                </button>
              </div>
            </div>
          )}

          {/* ── DOCUMENTS ── */}
          {tab === 'documents' && (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Vos documents</div>
              <div style={{ fontSize: 12, color: 'var(--fg2)', marginBottom: 16 }}>Uploadez vos pièces directement ici — votre conseiller les reçoit instantanément.</div>
              <div className="info-card">
                {DOCUMENTS.map(d => (
                  <div key={d.id} className="doc-item">
                    <div className="doc-icon" style={{ background: d.status === 'validé' ? 'var(--green-light)' : d.status === 'en attente' ? 'var(--gold-light)' : 'var(--red-light)' }}>
                      {d.status === 'validé' ? '✅' : d.status === 'en attente' ? '⏳' : '📎'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="doc-name">{d.name}</div>
                      <div className="doc-meta">{d.size !== '—' ? d.size : 'Non uploadé'} · {d.date}</div>
                    </div>
                    <div className="doc-status">
                      <span className={`dpill ${d.status === 'validé' ? 'dpill-v' : d.status === 'en attente' ? 'dpill-w' : 'dpill-r'}`}>
                        {d.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <button className="upload-btn">
                ⬆ Uploader un document
              </button>
            </>
          )}

          {/* ── ACTIVITÉS ── */}
          {tab === 'activites' && (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Historique</div>
              <div style={{ fontSize: 12, color: 'var(--fg2)', marginBottom: 16 }}>Toutes les actions sur votre dossier</div>
              <div className="info-card">
                {[
                  { dot: '#16A34A', text: 'Dossier marqué "Éligible" — Score 90/100', time: '16 Jan 2024 · 09:15' },
                  { dot: '#1A6BFF', text: 'Message de votre conseiller reçu', time: '16 Jan 2024 · 09:15' },
                  { dot: '#0891B2', text: 'Document "Pièce d\'identité" validé', time: '15 Jan 2024 · 16:45' },
                  { dot: '#0891B2', text: 'Document "Bulletin Jan" validé', time: '15 Jan 2024 · 16:30' },
                  { dot: '#7C3AED', text: 'Documents uploadés par le client', time: '15 Jan 2024 · 14:52' },
                  { dot: '#1A6BFF', text: 'Premier message du conseiller envoyé', time: '15 Jan 2024 · 10:23' },
                  { dot: '#16A34A', text: '🎉 Formulaire de préselection soumis', time: '15 Jan 2024 · 09:00' },
                ].map((a, i) => (
                  <div key={i} className="act-item">
                    <div className="act-dot" style={{ background: a.dot }} />
                    <div>
                      <div className="act-text">{a.text}</div>
                      <div className="act-time">{a.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

        </div>
      </div>
    </>
  )
}
