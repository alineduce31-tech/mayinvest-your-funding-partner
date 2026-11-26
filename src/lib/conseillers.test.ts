import { describe, expect, test } from 'vitest'
import { versConseiller, tauxReussite, charge, suggere, listeConseillers, memeVille, type Conseiller } from './conseillers'

const c = (id: string, nom: string, ville: string, enCours: number, finances: number, total: number): Conseiller => ({ id, nom, ville, enCours, finances, total })
const equipe = [
  c('a', 'Grâce Kimbembe', 'Brazzaville', 8, 4, 12),
  c('b', 'Commercial Démo', 'Pointe-Noire', 3, 2, 4),
  c('c', 'Jean Malonga', 'Pointe-Noire', 0, 0, 0),
]

describe('conseillers', () => {
  test('convertit une ligne de statistiques', () => {
    expect(versConseiller({ id: 'x', prenom: 'Ana', nom: 'Moe', ville: 'Dolisie', leads_actifs: 2, dossiers_finances: 1, total_leads: 5 }))
      .toEqual(c('x', 'Ana Moe', 'Dolisie', 2, 1, 5))
    expect(versConseiller({ id: 'y', email: 'demo@x.cg' }).nom).toBe('demo')
  })
  test('taux de réussite', () => {
    expect(tauxReussite(equipe[1]!)).toBe(50)
    expect(tauxReussite(equipe[2]!)).toBeNull()
  })
  test('même ville sans tenir compte des accents ni de la casse', () => {
    expect(memeVille(equipe[1]!, 'pointe-noire')).toBe(true)
    expect(memeVille(equipe[0]!, undefined)).toBe(false)
  })
  test('charge relative, plafonnée', () => {
    expect(charge(equipe[0]!, equipe)).toBe(80)
    expect(charge(equipe[2]!, equipe)).toBe(0)
  })
  test('suggestion : même ville puis moins chargé', () => {
    expect(suggere(equipe, 'Pointe-Noire')).toBe('c')
    expect(suggere(equipe, 'Brazzaville')).toBe('a')
    expect(suggere(equipe, 'Owando')).toBe('c')
    expect(suggere([], 'Owando')).toBeNull()
  })
  test('filtres et recherche', () => {
    expect(listeConseillers(equipe, 'ville', '', 'Pointe-Noire').map(x => x.id)).toEqual(['c', 'b'])
    expect(listeConseillers(equipe, 'moins', '', 'Pointe-Noire').map(x => x.id)).toEqual(['c', 'b', 'a'])
    expect(listeConseillers(equipe, 'meilleurs', '', '').map(x => x.id)).toEqual(['a', 'b', 'c'])
    expect(listeConseillers(equipe, 'suggeres', 'grace', '').map(x => x.id)).toEqual(['a'])
    expect(listeConseillers(equipe, 'suggeres', 'brazza', '').map(x => x.id)).toEqual(['a'])
  })
})
