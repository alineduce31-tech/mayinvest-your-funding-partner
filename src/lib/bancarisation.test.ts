import { describe, test, expect } from 'vitest'
import { estABancariser, chiffresB, compteFiltres, listeB, nomLead } from './bancarisation'

const now = new Date(2026, 10, 26).getTime()
const d = (j: number) => new Date(now - j * 86_400_000).toISOString()
const L = (o: any) => ({ id: Math.random().toString(36), statut: 'Nouveau', type: 'physique', created_at: d(1), montant_demande: 1_000_000, banque_actuelle: 'Aucune', identite: { prenom: 'A', nom: 'B' }, ...o })

describe('bancarisation', () => {
  test('qui est à bancariser', () => {
    expect(estABancariser(L({}))).toBe(true)
    expect(estABancariser(L({ banque_actuelle: 'BGFI', eligibilite: { salaire_domic: 'Non' } }))).toBe(true)
    expect(estABancariser(L({ banque_actuelle: 'BGFI' }))).toBe(false)
  })
  test('chiffres', () => {
    const ls = [L({}), L({ created_at: d(10), agent_commercial_id: 'x', statut: 'Contacté', montant_demande: 2_000_000 }), L({ statut: 'Non Éligible' }), L({ statut: 'Bancarisé' })]
    expect(chiffresB(ls, now)).toEqual({ aBancariser: 2, cetteSemaine: 1, montant: 3_000_000, sansConseiller: 1, contactes: 1, bancarises: 1 })
    expect(compteFiltres(ls)).toMatchObject({ tous: 4, nouveaux: 1, contactes: 1, sans_conseiller: 2, pme: 0 })
  })
  test('tri : sans conseiller d\'abord, plus anciens en premier, clos en bas', () => {
    const a = L({ id: 'a', created_at: d(2), agent_commercial_id: 'x' })
    const b = L({ id: 'b', created_at: d(1) })
    const c = L({ id: 'c', created_at: d(5) })
    const z = L({ id: 'z', created_at: d(9), statut: 'Non Éligible' })
    expect(listeB([a, b, z, c], 'tous', '').map(l => l.id)).toEqual(['c', 'b', 'a', 'z'])
  })
  test('recherche sans accents et filtres', () => {
    const ls = [L({ id: 'o', ville: 'Owando' }), L({ id: 'p', type: 'morale', situation: { raison_sociale: 'Boulangerie La Clé' } })]
    expect(listeB(ls, 'tous', 'cle').map(l => l.id)).toEqual(['p'])
    expect(listeB(ls, 'pme', '').map(l => l.id)).toEqual(['p'])
    expect(nomLead(ls[1]!)).toBe('Boulangerie La Clé')
  })
})
