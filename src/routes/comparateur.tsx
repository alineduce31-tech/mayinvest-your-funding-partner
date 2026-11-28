import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { User, Building2, ArrowRight, ArrowLeft, Camera, ChevronDown, Info, RotateCcw, Scale, Check } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { Logo } from '@/components/Logo'
import {
  BESOINS, VILLES_CMP, TRANCHES, HYPOTHESES, calculTop3, economie, formatF, dateTarif, type Banque, type Profil, type Classement,
} from '@/lib/comparateur'

export const Route = createFileRoute('/comparateur')({
  component: Comparateur,
  head: () => ({
    meta: [
      { title: 'Comparer les frais des banques au Congo | Mayinvest' },
      { name: 'description', content: 'Comparez gratuitement les frais des banques à Brazzaville et Pointe-Noire : compte, carte, virement, retrait, crédit. 3 questions, 1 minute.' },
    ],
  }),
})

function Comparateur() {
  const navigate = useNavigate()
  const [banques, setBanques] = useState<Banque[] | null>(null)
  const [profil, setProfil] = useState<Profil>('particulier')
  const [besoins, setBesoins] = useState<string[]>([])
  const [ville, setVille] = useState('')
  const [tranche, setTranche] = useState('')
  const [erreur, setErreur] = useState('')
  const [resultat, setResultat] = useState<Classement | null>(null)
  const [ouvert, setOuvert] = useState<string | null>(null)

  useEffect(() => {
    supabase.rpc('comparateur_donnees').then(({ data }) => setBanques(Array.isArray(data) ? (data as Banque[]) : []))
  }, [])

  function choisirProfil(p: Profil) {
    if (p === profil) return
    setProfil(p); setBesoins([]); setTranche(''); setErreur('')
  }
  function basculer(k: string) {
    setErreur('')
    setBesoins(b => b.includes(k) ? b.filter(x => x !== k) : [...b, k])
  }

  function comparer() {
    if (!besoins.length) return setErreur('Choisissez au moins un besoin.')
    if (!ville) return setErreur('Indiquez votre ville.')
    if (!tranche) return setErreur(profil === 'particulier' ? 'Indiquez votre revenu.' : "Indiquez votre chiffre d'affaires.")
    const c = calculTop3(banques || [], profil, besoins, ville, tranche)
    setResultat(c)
    setOuvert(null)
    supabase.rpc('comparateur_noter', { p_profil: profil, p_besoins: besoins, p_ville: ville, p_tranche: tranche }).then(() => {})
    setTimeout(() => document.getElementById('cp-res')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const libelles = useMemo(() => BESOINS[profil].filter(b => besoins.includes(b.k)).map(b => b.label.toLowerCase()), [profil, besoins])
  const eco = resultat ? economie(resultat) : 0
  const dateMaj = resultat?.top.map(r => r.banque.verifie_at).filter(Boolean).sort().at(0)

  return (
    <div className="cp">
      <style>{CSS}</style>
      <nav className="cp-nav">
        <Logo height={48} tone="light"/>
        <a className="cp-navl" href="/mon-dossier" onClick={e => { e.preventDefault(); navigate({ to: '/mon-dossier' }) }}>Mon dossier</a>
      </nav>

      <header className="cp-hero">
        <span className="cp-tag"><Scale size={14}/>Comparateur gratuit · sans inscription</span>
        <h1>Comparez les frais des banques au Congo</h1>
        <p>Trois questions, une minute. Nous calculons pour vous les trois banques les moins chères.</p>
      </header>

      <section className="cp-card" aria-label="Vos besoins">
        <div className="cp-seg" role="tablist">
          <button role="tab" aria-selected={profil === 'particulier'} className={profil === 'particulier' ? 'on' : ''} onClick={() => choisirProfil('particulier')}><User size={16}/>Particulier</button>
          <button role="tab" aria-selected={profil === 'entreprise'} className={profil === 'entreprise' ? 'on' : ''} onClick={() => choisirProfil('entreprise')}><Building2 size={16}/><span>Entreprise<span className="cp-hide-m"> / PME</span></span></button>
        </div>

        <p className="cp-q"><b>1</b>Que voulez-vous ? <span>plusieurs choix possibles</span></p>
        <div className="cp-chips">
          {BESOINS[profil].map(b => (
            <button key={b.k} className={`cp-chip ${besoins.includes(b.k) ? 'on' : ''}`} aria-pressed={besoins.includes(b.k)} onClick={() => basculer(b.k)}>
              {besoins.includes(b.k) && <Check size={14}/>}{b.label}
            </button>
          ))}
        </div>

        <p className="cp-q"><b>2</b>Où êtes-vous ?</p>
        <div className="cp-chips">
          {VILLES_CMP.map(v => <button key={v} className={`cp-chip ${ville === v ? 'on' : ''}`} aria-pressed={ville === v} onClick={() => { setVille(v); setErreur('') }}>{v}</button>)}
        </div>

        <p className="cp-q"><b>3</b>{profil === 'particulier' ? 'Votre revenu par mois ?' : "Votre chiffre d'affaires par an ?"}</p>
        <div className="cp-chips">
          {TRANCHES[profil].map(t => <button key={t.k} className={`cp-chip ${tranche === t.k ? 'on' : ''}`} aria-pressed={tranche === t.k} onClick={() => { setTranche(t.k); setErreur('') }}>{t.label}</button>)}
        </div>

        {erreur && <p className="cp-err" role="alert">{erreur}</p>}
        <button className="cp-go" onClick={comparer} disabled={banques === null}>
          {banques === null ? 'Chargement des tarifs…' : <>Comparer<ArrowRight size={17}/></>}
        </button>
      </section>

      {resultat && (
        <section className="cp-card cp-res" id="cp-res" aria-live="polite">
          {resultat.top.length >= 2 ? <>
            <h2>{resultat.parTaux ? 'Les 3 banques au taux le plus bas pour vous' : `Les ${Math.min(3, resultat.top.length)} banques les moins chères pour vous`}</h2>
            <p className="cp-sub">{libelles.join(' + ')} · {resultat.parTaux ? 'taux de crédit' : 'coût estimé sur 12 mois'}{ville && ville !== 'Autre' ? ` · ${ville}` : ''}</p>
            <ol className="cp-list">
              {resultat.top.map((r, i) => (
                <li key={r.banque.id} className={i === 0 ? 'first' : ''}>
                  <button className="cp-row" onClick={() => setOuvert(o => o === r.banque.id ? null : r.banque.id)} aria-expanded={ouvert === r.banque.id}>
                    <span className="cp-rank">{i + 1}</span>
                    <span className="cp-bank"><b>{r.banque.nom}</b><small>{r.taux !== undefined ? `Taux à partir de ${String(r.taux).replace('.', ',')} %` : 'Voir le détail du calcul'}</small></span>
                    <span className="cp-tot"><b>{resultat.parTaux ? `${String(r.taux).replace('.', ',')} %` : formatF(r.total)}</b>{!resultat.parTaux && <small>par an</small>}</span>
                    <ChevronDown size={16} className={`cp-chev ${ouvert === r.banque.id ? 'up' : ''}`}/>
                  </button>
                  {i === 0 && eco > 0 && <span className="cp-eco">{formatF(eco)} de moins que la plus chère ({resultat.plusCher!.banque.nom})</span>}
                  {ouvert === r.banque.id && (
                    <div className="cp-det">
                      {r.postes.map(p => <div key={p.libelle}><span>{p.libelle}</span><b>{formatF(p.montant)}</b></div>)}
                      <div className="tot"><span>Total estimé sur 12 mois</span><b>{formatF(r.total)}</b></div>
                      {r.banque.verifie_at && <p><Camera size={13}/>Tarifs relevés en agence le {dateTarif(r.banque.verifie_at)}</p>}
                    </div>
                  )}
                </li>
              ))}
            </ol>
            <p className="cp-note"><Info size={14}/>
              <span>Classement selon le prix uniquement, calculé sur {resultat.comparables} banque{resultat.comparables > 1 ? 's' : ''} dont nous avons les tarifs.
              {' '}Hypothèses : {HYPOTHESES.virements_par_mois} virement et {HYPOTHESES.retraits_par_mois} retraits par mois{profil === 'entreprise' ? ', encaissements TPE selon votre chiffre d’affaires' : ''}.
              {dateMaj ? ` Tarifs relevés en agence depuis le ${dateTarif(dateMaj)}.` : ''} À confirmer auprès de la banque.</span>
            </p>
          </> : (
            <div className="cp-vide">
              <Camera size={22}/>
              <h2>Tarifs en cours de relevé</h2>
              <p>Nous relevons en ce moment les tarifs des banques pour ce besoin. Revenez très bientôt.</p>
            </div>
          )}

          <div className="cp-cta">
            <div><b>Besoin d'un crédit ?</b><span>Faites votre préselection gratuite et connaissez vos chances avant la banque.</span></div>
            <button onClick={() => navigate({ to: '/preselection', search: { type: profil === 'particulier' ? 'physique' : 'morale' } as never })}>Commencer<ArrowRight size={16}/></button>
          </div>
          <button className="cp-redo" onClick={() => { setResultat(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><RotateCcw size={14}/>Modifier ma recherche</button>
        </section>
      )}

      <footer className="cp-foot">
        <a href="/" onClick={e => { e.preventDefault(); navigate({ to: '/' }) }}><ArrowLeft size={14}/>Retour à l'accueil</a>
        <span>Mayinvest compare les tarifs affichés en agence. Il ne reçoit aucune rémunération des banques pour ce classement.</span>
      </footer>
    </div>
  )
}

const CSS = `
.cp { min-height: 100vh; background: #F8FAFC; color: #0D1B3E; font-family: 'Plus Jakarta Sans', -apple-system, system-ui, sans-serif; padding: 0 16px 48px; }
.cp-nav { max-width: 760px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; padding: 14px 0; }
.cp-navl { color: #0D1B3E; font-weight: 600; font-size: 14px; text-decoration: none; padding: 8px 14px; border-radius: 999px; border: 1px solid #E5E7EB; background: #fff; }
.cp-hero { max-width: 760px; margin: 18px auto 22px; text-align: center; }
.cp-tag { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; color: #1A6BFF; background: #EEF4FF; padding: 6px 12px; border-radius: 999px; }
.cp-hero h1 { font-size: clamp(28px, 5vw, 42px); line-height: 1.1; letter-spacing: -0.02em; margin: 16px 0 10px; font-weight: 800; }
.cp-hero p { color: #64748B; font-size: 16px; margin: 0 auto; max-width: 520px; line-height: 1.55; }
.cp-card { max-width: 760px; margin: 0 auto 18px; background: #fff; border: 1px solid #E8EDF3; border-radius: 22px; padding: 24px; box-shadow: 0 1px 2px rgba(13,27,62,0.04), 0 8px 24px rgba(13,27,62,0.04); }
.cp-seg { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; background: #F1F5F9; padding: 5px; border-radius: 14px; }
.cp-seg button { display: flex; align-items: center; justify-content: center; gap: 8px; border: none; background: transparent; padding: 11px; border-radius: 10px; font: inherit; font-weight: 600; font-size: 14.5px; color: #475569; cursor: pointer; }
.cp-seg button.on { background: #fff; color: #0D1B3E; box-shadow: 0 1px 3px rgba(13,27,62,0.1); }
.cp-q { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 15.5px; margin: 24px 0 12px; }
.cp-q b { width: 24px; height: 24px; border-radius: 50%; background: #0D1B3E; color: #fff; font-size: 12px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cp-q span { font-weight: 500; font-size: 12.5px; color: #94A3B8; }
.cp-q { flex-wrap: wrap; row-gap: 2px; }
.cp-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.cp-chip { display: inline-flex; align-items: center; gap: 6px; border: 1px solid #E2E8F0; background: #fff; color: #0D1B3E; padding: 10px 15px; border-radius: 999px; font: inherit; font-size: 14px; font-weight: 500; cursor: pointer; transition: all .15s; }
.cp-chip:hover { border-color: #1A6BFF; }
.cp-chip.on { background: #1A6BFF; border-color: #1A6BFF; color: #fff; }
.cp-err { color: #DC2626; font-size: 13.5px; margin: 16px 0 0; }
.cp-go { margin-top: 24px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; background: #1A6BFF; color: #fff; border: none; border-radius: 14px; padding: 15px; font: inherit; font-weight: 700; font-size: 16px; cursor: pointer; }
.cp-go:hover { background: #155AE0; }
.cp-go:disabled { opacity: .6; cursor: wait; }
.cp-res h2 { font-size: 21px; margin: 0; letter-spacing: -0.01em; }
.cp-sub { color: #64748B; font-size: 14px; margin: 4px 0 14px; }
.cp-list { list-style: none; margin: 0; padding: 0; }
.cp-list li { border-top: 1px solid #EEF2F6; padding: 4px 0; }
.cp-row { width: 100%; display: grid; grid-template-columns: 36px minmax(0,1fr) auto 18px; gap: 12px; align-items: center; background: none; border: none; padding: 12px 0; font: inherit; color: inherit; text-align: left; cursor: pointer; }
.cp-rank { width: 32px; height: 32px; border-radius: 50%; background: #F1F5F9; color: #0D1B3E; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.cp-list li.first .cp-rank { background: #1A6BFF; color: #fff; }
.cp-bank { display: flex; flex-direction: column; min-width: 0; }
.cp-bank b { font-size: 15.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cp-bank small, .cp-tot small { color: #94A3B8; font-size: 12px; }
.cp-tot { display: flex; flex-direction: column; align-items: flex-end; }
.cp-tot b { font-size: 16px; white-space: nowrap; }
.cp-chev { color: #94A3B8; transition: transform .2s; }
.cp-chev.up { transform: rotate(180deg); }
.cp-eco { display: inline-block; margin: 0 0 10px 48px; font-size: 12.5px; font-weight: 600; color: #1A4ECC; background: #EEF4FF; padding: 4px 10px; border-radius: 999px; }
.cp-det { margin: 0 0 12px 48px; background: #F8FAFC; border-radius: 12px; padding: 12px 14px; font-size: 13.5px; }
.cp-det div { display: flex; justify-content: space-between; gap: 12px; padding: 4px 0; color: #475569; }
.cp-det div.tot { border-top: 1px solid #E2E8F0; margin-top: 4px; padding-top: 8px; color: #0D1B3E; font-weight: 600; }
.cp-det p { display: flex; align-items: center; gap: 6px; color: #94A3B8; font-size: 12px; margin: 8px 0 0; }
.cp-note { display: flex; gap: 8px; color: #64748B; font-size: 12.5px; line-height: 1.5; margin: 14px 0 0; padding-top: 14px; border-top: 1px solid #EEF2F6; }
.cp-note svg { flex-shrink: 0; margin-top: 2px; }
.cp-vide { text-align: center; padding: 10px 0 4px; color: #64748B; }
.cp-vide svg { color: #1A6BFF; }
.cp-vide h2 { color: #0D1B3E; margin: 8px 0 6px; }
.cp-vide p { margin: 0 auto; max-width: 420px; font-size: 14.5px; }
.cp-cta { margin-top: 20px; display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; background: #0D1B3E; color: #fff; border-radius: 16px; padding: 16px 18px; }
.cp-cta div { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1 1 240px; }
.cp-cta span { color: rgba(255,255,255,0.7); font-size: 13.5px; }
.cp-cta button { display: inline-flex; align-items: center; gap: 6px; background: #1A6BFF; color: #fff; border: none; border-radius: 12px; padding: 11px 16px; font: inherit; font-weight: 700; cursor: pointer; }
.cp-redo { margin: 14px auto 0; display: flex; align-items: center; gap: 6px; background: none; border: none; color: #1A6BFF; font: inherit; font-weight: 600; font-size: 14px; cursor: pointer; }
.cp-foot { max-width: 760px; margin: 26px auto 0; display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; color: #94A3B8; font-size: 12.5px; }
.cp-foot a { display: inline-flex; align-items: center; gap: 6px; color: #475569; text-decoration: none; font-weight: 600; font-size: 13.5px; }
@media (max-width: 560px) {
  .cp-card { padding: 18px; border-radius: 18px; }
  .cp-row { grid-template-columns: 32px minmax(0,1fr) auto 16px; gap: 10px; }
  .cp-eco, .cp-det { margin-left: 0; }
  .cp-cta button { width: 100%; justify-content: center; }
  .cp-hide-m { display: none; }
  .cp-q span { flex-basis: 100%; padding-left: 34px; }
}
`
