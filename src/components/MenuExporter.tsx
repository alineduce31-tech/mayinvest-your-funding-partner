import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Download, FileSpreadsheet, FileText, FileType2 } from 'lucide-react'

/** Bouton « Exporter » avec son menu (Excel, CSV, PDF). Utilisé partout où l'on exporte une liste. */
export default function MenuExporter({ titre, onExcel, onCsv, onPdf }: {
  /** Petit titre du menu, ex. « Exporter 27 dossiers » */
  titre: string
  onExcel: () => void
  onCsv: () => void
  onPdf: () => void
}) {
  const [ouvert, setOuvert] = useState(false)
  const zone = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ouvert) return
    const dehors = (e: Event) => { if (zone.current && !zone.current.contains(e.target as Node)) setOuvert(false) }
    const echap = (e: KeyboardEvent) => { if (e.key === 'Escape') setOuvert(false) }
    document.addEventListener('mousedown', dehors); document.addEventListener('touchstart', dehors); document.addEventListener('keydown', echap)
    return () => { document.removeEventListener('mousedown', dehors); document.removeEventListener('touchstart', dehors); document.removeEventListener('keydown', echap) }
  }, [ouvert])
  const choix = (f: () => void) => () => { setOuvert(false); f() }
  const formats = [
    { cle: 'xlsx', nom: 'Excel', desc: 'Tableau à trier et filtrer', ext: '.xlsx', ic: <FileSpreadsheet size={18}/>, action: onExcel },
    { cle: 'csv', nom: 'CSV', desc: 'Pour un autre logiciel', ext: '.csv', ic: <FileText size={18}/>, action: onCsv },
    { cle: 'pdf', nom: 'PDF', desc: 'Pour imprimer ou partager', ext: '.pdf', ic: <FileType2 size={18}/>, action: onPdf },
  ]
  return (
    <div className="mx" ref={zone}>
      <style>{CSS}</style>
      <button type="button" className="mx-btn" onClick={() => setOuvert(o => !o)} aria-expanded={ouvert} aria-haspopup="menu">
        <Download size={14}/>Exporter<ChevronDown size={13} className={ouvert ? 'mx-rot' : ''}/>
      </button>
      {ouvert && (
        <div className="mx-menu" role="menu">
          <div className="mx-t">{titre}</div>
          {formats.map(f => (
            <button key={f.cle} type="button" role="menuitem" className="mx-it" onClick={choix(f.action)}>
              <span className={`mx-ic ${f.cle}`} aria-hidden="true">{f.ic}</span>
              <span className="mx-txt"><b>{f.nom}</b><small>{f.desc}</small></span>
              <span className="mx-ext">{f.ext}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const CSS = `
  .mx { position: relative; margin-left: auto; }
  .mx-btn { display: inline-flex; align-items: center; gap: 7px; height: 36px; padding: 0 15px; border-radius: 999px; border: none; background: #0D1B3E; color: #fff; font-family: inherit; font-size: 13px !important; font-weight: 600; cursor: pointer; white-space: nowrap; }
  .mx-btn:hover { background: #16264D; }
  .mx-btn svg { transition: transform .15s; } .mx-btn .mx-rot { transform: rotate(180deg); }
  .mx-menu { position: absolute; right: 0; top: calc(100% + 8px); z-index: 60; width: 290px; max-width: calc(100vw - 24px); box-sizing: border-box; background: #fff; border-radius: 18px; border: 1px solid #EEF1F6; box-shadow: 0 16px 40px rgba(13,27,62,.16); padding: 8px; animation: mxIn .14s ease; }
  @keyframes mxIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
  .mx-t { font-size: 11px; color: #94A3B8; font-weight: 600; padding: 6px 10px 8px; }
  .mx-it { display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px; border: none; background: none; border-radius: 12px; font-family: inherit; cursor: pointer; text-align: left; }
  .mx-it:hover, .mx-it:focus-visible { background: #F5F7FB; outline: none; }
  .mx-ic { width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .mx-ic.xlsx { background: #E8F5EC; color: #1E7A43; } .mx-ic.csv { background: #EAF1FF; color: #1A6BFF; } .mx-ic.pdf { background: #FDECEC; color: #C0392B; }
  .mx-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .mx-txt b { font-size: 13.5px !important; font-weight: 600; color: #0D1B3E; }
  .mx-txt small { font-size: 12px !important; color: #64748B; }
  .mx-ext { font-size: 11px !important; color: #94A3B8; }
`
