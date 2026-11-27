import { describe, test, expect } from 'vitest'
import { proposerPack, suiviPack, etapeEnCours, verifPaiement, chiffresPacks, estPaye, libelleStatutPack } from './pack'

describe('pack formalisation', () => {
  test('à qui on le propose', () => {
    expect(proposerPack({ statut: 'Non Éligible' })).toBe(true)
    expect(proposerPack({ situation: { rccm: 'Non' } })).toBe(true)
    expect(proposerPack({ banque_actuelle: 'Aucune' })).toBe(true)
    expect(proposerPack({ eligibilite: { salaire_domic: 'Non' } })).toBe(true)
    expect(proposerPack({ score: 30 })).toBe(true)
    expect(proposerPack({ score: 75, banque_actuelle: 'BCI' })).toBe(false)
    expect(proposerPack({ statut: 'Éligible', situation: { rccm: 'Non' } })).toBe(false)
    expect(proposerPack({ statut: 'Financé', score: 10 })).toBe(false)
  })
  test('suivi client', () => {
    const attente = { statut: 'en_attente_paiement' as const, etapes: {} }
    expect(suiviPack(attente).map(x => x.fait)).toEqual([true, false, false, false, false])
    expect(etapeEnCours(attente)).toBe(1)
    const paye = { statut: 'paye' as const, etapes: { paiement: 'x', formalites: 'x' } }
    expect(suiviPack(paye).map(x => x.fait)).toEqual([true, true, true, false, false])
    expect(etapeEnCours(paye)).toBe(3)
    expect(etapeEnCours({ statut: 'termine', etapes: { formalites: 'x', compte: 'x', eligible: 'x' } })).toBe(-1)
    // Une étape cochée ne compte pas tant que le paiement n'est pas confirmé
    expect(suiviPack({ statut: 'en_attente_paiement', etapes: { formalites: 'x' } })[2]!.fait).toBe(false)
  })
  test('formulaire de paiement', () => {
    expect(verifPaiement({ mode: '', montant: '50000', recu: 'R1' })).toBe('Choisissez le mode de paiement.')
    expect(verifPaiement({ mode: 'especes', montant: '', recu: 'R1' })).toBe('Indiquez le montant reçu.')
    expect(verifPaiement({ mode: 'especes', montant: '50 000', recu: '  ' })).toBe('Indiquez le numéro du reçu.')
    expect(verifPaiement({ mode: 'mobile_money', montant: '50 000 XAF', recu: 'REC-1' })).toBeNull()
  })
  test('chiffres admin', () => {
    const c = chiffresPacks([
      { statut: 'en_attente_paiement', montant: 50_000 },
      { statut: 'en_attente_paiement', montant: 50_000 },
      { statut: 'paye', montant: 50_000, paiement_montant: 50_000 },
      { statut: 'termine', montant: 50_000, paiement_montant: 45_000 },
    ])
    expect(c).toEqual({ aEncaisser: 2, montantAEncaisser: 100_000, payes: 2, encaisse: 95_000, enCours: 1, termines: 1 })
    expect(estPaye({ statut: 'annule' })).toBe(false)
    expect(libelleStatutPack('en_attente_paiement')).toBe('En attente de paiement')
  })
})
