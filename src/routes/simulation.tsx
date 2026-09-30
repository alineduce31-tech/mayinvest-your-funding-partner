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

function IconPerson() {
  return <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="9" r="4.5" stroke="currentColor" strokeWidth="2"/><path d="M4 24c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
}
function IconBuilding() {
  return <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="4" y="8" width="20" height="16" rx="1.5" stroke="currentColor" strokeWidth="2"/><path d="M9 24v-6h10v6M8 8V5a1 1 0 011-1h10a1 1 0 011 1v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><rect x="10" y="12" width="2.5" height="2.5" rx="0.5" fill="currentColor"/><rect x="15.5" y="12" width="2.5" height="2.5" rx="0.5" fill="currentColor"/></svg>
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
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#FFFFFF', color: '#111', minHeight: '100vh', WebkitFontSmoothing: 'antialiased' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        .s-nav { height: 72px; padding: 0 60px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #F0F0F0; }
        @media (max-width: 640px) { .s-nav { height: 60px; padding: 0 20px; } }
        .s-back { background: transparent; border: none; color: #666; font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; }
        .s-main { max-width: 720px; margin: 0 auto; padding: 60px 24px 80px; }
        @media (max-width: 640px) { .s-main { padding: 32px 20px 60px; } }
        .s-progress { display: flex; gap: 8px; margin-bottom: 12px; }
        .s-dot { height: 5px; flex: 1; border-radius: 100px; background: #EEE; transition: background 0.3s; }
        .s-dot.on { background: #1A6BFF; }
        .s-etape { font-size: 12px; font-weight: 600; color: #999; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 24px; }
        .s-h1 { font-size: 32px; font-weight: 800; color: #111; letter-spacing: -1px; margin-bottom: 12px; line-height: 1.15; }
        @media (max-width: 640px) { .s-h1 { font-size: 24px; letter-spacing: -0.5px; } }
        .s-sub { font-size: 15px; color: #666; margin-bottom: 32px; line-height: 1.6; }
        .s-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
        @media (max-width: 640px) { .s-grid2 { grid-template-columns: 1fr; } }
        .s-choix { background: #fff; border: 2px solid #EEE; border-radius: 20px; padding: 32px 28px; cursor: pointer; text-align: left; font-family: inherit; transition: all 0.2s; display: flex; flex-direction: column; align-items: flex-start; gap: 16px; }
        .s-choix:hover { border-color: #C7D8FF; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(26,107,255,0.08); }
        .s-choix.sel { border-color: #1A6BFF; background: #F5F9FF; box-shadow: 0 8px 24px rgba(26,107,255,0.12); }
        .s-choix-icon { width: 56px; height: 56px; border-radius: 16px; background: #F0F5FF; color: #1A6BFF; display: flex; align-items: center; justify-content: center; }
        .s-choix.sel .s-choix-icon { background: #1A6BFF; color: #fff; }
        .s-choix h3 { font-size: 17px; font-weight: 700; color: #111; margin: 0 0 6px; }
        .s-choix p { font-size: 13px; color: #666; margin: 0; line-height: 1.5; }
        .s-grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 24px; }
        @media (max-width: 640px) { .s-grid3 { grid-template-columns: 1fr 1fr; } }
        .s-act { background: #fff; border: 1.5px solid #EEE; border-radius: 14px; padding: 14px 16px; cursor: pointer; font-family: inherit; font-size: 14px; font-weight: 600; color: #444; text-align: left; transition: all 0.15s; }
        .s-act:hover { border-color: #C7D8FF; }
        .s-act.sel { border-color: #1A6BFF; background: #F5F9FF; color: #1A6BFF; }
        .s-card { background: #FAFAFA; border: 1px solid #EEE; border-radius: 18px; padding: 24px; margin-bottom: 16px; }
        .s-sec { font-size: 11px; font-weight: 700; color: #999; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 14px; }
        .s-field { margin-bottom: 14px; }
        .s-field label { display: block; font-size: 12px; font-weight: 600; color: #666; margin-bottom: 6px; }
        .s-field input, .s-field select { width: 100%; border: 1.5px solid #E5E7EB; border-radius: 10px; padding: 12px 14px; font-family: inherit; font-size: 14px; color: #111; background: #fff; outline: none; transition: border 0.15s; }
        .s-field input:focus, .s-field select:focus { border-color: #1A6BFF; }
        .s-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        @media (max-width: 520px) { .s-row2 { grid-template-columns: 1fr; } }
        .s-radio { display: flex; gap: 8px; }
        .s-radio button { flex: 1; border: 1.5px solid #E5E7EB; border-radius: 10px; padding: 11px; background: #fff; font-family: inherit; font-size: 13px; font-weight: 600; color: #666; cursor: pointer; transition: all 0.15s; }
        .s-radio button.sel { border-color: #1A6BFF; background: #F5F9FF; color: #1A6BFF; }
        .s-btn { width: 100%; background: #1A6BFF; color: #fff; border: none; border-radius: 100px; padding: 18px; font-family: inherit; font-size: 15px; font-weight: 700; cursor: pointer; margin-top: 12px; display: flex; align-items: center; justify-content: center; gap: 10px; transition: all 0.15s; box-shadow: 0 4px 14px rgba(26,107,255,0.25); }
        .s-btn:hover:not(:disabled) { background: #0D5AE0; box-shadow: 0 6px 20px rgba(26,107,255,0.35); transform: translateY(-1px); }
        .s-btn:disabled { background: #E5E7EB; color: #A0A5AD; cursor: not-allowed; box-shadow: none; }
        .s-btn-back { width: 100%; background: transparent; color: #666; border: 1.5px solid #EEE; border-radius: 100px; padding: 16px; font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; margin-top: 10px; transition: all 0.15s; }
        .s-btn-back:hover { border-color: #999; color: #111; }
        .s-success { text-align: center; padding: 20px 0; }
        .s-badge { display: inline-flex; align-items: center; gap: 8px; background: #F0F5FF; color: #1A6BFF; font-size: 13px; font-weight: 700; padding: 6px 16px; border-radius: 100px; margin-bottom: 20px; }
      `}</style>

      <nav className="s-nav">
        <Logo height={56} tone="light" />
        <button className="s-back" onClick={() => navigate({ to: '/' })}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8l4 4" stroke="#666" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
              <div className="s-choix-icon"><IconPerson /></div>
              <div>
                <h3>Personne physique</h3>
                <p>Particulier, salarié, commerçant, artisan…</p>
              </div>
            </button>
            <button className={`s-choix ${type === 'Personne morale' ? 'sel' : ''}`} onClick={() => setType('Personne morale')}>
              <div className="s-choix-icon"><IconBuilding /></div>
              <div>
                <h3>Personne morale / PME</h3>
                <p>Entreprise, coopérative, société…</p>
              </div>
            </button>
          </div>
          <button className="s-btn" disabled={!type} onClick={() => setStep(2)}>
            Continuer
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8h8M9 5l3 3-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8h8M9 5l3 3-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button className="s-btn-back" onClick={() => setStep(1)}>← Retour</button>
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
            {!loading && <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8h8M9 5l3 3-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </button>
          <button className="s-btn-back" onClick={() => setStep(2)}>← Retour</button>
        </>}

        {step === 4 && <div className="s-success">
          <div className="s-badge">Dossier reçu !</div>
          <h1 className="s-h1">Votre score : {score}/100</h1>
          <p className="s-sub">{score >= 70 ? 'Excellent ! Votre dossier est très éligible. Un conseiller vous contacte sous 24h.' : score >= 50 ? 'Éligible. Notre équipe va renforcer votre dossier avec vous.' : 'Améliorons votre dossier ensemble. Un conseiller vous rappelle sous 24h.'}</p>

          <div className="s-card" style={{ textAlign: 'left' }}>
            <div className="s-sec">Référence dossier</div>
            <div style={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all', color: '#111' }}>{leadId}</div>
          </div>

          <button className="s-btn" style={{ background: '#25D366', boxShadow: '0 4px 14px rgba(37,211,102,0.3)' }} onClick={() => window.open(`https://wa.me/242060000000?text=Bonjour, j'ai soumis mon dossier. Ref: ${leadId}`, '_blank')}>
            Confirmer sur WhatsApp
          </button>
          <button className="s-btn-back" onClick={() => navigate({ to: '/' })}>← Retour à l'accueil</button>
        </div>}

      </main>
    </div>
  )
}
