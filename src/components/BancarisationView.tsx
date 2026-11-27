import { useEffect, useMemo, useState } from 'react'
import { useBarreFigee } from '@/hooks/useBarreFigee'
import { supabase } from '@/integrations/supabase/client'
import StatutPicker from '@/components/StatutPicker'
import { useNavigate } from '@tanstack/react-router'
import { Search, Phone, MessageCircle, FileText, UserPlus, Landmark, Wallet, UserX, PhoneCall } from 'lucide-react'
import NiceSelect from '@/components/NiceSelect'
import ConseillerPicker from '@/components/ConseillerPicker'
import CallButton from '@/components/CallButton'
import { LIFECYCLE_STATUTS, STATUT_COLORS } from '@/lib/lead-templates'
import { estABancariser, chiffresB, compteFiltres, listeB, nomLead, estClos, estPme, type FiltreB, type LeadB } from '@/lib/bancarisation'
import { montantComplet, dateRelative, tonScore, initialesNom, couleurAvatar } from '@/lib/affichage'

const FILTRES: { k: FiltreB; label: string }[] = [
  { k: 'tous', label: 'Tous' }, { k: 'nouveaux', label: 'Nouveaux' }, { k: 'contactes', label: 'Contactés' },
  { k: 'sans_conseiller', label: 'Sans conseiller' }, { k: 'pme', label: 'PME' },
]

export default function BancarisationView({ leads, onOpen, updateStatut, assignLead, teamMembers, isDirector }: {
  leads: any[]; onOpen: (l: any) => void; updateStatut: (id: string, s: string) => void
  assignLead: (id: string, agent: string | null) => void; teamMembers: any[]; isDirector: boolean
}) {
  const fige = useBarreFigee()
  const navigate = useNavigate()
  const [filtre, setFiltre] = useState<FiltreB>('tous')
  const [q, setQ] = useState('')
  const now = Date.now()
  const base = useMemo(() => (leads as LeadB[]).filter(estABancariser), [leads])
  const ch = chiffresB(base, now)
  const nb = compteFiltres(base)
  const liste = listeB(base, filtre, q)
  const [equipe, setEquipe] = useState<{ id: string; nom: string }[]>([])
  useEffect(() => {
    supabase.rpc('admin_team_threads').then(({ data }) => {
      if (data) setEquipe((data as any[]).map(t => ({ id: t.commercial_id, nom: t.nom || 'Commercial' })))
    })
  }, [])
  const nomAgent = (id: string) => {
    const c = equipe.find(x => x.id === id)
    if (c) return c.nom
    const m = (teamMembers || []).find((x: any) => x.id === id)
    if (m) return `${m.prenom || ''} ${m.nom || ''}`.trim() || String(m.email || '').split('@')[0] || 'Conseiller'
    return 'Conseiller assigné'
  }

  return (
    <div className="bk">
      <style>{BK_CSS}</style>
      <p className="bk-sub">Prospects sans compte bancaire ou sans salaire domicilié, à accompagner vers l'ouverture d'un compte.</p>
      <div className="bk-kpis">
        <div className="bk-k"><i className="bk-ic b"><Landmark size={16} strokeWidth={1.8}/></i><small>À bancariser</small><b>{ch.aBancariser}</b><span>dont {ch.cetteSemaine} cette semaine</span></div>
        <div className="bk-k"><i className="bk-ic n"><Wallet size={16} strokeWidth={1.8}/></i><small>Montant en jeu</small><b>{montantComplet(ch.montant).replace('—', '0 XAF')}</b><span>demandés au total</span></div>
        <div className={`bk-k ${ch.sansConseiller ? 'warn' : ''}`}><i className={`bk-ic ${ch.sansConseiller ? 'o' : 'b'}`}><UserX size={16} strokeWidth={1.8}/></i><small>Sans conseiller</small><b>{ch.sansConseiller}</b><span>{ch.sansConseiller ? 'à assigner' : 'tout le monde est suivi'}</span></div>
        <div className="bk-k ok"><i className="bk-ic g"><PhoneCall size={16} strokeWidth={1.8}/></i><small>Contactés</small><b>{ch.contactes}</b><span>{ch.bancarises} déjà bancarisé{ch.bancarises > 1 ? 's' : ''}</span></div>
      </div>

      <div className="bk-card">
        <div ref={fige.repere} className="barre-repere" aria-hidden="true"/>
        <div ref={fige.barre} style={fige.style} className={`bk-tb ${fige.classe}`}>
          <label className="bk-srch"><Search size={15}/><input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un prospect, une ville…" aria-label="Rechercher"/></label>
          <div className="bk-chips">
            {FILTRES.map(f => <button key={f.k} className={filtre === f.k ? 'on' : ''} onClick={() => setFiltre(f.k)}>{f.label}<b>{nb[f.k]}</b></button>)}
          </div>
        </div>

        {liste.length === 0 ? (
          <div className="bk-vide"><span><Landmark size={22}/></span><b>{base.length ? 'Aucun prospect pour ce filtre' : 'Aucun prospect à bancariser'}</b><small>Les prospects sans banque ou sans salaire domicilié apparaissent ici.</small></div>
        ) : (
          <>
            <div className="bk-hd"><span>Prospect</span><span>Score</span><span>Statut</span><span>Conseiller</span><span className="r">Montant</span><span/></div>
            {liste.map(l => {
              const nom = nomLead(l)
              const av = couleurAvatar(nom)
              const c = STATUT_COLORS[l.statut] || { bg: '#F1F5F9', fg: '#475569' }
              const tel = l.identite?.tel || l.identite?.telephone
              const meta = [estPme(l) ? 'PME' : 'Particulier', l.activite, l.identite?.ville || l.ville].filter(Boolean).join(' · ')
              return (
                <div key={l.id} className={`bk-row ${estClos(l.statut) ? 'clos' : ''}`}>
                  <button className="bk-who" onClick={() => onOpen(l)}>
                    <span className="bk-av" style={{ background: av.fond, color: av.texte }}>{initialesNom(nom)}</span>
                    <span className="bk-nm"><b>{nom}</b><small>{meta}</small></span>
                  </button>
                  <span className={`bk-ring ${tonScore((l as any).score)}`} title="Score sur 100">{(l as any).score || '—'}</span>
                  <span className="bk-cell">
                    <StatutPicker value={l.statut} onChange={v => updateStatut(l.id, v)} style={{ padding: '5px 9px 5px 12px', fontSize: 12.5 }}/>
                  </span>
                  <span className="bk-cell">
                    {isDirector ? (
                      <ConseillerPicker value={l.agent_commercial_id} onChange={id => assignLead(l.id, id)} villeLead={l.identite?.ville || l.ville} montant={l.montant_demande} nomSecours={l.agent_commercial_id ? nomAgent(l.agent_commercial_id) : undefined}/>
                    ) : <span className="bk-ag-txt">{l.agent_commercial_id ? nomAgent(l.agent_commercial_id) : '—'}</span>}
                  </span>
                  <span className="bk-amt"><b>{montantComplet(l.montant_demande)}</b><small>{dateRelative(l.created_at, now)}</small></span>
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

export const BK_CSS = `
  .bk { display: flex; flex-direction: column; gap: 14px; color: #1D1D1F; font-family: -apple-system, "SF Pro Text", Inter, system-ui, sans-serif; }
  .bk-sub { margin: -6px 0 2px; font-size: 13px; color: #86868B; }
  .bk-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
  .bk-k { background: #fff; border-radius: 18px; padding: 16px 18px; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
  .bk-ic { width: 32px; height: 32px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px; font-style: normal; }
  .bk-ic.b { background: #EAF1FF; color: #1A6BFF; } .bk-ic.o { background: #FFF1E0; color: #D9690B; } .bk-ic.g { background: #E8F8EE; color: #16A34A; } .bk-ic.n { background: #EDEFF4; color: #0D1B3E; } .bk-ic.r { background: #FDECEC; color: #DC2626; }
  .bk-k small { display: block; font-size: 13px; color: #86868B; font-weight: 500; }
  .bk-k b { display: block; font-size: 28px; font-weight: 700; letter-spacing: -0.03em; margin: 2px 0; color: #1D1D1F; }
  .bk-k span { font-size: 12px; color: #86868B; }
  .bk-k.warn b { color: #D9690B; }
  .bk-k.ok b { color: #16A34A; }
  .bk-card { background: #fff; border-radius: 18px; padding: 16px; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
  .bk-tb { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 12px; }
  .bk-srch { flex: 1; min-width: 200px; display: flex; align-items: center; gap: 8px; background: #F5F5F7; border-radius: 999px; padding: 0 14px; color: #94A3B8; }
  .bk-srch input { flex: 1; border: none; background: transparent; outline: none; font-family: inherit; font-size: 13.5px; padding: 10px 0; color: #0D1B3E; }
  .bk-chips { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
  .bk-chips button { flex: none; border: none; background: #F5F5F7; border-radius: 999px; padding: 7px 12px; font-family: inherit; font-size: 12.5px; font-weight: 500; color: #3A3A3C; cursor: pointer; white-space: nowrap; }
  .bk-chips button { font-size: 12.5px !important; }
  .bk-chips button b { font-weight: 600; opacity: .6; margin-left: 5px; }
  .bk-chips button.on { background: #0D1B3E; color: #fff; border-color: #0D1B3E; }
  .bk-hd, .bk-row { display: grid; grid-template-columns: minmax(0, 1fr) 44px 160px 160px 130px 104px; gap: 14px; align-items: center; }
  .bk-hd { padding: 0 12px 8px; font-size: 11px; font-weight: 500; color: #86868B; border-bottom: 1px solid #F0F0F2; }
  .bk-hd .r { text-align: right; }
  .bk-row { padding: 10px 12px; border-radius: 14px; transition: background .12s; }
  .bk-row + .bk-row { border-top: 1px solid #F0F2F7; }
  .bk-row:hover { background: #F8FAFC; }
  .bk-row.clos { opacity: .55; }
  .bk-who { display: flex; align-items: center; gap: 12px; min-width: 0; border: none; background: none; padding: 0; text-align: left; font-family: inherit; cursor: pointer; color: inherit; }
  .bk-av { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12.5px; font-weight: 800; flex: none; }
  .bk-nm { min-width: 0; display: flex; flex-direction: column; }
  .bk-nm b { font-size: 14px; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bk-nm small { font-size: 12px; color: #8A94A6; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bk-ring { width: 38px; height: 38px; border-radius: 50%; border: 3px solid #E5E7EB; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; }
  .bk-ring.vert { border-color: #22C55E; } .bk-ring.orange { border-color: #FBBF24; } .bk-ring.rouge { border-color: #F87171; } .bk-ring.aucun { color: #94A3B8; }
  .bk-cell { min-width: 0; display: flex; }
  .bk-cell .ns-compact { max-width: 100%; text-transform: none; font-size: 12.5px !important; font-weight: 700; letter-spacing: 0; }
  .bk-ag { background: #ECFDF5 !important; color: #047857 !important; border: none !important; border-radius: 999px !important; }
  .bk-ag.vide { background: #fff !important; color: #D9690B !important; border: 1.5px dashed #FCD34D !important; }
  .bk-ag-txt { font-size: 12.5px; color: #475569; }
  .bk-amt { display: flex; flex-direction: column; align-items: flex-end; }
  .bk-amt b { font-size: 13.5px; font-weight: 800; white-space: nowrap; } .bk-amt small { font-size: 11.5px; color: #94A3B8; }
  .bk-qa { display: flex; gap: 6px; justify-content: flex-end; }
  .bk-q { width: 30px; height: 30px; border-radius: 50%; border: none; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; text-decoration: none; }
  .bk-q.call { background: #E8F8EE; color: #16A34A; } .bk-q.msg { background: #EEF4FF; color: #1A6BFF; } .bk-q.fiche { background: #F1F5F9; color: #475569; }
  .bk-vide { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 40px 16px; text-align: center; }
  .bk-vide span { width: 52px; height: 52px; border-radius: 16px; background: #EEF4FF; color: #1A6BFF; display: flex; align-items: center; justify-content: center; }
  .bk-vide b { font-size: 15px; } .bk-vide small { font-size: 12.5px; color: #8A94A6; max-width: 340px; }
  @media (max-width: 1100px) {
    .bk-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .bk-hd { display: none; }
    .bk-row { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; grid-template-areas: "who who ring" "st ag ag" "amt qa qa"; row-gap: 10px; column-gap: 10px; border: 1px solid #EEF1F6; border-radius: 16px; margin-bottom: 10px; }
    .bk-row + .bk-row { border-top: 1px solid #EEF1F6; }
    .bk-who { grid-area: who; } .bk-ring { grid-area: ring; justify-self: end; }
    .bk-cell:nth-of-type(1) { grid-area: st; }
    .bk-row > .bk-cell + .bk-cell { grid-area: ag; justify-content: flex-end; }
    .bk-amt { grid-area: amt; align-items: flex-start; } .bk-qa { grid-area: qa; }
  }
`
