import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

export const Route = createFileRoute('/client/$id')({
  component: ClientSpace,
})

// ─── Supabase ─────────────────────────────────────────────────────────────────
const supabase = createClient(
  'https://vqjzsblllmdmthpysaio.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxanpzYmxsbG1kbXRocHlzYWlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwODI1MzEsImV4cCI6MjEwNTY1ODUzMX0.O9DRpJJJeStk4-oRnqYZJoTLWJgwFRzb2L2ngdg02XU'
)

// ─── Types ────────────────────────────────────────────────────────────────────
interface Lead {
  id: string
  type: string
  activite: string
  ville: string
  montant_demande: number
  statut: string
  score: number
  created_at: string
  banque_actuelle: string
  identite: { nom?: string; prenom?: string; tel?: string; email?: string }
  situation: Record<string, unknown>
  besoin: Record<string, unknown>
  eligibilite: Record<string, unknown>
}

interface Message {
  id: string
  lead_id: string
  expediteur: 'client' | 'conseiller'
  text: string
  created_at: string
  read: boolean
}

interface Document {
  id: string
  lead_id: string
  name: string
  size: string
  status: 'validé' | 'en attente' | 'requis'
  created_at: string
  url?: string
}

const ETAPES = ['Soumis', 'En analyse', 'Éligible', 'Dossier déposé', 'Financé']

function etapeIndex(statut: string) {
  if (statut === 'Nouveau') return 0
  if (statut === 'Contacté') return 1
  if (statut === 'Éligible') return 2
  if (statut === 'Dossier Déposé') return 3
  if (statut === 'Financé') return 4
  return 0
}

export default function ClientSpace() {
  const { id } = Route.useParams()
  const [tab, setTab] = useState<'accueil' | 'messages' | 'documents' | 'activites'>('accueil')
  const [lead, setLead] = useState<Lead | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [activities, setActivities] = useState<{ id: string; text: string; created_at: string }[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const msgEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchAll()
    // Temps réel messages
    const channel = supabase
      .channel(`client-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `lead_id=eq.${id}` }, () => fetchMessages())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id])

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchAll() {
    setLoading(true)
    await Promise.all([fetchLead(), fetchMessages(), fetchDocuments(), fetchActivities()])
    setLoading(false)
  }

  async function fetchLead() {
    const { data } = await supabase.from('leads').select('*').eq('id', id).single()
    if (data) setLead(data as Lead)
  }

  async function fetchMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('lead_id', id)
      .order('created_at', { ascending: true })
    if (data) setMessages(data as Message[])
    // Marquer comme lus
    await supabase.from('messages').update({ read: true }).eq('lead_id', id).eq('expediteur', 'conseiller').eq('read', false)
  }

  async function fetchDocuments() {
    const { data } = await supabase.from('documents').select('*').eq('lead_id', id).order('created_at', { ascending: false })
    if (data) setDocuments(data as Document[])
    else {
      // Fallback : documents requis par défaut si table vide
      setDocuments([
        { id: '1', lead_id: id, name: 'Pièce d'identité', size: '—', status: 'requis', created_at: '' },
        { id: '2', lead_id: id, name: 'Bulletin de salaire', size: '—', status: 'requis', created_at: '' },
        { id: '3', lead_id: id, name: 'Relevé de compte 3 mois', size: '—', status: 'requis', created_at: '' },
      ])
    }
  }

  async function fetchActivities() {
    const { data } = await supabase
      .from('activites')
      .select('*')
      .eq('lead_id', id)
      .order('created_at', { ascending: false })
    if (data) setActivities(data)
  }

  async function sendMessage() {
    if (!newMsg.trim() || sending) return
    setSending(true)
    const { error } = await supabase.from('messages').insert({
      lead_id: id,
      expediteur: 'client',
      text: newMsg.trim(),
      read: false,
    })
    if (!error) {
      setNewMsg('')
      await fetchMessages()
    }
    setSending(false)
  }

  if (loading) {
    return (
      <>
        <style>{`body{font-family:'Inter',system-ui,sans-serif;background:#F4F5F7;display:flex;align-items:center;justify-content:center;min-height:100vh;}`}</style>
        <div style={{ textAlign: 'center', color: '#6B7280' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div style={{ fontSize: 14 }}>Chargement de votre espace…</div>
        </div>
      </>
    )
  }

  if (!lead) {
    return (
      <>
        <style>{`body{font-family:'Inter',system-ui,sans-serif;background:#F4F5F7;display:flex;align-items:center;justify-content:center;min-height:100vh;}`}</style>
        <div style={{ textAlign: 'center', color: '#6B7280' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 14 }}>Dossier introuvable.</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>Vérifiez le lien reçu par WhatsApp.</div>
        </div>
      </>
    )
  }

  const nomClient = `${lead.identite?.prenom || ''} ${lead.identite?.nom || ''}`.trim() || 'Client'
  const etape = etapeIndex(lead.statut)
  const unreadCount = messages.filter(m => m.expediteur === 'conseiller' && !m.read).length
  const scoreR = 40
  const circ = 2 * Math.PI * scoreR
  const dash = (lead.score / 100) * circ
  const scoreColor = lead.score >= 70 ? '#16A34A' : lead.score >= 45 ? '#CA8A04' : '#DC2626'

  function fmtTime(iso: string) {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <>
      <style>{`
        :root{
          --bg:#F4F5F7;--surface:#fff;--surface2:#F9FAFB;--border:#E5E7EB;
          --fg:#111827;--fg2:#6B7280;--fg3:#9CA3AF;--accent:#1A6BFF;
          --green:#16A34A;--green-light:#DCFCE7;--orange:#EA580C;
          --blue-msg:#1A6BFF;--max:480px;
        }
        @media(prefers-color-scheme:dark){:root:not([data-theme="light"]){
          --bg:#0F1117;--surface:#1A1D27;--surface2:#22263A;--border:#2D3244;
          --fg:#F1F5F9;--fg2:#94A3B8;--fg3:#64748B;--green-light:#052E16;color-scheme:dark;
        }}
        :root[data-theme="dark"]{--bg:#0F1117;--surface:#1A1D27;--surface2:#22263A;--border:#2D3244;--fg:#F1F5F9;--fg2:#94A3B8;--fg3:#64748B;--green-light:#052E16;color-scheme:dark;}
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'Inter',system-ui,sans-serif;background:var(--bg);color:var(--fg);-webkit-font-smoothing:antialiased;}
        .wrap{max-width:var(--max);margin:0 auto;min-height:100vh;display:flex;flex-direction:column;background:var(--surface);position:relative;}
        .topbar{background:#0D1B3E;padding:16px 20px 12px;position:sticky;top:0;z-index:20;}
        .tabs{display:flex;background:var(--surface2);border-top:1px solid var(--border);position:sticky;bottom:0;z-index:20;}
        .tab-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:10px 4px;background:none;border:none;cursor:pointer;font-family:inherit;font-size:9px;font-weight:600;color:var(--fg3);text-transform:uppercase;letter-spacing:.04em;transition:color 0.15s;position:relative;}
        .tab-btn.active{color:var(--accent);}
        .tab-btn.active::after{content:'';position:absolute;bottom:0;left:20%;right:20%;height:2px;background:var(--accent);border-radius:2px 2px 0 0;}
        .tab-icon{font-size:20px;}
        .content{flex:1;overflow-y:auto;padding:20px 16px 12px;}
        /* Accueil */
        .score-ring{display:flex;flex-direction:column;align-items:center;padding:28px 0 20px;}
        .etapes{display:flex;align-items:center;margin-bottom:20px;}
        .etape-dot{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;transition:all 0.2s;}
        .etape-line{flex:1;height:2px;}
        .card{background:var(--surface2);border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:12px;}
        .card-label{font-size:11px;font-weight:600;color:var(--fg2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;}
        .info-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);}
        .info-row:last-child{border-bottom:none;}
        .info-key{font-size:12px;color:var(--fg2);}
        .info-val{font-size:12px;font-weight:600;}
        /* Messages */
        .msg-area{flex:1;padding:16px;display:flex;flex-direction:column;gap:10px;overflow-y:auto;}
        .msg-bubble{max-width:78%;padding:10px 14px;border-radius:18px;font-size:14px;line-height:1.5;}
        .msg-client{align-self:flex-end;background:var(--accent);color:#fff;border-bottom-right-radius:4px;}
        .msg-conseiller{align-self:flex-start;background:var(--surface2);border:1px solid var(--border);color:var(--fg);border-bottom-left-radius:4px;}
        .msg-meta{font-size:10px;opacity:0.6;margin-top:4px;}
        .msg-input-bar{padding:12px 16px;border-top:1px solid var(--border);display:flex;gap:8px;background:var(--surface);position:sticky;bottom:56px;}
        .msg-input{flex:1;border:1px solid var(--border);background:var(--surface2);border-radius:22px;padding:10px 16px;font-family:inherit;font-size:14px;color:var(--fg);outline:none;resize:none;}
        .send-btn{width:40px;height:40px;border-radius:50%;background:var(--accent);border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}
        .send-btn:disabled{opacity:0.5;}
        /* Documents */
        .doc-row{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);}
        .doc-row:last-child{border-bottom:none;}
        .doc-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}
        .doc-status{font-size:10px;font-weight:700;padding:2px 8px;border-radius:100px;}
        .s-valide{background:var(--green-light);color:var(--green);}
        .s-attente{background:#FEF9C3;color:#854D0E;}
        .s-requis{background:#FEE2E2;color:#DC2626;}
        .upload-btn{margin-top:16px;width:100%;border:2px dashed var(--border);border-radius:12px;padding:20px;text-align:center;background:var(--surface2);color:var(--fg2);font-size:13px;cursor:pointer;font-family:inherit;}
        /* Activités */
        .act-item{display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);}
        .act-item:last-child{border-bottom:none;}
        .act-dot{width:10px;height:10px;border-radius:50%;background:var(--accent);flex-shrink:0;margin-top:4px;}
        .notif-badge{position:absolute;top:6px;right:calc(50% - 18px);width:16px;height:16px;background:#DC2626;border-radius:50%;font-size:9px;font-weight:700;color:#fff;display:flex;align-items:center;justify-content:center;}
      `}</style>

      <div className="wrap">
        {/* TOPBAR */}
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, background: '#1A6BFF', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff', flexShrink: 0 }}>M</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Mayinvest</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Espace client · {nomClient}</div>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="content" style={{ padding: tab === 'messages' ? 0 : undefined }}>

          {/* ── ACCUEIL ── */}
          {tab === 'accueil' && (
            <>
              {/* Score ring */}
              <div className="score-ring">
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r={scoreR} fill="none" stroke="var(--border)" strokeWidth="8" />
                  <circle cx="60" cy="60" r={scoreR} fill="none" stroke={scoreColor} strokeWidth="8"
                    strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                    transform="rotate(-90 60 60)" style={{ transition: 'stroke-dasharray 1s ease' }} />
                  <text x="60" y="57" textAnchor="middle" fill={scoreColor} fontSize="26" fontWeight="800" fontFamily="Inter,system-ui,sans-serif">{lead.score}</text>
                  <text x="60" y="72" textAnchor="middle" fill="var(--fg2)" fontSize="11" fontFamily="Inter,system-ui,sans-serif">/100</text>
                </svg>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>
                  {lead.score >= 70 ? '🎉 Excellent dossier !' : lead.score >= 45 ? '👍 Bon potentiel' : '⚠️ À améliorer'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--fg2)', marginTop: 4 }}>
                  <span style={{ background: lead.statut === 'Financé' ? 'var(--green-light)' : 'var(--surface2)', color: lead.statut === 'Financé' ? 'var(--green)' : 'var(--fg2)', padding: '3px 10px', borderRadius: 100, fontWeight: 600, border: '1px solid var(--border)' }}>{lead.statut}</span>
                </div>
              </div>

              {/* Progression */}
              <div className="card">
                <div className="card-label">Progression de votre dossier</div>
                <div className="etapes">
                  {ETAPES.map((e, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < ETAPES.length - 1 ? 1 : 0 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div className="etape-dot" style={{
                          background: i <= etape ? '#1A6BFF' : 'var(--border)',
                          color: i <= etape ? '#fff' : 'var(--fg3)',
                          border: i === etape ? '3px solid #1A6BFF' : '2px solid transparent',
                          boxShadow: i === etape ? '0 0 0 3px rgba(26,107,255,0.2)' : 'none',
                        }}>
                          {i < etape ? '✓' : i + 1}
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: i <= etape ? 'var(--accent)' : 'var(--fg3)', textAlign: 'center', width: 50, lineHeight: 1.2 }}>{e}</div>
                      </div>
                      {i < ETAPES.length - 1 && (
                        <div className="etape-line" style={{ background: i < etape ? '#1A6BFF' : 'var(--border)', marginBottom: 20 }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Infos dossier */}
              <div className="card">
                <div className="card-label">Votre dossier</div>
                {[
                  ['Type', lead.type],
                  ['Activité', lead.activite],
                  ['Ville', lead.ville],
                  ['Montant demandé', `${lead.montant_demande?.toLocaleString('fr-FR')} XAF`],
                  ['Banque', lead.banque_actuelle || '—'],
                  ['Date de soumission', new Date(lead.created_at).toLocaleDateString('fr-FR')],
                ].map(([k, v]) => (
                  <div key={k} className="info-row">
                    <div className="info-key">{k}</div>
                    <div className="info-val">{v}</div>
                  </div>
                ))}
              </div>

              {/* Conseiller */}
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 46, height: 46, background: '#1A6BFF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#fff', flexShrink: 0 }}>A</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Votre conseiller</div>
                  <div style={{ fontSize: 12, color: 'var(--fg2)' }}>Équipe Mayinvest</div>
                </div>
                <a href={`https://wa.me/242060000000?text=Bonjour, je suis ${nomClient}, dossier ${id}`}
                  style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  target="_blank" rel="noreferrer">
                  📱 WhatsApp
                </a>
              </div>
            </>
          )}

          {/* ── MESSAGES ── */}
          {tab === 'messages' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="msg-area">
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--fg3)', fontSize: 13, padding: '40px 0' }}>
                    Pas encore de messages.<br />Envoyez un message à votre conseiller.
                  </div>
                )}
                {messages.map(m => (
                  <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.expediteur === 'client' ? 'flex-end' : 'flex-start' }}>
                    <div className={`msg-bubble ${m.expediteur === 'client' ? 'msg-client' : 'msg-conseiller'}`}>
                      {m.text}
                      <div className="msg-meta">{fmtTime(m.created_at)}</div>
                    </div>
                  </div>
                ))}
                <div ref={msgEndRef} />
              </div>
              <div className="msg-input-bar">
                <textarea
                  className="msg-input"
                  placeholder="Votre message…"
                  rows={1}
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                />
                <button className="send-btn" onClick={sendMessage} disabled={sending || !newMsg.trim()}>➤</button>
              </div>
            </div>
          )}

          {/* ── DOCUMENTS ── */}
          {tab === 'documents' && (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Documents du dossier</div>
              {documents.map(d => (
                <div key={d.id} className="doc-row">
                  <div className="doc-icon" style={{ background: d.status === 'validé' ? 'var(--green-light)' : d.status === 'en attente' ? '#FEF9C3' : '#FEE2E2' }}>
                    {d.status === 'validé' ? '✅' : d.status === 'en attente' ? '⏳' : '📄'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{d.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg2)' }}>{d.size} {d.created_at ? '· ' + new Date(d.created_at).toLocaleDateString('fr-FR') : ''}</div>
                  </div>
                  <span className={`doc-status ${d.status === 'validé' ? 's-valide' : d.status === 'en attente' ? 's-attente' : 's-requis'}`}>
                    {d.status}
                  </span>
                </div>
              ))}
              <label className="upload-btn">
                <input type="file" hidden onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  await supabase.from('documents').insert({
                    lead_id: id,
                    name: file.name,
                    size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
                    status: 'en attente',
                  })
                  fetchDocuments()
                }} />
                📎 Ajouter un document
              </label>
            </>
          )}

          {/* ── ACTIVITÉS ── */}
          {tab === 'activites' && (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Historique du dossier</div>
              {activities.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--fg3)', fontSize: 13, padding: '40px 0' }}>
                  Aucune activité enregistrée pour le moment.
                </div>
              )}
              {activities.map(a => (
                <div key={a.id} className="act-item">
                  <div className="act-dot" />
                  <div>
                    <div style={{ fontSize: 13, lineHeight: 1.4 }}>{a.text}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg2)', marginTop: 3 }}>{fmtTime(a.created_at)}</div>
                  </div>
                </div>
              ))}
              {/* Fallback si pas de table activites : afficher création du lead */}
              {activities.length === 0 && lead && (
                <div className="act-item">
                  <div className="act-dot" />
                  <div>
                    <div style={{ fontSize: 13 }}>Dossier soumis sur Mayinvest PréSelect</div>
                    <div style={{ fontSize: 11, color: 'var(--fg2)', marginTop: 3 }}>{new Date(lead.created_at).toLocaleDateString('fr-FR')}</div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* TABS */}
        <div className="tabs">
          {([
            { key: 'accueil', icon: '🏠', label: 'Accueil' },
            { key: 'messages', icon: '💬', label: 'Messages', badge: unreadCount },
            { key: 'documents', icon: '📁', label: 'Documents' },
            { key: 'activites', icon: '📋', label: 'Activités' },
          ] as const).map(t => (
            <button key={t.key} className={`tab-btn${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
              <span className="tab-icon">{t.icon}</span>
              {t.label}
              {'badge' in t && t.badge > 0 && <span className="notif-badge">{t.badge}</span>}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
