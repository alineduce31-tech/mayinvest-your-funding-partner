import type { ReactNode } from 'react'
import { ArrowRight, CalendarDays, CircleCheck, FileSearch, FileWarning, Flag, MessageCircle, Phone, UserPlus } from 'lucide-react'

/** Bandeau « Prochaine étape » en haut d'une discussion (messagerie commerciale et messagerie de la direction). */
export function iconeEtape(action: string | null | undefined, ton: string) {
  const p = { size: 16, strokeWidth: 2.1 }
  if (action === 'pieces' || action === 'relancer') return <FileWarning {...p}/>
  if (action === 'verifier') return <FileSearch {...p}/>
  if (action === 'repondre') return <MessageCircle {...p}/>
  if (action === 'appeler') return <Phone {...p}/>
  if (action === 'rdv') return <CalendarDays {...p}/>
  if (action === 'attribuer') return <UserPlus {...p}/>
  return ton === 'ok' ? <CircleCheck {...p}/> : <Flag {...p}/>
}

export default function BandeauEtape({ ton, action, texte, progression, libelle, bouton, onClick, occupe }: {
  ton: 'info' | 'warn' | 'ok'
  action: string | null | undefined
  texte: string
  progression?: { recu: number; total: number } | undefined
  /** Texte du bouton standard (bleu) ; ignoré si « bouton » est fourni */
  libelle?: string | undefined
  /** Bouton personnalisé (ex. bouton d'appel) */
  bouton?: ReactNode | undefined
  onClick?: (() => void) | undefined
  occupe?: boolean | undefined
}) {
  return (
    <div className={`be ${ton}`}>
      <style>{CSS}</style>
      <span className="be-ic" aria-hidden="true">{iconeEtape(action, ton)}</span>
      <div className="be-t"><span>Prochaine étape · </span>{texte}</div>
      {progression && progression.total > 0 && <span className="be-prog">
        <span className="be-bar"><i style={{ width: `${Math.round(progression.recu / progression.total * 100)}%` }}/></span>
        <span className="be-nb">{progression.recu} sur {progression.total}</span>
      </span>}
      {bouton || (libelle && <button className="be-btn" onClick={onClick} disabled={occupe} aria-label={libelle}><span className="be-btn-t">{libelle}</span><ArrowRight size={14} strokeWidth={2.4}/></button>)}
    </div>
  )
}

const CSS = `
  .be { margin: 12px 16px 0; background: #fff; border: 1px solid #E2E8F2; border-radius: 22px; padding: 6px; display: flex; gap: 10px; align-items: center; font-size: 13px; color: #0D1B3E; line-height: 1.4; box-shadow: 0 1px 2px rgba(13,27,62,.04); }
  .be-ic { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: #EAF1FF; color: #1A6BFF; }
  .be.warn .be-ic { background: #FFF1E0; color: #D9690B; }
  .be:not(.warn) .be-nb { color: #1A6BFF; background: #EAF1FF; }
  .be-t { flex: 1; min-width: 0; padding-right: 4px; }
  .be-t > span { color: #64748B; }
  .be-prog { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .be-bar { width: 70px; height: 5px; background: #E2E8F2; border-radius: 999px; overflow: hidden; }
  .be-bar i { display: block; height: 100%; background: #1A6BFF; border-radius: 999px; }
  .be-nb { font-size: 11px; font-weight: 700; color: #D9690B; background: #FFF1E0; border-radius: 999px; padding: 2px 8px; white-space: nowrap; }
  .be-btn { display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; background: #1A6BFF; color: #fff; border: none; border-radius: 999px; padding: 0 14px; height: 30px; font-family: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer; white-space: nowrap; text-decoration: none; }
  .be-btn:hover { background: #0F5AE6; }
  .be-btn:disabled { opacity: .6; cursor: default; }
  @media (max-width: 760px) {
    .be { margin: 10px 12px 0; }
    .be-t { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .be-t > span, .be-bar, .be-btn-t { display: none; }
    .be-btn { width: 30px; padding: 0; justify-content: center; }
  }
`
