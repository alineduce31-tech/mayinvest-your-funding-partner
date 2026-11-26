import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Search, Phone, MessageCircle, FileText, UserPlus, Ban, FileX, BarChart3, CircleCheck, CircleAlert, RefreshCw, Landmark } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import NiceSelect from '@/components/NiceSelect'
import CallButton from '@/components/CallButton'
import { BK_CSS } from '@/components/BancarisationView'
import { LIFECYCLE_STATUTS, STATUT_COLORS, LEAD_ACTIONS, fillTemplate, buildWhatsappUrl } from '@/lib/lead-templates'
import { nomLead, estPme } from '@/lib/bancarisation'
import { estNonEligible, raison, offre, chiffresNE, compteFiltresNE, listeNE, variablesModele, type FiltreNE, type LeadNE } from '@/lib/non-eligibles'
import { montantComplet, dateRelative, initialesNom, couleurAvatar } from '@/lib/affichage'

const FILTRES: { k: FiltreNE; label: string }[] = [
  { k: 'tous', label: 'Tous' }, { k: 'rccm', label: 'Sans RCCM' }, { k: 'score', label: 'Score trop bas' },
  { k: 'pack', label: 'Pack vendu' }, { k: 'sans_conseiller', label: 'Sans conseiller' },
]
const ICONE_RAISON = { pack: <CircleCheck size={13}/>, rccm: <FileX size={13}/>, score: <BarChart3 size={13}/>, marque: <CircleAlert size={13}/> }

export default function NonEligiblesView({ leads, onOpen, updateStatut, assignLead, teamMembers, isDirector }: {
  leads: any[]; onOpen: (l: any) => void; updateStatut: (id: string, s: string) => void
  assignLead: (id: string, agent: string | null) => void; teamMembers: any[]; isDirector: boolean
}) {
  const navigate = useNavigate()
  const [filtre, setFiltre] = useState<FiltreNE>('tous')
  const [q, setQ] = useState('')
  const [equipe, setEquipe] = useState<{ id: string; nom: string }[]>([])
  useEffect(() => {
    supabase.rpc('admin_team_threads').then(({ data }) => {
      if (data) setEquipe((data as any[]).map(t => ({ id: t.commercial_id, nom: t.nom || 'Commercial' })))
    })
  }, [])
  const now = Date.now()
  const base = useMemo(() => (leads as LeadNE[]).filter(estNonEligible), [leads])
  const ch = chiffresNE(base)
  const nb = compteFiltresNE(base)
  const liste = listeNE(base, filtre, q)
  const nomAgent = (id: string): string => {
    const c = equipe.find(x => x.id === id)
    if (c) return c.nom
    const m = (teamMembers || []).find((x: any) => x.id === id)
    return m ? (`${m.prenom || ''} ${m.nom || ''}`.trim() || String(m.email || '').split('@')[0] || 'Conseiller') : 'Conseiller assigné'
  }

  function proposer(l: LeadNE) {
    const o = offre(l)
    if (o.key === 'repasser') { updateStatut(l.id, 'Éligible'); return }
    const a = LEAD_ACTIONS.find(x => x.key === o.key)
    if (!a) return
    const v = variablesModele(l)
    const msg = fillTemplate(a.template, v)
    window.open(v['telephone'] ? buildWhatsappUrl(v['telephone'], msg) : `https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener')
  }

  return (
    <div className="bk ne">
      <style>{BK_CSS + NE_CSS}</style>
      <p className="bk-sub">Dossiers refusés pour l'instant : on les aide à devenir éligibles (Pack formalisation, ouverture de compte, restructuration).</p>
      <div className="bk-kpis">
        <div className="bk-k"><small>Dossiers à reconvertir</small><b>{ch.aReconvertir}</b><span>dont {ch.sansConseiller} sans conseiller</span></div>
        <div className="bk-k warn"><small>Sans RCCM</small><b>{ch.sansRccm}</b><span>cible du Pack formalisation</span></div>
        <div className="bk-k ok"><small>Packs vendus</small><b>{ch.packs}</b><span>{montantComplet(ch.encaisse).replace('—', '0 XAF')} encaissés</span></div>
        <div className="bk-k"><small>Potentiel restant</small><b>{montantComplet(ch.potentiel).replace('—', '0 XAF')}</b><span>si chaque dossier sans RCCM prend le Pack</span></div>
      </div>

      <div className="bk-card">
        <div className="bk-tb">
          <label className="bk-srch"><Search size={15}/><input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un dossier, une ville…" aria-label="Rechercher"/></label>
          <div className="bk-chips">{FILTRES.map(f => <button key={f.k} className={filtre === f.k ? 'on' : ''} onClick={() => setFiltre(f.k)}>{f.label}<b>{nb[f.k]}</b></button>)}</div>
        </div>

        {liste.length === 0 ? (
          <div className="bk-vide"><span><Ban size={22}/></span><b>{base.length ? 'Aucun dossier pour ce filtre' : 'Aucun dossier non éligible'}</b><small>Les dossiers sans RCCM, avec un score trop bas ou marqués non éligibles apparaissent ici.</small></div>
        ) : (
          <>
            <div className="bk-hd"><span>Dossier</span><span>Pourquoi</span><span>Statut · conseiller</span><span className="r">Montant</span><span>À proposer</span><span/></div>
            {liste.map(l => {
              const nom = nomLead(l)
              const av = couleurAvatar(nom)
              const r = raison(l)
              const o = offre(l)
              const c = STATUT_COLORS[l.statut] || { bg: '#F1F5F9', fg: '#475569' }
              const tel = l.identite?.tel || l.identite?.telephone
              const meta = [estPme(l) ? 'PME' : 'Particulier', l.activite, l.identite?.ville || l.ville].filter(Boolean).join(' · ')
              return (
                <div key={l.id} className={`bk-row ${l.statut === 'Perdu' ? 'clos' : ''}`}>
                  <button className="bk-who" onClick={() => onOpen(l)}>
                    <span className="bk-av" style={{ background: av.fond, color: av.texte }}>{initialesNom(nom)}</span>
                    <span className="bk-nm"><b>{nom}</b><small>{meta}</small></span>
                  </button>
                  <span className={`ne-why ${r.code}`}>{ICONE_RAISON[r.code]}{r.libelle}</span>
                  <span className="ne-st">
                    <NiceSelect variant="compact" value={l.statut} onChange={v => updateStatut(l.id, v)} title="Changer le statut" ariaLabel="Changer le statut"
                      style={{ background: c.bg, color: c.fg, border: 'none', borderRadius: 999, padding: '5px 9px 5px 12px', fontSize: 12.5 }}
                      options={LIFECYCLE_STATUTS.map(s => ({ value: s, label: s }))}/>
                    {isDirector ? (
                      <NiceSelect variant="compact" value={l.agent_commercial_id || ''} onChange={v => assignLead(l.id, v || null)} title="Assigner ce dossier" ariaLabel="Conseiller"
                        className={l.agent_commercial_id ? 'bk-ag' : 'bk-ag vide'}
                        options={[
                          { value: '', label: 'Assigner', icon: <UserPlus size={14}/> },
                          ...(l.agent_commercial_id && !equipe.some(m => m.id === l.agent_commercial_id) ? [{ value: l.agent_commercial_id, label: nomAgent(l.agent_commercial_id) }] : []),
                          ...equipe.map(m => ({ value: m.id, label: m.nom })),
                        ]}/>
                    ) : <span className="bk-ag-txt">{l.agent_commercial_id ? nomAgent(l.agent_commercial_id) : 'Sans conseiller'}</span>}
                  </span>
                  <span className="bk-amt"><b>{montantComplet(l.montant_demande)}</b><small>{dateRelative(l.created_at, now)}</small></span>
                  <span className="ne-offre-c">
                    <button className={`ne-offre ${o.key}`} onClick={() => proposer(l)} title={o.key === 'repasser' ? 'Passer le statut à Éligible' : 'Ouvre WhatsApp avec le message déjà rédigé'}>
                      {o.key === 'repasser' ? <RefreshCw size={14}/> : o.key === 'ouverture_compte' ? <Landmark size={14}/> : <WaIcon/>}{o.label}
                    </button>
                  </span>
                  <span className="bk-qa">
                    {tel && <CallButton tel={tel} nom={nom} leadId={l.id} className="bk-q call" title="Appeler"><Phone size={14}/></CallButton>}
                    <button className="bk-q msg" title="Conversation" aria-label="Ouvrir la conversation" onClick={() => navigate({ to: '/messagerie', search: { lead: l.id } as any })}><MessageCircle size={14}/></button>
                    <button className="bk-q fiche" title="Fiche" aria-label="Ouvrir la fiche" onClick={() => onOpen(l)}><FileText size={14}/></button>
                  </span>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}

const WaIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.2.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>

const NE_CSS = `
  .bk.ne .bk-hd, .bk.ne .bk-row { grid-template-columns: minmax(0, 1fr) 150px 160px 130px 180px 104px; }
  .ne-why { display: inline-flex; align-items: center; gap: 5px; justify-self: start; font-size: 12px; font-weight: 700; padding: 4px 9px; border-radius: 8px; white-space: nowrap; }
  .ne-why.rccm { background: #FEF3C7; color: #92400E; } .ne-why.score { background: #FEE2E2; color: #991B1B; }
  .ne-why.pack { background: #DCFCE7; color: #166534; } .ne-why.marque { background: #F1F5F9; color: #475569; }
  .ne-st { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; min-width: 0; }
  .ne-st .ns-compact { max-width: 100%; font-size: 12px !important; font-weight: 700; }
  .ne-offre-c { display: flex; min-width: 0; }
  .ne-offre { display: inline-flex; align-items: center; gap: 6px; border: none; border-radius: 999px; padding: 8px 13px; font-family: inherit; font-size: 12.5px !important; line-height: 1.2; font-weight: 700; cursor: pointer; white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
  .ne-offre.pack_formalisation, .ne-offre.restructuration { background: #25D366; color: #fff; }
  .ne-offre.ouverture_compte { background: #EEF4FF; color: #1A6BFF; }
  .ne-offre.repasser { background: #F1F5F9; color: #334155; }
  @media (max-width: 1100px) {
    .bk.ne .bk-row { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); grid-template-areas: "who who" "why amt" "st st" "offre qa"; }
    .bk.ne .bk-who { grid-area: who; } .ne-why { grid-area: why; } .bk.ne .bk-amt { grid-area: amt; align-items: flex-end; }
    .ne-st { grid-area: st; flex-direction: row; flex-wrap: wrap; } .ne-offre-c { grid-area: offre; } .bk.ne .bk-qa { grid-area: qa; }
  }
`
