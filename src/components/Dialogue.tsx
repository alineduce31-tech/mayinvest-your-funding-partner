import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X, CircleAlert, CircleCheck, Info, Landmark } from 'lucide-react'
import { formatMontant, lireMontant } from '@/lib/depot'

// Fenêtres Mayinvest à la place des boîtes du navigateur (alert, confirm, prompt) : même style partout, croix de fermeture.

export type Choix = { k: string; label: string; sous?: string | undefined; icone?: ReactNode; accent?: boolean | undefined; pointille?: boolean | undefined }
type Question = {
  type: 'confirmer' | 'texte' | 'depot' | 'choix'
  choix?: Choix[] | undefined
  banques?: string[] | undefined
  banque?: string | undefined
  montant?: number | null | undefined
  avecMontant?: boolean | undefined
  titre: string
  texte?: string | undefined
  label?: string | undefined
  placeholder?: string | undefined
  valeur?: string | undefined
  bouton?: string | undefined
  danger?: boolean | undefined
  multiligne?: boolean | undefined
  resoudre: (v: any) => void
}
type Toast = { id: number; texte: string; ton: 'erreur' | 'ok' | 'info' }

let poser: ((q: Question) => void) | null = null
let notifier: ((t: Omit<Toast, 'id'>) => void) | null = null

/** Demande une confirmation. Renvoie true si la personne confirme. */
export function confirmer(o: { titre: string; texte?: string; bouton?: string; danger?: boolean }): Promise<boolean> {
  if (!poser) return Promise.resolve(typeof window !== 'undefined' ? window.confirm([o.titre, o.texte].filter(Boolean).join('\n\n')) : false)
  return new Promise(res => poser!({ type: 'confirmer', ...o, resoudre: res }))
}

/** Demande un texte. Renvoie le texte saisi, ou null si la personne ferme. */
export function demanderTexte(o: { titre: string; texte?: string; label?: string; placeholder?: string; valeur?: string; bouton?: string; multiligne?: boolean }): Promise<string | null> {
  if (!poser) return Promise.resolve(typeof window !== 'undefined' ? window.prompt(o.titre) : null)
  return new Promise(res => poser!({ type: 'texte', ...o, resoudre: res }))
}

/** Liste de choix (un clic choisit et ferme). Renvoie la clé choisie, ou null si on ferme. */
export function choisir(o: { titre: string; texte?: string; choix: Choix[] }): Promise<string | null> {
  if (!poser) return Promise.resolve(null)
  return new Promise(res => poser!({ type: 'choix', ...o, resoudre: res }))
}

export type ReponseDepot = { banque: string; montant: number | null }
/** Demande la banque où le dossier est déposé (et le montant financé au financement). null si « Plus tard ». */
export function demanderDepot(o: { titre: string; texte?: string; banques: string[]; banque?: string; avecMontant?: boolean; montant?: number | null }): Promise<ReponseDepot | null> {
  if (!poser) return Promise.resolve(null)
  return new Promise(res => poser!({ type: 'depot', bouton: 'Enregistrer', ...o, resoudre: res }))
}

/** Message court en bas de l'écran (erreur, succès, information), avec croix. */
export function informer(texte: string, ton: Toast['ton'] = 'erreur') {
  if (!notifier) { if (typeof window !== 'undefined') window.alert(texte); return }
  notifier({ texte, ton })
}

/** À monter une seule fois (racine du site). */
export function DialogueHote() {
  const [q, setQ] = useState<Question | null>(null)
  const [val, setVal] = useState('')
  const [err, setErr] = useState('')
  const [banque, setBanque] = useState('')
  const [autre, setAutre] = useState(false)
  const [montant, setMontant] = useState('')
  const [toasts, setToasts] = useState<Toast[]>([])
  const champ = useRef<HTMLInputElement & HTMLTextAreaElement>(null)
  const [monte, setMonte] = useState(false)

  useEffect(() => {
    setMonte(true)
    poser = nq => {
      setQ(nq); setVal(nq.valeur || ''); setErr('')
      const b = nq.banque || ''
      setBanque(b); setAutre(!!b && !(nq.banques || []).includes(b)); setMontant(formatMontant(nq.montant))
    }
    let n = 0
    notifier = t => {
      const id = ++n
      setToasts(l => [...l.slice(-2), { ...t, id }])
      setTimeout(() => setToasts(l => l.filter(x => x.id !== id)), t.ton === 'erreur' ? 7000 : 4000)
    }
    return () => { poser = null; notifier = null }
  }, [])

  useEffect(() => {
    if (!q) return
    const t = setTimeout(() => champ.current?.focus(), 40)
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') fermer(false) }
    window.addEventListener('keydown', k)
    return () => { clearTimeout(t); window.removeEventListener('keydown', k) }
  }, [q])

  function fermer(ok: boolean) {
    if (!q) return
    if (q.type === 'texte') {
      if (ok && !val.trim()) { setErr('Ce champ est vide.'); return }
      q.resoudre(ok ? val.trim() : null)
    } else if (q.type === 'choix') {
      q.resoudre(null)
    } else if (q.type === 'depot') {
      if (!ok) { q.resoudre(null); setQ(null); return }
      if (!banque.trim()) { setErr('Choisissez la banque.'); return }
      const m = q.avecMontant ? lireMontant(montant) : null
      if (m !== null && !Number.isFinite(m)) { setErr('Montant illisible. Exemple : 25 000 000'); return }
      q.resoudre({ banque: banque.trim(), montant: m })
    } else q.resoudre(ok)
    setQ(null)
  }

  // Rien côté serveur ni au premier rendu : évite tout écart d'affichage au chargement
  if (!monte || typeof document === 'undefined') return null
  return createPortal(
    <>
      <style>{DLG_CSS}</style>
      {q && (
        <div className="dlg-ovr" onMouseDown={() => fermer(false)}>
          <div className="dlg" role="dialog" aria-modal="true" aria-label={q.titre} onMouseDown={e => e.stopPropagation()}>
            <div className="dlg-h">
              <b>{q.titre}</b>
              <button type="button" className="dlg-x" onClick={() => fermer(false)} aria-label="Fermer"><X size={16}/></button>
            </div>
            {q.texte && <p className="dlg-t">{q.texte}</p>}
            {q.type === 'texte' && <>
              {q.label && <label className="dlg-l">{q.label}</label>}
              {q.multiligne
                ? <textarea ref={champ} className="dlg-in ta" rows={Math.min(10, Math.max(3, Math.ceil((q.valeur || '').length / 45) + (q.valeur || '').split('\n').length))} value={val} placeholder={q.placeholder} onChange={e => { setVal(e.target.value); setErr('') }}/>
                : <input ref={champ} className="dlg-in" value={val} placeholder={q.placeholder} onChange={e => { setVal(e.target.value); setErr('') }} onKeyDown={e => { if (e.key === 'Enter') fermer(true) }}/>}
              {err && <div className="dlg-err">{err}</div>}
            </>}
            {q.type === 'choix' && (
              <div className="dlg-choix">
                {(q.choix || []).map(c => (
                  <button key={c.k} type="button" className={`dlg-ch ${c.accent ? 'acc' : ''} ${c.pointille ? 'pt' : ''}`} onClick={() => { q.resoudre(c.k); setQ(null) }}>
                    {c.icone && <span className="dlg-ch-ic">{c.icone}</span>}
                    <span className="dlg-ch-t"><b>{c.label}</b>{c.sous && <small>{c.sous}</small>}</span>
                  </button>
                ))}
              </div>
            )}
            {q.type === 'depot' && <>
              <label className="dlg-l">Banque de dépôt</label>
              <div className="dlg-chips" role="radiogroup" aria-label="Banque de dépôt">
                {(q.banques || []).map(b => (
                  <button key={b} type="button" role="radio" aria-checked={!autre && banque === b} className={`dlg-chip ${!autre && banque === b ? 'on' : ''}`} onClick={() => { setBanque(b); setAutre(false); setErr('') }}>
                    <Landmark size={14}/>{b}
                  </button>
                ))}
                <button type="button" role="radio" aria-checked={autre} className={`dlg-chip ${autre ? 'on' : ''}`} onClick={() => { setAutre(true); setBanque(''); setErr('') }}>Autre banque</button>
              </div>
              {autre && <input ref={champ} className="dlg-in" style={{ marginTop: 8 }} value={banque} placeholder="Nom de la banque" onChange={e => { setBanque(e.target.value); setErr('') }}/>}
              {q.avecMontant && <>
                <label className="dlg-l">Montant financé par la banque</label>
                <div className="dlg-mt"><input className="dlg-in" inputMode="numeric" value={montant} placeholder="Ex. : 25 000 000" onChange={e => { setMontant(e.target.value); setErr('') }} onBlur={() => { const m = lireMontant(montant); if (m !== null && Number.isFinite(m)) setMontant(formatMontant(m)) }}/><span>XAF</span></div>
              </>}
              {err && <div className="dlg-err">{err}</div>}
            </>}
            {q.type !== 'choix' && <div className="dlg-act">
              <button type="button" className="dlg-b sec" onClick={() => fermer(false)}>{q.type === 'depot' ? 'Plus tard' : 'Annuler'}</button>
              <button type="button" className={`dlg-b ${q.danger ? 'danger' : 'pri'}`} onClick={() => fermer(true)}>{q.bouton || (q.type === 'texte' ? 'Valider' : 'Confirmer')}</button>
            </div>}
          </div>
        </div>
      )}
      {toasts.length > 0 && (
        <div className="dlg-toasts" role="status" aria-live="polite">
          {toasts.map(t => (
            <div key={t.id} className={`dlg-toast ${t.ton}`}>
              <span className="dlg-ti">{t.ton === 'erreur' ? <CircleAlert size={17}/> : t.ton === 'ok' ? <CircleCheck size={17}/> : <Info size={17}/>}</span>
              <span className="dlg-tt">{t.texte}</span>
              <button type="button" className="dlg-tx" onClick={() => setToasts(l => l.filter(x => x.id !== t.id))} aria-label="Fermer"><X size={14}/></button>
            </div>
          ))}
        </div>
      )}
    </>,
    document.body,
  )
}

/** Croix de fermeture standard des menus et fenêtres. */
export function CroixFermer({ onClick, label = 'Fermer', className }: { onClick: () => void; label?: string; className?: string }) {
  return <button type="button" className={`dlg-x ${className || ''}`} onClick={onClick} aria-label={label} title={label}><X size={15}/></button>
}

export const DLG_CSS = `
  .dlg-ovr { position: fixed; inset: 0; z-index: 20000; background: rgba(13,27,62,.42); display: flex; align-items: center; justify-content: center; padding: 16px; animation: dlgFade .15s ease-out; font-family: -apple-system, "SF Pro Text", Inter, system-ui, sans-serif; }
  .dlg { width: 100%; max-width: 420px; background: #fff; border-radius: 22px; padding: 18px; box-shadow: 0 24px 60px rgba(13,27,62,.25); color: #1D1D1F; animation: dlgIn .16s ease-out; }
  .dlg-h { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  .dlg-h b { font-size: 16.5px; font-weight: 700; line-height: 1.35; letter-spacing: -0.01em; }
  .dlg-x { width: 30px; height: 30px; flex: none; border-radius: 50%; border: none; background: #F2F2F7; color: #3A3A3C; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; }
  .dlg-x:hover { background: #E5E5EA; }
  .dlg-t { margin: 8px 0 0; font-size: 14px; color: #6E6E73; line-height: 1.5; white-space: pre-line; }
  .dlg-l { display: block; font-size: 12.5px; color: #6E6E73; font-weight: 500; margin: 14px 0 6px; }
  .dlg-in { width: 100%; box-sizing: border-box; height: 44px; border: 1px solid #E5E5EA; border-radius: 12px; padding: 0 13px; font-family: inherit; font-size: 15px !important; color: #1D1D1F; outline: none; background: #fff; }
  .dlg-in.ta { height: auto; padding: 10px 13px; resize: vertical; line-height: 1.45; }
  .dlg-h + .dlg-in, .dlg-h + .dlg-in.ta { margin-top: 14px; }
  .dlg-in:focus { border-color: #1A6BFF; box-shadow: 0 0 0 3px rgba(26,107,255,.15); }
  .dlg-err { margin-top: 8px; font-size: 12.5px; color: #B42318; }
  .dlg-choix { display: flex; flex-direction: column; gap: 6px; margin-top: 14px; max-height: 60vh; overflow-y: auto; }
  .dlg-ch { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; border: 1px solid #E5E5EA; background: #fff; border-radius: 14px; padding: 10px 12px; font-family: inherit; cursor: pointer; color: #1D1D1F; }
  .dlg-ch:hover { border-color: #1A6BFF; background: #F5F9FF; }
  .dlg-ch.acc { border-color: #BFD3FF; background: #F5F9FF; }
  .dlg-ch.pt { border-style: dashed; border-color: #CBD5E1; color: #64748B; }
  .dlg-ch-ic { width: 30px; height: 30px; border-radius: 9px; flex: none; display: inline-flex; align-items: center; justify-content: center; background: #EAF1FF; color: #1A6BFF; }
  .dlg-ch.pt .dlg-ch-ic { background: #F3F5F9; color: #64748B; }
  .dlg-ch-t { display: flex; flex-direction: column; min-width: 0; }
  .dlg-ch-t b { font-size: 14px !important; font-weight: 600; }
  .dlg-ch-t small { font-size: 12px; color: #86868B; margin-top: 1px; }
  .dlg-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .dlg-chip { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 13px; border-radius: 999px; border: 1px solid #E5E5EA; background: #fff; color: #1D1D1F; font-family: inherit; font-size: 13.5px !important; font-weight: 500; cursor: pointer; }
  .dlg-chip svg { color: #86868B; }
  .dlg-chip:hover { background: #F5F7FB; }
  .dlg-chip.on { background: #EAF1FF; border-color: #1A6BFF; color: #1A6BFF; }
  .dlg-chip.on svg { color: #1A6BFF; }
  .dlg-mt { position: relative; }
  .dlg-mt .dlg-in { padding-right: 52px; }
  .dlg-mt span { position: absolute; right: 13px; top: 50%; transform: translateY(-50%); font-size: 13px; color: #86868B; }
  .dlg-act { display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; }
  .dlg-b { height: 40px; padding: 0 18px; border-radius: 999px; border: none; font-family: inherit; font-size: 14px !important; font-weight: 600; cursor: pointer; }
  .dlg-b.sec { background: #F2F2F7; color: #1D1D1F; } .dlg-b.pri { background: #1A6BFF; color: #fff; } .dlg-b.danger { background: #DC2626; color: #fff; }
  .dlg-toasts { position: fixed; z-index: 20001; left: 50%; bottom: 20px; transform: translateX(-50%); display: flex; flex-direction: column; gap: 8px; width: min(440px, calc(100vw - 24px)); font-family: -apple-system, "SF Pro Text", Inter, system-ui, sans-serif; }
  .dlg-toast { display: flex; align-items: flex-start; gap: 10px; background: #fff; border-radius: 16px; padding: 12px 10px 12px 14px; box-shadow: 0 12px 32px rgba(13,27,62,.18); font-size: 13.5px; color: #1D1D1F; line-height: 1.45; animation: dlgIn .16s ease-out; }
  .dlg-ti { flex: none; margin-top: 1px; } .dlg-toast.erreur .dlg-ti { color: #DC2626; } .dlg-toast.ok .dlg-ti { color: #16A34A; } .dlg-toast.info .dlg-ti { color: #1A6BFF; }
  .dlg-tt { flex: 1; min-width: 0; }
  .dlg-tx { width: 24px; height: 24px; border-radius: 50%; border: none; background: #F2F2F7; color: #6E6E73; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; flex: none; padding: 0; }
  @keyframes dlgFade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes dlgIn { from { opacity: 0; transform: translateY(6px) scale(.98); } to { opacity: 1; transform: none; } }
`
