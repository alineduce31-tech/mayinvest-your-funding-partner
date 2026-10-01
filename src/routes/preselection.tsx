import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Logo } from '@/components/Logo'

export const Route = createFileRoute('/preselection')({
  component: Simulation,
})

const ACTIVITES_PHYSIQUE = ['Fonctionnaire', 'Salarié privé', 'Commerçant', 'Artisan', 'Profession libérale', 'Agriculteur', 'Autre']
const ACTIVITES_MORALE = ['Commerce', 'Tourisme', 'BTP', 'Industrie / Bois', 'Agriculture', 'Transport', 'Santé', 'Tech', 'Autre']
const BANQUES = ['BGFI Bank', 'UBA', 'LCB Bank', 'MUCODEC', 'Crédit du Congo', 'Ecobank', 'Autre', 'Aucune']
const VILLES = ['Brazzaville', 'Pointe-Noire', 'Dolisie', 'Nkayi', 'Ouesso', 'Autre']

function calc(type: string, d: Record<string, string>) {
  let s = 0
  if (type === 'physique') {
    if (parseInt(d.anciennete || '0') >= 6) s += 25
    if (d.salaire_domic === 'Oui') s += 25
    if (parseInt(d.revenu || '0') >= 200000) s += 20
    if (d.banque && d.banque !== 'Aucune') s += 15
    if (parseInt(d.montant || '0') <= 10000000) s += 15
  } else {
    if (d.rccm === 'Oui') s += 30
    if (d.compte_mouvemente === 'Oui') s += 25
    if (parseInt(d.anciennete_soc || '0') >= 12) s += 20
    if (d.refus_bancaire === 'Non') s += 15
    if (d.garanties === 'Oui') s += 10
  }
  return Math.min(s, 100)
}

function Simulation() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [type, setType] = useState<'physique' | 'morale' | ''>('')
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
      ? (parseInt(form.anciennete || '0') < 6) || form.salaire_domic === 'Non'
      : form.rccm === 'Non'
    const payload = {
      type: isP ? 'personne physique' : 'personne morale',
      activite, ville: form.ville || '',
      montant_demande: parseInt(form.montant || '0'),
      banque_actuelle: form.banque || '',
      statut: nonEligible ? 'Non Éligible' : 'Nouveau',
      score: s,
      identite: { nom: form.nom, prenom: form.prenom, tel: form.tel, email: form.email },
      situation: isP
        ? { employeur: form.employeur, anciennete: form.anciennete, revenu: form.revenu }
        : { raison_sociale: form.raison_sociale, dirigeant: form.dirigeant, rccm: form.rccm, niu: form.niu, anciennete: form.anciennete_soc, ca_annuel: form.ca_annuel },
      besoin: { montant: form.montant, objet: form.objet, banque: form.banque, flux_mois: form.flux_mois },
      eligibilite: isP
        ? { anciennete_ok: parseInt(form.anciennete || '0') >= 6, salaire_domic: form.salaire_domic }
        : { compte_mouvemente: form.compte_mouvemente, refus_bancaire: form.refus_bancaire, garanties: form.garanties },
    }
    const { data, error } = await supabase.from('leads').insert(payload).select('id').single()
    setLoading(false)
    if (!error && data) { setLeadId(data.id); setScore(s); setStep(4); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  }

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#FFFFFF', color: '#111', minHeight: '100vh', WebkitFontSmoothing: 'antialiased' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        .top { height: 72px; padding: 0 60px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #F0F0F0; }
        @media (max-width: 640px) { .top { height: 60px; padding: 0 20px; } }
        .back { background: #111; color: #fff; font-family: inherit; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 100px; border: none; cursor: pointer; display: flex; align-items: center; gap: 8px; white-space: nowrap; }
        @media (max-width: 640px) { .back { padding: 10px 20px; font-size: 13px; } }
        .wrap { max-width: 560px; margin: 0 auto; padding: 32px 24px 60px; }
        .progress { display: flex; gap: 6px; margin-bottom: 10px; }
        .dot { height: 5px; flex: 1; border-radius: 100px; background: #F0F0F0; transition: background 0.3s; }
        .dot.on { background: #1A6BFF; }
        .etape { font-size: 11px; font-weight: 700; color: #1A6BFF; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 24px; }
        .h1 { font-size: 30px; font-weight: 800; letter-spacing: -1px; color: #111; line-height: 1.1; margin: 0 0 10px; }
        @media (min-width: 640px) { .h1 { font-size: 38px; } }
        .sub { font-size: 15px; color: #666; line-height: 1.5; margin: 0 0 28px; }

        /* ÉTAPE 1 — cartes 3D */
        .cards-3d { display: flex; flex-direction: column; gap: 28px; margin-bottom: 32px; perspective: 1200px; }
        .card-choix { border: none; cursor: pointer; font-family: inherit; text-align: left; padding: 28px 24px; border-radius: 22px; position: relative; overflow: hidden; transition: transform 0.4s cubic-bezier(.2,.9,.3,1), box-shadow 0.4s ease, outline-color 0.2s; transform-style: preserve-3d; }
        .card-choix.physique { background: linear-gradient(145deg, #0D1B3E 0%, #0A1532 100%); color: #fff; box-shadow: 0 30px 60px rgba(13,27,62,0.3), 0 12px 24px rgba(13,27,62,0.18), inset 0 1px 0 rgba(255,255,255,0.1); transform: perspective(900px) rotateX(4deg) rotateY(-3deg); }
        .card-choix.morale { background: linear-gradient(145deg, #FFFFFF 0%, #F5F7FB 100%); border: 1px solid rgba(13,27,62,0.08); color: #0D1B3E; box-shadow: 0 20px 40px rgba(13,27,62,0.1), 0 8px 16px rgba(13,27,62,0.06), inset 0 1px 0 rgba(255,255,255,0.9); transform: perspective(900px) rotateX(4deg) rotateY(3deg); }
        .card-choix.sel { outline: 3px solid #1A6BFF; outline-offset: 2px; transform: perspective(900px) rotateX(0deg) rotateY(0deg) translateY(-6px); }
        .card-choix:hover { transform: perspective(900px) rotateX(0deg) rotateY(0deg) translateY(-4px); }
        .glow { position: absolute; top: -60px; right: -60px; width: 200px; height: 200px; pointer-events: none; }
        .glow.a { background: radial-gradient(circle, rgba(26,107,255,0.35) 0%, transparent 65%); }
        .glow.b { background: radial-gradient(circle, rgba(26,107,255,0.1) 0%, transparent 65%); }
        .shine { position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(26,107,255,0.6), transparent); }
        .card-icon { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; margin-bottom: 18px; position: relative; z-index: 1; }
        .card-icon.on { background: linear-gradient(135deg, #1A6BFF 0%, #0D4FD1 100%); color: #fff; box-shadow: 0 8px 20px rgba(26,107,255,0.4); }
        .card-icon.off { background: linear-gradient(135deg, #EEF4FF 0%, #D9E7FF 100%); color: #1A6BFF; box-shadow: 0 4px 12px rgba(26,107,255,0.15), inset 0 1px 0 rgba(255,255,255,0.9); }
        .card-h3 { font-size: 20px; font-weight: 700; margin: 0 0 4px; position: relative; z-index: 1; }
        .card-p { font-size: 13px; margin: 0; position: relative; z-index: 1; }
        .physique .card-p { color: rgba(255,255,255,0.6); }
        .morale .card-p { color: #666; }

        /* ÉTAPE 2 — chips */
        .chips { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 32px; }
        @media (min-width: 480px) { .chips { grid-template-columns: repeat(3, 1fr); } }
        .chip { background: #F5F5F5; border: 1.5px solid transparent; border-radius: 14px; padding: 14px 16px; font-family: inherit; font-size: 14px; font-weight: 600; color: #111; cursor: pointer; text-align: left; transition: all 0.15s; }
        .chip:hover { background: #EEF4FF; }
        .chip.sel { background: #1A6BFF; color: #fff; border-color: #1A6BFF; box-shadow: 0 6px 14px rgba(26,107,255,0.3); }

        /* ÉTAPE 3 — cartes form 3D */
        .form-stack { display: flex; flex-direction: column; gap: 18px; margin-bottom: 24px; }
        .form-card { background: linear-gradient(145deg, #FFFFFF 0%, #F5F7FB 100%); border: 1px solid rgba(13,27,62,0.08); border-radius: 20px; padding: 24px; box-shadow: 0 20px 40px rgba(13,27,62,0.08), 0 8px 16px rgba(13,27,62,0.05), inset 0 1px 0 rgba(255,255,255,0.9); position: relative; }
        .form-card.left, .form-card.right { transform: none; }
        .form-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(26,107,255,0.3), transparent); }
        .card-title { font-size: 11px; font-weight: 700; color: #1A6BFF; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 16px; }
        .field { margin-bottom: 12px; }
        .field label { display: block; font-size: 12px; font-weight: 600; color: #555; margin-bottom: 5px; }
        .field input, .field select { width: 100%; border: 1.5px solid #E5E7EB; border-radius: 12px; padding: 12px 14px; font-family: inherit; font-size: 14px; color: #111; background: #fff; outline: none; transition: all 0.15s; }
        .field input:focus, .field select:focus { border-color: #1A6BFF; box-shadow: 0 0 0 4px rgba(26,107,255,0.1); }
        .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        @media (max-width: 440px) { .row2 { grid-template-columns: 1fr; } }
        .radio { display: flex; gap: 8px; }
        .radio button { flex: 1; border: 1.5px solid #E5E7EB; border-radius: 12px; padding: 12px; background: #fff; font-family: inherit; font-size: 14px; font-weight: 700; color: #666; cursor: pointer; transition: all 0.15s; }
        .radio button.sel { border-color: #1A6BFF; background: #EEF4FF; color: #1A6BFF; box-shadow: 0 4px 12px rgba(26,107,255,0.2); }
        .badge { display: inline-flex; align-items: center; gap: 6px; background: #EEF4FF; color: #1A6BFF; font-size: 12px; font-weight: 700; padding: 5px 14px; border-radius: 100px; margin-bottom: 16px; }

        /* Boutons */
        .btn-main { width: 100%; background: #1A6BFF; color: #fff; font-family: inherit; font-size: 16px; font-weight: 700; padding: 18px 24px; border-radius: 100px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 8px 20px rgba(26,107,255,0.35); transition: all 0.2s; }
        .btn-main:hover:not(:disabled) { background: #1560E0; transform: translateY(-1px); box-shadow: 0 12px 28px rgba(26,107,255,0.4); }
        .btn-main:disabled { background: #C7D0DB; cursor: not-allowed; box-shadow: none; }
        .btn-back { width: 100%; background: #F5F5F5; color: #111; font-family: inherit; font-size: 15px; font-weight: 700; padding: 16px; border-radius: 100px; border: none; cursor: pointer; margin-top: 12px; }
        .btn-back:hover { background: #EAEAEA; }

        /* ÉTAPE 4 — score */
        .score-final { background: #0D1B3E; border-radius: 24px; padding: 36px 28px; color: #fff; box-shadow: 0 30px 60px rgba(13,27,62,0.3); position: relative; overflow: hidden; text-align: center; margin-top: 20px; }
        .score-final::before { content: ''; position: absolute; top: -80px; right: -80px; width: 260px; height: 260px; background: radial-gradient(circle, rgba(26,107,255,0.3) 0%, transparent 65%); pointer-events: none; }
        .score-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(52,208,88,0.15); color: #34D058; font-size: 12px; font-weight: 700; padding: 5px 14px; border-radius: 100px; margin-bottom: 20px; position: relative; z-index: 1; }
        .ring { position: relative; width: 140px; height: 140px; margin: 0 auto 20px; z-index: 1; }
        .verdict { font-size: 22px; font-weight: 800; margin-bottom: 6px; position: relative; z-index: 1; }
        .score-sub { font-size: 14px; color: rgba(255,255,255,0.6); line-height: 1.5; margin: 0 0 24px; position: relative; z-index: 1; }
        .ref { background: rgba(255,255,255,0.06); border-radius: 12px; padding: 12px 16px; font-family: monospace; font-size: 11px; margin-bottom: 20px; color: rgba(255,255,255,0.7); position: relative; z-index: 1; word-break: break-all; }
        .btn-wa { width: 100%; background: #25D366; color: #fff; font-family: inherit; font-size: 15px; font-weight: 700; padding: 16px 24px; border-radius: 100px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 10px; position: relative; z-index: 1; }
        .btn-home { width: 100%; background: transparent; color: rgba(255,255,255,0.7); border: 1.5px solid rgba(255,255,255,0.2); font-family: inherit; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 100px; cursor: pointer; position: relative; z-index: 1; }
        .btn-home:hover { color: #fff; border-color: rgba(255,255,255,0.4); }
      `}</style>

      <div className="top">
        <Logo height={56} tone="light" />
        <button className="back" onClick={() => { window.location.href = '/' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 7H3M6 4L3 7l3 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Retour à l'accueil
        </button>
      </div>

      <div className="wrap">
        <div className="progress">
          {[1, 2, 3, 4].map(n => <div key={n} className={`dot ${step >= n ? 'on' : ''}`} />)}
        </div>
        <div className="etape">Étape {step} sur 4</div>

        {step === 1 && <>
          <h1 className="h1">Qui demande le financement&nbsp;?</h1>
          <p className="sub">Choisissez votre profil pour accéder au formulaire adapté.</p>
          <div className="cards-3d">
            <button className={`card-choix physique ${type === 'physique' ? 'sel' : ''}`} onClick={() => setType('physique')}>
              <div className="glow a" />
              <div className="shine" />
              <div className="card-icon on">
                <svg width="26" height="26" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="6.5" r="3.5" fill="white"/><path d="M3 17c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
              <h3 className="card-h3">Personne physique</h3>
              <p className="card-p">Particulier, salarié, commerçant, artisan…</p>
            </button>
            <button className={`card-choix morale ${type === 'morale' ? 'sel' : ''}`} onClick={() => setType('morale')}>
              <div className="glow b" />
              <div className="card-icon off">
                <svg width="26" height="26" viewBox="0 0 20 20" fill="none"><rect x="3" y="7" width="14" height="11" rx="1.5" stroke="#111" strokeWidth="2"/><path d="M7 18V13h6v5" stroke="#111" strokeWidth="2" strokeLinecap="round"/><path d="M6 7V4a1 1 0 011-1h6a1 1 0 011 1v3" stroke="#111" strokeWidth="2"/><rect x="7.5" y="9.5" width="2" height="2" rx="0.5" fill="#111"/><rect x="10.5" y="9.5" width="2" height="2" rx="0.5" fill="#111"/></svg>
              </div>
              <h3 className="card-h3" style={{ color: '#111' }}>Personne morale / PME</h3>
              <p className="card-p">Entreprise, coopérative, société…</p>
            </button>
          </div>
          <button className="btn-main" disabled={!type} onClick={() => setStep(2)}>
            Continuer
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9h10M10 5l4 4-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </>}

        {step === 2 && <>
          <div className="badge">{isP ? 'Personne physique' : 'Personne morale'}</div>
          <h1 className="h1">{isP ? 'Votre profession' : "Votre secteur d'activité"}</h1>
          <p className="sub">{isP ? 'Sélectionnez votre situation professionnelle.' : "Sélectionnez le secteur de votre entreprise."}</p>
          <div className="chips">
            {(isP ? ACTIVITES_PHYSIQUE : ACTIVITES_MORALE).map(a =>
              <button key={a} className={`chip ${activite === a ? 'sel' : ''}`} onClick={() => setActivite(a)}>{a}</button>
            )}
          </div>
          <button className="btn-main" disabled={!activite} onClick={() => setStep(3)}>
            Continuer
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9h10M10 5l4 4-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button className="btn-back" onClick={() => setStep(1)}>← Retour</button>
        </>}

        {step === 3 && <>
          <div className="badge">{isP ? 'Personne physique' : 'Personne morale'} · {activite}</div>
          <h1 className="h1">Votre dossier</h1>
          <p className="sub">Cela prend moins de 2 minutes.</p>

          <div className="form-stack">
            <div className="form-card left">
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

            <div className="form-card right">
              <div className="card-title">2. Situation {isP ? 'professionnelle' : 'juridique'}</div>
              {isP ? <>
                <div className="field"><label>Employeur / Administration</label><input placeholder="Ministère…" value={form.employeur||''} onChange={e=>set('employeur',e.target.value)}/></div>
                <div className="row2">
                  <div className="field"><label>Ancienneté (mois)</label><input type="number" placeholder="24" value={form.anciennete||''} onChange={e=>set('anciennete',e.target.value)}/></div>
                  <div className="field"><label>Revenu net/mois (XAF)</label><input type="number" placeholder="350000" value={form.revenu||''} onChange={e=>set('revenu',e.target.value)}/></div>
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

            <div className="form-card left">
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

            <div className="form-card right">
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
          </div>

          <button className="btn-main" disabled={loading || !form.tel || !form.montant || (isP ? !form.prenom : !form.raison_sociale)} onClick={soumettre}>
            {loading ? 'Envoi en cours…' : 'Voir mon score'}
            {!loading && <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9h10M10 5l4 4-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </button>
          <button className="btn-back" onClick={() => setStep(2)}>← Retour</button>
        </>}

        {step === 4 && <div className="score-final">
          <div className="score-badge">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 6l2 2 4-4" stroke="#34D058" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Dossier reçu
          </div>
          <div className="ring">
            <svg viewBox="0 0 140 140" width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="70" cy="70" r="60" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10"/>
              <circle cx="70" cy="70" r="60" fill="none" stroke={score>=70?'#34D058':score>=50?'#FFB020':'#FF6B6B'} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(score/100)*377} 377`}/>
            </svg>
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#fff' }}>
              <div style={{ fontSize: 36, fontWeight: 800 }}>{score}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>/100</div>
            </div>
          </div>
          <div className="verdict" style={{ color: score>=70?'#34D058':score>=50?'#FFB020':'#FF6B6B' }}>
            {score >= 70 ? 'Excellent' : score >= 50 ? 'Éligible' : 'À renforcer'}
          </div>
          <p className="score-sub">{score >= 70 ? 'Votre dossier est très éligible. Un conseiller Mayinvest vous contacte sous 24h.' : score >= 50 ? 'Éligible. Notre équipe va renforcer votre dossier avec vous.' : 'Améliorons votre dossier ensemble. Un conseiller vous rappelle sous 24h.'}</p>
          <div className="ref">Réf. {leadId}</div>
          <button className="btn-wa" onClick={() => window.open(`https://wa.me/242060000000?text=Bonjour, j'ai soumis mon dossier. Ref: ${leadId}`,'_blank')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M17.5 14.4l-2.4-1.2c-.3-.2-.7-.1-1 .2l-.7.8c-.2.2-.5.3-.8.1-.9-.4-1.8-1-2.6-1.7-.7-.8-1.3-1.7-1.7-2.6-.1-.3 0-.6.2-.8l.8-.7c.3-.2.4-.6.2-1L8.3 5c-.2-.4-.7-.5-1-.3L5.5 6c-.5.2-.8.7-.7 1.2.4 2.8 1.7 5.4 3.6 7.4 2 2 4.6 3.3 7.4 3.6.5.1 1-.2 1.2-.7l1.3-1.8c.2-.4.1-.9-.3-1.1l-.5-.2z"/></svg>
            Confirmer sur WhatsApp
          </button>
          <button className="btn-home" onClick={() => { window.location.href = '/' }}>← Retour à l'accueil</button>
        </div>}
      </div>
    </div>
  )
}
