import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bell, BellRing, Clock, Sunset, Sun, CalendarDays, CalendarClock, ChevronRight, ChevronLeft, X } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import {
  choixRapides, joursProposes, HEURES_PROPOSEES, combiner, lireHeure, heureTexte, libelleRappel,
  estDansLeFutur, aSonner, cleSonnerie,
} from '@/lib/rappels'
import { positionCarte, estMobile, type Position } from '@/lib/nice-select'
import type { Rappels } from '@/lib/messagerie-commercial'

const EVT = 'mi-rappels-change'

// ============ DONNÉES (base Supabase) ============
export function useRappels(commercialId: string) {
  const [rappels, setRappels] = useState<Rappels>({})

  async function charger() {
    const { data, error } = await supabase.rpc('commercial_rappels')
    if (error || !data) return
    const r: Rappels = {}
    for (const x of data as { lead_id: string; due_at: string }[]) r[x.lead_id] = new Date(x.due_at).getTime()
    setRappels(r)
  }

  useEffect(() => {
    let annule = false
    ;(async () => {
      // Reprise des anciens rappels gardés dans le navigateur
      const cle = `mi_rappels_${commercialId}`
      try {
        const anciens = JSON.parse(localStorage.getItem(cle) || '{}') as Rappels
        const futurs = Object.entries(anciens).filter(([, at]) => at > Date.now())
        for (const [id, at] of futurs) await supabase.rpc('commercial_set_rappel', { p_lead_id: id, p_due_at: new Date(at).toISOString() })
        localStorage.removeItem(cle)
      } catch {}
      if (!annule) await charger()
    })()
    const relire = () => { charger() }
    window.addEventListener(EVT, relire)
    const t = setInterval(charger, 5 * 60_000)
    return () => { annule = true; window.removeEventListener(EVT, relire); clearInterval(t) }
  }, [commercialId])

  async function poser(leadId: string, at: number | null): Promise<string | null> {
    const avant = rappels
    setRappels(prev => {
      const next = { ...prev }
      if (at === null) delete next[leadId]
      else next[leadId] = at
      return next
    })
    const { error } = await supabase.rpc('commercial_set_rappel', { p_lead_id: leadId, p_due_at: at === null ? null : new Date(at).toISOString() })
    if (error) { setRappels(avant); return error.message || 'Rappel non enregistré.' }
    window.dispatchEvent(new Event(EVT))
    return null
  }

  return { rappels, poser }
}

// ============ CHOIX DU RAPPEL ============
const ICONES = { heure: <Clock size={16}/>, soir: <Sunset size={16}/>, demain: <Sun size={16}/>, lundi: <CalendarDays size={16}/> }

export function RappelPicker({ value, onChange, className, compact }: { value: number | null; onChange: (at: number | null) => Promise<string | null> | void; className?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const [libre, setLibre] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [pos, setPos] = useState<Position | null>(null)
  const [jour, setJour] = useState(1)
  const [heure, setHeure] = useState<{ h: number; m: number } | null>(null)
  const [autre, setAutre] = useState('')
  const [err, setErr] = useState('')
  const btn = useRef<HTMLButtonElement>(null)
  const carte = useRef<HTMLDivElement>(null)
  const now = Date.now()

  function placer() {
    const r = btn.current?.getBoundingClientRect()
    if (r) setPos(positionCarte({ top: r.top, bottom: r.bottom, left: r.left, width: r.width }, { largeur: window.innerWidth, hauteur: window.innerHeight }, 300))
  }
  function ouvrir() {
    setMobile(estMobile(window.innerWidth)); setLibre(false); setErr(''); setHeure(null); setAutre(''); setJour(1)
    placer(); setOpen(true)
  }
  useLayoutEffect(() => { if (open && !mobile) placer() }, [open, mobile, libre])
  useEffect(() => {
    if (!open) return
    function dehors(e: MouseEvent | TouchEvent) {
      const t = e.target as Node
      if (btn.current?.contains(t) || carte.current?.contains(t)) return
      setOpen(false)
    }
    function esc(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', dehors); document.addEventListener('touchstart', dehors); document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', dehors); document.removeEventListener('touchstart', dehors); document.removeEventListener('keydown', esc) }
  }, [open])

  async function valider(at: number) {
    if (!estDansLeFutur(at, Date.now())) { setErr('Cette heure est déjà passée.'); return }
    const e = await onChange(at)
    if (e) { setErr(e); return }
    setOpen(false)
  }

  const jours = joursProposes(now)
  const jourChoisi = jours[jour]?.date ?? jours[0]!.date
  const heureLibre = lireHeure(autre)
  const choix = heure ?? heureLibre
  const atLibre = choix ? combiner(jourChoisi, choix.h, choix.m) : null

  const contenu = !libre ? (
    <>
      <div className="rp-head">Me rappeler de ce client</div>
      {choixRapides(now).map(c => (
        <button key={c.cle} className={`rp-opt${value === c.at ? ' sel' : ''}`} onClick={() => valider(c.at)}>
          <span className="rp-ic">{ICONES[c.cle]}</span><span className="rp-lbl">{c.libelle}</span>
          <span className="rp-when">{c.cle === 'heure' || c.cle === 'soir' ? heureTexte(c.at) : `${new Date(c.at).toLocaleDateString('fr-FR', { weekday: 'short' })} ${heureTexte(c.at)}`}</span>
        </button>
      ))}
      <div className="rp-sep"/>
      <button className="rp-opt" onClick={() => { setLibre(true); setErr('') }}>
        <span className="rp-ic"><CalendarClock size={16}/></span><span className="rp-lbl">Choisir la date et l'heure</span><ChevronRight size={16} className="rp-chev"/>
      </button>
      {value && (
        <button className="rp-opt danger" onClick={async () => { await onChange(null); setOpen(false) }}>
          <span className="rp-ic"><X size={16}/></span><span className="rp-lbl">Annuler le rappel ({libelleRappel(value, now)})</span>
        </button>
      )}
      {err && <div className="rp-err">{err}</div>}
    </>
  ) : (
    <div className="rp-free">
      <button className="rp-back" onClick={() => setLibre(false)}><ChevronLeft size={16}/>Retour</button>
      <div className="rp-sub">Jour</div>
      <div className="rp-chips">
        {jours.map((j, i) => <button key={i} className={`rp-chip${i === jour ? ' on' : ''}`} onClick={() => { setJour(i); setErr('') }}>{j.libelle}</button>)}
      </div>
      <div className="rp-sub">Heure</div>
      <div className="rp-hours">
        {HEURES_PROPOSEES.map(x => {
          const passe = !estDansLeFutur(combiner(jourChoisi, x.h, x.m), now)
          const on = heure && heure.h === x.h && heure.m === x.m
          return <button key={`${x.h}${x.m}`} disabled={passe} className={`rp-hour${on ? ' on' : ''}`} onClick={() => { setHeure(x); setAutre(''); setErr('') }}>{heureTexte(combiner(jourChoisi, x.h, x.m))}</button>
        })}
      </div>
      <label className="rp-other">Autre heure
        <input type="time" value={autre} onChange={e => { setAutre(e.target.value); setHeure(null); setErr('') }}/>
      </label>
      {err && <div className="rp-err">{err}</div>}
      <button className="rp-go" disabled={!atLibre} onClick={() => atLibre && valider(atLibre)}>
        <Bell size={16}/>{atLibre ? `Me rappeler ${libelleRappel(atLibre, now)}` : 'Choisis une heure'}
      </button>
    </div>
  )

  return (
    <>
      <RappelStyles/>
      <button ref={btn} type="button" className={`${className || ''}${value ? ' on' : ''}`} onClick={(e) => { e.stopPropagation(); open ? setOpen(false) : ouvrir() }} aria-haspopup="dialog" aria-expanded={open}
        aria-label={compact ? (value ? `Rappel ${libelleRappel(value, now)}` : 'Me rappeler de ce client') : undefined} title={compact ? (value ? `Rappel ${libelleRappel(value, now)}` : 'Me rappeler') : undefined}>
        {compact ? (value ? <BellRing size={14}/> : <Bell size={14}/>)
          : value ? <><BellRing size={13} style={{ verticalAlign: '-2px', marginRight: 5 }}/>Rappel {libelleRappel(value, now)}</> : <><Bell size={13} style={{ verticalAlign: '-2px', marginRight: 5 }}/>Me rappeler</>}
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        mobile ? (
          <div className="rp-ovr" onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
            <div ref={carte} className="rp-sheet" role="dialog" aria-label="Programmer un rappel"><div className="rp-grip"/>{contenu}</div>
          </div>
        ) : pos && (
          <div ref={carte} className="rp-card" role="dialog" aria-label="Programmer un rappel" onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}
            style={{ left: pos.left, width: Math.max(pos.width, 320), ...(pos.versLeHaut ? { bottom: window.innerHeight - pos.top } : { top: pos.top }) }}>
            {contenu}
          </div>
        ),
        document.body,
      )}
    </>
  )
}

// ============ ALERTE À L'HEURE DU RAPPEL ============
function bip() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    ;[0, 0.22].forEach((t, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain()
      o.type = 'sine'; o.frequency.value = i ? 1046 : 784
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t)
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.35)
      o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.4)
    })
    setTimeout(() => ctx.close(), 1000)
  } catch {}
}

export function RappelAlarme({ commercialId, noms, onOpen }: { commercialId: string; noms: Record<string, string>; onOpen: (leadId: string) => void }) {
  const { rappels, poser } = useRappels(commercialId)
  const [actifs, setActifs] = useState<string[]>([])
  const cle = `mi_rappels_sonnes_${commercialId}`

  useEffect(() => {
    function verifier() {
      let sonnes: Set<string>
      try { sonnes = new Set(JSON.parse(localStorage.getItem(cle) || '[]')) } catch { sonnes = new Set() }
      const nouveaux = aSonner(rappels, Date.now(), sonnes)
      if (!nouveaux.length) return
      nouveaux.forEach(id => sonnes.add(cleSonnerie(id, rappels[id]!)))
      try { localStorage.setItem(cle, JSON.stringify([...sonnes].slice(-200))) } catch {}
      setActifs(a => [...a, ...nouveaux.filter(id => !a.includes(id))])
      bip()
    }
    verifier()
    const t = setInterval(verifier, 20_000)
    return () => clearInterval(t)
  }, [rappels, cle])

  if (!actifs.length) return null
  const fermer = (id: string) => setActifs(a => a.filter(x => x !== id))
  return (
    <>
      <RappelStyles/>
      <div className="ra-stack" role="status" aria-live="polite">
        {actifs.map(id => (
          <div key={id} className="ra-toast">
            <span className="ra-ic"><BellRing size={18}/></span>
            <div className="ra-body">
              <b>Rappel : {noms[id] || 'un client'}</b>
              <span>C'est l'heure de reprendre contact.</span>
              <div className="ra-actions">
                <button className="ra-main" onClick={() => { fermer(id); poser(id, null); onOpen(id) }}>Ouvrir la conversation</button>
                <button onClick={() => { fermer(id); poser(id, Date.now() + 3_600_000) }}>Dans 1 h</button>
              </div>
            </div>
            <button className="ra-x" aria-label="Fermer" onClick={() => { fermer(id); poser(id, null) }}><X size={14}/></button>
          </div>
        ))}
      </div>
    </>
  )
}

function RappelStyles() {
  useEffect(() => {
    if (document.getElementById('rp-styles')) return
    const el = document.createElement('style'); el.id = 'rp-styles'; el.textContent = RP_CSS; document.head.appendChild(el)
  }, [])
  return null
}

const RP_CSS = `
  .rp-card, .rp-ovr, .ra-stack { font-family: 'Inter', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased; color: #0D1B3E; }
  .rp-card { position: fixed; z-index: 10000; background: #fff; border: 1px solid #E5E7EB; border-radius: 14px; padding: 6px; box-shadow: 0 16px 40px rgba(13,27,62,.16), 0 2px 6px rgba(13,27,62,.06); animation: rpIn .12s ease-out; }
  @keyframes rpIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
  .rp-head { font-size: 13px; font-weight: 700; padding: 8px 10px 6px; }
  .rp-opt { width: 100%; display: flex; align-items: center; gap: 12px; padding: 9px 10px; border: none; background: none; border-radius: 10px; font-family: inherit; font-size: 14px; color: #0D1B3E; cursor: pointer; text-align: left; }
  .rp-opt:hover { background: #F6F7F9; }
  .rp-opt.sel { background: #EEF4FF; color: #1A6BFF; }
  .rp-opt.danger { color: #B91C1C; }
  .rp-opt.danger .rp-ic { background: #FEF2F2; color: #B91C1C; }
  .rp-ic { width: 30px; height: 30px; flex: none; border-radius: 8px; background: #F3F4F6; color: #6B7280; display: flex; align-items: center; justify-content: center; }
  .rp-opt.sel .rp-ic { background: #fff; color: #1A6BFF; }
  .rp-lbl { flex: 1; min-width: 0; }
  .rp-when { font-size: 12px; color: #6B7280; white-space: nowrap; }
  .rp-chev { color: #9CA3AF; }
  .rp-sep { border-top: 1px solid #F1F2F4; margin: 4px 8px; }
  .rp-err { margin: 6px 10px 4px; font-size: 12.5px; color: #B91C1C; font-weight: 600; }
  .rp-free { padding: 6px 8px 8px; }
  .rp-back { display: inline-flex; align-items: center; gap: 4px; border: none; background: none; font-family: inherit; font-size: 13px; font-weight: 600; color: #64748B; cursor: pointer; padding: 4px 2px; }
  .rp-sub { font-size: 12px; font-weight: 600; color: #64748B; margin: 10px 2px 8px; }
  .rp-chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .rp-chip, .rp-hour { border: 1px solid #E5E7EB; background: #fff; font-family: inherit; font-size: 13px; font-weight: 600; color: #334155; cursor: pointer; }
  .rp-chip { padding: 7px 11px; border-radius: 999px; }
  .rp-hours { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
  .rp-hour { padding: 8px 0; border-radius: 9px; }
  .rp-hour:disabled { opacity: .35; cursor: default; text-decoration: line-through; }
  .rp-chip.on, .rp-hour.on { background: #EEF4FF; border-color: #1A6BFF; color: #1A6BFF; }
  .rp-other { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 12px 2px 0; font-size: 13px; font-weight: 600; color: #64748B; }
  .rp-other input { border: 1px solid #E5E7EB; border-radius: 9px; padding: 7px 10px; font-family: inherit; font-size: 14px; color: #0D1B3E; }
  .rp-go { width: 100%; margin-top: 14px; display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; border: none; border-radius: 999px; background: #111; color: #fff; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
  .rp-go:hover:not(:disabled) { background: #1A6BFF; }
  .rp-go:disabled { background: #E5E7EB; color: #9CA3AF; cursor: default; }
  .rp-ovr { position: fixed; inset: 0; z-index: 10000; background: rgba(13,27,62,.35); display: flex; align-items: flex-end; }
  .rp-sheet { width: 100%; max-height: 85vh; overflow-y: auto; background: #fff; border-radius: 20px 20px 0 0; padding: 8px 10px calc(16px + env(safe-area-inset-bottom)); animation: rpUp .2s ease-out; }
  @keyframes rpUp { from { transform: translateY(100%); } to { transform: none; } }
  .rp-grip { width: 40px; height: 4px; border-radius: 4px; background: #E5E7EB; margin: 4px auto 8px; }
  .rp-sheet .rp-opt { padding: 12px 10px; font-size: 15px; }
  .ra-stack { position: fixed; right: 20px; bottom: 20px; z-index: 10001; display: flex; flex-direction: column; gap: 10px; width: min(360px, calc(100vw - 32px)); }
  @media (max-width: 900px) { .ra-stack { left: 16px; right: 16px; width: auto; bottom: calc(var(--bnav-h, 0px) + 16px); top: auto; } }
  .ra-toast { display: flex; gap: 12px; align-items: flex-start; background: #0D1B3E; color: #fff; border-radius: 16px; padding: 14px; box-shadow: 0 20px 40px rgba(13,27,62,.35); animation: rpIn .2s ease-out; }
  .ra-ic { width: 36px; height: 36px; flex: none; border-radius: 10px; background: #1A6BFF; display: flex; align-items: center; justify-content: center; animation: raRing 1s ease-in-out 2; }
  @keyframes raRing { 0%,100% { transform: rotate(0); } 20% { transform: rotate(-14deg); } 40% { transform: rotate(12deg); } 60% { transform: rotate(-8deg); } 80% { transform: rotate(5deg); } }
  .ra-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .ra-body b { font-size: 14px; }
  .ra-body > span { font-size: 12.5px; color: rgba(255,255,255,.7); }
  .ra-actions { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
  .ra-actions button { border: 1px solid rgba(255,255,255,.2); background: transparent; color: #fff; border-radius: 999px; padding: 7px 12px; font-family: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer; }
  .ra-actions .ra-main { background: #fff; color: #0D1B3E; border-color: #fff; }
  .ra-x { border: none; background: rgba(255,255,255,.08); color: rgba(255,255,255,.8); width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; flex: none; }
`
