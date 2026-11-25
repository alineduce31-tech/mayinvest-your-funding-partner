import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/integrations/supabase/client'
import qrcode from '@/lib/vendor/qrcode-generator'
import { appelDirect, lienTel, lienWhatsapp, noteAppel, numeroAffiche } from '@/lib/appel'

type Moyen = 'telephone' | 'ordinateur' | 'whatsapp' | 'manuel'

/**
 * Bouton « Appeler ».
 * Téléphone : lance l'appel directement.
 * Ordinateur / tablette : fenêtre avec numéro, QR code à scanner, appel depuis l'ordinateur et WhatsApp.
 * Si leadId est fourni, l'appel est noté dans le dossier (note interne, invisible pour le client).
 */
export default function CallButton({ tel, nom, leadId, className, style, title, children, onLogged }: {
  tel: string | null | undefined
  nom?: string | null | undefined
  leadId?: string | null | undefined
  className?: string | undefined
  style?: React.CSSProperties | undefined
  title?: string | undefined
  children: ReactNode
  onLogged?: (() => void) | undefined
}) {
  const [open, setOpen] = useState(false)
  const href = lienTel(tel)
  if (!href) return null

  async function noter(moyen: Moyen) {
    if (!leadId || !tel) return
    const { error } = await supabase.rpc('send_internal_note', { p_lead_id: leadId, p_content: noteAppel(tel, new Date(), moyen) })
    if (!error) onLogged?.()
  }

  function onClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const tactile = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
    if (appelDirect(window.innerWidth, tactile)) {
      noter('telephone')
      window.location.href = href!
    } else {
      setOpen(true)
    }
  }

  return (
    <>
      <button type="button" className={className} style={{ cursor: 'pointer', fontFamily: 'inherit', ...(className ? {} : { border: 'none' }), ...style }} onClick={onClick} title={title || `Appeler ${nom || ''}`.trim()}>{children}</button>
      {open && typeof document !== 'undefined' && createPortal(
        <CallSheet tel={tel!} nom={nom} canLog={!!leadId} onClose={() => setOpen(false)} onLog={noter}/>,
        document.body,
      )}
    </>
  )
}

function QrSvg({ data, size = 176 }: { data: string; size?: number }) {
  const cells = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(data)
    qr.make()
    const n = qr.getModuleCount()
    const rects: string[] = []
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) rects.push(`M${c} ${r}h1v1h-1z`)
    return { n, d: rects.join('') }
  }, [data])
  const m = 2
  return (
    <svg width={size} height={size} viewBox={`${-m} ${-m} ${cells.n + m * 2} ${cells.n + m * 2}`} shapeRendering="crispEdges" role="img" aria-label="QR code pour lancer l'appel">
      <rect x={-m} y={-m} width={cells.n + m * 2} height={cells.n + m * 2} fill="#fff"/>
      <path d={cells.d} fill="#0D1B3E"/>
    </svg>
  )
}

function CallSheet({ tel, nom, canLog, onClose, onLog }: { tel: string; nom?: string | null | undefined; canLog: boolean; onClose: () => void; onLog: (m: Moyen) => Promise<void> }) {
  const [copied, setCopied] = useState(false)
  const [logged, setLogged] = useState(false)
  const href = lienTel(tel)!
  const wa = lienWhatsapp(tel)

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  async function log(m: Moyen) {
    if (logged) return
    setLogged(true)
    await onLog(m)
  }

  return (
    <div className="cs-bg" onClick={onClose}>
      <div className="cs-card" role="dialog" aria-modal="true" aria-label={`Appeler ${nom || ''}`} onClick={e => e.stopPropagation()}>
        <div className="cs-head">
          <div>
            <div className="cs-kicker">Appeler</div>
            <div className="cs-name">{nom || 'Le client'}</div>
          </div>
          <button className="cs-x" onClick={onClose} aria-label="Fermer">×</button>
        </div>

        <div className="cs-num">
          <span>{numeroAffiche(tel)}</span>
          <button className="cs-copy" onClick={() => { navigator.clipboard?.writeText(numeroAffiche(tel)).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) }) }}>
            {copied ? 'Copié' : 'Copier'}
          </button>
        </div>

        <div className="cs-qr">
          <QrSvg data={href}/>
          <div className="cs-qr-t">
            <b>Scannez avec votre téléphone</b>
            <span>Ouvrez l'appareil photo et visez le code : l'appel se lance tout seul, sans rien taper.</span>
          </div>
        </div>

        <div className="cs-actions">
          <a className="cs-btn dark" href={href} onClick={() => log('ordinateur')}>
            <PhoneIc/>Appeler depuis cet appareil
          </a>
          {wa && (
            <a className="cs-btn green" href={wa} target="_blank" rel="noopener noreferrer" onClick={() => log('whatsapp')}>
              <WaIc/>Appel WhatsApp
            </a>
          )}
        </div>
        <div className="cs-hint">« Depuis cet appareil » fonctionne sur une tablette avec carte SIM, ou sur un ordinateur relié à votre téléphone (Lien avec Windows, iPhone sur Mac).</div>

        {canLog && (
          <button className={`cs-log ${logged ? 'done' : ''}`} onClick={() => log('manuel')} disabled={logged}>
            {logged ? 'Appel noté dans le dossier' : 'Appel passé : le noter dans le dossier'}
          </button>
        )}
      </div>
      <style>{`
        .cs-bg { position: fixed; inset: 0; background: rgba(13,27,62,0.45); z-index: 3000; display: flex; align-items: center; justify-content: center; padding: 16px; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; animation: cs-fade 0.15s ease-out; }
        @keyframes cs-fade { from { opacity: 0; } to { opacity: 1; } }
        .cs-card { background: #fff; border-radius: 22px; width: 100%; max-width: 400px; padding: 18px; box-shadow: 0 30px 70px rgba(13,27,62,0.35); display: flex; flex-direction: column; gap: 14px; color: #0F1729; max-height: calc(100vh - 32px); overflow-y: auto; animation: cs-up 0.2s ease-out; }
        @keyframes cs-up { from { transform: translateY(12px); opacity: 0; } to { transform: none; opacity: 1; } }
        .cs-head { display: flex; justify-content: space-between; align-items: flex-start; }
        .cs-kicker { font-size: 11px; font-weight: 800; color: #64748B; letter-spacing: 0.08em; text-transform: uppercase; }
        .cs-name { font-size: 18px; font-weight: 800; color: #0D1B3E; margin-top: 2px; }
        .cs-x { border: none; background: #F1F5F9; width: 32px; height: 32px; border-radius: 50%; font-size: 19px; cursor: pointer; color: #0D1B3E; flex-shrink: 0; }
        .cs-num { display: flex; align-items: center; justify-content: space-between; gap: 10px; background: #F8FAFC; border: 1px solid #E8ECF3; border-radius: 14px; padding: 12px 12px 12px 16px; }
        .cs-num span { font-size: 24px; font-weight: 800; letter-spacing: 0.02em; color: #0D1B3E; font-variant-numeric: tabular-nums; }
        .cs-copy { border: 1.5px solid #E5E7EB; background: #fff; border-radius: 100px; padding: 7px 14px; font-family: inherit; font-size: 12.5px; font-weight: 800; color: #1A6BFF; cursor: pointer; }
        .cs-qr { display: flex; align-items: center; gap: 14px; border: 1px dashed #BFD4FF; background: #F5F8FF; border-radius: 16px; padding: 10px 14px 10px 10px; }
        .cs-qr svg { flex-shrink: 0; border-radius: 10px; width: 132px; height: 132px; }
        .cs-qr-t { display: flex; flex-direction: column; gap: 4px; font-size: 12.5px; color: #475569; line-height: 1.45; }
        .cs-qr-t b { font-size: 13.5px; color: #0D1B3E; }
        .cs-actions { display: flex; flex-direction: column; gap: 8px; }
        .cs-btn { display: flex; align-items: center; justify-content: center; gap: 9px; border-radius: 100px; padding: 12px 16px; font-size: 14px; font-weight: 800; text-decoration: none; }
        .cs-btn.dark { background: #0D1B3E; color: #fff; }
        .cs-btn.dark:hover { color: #fff; background: #1A2F5F; }
        .cs-btn.green { background: #16A34A; color: #fff; }
        .cs-btn.green:hover { color: #fff; background: #15803D; }
        .cs-hint { font-size: 11.5px; color: #94A3B8; line-height: 1.45; text-align: center; margin-top: -4px; }
        .cs-log { border: 1.5px solid #E5E7EB; background: #fff; border-radius: 100px; padding: 10px; font-family: inherit; font-size: 13px; font-weight: 800; color: #0D1B3E; cursor: pointer; }
        .cs-log.done { border-color: #BBF7D0; background: #F0FDF4; color: #15803D; cursor: default; }
        @media (max-width: 420px) { .cs-qr { flex-direction: column; text-align: center; } .cs-qr svg { width: 160px; height: 160px; } }
      `}</style>
    </div>
  )
}

const PhoneIc = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round"/></svg>
const WaIc = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1.1 2.7.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.7-.3z"/></svg>
