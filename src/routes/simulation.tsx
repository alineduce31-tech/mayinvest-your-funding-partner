import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Logo } from '@/components/Logo'

export const Route = createFileRoute('/simulation')({
  component: Simulation,
})

const ACTIVITES_PHYSIQUE = ['Fonctionnaire', 'Salarié privé', 'Commerçant', 'Artisan', 'Profession libérale', 'Agriculteur', 'Autre']
const ACTIVITES_MORALE = ['Commerce', 'Tourisme', 'BTP', 'Industrie / Bois', 'Agriculture', 'Transport', 'Santé', 'Tech', 'Autre']
const BANQUES = ['BGFI Bank', 'UBA', 'LCB Bank', 'MUCODEC', 'Crédit du Congo', 'Ecobank', 'Autre', 'Aucune']
const VILLES = ['Brazzaville', 'Pointe-Noire', 'Dolisie', 'Nkayi', 'Ouesso', 'Autre']

function calcScore(type: string, data: Record<string, string>): number {
  let score = 0
  if (type === 'Personne physique') {
    if (data.anciennete && parseInt(data.anciennete) >= 6) score += 25
    if (data.salaire_domic === 'Oui') score += 25
    if (data.revenu && parseInt(data.revenu) >= 200000) score += 20
    if (data.banque && data.banque !== 'Aucune') score += 15
    if (data.montant && parseInt(data.montant) <= 10000000) score += 15
  } else {
    if (data.rccm === 'Oui') score += 30
    if (data.compte_mouvemente === 'Oui') score += 25
    if (data.anciennete_soc && parseInt(data.anciennete_soc) >= 12) score += 20
    if (data.refus_bancaire === 'Non') score += 15
    if (data.garanties === 'Oui') score += 10
  }
  return Math.min(score, 100)
}

function Simulation() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [type, setType] = useState<'Personne physique' | 'Personne morale' | ''>('')
  const [activite, setActivite] = useState('')
  const [form, setForm] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [score, setScore] = useState(0)
  const [leadId, setLeadId] = useState('')

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }
  const isPhysique = type === 'Personne physique'

  async function soumettre() {
    setLoading(true)
    const s = calcScore(type, form)
    const nonEligible = isPhysique
      ? (form.anciennete && parseInt(form.anciennete) < 6) || form.salaire_domic === 'Non'
      : form.rccm === 'Non'

    const payload = {
      type: isPhysique ? 'personne physique' : 'personne morale',
      activite, ville: form.ville || '',
      montant_demande: parseInt(form.montant || '0'),
      banque_actuelle: form.banque || '',
      statut: nonEligible ? 'Non Éligible' : 'Nouveau',
      score: s,
      identite: { nom: form.nom, prenom: form.prenom, tel: form.tel, email: form.email },
      situation: isPhysique
        ? { employeur: form.employeur, anciennete: form.anciennete, revenu: form.revenu }
        : { raison_sociale: form.raison_sociale, dirigeant: form.dirigeant, rccm: form.rccm, niu: form.niu, anciennete: form.anciennete_soc, ca_annuel: form.ca_annuel },
      besoin: { montant: form.montant, objet: form.objet, banque: form.banque, flux_mois: form.flux_mois },
      eligibilite: isPhysique
        ? { anciennete_ok: form.anciennete && parseInt(form.anciennete) >= 6, salaire_domic: form.salaire_domic }
        : { compte_mouvemente: form.compte_mouvemente, refus_bancaire: form.refus_bancaire, garanties: form.garanties },
    }

    const { data, error } = await supabase.from('leads').insert(payload).select('id').single()
    setLoading(false)
    if (!error && data) {
      setLeadId(data.id)
      setScore(s)
      setStep(4)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Plus Jakarta Sans', sans-serif", background: '#F5F5F7', color: '#1D1D1F', minHeight: '100vh', WebkitFontSmoothing: 'antialiased' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        .s-nav { height: 72px; padding: 0 60px; display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.72); backdrop-filter: saturate(180%) blur(20px); -webkit-backdrop-filter: saturate(180%) blur(20px); border-bottom: 1px solid rgba(0,0,0,0.08); position: sticky; top: 0; z-index: 10; }
        @media (max-width: 640px) { .s-nav { height: 60px; padding: 0 20px; } }
        .s-back { background: transparent; border: none; color: #6E6E73; font-family: inherit; font-size: 14px; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 6px; letter-spacing: -0.01em; }
        .s-back:hover { color: #1D1D1F; }
        .s-main { max-width: 720px; margin: 0 auto; padding: 60px 24px 80px; }
        @media (max-width: 640px) { .s-main { padding: 32px 20px 60px; } }
        .s-progress { display: flex; gap: 8px; margin-bottom: 12px; }
        .s-dot { height: 4px; flex: 1; border-radius: 100px; background: #E5E5EA; transition: background 0.3s; }
        .s-dot.on { background: #0071E3; }
        .s-etape { font-size: 12px; font-weight: 600; color: #86868B; letter-spacing: 0.02em; margin-bottom: 24px; }
        .s-h1 { font-size: 40px; font-weight: 700; color: #1D1D1F; letter-spacing: -0.025em; margin-bottom: 10px; line-height: 1.1; }
        @media (max-width: 640px) { .s-h1 { font-size: 28px; } }
        .s-sub { font-size: 17px; color: #6E6E73; margin-bottom: 40px; line-height: 1.5; letter-spacing: -0.01em; }
        @media (max-width: 640px) { .s-sub { font-size: 15px; margin-bottom: 28px; } }

        /* Cartes 3D — style Apple */
        .s-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 32px; perspective: 1200px; }
        @media (max-width: 640px) { .s-grid2 { grid-template-columns: 1fr; } }
        .s-choix { background: #fff; border: none; border-radius: 22px; padding: 32px 28px; cursor: pointer; text-align: left; font-family: inherit; transition: transform 0.35s cubic-bezier(.2,.9,.3,1), box-shadow 0.35s ease, border-color 0.2s; display: flex; flex-direction: column; align-items: flex-start; gap: 20px; transform-style: preserve-3d; box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06); position: relative; }
        .s-choix::after { content: ''; position: absolute; inset: 0; border-radius: 22px; padding: 2px; background: linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0)); -webkit-mask: linear-gradient(#000,#000) content-box, linear-gradient(#000,#000); -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none; }
        .s-choix:hover { transform: translateY(-6px) rotateX(4deg); box-shadow: 0 4px 8px rgba(0,0,0,0.05), 0 24px 48px rgba(0,113,227,0.15); }
        .s-choix.sel { transform: translateY(-4px); box-shadow: 0 2px 4px rgba(0,113,227,0.1), 0 20px 40px rgba(0,113,227,0.22); outline: 2px solid #0071E3; outline-offset: -2px; }
        .s-choix-icon { width: 60px; height: 60px; border-radius: 18px; background: linear-gradient(135deg, #F0F5FF 0%, #E1EBFF 100%); color: #0071E3; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 -2px 4px rgba(0,113,227,0.08); }
        .s-choix.sel .s-choix-icon { background: linear-gradient(135deg, #0071E3 0%, #0040DD 100%); color: #fff; box-shadow: 0 6px 14px rgba(0,113,227,0.35), inset 0 -2px 4px rgba(0,0,0,0.15); }
        .s-choix h3 { font-size: 19px; font-weight: 600; color: #1D1D1F; margin: 0 0 6px; letter-spacing: -0.02em; }
        .s-choix p { font-size: 14px; color: #6E6E73; margin: 0; line-height: 1.45; letter-spacing: -0.01em; }

        .s-grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 32px; }
        @media (max-width: 640px) { .s-grid3 { grid-template-columns: 1fr 1fr; } }
        .s-act { background: #fff; border: none; border-radius: 14px; padding: 15px 16px; cursor: pointer; font-family: inherit; font-size: 14px; font-weight: 500; color: #1D1D1F; text-align: left; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04); }
        .s-act:hover { transform: translateY(-1px); box-shadow: 0 2px 4px rgba(0,0,0,0.05), 0 6px 16px rgba(0,113,227,0.1); }
        .s-act.sel { background: #0071E3; color: #fff; box-shadow: 0 4px 12px rgba(0,113,227,0.35); }

        .s-card { background: #fff; border-radius: 20px; padding: 24px; margin-bottom: 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04); }
        .s-sec { font-size: 11px; font-weight: 600; color: #86868B; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 14px; }
        .s-field { margin-bottom: 14px; }
        .s-field label { display: block; font-size: 13px; font-weight: 500; color: #6E6E73; margin-bottom: 6px; letter-spacing: -0.01em; }
        .s-field input, .s-field select { width: 100%; border: 1px solid #D2D2D7; border-radius: 12px; padding: 12px 14px; font-family: inherit; font-size: 15px; color: #1D1D1F; background: #fff; outline: none; transition: all 0.15s; }
        .s-field input:focus, .s-field select:focus { border-color: #0071E3; box-shadow: 0 0 0 4px rgba(0,113,227,0.15); }
        .s-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        @media (max-width: 520px) { .s-row2 { grid-template-columns: 1fr; } }
        .s-radio { display: flex; gap: 6px; background: #F5F5F7; padding: 4px; border-radius: 10px; }
        .s-radio button { flex: 1; border: none; border-radius: 8px; padding: 9px; background: transparent; font-family: inherit; font-size: 13px; font-weight: 500; color: #6E6E73; cursor: pointer; transition: all 0.2s; }
        .s-radio button.sel { background: #fff; color: #0071E3; box-shadow: 0 1px 3px rgba(0,0,0,0.08); font-weight: 600; }

        /* Bouton style Apple */
        .s-btn { width: 100%; background: #0071E3; color: #fff; border: none; border-radius: 14px; padding: 16px 24px; font-family: inherit; font-size: 16px; font-weight: 500; cursor: pointer; margin-top: 12px; display: flex; align-items: center; justify-content: center; gap: 8px; letter-spacing: -0.01em; transition: all 0.2s cubic-bezier(.2,.9,.3,1); box-shadow: 0 1px 3px rgba(0,113,227,0.25), 0 6px 16px rgba(0,113,227,0.25); position: relative; overflow: hidden; }
        .s-btn::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 50%; background: linear-gradient(180deg, rgba(255,255,255,0.15), transparent); border-radius: 14px 14px 0 0; pointer-events: none; }
        .s-btn:hover:not(:disabled) { background: #0077ED; transform: translateY(-1px); box-shadow: 0 2px 4px rgba(0,113,227,0.3), 0 10px 24px rgba(0,113,227,0.32); }
        .s-btn:active:not(:disabled) { transform: translateY(0) scale(0.985); box-shadow: 0 1px 2px rgba(0,113,227,0.2), 0 4px 10px rgba(0,113,227,0.2); }
        .s-btn:disabled { background: #E5E5EA; color: #A1A1A6; cursor: not-allowed; box-shadow: none; }
        .s-btn:disabled::before { display: none; }
        .s-btn-back { width: 100%; background: transparent; color: #0071E3; border: none; padding: 14px; font-family: inherit; font-size: 15px; font-weight: 500; cursor: pointer; margin-top: 6px; letter-spacing: -0.01em; }
        .s-btn-back:hover { color: #0077ED; }

        .s-success { text-align: center; padding: 20px 0; }
        .s-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(0,113,227,0.1); color: #0071E3; font-size: 13px; font-weight: 600; padding: 6px 14px; border-radius: 100px; margin-bottom: 20px; letter-spacing: -0.01em; }
      `}</style>

      <nav className="s-nav">
        <Logo height={40} tone="light" />
        <button className="s-back" onClick={() => navigate({ to: '/' })}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Retour à l'accueil
        </button>
      </nav>

      <main className="s-main">
        <div className="s-progress">
          {[1, 2, 3, 4].map((n) => <div key={n} className={`s-dot ${step >= n ? 'on' : ''}`} />)}
        </div>
        <div className="s-etape">Étape {step} sur 4</div>

        {step === 1 && <>
          <h1 className="s-h1">Qui demande le financement ?</h1>
          <p className="s-sub">Sélectionnez votre profil pour accéder au formulaire adapté.</p>
          <div className="s-grid2">
            <button className={`s-choix ${type === 'Personne physique' ? 'sel' : ''}`} onClick={() => setType('Personne physique')}>
              <div className="s-choix-icon">
                <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
                  <circle cx="15" cy="10" r="5" stroke="currentColor" strokeWidth="2"/>
                  <path d="M4 26c0-6.075 4.925-11 11-11s11 4.925 11 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <h3>Personne physique</h3>
                <p>Particulier, salarié, commerçant, artisan…</p>
              </div>
            </button>
            <button className={`s-choix ${type === 'Personne morale' ? 'sel' : ''}`} onClick={() => setType('Personne morale')}>
              <div className="s-choix-icon">
                <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
                  <rect x="4" y="9" width="22" height="17" rx="1.5" stroke="currentColor" strokeWidth="2"/>
                  <path d="M9 26v-6h12v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 9V5a1 1 0 011-1h12a1 1 0 011 1v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <rect x="10" y="13" width="2.5" height="2.5" rx="0.5" fill="currentColor"/>
                  <rect x="17.5" y="13" width="2.5" height="2.5" rx="0.5" fill="currentColor"/>
                </svg>
              </div>
              <div>
                <h3>Personne morale / PME</h3>
                <p>Entreprise, coopérative, société…</p>
              </div>
            </button>
          </div>
          <button className="s-btn" disabled={!type} onClick={() => setStep(2)}>
            Continuer
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </>}

        {step === 2 && <>
          <h1 className="s-h1">{isPhysique ? 'Votre profession' : "Votre secteur d'activité"}</h1>
          <p className="s-sub">{isPhysique ? 'Sélectionnez votre situation professionnelle.' : "Sélectionnez le secteur de votre entreprise."}</p>
          <div className="s-grid3">
            {(isPhysique ? ACTIVITES_PHYSIQUE : ACTIVITES_MORALE).map(a => (
              <button key={a} className={`s-act ${activite === a ? 'sel' : ''}`} onClick={() => setActivite(a)}>{a}</button>
            ))}
          </div>
          <button className="s-btn" disabled={!activite} onClick={() => setStep(3)}>
            Continuer
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button className="s-btn-back" onClick={() => setStep(1)}>Retour</button>
        </>}

        {step === 3 && <>
          <div className="s-badge">{type} · {activite}</div>
          <h1 className="s-h1">Votre dossier</h1>
          <p className="s-sub">Cela prend moins de 2 minutes. Remplissez depuis votre téléphone.</p>

          <div className="s-card">
            <div className="s-sec">1. Identité</div>
            {isPhysique ? <>
              <div className="s-row2">
                <div className="s-field"><label>Prénom *</label><input placeholder="Jean-Pierre" value={form.prenom||''} onChange={e=>set('prenom',e.target.value)}/></div>
                <div className="s-field"><label>Nom *</label><input placeholder="Moukouama" value={form.nom||''} onChange={e=>set('nom',e.target.value)}/></div>
              </div>
              <div className="s-row2">
                <div className="s-field"><label>Téléphone *</label><input placeholder="+242 06 000 0000" value={form.tel||''} onChange={e=>set('tel',e.target.value)}/></div>
                <div className="s-field"><label>Email</label><input placeholder="email@exemple.com" value={form.email||''} onChange={e=>set('email',e.target.value)}/></div>
              </div>
            </> : <>
              <div className="s-field"><label>Raison sociale *</label><input placeholder="Nom de l'entreprise" value={form.raison_sociale||''} onChange={e=>set('raison_sociale',e.target.value)}/></div>
              <div className="s-field"><label>Nom du dirigeant *</label><input placeholder="Prénom Nom" value={form.dirigeant||''} onChange={e=>set('dirigeant',e.target.value)}/></div>
              <div className="s-row2">
                <div className="s-field"><label>Téléphone *</label><input placeholder="+242 06 000 0000" value={form.tel||''} onChange={e=>set('tel',e.target.value)}/></div>
                <div className="s-field"><label>Email</label><input placeholder="email@exemple.com" value={form.email||''} onChange={e=>set('email',e.target.value)}/></div>
              </div>
            </>}
            <div className="s-field"><label>Ville *</label>
              <select value={form.ville||''} onChange={e=>set('ville',e.target.value)}>
                <option value="">Sélectionner…</option>
                {VILLES.map(v=><option key={v}>{v}</option>)}
              </select>
            </div>
          </div>

          <div className="s-card">
            <div className="s-sec">2. Situation {isPhysique ? 'professionnelle' : 'juridique'}</div>
            {isPhysique ? <>
              <div className="s-field"><label>Employeur / Administration</label><input placeholder="Ministère…" value={form.employeur||''} onChange={e=>set('employeur',e.target.value)}/></div>
              <div className="s-row2">
                <div className="s-field"><label>Ancienneté (mois)</label><input type="number" placeholder="24" value={form.anciennete||''} onChange={e=>set('anciennete',e.target.value)}/></div>
                <div className="s-field"><label>Revenu net/mois (XAF)</label><input type="number" placeholder="250000" value={form.revenu||''} onChange={e=>set('revenu',e.target.value)}/></div>
              </div>
            </> : <>
              <div className="s-row2">
                <div className="s-field"><label>RCCM</label>
                  <div className="s-radio">{['Oui','Non'].map(v=><button key={v} type="button" className={form.rccm===v?'sel':''} onClick={()=>set('rccm',v)}>{v}</button>)}</div>
                </div>
                <div className="s-field"><label>NIU</label><input placeholder="NIU" value={form.niu||''} onChange={e=>set('niu',e.target.value)}/></div>
              </div>
              <div className="s-row2">
                <div className="s-field"><label>Ancienneté (mois)</label><input type="number" placeholder="24" value={form.anciennete_soc||''} onChange={e=>set('anciennete_soc',e.target.value)}/></div>
                <div className="s-field"><label>CA Annuel (XAF)</label><input type="number" placeholder="50000000" value={form.ca_annuel||''} onChange={e=>set('ca_annuel',e.target.value)}/></div>
              </div>
            </>}
          </div>

          <div className="s-card">
            <div className="s-sec">3. Votre besoin</div>
            <div className="s-field"><label>Montant demandé (XAF) *</label><input type="number" placeholder="5000000" value={form.montant||''} onChange={e=>set('montant',e.target.value)}/></div>
            <div className="s-field"><label>Objet du financement *</label>
              <select value={form.objet||''} onChange={e=>set('objet',e.target.value)}>
                <option value="">Sélectionner…</option>
                {(isPhysique ? ['Consommation','Immobilier','Véhicule','Autre'] : ['Investissement','Fonds de roulement','Marché public','Autre']).map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="s-field"><label>Banque actuelle</label>
              <select value={form.banque||''} onChange={e=>set('banque',e.target.value)}>
                <option value="">Sélectionner…</option>
                {BANQUES.map(b=><option key={b}>{b}</option>)}
              </select>
            </div>
            {!isPhysique && <div className="s-field"><label>Flux mensuel moyen (XAF)</label><input type="number" placeholder="2000000" value={form.flux_mois||''} onChange={e=>set('flux_mois',e.target.value)}/></div>}
          </div>

          <div className="s-card">
            <div className="s-sec">4. Éligibilité</div>
            {isPhysique ? <>
              <div className="s-field"><label>Salaire domicilié dans une banque ?</label>
                <div className="s-radio">{['Oui','Non'].map(v=><button key={v} type="button" className={form.salaire_domic===v?'sel':''} onClick={()=>set('salaire_domic',v)}>{v}</button>)}</div>
              </div>
            </> : <>
              <div className="s-field"><label>Compte bancaire mouvementé ?</label>
                <div className="s-radio">{['Oui','Non'].map(v=><button key={v} type="button" className={form.compte_mouvemente===v?'sel':''} onClick={()=>set('compte_mouvemente',v)}>{v}</button>)}</div>
              </div>
              <div className="s-field"><label>Refus bancaire antérieur ?</label>
                <div className="s-radio">{['Oui','Non'].map(v=><button key={v} type="button" className={form.refus_bancaire===v?'sel':''} onClick={()=>set('refus_bancaire',v)}>{v}</button>)}</div>
              </div>
              <div className="s-field"><label>Garanties disponibles ?</label>
                <div className="s-radio">{['Oui','Non'].map(v=><button key={v} type="button" className={form.garanties===v?'sel':''} onClick={()=>set('garanties',v)}>{v}</button>)}</div>
              </div>
            </>}
          </div>

          <button className="s-btn" disabled={loading || !form.tel || !form.montant || (isPhysique ? !form.prenom : !form.raison_sociale)} onClick={soumettre}>
            {loading ? 'Envoi en cours…' : 'Voir mon score'}
            {!loading && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </button>
          <button className="s-btn-back" onClick={() => setStep(2)}>Retour</button>
        </>}

        {step === 4 && <div className="s-success">
          <div className="s-badge">Dossier reçu</div>
          <h1 className="s-h1">Votre score : {score}/100</h1>
          <p className="s-sub">{score >= 70 ? 'Excellent ! Votre dossier est très éligible. Un conseiller vous contacte sous 24h.' : score >= 50 ? 'Éligible. Notre équipe va renforcer votre dossier avec vous.' : 'Améliorons votre dossier ensemble. Un conseiller vous rappelle sous 24h.'}</p>

          <div className="s-card" style={{ textAlign: 'left' }}>
            <div className="s-sec">Référence dossier</div>
            <div style={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all', color: '#1D1D1F' }}>{leadId}</div>
          </div>

          <button className="s-btn" style={{ background: '#25D366', boxShadow: '0 1px 3px rgba(37,211,102,0.25), 0 6px 16px rgba(37,211,102,0.25)' }} onClick={() => window.open(`https://wa.me/242060000000?text=Bonjour, j'ai soumis mon dossier. Ref: ${leadId}`, '_blank')}>
            Confirmer sur WhatsApp
          </button>
          <button className="s-btn-back" onClick={() => navigate({ to: '/' })}>Retour à l'accueil</button>
        </div>}

      </main>
    </div>
  )
}
