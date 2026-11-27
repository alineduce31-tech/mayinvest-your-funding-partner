import { useEffect, useMemo, useState } from 'react'
import { useBarreFigee } from '@/hooks/useBarreFigee'
import { useNavigate } from '@tanstack/react-router'
import { Search, Phone, MessageCircle, FileText, UserPlus, Ban, FileX, BarChart3, CircleCheck, CircleAlert, RefreshCw, Wallet, Send, Check, FileBadge } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import NiceSelect from '@/components/NiceSelect'
import ConseillerPicker from '@/components/ConseillerPicker'
import StatutPicker from '@/components/StatutPicker'
import CallButton from '@/components/CallButton'
import { BK_CSS } from '@/components/BancarisationView'
import { LIFECYCLE_STATUTS, STATUT_COLORS, TEMPLATE_PACK_FORMALISATION, fillTemplate } from '@/lib/lead-templates'
import { libelleStatutPack, type Pack } from '@/lib/pack'
import { nomLead, estPme } from '@/lib/bancarisation'
import { estNonEligible, raison, offre, chiffresNE, compteFiltresNE, listeNE, variablesModele, type FiltreNE, type LeadNE } from '@/lib/non-eligibles'
import { montantComplet, dateRelative, initialesNom, couleurAvatar } from '@/lib/affichage'

const FILTRES: { k: FiltreNE; label: string }[] = [
  { k: 'tous', label: 'Tous' }, { k: 'rccm', label: 'Sans RCCM' }, { k: 'score', label: 'Score trop bas' },
  { k: 'pack', label: 'Pack vendu' }, { k: 'sans_conseiller', label: 'Sans conseiller' },
]
const ICONE_RAISON = { pack: <CircleCheck size={13}/>, rccm: <FileX size={13}/>, score: <BarChart3 size={13}/>, marque: <CircleAlert size={13}/> }

export default function NonEligiblesView({ leads, onOpen, updateStatut, assignLead, teamMembers, isDirector, adminId }: {
  leads: any[]; onOpen: (l: any) => void; updateStatut: (id: string, s: string) => void
  assignLead: (id: string, agent: string | null) => void; teamMembers: any[]; isDirector: boolean; adminId?: string
}) {
  const fige = useBarreFigee()
  const navigate = useNavigate()
  const [filtre, setFiltre] = useState<FiltreNE>('tous')
  const [q, setQ] = useState('')
  const [equipe, setEquipe] = useState<{ id: string; nom: string }[]>([])
  useEffect(() => {
    supabase.rpc('admin_team_threads').then(({ data }) => {
      if (data) setEquipe((data as any[]).map(t => ({ id: t.commercial_id, nom: t.nom || 'Commercial' })))
    })
  }, [])
  // Souscriptions déjà faites (pour afficher où en est le client au lieu de reproposer le pack)
  const [packs, setPacks] = useState<Record<string, Pack>>({})
  const [proposes, setProposes] = useState<Record<string, 'envoi' | 'ok'>>({})
  const [errProp, setErrProp] = useState('')
  useEffect(() => {
    supabase.rpc('admin_packs').then(({ data }) => {
      if (data) setPacks(Object.fromEntries((data as Pack[]).map(p => [p.lead_id, p])))
    })
  }, [])
  const now = Date.now()
  const base = useMemo(() => (leads as LeadNE[]).filter(estNonEligible), [leads])
  const ch = chiffresNE(base)
  // Montant réellement encaissé (paiements confirmés dans la page Packs)
  const encaisseReel = Object.values(packs).reduce((t, p) => t + (p.statut === 'paye' || p.statut === 'termine' ? Number(p.paiement_montant) || 0 : 0), 0)
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
    // Le pack se souscrit sur la plateforme : on l'envoie dans la discussion de l'espace client
    if (proposes[l.id]) return
    setErrProp(''); setProposes(p => ({ ...p, [l.id]: 'envoi' }))
    // Carte « Pack formalisation » dans la discussion (le texte ne sert qu'en secours)
    const msg = fillTemplate(TEMPLATE_PACK_FORMALISATION, variablesModele(l))
    supabase.rpc('send_lead_card', { p_lead_id: l.id, p_sender: 'admin', p_author_id: adminId, p_kind: 'pack', p_payload: {}, p_content: msg }).then(({ error }) => {
      if (error) {
        setErrProp(`Message non envoyé à ${nomLead(l)} : ${error.message}`)
        setProposes(p => { const n = { ...p }; delete n[l.id]; return n })
      } else setProposes(p => ({ ...p, [l.id]: 'ok' }))
    })
  }

  return (
    <div className="bk ne">
      <style>{BK_CSS + NE_CSS}</style>
      <p className="bk-sub">Dossiers refusés pour l'instant : on les aide à devenir éligibles avec le Pack formalisation (RCCM, NIU, statuts et ouverture de compte).</p>
      <div className="bk-kpis">
        <div className="bk-k"><i className="bk-ic b"><RefreshCw size={16} strokeWidth={1.8}/></i><small>Dossiers à reconvertir</small><b>{ch.aReconvertir}</b><span>dont {ch.sansConseiller} sans conseiller</span></div>
        <div className="bk-k warn"><i className="bk-ic o"><FileX size={16} strokeWidth={1.8}/></i><small>Sans RCCM</small><b>{ch.sansRccm}</b><span>cible du Pack formalisation</span></div>
        <div className="bk-k ok"><i className="bk-ic g"><CircleCheck size={16} strokeWidth={1.8}/></i><small>Packs vendus</small><b>{ch.packs}</b><span>{montantComplet(encaisseReel).replace('—', '0 XAF')} encaissés</span></div>
        <div className="bk-k"><i className="bk-ic n"><Wallet size={16} strokeWidth={1.8}/></i><small>Potentiel restant</small><b>{montantComplet(ch.potentiel).replace('—', '0 XAF')}</b><span>si chaque dossier sans RCCM prend le Pack</span></div>
      </div>

      <div className="bk-card">
        <div ref={fige.repere} className="barre-repere" aria-hidden="true"/>
        <div ref={fige.barre} style={fige.style} className={`bk-tb ${fige.classe}`}>
          <label className="bk-srch"><Search size={15}/><input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un dossier, une ville…" aria-label="Rechercher"/></label>
          <div className="bk-chips">{FILTRES.map(f => <button key={f.k} className={filtre === f.k ? 'on' : ''} onClick={() => setFiltre(f.k)}>{f.label}<b>{nb[f.k]}</b></button>)}</div>
        </div>

        {errProp && <div className="ne-err">{errProp}</div>}
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
                    <StatutPicker value={l.statut} onChange={v => updateStatut(l.id, v)} style={{ padding: '5px 9px 5px 12px', fontSize: 12.5 }}/>
                    {isDirector ? (
                      <ConseillerPicker value={l.agent_commercial_id} onChange={id => assignLead(l.id, id)} villeLead={l.identite?.ville || l.ville} montant={l.montant_demande} nomSecours={l.agent_commercial_id ? nomAgent(l.agent_commercial_id) : undefined}/>
                    ) : <span className="bk-ag-txt">{l.agent_commercial_id ? nomAgent(l.agent_commercial_id) : 'Sans conseiller'}</span>}
                  </span>
                  <span className="bk-amt"><b>{montantComplet(l.montant_demande)}</b><small>{dateRelative(l.created_at, now)}</small></span>
                  <span className="ne-offre-c">
                    {o.key !== 'repasser' && packs[l.id] ? (
                      <span className={`ne-pk ${packs[l.id]!.statut}`} title={`Souscription ${packs[l.id]!.reference}`}><FileBadge size={13}/>{packs[l.id]!.statut === 'en_attente_paiement' ? `Souscrit · ${packs[l.id]!.reference}` : libelleStatutPack(packs[l.id]!.statut)}</span>
                    ) : proposes[l.id] === 'ok' ? (
                      <span className="ne-pk prop"><Check size={13} strokeWidth={2.6}/>Pack proposé</span>
                    ) : (
                      <button className={`ne-offre ${o.key}`} disabled={proposes[l.id] === 'envoi'} onClick={() => proposer(l)} title={o.key === 'repasser' ? 'Passer le statut à Éligible' : 'Envoie la proposition dans la discussion de son espace client'}>
                        {o.key === 'repasser' ? <RefreshCw size={14}/> : <Send size={13}/>}{proposes[l.id] === 'envoi' ? 'Envoi…' : o.key === 'repasser' ? o.label : 'Proposer le pack'}
                      </button>
                    )}
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


const NE_CSS = `
  .ne-pk { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; padding: 7px 12px; border-radius: 999px; white-space: nowrap; }
  .ne-pk.en_attente_paiement { background: #FFF1E0; color: #D9690B; } .ne-pk.paye { background: #EAF1FF; color: #1A6BFF; } .ne-pk.termine, .ne-pk.prop { background: #E8F8EE; color: #16A34A; }
  .ne-err { background: #FDECEC; color: #B42318; border-radius: 10px; padding: 8px 11px; font-size: 13px; margin-bottom: 10px; }

  .bk.ne .bk-hd, .bk.ne .bk-row { grid-template-columns: minmax(0, 1fr) 150px 160px 130px 180px 104px; }
  .ne-why { display: inline-flex; align-items: center; gap: 5px; justify-self: start; font-size: 12px; font-weight: 700; padding: 4px 9px; border-radius: 8px; white-space: nowrap; }
  .ne-why.rccm { background: #FFF1E0; color: #D9690B; } .ne-why.score { background: #FEE2E2; color: #991B1B; }
  .ne-why.pack { background: #DCFCE7; color: #166534; } .ne-why.marque { background: #F1F5F9; color: #475569; }
  .ne-st { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; min-width: 0; }
  .ne-st .ns-compact { max-width: 100%; font-size: 12px !important; font-weight: 700; }
  .ne-offre-c { display: flex; min-width: 0; }
  .ne-offre { display: inline-flex; align-items: center; gap: 6px; border: none; border-radius: 999px; padding: 8px 13px; font-family: inherit; font-size: 12.5px !important; line-height: 1.2; font-weight: 700; cursor: pointer; white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
  .ne-offre.pack_formalisation { background: #1A6BFF; color: #fff; } .ne-offre:disabled { opacity: .6; cursor: default; }
  .ne-offre.repasser { background: #F1F5F9; color: #334155; }
  @media (max-width: 1100px) {
    .bk.ne .bk-row { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); grid-template-areas: "who who" "why amt" "st st" "offre qa"; }
    .bk.ne .bk-who { grid-area: who; } .ne-why { grid-area: why; } .bk.ne .bk-amt { grid-area: amt; align-items: flex-end; }
    .ne-st { grid-area: st; flex-direction: row; flex-wrap: wrap; } .ne-offre-c { grid-area: offre; } .bk.ne .bk-qa { grid-area: qa; }
  }
`
