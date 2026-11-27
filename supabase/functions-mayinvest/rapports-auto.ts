// Rapports automatiques Mayinvest PréSelect (cahier des charges §4)
// Une seule fonction pour les 4 rapports : { type: 'hebdo' | 'bancarisation' | 'banques' | 'commerciaux', courante?: boolean, declencheur?: 'auto' | 'manuel' }
// Les chiffres viennent de la base (fonction SQL mi_rapport) : mêmes calculs que la page Rapports.
// Appel protégé : la clé d'appel doit être celle du coffre (mi_cron_key), vérifiée en base.

import { createClient } from 'npm:@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FROM_ENV = Deno.env.get('RESEND_FROM') || ''
const FROM = FROM_ENV && !FROM_ENV.includes('resend.dev') ? FROM_ENV : 'Mayinvest <noreply@mayinvestcapitalstrategy.com>'
const SITE = 'https://mayinvestcapitalstrategy.com'

const BLEU = '#1A6BFF', NAVY = '#0D1B3E', GRIS = '#64748B', BORD = '#E2E8F2', FOND = '#F5F7FB'
const FONT = "-apple-system,'SF Pro Text','Segoe UI',Roboto,Helvetica,Arial,sans-serif"

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const TYPES = {
  hebdo: { log: 'weekly_leads', titre: 'Rapport hebdo', emoji: '📊', onglet: 'rapports' },
  bancarisation: { log: 'monthly_bancarisation', titre: 'Rapport bancarisation', emoji: '🏦', onglet: 'rapports' },
  banques: { log: 'monthly_banks', titre: 'Rapport banques', emoji: '📈', onglet: 'rapports' },
  commerciaux: { log: 'monthly_commercials', titre: 'Performance des commerciaux', emoji: '🏆', onglet: 'rapports' },
} as const
type TypeRapport = keyof typeof TYPES

const nb = (n: unknown) => new Intl.NumberFormat('fr-FR').format(Number(n) || 0).replace(/[  ]/g, ' ')
const xaf = (n: unknown) => `${nb(n)} XAF`
const pc = (n: unknown) => (n === null || n === undefined ? '—' : `${n} %`)
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const dateFr = (d: unknown) => d ? new Date(String(d)).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Brazzaville' }) : '—'

function ecart(cur: number, prev: number, unite = '') {
  const d = (Number(cur) || 0) - (Number(prev) || 0)
  if (!d) return `<span style="color:${GRIS}">= période précédente</span>`
  const c = d > 0 ? BLEU : '#B45309'
  return `<span style="color:${c}">${d > 0 ? '+' : '−'}${nb(Math.abs(d))}${unite} vs période précédente</span>`
}
const ligne = (label: string, valeur: string, fort = false) =>
  `<tr><td style="padding:10px 0;border-bottom:1px solid ${BORD};color:${fort ? NAVY : '#334155'};font-size:14px${fort ? ';font-weight:700' : ''}">${label}</td><td style="padding:10px 0;border-bottom:1px solid ${BORD};text-align:right;font-size:14px;color:${NAVY};font-weight:${fort ? 800 : 600}">${valeur}</td></tr>`
const titreSection = (t: string) => `<h2 style="margin:26px 0 8px;font-size:15px;color:${NAVY}">${t}</h2>`
const tableau = (entetes: string[], lignes: string[][], droite: number[] = []) => lignes.length ? `
  <table role="presentation" style="width:100%;border-collapse:collapse;font-size:13px">
    <tr>${entetes.map((h, i) => `<th style="text-align:${droite.includes(i) ? 'right' : 'left'};padding:8px 6px;background:${FOND};color:${GRIS};font-weight:600;font-size:12px">${h}</th>`).join('')}</tr>
    ${lignes.map(l => `<tr>${l.map((c, i) => `<td style="padding:8px 6px;border-bottom:1px solid ${BORD};text-align:${droite.includes(i) ? 'right' : 'left'};color:${NAVY}">${c}</td>`).join('')}</tr>`).join('')}
  </table>` : `<p style="font-size:13px;color:${GRIS};margin:0">Aucun élément sur la période.</p>`
const bouton = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:26px"><tr><td style="background:${BLEU};border-radius:100px"><a href="${href}" style="display:inline-block;padding:12px 26px;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;line-height:20px;font-family:${FONT}">${label}</a></td></tr></table>`

const CATEGORIES: Record<string, string> = {
  pas_compte: 'Pas de compte bancaire', pas_rccm: 'Pas de RCCM', flux_faible: 'Flux < 1 M/mois (couveuse)', refus: 'Refus bancaire',
}

function corpsHebdo(r: any) {
  const c = r.categories || {}
  return `
    <table role="presentation" style="width:100%;border-collapse:collapse">
      ${ligne('👥 Nouveaux leads', `${nb(r.nouveaux)}<br><small style="font-weight:400;font-size:11px">${ecart(r.nouveaux, r.precedent?.nouveaux)}</small>`)}
      ${ligne('✅ Éligibles', nb(r.eligibles))}
      ${ligne('⚠️ Non éligibles', `${nb(r.non_eligibles)}${r.taux_non_eligibles != null ? ` <span style="color:${GRIS};font-weight:400">(${r.taux_non_eligibles} %)</span>` : ''}`)}
      ${ligne('🏢 PME · 👤 Particuliers', `${nb(r.pme)} · ${nb(r.particuliers)}`)}
      ${ligne('💵 Montant total demandé', xaf(r.montant_demande))}
    </table>
    ${titreSection('Pourquoi non éligibles')}
    <table role="presentation" style="width:100%;border-collapse:collapse">
      ${ligne('🏦 Pas de compte bancaire → Pack', nb(c.pas_compte))}
      ${ligne('📄 Pas de RCCM → Pack', nb(c.pas_rccm))}
      ${ligne('🌱 Flux &lt; 1 M/mois → couveuse 3 mois (gratuit)', nb(c.flux_faible))}
      ${ligne('🚫 Refus bancaire → revoir le dossier', nb(c.refus))}
      ${ligne(`💰 Potentiel Pack (${nb((c.pas_compte || 0) + (c.pas_rccm || 0))} × ${xaf(r.prix_pack)})`, `<span style="color:${BLEU}">${xaf(r.potentiel_pack)}</span><br><small style="font-weight:400;font-size:11px">${ecart(r.potentiel_pack, r.precedent?.potentiel_pack, ' XAF')}</small>`, true)}
    </table>
    ${titreSection('Leads non éligibles de la semaine')}
    ${tableau(['Client', 'Raison', 'Ville', 'Reçu le'], (r.liste || []).map((l: any) => [esc(l.nom), CATEGORIES[l.categorie] || '—', esc(l.ville || '—'), dateFr(l.date)]))}`
}

function corpsBancarisation(r: any) {
  return `
    <table role="presentation" style="width:100%;border-collapse:collapse">
      ${ligne('🏢 PME bancarisées', `${nb(r.pme_bancarisees)}<br><small style="font-weight:400;font-size:11px">${ecart(r.pme_bancarisees, r.precedent?.pme_bancarisees)}</small>`, true)}
      ${ligne('👤 Particuliers bancarisés', nb(r.particuliers_bancarises))}
      ${ligne('⏳ Éligibles dans 3 mois', nb(r.eligibles_3_mois), true)}
      ${ligne('📦 Packs Formalisation payés', `${nb(r.packs_payes)} · ${xaf(r.packs_encaisse)}`)}
      ${ligne('🗂️ Reste à bancariser (dossiers actifs)', nb(r.reste_a_bancariser))}
    </table>
    ${titreSection('Bancarisés sur la période')}
    ${tableau(['Client', 'Type', 'Conseiller', 'Date'], (r.bancarisees || []).map((b: any) => [esc(b.nom), b.pme ? 'PME' : 'Particulier', esc(b.conseiller || '—'), dateFr(b.date) + (b.estime ? '*' : '')]))}
    ${titreSection('PME qui deviendront éligibles')}
    ${tableau(['Entreprise', 'Ville', 'Depuis le', 'Éligible vers'], (r.futurs || []).map((f: any) => [esc(f.nom), esc(f.ville || '—'), dateFr(f.depuis), `<b>${dateFr(f.eligible_le)}</b>`]))}
    <p style="font-size:12px;color:${GRIS};margin:14px 0 0;line-height:1.5">Éligible vers = 3 mois après la bancarisation ou le paiement du Pack : le temps d'avoir 3 mois de mouvements sur le compte.${r.dates_estimees ? '<br>* Date estimée (dossier passé à ce statut avant la mise en place du suivi des dates).' : ''}</p>`
}

function corpsBanques(r: any) {
  const t = r.total || {}
  return `
    <table role="presentation" style="width:100%;border-collapse:collapse">
      ${ligne('✅ Dossiers financés', `${nb(t.finances)}<br><small style="font-weight:400;font-size:11px">${ecart(t.finances, t.finances_precedent)}</small>`, true)}
      ${ligne('📨 Dossiers déposés', nb(t.deposes))}
      ${ligne('🚫 Dossiers refusés', nb(t.refuses))}
      ${ligne('⏳ En attente de décision', nb(t.en_cours))}
      ${ligne("🎯 Taux d'acceptation", `${pc(t.taux)} <span style="color:${GRIS};font-weight:400">· 12 mois : ${pc(t.taux_12m)}</span>`, true)}
      ${ligne('💵 Montant financé', xaf(t.montant_finance))}
      ${ligne('💰 Commission Mayinvest (2 %)', `<span style="color:${BLEU}">${xaf(t.commission)}</span>`, true)}
    </table>
    ${titreSection('Toutes les banques')}
    ${tableau(['Banque', 'Déposés', 'Financés', 'Refusés', 'En attente', 'Taux', 'Taux 12 mois', 'Montant financé', 'Délai moyen'],
      (r.banques || []).map((b: any) => [`<b>${esc(b.banque)}</b>`, nb(b.deposes), nb(b.finances), nb(b.refuses), nb(b.en_cours), pc(b.taux),
        b.decisions_12m ? `${pc(b.taux_12m)} <span style="color:${GRIS}">(${b.decisions_12m})</span>` : '—', xaf(b.montant_finance), b.delai_jours != null ? `${b.delai_jours} j` : '—']),
      [1, 2, 3, 4, 5, 6, 7, 8])}
    <p style="font-size:12px;color:${GRIS};margin:14px 0 0;line-height:1.5">Taux d'acceptation = financés ÷ (financés + refusés) sur la période. Le taux 12 mois (nombre de décisions entre parenthèses) est plus fiable quand une banque a peu de dossiers.${t.estimees ? `<br>${nb(t.estimees)} décision(s) sans banque de dépôt renseignée : la banque du client a été retenue.` : ''}</p>`
}

const heures = (h: unknown) => h === null || h === undefined ? '—' : Number(h) < 24 ? `${Math.round(Number(h))} h` : `${Math.round(Number(h) / 24)} j`

function corpsCommerciaux(r: any) {
  const e = r.equipe || {}
  return `
    <table role="presentation" style="width:100%;border-collapse:collapse">
      ${ligne('👥 Leads reçus par l\'équipe', `${nb(e.recus)}<br><small style="font-weight:400;font-size:11px">${ecart(e.recus, e.precedent?.recus)}</small>`)}
      ${ligne('⏱️ Délai du 1er contact (médiane)', heures(e.delai_h))}
      ${ligne('✅ Dossiers financés', `${nb(e.finances)}<br><small style="font-weight:400;font-size:11px">${ecart(e.finances, e.precedent?.finances)}</small>`, true)}
      ${ligne('💵 Montant financé', xaf(e.montant_finance))}
      ${ligne('📦 Packs vendus · 🏦 Bancarisés', `${nb(e.packs)} · ${nb(e.bancarises)}`)}
      ${ligne('⚠️ Leads sans contact depuis 48 h', `<span style="color:${e.retard ? '#B45309' : NAVY}">${nb(e.retard)}</span>`, true)}
    </table>
    ${titreSection('Classement')}
    ${tableau(['#', 'Commercial', 'Reçus', '1er contact', 'Déposés', 'Financés', 'Transfo.', 'Montant', 'En retard'],
      (r.commerciaux || []).map((c: any) => [String(c.rang), `<b>${esc(c.nom)}</b><br><span style="color:${GRIS};font-size:11px">${esc(c.ville || '')}</span>`, nb(c.recus), heures(c.delai_h), nb(c.deposes), `<b>${nb(c.finances)}</b>`,
        c.transfo == null ? '—' : `${c.transfo} %${c.fiable ? '' : '<span style="color:#D9690B">*</span>'}`, xaf(c.montant_finance), c.retard ? `<span style="color:#B45309">${nb(c.retard)}</span>` : '0']),
      [2, 3, 4, 5, 6, 7, 8])}
    <p style="font-size:12px;color:${GRIS};margin:14px 0 0;line-height:1.5">Classement : financés, puis taux de transformation (financés ÷ leads reçus), puis montant financé. * Moins de 5 leads reçus : taux peu fiable. Délai du 1er contact = médiane entre l'arrivée du lead et son premier changement de statut.</p>`
}

function email(type: TypeRapport, r: any) {
  const t = TYPES[type]
  const phrase = String(r.phrase || '').split('\n').map(esc).join('<br>')
  const corps = type === 'hebdo' ? corpsHebdo(r) : type === 'bancarisation' ? corpsBancarisation(r) : type === 'commerciaux' ? corpsCommerciaux(r) : corpsBanques(r)
  return `
  <div style="font-family:${FONT};max-width:640px;margin:0 auto;padding:24px 12px;background:#F8FAFC;color:${NAVY}">
    <div style="background:${NAVY};color:#fff;padding:22px 24px;border-radius:16px 16px 0 0">
      <div style="font-size:12px;letter-spacing:.04em;text-transform:uppercase;opacity:.7">Mayinvest PréSelect</div>
      <h1 style="margin:6px 0 0;font-size:21px">${t.emoji} ${t.titre}</h1>
      <p style="margin:6px 0 0;opacity:.8;font-size:13px">${esc(r.periode)}</p>
    </div>
    <div style="background:#fff;padding:24px;border-radius:0 0 16px 16px;border:1px solid ${BORD};border-top:none">
      <div style="background:#EAF1FF;border-left:4px solid ${BLEU};border-radius:10px;padding:14px 16px;font-size:16px;line-height:1.6;font-weight:600;color:${NAVY}">${phrase}</div>
      <div style="margin-top:18px">${corps}</div>
      ${bouton(`${SITE}/admin`, 'Ouvrir la page Rapports')}
    </div>
    <p style="font-size:11px;color:${GRIS};text-align:center;margin-top:16px">Rapport automatique · calculé le ${dateFr(r.calcule_le)}</p>
  </div>`
}

const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  const cle = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  const { data: autorise } = await supabase.rpc('mi_verifier_cle_rapport', { p_cle: cle })
  if (!cle || autorise !== true) return json({ ok: false, error: 'Accès refusé' }, 401)

  let body: any = {}
  try { body = await req.json() } catch { /* corps vide */ }
  const type = body.type as TypeRapport
  if (!TYPES[type]) return json({ ok: false, error: 'Type de rapport inconnu' }, 400)
  const declencheur = body.declencheur === 'manuel' ? 'manuel' : 'auto'
  const cfg = TYPES[type]

  let destinataires: string[] = []
  try {
    const { data: r, error } = await supabase.rpc('mi_rapport', { p_type: type, p_courante: body.courante === true })
    if (error) throw error
    destinataires = r.destinataires
    const subject = `${cfg.emoji} ${cfg.titre} Mayinvest · ${r.periode}`
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: destinataires, subject, html: email(type, r) }),
    })
    const out = await res.json().catch(() => ({}))
    await supabase.from('report_logs').insert({
      type: cfg.log, recipients: destinataires, subject, body_summary: r.phrase, periode: r.periode, donnees: r, declencheur,
      status: res.ok ? 'sent' : 'failed', error: res.ok ? null : JSON.stringify(out),
    })
    return json({ ok: res.ok, phrase: r.phrase }, res.ok ? 200 : 500)
  } catch (err) {
    await supabase.from('report_logs').insert({ type: cfg.log, recipients: destinataires, status: 'failed', error: String((err as any)?.message || err), declencheur })
    return json({ ok: false, error: String(err) }, 500)
  }
})
