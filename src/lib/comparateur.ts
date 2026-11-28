// Comparateur de frais bancaires (module pur, testé) : catalogue des frais, besoins, calcul du top 3.
// Miroir des clés autorisées côté base : public.mi_cmp_frais_ok.

export type Profil = 'particulier' | 'entreprise'
export type Unite = 'XAF' | '%'
export type Tarif = { v: number; u: Unite }
export type Banque = { id: string; nom: string; villes: string[]; verifie_at?: string | null | undefined; tarifs: Record<string, Tarif> }

export type Frais = { cle: string; libelle: string; unite: Unite; profil: Profil; groupe: string }

export const FRAIS: Frais[] = [
  { cle: 'ouverture_depot', libelle: "Dépôt minimum à l'ouverture", unite: 'XAF', profil: 'particulier', groupe: 'Ouvrir un compte' },
  { cle: 'ouverture_frais', libelle: "Frais d'ouverture", unite: 'XAF', profil: 'particulier', groupe: 'Ouvrir un compte' },
  { cle: 'tenue_mois', libelle: 'Tenue de compte par mois', unite: 'XAF', profil: 'particulier', groupe: 'Garder son compte' },
  { cle: 'carte_prix', libelle: 'Carte Visa ou GIMAC par an', unite: 'XAF', profil: 'particulier', groupe: 'Payer' },
  { cle: 'carte_renouv', libelle: 'Renouvellement de la carte', unite: 'XAF', profil: 'particulier', groupe: 'Payer' },
  { cle: 'carte_opposition', libelle: 'Opposition sur carte', unite: 'XAF', profil: 'particulier', groupe: 'Payer' },
  { cle: 'retrait_meme', libelle: 'Retrait au GAB de la banque', unite: 'XAF', profil: 'particulier', groupe: 'Retirer' },
  { cle: 'retrait_confrere', libelle: "Retrait au GAB d'une autre banque", unite: 'XAF', profil: 'particulier', groupe: 'Retirer' },
  { cle: 'vir_intra', libelle: 'Virement dans la même banque', unite: 'XAF', profil: 'particulier', groupe: 'Envoyer' },
  { cle: 'vir_inter', libelle: 'Virement vers une autre banque au Congo', unite: 'XAF', profil: 'particulier', groupe: 'Envoyer' },
  { cle: 'vir_momo', libelle: 'Virement Mobile Money vers banque', unite: 'XAF', profil: 'particulier', groupe: 'Envoyer' },
  { cle: 'credit_taux_min', libelle: 'Crédit conso : taux minimum', unite: '%', profil: 'particulier', groupe: 'Crédit' },
  { cle: 'credit_taux_max', libelle: 'Crédit conso : taux maximum', unite: '%', profil: 'particulier', groupe: 'Crédit' },
  { cle: 'credit_frais_dossier', libelle: 'Crédit conso : frais de dossier', unite: 'XAF', profil: 'particulier', groupe: 'Crédit' },
  { cle: 'pro_tenue_mois', libelle: 'Tenue de compte pro par mois', unite: 'XAF', profil: 'entreprise', groupe: 'Compte pro' },
  { cle: 'pro_pack_pme_mois', libelle: 'Pack PME par mois', unite: 'XAF', profil: 'entreprise', groupe: 'Compte pro' },
  { cle: 'pro_cheque_commission', libelle: 'Commission sur remise de chèque', unite: 'XAF', profil: 'entreprise', groupe: 'Encaisser' },
  { cle: 'pro_tpe_pct', libelle: 'Commission TPE', unite: '%', profil: 'entreprise', groupe: 'Encaisser' },
  { cle: 'pro_carte_business', libelle: 'Carte Business par an', unite: 'XAF', profil: 'entreprise', groupe: 'Payer' },
  { cle: 'pro_vir_masse', libelle: 'Virement de masse des salaires', unite: 'XAF', profil: 'entreprise', groupe: 'Payer' },
  { cle: 'pro_decouvert_taux', libelle: 'Découvert : taux', unite: '%', profil: 'entreprise', groupe: 'Crédit' },
  { cle: 'pro_invest_taux', libelle: "Crédit d'investissement : taux", unite: '%', profil: 'entreprise', groupe: 'Crédit' },
  { cle: 'pro_credit_frais_dossier', libelle: 'Crédit : frais de dossier', unite: 'XAF', profil: 'entreprise', groupe: 'Crédit' },
  { cle: 'pro_swift_sortant', libelle: 'Transfert international sortant', unite: 'XAF', profil: 'entreprise', groupe: 'International' },
  { cle: 'pro_swift_entrant', libelle: 'Transfert international entrant', unite: 'XAF', profil: 'entreprise', groupe: 'International' },
]

export const FRAIS_PAR_CLE: Record<string, Frais> = Object.fromEntries(FRAIS.map(f => [f.cle, f]))

export type Besoin = { k: string; label: string }
export const BESOINS: Record<Profil, Besoin[]> = {
  particulier: [
    { k: 'compte', label: 'Ouvrir un compte' },
    { k: 'carte', label: 'Avoir une carte' },
    { k: 'virement', label: 'Faire un virement' },
    { k: 'retrait', label: "Retirer de l'argent" },
    { k: 'credit', label: 'Petit crédit' },
  ],
  entreprise: [
    { k: 'compte_pro', label: 'Compte pro' },
    { k: 'tpe', label: 'Encaisser avec un TPE' },
    { k: 'salaires', label: 'Payer vos salariés' },
    { k: 'credit_pro', label: 'Crédit entreprise' },
  ],
}

export const VILLES_CMP = ['Brazzaville', 'Pointe-Noire', 'Autre']
export const TRANCHES: Record<Profil, { k: string; label: string }[]> = {
  particulier: [
    { k: 'moins_200k', label: 'Moins de 200 000 F' },
    { k: '200k_500k', label: '200 000 à 500 000 F' },
    { k: 'plus_500k', label: 'Plus de 500 000 F' },
  ],
  entreprise: [
    { k: 'moins_50m', label: 'Moins de 50 M F par an' },
    { k: 'plus_50m', label: 'Plus de 50 M F par an' },
  ],
}

/** Hypothèses d'usage affichées au client (honnêteté du calcul). */
export const HYPOTHESES = {
  virements_par_mois: 1,
  retraits_par_mois: 2,
  salaires_par_mois: 1,
  encaissement_tpe_mois: { moins_50m: 500_000, plus_50m: 2_000_000 } as Record<string, number>,
}

/** Ligne de détail du coût d'une banque. */
export type Poste = { libelle: string; montant: number }
export type Resultat = { banque: Banque; total: number; postes: Poste[]; taux?: number | undefined }
export type Classement = { top: Resultat[]; comparables: number; sansTarif: number; plusCher?: Resultat | undefined; parTaux: boolean }

function t(b: Banque, cle: string): number | undefined {
  const x = b.tarifs?.[cle]
  return x && Number.isFinite(Number(x.v)) ? Number(x.v) : undefined
}

/** Coût annuel estimé d'une banque pour les besoins choisis, ou null si un tarif nécessaire manque. */
export function coutBanque(b: Banque, profil: Profil, besoins: string[], tranche = ''): Resultat | null {
  const postes: Poste[] = []
  const ajoute = (cle: string, libelle: string, mult = 1): boolean => {
    const v = t(b, cle)
    if (v === undefined) return false
    postes.push({ libelle, montant: Math.round(v * mult) })
    return true
  }
  if (profil === 'particulier') {
    if (!ajoute('tenue_mois', 'Tenue de compte × 12 mois', 12)) return null
    if (besoins.includes('compte') && !ajoute('ouverture_frais', "Frais d'ouverture")) return null
    if (besoins.includes('carte') && !ajoute('carte_prix', 'Carte par an')) return null
    if (besoins.includes('virement') && !ajoute('vir_inter', `Virement interbancaire × ${HYPOTHESES.virements_par_mois * 12}`, HYPOTHESES.virements_par_mois * 12)) return null
    if (besoins.includes('retrait') && !ajoute('retrait_confrere', `Retrait autre GAB × ${HYPOTHESES.retraits_par_mois * 12}`, HYPOTHESES.retraits_par_mois * 12)) return null
    let taux: number | undefined
    if (besoins.includes('credit')) {
      if (!ajoute('credit_frais_dossier', 'Frais de dossier crédit')) return null
      taux = t(b, 'credit_taux_min')
      if (taux === undefined) return null
    }
    return { banque: b, postes, total: postes.reduce((s, p) => s + p.montant, 0), taux }
  }
  if (!ajoute('pro_tenue_mois', 'Tenue de compte pro × 12 mois', 12)) return null
  if (besoins.includes('tpe')) {
    const pct = t(b, 'pro_tpe_pct')
    if (pct === undefined) return null
    const enc = HYPOTHESES.encaissement_tpe_mois[tranche] ?? HYPOTHESES.encaissement_tpe_mois['moins_50m'] ?? 500_000
    postes.push({ libelle: `Commission TPE ${pct} % sur ${formatF(enc)} par mois × 12`, montant: Math.round((pct / 100) * enc * 12) })
  }
  if (besoins.includes('salaires') && !ajoute('pro_vir_masse', `Virement des salaires × ${HYPOTHESES.salaires_par_mois * 12}`, HYPOTHESES.salaires_par_mois * 12)) return null
  let taux: number | undefined
  if (besoins.includes('credit_pro')) {
    if (!ajoute('pro_credit_frais_dossier', 'Frais de dossier crédit')) return null
    taux = t(b, 'pro_invest_taux')
    if (taux === undefined) return null
  }
  return { banque: b, postes, total: postes.reduce((s, p) => s + p.montant, 0), taux }
}

/** La banque est-elle présente dans la ville choisie ? « Autre » = toutes. */
export function presenteDans(b: Banque, ville: string): boolean {
  if (!ville || ville === 'Autre') return true
  return (b.villes || []).includes(ville)
}

/** Les 3 banques les moins chères. Crédit seul : classement au taux, puis au coût. */
export function calculTop3(banques: Banque[], profil: Profil, besoins: string[], ville = '', tranche = ''): Classement {
  const dansVille = banques.filter(b => presenteDans(b, ville))
  const res = dansVille.map(b => coutBanque(b, profil, besoins, tranche)).filter((r): r is Resultat => r !== null)
  const parTaux = besoins.length === 1 && (besoins[0] === 'credit' || besoins[0] === 'credit_pro')
  res.sort((a, b) => parTaux
    ? (a.taux! - b.taux!) || (a.total - b.total) || a.banque.nom.localeCompare(b.banque.nom, 'fr')
    : (a.total - b.total) || a.banque.nom.localeCompare(b.banque.nom, 'fr'))
  return {
    top: res.slice(0, 3),
    comparables: res.length,
    sansTarif: dansVille.length - res.length,
    plusCher: res.length > 1 ? res[res.length - 1] : undefined,
    parTaux,
  }
}

/** Économie du 1er par rapport à la banque la plus chère (0 si non pertinente). */
export function economie(c: Classement): number {
  if (!c.top.length || !c.plusCher || c.parTaux) return 0
  return Math.max(0, c.plusCher.total - c.top[0]!.total)
}

export function formatF(n: number): string {
  return `${Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ')} F`
}

export function formatTarif(x: Tarif | undefined): string {
  if (!x) return '—'
  return x.u === '%' ? `${String(x.v).replace('.', ',')} %` : formatF(Number(x.v))
}

/** Une banque est à vérifier si jamais vérifiée ou vérifiée il y a plus de 90 jours. */
export function aVerifier(verifieAt: string | null | undefined, maintenant = new Date()): boolean {
  if (!verifieAt) return true
  const d = new Date(verifieAt)
  if (Number.isNaN(d.getTime())) return true
  return maintenant.getTime() - d.getTime() > 90 * 24 * 3600 * 1000
}

/** Lecture d'un montant saisi (« 1 500 », « 2,5 ») ; '' = vide ; null = invalide. */
export function lireValeur(s: string): number | '' | null {
  const x = String(s ?? '').replace(/\s| | /g, '').replace(',', '.')
  if (!x) return ''
  if (!/^\d+(\.\d+)?$/.test(x)) return null
  return Number(x)
}

/** Date d'un relevé de tarifs : « 28/11/2026 ». */
export function dateTarif(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Africa/Brazzaville' })
}

/** Seuil d'affichage public : le comparateur n'est mis en avant qu'avec au moins 3 banques relevées. */
export const MIN_BANQUES_PUBLIC = 3

/** Nombre de banques dont le tarif de base (tenue de compte particulier ou pro) est saisi. */
export function banquesRelevees(banques: Pick<Banque, 'tarifs'>[]): number {
  return banques.filter(b => b.tarifs?.['tenue_mois'] || b.tarifs?.['pro_tenue_mois']).length
}

export function comparateurPret(banques: Pick<Banque, 'tarifs'>[]): boolean {
  return banquesRelevees(banques) >= MIN_BANQUES_PUBLIC
}
