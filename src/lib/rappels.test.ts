import { describe, test, expect } from 'vitest'
import { choixRapides, dansUneHeure, joursProposes, libelleRappel, lireHeure, aSonner, cleSonnerie, estDansLeFutur, combiner } from './rappels'

// Jeudi 26 novembre 2026, 14 h 52 (heure locale)
const jeudi = new Date(2026, 10, 26, 14, 52).getTime()
const H = 3_600_000

describe('choix rapides', () => {
  test('dans 1 heure arrondi aux 5 minutes', () => {
    const d = new Date(dansUneHeure(jeudi))
    expect(d.getHours()).toBe(15)
    expect(d.getMinutes()).toBe(55)
  })
  test('un jeudi après-midi : 1 h, ce soir 18 h, demain 9 h, lundi 9 h', () => {
    const c = choixRapides(jeudi)
    expect(c.map(x => x.cle)).toEqual(['heure', 'soir', 'demain', 'lundi'])
    expect(new Date(c[1]!.at).getHours()).toBe(18)
    const lundi = new Date(c[3]!.at)
    expect(lundi.getDay()).toBe(1)
    expect(lundi.getDate()).toBe(30)
    expect(lundi.getHours()).toBe(9)
  })
  test('après 17 h, pas de « ce soir »', () => {
    const soir = new Date(2026, 10, 26, 17, 30).getTime()
    expect(choixRapides(soir).map(x => x.cle)).not.toContain('soir')
  })
  test('un dimanche, lundi matin = demain matin, on ne le propose pas deux fois', () => {
    const dimanche = new Date(2026, 10, 29, 10, 0).getTime()
    expect(choixRapides(dimanche).map(x => x.cle)).not.toContain('lundi')
  })
})

describe('choix libre', () => {
  test('7 jours à partir d\'aujourd\'hui', () => {
    const j = joursProposes(jeudi)
    expect(j).toHaveLength(7)
    expect(j[0]!.libelle).toBe('Auj.')
    expect(j[1]!.libelle).toBe('Demain')
    expect(j[2]!.libelle).toBe('Sam. 28')
  })
  test('lecture de l\'heure tapée', () => {
    expect(lireHeure('14:30')).toEqual({ h: 14, m: 30 })
    expect(lireHeure('25:00')).toBeNull()
    expect(lireHeure('abc')).toBeNull()
  })
  test('une heure déjà passée est refusée', () => {
    const j = joursProposes(jeudi)[0]!.date
    expect(estDansLeFutur(combiner(j, 10, 0), jeudi)).toBe(false)
    expect(estDansLeFutur(combiner(j, 16, 0), jeudi)).toBe(true)
  })
})

describe('libellés', () => {
  test('aujourd\'hui, demain, plus tard', () => {
    expect(libelleRappel(new Date(2026, 10, 26, 16, 30).getTime(), jeudi)).toBe('auj. 16 h 30')
    expect(libelleRappel(new Date(2026, 10, 27, 9, 0).getTime(), jeudi)).toBe('demain 9 h')
    expect(libelleRappel(new Date(2026, 10, 30, 9, 0).getTime(), jeudi)).toBe('lun. 30 à 9 h')
  })
})

describe('sonnerie', () => {
  test('sonne une seule fois par rappel échu', () => {
    const r = { a: jeudi - 60_000, b: jeudi + H }
    expect(aSonner(r, jeudi, new Set())).toEqual(['a'])
    expect(aSonner(r, jeudi, new Set([cleSonnerie('a', r.a)]))).toEqual([])
  })
  test('un rappel trop ancien ne sonne plus', () => {
    expect(aSonner({ a: jeudi - 13 * H }, jeudi, new Set())).toEqual([])
  })
})
