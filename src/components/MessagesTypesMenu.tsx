import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Search, FolderCheck, UserCheck, Landmark, BellRing, HeartHandshake, ArrowUpRight } from 'lucide-react'
import { filtrerMessages, messageConseille, type MessageType } from '@/lib/messagerie'
import { CroixFermer } from '@/components/Dialogue'

const ICONES: Record<MessageType['cle'], { ic: ReactNode; ton: string }> = {
  prise: { ic: <UserCheck size={17}/>, ton: 'b' },
  pieces: { ic: <FolderCheck size={17}/>, ton: 'b' },
  depose: { ic: <Landmark size={17}/>, ton: 'n' },
  relance: { ic: <BellRing size={17}/>, ton: 'o' },
  merci: { ic: <HeartHandshake size={17}/>, ton: 'g' },
}

/** Menu « Message type » commun aux messageries : recherche, message conseillé pour le dossier, liste avec icônes. */
export default function MessagesTypesMenu({ messages, statut, onPick, onClose, className }: {
  messages: MessageType[]
  statut?: string | null | undefined
  onPick: (texte: string) => void
  onClose: () => void
  className?: string
}) {
  const [q, setQ] = useState('')
  const champ = useRef<HTMLInputElement>(null)
  const boite = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const t = setTimeout(() => champ.current?.focus(), 30)
    const echap = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const dehors = (e: MouseEvent) => {
      const el = e.target as HTMLElement
      if (boite.current?.contains(el) || el.closest?.('[data-mt-toggle]')) return
      onClose()
    }
    document.addEventListener('keydown', echap); document.addEventListener('mousedown', dehors)
    return () => { clearTimeout(t); document.removeEventListener('keydown', echap); document.removeEventListener('mousedown', dehors) }
  }, [onClose])

  const cle = messageConseille(statut)
  const conseille = !q.trim() && cle ? messages.find(m => m.cle === cle) : undefined
  const liste = filtrerMessages(messages, q).filter(m => m !== conseille)

  const ligne = (m: MessageType, mis: boolean) => (
    <button key={m.cle} type="button" className={`mt-r${mis ? ' mis' : ''}`} onClick={() => onPick(m.text)} title={m.text}>
      <span className={`mt-ic ${mis ? 'plein' : ICONES[m.cle].ton}`}>{ICONES[m.cle].ic}</span>
      <span className="mt-t"><b>{m.label}</b><small>{m.text}</small></span>
      {mis && <ArrowUpRight size={16} className="mt-go"/>}
    </button>
  )

  return (
    <div ref={boite} className={`mt ${className || ''}`} role="dialog" aria-label="Messages types">
      <style>{MT_CSS}</style>
      <div className="mt-top"><label className="mt-srch"><Search size={14}/><input ref={champ} value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un message…" aria-label="Rechercher un message"/></label><CroixFermer onClick={onClose}/></div>
      {conseille && <><div className="mt-g">Conseillé pour ce dossier{statut ? ` (${statut === 'Dossier Déposé' ? 'dossier déposé' : statut})` : ''}</div>{ligne(conseille, true)}</>}
      {liste.length > 0 && <div className="mt-g">{conseille ? 'Tous les messages' : 'Messages types'}</div>}
      {liste.map(m => ligne(m, false))}
      {liste.length === 0 && !conseille && <div className="mt-vide">Aucun message ne correspond.</div>}
      <p className="mt-pied">Le message s'insère dans la zone de saisie, vous pouvez le modifier avant l'envoi.</p>
    </div>
  )
}

const MT_CSS = `
  .mt { position: absolute; bottom: calc(100% + 6px); left: 14px; width: 360px; max-width: calc(100% - 28px); background: #fff; border: 1px solid #E5E5EA; border-radius: 18px; padding: 10px; box-shadow: 0 16px 40px rgba(13,27,62,.16), 0 2px 6px rgba(13,27,62,.06); z-index: 30; display: flex; flex-direction: column; font-family: -apple-system, "SF Pro Text", Inter, system-ui, sans-serif; color: #1D1D1F; max-height: min(520px, 70vh); overflow-y: auto; }
  .mt-top { display: flex; align-items: center; gap: 8px; flex: none; }
  .mt-srch { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; height: 36px; padding: 0 12px; border-radius: 999px; background: #F5F5F7; color: #A1A1A6; flex: none; }
  .mt-srch input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font-family: inherit; font-size: 13.5px !important; color: #1D1D1F; }
  .mt-g { font-size: 11.5px; color: #86868B; font-weight: 500; margin: 12px 6px 4px; }
  .mt-r { display: flex; align-items: center; gap: 11px; width: 100%; border: none; background: none; padding: 8px; border-radius: 12px; font-family: inherit; text-align: left; cursor: pointer; color: inherit; }
  .mt-r:hover { background: #F5F5F7; }
  .mt-r.mis { background: #EAF1FF; } .mt-r.mis:hover { background: #DFEAFF; }
  .mt-ic { width: 34px; height: 34px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; flex: none; }
  .mt-ic.b { background: #EAF1FF; color: #1A6BFF; } .mt-ic.n { background: #EDEFF4; color: #0D1B3E; } .mt-ic.o { background: #FFF1E0; color: #D9690B; } .mt-ic.g { background: #E8F8EE; color: #16A34A; }
  .mt-ic.plein { background: #1A6BFF; color: #fff; }
  .mt-t { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .mt-t b { font-size: 13.5px; font-weight: 600; }
  .mt-t small { font-size: 12px; color: #6E6E73; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mt-go { color: #1A6BFF; flex: none; }
  .mt-vide { font-size: 13px; color: #86868B; text-align: center; padding: 16px 0 6px; }
  .mt-pied { margin: 8px 6px 2px; font-size: 11.5px; color: #86868B; text-align: center; line-height: 1.4; text-wrap: balance; }
  @media (max-width: 760px) { .mt { left: 10px; max-width: calc(100% - 20px); } }
`
