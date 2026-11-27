import { useEffect, useState } from 'react'
import { Users, Timer, CircleCheck, TrendingUp, AlertTriangle, Send, Trophy, Megaphone, HeartHandshake, Package, Landmark, Percent, Wallet, ChevronRight, Info, CircleAlert } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { confirmer, demanderTexte, informer } from '@/components/Dialogue'
import { PERIODES_PERF, delaiOk, delaiTxt, etapesParcours, messageConseille, texteMessage, type PerfCommercial, type PeriodePerf, type TypeMessage } from '@/lib/performance'
import { dateCourte, ecart, nombre, tauxTxt, xafTxt } from '@/lib/rapports'

// Onglet « Performance » de l'équipe commerciale : chiffres de l'équipe, classement, parcours de chaque commercial,
// et messages pour le relancer ou le motiver (envoyés dans sa messagerie d'équipe).

type Donnees = { periode: string; equipe: any; commerciaux: PerfCommercial[] }

const MESSAGES: Record<TypeMessage, { label: string; titre: string; ic: any }> = {
  relance: { label: 'Relancer', titre: 'Relancer', ic: Megaphone },
  felicitations: { label: 'Féliciter', titre: 'Féliciter', ic: Trophy },
  encouragement: { label: 'Encourager', titre: 'Encourager', ic: HeartHandshake },
}

function initiales(nom: string) { return nom.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase() }

function Ec({ a, b }: { a: number; b: number }) {
  const e = ecart(a, b)
  return <span className={`ra-ec ${e.sens}`}>{e.sens === 'egal' ? '= période précédente' : `${e.texte} vs période précédente`}</span>
}

export default function PerformanceCommerciaux() {
  const [periode, setPeriode] = useState<PeriodePerf>('mois')
  const [d, setD] = useState<Donnees | null>(null)
  const [err, setErr] = useState('')
  const [sel, setSel] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => {
    let vivant = true
    setD(null)
    supabase.rpc('admin_performance_commerciaux', { p_periode: periode }).then(({ data, error }) => {
      if (!vivant) return
      if (error) { setErr(error.message); return }
      setErr(''); setD(data as Donnees)
    })
    return () => { vivant = false }
  }, [periode])

  async function envoyer(c: PerfCommercial, type: TypeMessage) {
    if (!d) return
    const texte = await demanderTexte({
      titre: `${MESSAGES[type].titre} ${c.nom}`,
      texte: 'Le message part dans sa messagerie d’équipe. Vous pouvez le modifier.',
      valeur: texteMessage(type, c, d.periode, d.commerciaux.length),
      bouton: 'Envoyer', multiligne: true,
    })
    if (!texte) return
    const { error } = await supabase.rpc('send_commercial_message', { p_commercial_id: c.id, p_sender_type: 'director', p_body: texte })
    if (error) { informer('Message non envoyé : ' + error.message); return }
    informer(`Message envoyé à ${c.nom}`, 'ok')
  }

  async function relancerTous() {
    if (!d) return
    const cibles = d.commerciaux.filter(c => c.retard > 0)
    if (!cibles.length) return
    if (!(await confirmer({ titre: `Relancer ${cibles.length} commercial${cibles.length > 1 ? 'aux' : ''} ?`, texte: `Chacun reçoit dans sa messagerie la liste de ses leads sans contact depuis 48 h :\n${cibles.map(c => `• ${c.nom} (${c.retard})`).join('\n')}`, bouton: 'Envoyer les relances' }))) return
    setEnvoi(true)
    let ok = 0
    for (const c of cibles) {
      const { error } = await supabase.rpc('send_commercial_message', { p_commercial_id: c.id, p_sender_type: 'director', p_body: texteMessage('relance', c, d.periode, d.commerciaux.length) })
      if (!error) ok++
    }
    setEnvoi(false)
    informer(ok === cibles.length ? `Relance envoyée à ${ok} commercial${ok > 1 ? 'aux' : ''}` : `${ok} relance(s) envoyée(s) sur ${cibles.length}`, ok === cibles.length ? 'ok' : 'erreur')
  }

  const e = d?.equipe
  const choisi = d?.commerciaux.find(c => c.id === sel) || null
  return (
    <section className="pf" aria-label="Performance des commerciaux">
      <div className="pf-bar">
        <div className="pf-seg" role="tablist" aria-label="Période">
          {PERIODES_PERF.map(p => <button key={p.k} type="button" role="tab" aria-selected={periode === p.k} className={periode === p.k ? 'on' : ''} onClick={() => setPeriode(p.k)}>{p.label}</button>)}
        </div>
        {d && <span className="pf-per">{d.periode}</span>}
      </div>

      {err && <div className="ra-err"><CircleAlert size={16}/>Performance indisponible : {err}</div>}
      {!d && !err && <div className="ra-tuiles">{[0, 1, 2, 3, 4].map(i => <div key={i} className="ra-c sk" style={{ minHeight: 96 }}/>)}</div>}

      {d && e && <>
        <div className="ra-tuiles">
          <div className="ra-t"><i className="ra-ic"><Users size={16}/></i><small>Leads reçus</small><b>{nombre(e.recus)}</b><span className="ra-ts"><Ec a={e.recus} b={e.precedent?.recus}/></span></div>
          <div className="ra-t"><i className={`ra-ic ${delaiOk(e.delai_h) === false ? 'o' : ''}`}><Timer size={16}/></i><small>1er contact (médiane)</small><b>{delaiTxt(e.delai_h)}</b><span className="ra-ts">objectif : moins de 24 h</span></div>
          <div className="ra-t"><i className="ra-ic"><CircleCheck size={16}/></i><small>Financés</small><b>{nombre(e.finances)}</b><span className="ra-ts">{e.transfo != null ? `${e.transfo} % des leads reçus` : '—'}</span></div>
          <div className="ra-t"><i className="ra-ic n"><TrendingUp size={16}/></i><small>Montant financé</small><b>{xafTxt(e.montant_finance)}</b><span className="ra-ts">commission {xafTxt(e.commission)}</span></div>
          <div className="ra-t"><i className={`ra-ic ${e.retard ? 'o' : 'n'}`}><AlertTriangle size={16}/></i><small>En retard</small><b className={e.retard ? 'or' : ''}>{nombre(e.retard)}</b><span className="ra-ts">sans contact depuis 48 h</span></div>
        </div>

        {e.retard > 0 && (
          <div className="pf-alerte">
            <span><AlertTriangle size={16}/>{e.retard} lead{e.retard > 1 ? 's attendent' : ' attend'} un premier appel depuis plus de 48 h.</span>
            <button type="button" className="ra-b pri" disabled={envoi} onClick={relancerTous}><Megaphone size={14}/>{envoi ? 'Envoi…' : 'Relancer les retardataires'}</button>
          </div>
        )}

        <h4 className="ra-st">Classement</h4>
        {d.commerciaux.length === 0 ? <div className="ra-vide">Aucun commercial actif.</div> : (
          <div className="pf-tab">
            <div className="pf-tr pf-th"><span>#</span><span>Commercial</span><span className="n">Leads</span><span className="n">1er contact</span><span className="n">Déposés</span><span className="n">Financés</span><span className="n">Transfo.</span><span/></div>
            {d.commerciaux.map(c => (
              <button key={c.id} type="button" className={`pf-tr ${sel === c.id ? 'on' : ''} ${c.rang === 1 && c.finances > 0 ? 'top' : ''}`} onClick={() => setSel(s => s === c.id ? null : c.id)} aria-expanded={sel === c.id}>
                <span className="pf-rang">{c.rang === 1 && c.finances > 0 ? <Trophy size={15}/> : c.rang}</span>
                <span className="pf-nom"><span className="pf-ava">{initiales(c.nom)}</span><span><b>{c.nom}</b><small className={c.retard ? 'or' : ''}>{c.ville || '—'}{c.retard ? ` · ${c.retard} en retard` : c.montant_finance ? ` · ${xafTxt(c.montant_finance)}` : ''}</small></span></span>
                <span className="n" data-l="Leads">{nombre(c.recus)}</span>
                <span className={`n ${delaiOk(c.delai_h) === false ? 'or' : ''}`} data-l="1er contact">{delaiTxt(c.delai_h)}</span>
                <span className="n" data-l="Déposés">{nombre(c.deposes)}</span>
                <span className="n" data-l="Financés"><b>{nombre(c.finances)}</b></span>
                <span className="n" data-l="Transfo."><b className={c.fiable && c.transfo ? 'bl' : ''}>{tauxTxt(c.transfo)}</b>{!c.fiable && c.recus > 0 && <small className="pf-pf" title="Moins de 5 leads reçus">peu fiable</small>}</span>
                <span className="pf-chev"><ChevronRight size={16}/></span>
              </button>
            ))}
          </div>
        )}
        <p className="ra-note"><Info size={13}/>Classement : financés, puis taux de transformation (financés ÷ leads reçus), puis montant financé. Sous 5 leads reçus, le taux est marqué « peu fiable ». 1er contact = médiane entre l'arrivée du lead et son premier changement de statut.</p>

        {choisi && (
          <div className="pf-det">
            <div className="pf-dh">
              <span className="pf-ava lg">{initiales(choisi.nom)}</span>
              <div><b>{choisi.nom}</b><small>{choisi.rang}{choisi.rang === 1 ? 'er' : 'e'} sur {d.commerciaux.length} · {choisi.ville || '—'} · {nombre(choisi.actifs)} dossiers actifs</small></div>
            </div>
            <div className="pf-grid">
              <div>
                <h5>Parcours de ses leads reçus</h5>
                <div className="pf-fun">
                  {etapesParcours(choisi.parcours).map((s, i, a) => (
                    <div key={s.label} className="pf-fr"><span>{s.label}</span><span className="pf-bg"><i className={i === a.length - 1 ? 'fin' : ''} style={{ width: `${s.pct}%` }}/></span><b>{s.n}</b></div>
                  ))}
                </div>
              </div>
              <div>
                <h5>Sur la période</h5>
                <div className="pf-mini">
                  <span><Package size={14}/>Packs vendus<b>{nombre(choisi.packs)}</b></span>
                  <span><Landmark size={14}/>Bancarisés<b>{nombre(choisi.bancarises)}</b></span>
                  <span><Percent size={14}/>Acceptation banques<b>{tauxTxt(choisi.taux_acceptation)}</b></span>
                  <span><Wallet size={14}/>Ses gains<b>{xafTxt(choisi.gains)}</b></span>
                </div>
              </div>
            </div>
            {choisi.retard_liste.length > 0 && <>
              <h5>Leads sans contact depuis 48 h</h5>
              <div className="pf-ret">{choisi.retard_liste.map((r, i) => <span key={i}><b>{r.nom}</b>{r.ville ? ` · ${r.ville}` : ''} · arrivé {dateCourte(r.depuis)}</span>)}</div>
            </>}
            <h5>Lui écrire</h5>
            <div className="pf-msg">
              {(['relance', 'felicitations', 'encouragement'] as TypeMessage[]).map(t => {
                const M = MESSAGES[t], Ic = M.ic
                const conseille = messageConseille(choisi) === t
                const off = t === 'relance' && choisi.retard === 0
                return <button key={t} type="button" disabled={off} className={`ra-b ${conseille ? 'pri' : 'sec'}`} onClick={() => envoyer(choisi, t)} title={off ? 'Aucun lead en retard' : undefined}><Ic size={14}/>{M.label}{conseille && <span className="pf-cons">conseillé</span>}</button>
              })}
            </div>
            <p className="ra-note"><Send size={13}/>Le message est proposé selon ses chiffres. Vous le relisez et le modifiez avant l'envoi dans sa messagerie d'équipe.</p>
          </div>
        )}
      </>}
    </section>
  )
}
