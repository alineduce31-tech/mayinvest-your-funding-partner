import { describe, expect, it } from 'vitest'
import { AVEC_COMPTE, SANS_COMPTE, banqueDe, optionsBanques, passeFiltreBanque } from './banques'

const leads = [{ banque_actuelle: 'BGFI' }, { banque_actuelle: 'UBA' }, { banque_actuelle: 'BGFI' }, { banque_actuelle: 'Aucune' }, { banque_actuelle: null }]

describe('filtre banque du CRM', () => {
  it('reconnaît les clients sans compte', () => {
    expect(banqueDe({ banque_actuelle: ' aucune ' })).toBe('')
    expect(banqueDe({ banque_actuelle: 'Ecobank' })).toBe('Ecobank')
  })
  it('propose avec / sans compte puis chaque banque, la plus fréquente d’abord', () => {
    expect(optionsBanques(leads).map(o => o.label)).toEqual(['Avec un compte bancaire (3)', 'Sans compte bancaire (2)', 'BGFI (2)', 'UBA (1)'])
  })
  it('filtre par compte ou par nom de banque', () => {
    expect(leads.filter(l => passeFiltreBanque(l, [AVEC_COMPTE])).length).toBe(3)
    expect(leads.filter(l => passeFiltreBanque(l, [SANS_COMPTE])).length).toBe(2)
    expect(leads.filter(l => passeFiltreBanque(l, ['BGFI'])).length).toBe(2)
    expect(leads.filter(l => passeFiltreBanque(l, ['BGFI', 'UBA'])).length).toBe(3)
    expect(leads.filter(l => passeFiltreBanque(l, [])).length).toBe(5)
  })
})
