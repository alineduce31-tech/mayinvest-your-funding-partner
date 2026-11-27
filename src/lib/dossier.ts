// Dossier de crédit (module pur, testé) : mêmes questions et même format, que le client remplisse le formulaire du site
// ou qu'un partenaire crée le dossier pour lui. Le score est recalculé en base à l'enregistrement.

export const TRANCHES = [
  { key: '0-6', label: 'Moins de 6 mois', months: 3 },
  { key: '6-12', label: '6 mois à 1 an', months: 9 },
  { key: '1-3', label: '1 à 3 ans', months: 24 },
  { key: '3-5', label: '3 à 5 ans', months: 48 },
  { key: '5-10', label: '5 à 10 ans', months: 84 },
  { key: '10+', label: 'Plus de 10 ans', months: 144 },
] as const
export function tranche(key: string): number {
  return TRANCHES.find(t => t.key === key)?.months || 0
}

export const ACTIVITES_PARTICULIER = ['Fonctionnaire', 'Salarié privé', 'Commerçant', 'Artisan', 'Profession libérale', 'Agriculteur', 'Autre']
export const ACTIVITES_ENTREPRISE = ['Commerce', 'Tourisme', 'BTP', 'Industrie / Bois', 'Agriculture', 'Transport', 'Santé', 'Tech', 'Autre']
export const BANQUES = ['BGFI', 'BCI', 'UBA', 'BOA', 'Ecobank', 'Crédit du Congo', 'MUCODEC', 'BCH', 'Banque Postale', 'BSCA Bank', 'Afriland First Bank', 'Autre', 'Aucune']
export const VILLES = ['Brazzaville', 'Pointe-Noire', 'Dolisie', 'Nkayi', 'Ouesso', 'Impfondo', 'Owando', 'Madingou', 'Mossendjo', 'Kinkala', 'Loandjili', 'Sibiti', 'Djambala', 'Gamboma', 'Makoua', 'Ewo', 'Oyo', 'Loutété', 'Mindouli', 'Boundji', 'Kibangou', 'Divénié', 'Dongou', 'Souanké', 'Sembé', 'Kellé', 'Mbinda', 'Mouyondzi', 'Autre']
export const CONTRATS = ['CDI', 'CDD', 'Intérim', 'Stage', 'Autre']
export const OBJETS_PARTICULIER = ['Consommation', 'Immobilier', 'Véhicule', 'Autre']
export const OBJETS_ENTREPRISE = ['Investissement', 'Fonds de roulement', 'Marché public', 'Autre']

export type Formulaire = Record<string, string>

export const besoinContrat = (isP: boolean, activite: string) => isP && activite === 'Salarié privé'
export const besoinDureeRestante = (isP: boolean, activite: string, f: Formulaire) =>
  besoinContrat(isP, activite) && ['CDD', 'Intérim', 'Stage'].includes(f['contrat'] || '')

const chiffres = (v: string | undefined) => (v || '').replace(/\D/g, '')

/** Champs manquants d'une étape (1 client, 2 situation, 3 banque, 4 besoin), avec le libellé à afficher. */
export function manquants(etape: 1 | 2 | 3 | 4, isP: boolean, activite: string, f: Formulaire): string[] {
  const m: string[] = []
  if (etape === 1) {
    if (!activite) m.push(isP ? 'Profession' : "Secteur d'activité")
    if (isP) { if ((f['prenom'] || '').trim().length < 2) m.push('Prénom'); if ((f['nom'] || '').trim().length < 2) m.push('Nom') }
    else { if ((f['raison_sociale'] || '').trim().length < 2) m.push('Raison sociale'); if ((f['dirigeant'] || '').trim().length < 2) m.push('Dirigeant') }
    if (chiffres(f['tel']).length !== 9) m.push('Téléphone (9 chiffres)')
    if (f['email'] && !/\S+@\S+\.\S+/.test(f['email'])) m.push('Email valide')
    if (!f['ville']) m.push('Ville')
  }
  if (etape === 2) {
    if (isP) {
      if ((f['employeur'] || '').trim().length < 2) m.push('Employeur')
      if (besoinContrat(isP, activite) && !f['contrat']) m.push('Type de contrat')
      if (besoinDureeRestante(isP, activite, f) && !(parseInt(chiffres(f['duree_restante'])) > 0)) m.push('Durée restante du contrat')
      if (!f['anciennete_tr']) m.push('Ancienneté')
      if (!(parseInt(chiffres(f['revenu'])) >= 50000)) m.push('Revenu net mensuel (minimum 50 000 XAF)')
    } else {
      if (!f['rccm']) m.push('RCCM : oui ou non')
      if (f['rccm'] === 'Oui' && (f['niu'] || '').trim().length < 5) m.push('NIU')
      if (!f['anciennete_soc_tr']) m.push('Ancienneté de la société')
      if (!(parseInt(chiffres(f['ca_annuel'])) >= 100000)) m.push("Chiffre d'affaires annuel")
    }
  }
  if (etape === 3) {
    if (!f['banque']) m.push('Banque actuelle')
    if (isP) {
      if (!f['salaire_domic']) m.push('Salaire domicilié : oui ou non')
    } else {
      if (!f['compte_mouvemente']) m.push('Compte mouvementé : oui ou non')
      if (!f['refus_bancaire']) m.push('Refus bancaire passé : oui ou non')
    }
  }
  if (etape === 4) {
    if (!(parseInt(chiffres(f['montant'])) >= 100000)) m.push('Montant (minimum 100 000 XAF)')
    if (!f['objet']) m.push('Objet du financement')
    if (!isP && !(parseInt(chiffres(f['flux_mois'])) > 0)) m.push('Flux mensuel moyen')
    if (!isP && !f['garanties']) m.push('Garanties : oui ou non')
  }
  return m
}

/** Dossier à enregistrer, au même format que le formulaire du site (hors identifiant, code et score). */
export function construireDossier(isP: boolean, activite: string, form: Formulaire) {
  const f: Formulaire = { ...form, tel: chiffres(form['tel']).slice(0, 9), montant: chiffres(form['montant']), revenu: chiffres(form['revenu']), ca_annuel: chiffres(form['ca_annuel']), flux_mois: chiffres(form['flux_mois']), duree_restante: chiffres(form['duree_restante']) }
  const ancP = tranche(f['anciennete_tr'] || '')
  const ancM = tranche(f['anciennete_soc_tr'] || '')
  const ancCpt = tranche(f['anciennete_cpt_tr'] || '')
  const nonEligible = isP
    ? (ancP < 6) || f['salaire_domic'] === 'Non' || f['contrat'] === 'Stage'
    : f['rccm'] === 'Non'
  return {
    type: isP ? 'physique' : 'morale',
    activite,
    ville: f['ville'] || '',
    montant_demande: parseInt(f['montant'] || '0') || 0,
    banque_actuelle: f['banque'] || '',
    identite: { nom: f['nom'] || '', prenom: f['prenom'] || '', tel: f['tel'], email: (f['email'] || '').trim() },
    situation: isP
      ? { employeur: f['employeur'], contrat: f['contrat'] || null, duree_restante: f['duree_restante'] || null, anciennete_tranche: f['anciennete_tr'], anciennete_mois_estim: ancP, revenu: f['revenu'] }
      : { raison_sociale: f['raison_sociale'], dirigeant: f['dirigeant'], rccm: f['rccm'], niu: f['niu'] || null, anciennete_tranche: f['anciennete_soc_tr'], anciennete_mois_estim: ancM, ca_annuel: f['ca_annuel'] },
    besoin: { montant: f['montant'], objet: f['objet'], banque: f['banque'], flux_mois: f['flux_mois'] },
    eligibilite: isP
      ? { anciennete_ok: ancP >= 6, salaire_domic: f['salaire_domic'], anciennete_compte_tranche: f['anciennete_cpt_tr'] || null, anciennete_compte_mois_estim: ancCpt, non_eligible: nonEligible }
      : { compte_mouvemente: f['compte_mouvemente'], refus_bancaire: f['refus_bancaire'], garanties: f['garanties'], non_eligible: nonEligible },
  }
}

/** Message envoyé au client avec ses accès (WhatsApp ou SMS). */
export function messageAcces(prenom: string, lien: string, code: string, partenaire: string): string {
  const p = (prenom || '').trim()
  return `Bonjour${p ? ' ' + p : ''}, c'est ${partenaire || 'votre conseiller'} de Mayinvest. Votre dossier de crédit est créé.\n\nSuivez-le ici : ${lien}\nVotre code d'accès : ${code}\n\nÀ la première connexion, créez votre mot de passe. Vous pourrez aussi m'écrire et envoyer vos pièces depuis votre espace.`
}

export { buildWhatsappUrl as lienWhatsapp } from './lead-templates'
