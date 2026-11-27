import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, User, Building2, Briefcase, Landmark, Wallet, CircleCheck, Copy, Check, MessageSquare, ArrowLeft, ArrowRight, CircleAlert } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import NiceSelect, { optionsActivite } from '@/components/NiceSelect'
import {
  ACTIVITES_PARTICULIER, ACTIVITES_ENTREPRISE, BANQUES, VILLES, CONTRATS, TRANCHES, OBJETS_PARTICULIER, OBJETS_ENTREPRISE,
  besoinContrat, besoinDureeRestante, construireDossier, manquants, messageAcces, lienWhatsapp, type Formulaire,
} from '@/lib/dossier'

// Création d'un dossier client par un partenaire : mêmes questions que le formulaire du site, en 4 étapes,
// puis les accès du client (lien + code) à lui envoyer par WhatsApp ou SMS.

const ETAPES = [
  { n: 1, label: 'Client', ic: User },
  { n: 2, label: 'Situation', ic: Briefcase },
  { n: 3, label: 'Banque', ic: Landmark },
  { n: 4, label: 'Besoin', ic: Wallet },
] as const

const opts = (l: readonly string[]) => l.map(v => ({ value: v, label: v }))
const argent = (v: string) => (v || '').replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
const telAffiche = (v: string) => {
  const d = (v || '').replace(/\D/g, '').slice(0, 9)
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ')
}

type Resultat = { id: string; access_code: string; score: number | null; nom: string; prenom: string; tel: string }

export default function NouveauDossier({ commercialId, partenaire, onClose, onCreated, onOuvrir }: {
  commercialId: string
  partenaire: string
  onClose: () => void
  onCreated: () => void
  onOuvrir: (leadId: string) => void
}) {
  const [isP, setIsP] = useState(true)
  const [activite, setActivite] = useState('')
  const [f, setF] = useState<Formulaire>({})
  const [etape, setEtape] = useState<1 | 2 | 3 | 4>(1)
  const [manque, setManque] = useState<string[]>([])
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<Resultat | null>(null)
  const [copie, setCopie] = useState('')

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  const set = (k: string, v: string) => { setF(x => ({ ...x, [k]: v })); setManque([]) }
  const champ = (k: string, label: string, o: { requis?: boolean; type?: 'texte' | 'argent' | 'tel' | 'email' | 'nombre'; placeholder?: string; suffixe?: string } = {}) => (
    <label className={`nd-f ${manque.some(m => m.startsWith(label)) ? 'ko' : ''}`}>
      <span>{label}{o.requis !== false && <i>*</i>}</span>
      <span className="nd-in">
        <input value={o.type === 'argent' ? argent(f[k] || '') : o.type === 'tel' ? telAffiche(f[k] || '') : (f[k] || '')}
          inputMode={o.type === 'argent' || o.type === 'tel' || o.type === 'nombre' ? 'numeric' : o.type === 'email' ? 'email' : undefined}
          type={o.type === 'email' ? 'email' : 'text'} placeholder={o.placeholder}
          onChange={e => set(k, o.type === 'argent' || o.type === 'tel' || o.type === 'nombre' ? e.target.value.replace(/\D/g, '').slice(0, o.type === 'tel' ? 9 : 15) : e.target.value)}/>
        {o.suffixe && <em>{o.suffixe}</em>}
      </span>
    </label>
  )
  const liste = (k: string, label: string, options: { value: string; label: string }[], placeholder = 'Choisir', requis = true) => (
    <div className={`nd-f ${manque.some(m => m.startsWith(label)) ? 'ko' : ''}`}>
      <span>{label}{requis && <i>*</i>}</span>
      <NiceSelect value={f[k] || ''} onChange={v => set(k, v)} options={options} placeholder={placeholder} title={label}/>
    </div>
  )
  const ouiNon = (k: string, label: string) => (
    <div className={`nd-f ${manque.some(m => m.startsWith(label.split(' ')[0] || label)) ? 'ko' : ''}`}>
      <span>{label}<i>*</i></span>
      <div className="nd-on" role="radiogroup" aria-label={label}>
        {['Oui', 'Non'].map(v => <button key={v} type="button" role="radio" aria-checked={f[k] === v} className={f[k] === v ? 'on' : ''} onClick={() => set(k, v)}>{v}</button>)}
      </div>
    </div>
  )

  function suivant() {
    const m = manquants(etape, isP, activite, f)
    if (m.length) { setManque(m); return }
    setManque([])
    if (etape < 4) { setEtape((etape + 1) as 2 | 3 | 4); document.querySelector('.nd-corps')?.scrollTo({ top: 0 }) }
    else creer()
  }

  async function creer() {
    setBusy(true); setErr('')
    const dossier = construireDossier(isP, activite, f)
    const { data, error } = await supabase.rpc('commercial_create_dossier', { p_commercial_id: commercialId, p_dossier: dossier })
    setBusy(false)
    if (error) { setErr(error.message || 'Le dossier n’a pas pu être créé.'); return }
    const r = data as any
    setRes({ id: r.id, access_code: r.access_code, score: r.score ?? null, nom: isP ? `${f['prenom'] || ''} ${f['nom'] || ''}`.trim() : (f['raison_sociale'] || ''), prenom: isP ? (f['prenom'] || '') : (f['dirigeant'] || ''), tel: dossier.identite.tel || '' })
    onCreated()
  }

  function copier(t: string, k: string) {
    navigator.clipboard?.writeText(t).then(() => { setCopie(k); setTimeout(() => setCopie(''), 1800) }).catch(() => {})
  }

  const lien = res ? `${typeof window !== 'undefined' ? window.location.origin : 'https://mayinvestcapitalstrategy.com'}/client/${res.id}` : ''
  const message = res ? messageAcces(res.prenom, lien, res.access_code, partenaire) : ''

  return createPortal(
    <div className="nd-ovr" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <style>{ND_CSS}</style>
      <div className="nd" role="dialog" aria-modal="true" aria-label="Nouveau dossier client">
        {!res ? <>
          <div className="nd-h">
            <div><b>Nouveau dossier client</b><small>Les mêmes questions que le formulaire du site</small></div>
            <button type="button" className="nd-x" onClick={onClose} aria-label="Fermer"><X size={16}/></button>
          </div>
          <div className="nd-steps">
            {ETAPES.map(e => (
              <div key={e.n} className={`nd-st ${etape > e.n ? 'fait' : etape === e.n ? 'on' : ''}`}>
                <i/><span><e.ic size={13}/>{e.label}</span>
              </div>
            ))}
          </div>

          <div className="nd-corps">
            {etape === 1 && <>
              <div className="nd-seg">
                <button type="button" className={isP ? 'on' : ''} onClick={() => { setIsP(true); setActivite(''); setManque([]) }}><User size={15}/>Particulier</button>
                <button type="button" className={!isP ? 'on' : ''} onClick={() => { setIsP(false); setActivite(''); setManque([]) }}><Building2 size={15}/>Entreprise</button>
              </div>
              <div className={`nd-f ${manque.some(m => m.startsWith('Profession') || m.startsWith('Secteur')) ? 'ko' : ''}`}>
                <span>{isP ? 'Profession' : "Secteur d'activité"}<i>*</i></span>
                <NiceSelect value={activite} onChange={v => { setActivite(v); setManque([]) }} options={optionsActivite(isP ? ACTIVITES_PARTICULIER : ACTIVITES_ENTREPRISE)} placeholder="Choisir" title={isP ? 'Profession' : "Secteur d'activité"}/>
              </div>
              <div className="nd-g2">
                {isP ? <>{champ('prenom', 'Prénom', { placeholder: 'Jean-Pierre' })}{champ('nom', 'Nom', { placeholder: 'Moukouama' })}</>
                  : <>{champ('raison_sociale', 'Raison sociale', { placeholder: 'Jespere SARL' })}{champ('dirigeant', 'Dirigeant', { placeholder: 'Alain Mabiala' })}</>}
                {champ('tel', 'Téléphone', { type: 'tel', placeholder: '06 531 31 01' })}
                {champ('email', 'Email', { type: 'email', requis: false, placeholder: 'Facultatif' })}
              </div>
              {liste('ville', 'Ville', opts(VILLES))}
            </>}

            {etape === 2 && (isP ? <>
              {champ('employeur', 'Employeur', { placeholder: "Ministère de l'Économie, SOCOFRAN…" })}
              <div className="nd-g2">
                {besoinContrat(isP, activite) && liste('contrat', 'Type de contrat', opts(CONTRATS))}
                {besoinDureeRestante(isP, activite, f) && champ('duree_restante', 'Durée restante du contrat', { type: 'nombre', suffixe: 'mois' })}
                {liste('anciennete_tr', 'Ancienneté', TRANCHES.map(t => ({ value: t.key, label: t.label })))}
                {champ('revenu', 'Revenu net mensuel', { type: 'argent', suffixe: 'XAF', placeholder: '350 000' })}
              </div>
            </> : <>
              {ouiNon('rccm', 'RCCM : la société est-elle enregistrée ?')}
              <div className="nd-g2">
                {f['rccm'] === 'Oui' && champ('niu', 'NIU', { placeholder: 'M2019051234' })}
                {liste('anciennete_soc_tr', 'Ancienneté de la société', TRANCHES.map(t => ({ value: t.key, label: t.label })))}
                {champ('ca_annuel', "Chiffre d'affaires annuel", { type: 'argent', suffixe: 'XAF', placeholder: '50 000 000' })}
              </div>
            </>)}

            {etape === 3 && <>
              {liste('banque', 'Banque actuelle', opts(BANQUES), "Choisir (« Aucune » s'il n'en a pas)")}
              {isP ? <>
                {ouiNon('salaire_domic', 'Salaire domicilié sur ce compte ?')}
                {f['banque'] && f['banque'] !== 'Aucune' && liste('anciennete_cpt_tr', 'Compte ouvert depuis', TRANCHES.map(t => ({ value: t.key, label: t.label })), 'Choisir', false)}
              </> : <>
                {ouiNon('compte_mouvemente', 'Compte mouvementé régulièrement ?')}
                {ouiNon('refus_bancaire', 'Refus bancaire passé ?')}
              </>}
            </>}

            {etape === 4 && <>
              <div className="nd-g2">
                {champ('montant', 'Montant demandé', { type: 'argent', suffixe: 'XAF', placeholder: '5 000 000' })}
                {liste('objet', 'Objet du financement', opts(isP ? OBJETS_PARTICULIER : OBJETS_ENTREPRISE))}
                {!isP && champ('flux_mois', 'Flux mensuel moyen', { type: 'argent', suffixe: 'XAF', placeholder: '2 000 000' })}
              </div>
              {!isP && ouiNon('garanties', 'Garanties : terrain, véhicule, matériel ?')}
            </>}

            {manque.length > 0 && <div className="nd-err"><CircleAlert size={16}/><span>À compléter : {manque.join(', ')}</span></div>}
            {err && <div className="nd-err"><CircleAlert size={16}/><span>{err}</span></div>}
          </div>

          <div className="nd-pied">
            {etape > 1 ? <button type="button" className="nd-b sec" onClick={() => { setEtape((etape - 1) as 1 | 2 | 3); setManque([]) }}><ArrowLeft size={15}/>Retour</button>
              : <button type="button" className="nd-b sec" onClick={onClose}>Annuler</button>}
            <button type="button" className="nd-b pri" disabled={busy} onClick={suivant}>
              {busy ? 'Création…' : etape < 4 ? <>Continuer<ArrowRight size={15}/></> : <><CircleCheck size={16}/>Créer le dossier</>}
            </button>
          </div>
        </> : <>
          <div className="nd-h nd-ok-h">
            <span/>
            <button type="button" className="nd-x" onClick={onClose} aria-label="Fermer"><X size={16}/></button>
          </div>
          <div className="nd-corps nd-ok">
            <span className="nd-ok-ic"><CircleCheck size={30}/></span>
            <b>Dossier créé pour {res.nom || 'le client'}</b>
            <small>{res.score != null ? `Score ${res.score}/100 · ` : ''}Il est dans tes dossiers : tu le gères comme les autres.</small>

            <div className="nd-acces">
              <div className="nd-acces-t">Accès du client pour suivre son dossier</div>
              <div className="nd-ligne"><span>Code d'accès</span><b className="code">{res.access_code}</b>
                <button type="button" onClick={() => copier(res.access_code, 'code')} aria-label="Copier le code">{copie === 'code' ? <Check size={15}/> : <Copy size={15}/>}</button></div>
              <div className="nd-ligne"><span>Lien</span><b className="lien">{lien.replace(/^https?:\/\//, '')}</b>
                <button type="button" onClick={() => copier(lien, 'lien')} aria-label="Copier le lien">{copie === 'lien' ? <Check size={15}/> : <Copy size={15}/>}</button></div>
            </div>
            <div className="nd-env">
              <a className="nd-b wa" href={lienWhatsapp(res.tel, message)} target="_blank" rel="noopener noreferrer"><WaIc/>Envoyer par WhatsApp</a>
              <a className="nd-b sec" href={`sms:${res.tel}?&body=${encodeURIComponent(message)}`}><MessageSquare size={15}/>Par SMS</a>
            </div>
            <p className="nd-note">Le message contient le lien et le code. Le client ouvre son espace, suit son dossier, t'écrit et envoie ses pièces. À la première connexion, il crée son propre mot de passe.</p>
          </div>
          <div className="nd-pied">
            <button type="button" className="nd-b sec" onClick={onClose}>Fermer</button>
            <button type="button" className="nd-b pri" onClick={() => onOuvrir(res.id)}>Ouvrir le dossier<ArrowRight size={15}/></button>
          </div>
        </>}
      </div>
    </div>,
    document.body,
  )
}

const WaIc = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.2.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>

const ND_CSS = `
  .nd-ovr { position: fixed; inset: 0; z-index: 400; background: rgba(13,27,62,.45); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; padding: 16px; font-family: -apple-system, "SF Pro Text", Inter, system-ui, sans-serif; }
  .nd { width: 100%; max-width: 560px; max-height: calc(100vh - 32px); background: #fff; border-radius: 24px; box-shadow: 0 30px 70px rgba(13,27,62,.28); display: flex; flex-direction: column; overflow: hidden; color: #0D1B3E; animation: ndIn .18s ease-out; }
  @keyframes ndIn { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: none; } }
  .nd-h { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 20px 22px 6px; }
  .nd-h b { display: block; font-size: 18px; font-weight: 700; letter-spacing: -.01em; }
  .nd-h small { display: block; font-size: 12.5px; color: #64748B; margin-top: 2px; }
  .nd-x { width: 32px; height: 32px; border-radius: 50%; border: none; background: #F2F2F7; color: #3A3A3C; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; flex: none; padding: 0; }
  .nd-steps { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; padding: 10px 22px 4px; }
  .nd-st i { display: block; height: 4px; border-radius: 4px; background: #E5EAF2; }
  .nd-st span { display: flex; align-items: center; gap: 4px; margin-top: 6px; font-size: 11.5px; color: #94A3B8; font-weight: 500; white-space: nowrap; }
  .nd-st.on i, .nd-st.fait i { background: #1A6BFF; } .nd-st.on span { color: #1A6BFF; font-weight: 600; } .nd-st.fait span { color: #0D1B3E; }
  .nd-corps { padding: 14px 22px 8px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
  .nd-seg { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; background: #EEF1F6; border-radius: 999px; padding: 4px; }
  .nd-seg button { border: none; background: transparent; border-radius: 999px; padding: 9px; font-family: inherit; font-size: 13.5px !important; font-weight: 600; color: #64748B; display: inline-flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; }
  .nd-seg button.on { background: #fff; color: #0D1B3E; box-shadow: 0 1px 3px rgba(13,27,62,.1); }
  .nd-g2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .nd-f { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  .nd-f > span:first-child { font-size: 12.5px; font-weight: 600; color: #334155; }
  .nd-f > span:first-child i { color: #DC2626; font-style: normal; margin-left: 3px; }
  .nd-in { position: relative; display: block; }
  .nd-in input { width: 100%; box-sizing: border-box; height: 46px; border: 1px solid #E2E8F0; border-radius: 12px; padding: 0 14px; font-family: inherit; font-size: 15px !important; color: #0D1B3E; background: #fff; outline: none; transition: border-color .15s, box-shadow .15s; }
  .nd-in input::placeholder { color: #A8B3C4; }
  .nd-in input:focus { border-color: #1A6BFF; box-shadow: 0 0 0 3px rgba(26,107,255,.14); }
  .nd-in em { position: absolute; right: 13px; top: 50%; transform: translateY(-50%); font-style: normal; font-size: 12.5px; color: #94A3B8; }
  .nd-in em ~ input, .nd-in input:has(+ em) { padding-right: 48px; }
  .nd-f.ko .nd-in input, .nd-f.ko .ns-trigger { border-color: #F59E0B !important; box-shadow: 0 0 0 3px rgba(245,158,11,.12); }
  .nd-on { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .nd-on button { height: 44px; border-radius: 12px; border: 1px solid #E2E8F0; background: #fff; font-family: inherit; font-size: 14px !important; font-weight: 600; color: #334155; cursor: pointer; }
  .nd-on button.on { border-color: #1A6BFF; background: #EAF1FF; color: #1A6BFF; }
  .nd-f.ko .nd-on button { border-color: #F5C26B; }
  .nd-err { display: flex; gap: 8px; align-items: flex-start; background: #FFF6EC; color: #8A4B0B; border-radius: 12px; padding: 10px 12px; font-size: 13px; line-height: 1.45; }
  .nd-err svg { flex: none; margin-top: 1px; }
  .nd-pied { display: flex; gap: 10px; padding: 14px 22px 20px; border-top: 1px solid #EEF1F6; margin-top: 6px; }
  .nd-b { height: 46px; border-radius: 999px; border: none; padding: 0 18px; font-family: inherit; font-size: 14px !important; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 7px; cursor: pointer; text-decoration: none; white-space: nowrap; }
  .nd-b.sec { background: #F2F4F8; color: #0D1B3E; flex: 1; } .nd-b.sec:hover { background: #E8ECF3; }
  .nd-b.pri { background: #1A6BFF; color: #fff; flex: 2; } .nd-b.pri:hover { background: #0F5AE6; } .nd-b:disabled { opacity: .6; cursor: default; }
  .nd-b.wa { background: #E8F8EE; color: #15803D; flex: 1.4; }
  .nd-ok-h { padding-bottom: 0; }
  .nd-ok { align-items: center; text-align: center; padding-top: 0; }
  .nd-ok-ic { width: 58px; height: 58px; border-radius: 50%; background: #EAF1FF; color: #1A6BFF; display: inline-flex; align-items: center; justify-content: center; }
  .nd-ok > b { font-size: 18px; font-weight: 700; }
  .nd-ok > small { font-size: 13px; color: #64748B; margin-top: -6px; }
  .nd-acces { width: 100%; background: #F5F8FF; border-radius: 16px; padding: 12px; display: flex; flex-direction: column; gap: 8px; text-align: left; margin-top: 4px; }
  .nd-acces-t { font-size: 12.5px; font-weight: 600; color: #1A6BFF; }
  .nd-ligne { display: flex; align-items: center; gap: 10px; background: #fff; border-radius: 12px; padding: 9px 8px 9px 12px; font-size: 13px; }
  .nd-ligne span { color: #64748B; flex: none; }
  .nd-ligne b { flex: 1; min-width: 0; font-weight: 600; text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .nd-ligne b.code { letter-spacing: .05em; font-size: 14px; }
  .nd-ligne button { width: 32px; height: 32px; border-radius: 9px; border: none; background: #F2F4F8; color: #475569; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; flex: none; }
  .nd-env { width: 100%; display: flex; gap: 8px; }
  .nd-note { font-size: 12.5px; color: #64748B; line-height: 1.5; margin: 0; }
  @media (max-width: 560px) {
    .nd-ovr { padding: 0; align-items: flex-end; }
    .nd { max-height: 94vh; border-radius: 24px 24px 0 0; }
    .nd-g2 { grid-template-columns: minmax(0, 1fr); }
    .nd-st span { font-size: 10.5px; } .nd-st span svg { display: none; }
    .nd-env { flex-direction: column; }
  }
`
