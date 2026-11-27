import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ShieldCheck, KeyRound, Eye, EyeOff, X, ChevronRight } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { informer } from '@/components/Dialogue'

// Le client crée ou change lui-même son mot de passe depuis son espace (personne d'autre ne le voit).
// Sans mot de passe : grande carte « Sécurisez votre accès ». Avec : simple ligne « Changer mon mot de passe ».

export default function MotDePasseClient({ variante }: { variante: 'carte' | 'ligne' }) {
  const [a, setA] = useState<boolean | null>(null)
  const [ouvert, setOuvert] = useState(false)
  useEffect(() => { supabase.rpc('client_a_mot_de_passe').then(({ data, error }) => { if (!error) setA(!!data) }) }, [])
  if (a === null) return null
  if (variante === 'carte' && a) return null
  return <>
    {variante === 'carte'
      ? <div className="mdp-carte">
          <span className="mdp-ic"><ShieldCheck size={20}/></span>
          <div className="mdp-t"><b>Sécurisez votre accès</b><small>Créez votre mot de passe pour vous connecter ensuite avec votre téléphone ou votre email.</small></div>
          <button type="button" className="mdp-b" onClick={() => setOuvert(true)}>Créer mon mot de passe</button>
        </div>
      : <button type="button" className="mdp-ligne" onClick={() => setOuvert(true)}>
          <i className="cx-r-ic" aria-hidden="true"><KeyRound size={15}/></i><span>{a ? 'Changer mon mot de passe' : 'Créer mon mot de passe'}</span><ChevronRight size={16}/>
        </button>}
    {ouvert && <Fenetre change={!!a} onClose={() => setOuvert(false)} onOk={() => { setA(true); setOuvert(false) }}/>}
    <style>{MDP_CSS}</style>
  </>
}

function Fenetre({ change, onClose, onOk }: { change: boolean; onClose: () => void; onOk: () => void }) {
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const [voir, setVoir] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  async function valider() {
    if (p1.length < 8) { setErr('8 caractères minimum.'); return }
    if (p1 !== p2) { setErr('Les deux mots de passe ne sont pas identiques.'); return }
    setBusy(true)
    const { error } = await supabase.rpc('client_set_password', { p_password: p1 })
    setBusy(false)
    if (error) { setErr(error.message); return }
    informer(change ? 'Mot de passe changé' : 'Mot de passe créé : vous pouvez vous connecter avec votre téléphone ou votre email', 'ok')
    onOk()
  }
  return createPortal(
    <div className="mdp-ovr" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <style>{MDP_CSS}</style>
      <div className="mdp-d" role="dialog" aria-modal="true" aria-label={change ? 'Changer mon mot de passe' : 'Créer mon mot de passe'}>
        <div className="mdp-h"><b>{change ? 'Changer mon mot de passe' : 'Créer mon mot de passe'}</b><button type="button" onClick={onClose} aria-label="Fermer"><X size={16}/></button></div>
        <p>Choisissez-le vous-même : votre conseiller et l'équipe Mayinvest ne le voient jamais.</p>
        <label>Nouveau mot de passe
          <span className="mdp-in"><input type={voir ? 'text' : 'password'} value={p1} autoComplete="new-password" onChange={e => { setP1(e.target.value); setErr('') }} placeholder="8 caractères minimum"/>
            <button type="button" onClick={() => setVoir(v => !v)} aria-label={voir ? 'Masquer' : 'Afficher'}>{voir ? <EyeOff size={16}/> : <Eye size={16}/>}</button></span>
        </label>
        <label>Confirmer
          <span className="mdp-in"><input type={voir ? 'text' : 'password'} value={p2} autoComplete="new-password" onChange={e => { setP2(e.target.value); setErr('') }} onKeyDown={e => { if (e.key === 'Enter') valider() }}/></span>
        </label>
        {err && <div className="mdp-err">{err}</div>}
        <div className="mdp-act"><button type="button" className="sec" onClick={onClose}>Annuler</button><button type="button" className="pri" disabled={busy} onClick={valider}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button></div>
      </div>
    </div>,
    document.body,
  )
}

const MDP_CSS = `
  .mdp-carte { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; background: #fff; border-radius: 18px; padding: 14px 16px; margin: 12px 0; box-shadow: 0 1px 2px rgba(13,27,62,.05); border: 1px solid #DCE7FF; }
  .mdp-ic { width: 40px; height: 40px; border-radius: 12px; background: #EAF1FF; color: #1A6BFF; display: inline-flex; align-items: center; justify-content: center; flex: none; }
  .mdp-t { flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 2px; }
  .mdp-t b { font-size: 14.5px; font-weight: 600; color: #0D1B3E; } .mdp-t small { font-size: 12.5px; color: #64748B; line-height: 1.45; }
  .mdp-b { height: 40px; padding: 0 16px; border-radius: 999px; border: none; background: #1A6BFF; color: #fff; font-family: inherit; font-size: 13.5px !important; font-weight: 600; cursor: pointer; }
  @media (max-width: 520px) { .mdp-b { width: 100%; } }
  .mdp-ligne { display: flex; align-items: center; gap: 12px; width: 100%; border: none; background: #fff; border-radius: 16px; padding: 11px 14px; font-family: inherit; font-size: 14px !important; color: #0D1B3E; cursor: pointer; text-align: left; box-shadow: 0 1px 2px rgba(13,27,62,.04); }
  .mdp-ligne span { flex: 1; font-weight: 500; } .mdp-ligne > svg { color: #94A3B8; }
  .mdp-ovr { position: fixed; inset: 0; z-index: 20000; background: rgba(13,27,62,.42); display: flex; align-items: center; justify-content: center; padding: 16px; font-family: -apple-system, "SF Pro Text", Inter, system-ui, sans-serif; }
  .mdp-d { width: 100%; max-width: 400px; background: #fff; border-radius: 22px; padding: 18px; box-shadow: 0 24px 60px rgba(13,27,62,.25); color: #0D1B3E; display: flex; flex-direction: column; gap: 12px; }
  .mdp-h { display: flex; justify-content: space-between; align-items: center; } .mdp-h b { font-size: 16.5px; font-weight: 700; }
  .mdp-h button { width: 30px; height: 30px; border-radius: 50%; border: none; background: #F2F2F7; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; color: #3A3A3C; }
  .mdp-d p { margin: 0; font-size: 13px; color: #64748B; line-height: 1.5; }
  .mdp-d label { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; font-weight: 600; color: #334155; }
  .mdp-in { position: relative; display: block; }
  .mdp-in input { width: 100%; box-sizing: border-box; height: 46px; border: 1px solid #E2E8F0; border-radius: 12px; padding: 0 44px 0 14px; font-family: inherit; font-size: 15px !important; outline: none; }
  .mdp-in input:focus { border-color: #1A6BFF; box-shadow: 0 0 0 3px rgba(26,107,255,.14); }
  .mdp-in button { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: 34px; height: 34px; border: none; background: transparent; color: #64748B; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
  .mdp-err { background: #FFF6EC; color: #8A4B0B; border-radius: 10px; padding: 9px 11px; font-size: 13px; }
  .mdp-act { display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px; }
  .mdp-act button { height: 42px; padding: 0 18px; border-radius: 999px; border: none; font-family: inherit; font-size: 14px !important; font-weight: 600; cursor: pointer; }
  .mdp-act .sec { background: #F2F2F7; color: #0D1B3E; } .mdp-act .pri { background: #1A6BFF; color: #fff; } .mdp-act .pri:disabled { opacity: .6; }
`
