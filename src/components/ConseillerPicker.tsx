import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search, Sparkles, MapPin, UserPlus, UserX, Check } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { NiceSelectStyles } from '@/components/NiceSelect'
import { estMobile, positionCarte, type Position } from '@/lib/nice-select'
import { versConseiller, listeConseillers, suggere, charge, tauxReussite, memeVille, type Conseiller, type FiltreConseiller } from '@/lib/conseillers'
import { initialesNom, couleurAvatar, montantComplet } from '@/lib/affichage'

// Une seule lecture des statistiques pour tous les sélecteurs de la page (rafraîchie après 60 s).
let cache: { at: number; p: Promise<Conseiller[]> } | null = null
function chargerEquipe(force = false): Promise<Conseiller[]> {
  if (!force && cache && Date.now() - cache.at < 60_000) return cache.p
  const p = Promise.resolve(supabase.rpc('get_all_commercials_with_stats'))
    .then(({ data }) => ((data as any[]) || []).filter(r => !r.status || r.status === 'valide').map(versConseiller))
    .catch(() => [] as Conseiller[])
  cache = { at: Date.now(), p }
  return p
}

const FILTRES: { k: FiltreConseiller; label: string; icon?: React.ReactNode }[] = [
  { k: 'suggeres', label: 'Suggérés', icon: <Sparkles size={13}/> },
  { k: 'ville', label: 'Même ville', icon: <MapPin size={13}/> },
  { k: 'moins', label: 'Moins chargés' },
  { k: 'meilleurs', label: 'Meilleurs' },
]

/** Sélecteur de conseiller avec recherche, filtres, charge et résultats de chaque commercial. */
export default function ConseillerPicker({ value, onChange, villeLead, montant, placeholder = 'À assigner', className, retirer = true, nomSecours }: {
  value: string | null | undefined
  onChange: (id: string | null) => void
  villeLead?: string | null | undefined
  montant?: number | null | undefined
  placeholder?: string
  className?: string
  /** Affiche « Retirer le conseiller » quand un conseiller est déjà choisi. */
  retirer?: boolean
  /** Nom affiché si le conseiller assigné n'est plus dans la liste. */
  nomSecours?: string | undefined
}) {
  const [equipe, setEquipe] = useState<Conseiller[]>([])
  const [open, setOpen] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [pos, setPos] = useState<Position | null>(null)
  const [q, setQ] = useState('')
  const [filtre, setFiltre] = useState<FiltreConseiller>('suggeres')
  const btn = useRef<HTMLButtonElement>(null)
  const carte = useRef<HTMLDivElement>(null)
  const champ = useRef<HTMLInputElement>(null)

  useEffect(() => { chargerEquipe().then(setEquipe) }, [])
  const actuel = equipe.find(c => c.id === value)
  const libelle = value ? (actuel?.nom || nomSecours || 'Conseiller') : placeholder
  const liste = useMemo(() => listeConseillers(equipe, filtre, q, villeLead || undefined), [equipe, filtre, q, villeLead])
  const idSuggere = useMemo(() => suggere(equipe, villeLead || undefined), [equipe, villeLead])

  function placer() {
    const r = btn.current?.getBoundingClientRect()
    if (!r) return
    setPos(positionCarte({ top: r.top, bottom: r.bottom, left: r.left, width: r.width }, { largeur: window.innerWidth, hauteur: window.innerHeight }, 360))
  }
  function ouvrir() {
    setMobile(estMobile(window.innerWidth)); placer(); setQ(''); setFiltre('suggeres'); setOpen(true)
    chargerEquipe(true).then(setEquipe)
  }
  function fermer() { setOpen(false) }
  function choisir(id: string | null) { if (id !== (value || null)) onChange(id); fermer() }

  useLayoutEffect(() => { if (open && !mobile) placer() }, [open, mobile])
  useEffect(() => { if (open && !mobile) setTimeout(() => champ.current?.focus(), 30) }, [open, mobile])
  useEffect(() => {
    if (!open) return
    const dehors = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node
      if (btn.current?.contains(t) || carte.current?.contains(t)) return
      fermer()
    }
    const suivre = () => { if (!estMobile(window.innerWidth)) placer() }
    const echap = (e: KeyboardEvent) => { if (e.key === 'Escape') fermer() }
    document.addEventListener('mousedown', dehors); document.addEventListener('touchstart', dehors)
    window.addEventListener('resize', suivre); window.addEventListener('scroll', suivre, true); document.addEventListener('keydown', echap)
    return () => {
      document.removeEventListener('mousedown', dehors); document.removeEventListener('touchstart', dehors)
      window.removeEventListener('resize', suivre); window.removeEventListener('scroll', suivre, true); document.removeEventListener('keydown', echap)
    }
  }, [open])

  const contenu = (
    <div className="cp">
      <label className="cp-srch"><Search size={14}/><input ref={champ} value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un conseiller…" aria-label="Rechercher un conseiller"/></label>
      <div className="cp-f">{FILTRES.map(f => <button key={f.k} type="button" className={filtre === f.k ? 'on' : ''} onClick={() => setFiltre(f.k)}>{f.icon}{f.label}</button>)}</div>
      {(villeLead || montant) ? <div className="cp-lead">Lead : {[villeLead, montant ? montantComplet(montant) : ''].filter(Boolean).join(' · ')}</div> : null}
      <div className="cp-l" role="listbox" aria-label="Conseillers">
        {liste.length === 0 && <div className="cp-vide">{equipe.length ? 'Aucun conseiller pour ce filtre.' : 'Aucun commercial actif pour le moment.'}</div>}
        {liste.map(c => {
          const av = couleurAvatar(c.nom)
          const ch = charge(c, equipe)
          const t = tauxReussite(c)
          const sel = c.id === value
          return (
            <button key={c.id} type="button" role="option" aria-selected={sel} className={`cp-r${sel ? ' sel' : ''}${c.id === idSuggere ? ' sug' : ''}`} onClick={() => choisir(c.id)}>
              <span className="cp-av" style={{ background: av.fond, color: av.texte }}>{initialesNom(c.nom)}</span>
              <span className="cp-b">
                <span className="cp-n">{c.nom}{c.id === idSuggere && <i>Suggéré</i>}</span>
                <small>{c.ville || 'Ville non renseignée'}{memeVille(c, villeLead || undefined) ? ' · même ville que le client' : ''}</small>
                <span className="cp-st">
                  <span className="cp-ch"><span className="cp-bar"><i style={{ width: `${ch}%`, background: ch >= 70 ? '#F59E0B' : '#16A34A' }}/></span>{c.enCours} en cours</span>
                  <span>{c.finances ? <><b>{c.finances}</b> financé{c.finances > 1 ? 's' : ''}{t !== null ? ` · ${t} %` : ''}</> : 'Pas encore de financement'}</span>
                </span>
              </span>
              {sel && <Check size={16} className="cp-ok"/>}
            </button>
          )
        })}
      </div>
      {retirer && value && <button type="button" className="cp-retirer" onClick={() => choisir(null)}><UserX size={15}/>Retirer le conseiller</button>}
    </div>
  )

  return (
    <>
      <NiceSelectStyles/>
      <style>{CP_CSS}</style>
      <button ref={btn} type="button" aria-haspopup="listbox" aria-expanded={open} title="Choisir le conseiller"
        className={`ns-btn ns-compact cp-btn${value ? ' assigne' : ' vide'}${className ? ` ${className}` : ''}`} onClick={() => (open ? fermer() : ouvrir())}>
        <span className="ns-val">{!value && <UserPlus size={13}/>}<span className="ns-txt">{libelle}</span></span>
        <span className="ns-chev"><ChevronDown size={12} strokeWidth={2.5}/></span>
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        mobile ? (
          <div className="ns-ovr" onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
            <div ref={carte} className="ns-sheet cp-sheet"><div className="ns-grip"/><div className="ns-title">Choisir le conseiller</div>{contenu}</div>
          </div>
        ) : pos && (
          <div ref={carte} className="ns-card cp-card" onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}
            style={{ left: pos.left, width: Math.max(360, pos.width), maxHeight: Math.max(pos.maxHeight, 420), ...(pos.versLeHaut ? { bottom: window.innerHeight - pos.top } : { top: pos.top }) }}>
            {contenu}
          </div>
        ),
        document.body,
      )}
    </>
  )
}

const CP_CSS = `
  .cp-btn .ns-val { display: inline-flex; align-items: center; gap: 5px; }
  .cp-btn.assigne { background: #E8F8EE !important; color: #16A34A !important; border: none !important; border-radius: 999px !important; }
  .cp-btn.vide { background: #FFF3E0 !important; color: #C2410C !important; border: none !important; border-radius: 999px !important; }
  .cp-card { padding: 0 !important; display: flex; flex-direction: column; overflow: hidden !important; }
  .cp { display: flex; flex-direction: column; min-height: 0; flex: 1; font-family: -apple-system, "SF Pro Text", Inter, system-ui, sans-serif; color: #1D1D1F; }
  .cp-srch { display: flex; align-items: center; gap: 8px; margin: 12px 12px 0; height: 36px; padding: 0 12px; border-radius: 999px; background: #F5F5F7; color: #A1A1A6; }
  .cp-srch input { flex: 1; border: none; outline: none; background: transparent; font-family: inherit; font-size: 13.5px; color: #1D1D1F; min-width: 0; }
  .cp-f { display: flex; gap: 6px; padding: 10px 12px 4px; overflow-x: auto; scrollbar-width: none; }
  .cp-f button { flex: none; display: inline-flex; align-items: center; gap: 5px; height: 28px; padding: 0 11px; border-radius: 999px; border: none; background: #F5F5F7; color: #3A3A3C; font-family: inherit; font-size: 12px !important; font-weight: 500; cursor: pointer; }
  .cp-f button.on { background: #0D1B3E; color: #fff; }
  .cp-lead { font-size: 11.5px; color: #86868B; padding: 6px 14px 4px; }
  .cp-l { overflow-y: auto; flex: 1; min-height: 0; padding-bottom: 4px; }
  .cp-r { display: flex; align-items: center; gap: 11px; width: 100%; padding: 10px 14px; border: none; background: none; text-align: left; font-family: inherit; cursor: pointer; color: inherit; }
  .cp-r + .cp-r { border-top: 1px solid #F0F0F2; }
  .cp-r:hover { background: #F5F5F7; }
  .cp-r.sug { background: #F5F9FF; } .cp-r.sel { background: #EAF1FF; }
  .cp-av { width: 34px; height: 34px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex: none; }
  .cp-b { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .cp-n { display: flex; align-items: center; gap: 6px; font-size: 13.5px; font-weight: 600; }
  .cp-n i { font-style: normal; font-size: 10.5px; font-weight: 600; padding: 2px 7px; border-radius: 999px; background: #1A6BFF; color: #fff; }
  .cp-b small { font-size: 11.5px; color: #86868B; }
  .cp-st { display: flex; flex-wrap: wrap; gap: 4px 12px; align-items: center; margin-top: 5px; font-size: 11.5px; color: #86868B; }
  .cp-st b { color: #16A34A; font-weight: 600; }
  .cp-ch { display: inline-flex; align-items: center; gap: 6px; }
  .cp-bar { width: 64px; height: 5px; border-radius: 5px; background: #F0F0F2; overflow: hidden; display: inline-block; }
  .cp-bar i { display: block; height: 100%; border-radius: 5px; }
  .cp-ok { color: #1A6BFF; flex: none; }
  .cp-vide { padding: 22px 14px; text-align: center; font-size: 13px; color: #86868B; }
  .cp-retirer { display: flex; align-items: center; gap: 8px; border: none; border-top: 1px solid #F0F0F2; background: #fff; padding: 11px 14px; font-family: inherit; font-size: 13px !important; color: #DC2626; cursor: pointer; text-align: left; }
  .cp-sheet .cp-srch { margin-top: 4px; }
  .cp-sheet { max-height: 85vh; display: flex; flex-direction: column; }
`
