import { useEffect, useRef, useState } from 'react'
import { Check, FileBadge, Copy, MessageCircle } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { CONTENU_PACK, PRIX_PACK, proposerPack, suiviPack, etapeEnCours, libelleStatutPack, type Pack } from '@/lib/pack'

const xaf = (n: number) => new Intl.NumberFormat('fr-FR').format(n).replace(/[  ]/g, ' ') + ' XAF'

/** Carte « Pack formalisation » de l'espace client : offre, souscription, paiement puis suivi. */
export default function PackClient({ lead, onChat }: { lead: any; onChat: (prefill?: string) => void }) {
  const [pack, setPack] = useState<Pack | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [copie, setCopie] = useState(false)
  const carte = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let vivant = true
    supabase.rpc('client_pack').then(({ data, error }) => { if (vivant) setPack(error ? null : (data as Pack | null)) })
    return () => { vivant = false }
  }, [])

  // Lien direct /client/<id>?pack=1 (depuis la page du score) : on amène le client sur la carte
  useEffect(() => {
    if (pack === undefined) return
    if (new URLSearchParams(window.location.search).get('pack') === '1') setTimeout(() => carte.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150)
  }, [pack])

  async function souscrire() {
    setBusy(true); setErr('')
    const { data, error } = await supabase.rpc('client_pack_souscrire')
    setBusy(false)
    if (error) { setErr(error.message); return }
    setPack(data as Pack)
  }

  async function copier(ref: string) {
    try { await navigator.clipboard.writeText(ref); setCopie(true); setTimeout(() => setCopie(false), 1800) } catch { /* sélection manuelle */ }
  }

  if (pack === undefined) return null
  if (!pack && !proposerPack(lead)) return null

  return (
    <div ref={carte} className="cx-g pk">
      <style>{PK_CSS}</style>
      {!pack ? <>
        <div className="pk-h"><span className="pk-ic"><FileBadge size={18}/></span><div><b>Pack formalisation</b><small>Tout pour devenir finançable</small></div></div>
        <div className="pk-prix">{xaf(PRIX_PACK)}</div>
        <ul className="pk-l">{CONTENU_PACK.map(c => <li key={c}><Check size={15} strokeWidth={2.6}/>{c}</li>)}</ul>
        {err && <div className="pk-err">{err}</div>}
        <button className="pk-btn" onClick={souscrire} disabled={busy}>{busy ? 'Un instant…' : 'Je souscris'}</button>
        <p className="pk-note">Le paiement se fait chez Mayinvest. Vous recevez une référence à donner au moment de payer.</p>
      </> : <>
        <div className="pk-h">
          <span className="pk-ic"><FileBadge size={18}/></span>
          <div><b>Pack formalisation</b><small>Souscrit le {new Date(pack.created_at).toLocaleDateString('fr-FR')}</small></div>
          <span className={`pk-st ${pack.statut}`}>{libelleStatutPack(pack.statut)}</span>
        </div>
        {pack.statut === 'en_attente_paiement' && (
          <div className="pk-pay">
            <b>Réglez {xaf(pack.montant || PRIX_PACK)} chez Mayinvest</b>
            <small>Donnez cette référence au moment de payer</small>
            <div className="pk-ref"><span>{pack.reference}</span><button onClick={() => copier(pack.reference)} aria-label="Copier la référence">{copie ? <Check size={15}/> : <Copy size={15}/>}</button></div>
            <small>Dès que Mayinvest confirme votre paiement, votre conseiller démarre les démarches.</small>
          </div>
        )}
        <div className="pk-suivi">
          {suiviPack(pack).map((e, i) => {
            const enCours = i === etapeEnCours(pack)
            return (
              <div key={e.label} className={`pk-e ${e.fait ? 'ok' : enCours ? 'on' : ''}`}>
                <span className="pk-d">{e.fait ? <Check size={12} strokeWidth={3}/> : null}</span>
                <span>{e.label}</span>
                {enCours && <small>en cours</small>}
              </div>
            )
          })}
        </div>
        <button className="pk-lien" onClick={() => onChat(`Bonjour, j'ai une question sur mon Pack formalisation (${pack.reference}).`)}><MessageCircle size={14}/>Une question sur mon pack</button>
      </>}
    </div>
  )
}

const PK_CSS = `
  .pk { padding: 16px; margin-top: 14px; scroll-margin: 90px; }
  .pk-h { display: flex; align-items: center; gap: 12px; }
  .pk-h > div { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .pk-h b { font-size: 15.5px; font-weight: 700; color: #1D1D1F; } .pk-h small { font-size: 12.5px; color: #86868B; }
  .pk-ic { width: 38px; height: 38px; border-radius: 12px; background: #EAF1FF; color: #1A6BFF; display: inline-flex; align-items: center; justify-content: center; flex: none; }
  .pk-prix { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; margin: 12px 0 6px; color: #0D1B3E; }
  .pk-l { list-style: none; padding: 0; margin: 0 0 4px; }
  .pk-l li { display: flex; align-items: center; gap: 9px; font-size: 14px; color: #1D1D1F; padding: 4px 0; }
  .pk-l li svg { color: #1A6BFF; flex: none; }
  .pk-btn { width: 100%; height: 44px; margin-top: 12px; border: none; border-radius: 999px; background: #1A6BFF; color: #fff; font-family: inherit; font-size: 15px !important; font-weight: 600; cursor: pointer; }
  .pk-btn:disabled { opacity: .6; cursor: default; }
  .pk-note { margin: 9px 0 0; font-size: 12.5px; color: #86868B; text-align: center; line-height: 1.45; text-wrap: balance; }
  .pk-err { margin-top: 10px; background: #FDECEC; color: #B42318; border-radius: 10px; padding: 8px 11px; font-size: 13px; }
  .pk-st { font-size: 11.5px; font-weight: 600; padding: 4px 10px; border-radius: 999px; white-space: nowrap; }
  .pk-st.en_attente_paiement { background: #FFF3E0; color: #B45309; }
  .pk-st.paye { background: #EAF1FF; color: #1A6BFF; }
  .pk-st.termine { background: #E8F8EE; color: #16A34A; }
  .pk-pay { background: #F5F5F7; border-radius: 14px; padding: 12px 14px; margin-top: 12px; display: flex; flex-direction: column; gap: 3px; }
  .pk-pay b { font-size: 14.5px; color: #1D1D1F; } .pk-pay small { font-size: 12.5px; color: #6E6E73; line-height: 1.45; }
  .pk-ref { display: flex; align-items: center; justify-content: space-between; background: #fff; border-radius: 10px; padding: 8px 8px 8px 12px; margin: 6px 0; }
  .pk-ref span { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 18px; font-weight: 700; letter-spacing: 1.5px; color: #0D1B3E; }
  .pk-ref button { width: 32px; height: 32px; border: none; border-radius: 50%; background: #F5F5F7; color: #3A3A3C; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
  .pk-suivi { margin-top: 10px; }
  .pk-e { display: flex; align-items: center; gap: 11px; padding: 7px 0; font-size: 14px; color: #A1A1A6; }
  .pk-e.ok, .pk-e.on { color: #1D1D1F; } .pk-e.on > span:nth-child(2) { font-weight: 600; }
  .pk-d { width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid #D2D2D7; display: inline-flex; align-items: center; justify-content: center; flex: none; }
  .pk-e.ok .pk-d { background: #16A34A; border-color: #16A34A; color: #fff; } .pk-e.on .pk-d { border-color: #1A6BFF; box-shadow: inset 0 0 0 4px #fff; background: #1A6BFF; }
  .pk-e small { margin-left: auto; font-size: 12px; color: #1A6BFF; font-weight: 500; }
  .pk-lien { margin-top: 8px; display: inline-flex; align-items: center; gap: 7px; border: none; background: none; padding: 6px 0; font-family: inherit; font-size: 13.5px !important; font-weight: 600; color: #1A6BFF; cursor: pointer; }
`
