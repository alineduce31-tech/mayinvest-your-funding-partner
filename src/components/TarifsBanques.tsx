import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Landmark, Camera, CircleCheck, Plus, Upload, History, ExternalLink, RefreshCw, ArrowRight, User, Building2, ImagePlus } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { informer, CroixFermer } from '@/components/Dialogue'
import { FRAIS, aVerifier, dateTarif, formatTarif, lireValeur, FRAIS_PAR_CLE, type Profil, type Tarif } from '@/lib/comparateur'

// Admin · Comparateur : tarifs des banques relevés en agence, photo de preuve, alerte tous les 3 mois.

type BanqueAdmin = {
  id: string; nom: string; villes: string[]; actif: boolean; verifie_at: string | null
  tarifs: Record<string, Tarif & { maj_at?: string }>
  preuves: { id: number; url: string; nom: string | null; created_at: string }[]
  historique: { frais: string; valeur: number | null; unite: string; maj_at: string }[]
}

const VILLES = ['Brazzaville', 'Pointe-Noire']

export default function TarifsBanques() {
  const [liste, setListe] = useState<BanqueAdmin[] | null>(null)
  const [filtre, setFiltre] = useState<'toutes' | 'verifier'>('toutes')
  const [edit, setEdit] = useState<BanqueAdmin | 'nouvelle' | null>(null)

  async function charger() {
    const { data, error } = await supabase.rpc('admin_cmp_liste')
    if (error) { informer(error.message); setListe([]); return }
    setListe(Array.isArray(data) ? (data as BanqueAdmin[]) : [])
  }
  useEffect(() => { charger() }, [])

  const aRevoir = useMemo(() => (liste || []).filter(b => b.actif && aVerifier(b.verifie_at)), [liste])
  const affichees = filtre === 'verifier' ? aRevoir : (liste || [])

  if (liste === null) return <div className="tb-load">Chargement des tarifs…</div>

  return (
    <div className="tb">
      <style>{CSS}</style>
      <div className="tb-head">
        <div>
          <h2>Tarifs des banques</h2>
          <p>Ce que voient les visiteurs du <a href="/comparateur" target="_blank" rel="noreferrer">comparateur<ExternalLink size={12}/></a>. Relevez les tarifs en agence tous les 3 mois, photo du hall à l'appui.</p>
        </div>
        <button className="tb-add" onClick={() => setEdit('nouvelle')}><Plus size={15}/>Ajouter une banque</button>
      </div>

      {aRevoir.length > 0 ? (
        <div className="tb-alert">
          <span className="tb-alert-ic"><RefreshCw size={17}/></span>
          <span className="tb-alert-t">
            <b>{aRevoir.length} banque{aRevoir.length > 1 ? 's' : ''} à mettre à jour</b>
            <small>Jamais relevée{aRevoir.length > 1 ? 's' : ''} ou relevée{aRevoir.length > 1 ? 's' : ''} il y a plus de 90 jours</small>
          </span>
          {filtre === 'verifier'
            ? <button className="tb-alert-b" onClick={() => setFiltre('toutes')}>Tout afficher</button>
            : <button className="tb-alert-b" onClick={() => setFiltre('verifier')}>Voir<ArrowRight size={14}/></button>}
        </div>
      ) : (
        <div className="tb-alert ok">
          <span className="tb-alert-ic"><CircleCheck size={17}/></span>
          <span className="tb-alert-t"><b>Tous les tarifs sont à jour</b><small>Prochaine vérification dans moins de 90 jours</small></span>
        </div>
      )}

      <div className="tb-list">
        {affichees.map(b => {
          const nPP = FRAIS.filter(f => f.profil === 'particulier' && b.tarifs[f.cle]).length
          const nPM = FRAIS.filter(f => f.profil === 'entreprise' && b.tarifs[f.cle]).length
          const revoir = b.actif && aVerifier(b.verifie_at)
          return (
            <div key={b.id} className={`tb-row ${b.actif ? '' : 'off'}`}>
              <span className="tb-ic"><Landmark size={17}/></span>
              <span className="tb-nom"><b>{b.nom}</b><small>{b.villes.join(' · ') || 'Aucune ville'}{!b.actif && ' · masquée'}</small></span>
              <span className="tb-cnt"><User size={13}/>{nPP}/{FRAIS.filter(f => f.profil === 'particulier').length}<Building2 size={13}/>{nPM}/{FRAIS.filter(f => f.profil === 'entreprise').length}</span>
              <span className="tb-maj">{b.verifie_at ? <>Relevé le {dateTarif(b.verifie_at)}</> : 'Jamais relevée'}{b.preuves.length > 0 && <small><Camera size={12}/>{b.preuves.length} photo{b.preuves.length > 1 ? 's' : ''}</small>}</span>
              <span className={`tb-pill ${revoir ? 'rv' : 'ok'}`}>{revoir ? 'À mettre à jour' : 'À jour'}</span>
              <button className="tb-btn" onClick={() => setEdit(b)}>Mettre à jour</button>
            </div>
          )
        })}
      </div>

      {edit && <Editeur banque={edit === 'nouvelle' ? null : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); charger() }}/>}
    </div>
  )
}

function Editeur({ banque, onClose, onSaved }: { banque: BanqueAdmin | null; onClose: () => void; onSaved: () => void }) {
  const [nom, setNom] = useState(banque?.nom || '')
  const [villes, setVilles] = useState<string[]>(banque?.villes || VILLES)
  const [actif, setActif] = useState(banque?.actif ?? true)
  const [profil, setProfil] = useState<Profil>('particulier')
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(FRAIS.map(f => [f.cle, banque?.tarifs[f.cle] ? String(banque.tarifs[f.cle]!.v).replace('.', ',') : ''])))
  const [photos, setPhotos] = useState<File[]>([])
  const [envoi, setEnvoi] = useState(false)
  const [voirHisto, setVoirHisto] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const erreurs = useMemo(() => {
    const e: Record<string, string> = {}
    for (const f of FRAIS) {
      const v = lireValeur(vals[f.cle] ?? '')
      if (v === null) e[f.cle] = 'Nombre invalide'
      else if (v !== '' && f.unite === '%' && v > 100) e[f.cle] = '100 % maximum'
    }
    return e
  }, [vals])

  const groupes = useMemo(() => {
    const m = new Map<string, typeof FRAIS>()
    for (const f of FRAIS.filter(x => x.profil === profil)) m.set(f.groupe, [...(m.get(f.groupe) || []), f])
    return [...m.entries()]
  }, [profil])

  async function enregistrer() {
    if (!nom.trim()) return informer('Indiquez le nom de la banque.')
    if (Object.keys(erreurs).length) return informer('Corrigez les montants signalés en rouge.')
    setEnvoi(true)
    try {
      let id = banque?.id || null
      if (!banque || banque.nom !== nom.trim() || banque.actif !== actif || banque.villes.join() !== villes.join()) {
        const { data, error } = await supabase.rpc('admin_cmp_banque', { p_id: id, p_nom: nom.trim(), p_villes: villes, p_actif: actif })
        if (error) throw error
        id = data as string
      }
      const preuves: { url: string; nom: string }[] = []
      for (const f of photos) {
        const ext = (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
        const path = `${id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error } = await supabase.storage.from('comparateur-preuves').upload(path, f, { contentType: f.type, upsert: false })
        if (error) throw new Error(`Photo « ${f.name} » non envoyée : ${error.message}`)
        preuves.push({ url: supabase.storage.from('comparateur-preuves').getPublicUrl(path).data.publicUrl, nom: f.name })
      }
      const tarifs: Record<string, { v: string; u: string }> = {}
      for (const f of FRAIS) {
        const v = lireValeur(vals[f.cle] ?? '')
        tarifs[f.cle] = { v: v === '' || v === null ? '' : String(v), u: f.unite }
      }
      const { error } = await supabase.rpc('admin_cmp_enregistrer', { p_banque: id, p_tarifs: tarifs, p_preuves: preuves })
      if (error) throw error
      informer(`Tarifs de ${nom.trim()} enregistrés`, 'ok')
      onSaved()
    } catch (e: any) {
      informer(e?.message || "Enregistrement impossible.")
    } finally { setEnvoi(false) }
  }

  return createPortal(
    <div className="tb-ov" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <style>{CSS}</style>
      <div className="tb-md" role="dialog" aria-modal="true" aria-label={banque ? `Tarifs ${banque.nom}` : 'Nouvelle banque'}>
        <div className="tb-md-h">
          <span className="tb-ic"><Landmark size={18}/></span>
          <div><b>{banque ? banque.nom : 'Nouvelle banque'}</b><small>{banque?.verifie_at ? `Dernier relevé le ${dateTarif(banque.verifie_at)}` : 'Aucun relevé pour le moment'}</small></div>
          <CroixFermer onClick={onClose}/>
        </div>

        <div className="tb-md-b">
          <div className="tb-gen">
            <label className="tb-f"><span>Nom</span><input value={nom} onChange={e => setNom(e.target.value)} placeholder="UBA Congo"/></label>
            <div className="tb-f"><span>Présente à</span>
              <div className="tb-vl">{VILLES.map(v => (
                <button key={v} type="button" className={villes.includes(v) ? 'on' : ''} onClick={() => setVilles(x => x.includes(v) ? x.filter(y => y !== v) : [...x, v])}>{v}</button>
              ))}</div>
            </div>
            <label className="tb-sw"><input type="checkbox" checked={actif} onChange={e => setActif(e.target.checked)}/><span>Visible dans le comparateur</span></label>
          </div>

          <div className="tb-seg">
            <button className={profil === 'particulier' ? 'on' : ''} onClick={() => setProfil('particulier')}><User size={14}/>Particuliers</button>
            <button className={profil === 'entreprise' ? 'on' : ''} onClick={() => setProfil('entreprise')}><Building2 size={14}/>Entreprises</button>
          </div>
          <p className="tb-hint">Laissez vide un frais non affiché par la banque : elle ne sera simplement pas classée pour ce besoin.</p>

          {groupes.map(([g, fs]) => (
            <div key={g} className="tb-grp">
              <p className="tb-grp-t">{g}</p>
              <div className="tb-grid">
                {fs.map(f => (
                  <label key={f.cle} className={`tb-in ${erreurs[f.cle] ? 'err' : ''}`}>
                    <span>{f.libelle}</span>
                    <span className="tb-in-w">
                      <input inputMode="decimal" value={vals[f.cle]} onChange={e => setVals(v => ({ ...v, [f.cle]: e.target.value }))} placeholder="—"/>
                      <em>{f.unite === '%' ? '%' : 'XAF'}</em>
                    </span>
                    {erreurs[f.cle] && <small>{erreurs[f.cle]}</small>}
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="tb-grp">
            <p className="tb-grp-t">Photos du hall (preuve)</p>
            <div className="tb-ph">
              {(banque?.preuves || []).slice(0, 6).map(p => <a key={p.id} href={p.url} target="_blank" rel="noreferrer" title={`Ajoutée le ${dateTarif(p.created_at)}`}><img src={p.url} alt={p.nom || 'Photo du hall'}/></a>)}
              {photos.map((f, i) => <span key={i} className="new"><ImagePlus size={16}/>{f.name}</span>)}
              <button type="button" onClick={() => fileRef.current?.click()}><Upload size={15}/>Ajouter des photos</button>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => { setPhotos(p => [...p, ...Array.from(e.target.files || [])]); e.target.value = '' }}/>
            </div>
          </div>

          {banque && banque.historique.length > 0 && (
            <div className="tb-grp">
              <button className="tb-hb" onClick={() => setVoirHisto(v => !v)}><History size={14}/>{voirHisto ? 'Masquer' : 'Voir'} l'historique des changements</button>
              {voirHisto && <div className="tb-hist">{banque.historique.map((h, i) => (
                <div key={i}><span>{dateTarif(h.maj_at)}</span><span>{FRAIS_PAR_CLE[h.frais]?.libelle || h.frais}</span><b>{h.valeur === null ? 'retiré' : formatTarif({ v: h.valeur, u: h.unite as any })}</b></div>
              ))}</div>}
            </div>
          )}
        </div>

        <div className="tb-md-f">
          <button className="tb-sec" onClick={onClose}>Annuler</button>
          <button className="tb-pri" onClick={enregistrer} disabled={envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer le relevé'}</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

const CSS = `
.tb-load { padding: 40px; text-align: center; color: #64748B; }
.tb-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
.tb-head h2 { margin: 0; font-size: 22px; font-weight: 800; color: #0D1B3E; }
.tb-head p { margin: 4px 0 0; color: #64748B; font-size: 14px; max-width: 560px; }
.tb-head a { color: #1A6BFF; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 3px; }
.tb-add { display: inline-flex; align-items: center; gap: 6px; background: #1A6BFF; color: #fff; border: none; border-radius: 12px; padding: 10px 14px; font: inherit; font-weight: 700; font-size: 14px; cursor: pointer; }
.tb-alert { display: flex; align-items: center; gap: 12px; background: #fff; border: 1px solid #E8EDF3; border-radius: 16px; padding: 14px 16px; margin-bottom: 16px; }
.tb-alert-ic { width: 38px; height: 38px; border-radius: 12px; background: #EEF4FF; color: #1A6BFF; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.tb-alert.ok .tb-alert-ic { background: #ECFDF3; color: #16A34A; }
.tb-alert-t { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.tb-alert-t b { color: #0D1B3E; font-size: 15px; }
.tb-alert-t small { color: #64748B; font-size: 13px; }
.tb-alert-b { display: inline-flex; align-items: center; gap: 5px; border: 1px solid #DCE6F5; background: #fff; color: #1A6BFF; border-radius: 10px; padding: 8px 12px; font: inherit; font-weight: 700; font-size: 13.5px; cursor: pointer; white-space: nowrap; }
.tb-list { background: #fff; border: 1px solid #E8EDF3; border-radius: 16px; overflow: hidden; }
.tb-row { display: grid; grid-template-columns: 38px minmax(150px,1.3fr) auto minmax(120px,1fr) auto auto; gap: 14px; align-items: center; padding: 12px 16px; border-top: 1px solid #F1F5F9; }
.tb-row:first-child { border-top: none; }
.tb-row.off { opacity: .55; }
.tb-ic { width: 36px; height: 36px; border-radius: 11px; background: #F1F5F9; color: #0D1B3E; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.tb-nom { display: flex; flex-direction: column; min-width: 0; }
.tb-nom b { color: #0D1B3E; font-size: 14.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tb-nom small, .tb-maj small { color: #94A3B8; font-size: 12px; display: inline-flex; align-items: center; gap: 4px; }
.tb-cnt { display: inline-flex; align-items: center; gap: 5px; color: #64748B; font-size: 12.5px; white-space: nowrap; }
.tb-cnt svg:nth-of-type(2) { margin-left: 6px; }
.tb-maj { display: flex; flex-direction: column; color: #334155; font-size: 13px; }
.tb-pill { font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px; white-space: nowrap; }
.tb-pill.rv { background: #EEF4FF; color: #1A4ECC; }
.tb-pill.ok { background: #ECFDF3; color: #15803D; }
.tb-btn { border: 1px solid #E2E8F0; background: #fff; color: #0D1B3E; border-radius: 10px; padding: 8px 12px; font: inherit; font-weight: 600; font-size: 13px; cursor: pointer; white-space: nowrap; }
.tb-btn:hover { border-color: #1A6BFF; color: #1A6BFF; }
.tb-ov { position: fixed; inset: 0; background: rgba(13,27,62,0.45); display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 1000; font-family: 'Plus Jakarta Sans', -apple-system, system-ui, sans-serif; }
.tb-md { background: #fff; border-radius: 22px; width: min(720px, 100%); max-height: calc(100vh - 32px); display: flex; flex-direction: column; overflow: hidden; color: #0D1B3E; }
.tb-md-h { display: flex; align-items: center; gap: 12px; padding: 16px 18px; border-bottom: 1px solid #F1F5F9; }
.tb-md-h div { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.tb-md-h b { font-size: 17px; }
.tb-md-h small { color: #94A3B8; font-size: 12.5px; }
.tb-md-b { padding: 16px 18px; overflow-y: auto; }
.tb-md-f { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 18px; border-top: 1px solid #F1F5F9; }
.tb-gen { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: end; }
.tb-f { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; color: #64748B; font-weight: 600; }
.tb-f input { border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 12px; font: inherit; font-size: 14px; color: #0D1B3E; }
.tb-vl { display: flex; gap: 6px; }
.tb-vl button { border: 1px solid #E2E8F0; background: #fff; border-radius: 999px; padding: 8px 12px; font: inherit; font-size: 13px; cursor: pointer; color: #0D1B3E; }
.tb-vl button.on { background: #1A6BFF; border-color: #1A6BFF; color: #fff; }
.tb-sw { grid-column: 1 / -1; display: flex; align-items: center; gap: 8px; font-size: 13.5px; color: #334155; }
.tb-seg { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; background: #F1F5F9; padding: 4px; border-radius: 12px; margin: 18px 0 8px; }
.tb-seg button { display: flex; align-items: center; justify-content: center; gap: 6px; border: none; background: transparent; padding: 9px; border-radius: 9px; font: inherit; font-weight: 600; font-size: 13.5px; color: #475569; cursor: pointer; }
.tb-seg button.on { background: #fff; color: #0D1B3E; box-shadow: 0 1px 3px rgba(13,27,62,0.1); }
.tb-hint { color: #94A3B8; font-size: 12.5px; margin: 0 0 6px; }
.tb-grp { margin-top: 14px; }
.tb-grp-t { font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: .04em; margin: 0 0 8px; }
.tb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
.tb-in { display: flex; flex-direction: column; gap: 5px; font-size: 12.5px; color: #475569; }
.tb-in-w { display: flex; align-items: center; border: 1px solid #E2E8F0; border-radius: 10px; overflow: hidden; }
.tb-in-w input { border: none; outline: none; padding: 9px 10px; font: inherit; font-size: 14px; color: #0D1B3E; width: 100%; min-width: 0; }
.tb-in-w em { font-style: normal; font-size: 12px; color: #94A3B8; padding: 0 10px; }
.tb-in-w:focus-within { border-color: #1A6BFF; box-shadow: 0 0 0 3px rgba(26,107,255,0.12); }
.tb-in.err .tb-in-w { border-color: #DC2626; }
.tb-in small { color: #DC2626; }
.tb-ph { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.tb-ph img { width: 64px; height: 64px; object-fit: cover; border-radius: 10px; border: 1px solid #E2E8F0; display: block; }
.tb-ph .new { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: #1A4ECC; background: #EEF4FF; padding: 6px 10px; border-radius: 999px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tb-ph button, .tb-hb { display: inline-flex; align-items: center; gap: 6px; border: 1px dashed #CBD5E1; background: #fff; color: #1A6BFF; border-radius: 10px; padding: 9px 12px; font: inherit; font-weight: 600; font-size: 13px; cursor: pointer; }
.tb-hb { border-style: solid; border-color: #E2E8F0; color: #334155; }
.tb-hist { margin-top: 8px; border: 1px solid #F1F5F9; border-radius: 12px; max-height: 200px; overflow-y: auto; }
.tb-hist div { display: grid; grid-template-columns: 90px 1fr auto; gap: 10px; padding: 7px 12px; font-size: 12.5px; border-top: 1px solid #F8FAFC; color: #475569; }
.tb-sec { border: 1px solid #E2E8F0; background: #fff; border-radius: 12px; padding: 10px 16px; font: inherit; font-weight: 600; cursor: pointer; color: #0D1B3E; }
.tb-pri { border: none; background: #1A6BFF; color: #fff; border-radius: 12px; padding: 10px 18px; font: inherit; font-weight: 700; cursor: pointer; }
.tb-pri:disabled { opacity: .6; }
@media (max-width: 900px) {
  .tb-row { grid-template-columns: 38px minmax(0,1fr) auto; }
  .tb-cnt, .tb-maj { grid-column: 2 / 3; }
  .tb-pill { grid-column: 3; grid-row: 1; }
  .tb-btn { grid-column: 3; grid-row: 2 / 4; align-self: center; }
}
@media (max-width: 560px) {
  .tb-gen { grid-template-columns: 1fr; }
  .tb-md { border-radius: 18px; }
  .tb-alert { flex-wrap: wrap; }
}
`
