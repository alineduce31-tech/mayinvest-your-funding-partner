import { describe, test, expect } from 'vitest'
import { estNonEligible, raison, offre, chiffresNE, compteFiltresNE, listeNE, variablesModele } from './non-eligibles'

const L = (o: any) => ({ id: Math.random().toString(36), statut: 'Nouveau', type: 'physique', created_at: new Date().toISOString(), montant_demande: 1_000_000, identite: { prenom: 'Jeb', nom: 'AO', tel: '060000001' }, ...o })

describe('non éligibles', () => {
  test('qui en fait partie', () => {
    expect(estNonEligible(L({ situation: { rccm: 'Non' } }))).toBe(true)
    expect(estNonEligible(L({ statut: 'Pack Formalisation Vendu' }))).toBe(true)
    expect(estNonEligible(L({}))).toBe(false)
  })
  test('raison et offre', () => {
    expect(raison(L({ statut: 'Pack Formalisation Vendu' }))).toEqual({ code: 'pack', libelle: 'Pack en cours' })
    expect(offre(L({ type: 'morale', situation: { rccm: 'Non' } })).key).toBe('pack_formalisation')
    expect(raison(L({ score: 20, statut: 'Non Éligible' })).libelle).toBe('Score 20/100')
    expect(offre(L({ score: 20, banque_actuelle: 'Aucune' })).key).toBe('ouverture_compte')
    expect(offre(L({ score: 60, statut: 'Non Éligible' })).key).toBe('ouverture_compte')
    expect(offre(L({ type: 'morale', score: 60, statut: 'Non Éligible' })).key).toBe('pack_formalisation')
    expect(['pack_formalisation', 'ouverture_compte', 'repasser']).toContain(offre(L({ score: 90, statut: 'Non Éligible' })).key)
  })
  test('chiffres et filtres', () => {
    const ls = [L({ situation: { rccm: 'Non' } }), L({ situation: { rccm: 'Non' }, agent_commercial_id: 'x' }), L({ statut: 'Pack Formalisation Vendu' }), L({ score: 20, statut: 'Non Éligible' })]
    expect(chiffresNE(ls)).toEqual({ aReconvertir: 3, sansConseiller: 2, sansRccm: 2, packs: 1, encaisse: 50_000, potentiel: 100_000 })
    expect(compteFiltresNE(ls)).toMatchObject({ tous: 4, rccm: 2, score: 1, pack: 1 })
  })
  test('tri : sans conseiller, gros montants, packs en bas', () => {
    const a = L({ id: 'a', situation: { rccm: 'Non' }, montant_demande: 120_000_000, agent_commercial_id: 'x' })
    const b = L({ id: 'b', situation: { rccm: 'Non' }, montant_demande: 3_000_000 })
    const p = L({ id: 'p', statut: 'Pack Formalisation Vendu', montant_demande: 900_000_000 })
    expect(listeNE([p, a, b], 'tous', '').map(l => l.id)).toEqual(['b', 'a', 'p'])
  })
  test('variables des modèles', () => {
    expect(variablesModele(L({}))).toMatchObject({ prenom: 'Jeb', telephone: '060000001' })
  })
})
