import { describe, expect, it } from 'vitest'
import { construireDossier, manquants, messageAcces, besoinDureeRestante } from './dossier'

describe('dossier : étapes à compléter', () => {
  it('étape client : particulier', () => {
    expect(manquants(1, true, '', {})).toEqual(['Profession', 'Prénom', 'Nom', 'Téléphone (9 chiffres)', 'Ville'])
    expect(manquants(1, true, 'Fonctionnaire', { prenom: 'Jean', nom: 'Mouk', tel: '06 531 31 01', ville: 'Brazzaville' })).toEqual([])
  })
  it('étape client : entreprise', () => {
    expect(manquants(1, false, 'BTP', { raison_sociale: 'Jespere SARL', tel: '065313101', ville: 'Pointe-Noire' })).toEqual(['Dirigeant'])
  })
  it('situation : contrat et durée restante pour un salarié du privé', () => {
    expect(manquants(2, true, 'Salarié privé', { employeur: 'SOCOFRAN', anciennete_tr: '1-3', revenu: '350 000', contrat: 'CDD' })).toEqual(['Durée restante du contrat'])
    expect(besoinDureeRestante(true, 'Fonctionnaire', { contrat: 'CDD' })).toBe(false)
  })
  it('situation : NIU demandé si RCCM', () => {
    expect(manquants(2, false, 'BTP', { rccm: 'Oui', anciennete_soc_tr: '3-5', ca_annuel: '50 000 000' })).toEqual(['NIU'])
  })
  it('besoin : montant minimum et flux pour une entreprise', () => {
    expect(manquants(4, false, 'BTP', { montant: '50 000', objet: 'Investissement' })).toEqual(['Montant (minimum 100 000 XAF)', 'Flux mensuel moyen', 'Garanties : oui ou non'])
  })
})

describe('dossier : format enregistré', () => {
  it('même format que le formulaire du site, montants et téléphone nettoyés', () => {
    const d = construireDossier(true, 'Fonctionnaire', { prenom: 'Jean', nom: 'Mouk', tel: '06 531 31 01', ville: 'Brazzaville', employeur: 'Finances', anciennete_tr: '3-5', revenu: '450 000', banque: 'BGFI', salaire_domic: 'Oui', montant: '5 000 000', objet: 'Consommation' })
    expect(d.type).toBe('physique')
    expect(d.montant_demande).toBe(5_000_000)
    expect(d.identite.tel).toBe('065313101')
    expect(d.situation).toMatchObject({ employeur: 'Finances', anciennete_mois_estim: 48, revenu: '450000' })
    expect(d.eligibilite).toMatchObject({ anciennete_ok: true, salaire_domic: 'Oui', non_eligible: false })
  })
  it('entreprise sans RCCM : non éligible', () => {
    expect(construireDossier(false, 'BTP', { rccm: 'Non' }).eligibilite.non_eligible).toBe(true)
  })
  it('message d’accès avec lien et code', () => {
    const m = messageAcces('Jean', 'https://x/client/1', 'MYI-ABC1234', 'Grâce')
    expect(m).toContain('Bonjour Jean')
    expect(m).toContain('https://x/client/1')
    expect(m).toContain('MYI-ABC1234')
  })
})
