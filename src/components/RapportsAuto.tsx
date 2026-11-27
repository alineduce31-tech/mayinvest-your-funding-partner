import { useEffect, useState, type ReactNode } from 'react'
import PerformanceCommerciaux from '@/components/PerformanceCommerciaux'
import { Trophy, CalendarRange, Landmark, BarChart3, CircleCheck, CircleAlert, Send, ChevronDown, Clock, Users, Wallet, Sprout, Ban, Building2, Hourglass, Info, Mail, UserRound, Package, FileCheck2, TrendingUp, Percent, Coins } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { confirmer, informer } from '@/components/Dialogue'
import {
  RAPPORTS, CATEGORIES_NON_ELIGIBLES, dernierEnvoi, envoisDe, dateCourte, dateHeure, ecart, echantillonFaible,
  nombre, xafTxt, tauxTxt, type TypeRapport, type Envoi,
} from '@/lib/rapports'

// Rapports automatiques du cahier des charges (§4) : phrase du rapport en direct, dernier envoi, détail complet, envoi immédiat.

type Donnees = { destinataires: string[]; hebdo: any; bancarisation: any; banques: any; commerciaux: any; envois: Envoi[] }

const ICONES: Record<TypeRapport, ReactNode> = {
  hebdo: <CalendarRange size={17}/>, bancarisation: <Landmark size={17}/>, banques: <BarChart3 size={17}/>, commerciaux: <Trophy size={17}/>,
}

function pluriel(n: number, un: string, plusieurs: string) { return `${nombre(n)} ${Number(n) > 1 ? plusieurs : un}` }

function Phrase({ type, r }: { type: TypeRapport; r: any }) {
  if (type === 'hebdo') return <p className="ra-phr">Cette semaine <b>{pluriel(r.nouveaux, 'nouveau lead', 'nouveaux leads')}</b>. <b>{pluriel(r.non_eligibles, 'non éligible', 'non éligibles')}</b>. Potentiel Pack = <b className="bl">{xafTxt(r.potentiel_pack)}</b></p>
  if (type === 'commerciaux') {
    const e = r.equipe || {}
    const top = (r.commerciaux || [])[0]
    return <p className="ra-phr">Ce mois, l'équipe a financé <b>{pluriel(e.finances, 'dossier', 'dossiers')}</b>.{top && top.finances > 0 && <> Meilleur commercial : <b className="bl">{top.nom}</b> ({nombre(top.finances)}).</>}{e.retard > 0 && <> <b className="or">{pluriel(e.retard, 'lead', 'leads')}</b> sans contact depuis 48 h.</>}</p>
  }
  if (type === 'bancarisation') return <p className="ra-phr">Ce mois on a bancarisé <b>{nombre(r.pme_bancarisees)} PME</b>. <b>{nombre(r.eligibles_3_mois)}</b> {r.eligibles_3_mois > 1 ? 'vont être éligibles' : 'va être éligible'} dans 3 mois</p>
  const actives = (r.banques || []).filter((b: any) => b.finances + b.refuses > 0)
  if (!actives.length) return <p className="ra-phr">Aucune décision de banque ce mois.{r.total?.en_cours ? <> <b>{pluriel(r.total.en_cours, 'dossier', 'dossiers')}</b> en attente de réponse.</> : null}</p>
  return <div className="ra-phr">
    {actives.slice(0, 3).map((b: any) => <p key={b.banque}><b>{b.banque}</b> a financé <b>{pluriel(b.finances, 'dossier', 'dossiers')}</b> ce mois. Taux d'acceptation <b className="bl">{tauxTxt(b.taux)}</b></p>)}
    {actives.length > 3 && <p className="ra-plus">+ {actives.length - 3} autre{actives.length - 3 > 1 ? 's' : ''} banque{actives.length - 3 > 1 ? 's' : ''} dans le détail</p>}
  </div>
}

function Ecart({ actuel, precedent, unite = '', libelle }: { actuel: number; precedent: number; unite?: string; libelle: string }) {
  const e = ecart(actuel, precedent, unite)
  return <span className={`ra-ec ${e.sens}`}>{e.sens === 'egal' ? `= ${libelle}` : `${e.texte} vs ${libelle}`}</span>
}

function Tuile({ ic, ton = 'b', label, valeur, sous }: { ic: ReactNode; ton?: string; label: string; valeur: ReactNode; sous?: ReactNode }) {
  return <div className="ra-t"><i className={`ra-ic ${ton}`}>{ic}</i><small>{label}</small><b>{valeur}</b>{sous && <span className="ra-ts">{sous}</span>}</div>
}

function Vide({ texte }: { texte: string }) { return <div className="ra-vide">{texte}</div> }

function DetailHebdo({ r }: { r: any }) {
  const c = r.categories || {}
  return <>
    <div className="ra-tuiles">
      <Tuile ic={<Users size={16}/>} label="Nouveaux leads" valeur={nombre(r.nouveaux)} sous={<Ecart actuel={r.nouveaux} precedent={r.precedent?.nouveaux} libelle="sem. passée"/>}/>
      <Tuile ic={<CircleCheck size={16}/>} label="Éligibles" valeur={nombre(r.eligibles)} sous={`${nombre(r.pme)} PME · ${nombre(r.particuliers)} particuliers`}/>
      <Tuile ic={<CircleAlert size={16}/>} ton="o" label="Non éligibles" valeur={nombre(r.non_eligibles)} sous={r.taux_non_eligibles != null ? `${r.taux_non_eligibles} % des nouveaux` : '—'}/>
      <Tuile ic={<Wallet size={16}/>} label="Potentiel Pack" valeur={xafTxt(r.potentiel_pack)} sous={<Ecart actuel={r.potentiel_pack} precedent={r.precedent?.potentiel_pack} unite=" XAF" libelle="sem. passée"/>}/>
    </div>
    <h4 className="ra-st">Pourquoi non éligibles</h4>
    <div className="ra-tab">
      <div className="ra-tr ra-th"><span>Raison</span><span className="n">Leads</span><span>Ce qu'on propose</span><span className="n">Potentiel</span></div>
      {Object.entries(CATEGORIES_NON_ELIGIBLES).map(([k, v]) => (
        <div key={k} className="ra-tr">
          <span data-l="Raison" className="ra-nom"><i className={`ra-ic sm ${k === 'refus' ? 'r' : k === 'flux_faible' ? 'g' : 'b'}`}>{k === 'pas_compte' ? <Landmark size={14}/> : k === 'pas_rccm' ? <FileCheck2 size={14}/> : k === 'flux_faible' ? <Sprout size={14}/> : <Ban size={14}/>}</i>{v.libelle}</span>
          <span data-l="Leads" className="n"><b>{nombre(c[k])}</b></span>
          <span data-l="Proposition">{v.action}</span>
          <span data-l="Potentiel" className="n">{k === 'pas_compte' || k === 'pas_rccm' ? xafTxt((c[k] || 0) * (r.prix_pack || 50000)) : '0 XAF'}</span>
        </div>
      ))}
    </div>
    <p className="ra-note"><Info size={13}/>Une seule raison par lead, dans cet ordre. Potentiel Pack = leads sans compte ou sans RCCM × {xafTxt(r.prix_pack || 50000)}. Mêmes règles que le dashboard.</p>
    <h4 className="ra-st">Leads non éligibles de la période</h4>
    {(r.liste || []).length === 0 ? <Vide texte="Aucun lead non éligible sur la période."/> : (
      <div className="ra-tab">
        <div className="ra-tr ra-th"><span>Client</span><span>Raison</span><span>Ville</span><span className="n">Reçu le</span></div>
        {r.liste.map((l: any, i: number) => (
          <div key={i} className="ra-tr"><span data-l="Client" className="ra-nom"><b>{l.nom}</b></span><span data-l="Raison">{CATEGORIES_NON_ELIGIBLES[l.categorie]?.libelle || '—'}</span><span data-l="Ville">{l.ville || '—'}</span><span data-l="Reçu le" className="n">{dateCourte(l.date)}</span></div>
        ))}
      </div>
    )}
  </>
}

function DetailBancarisation({ r }: { r: any }) {
  return <>
    <div className="ra-tuiles">
      <Tuile ic={<Building2 size={16}/>} label="PME bancarisées" valeur={nombre(r.pme_bancarisees)} sous={<Ecart actuel={r.pme_bancarisees} precedent={r.precedent?.pme_bancarisees} libelle="mois passé"/>}/>
      <Tuile ic={<UserRound size={16}/>} ton="n" label="Particuliers bancarisés" valeur={nombre(r.particuliers_bancarises)}/>
      <Tuile ic={<Hourglass size={16}/>} label="Éligibles dans 3 mois" valeur={nombre(r.eligibles_3_mois)} sous="PME"/>
      <Tuile ic={<Package size={16}/>} ton="n" label="Packs payés" valeur={nombre(r.packs_payes)} sous={xafTxt(r.packs_encaisse)}/>
      <Tuile ic={<Landmark size={16}/>} ton="o" label="Reste à bancariser" valeur={nombre(r.reste_a_bancariser)} sous="dossiers actifs"/>
    </div>
    <h4 className="ra-st">Bancarisés sur la période</h4>
    {(r.bancarisees || []).length === 0 ? <Vide texte="Aucun client bancarisé sur la période."/> : (
      <div className="ra-tab">
        <div className="ra-tr ra-th"><span>Client</span><span>Type</span><span>Conseiller</span><span className="n">Date</span></div>
        {r.bancarisees.map((b: any, i: number) => (
          <div key={i} className="ra-tr"><span data-l="Client" className="ra-nom"><b>{b.nom}</b></span><span data-l="Type">{b.pme ? 'PME' : 'Particulier'}</span><span data-l="Conseiller">{b.conseiller || '—'}</span><span data-l="Date" className="n">{dateCourte(b.date)}{b.estime && <sup title="Date estimée">*</sup>}</span></div>
        ))}
      </div>
    )}
    <h4 className="ra-st">PME qui deviendront éligibles</h4>
    {(r.futurs || []).length === 0 ? <Vide texte="Aucune PME bancarisée ou ayant payé le Pack ces 3 derniers mois."/> : (
      <div className="ra-tab">
        <div className="ra-tr ra-th"><span>Entreprise</span><span>Ville</span><span>Depuis le</span><span className="n">Éligible vers</span></div>
        {r.futurs.map((f: any, i: number) => (
          <div key={i} className="ra-tr"><span data-l="Entreprise" className="ra-nom"><b>{f.nom}</b></span><span data-l="Ville">{f.ville || '—'}</span><span data-l="Depuis le">{dateCourte(f.depuis)}</span><span data-l="Éligible vers" className="n"><b className="bl">{dateCourte(f.eligible_le)}</b></span></div>
        ))}
      </div>
    )}
    <p className="ra-note"><Info size={13}/>Éligible vers = 3 mois après la bancarisation ou le paiement du Pack : le temps d'avoir 3 mois de mouvements sur le compte.{r.dates_estimees ? ' * Date estimée : dossier passé à ce statut avant le suivi des dates.' : ''}</p>
  </>
}

function DetailBanques({ r }: { r: any }) {
  const t = r.total || {}
  return <>
    <div className="ra-tuiles">
      <Tuile ic={<CircleCheck size={16}/>} label="Dossiers financés" valeur={nombre(t.finances)} sous={<Ecart actuel={t.finances} precedent={t.finances_precedent} libelle="mois passé"/>}/>
      <Tuile ic={<Send size={16}/>} ton="n" label="Déposés" valeur={nombre(t.deposes)} sous={`${nombre(t.en_cours)} en attente de réponse`}/>
      <Tuile ic={<Ban size={16}/>} ton="r" label="Refusés" valeur={nombre(t.refuses)}/>
      <Tuile ic={<Percent size={16}/>} label="Taux d'acceptation" valeur={tauxTxt(t.taux)} sous={`12 mois : ${tauxTxt(t.taux_12m)}`}/>
      <Tuile ic={<TrendingUp size={16}/>} ton="n" label="Montant financé" valeur={xafTxt(t.montant_finance)}/>
      <Tuile ic={<Coins size={16}/>} label="Commission (2 %)" valeur={xafTxt(t.commission)}/>
    </div>
    <h4 className="ra-st">Toutes les banques</h4>
    <div className="ra-tab bq">
      <div className="ra-tr ra-th"><span>Banque</span><span className="n">Déposés</span><span className="n">Financés</span><span className="n">Refusés</span><span className="n">En attente</span><span className="n">Taux</span><span className="n">Taux 12 mois</span><span className="n">Montant financé</span><span className="n">Délai moyen</span></div>
      {(r.banques || []).map((b: any) => (
        <div key={b.banque} className="ra-tr">
          <span data-l="Banque" className="ra-nom"><i className="ra-ic sm b"><Landmark size={14}/></i><b>{b.banque}</b></span>
          <span data-l="Déposés" className="n">{nombre(b.deposes)}</span>
          <span data-l="Financés" className="n"><b>{nombre(b.finances)}</b></span>
          <span data-l="Refusés" className="n">{nombre(b.refuses)}</span>
          <span data-l="En attente" className="n">{nombre(b.en_cours)}</span>
          <span data-l="Taux" className="n"><b className={b.taux != null ? 'bl' : ''}>{tauxTxt(b.taux)}</b></span>
          <span data-l="Taux 12 mois" className="n">{tauxTxt(b.taux_12m)}{b.decisions_12m > 0 && <small className={`ra-ech ${echantillonFaible(b.decisions_12m) ? 'faible' : ''}`} title={echantillonFaible(b.decisions_12m) ? 'Moins de 5 décisions : taux encore peu fiable' : 'Nombre de décisions sur 12 mois'}>{b.decisions_12m} déc.</small>}</span>
          <span data-l="Montant financé" className="n">{xafTxt(b.montant_finance)}</span>
          <span data-l="Délai moyen" className="n">{b.delai_jours != null ? `${b.delai_jours} j` : '—'}</span>
        </div>
      ))}
    </div>
    <p className="ra-note"><Info size={13}/>Taux d'acceptation = financés ÷ (financés + refusés) sur la période. Le taux 12 mois est plus fiable quand une banque a peu de décisions (moins de 5 : signalé en orange).{t.estimees ? ` ${pluriel(t.estimees, 'décision', 'décisions')} sans banque de dépôt renseignée : la banque du client a été retenue. Renseignez-la dans la fiche du dossier.` : ''}</p>
  </>
}

function Historique({ envois }: { envois: Envoi[] }) {
  if (!envois.length) return <Vide texte="Aucun envoi pour l'instant."/>
  return <div className="ra-hist">
    {envois.map(e => (
      <div key={e.id} className="ra-hr">
        <i className={`ra-ic sm ${e.status === 'sent' ? 'b' : 'r'}`}>{e.status === 'sent' ? <CircleCheck size={14}/> : <CircleAlert size={14}/>}</i>
        <div className="ra-hc">
          <div className="ra-ht"><b>{dateHeure(e.sent_at)}</b><span className="ra-chip">{e.declencheur === 'manuel' ? 'Envoi manuel' : 'Automatique'}</span>{e.status !== 'sent' && <span className="ra-chip r">Échec</span>}</div>
          {e.body_summary && <div className="ra-hs">{e.body_summary.split('\n').join(' · ')}</div>}
          {e.periode && <div className="ra-hp">{e.periode}</div>}
        </div>
      </div>
    ))}
  </div>
}

export default function RapportsAuto() {
  const [d, setD] = useState<Donnees | null>(null)
  const [err, setErr] = useState('')
  const [ouvert, setOuvert] = useState<TypeRapport | null>(null)
  const [envoi, setEnvoi] = useState<TypeRapport | null>(null)

  async function charger() {
    const { data, error } = await supabase.rpc('admin_rapports')
    if (error) { setErr(error.message); return }
    setErr(''); setD(data as Donnees)
  }
  useEffect(() => { charger() }, [])

  async function envoyer(type: TypeRapport, titre: string) {
    if (!d) return
    if (!(await confirmer({ titre: `Envoyer le ${titre.toLowerCase()} maintenant ?`, texte: `Chiffres de la période en cours, envoyés à ${d.destinataires.join(' et ')}.`, bouton: 'Envoyer' }))) return
    setEnvoi(type)
    const { error } = await supabase.rpc('admin_envoyer_rapport', { p_type: type })
    if (error) { setEnvoi(null); informer(error.message); return }
    informer('Rapport en cours d’envoi.', 'ok')
    setTimeout(async () => { await charger(); setEnvoi(null) }, 6000)
  }

  if (err) return <div className="ra"><div className="ra-err"><CircleAlert size={16}/>Rapports indisponibles : {err}</div></div>
  if (!d) return <div className="ra"><div className="ra-grid">{RAPPORTS.map(x => <div key={x.type} className="ra-c sk"/>)}</div></div>

  const sel = RAPPORTS.find(x => x.type === ouvert)
  return <section className="ra" aria-label="Rapports automatiques">
    <div className="ra-h">
      <div>
        <h3>Rapports automatiques</h3>
        <p><Mail size={13}/>Envoyés par email à {d.destinataires.map((m, i) => <span key={m}>{i > 0 && ' et '}<b>{m}</b></span>)}</p>
      </div>
    </div>
    <div className="ra-grid">
      {RAPPORTS.map(x => {
        const r = (d as any)[x.type]
        const dern = dernierEnvoi(d.envois, x.type)
        return (
          <article key={x.type} className={`ra-c ${ouvert === x.type ? 'on' : ''}`}>
            <div className="ra-ch"><i className="ra-ic">{ICONES[x.type]}</i><div><b>{x.titre}</b><small>{x.rythme} · {x.periode}</small></div></div>
            <div className="ra-per">{r.periode}</div>
            <Phrase type={x.type} r={r}/>
            <div className="ra-meta">
              {dern ? <span className={dern.ok ? 'ok' : 'ko'}>{dern.ok ? <CircleCheck size={14}/> : <CircleAlert size={14}/>}Dernier envoi : {dateCourte(dern.date)} · {dern.ok ? 'reçu' : 'échec'}</span>
                : <span><Clock size={14}/>Pas encore envoyé</span>}
              <span><Clock size={14}/>Prochain : {dateHeure(r.prochain_envoi)}</span>
            </div>
            <div className="ra-act">
              <button type="button" className="ra-b sec" aria-expanded={ouvert === x.type} onClick={() => setOuvert(o => o === x.type ? null : x.type)}>
                {ouvert === x.type ? 'Masquer' : 'Voir le détail'}<ChevronDown size={14} className={ouvert === x.type ? 'up' : ''}/>
              </button>
              <button type="button" className="ra-b pri" disabled={envoi === x.type} onClick={() => envoyer(x.type, x.titre)}>
                <Send size={14}/>{envoi === x.type ? 'Envoi…' : 'Envoyer maintenant'}
              </button>
            </div>
          </article>
        )
      })}
    </div>
    {sel && (
      <div className="ra-det">
        <div className="ra-dh"><i className="ra-ic">{ICONES[sel.type]}</i><div><b>{sel.titre}</b><small>{(d as any)[sel.type].periode} · écarts calculés sur les mêmes jours {sel.type === 'hebdo' ? 'de la semaine' : 'du mois'} précédent{sel.type === 'hebdo' ? 'e' : ''}</small></div></div>
        {sel.type === 'hebdo' && <DetailHebdo r={d.hebdo}/>}
        {sel.type === 'bancarisation' && <DetailBancarisation r={d.bancarisation}/>}
        {sel.type === 'banques' && <DetailBanques r={d.banques}/>}
        {sel.type === 'commerciaux' && <div style={{ marginTop: 14 }}><PerformanceCommerciaux/></div>}
        <h4 className="ra-st">Derniers envois</h4>
        <Historique envois={envoisDe(d.envois, sel.type)}/>
      </div>
    )}
  </section>
}
