import { describe, test, expect } from 'vitest'
import { etatStatut, groupesStatuts, libelleStatut } from './statuts'
import { LIFECYCLE_STATUTS } from './lead-templates'

describe('sélecteur de statut', () => {
  test('état par rapport au statut actuel', () => {
    expect(etatStatut('RDV', 'Nouveau')).toBe('fait')
    expect(etatStatut('RDV', 'RDV')).toBe('actuel')
    expect(etatStatut('RDV', 'Dossier Déposé')).toBe('suivant')
    expect(etatStatut('RDV', 'Financé')).toBe('a_venir')
    expect(etatStatut('RDV', 'Bancarisé')).toBe('hors')
    expect(etatStatut('Non Éligible', 'Nouveau')).toBe('a_venir')
    expect(etatStatut('Non Éligible', 'Non Éligible')).toBe('actuel')
  })
  test('groupes : tous les statuts de la plateforme sont présents une fois', () => {
    const tous = groupesStatuts().flatMap(g => g.statuts)
    expect([...tous].sort()).toEqual([...LIFECYCLE_STATUTS].sort())
  })
  test('liste réduite (commerciaux)', () => {
    const g = groupesStatuts(['Nouveau', 'Contacté', 'Non Éligible', 'Perdu'])
    expect(g.map(x => x.statuts)).toEqual([['Nouveau', 'Contacté'], ['Non Éligible'], ['Perdu']])
  })
  test('libellés', () => {
    expect(libelleStatut('Dossier Déposé')).toBe('Dossier déposé')
    expect(libelleStatut('RDV')).toBe('RDV')
  })
})
