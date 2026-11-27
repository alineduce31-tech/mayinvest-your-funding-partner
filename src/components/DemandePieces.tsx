import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Plus, Send } from 'lucide-react'
import PieceIcone from '@/components/PieceIcone'
import { CroixFermer, DLG_CSS } from '@/components/Dialogue'
import { decouperLibelle, titreCourt } from '@/lib/affichage'

const COURANTES = ["Carte Nationale d'Identité (ou passeport)", 'Bulletins de salaire (3 derniers mois)', 'Relevé bancaire (3 derniers mois)', "Attestation d'employeur", 'RCCM', 'NIU', 'Statuts de la société', 'Facture proforma']

/** Fenêtre « Demander des pièces » : pièces du dossier encore attendues, pièces courantes en un clic, autre pièce libre. */
export default function DemandePieces({ docs, onClose, onSend }: {
  docs: any[]
  onClose: () => void
  onSend: (ids: string[], labels: string[], nouvelles: string[]) => Promise<void>
}) {
  const manquantes = docs.filter(d => d.status === 'pending' || d.status === 'rejected' || !d.status)
  const dejaListees = new Set(docs.map(d => String(d.doc_label || '').toLowerCase()))
  const [coche, setCoche] = useState<Record<string, boolean>>(() => Object.fromEntries(manquantes.map(d => [d.id, true])))
  const [ajouts, setAjouts] = useState<string[]>([])
  const [autre, setAutre] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  const choisies = manquantes.filter(d => coche[d.id])
  const nouvelles = [...ajouts, ...(autre.trim() ? [autre.trim()] : [])]
  const total = choisies.length + nouvelles.length
  const proposees = COURANTES.filter(c => !dejaListees.has(c.toLowerCase()))
  const basculer = (l: string) => setAjouts(a => a.includes(l) ? a.filter(x => x !== l) : [...a, l])

  return createPortal(
    <div className="dlg-ovr" onMouseDown={onClose}>
      <style>{DLG_CSS + DP_CSS}</style>
      <div className="dlg dp" role="dialog" aria-modal="true" aria-label="Demander des pièces" onMouseDown={e => e.stopPropagation()}>
        <div className="dlg-h"><div><b>Demander des pièces</b><p className="dp-s">Le client reçoit une carte et envoie ses pièces depuis la discussion.</p></div><CroixFermer onClick={onClose}/></div>

        {manquantes.length > 0 && <>
          <div className="dp-g">Pièces du dossier encore attendues</div>
          <div className="dp-l">
            {manquantes.map(d => {
              const { titre, precision } = decouperLibelle(d.doc_label || 'Document')
              return (
                <button key={d.id} type="button" className={`dp-r ${coche[d.id] ? 'on' : ''}`} onClick={() => setCoche(c => ({ ...c, [d.id]: !c[d.id] }))}>
                  <span className="dp-ic"><PieceIcone docType={d.doc_type} titre={titre} size={16}/></span>
                  <span className="dp-t"><b>{titreCourt(titre)}</b>{d.status === 'rejected' ? <small className="r">Refusée, à renvoyer</small> : precision && <small>{precision}</small>}</span>
                  <span className="dp-cb">{coche[d.id] && <Check size={13} strokeWidth={3}/>}</span>
                </button>
              )
            })}
          </div>
        </>}

        {proposees.length > 0 && <>
          <div className="dp-g">Ajouter une pièce courante</div>
          <div className="dp-chips">
            {proposees.map(c => (
              <button key={c} type="button" className={ajouts.includes(c) ? 'on' : ''} onClick={() => basculer(c)}>
                <PieceIcone titre={c} size={13}/>{titreCourt(decouperLibelle(c).titre)}{ajouts.includes(c) ? <Check size={12} strokeWidth={3}/> : <Plus size={12}/>}
              </button>
            ))}
          </div>
        </>}

        <div className="dp-g">Autre pièce</div>
        <input className="dlg-in" placeholder="Ex. : attestation de domicile" value={autre} maxLength={120} onChange={e => setAutre(e.target.value)}/>

        <div className="dlg-act">
          <button type="button" className="dlg-b sec" onClick={onClose}>Annuler</button>
          <button type="button" className="dlg-b pri dp-send" disabled={busy || total === 0}
            onClick={async () => { setBusy(true); await onSend(choisies.map(d => d.id), choisies.map(d => d.doc_label || 'Document'), nouvelles); setBusy(false) }}>
            <Send size={14}/>{busy ? 'Envoi…' : total ? `Demander ${total} pièce${total > 1 ? 's' : ''}` : 'Choisissez une pièce'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

const DP_CSS = `
  .dp { max-width: 460px; max-height: 88vh; overflow-y: auto; }
  .dp-s { margin: 3px 0 0; font-size: 12.5px; color: #86868B; line-height: 1.4; }
  .dp-g { font-size: 12px; color: #86868B; font-weight: 500; margin: 16px 2px 7px; }
  .dp-l { display: flex; flex-direction: column; gap: 6px; }
  .dp-r { display: flex; align-items: center; gap: 11px; width: 100%; border: 1px solid #E5E5EA; background: #fff; border-radius: 14px; padding: 9px 11px; font-family: inherit; text-align: left; cursor: pointer; color: inherit; }
  .dp-r.on { border-color: #B9D0FF; background: #F5F8FF; }
  .dp-ic { width: 32px; height: 32px; border-radius: 10px; background: #EEF3FF; color: #4A73C9; display: inline-flex; align-items: center; justify-content: center; flex: none; }
  .dp-t { flex: 1; min-width: 0; display: flex; flex-direction: column; } .dp-t b { font-size: 13.5px; font-weight: 600; } .dp-t small { font-size: 12px; color: #86868B; } .dp-t small.r { color: #B42318; }
  .dp-cb { width: 22px; height: 22px; border-radius: 7px; border: 1.5px solid #C7C7CC; display: inline-flex; align-items: center; justify-content: center; flex: none; }
  .dp-r.on .dp-cb { background: #1A6BFF; border-color: #1A6BFF; color: #fff; }
  .dp-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .dp-chips button { display: inline-flex; align-items: center; gap: 6px; border: 1px solid #E5E5EA; background: #fff; border-radius: 999px; padding: 6px 11px; font-family: inherit; font-size: 12.5px !important; font-weight: 500; color: #3A3A3C; cursor: pointer; }
  .dp-chips button svg:first-child { color: #4A73C9; }
  .dp-chips button.on { background: #EAF1FF; border-color: #B9D0FF; color: #1A6BFF; }
  .dp-send { display: inline-flex; align-items: center; gap: 7px; } .dp-send:disabled { opacity: .55; cursor: default; }
`
