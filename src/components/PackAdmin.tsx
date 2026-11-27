import { useEffect, useMemo, useState } from 'react'
import { useBarreFigee } from '@/hooks/useBarreFigee'
import { createPortal } from 'react-dom'
import { Search, Wallet, Clock, CircleCheck, FileBadge, Check, X, Receipt, MessageCircle } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { supabase } from '@/integrations/supabase/client'
import { BK_CSS } from '@/components/BancarisationView'
import { initialesNom, couleurAvatar, dateRelative } from '@/lib/affichage'
import { ETAPES_PACK, MODES_PAIEMENT, PRIX_PACK, chiffresPacks, estPaye, libelleMode, libelleStatutPack, verifPaiement, type EtapePack, type ModePaiement, type Pack } from '@/lib/pack'

const xaf = (n: number) => new Intl.NumberFormat('fr-FR').format(n).replace(/[  ]/g, ' ') + ' XAF'
const dateCourte = (d?: string | null) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

/* ============================================================
 * Fenêtre « Confirmer le paiement » (directeur ou opérateur)
 * ============================================================ */
export function ConfirmerPaiement({ pack, nom, onClose, onDone }: { pack: Pack; nom: string; onClose: () => void; onDone: (p: Pack) => void }) {
  const [mode, setMode] = useState<ModePaiement | ''>('')
  const [montant, setMontant] = useState(String(pack.montant || PRIX_PACK))
  const [recu, setRecu] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  async function valider() {
    const e = verifPaiement({ mode, montant, recu })
    if (e) { setErr(e); return }
    setBusy(true); setErr('')
    const { data, error } = await supabase.rpc('admin_pack_confirmer_paiement', { p_id: pack.id, p_mode: mode, p_montant: Number(montant.replace(/\D/g, '')), p_recu: recu.trim() })
    setBusy(false)
    if (error) { setErr(error.message); return }
    onDone(data as Pack)
  }

  return createPortal(
    <div className="pa-ovr" onClick={onClose}>
      <style>{PA_CSS}</style>
      <div className="pa-mod" role="dialog" aria-modal="true" aria-label="Confirmer le paiement" onClick={e => e.stopPropagation()}>
        <div className="pa-mh">
          <div><b>{nom}</b><small>{pack.reference} · souscrit le {dateCourte(pack.created_at)}</small></div>
          <button className="pa-x" onClick={onClose} aria-label="Fermer"><X size={16}/></button>
        </div>
        <div className="pa-mb">
          <label className="pa-l">Mode de paiement</label>
          <div className="pa-seg">{MODES_PAIEMENT.map(m => <button key={m.k} type="button" className={mode === m.k ? 'on' : ''} onClick={() => { setMode(m.k); setErr('') }}>{m.label}</button>)}</div>
          <label className="pa-l" htmlFor="pa-mt">Montant reçu (XAF)</label>
          <input id="pa-mt" className="pa-in" inputMode="numeric" value={montant} onChange={e => { setMontant(e.target.value.replace(/[^\d\s]/g, '')); setErr('') }}/>
          <label className="pa-l" htmlFor="pa-rc">N° de reçu</label>
          <input id="pa-rc" className="pa-in" value={recu} maxLength={60} placeholder="REC-2026-0142" onChange={e => { setRecu(e.target.value); setErr('') }}/>
          {err && <div className="pa-err">{err}</div>}
          <button className="pa-ok" onClick={valider} disabled={busy}>{busy ? 'Confirmation…' : 'Confirmer le paiement'}</button>
          <p className="pa-note">Le client est prévenu dans sa discussion et le dossier passe à « Pack Formalisation Vendu ». Cette confirmation est enregistrée à votre nom.</p>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/* ============================================================
 * Suivi du pack dans une fiche (admin) ou une discussion (conseiller)
 * ============================================================ */
export function PackSuivi({ leadId, nom, peutConfirmer = false, peutCocher = true, onChange }: { leadId: string; nom: string; peutConfirmer?: boolean; peutCocher?: boolean; onChange?: () => void }) {
  const [pack, setPack] = useState<Pack | null>(null)
  const [confirmer, setConfirmer] = useState(false)
  const [err, setErr] = useState('')
  const [enCours, setEnCours] = useState<string | null>(null)

  useEffect(() => {
    let vivant = true
    setPack(null)
    supabase.rpc('lead_pack', { p_lead_id: leadId }).then(({ data }) => { if (vivant) setPack((data as Pack) || null) })
    return () => { vivant = false }
  }, [leadId])

  async function cocher(k: EtapePack, fait: boolean) {
    if (!pack) return
    setEnCours(k); setErr('')
    const { data, error } = await supabase.rpc('pack_maj_etape', { p_id: pack.id, p_etape: k, p_fait: fait })
    setEnCours(null)
    if (error) { setErr(error.message); return }
    setPack(data as Pack); onChange?.()
  }

  if (!pack) return null
  const paye = estPaye(pack)
  return (
    <div className="ps">
      <style>{PA_CSS}</style>
      <div className="ps-h">
        <span className="ps-ic"><FileBadge size={16}/></span>
        <div><b>Pack formalisation</b><small>{pack.reference} · souscrit le {dateCourte(pack.created_at)}</small></div>
        <span className={`pa-st ${pack.statut}`}>{libelleStatutPack(pack.statut)}</span>
      </div>
      {!paye ? (
        <div className="ps-pay">
          <span>Le client doit régler {xaf(pack.montant || PRIX_PACK)} chez Mayinvest.</span>
          {peutConfirmer && <button className="pa-ok sm" onClick={() => setConfirmer(true)}><Receipt size={14}/>Confirmer le paiement</button>}
        </div>
      ) : (
        <div className="ps-recu">
          <span>Payé {pack.paiement_montant ? xaf(pack.paiement_montant) : ''} · {libelleMode(pack.paiement_mode)}{pack.recu_numero ? ` · reçu ${pack.recu_numero}` : ''}</span>
          <small>Confirmé le {dateCourte(pack.confirme_at)}{pack.confirme_par_nom ? ` par ${pack.confirme_par_nom}` : ''}</small>
        </div>
      )}
      <div className="ps-et">
        {ETAPES_PACK.map(e => {
          const fait = paye && !!pack.etapes?.[e.k]
          const actif = paye && peutCocher
          return (
            <button key={e.k} type="button" className={`ps-e ${fait ? 'ok' : ''}`} disabled={!actif || enCours === e.k} onClick={() => cocher(e.k, !fait)} title={paye ? (fait ? 'Marquer comme non fait' : 'Marquer comme fait') : 'Disponible après confirmation du paiement'}>
              <span className="ps-cb">{fait && <Check size={12} strokeWidth={3}/>}</span>
              <span>{e.label}</span>
              {fait && <small>{dateCourte(pack.etapes[e.k])}</small>}
            </button>
          )
        })}
      </div>
      {!paye && <p className="ps-note">Les étapes se débloquent une fois le paiement confirmé.</p>}
      {err && <div className="pa-err">{err}</div>}
      {confirmer && <ConfirmerPaiement pack={pack} nom={nom} onClose={() => setConfirmer(false)} onDone={p => { setPack(p); setConfirmer(false); onChange?.() }}/>}
    </div>
  )
}

/* ============================================================
 * Page admin « Packs »
 * ============================================================ */
type FiltrePack = 'attente' | 'cours' | 'termine' | 'tous'
const FILTRES: { k: FiltrePack; label: string }[] = [
  { k: 'attente', label: 'À encaisser' },
  { k: 'cours', label: 'En cours' },
  { k: 'termine', label: 'Terminés' },
  { k: 'tous', label: 'Tous' },
]

export default function PacksView({ leads, onOpen, peutConfirmer, onChange }: { leads: any[]; onOpen: (l: any) => void; peutConfirmer: boolean; onChange: () => void }) {
  const fige = useBarreFigee()
  const navigate = useNavigate()
  const [packs, setPacks] = useState<Pack[] | null>(null)
  const [err, setErr] = useState('')
  const [filtre, setFiltre] = useState<FiltrePack>('attente')
  const [q, setQ] = useState('')
  const [aConfirmer, setAConfirmer] = useState<Pack | null>(null)

  async function charger() {
    const { data, error } = await supabase.rpc('admin_packs')
    if (error) { setErr(error.message); setPacks([]); return }
    setPacks((data as Pack[]) || [])
  }
  useEffect(() => { charger() }, [])

  const liste = packs || []
  const ch = chiffresPacks(liste)
  const nb: Record<FiltrePack, number> = {
    attente: ch.aEncaisser, cours: ch.enCours, termine: ch.termines, tous: liste.length,
  }
  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase()
    return liste.filter(p => {
      if (filtre === 'attente' && p.statut !== 'en_attente_paiement') return false
      if (filtre === 'cours' && p.statut !== 'paye') return false
      if (filtre === 'termine' && p.statut !== 'termine') return false
      if (!t) return true
      return [p.lead_nom, p.raison_sociale, p.reference, p.ville, p.recu_numero].filter(Boolean).join(' ').toLowerCase().includes(t)
    })
  }, [liste, filtre, q])

  const ouvrir = (p: Pack) => { const l = leads.find(x => x.id === p.lead_id); if (l) onOpen(l) }
  const now = Date.now()

  return (
    <div className="bk pa">
      <style>{BK_CSS + PA_CSS}</style>
      <p className="bk-sub">Souscriptions au Pack formalisation : confirmez les paiements reçus chez Mayinvest, puis suivez les démarches.</p>
      <div className="bk-kpis">
        <div className="bk-k warn"><i className="bk-ic o"><Clock size={16} strokeWidth={1.8}/></i><small>À encaisser</small><b>{ch.aEncaisser}</b><span>{xaf(ch.montantAEncaisser)} attendus</span></div>
        <div className="bk-k ok"><i className="bk-ic g"><Wallet size={16} strokeWidth={1.8}/></i><small>Encaissé</small><b>{xaf(ch.encaisse)}</b><span>{ch.payes} pack{ch.payes > 1 ? 's' : ''} payé{ch.payes > 1 ? 's' : ''}</span></div>
        <div className="bk-k"><i className="bk-ic b"><FileBadge size={16} strokeWidth={1.8}/></i><small>Démarches en cours</small><b>{ch.enCours}</b><span>RCCM, NIU, compte</span></div>
        <div className="bk-k"><i className="bk-ic n"><CircleCheck size={16} strokeWidth={1.8}/></i><small>Terminés</small><b>{ch.termines}</b><span>dossiers devenus éligibles</span></div>
      </div>

      <div className="bk-card">
        <div ref={fige.repere} className="barre-repere" aria-hidden="true"/>
        <div ref={fige.barre} style={fige.style} className={`bk-tb ${fige.classe}`}>
          <label className="bk-srch"><Search size={15}/><input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un nom, une référence, un reçu…" aria-label="Rechercher"/></label>
          <div className="bk-chips">{FILTRES.map(f => <button key={f.k} className={filtre === f.k ? 'on' : ''} onClick={() => setFiltre(f.k)}>{f.label}<b>{nb[f.k]}</b></button>)}</div>
        </div>
        {err && <div className="pa-err" style={{ marginBottom: 10 }}>{err}</div>}

        {packs === null ? <div className="bk-vide"><small>Chargement…</small></div> : visibles.length === 0 ? (
          <div className="bk-vide"><span><FileBadge size={22}/></span><b>{liste.length ? 'Aucune souscription pour ce filtre' : 'Aucune souscription pour l\'instant'}</b><small>Quand un client clique sur « Je souscris » dans son espace, il apparaît ici avec sa référence.</small></div>
        ) : <>
          <div className="bk-hd"><span>Client</span><span>Référence</span><span>Statut</span><span className="r">Paiement</span><span>Action</span><span/></div>
          {visibles.map(p => {
            const nom = p.raison_sociale || p.lead_nom || 'Client'
            const av = couleurAvatar(nom)
            const faites = ETAPES_PACK.filter(e => p.etapes?.[e.k]).length
            const meta = [p.ville, p.conseiller_nom ? `Conseiller : ${p.conseiller_nom}` : 'Sans conseiller'].filter(Boolean).join(' · ')
            return (
              <div key={p.id} className="bk-row">
                <button className="bk-who" onClick={() => ouvrir(p)}>
                  <span className="bk-av" style={{ background: av.fond, color: av.texte }}>{initialesNom(nom)}</span>
                  <span className="bk-nm"><b>{nom}</b><small>{meta}</small></span>
                </button>
                <span className="pa-ref">{p.reference}<small>{dateRelative(p.created_at, now)}</small></span>
                <span><span className={`pa-st ${p.statut}`}>{libelleStatutPack(p.statut)}</span></span>
                <span className="bk-amt">{estPaye(p) ? <><b>{xaf(p.paiement_montant || 0)}</b><small>{libelleMode(p.paiement_mode)}{p.recu_numero ? ` · ${p.recu_numero}` : ''}</small></> : <><b>{xaf(p.montant || PRIX_PACK)}</b><small>attendu</small></>}</span>
                <span className="pa-act">
                  {p.statut === 'en_attente_paiement'
                    ? (peutConfirmer ? <button className="pa-ok sm" onClick={() => setAConfirmer(p)}><Receipt size={14}/>Confirmer le paiement</button> : <small>En attente</small>)
                    : <span className="pa-prog"><span className="t"><i style={{ width: `${(faites / ETAPES_PACK.length) * 100}%` }}/></span>{faites}/{ETAPES_PACK.length} étapes</span>}
                </span>
                <span className="bk-qa">
                  <button className="bk-q msg" title="Conversation" aria-label="Ouvrir la conversation" onClick={() => navigate({ to: '/messagerie', search: { lead: p.lead_id } as any })}><MessageCircle size={14}/></button>
                  <button className="bk-q fiche" title="Fiche" aria-label="Ouvrir la fiche" onClick={() => ouvrir(p)}><FileBadge size={14}/></button>
                </span>
              </div>
            )
          })}
        </>}
      </div>

      {aConfirmer && <ConfirmerPaiement pack={aConfirmer} nom={aConfirmer.raison_sociale || aConfirmer.lead_nom || 'Client'} onClose={() => setAConfirmer(null)} onDone={() => { setAConfirmer(null); charger(); onChange() }}/>}
    </div>
  )
}

const PA_CSS = `
  .bk.pa .bk-hd, .bk.pa .bk-row { grid-template-columns: minmax(0, 1fr) 110px 170px 150px 190px 68px; }
  .pa-ref { display: flex; flex-direction: column; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; font-weight: 700; color: #0D1B3E; letter-spacing: .5px; }
  .pa-ref small { font-family: -apple-system, system-ui, sans-serif; font-size: 11.5px; font-weight: 400; color: #94A3B8; letter-spacing: 0; }
  .pa-st { display: inline-block; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 999px; white-space: nowrap; }
  .pa-st.en_attente_paiement { background: #FFF1E0; color: #D9690B; } .pa-st.paye { background: #EAF1FF; color: #1A6BFF; } .pa-st.termine { background: #E8F8EE; color: #16A34A; } .pa-st.annule { background: #F1F5F9; color: #64748B; }
  .pa-act { display: flex; } .pa-act > small { font-size: 12.5px; color: #86868B; }
  .pa-ok { display: inline-flex; align-items: center; justify-content: center; gap: 7px; width: 100%; height: 42px; border: none; border-radius: 999px; background: #0D1B3E; color: #fff; font-family: inherit; font-size: 14px !important; font-weight: 600; cursor: pointer; white-space: nowrap; }
  .pa-ok.sm { width: auto; height: 32px; padding: 0 14px; font-size: 12.5px !important; }
  .pa-ok:disabled { opacity: .6; cursor: default; }
  .pa-prog { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; color: #3A3A3C; white-space: nowrap; }
  .pa-prog .t { width: 64px; height: 6px; border-radius: 6px; background: #F0F0F2; overflow: hidden; } .pa-prog .t i { display: block; height: 100%; background: #1A6BFF; border-radius: 6px; }
  .pa-err { background: #FDECEC; color: #B42318; border-radius: 10px; padding: 8px 11px; font-size: 13px; margin-top: 10px; }
  .pa-ovr { position: fixed; inset: 0; background: rgba(13,27,62,.45); z-index: 400; display: flex; align-items: center; justify-content: center; padding: 16px; font-family: -apple-system, "SF Pro Text", Inter, system-ui, sans-serif; }
  .pa-mod { width: 100%; max-width: 400px; background: #fff; border-radius: 22px; box-shadow: 0 24px 60px rgba(13,27,62,.25); overflow: hidden; color: #1D1D1F; }
  .pa-mh { display: flex; align-items: flex-start; gap: 10px; padding: 18px 18px 6px; }
  .pa-mh > div { flex: 1; display: flex; flex-direction: column; } .pa-mh b { font-size: 16px; font-weight: 700; } .pa-mh small { font-size: 12.5px; color: #86868B; }
  .pa-x { width: 30px; height: 30px; border-radius: 50%; border: none; background: #F5F5F7; color: #3A3A3C; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
  .pa-mb { padding: 6px 18px 18px; }
  .pa-l { display: block; font-size: 12.5px; color: #6E6E73; font-weight: 500; margin: 12px 0 6px; }
  .pa-seg { display: flex; gap: 4px; background: #F5F5F7; border-radius: 12px; padding: 3px; }
  .pa-seg button { flex: 1; border: none; background: none; border-radius: 9px; padding: 8px 4px; font-family: inherit; font-size: 13px !important; font-weight: 500; color: #3A3A3C; cursor: pointer; }
  .pa-seg button.on { background: #0D1B3E; color: #fff; }
  .pa-in { width: 100%; box-sizing: border-box; height: 42px; border: 1px solid #E5E5EA; border-radius: 12px; padding: 0 12px; font-family: inherit; font-size: 15px !important; color: #1D1D1F; outline: none; }
  .pa-in:focus { border-color: #1A6BFF; box-shadow: 0 0 0 3px rgba(26,107,255,.15); }
  .pa-mb .pa-ok { margin-top: 16px; }
  .pa-note { margin: 10px 0 0; font-size: 12px; color: #86868B; line-height: 1.45; text-align: center; text-wrap: balance; }
  .ps { background: #fff; border-radius: 16px; padding: 14px; margin: 14px 0; border: 1px solid #EEF1F6; font-family: -apple-system, "SF Pro Text", Inter, system-ui, sans-serif; color: #1D1D1F; }
  .ps-h { display: flex; align-items: center; gap: 10px; }
  .ps-h > div { flex: 1; min-width: 0; display: flex; flex-direction: column; } .ps-h b { font-size: 14.5px; font-weight: 700; } .ps-h small { font-size: 12px; color: #86868B; }
  .ps-ic { width: 32px; height: 32px; border-radius: 10px; background: #EAF1FF; color: #1A6BFF; display: inline-flex; align-items: center; justify-content: center; flex: none; }
  .ps-pay { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; background: #FFF8EB; border-radius: 12px; padding: 10px 12px; margin-top: 12px; font-size: 13px; color: #7C4A03; }
  .ps-recu { display: flex; flex-direction: column; background: #F5F5F7; border-radius: 12px; padding: 10px 12px; margin-top: 12px; font-size: 13px; }
  .ps-recu small { font-size: 12px; color: #86868B; }
  .ps-et { margin-top: 8px; display: flex; flex-direction: column; }
  .ps-e { display: flex; align-items: center; gap: 10px; border: none; background: none; padding: 8px 2px; font-family: inherit; font-size: 13.5px !important; color: #1D1D1F; text-align: left; cursor: pointer; border-radius: 8px; }
  .ps-e:hover:not(:disabled) { background: #F8FAFC; } .ps-e:disabled { cursor: default; color: #A1A1A6; }
  .ps-e small { margin-left: auto; font-size: 12px; color: #86868B; }
  .ps-cb { width: 20px; height: 20px; border-radius: 6px; border: 1.5px solid #C7C7CC; display: inline-flex; align-items: center; justify-content: center; flex: none; }
  .ps-e.ok .ps-cb { background: #16A34A; border-color: #16A34A; color: #fff; }
  .ps-note { margin: 4px 0 0; font-size: 12px; color: #86868B; }
  @media (max-width: 1100px) {
    .bk.pa .bk-row { grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "who qa" "ref st" "amt act"; }
    .bk.pa .bk-k b { font-size: 22px; white-space: nowrap; }
    .bk.pa .pa-ref { white-space: nowrap; }
    .bk.pa .bk-amt small { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
    .bk.pa .pa-ref { grid-area: ref; } .bk.pa .bk-row > span:nth-child(3) { grid-area: st; justify-self: end; }
    .bk.pa .bk-amt { grid-area: amt; } .bk.pa .pa-act { grid-area: act; justify-content: flex-end; } .bk.pa .bk-qa { grid-area: qa; }
  }
`
