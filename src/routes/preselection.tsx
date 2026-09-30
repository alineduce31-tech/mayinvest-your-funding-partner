import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Logo } from '@/components/Logo'

export const Route = createFileRoute('/preselection')({
  component: Preselection,
})

const ACTIVITES_PHYSIQUE = ['Fonctionnaire', 'Salarié privé', 'Commerçant', 'Artisan', 'Profession libérale', 'Agriculteur', 'Autre']
const ACTIVITES_MORALE = ['Commerce', 'Tourisme', 'BTP', 'Industrie / Bois', 'Agriculture', 'Transport', 'Santé', 'Tech', 'Autre']
const BANQUES = ['BGFI Bank', 'UBA', 'LCB Bank', 'MUCODEC', 'Crédit du Congo', 'Ecobank', 'Autre', 'Aucune']
const VILLES = ['Brazzaville', 'Pointe-Noire', 'Dolisie', 'Nkayi', 'Ouesso', 'Autre']

function calc(type: string, d: Record<string, string>) {
  let s = 0
  if (type === 'physique') {
    if (parseInt(d.anciennete||'0') >= 6) s += 25
    if (d.salaire_domic === 'Oui') s += 25
    if (parseInt(d.revenu||'0') >= 200000) s += 20
    if (d.banque && d.banque !== 'Aucune') s += 15
    if (parseInt(d.montant||'0') <= 10000000) s += 15
  } else {
    if (d.rccm === 'Oui') s += 30
    if (d.compte_mouvemente === 'Oui') s += 25
    if (parseInt(d.anciennete_soc||'0') >= 12) s += 20
    if (d.refus_bancaire === 'Non') s += 15
    if (d.garanties === 'Oui') s += 10
  }
  return Math.min(s, 100)
}

function Preselection() {
  const navigate = useNavigate()
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const initType = params.get('type') === 'morale' ? 'morale' : params.get('type') === 'physique' ? 'physique' : ''
  const [type, setType] = useState<'physique' | 'morale' | ''>(initType as any)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(initType ? 2 : 1)
  const [activite, setActivite] = useState('')
  const [form, setForm] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [score, setScore] = useState(0)
  const [leadId, setLeadId] = useState('')
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const isP = type === 'physique'

  async function soumettre() {
    setLoading(true)
    const s = calc(type, form)
    const nonEligible = isP
      ? (parseInt(form.anciennete||'0') < 6) || form.salaire_domic === 'Non'
      : form.rccm === 'Non'
    const payload = {
      type: isP ? 'personne physique' : 'personne morale',
      activite, ville: form.ville || '',
      montant_demande: parseInt(form.montant||'0'),
      banque_actuelle: form.banque || '',
      statut: nonEligible ? 'Non Éligible' : 'Nouveau',
      score: s,
      identite: { nom: form.nom, prenom: form.prenom, tel: form.tel, email: form.email },
      situation: isP
        ? { employeur: form.employeur, anciennete: form.anciennete, revenu: form.revenu }
        : { raison_sociale: form.raison_sociale, dirigeant: form.dirigeant, rccm: form.rccm, niu: form.niu, anciennete: form.anciennete_soc, ca_annuel: form.ca_annuel },
      besoin: { montant: form.montant, objet: form.objet, banque: form.banque, flux_mois: form.flux_mois },
      eligibilite: isP
        ? { anciennete_ok: parseInt(form.anciennete||'0') >= 6, salaire_domic: form.salaire_domic }
        : { compte_mouvemente: form.compte_mouvemente, refus_bancaire: form.refus_bancaire, garanties: form.garanties },
    }
    const { data, error } = await supabase.from('leads').insert(payload).select('id').single()
    setLoading(false)
    if (!error && data) { setLeadId(data.id); setScore(s); setStep(4); window.scrollTo({top:0,behavior:'smooth'}) }
  }

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#FFFFFF', color: '#111111', minHeight: '100vh', WebkitFontSmoothing: 'antialiased' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        .nav { height: 72px; padding: 0 60px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #F0F0F0; }
        @media (max-width: 640px) { .nav { height: 60px; padding: 0 20px; } }
        .nav-btn { background: #111; color: #fff; font-family: inherit; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 100px; border: none; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        @media (max-width: 640px) { .nav-btn { padding: 10px 20px; font-size: 13px; } }
        .wrap { max-width: 720px; margin: 0 auto; padding: 60px 60px 100px; }
        @media (max-width: 900px) { .wrap { padding: 48px 32px 80px; } }
        @media (max-width: 640px) { .wrap { padding: 32px 20px 60px; } }
        .steps-bar { display: flex; gap: 8px; margin-bottom: 14px; }
        .step-dot { flex: 1; height: 5px; border-radius: 100px; background: #F0F0F0; }
        .step-dot.on { background: #1A6BFF; }
        .step-label { font-size: 13px; font-weight: 600; color: #1A6BFF; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 22px; }
        .h1 { font-size: 44px; font-weight: 800; letter-spacing: -1.5px; color: #111; line-height: 1.1; margin-bottom: 16px; }
        @media (max-width: 640px) { .h1 { font-size: 30px; letter-spacing: -0.8px; } }
        .sub { font-size: 17px; color: #666; line-height: 1.6; margin-bottom: 40px; max-width: 540px; }
        @media (max-width: 640px) { .sub { font-size: 15px; margin-bottom: 28px; } }

        /* Cartes de choix avec 3D — même style que score-card du hero */
        .choix-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 32px; }
        @media (max-width: 640px) { .choix-grid { grid-template-columns: 1fr; gap: 14px; } }
        .choix {
          background: #0D1B3E;
          border-radius: 24px;
          padding: 36px 32px;
          color: #fff;
          border: none;
          cursor: pointer;
          font-family: inherit;
          text-align: left;
          transform: perspective(900px) rotateY(-4deg) rotateX(2deg);
          box-shadow: 0 30px 60px rgba(13,27,62,0.22), 0 8px 20px rgba(13,27,62,0.12);
          position: relative;
          overflow: hidden;
          transition: transform 0.4s cubic-bezier(.2,.9,.3,1), box-shadow 0.4s ease;
        }
        .choix + .choix { transform: perspective(900px) rotateY(4deg) rotateX(2deg); }
        .choix::before { content: ''; position: absolute; top: -80px; right: -80px; width: 260px; height: 260px; background: radial-gradient(circle, rgba(26,107,255,0.25) 0%, transparent 65%); pointer-events: none; }
        .choix:hover { transform: perspective(900px) rotateY(0deg) rotateX(0deg) translateY(-6px); box-shadow: 0 40px 80px rgba(26,107,255,0.28), 0 16px 30px rgba(13,27,62,0.18); }
        .choix.sel { transform: perspective(900px) rotateY(0deg) rotateX(0deg) translateY(-3px); outline: 3px solid #1A6BFF; outline-offset: 2px; box-shadow: 0 40px 80px rgba(26,107,255,0.4), 0 16px 30px rgba(13,27,62,0.18); }
        .choix-icon { width: 56px; height: 56px; background: rgba(26,107,255,0.2); border-radius: 16px; display: flex; align-items: center; justify-content: center; color: #6DAFFF; margin-bottom: 24px; position: relative; z-index: 1; }
        .choix.sel .choix-icon { background: #1A6BFF; color: #fff; }
        .choix h3 { font-size: 22px; font-weight: 700; margin: 0 0 6px; color: #fff; position: relative; z-index: 1; letter-spacing: -0.5px; }
        .choix p { font-size: 14px; color: rgba(255,255,255,0.55); margin: 0; line-height: 1.5; position: relative; z-index: 1; }

        /* Activités : chips */
        .chips { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 32px; }
        @media (max-width: 640px) { .chips { grid-template-columns: 1fr 1fr; } }
        .chip { background: #F5F5F5; border: 1.5px solid transparent; border-radius: 14px; padding: 14px 16px; font-family: inherit; font-size: 14px; font-weight: 600; color: #111; cursor: pointer; text-align: left; transition: all 0.15s; }
        .chip:hover { background: #EEF4FF; }
        .chip.sel { background: #1A6BFF; color: #fff; border-color: #1A6BFF; }

        /* Cartes formulaire */
        .card { background: #FAFAFA; border: 1px solid #F0F0F0; border-radius: 20px; padding: 28px; margin-bottom: 16px; }
        .card-title { font-size: 12px; font-weight: 700; color: #1A6BFF; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 18px; }
        .field { margin-bottom: 16px; }
        .field label { display: block; font-size: 13px; font-weight: 600; color: #555; margin-bottom: 6px; }
        .field input, .field select { width: 100%; border: 1.5px solid #E5E7EB; border-radius: 12px; padding: 14px 16px; font-family: inherit; font-size: 15px; color: #111; background: #fff; outline: none; transition: border 0.15s; }
        .field input:focus, .field select:focus { border-color: #1A6BFF; }
        .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 520px) { .row2 { grid-template-columns: 1fr; } }
        .radio { display: flex; gap: 8px; }
        .radio button { flex: 1; border: 1.5px solid #E5E7EB; border-radius: 12px; padding: 12px; background: #fff; font-family: inherit; font-size: 14px; font-weight: 600; color: #666; cursor: pointer; }
        .radio button.sel { border-color: #1A6BFF; background: #EEF4FF; color: #1A6BFF; }
        .badge { display: inline-flex; align-items: center; gap: 8px; background: #EEF4FF; color: #1A6BFF; font-size: 13px; font-weight: 600; padding: 6px 16px; border-radius: 100px; margin-bottom: 24px; }

        /* Boutons — MÊMES que la landing */
        .btn-main { background: #1A6BFF; color: #fff; font-family: inherit; font-size: 16px; font-weight: 700; padding: 18px 24px; border-radius: 100px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: space-between; width: 100%; transition: all 0.2s; }
        .btn-main:hover:not(:disabled) { background: #1560E0; transform: translateY(-1px); }
        .btn-main:disabled { background: #C7D0DB; cursor: not-allowed; }
        .btn-second { background: #F5F5F5; color: #111; font-family: inherit; font-size: 16px; font-weight: 700; padding: 18px 24px; border-radius: 100px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; margin-top: 12px; transition: all 0.2s; }
        .btn-second:hover { background: #EAEAEA; }

        /* Écran score final — même look que score-card du hero */
        .score-final { background: #0D1B3E; border-radius: 28px; padding: 44px 36px; color: #fff; box-shadow: 0 40px 80px rgba(13,27,62,0.28); position: relative; overflow: hidden; text-align: center; }
        .score-final::before { content: ''; position: absolute; top: -100px; right: -100px; width: 320px; height: 320px; background: radial-gradient(circle, rgba(26,107,255,0.3) 0%, transparent 65%); pointer-events: none; }
        .score-ring { position: relative; width: 140px; height: 140px; margin: 0 auto 24px; }
        .score-verdict { font-size: 22px; font-weight: 800; margin-bottom: 6px; }
        .score-sub { font-size: 14px; color: rgba(255,255,255,0.55); margin-bottom: 28px; max-width: 400px; margin-left: auto; margin-right: auto; line-height: 1.5; }
        .score-ref { background: rgba(255,255,255,0.06); border-radius: 14px; padding: 14px 18px; font-family: monospace; font-size: 12px; word-break: break-all; margin-bottom: 24px; }
        .wa-btn { background: #25D366; color: #fff; font-family: inherit; font-size: 16px; font-weight: 700; padding: 18px 24px; border-radius: 100px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; }
        .home-btn { background: transparent; color: rgba(255,255,255,0.7); border: 1.5px solid rgba(255,255,255,0.2); font-family: inherit; font-size: 15px; font-weight: 600; padding: 14px 24px; border-radius: 100px; cursor: pointer; margin-top: 12px; display: inline-flex; align-items: center; gap: 8px; }
        .home-btn:hover { color: #fff; border-color: rgba(255,255,255,0.4); }
      `}</style>

      <nav className="nav">
        <Logo height={56} tone="light" />
        <button className="nav-btn" onClick={() => navigate({ to: '/' })}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 7H3M6 4L3 7l3 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Retour à l'accueil
        </button>
      </nav>

      <div className="wrap">
        <div className="steps-bar">{[1,2,3,4].map(n => <div key={n} className={`step-dot ${step>=n?'on':''}`}/>)}</div>
        <div className="step-label">Étape {step} sur 4</div>

        {step === 1 && <>
          <h1 className="h1">Qui demande le financement ?</h1>
          <p className="sub">Sélectionnez votre profil pour accéder au formulaire adapté à votre situation.</p>
          <div className="choix-grid">
            <button className={`choix ${type==='physique'?'sel':''}`} onClick={()=>setType('physique')}>
              <div className="choix-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a5 5 0 100-10 5 5 0 000 10z"/><path d="M2 21a10 10 0 0120 0v.5a.5.5 0 01-.5.5h-19a.5.5 0 01-.5-.5V21z"/></svg>
              </div>
              <h3>Personne physique</h3>
              <p>Particulier, salarié, commerçant, artisan…</p>
            </button>
            <button className={`choix ${type==='morale'?'sel':''}`} onClick={()=>setType('morale')}>
              <div className="choix-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" clipRule="evenodd" d="M3 4a1 1 0 011-1h9a1 1 0 011 1v3h6a1 1 0 011 1v13a1 1 0 01-1 1h-6v-4a1 1 0 00-1-1h-2a1 1 0 00-1 1v4H4a1 1 0 01-1-1V4zm3 4a1 1 0 011-1h1a1 1 0 010 2H7a1 1 0 01-1-1zm4 0a1 1 0 011-1h1a1 1 0 010 2h-1a1 1 0 01-1-1zM7 11a1 1 0 000 2h1a1 1 0 100-2H7zm3 1a1 1 0 011-1h1a1 1 0 010 2h-1a1 1 0 01-1-1zm7-1a1 1 0 100 2h1a1 1 0 100-2h-1zm-1 4a1 1 0 011-1h1a1 1 0 010 2h-1a1 1 0 01-1-1z"/></svg>
              </div>
              <h3>Personne morale / PME</h3>
              <p>Entreprise, coopérative, société…</p>
            </button>
          </div>
          <button className="btn-main" disabled={!type} onClick={()=>setStep(2)}>
            <span>Continuer</span>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9h10M10 5l4 4-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </>}

        {step === 2 && <>
          <h1 className="h1">{isP ? 'Votre profession' : "Votre secteur d'activité"}</h1>
          <p className="sub">{isP ? 'Sélectionnez votre situation professionnelle.' : "Sélectionnez le secteur d'activité de votre entreprise."}</p>
          <div className="chips">
            {(isP ? ACTIVITES_PHYSIQUE : ACTIVITES_MORALE).map(a =>
              <button key={a} className={`chip ${activite===a?'sel':''}`} onClick={()=>setActivite(a)}>{a}</button>
            )}
          </div>
          <button className="btn-main" disabled={!activite} onClick={()=>setStep(3)}>
            <span>Continuer</span>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9h10M10 5l4 4-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button className="btn-second" onClick={()=>setStep(1)}>← Retour</button>
        </>}

        {step === 3 && <>
          <div className="badge">{isP ? 'Personne physique' : 'Personne morale'} · {activite}</div>
          <h1 className="h1">Votre dossier</h1>
          <p className="sub">Cela prend moins de 2 minutes. Toutes les données sont sécurisées.</p>

          <div className="card">
            <div className="card-title">1. Identité</div>
            {isP ? <>
              <div className="row2">
                <div className="field"><label>Prénom *</label><input placeholder="Jean-Pierre" value={form.prenom||''} onChange={e=>set('prenom',e.target.value)}/></div>
                <div className="field"><label>Nom *</label><input placeholder="Moukouama" value={form.nom||''} onChange={e=>set('nom',e.target.value)}/></div>
              </div>
              <div className="row2">
                <div className="field"><label>Téléphone *</label><input placeholder="+242 06 000 0000" value={form.tel||''} onChange={e=>set('tel',e.target.value)}/></div>
                <div className="field"><label>Email</label><input placeholder="email@exemple.com" value={form.email||''} onChange={e=>set('email',e.target.value)}/></div>
              </div>
            </> : <>
              <div className="field"><label>Raison sociale *</label><input placeholder="Nom de l'entreprise" value={form.raison_sociale||''} onChange={e=>set('raison_sociale',e.target.value)}/></div>
              <div className="field"><label>Nom du dirigeant *</label><input placeholder="Prénom Nom" value={form.dirigeant||''} onChange={e=>set('dirigeant',e.target.value)}/></div>
              <div className="row2">
                <div className="field"><label>Téléphone *</label><input placeholder="+242 06 000 0000" value={form.tel||''} onChange={e=>set('tel',e.target.value)}/></div>
                <div className="field"><label>Email</label><input placeholder="email@exemple.com" value={form.email||''} onChange={e=>set('email',e.target.value)}/></div>
              </div>
            </>}
            <div className="field"><label>Ville *</label>
              <select value={form.ville||''} onChange={e=>set('ville',e.target.value)}>
                <option value="">Sélectionner…</option>
                {VILLES.map(v=><option key={v}>{v}</option>)}
              </select>
            </div>
          </div>

          <div className="card">
            <div className="card-title">2. Situation {isP ? 'professionnelle' : 'juridique'}</div>
            {isP ? <>
              <div className="field"><label>Employeur / Administration</label><input placeholder="Ministère…" value={form.employeur||''} onChange={e=>set('employeur',e.target.value)}/></div>
              <div className="row2">
                <div className="field"><label>Ancienneté (mois)</label><input type="number" placeholder="24" value={form.anciennete||''} onChange={e=>set('anciennete',e.target.value)}/></div>
                <div className="field"><label>Revenu net/mois (XAF)</label><input type="number" placeholder="250000" value={form.revenu||''} onChange={e=>set('revenu',e.target.value)}/></div>
              </div>
            </> : <>
              <div className="row2">
                <div className="field"><label>RCCM</label>
                  <div className="radio">{['Oui','Non'].map(v=><button key={v} type="button" className={form.rccm===v?'sel':''} onClick={()=>set('rccm',v)}>{v}</button>)}</div>
                </div>
                <div className="field"><label>NIU</label><input placeholder="NIU" value={form.niu||''} onChange={e=>set('niu',e.target.value)}/></div>
              </div>
              <div className="row2">
                <div className="field"><label>Ancienneté (mois)</label><input type="number" placeholder="24" value={form.anciennete_soc||''} onChange={e=>set('anciennete_soc',e.target.value)}/></div>
                <div className="field"><label>CA Annuel (XAF)</label><input type="number" placeholder="50000000" value={form.ca_annuel||''} onChange={e=>set('ca_annuel',e.target.value)}/></div>
              </div>
            </>}
          </div>

          <div className="card">
            <div className="card-title">3. Votre besoin</div>
            <div className="field"><label>Montant demandé (XAF) *</label><input type="number" placeholder="5000000" value={form.montant||''} onChange={e=>set('montant',e.target.value)}/></div>
            <div className="field"><label>Objet du financement *</label>
              <select value={form.objet||''} onChange={e=>set('objet',e.target.value)}>
                <option value="">Sélectionner…</option>
                {(isP ? ['Consommation','Immobilier','Véhicule','Autre'] : ['Investissement','Fonds de roulement','Marché public','Autre']).map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="field"><label>Banque actuelle</label>
              <select value={form.banque||''} onChange={e=>set('banque',e.target.value)}>
                <option value="">Sélectionner…</option>
                {BANQUES.map(b=><option key={b}>{b}</option>)}
              </select>
            </div>
            {!isP && <div className="field"><label>Flux mensuel moyen (XAF)</label><input type="number" placeholder="2000000" value={form.flux_mois||''} onChange={e=>set('flux_mois',e.target.value)}/></div>}
          </div>

          <div className="card">
            <div className="card-title">4. Éligibilité</div>
            {isP ? <div className="field"><label>Salaire domicilié dans une banque ?</label>
              <div className="radio">{['Oui','Non'].map(v=><button key={v} type="button" className={form.salaire_domic===v?'sel':''} onClick={()=>set('salaire_domic',v)}>{v}</button>)}</div>
            </div> : <>
              <div className="field"><label>Compte bancaire mouvementé ?</label>
                <div className="radio">{['Oui','Non'].map(v=><button key={v} type="button" className={form.compte_mouvemente===v?'sel':''} onClick={()=>set('compte_mouvemente',v)}>{v}</button>)}</div>
              </div>
              <div className="field"><label>Refus bancaire antérieur ?</label>
                <div className="radio">{['Oui','Non'].map(v=><button key={v} type="button" className={form.refus_bancaire===v?'sel':''} onClick={()=>set('refus_bancaire',v)}>{v}</button>)}</div>
              </div>
              <div className="field"><label>Garanties disponibles ?</label>
                <div className="radio">{['Oui','Non'].map(v=><button key={v} type="button" className={form.garanties===v?'sel':''} onClick={()=>set('garanties',v)}>{v}</button>)}</div>
              </div>
            </>}
          </div>

          <button className="btn-main" disabled={loading || !form.tel || !form.montant || (isP ? !form.prenom : !form.raison_sociale)} onClick={soumettre}>
            <span>{loading ? 'Envoi en cours…' : 'Voir mon score'}</span>
            {!loading && <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9h10M10 5l4 4-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </button>
          <button className="btn-second" onClick={()=>setStep(2)}>← Retour</button>
        </>}

        {step === 4 && <div className="score-final">
          <div className="score-ring">
            <svg viewBox="0 0 140 140" width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="70" cy="70" r="60" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10"/>
              <circle cx="70" cy="70" r="60" fill="none" stroke={score>=70?'#34D058':score>=50?'#FFB020':'#FF6B6B'} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(score/100)*377} 377`}/>
            </svg>
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color: '#fff' }}>
              <div style={{ fontSize: 36, fontWeight: 800 }}>{score}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>/100</div>
            </div>
          </div>
          <div className="score-verdict" style={{ color: score>=70?'#34D058':score>=50?'#FFB020':'#FF6B6B' }}>
            {score >= 70 ? 'Excellent' : score >= 50 ? 'Éligible' : 'À renforcer'}
          </div>
          <p className="score-sub">{score >= 70 ? 'Votre dossier est très éligible. Un conseiller Mayinvest vous contacte sous 24h.' : score >= 50 ? 'Éligible. Notre équipe va renforcer votre dossier avec vous.' : 'Améliorons votre dossier ensemble. Un conseiller vous rappelle sous 24h.'}</p>
          <div className="score-ref">Réf. dossier : {leadId}</div>
          <button className="wa-btn" onClick={()=>window.open(`https://wa.me/242060000000?text=Bonjour, j'ai soumis mon dossier. Ref: ${leadId}`,'_blank')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4l-2.4-1.2c-.3-.2-.7-.1-1 .2l-.7.8c-.2.2-.5.3-.8.1-.9-.4-1.8-1-2.6-1.7-.7-.8-1.3-1.7-1.7-2.6-.1-.3 0-.6.2-.8l.8-.7c.3-.2.4-.6.2-1L8.3 5c-.2-.4-.7-.5-1-.3L5.5 6c-.5.2-.8.7-.7 1.2.4 2.8 1.7 5.4 3.6 7.4 2 2 4.6 3.3 7.4 3.6.5.1 1-.2 1.2-.7l1.3-1.8c.2-.4.1-.9-.3-1.1l-.5-.2z"/></svg>
            Confirmer sur WhatsApp
          </button>
          <button className="home-btn" onClick={() => navigate({ to: '/' })}>← Retour à l'accueil</button>
        </div>}
      </div>
    </div>
  )
}
