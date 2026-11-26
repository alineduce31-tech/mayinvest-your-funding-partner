import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Phone, MessageCircle, FileText, UserPlus, X, User, Building2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import NiceSelect from '@/components/NiceSelect'
import CallButton from '@/components/CallButton'
import { BK_CSS } from '@/components/BancarisationView'
import { LIFECYCLE_STATUTS, STATUT_COLORS } from '@/lib/lead-templates'
import { nomLead, estPme } from '@/lib/bancarisation'
import { montantComplet, dateRelative, tonScore, initialesNom, couleurAvatar } from '@/lib/affichage'

/** Liste du CRM : une ligne par lead, statut et conseiller modifiables, sélection pour agir en lot. */
export default function CrmListe({ leads, msgCounts, onOpen, updateStatut, assignLead, teamMembers, isDirector }: {
  leads: any[]; msgCounts: Record<string, number>; onOpen: (l: any) => void
  updateStatut: (id: string, s: string) => void; assignLead: (id: string, agent: string | null) => void
  teamMembers: any[]; isDirector: boolean
}) {
  const navigate = useNavigate()
  const now = Date.now()
  const [choix, setChoix] = useState<Set<string>>(new Set())
  const [equipe, setEquipe] = useState<{ id: string; nom: string }[]>([])
  useEffect(() => {
    if (!isDirector) return
    supabase.rpc('admin_team_threads').then(({ data }) => {
      if (data) setEquipe((data as any[]).map(t => ({ id: t.commercial_id, nom: t.nom || 'Commercial' })))
    })
  }, [isDirector])
  // On oublie les lignes sélectionnées qui ne sont plus affichées (filtre changé).
  const visibles = useMemo(() => new Set(leads.map(l => l.id)), [leads])
  const selection = [...choix].filter(id => visibles.has(id))

  const nomAgent = (id: string) => {
    const c = equipe.find(x => x.id === id)
    if (c) return c.nom
    const m = (teamMembers || []).find((x: any) => x.id === id)
    if (m) return `${m.prenom || ''} ${m.nom || ''}`.trim() || String(m.email || '').split('@')[0] || 'Conseiller'
    return 'Conseiller'
  }
  const optionsAgents = (courant?: string) => [
    ...(courant && !equipe.some(m => m.id === courant) ? [{ value: courant, label: nomAgent(courant) }] : []),
    ...equipe.map(m => ({ value: m.id, label: m.nom })),
  ]
  const basculer = (id: string) => setChoix(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const tout = selection.length > 0 && selection.length === leads.length
  const toutBasculer = () => setChoix(tout ? new Set() : new Set(leads.map(l => l.id)))
  const assignerLot = async (agent: string) => { for (const id of selection) await assignLead(id, agent || null); setChoix(new Set()) }
  const statutLot = async (s: string) => { for (const id of selection) await updateStatut(id, s); setChoix(new Set()) }

  return (
    <div className={`bk cr ${isDirector ? 'dir' : ''}`}>
      <style>{BK_CSS + CR_CSS}</style>
      <div className="bk-card">
        {isDirector && selection.length > 0 && (
          <div className="cr-lot" role="region" aria-label="Actions sur la sélection">
            <span className="cr-lot-n">{selection.length} sélectionné{selection.length > 1 ? 's' : ''}</span>
            <NiceSelect variant="compact" value="" onChange={assignerLot} title="Assigner la sélection" ariaLabel="Assigner la sélection" className="cr-lot-sel"
              placeholder="Assigner à…" options={[{ value: '', label: 'Assigner à…', icon: <UserPlus size={14}/> }, ...optionsAgents()]}/>
            <NiceSelect variant="compact" value="" onChange={v => v && statutLot(v)} title="Changer le statut de la sélection" ariaLabel="Changer le statut" className="cr-lot-sel"
              placeholder="Changer le statut" options={[{ value: '', label: 'Changer le statut' }, ...LIFECYCLE_STATUTS.map(s => ({ value: s, label: s }))]}/>
            <button className="cr-lot-x" onClick={() => setChoix(new Set())} aria-label="Annuler la sélection"><X size={15}/></button>
          </div>
        )}
        <div className="bk-hd">
          {isDirector && <label className="cr-ck"><input type="checkbox" checked={tout} onChange={toutBasculer} aria-label="Tout sélectionner"/></label>}
          <span>Lead</span><span>Score</span><span>Statut</span><span>{isDirector ? 'Conseiller' : ''}</span><span className="r">Montant</span><span/>
        </div>
        {leads.map(l => {
          const nom = nomLead(l)
          const av = couleurAvatar(nom)
          const c = STATUT_COLORS[l.statut] || { bg: '#F1F5F9', fg: '#475569' }
          const tel = l.identite?.tel || l.identite?.telephone
          const pme = estPme(l)
          const meta = [l.activite, l.identite?.ville || l.ville].filter(Boolean).join(' · ')
          const nonLus = msgCounts[l.id] || 0
          return (
            <div key={l.id} className={`bk-row ${choix.has(l.id) ? 'on' : ''}`}>
              {isDirector && <label className="cr-ck"><input type="checkbox" checked={choix.has(l.id)} onChange={() => basculer(l.id)} aria-label={`Sélectionner ${nom}`}/></label>}
              <button className="bk-who" onClick={() => onOpen(l)}>
                <span className="bk-av" style={{ background: av.fond, color: av.texte }}>{initialesNom(nom)}</span>
                <span className="bk-nm"><b>{nom}</b><small>{pme ? <Building2 size={12}/> : <User size={12}/>} {pme ? 'PME' : 'Particulier'}{meta ? ` · ${meta}` : ''}</small></span>
              </button>
              <span className={`bk-ring ${tonScore(l.score)}`} title="Score sur 100">{l.score ?? '—'}</span>
              <span className="bk-cell">
                <NiceSelect variant="compact" value={l.statut} onChange={v => updateStatut(l.id, v)} title="Changer le statut" ariaLabel="Changer le statut"
                  style={{ background: c.bg, color: c.fg, border: 'none', borderRadius: 999, padding: '5px 9px 5px 12px', fontSize: 12.5 }}
                  options={LIFECYCLE_STATUTS.map(s => ({ value: s, label: s }))}/>
              </span>
              <span className="bk-cell">
                {isDirector ? (
                  <NiceSelect variant="compact" value={l.agent_commercial_id || ''} onChange={v => assignLead(l.id, v || null)} title="Assigner ce lead" ariaLabel="Conseiller"
                    className={l.agent_commercial_id ? 'bk-ag' : 'bk-ag vide'}
                    options={[{ value: '', label: 'À assigner', icon: <UserPlus size={14}/> }, ...optionsAgents(l.agent_commercial_id)]}/>
                ) : null}
              </span>
              <span className="bk-amt"><b>{montantComplet(l.montant_demande)}</b><small>{dateRelative(l.created_at, now)}</small></span>
              <span className="bk-qa">
                {tel && <CallButton tel={tel} nom={nom} leadId={l.id} className="bk-q call" title="Appeler"><Phone size={14}/></CallButton>}
                <button className="bk-q msg cr-msg" title="Conversation" aria-label="Ouvrir la conversation" onClick={() => navigate({ to: '/messagerie', search: { lead: l.id } as any })}>
                  <MessageCircle size={14}/>{nonLus > 0 && <i>{nonLus}</i>}
                </button>
                <button className="bk-q fiche" title="Fiche" aria-label="Ouvrir la fiche" onClick={() => onOpen(l)}><FileText size={14}/></button>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const CR_CSS = `
  .cr .bk-card { padding: 8px 12px 12px; }
  .cr .bk-hd, .cr .bk-row { grid-template-columns: minmax(0, 1fr) 44px 160px 170px 140px 104px; }
  .cr.dir .bk-hd, .cr.dir .bk-row { grid-template-columns: 20px minmax(0, 1fr) 44px 160px 170px 140px 104px; }
  .cr .bk-hd { padding-top: 10px; }
  .cr .bk-row.on { background: #F2F7FF; }
  .cr .bk-nm small { display: flex; align-items: center; gap: 4px; }
  .cr-ck { display: flex; align-items: center; justify-content: center; cursor: pointer; }
  .cr-ck input { width: 16px; height: 16px; accent-color: #1A6BFF; cursor: pointer; margin: 0; }
  .cr-msg { position: relative; }
  .cr-msg i { position: absolute; top: -4px; right: -4px; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; background: #1A6BFF; color: #fff; font-size: 10px; font-style: normal; font-weight: 700; display: flex; align-items: center; justify-content: center; }
  .cr-lot { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; background: #0D1B3E; color: #fff; border-radius: 12px; padding: 8px 10px 8px 14px; margin: 4px 0 8px; }
  .cr-lot-n { font-size: 13px; font-weight: 600; margin-right: auto; }
  .cr-lot .cr-lot-sel { background: rgba(255,255,255,.12) !important; color: #fff !important; border: none !important; border-radius: 999px !important; font-size: 12.5px !important; }
  .cr-lot-x { width: 28px; height: 28px; border-radius: 50%; border: none; background: rgba(255,255,255,.12); color: #fff; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
  @media (max-width: 1100px) { .cr-ck { display: none; } .cr.dir .bk-row { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; } }
`
