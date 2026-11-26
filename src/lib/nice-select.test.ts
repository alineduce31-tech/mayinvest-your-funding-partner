import { describe, it, expect } from 'vitest'
import { positionCarte, indexSuivant, indexParLettre, estMobile } from './nice-select'

const vue = { largeur: 1280, hauteur: 800 }

describe('positionCarte', () => {
  it('place la carte sous le champ quand il y a de la place', () => {
    const p = positionCarte({ top: 100, bottom: 146, left: 200, width: 400 }, vue)
    expect(p.versLeHaut).toBe(false)
    expect(p.top).toBe(150)
    expect(p.width).toBe(400)
    expect(p.maxHeight).toBe(320)
  })
  it('ouvre vers le haut en bas de l\'écran', () => {
    const p = positionCarte({ top: 700, bottom: 746, left: 200, width: 400 }, vue)
    expect(p.versLeHaut).toBe(true)
    expect(p.top).toBe(696)
  })
  it('élargit un petit déclencheur et le garde dans l\'écran', () => {
    const p = positionCarte({ top: 100, bottom: 130, left: 1200, width: 80 }, vue)
    expect(p.width).toBe(220)
    expect(p.left).toBe(1280 - 220 - 8)
  })
})

describe('indexSuivant', () => {
  it('saute les options désactivées', () => {
    expect(indexSuivant(0, 1, [false, true, false])).toBe(2)
  })
  it('ne boucle pas en fin de liste', () => {
    expect(indexSuivant(2, 1, [false, false, false])).toBe(2)
  })
  it('part de la première option si rien n\'est actif', () => {
    expect(indexSuivant(-1, 1, [true, false])).toBe(1)
  })
})

describe('indexParLettre', () => {
  it('trouve l\'option suivante qui commence par la lettre, accents ignorés', () => {
    expect(indexParLettre('e', ['Artisan', 'Électricien', 'Commerce'], 0)).toBe(1)
  })
  it('reste en place si aucune option ne correspond', () => {
    expect(indexParLettre('z', ['Artisan', 'Commerce'], 1)).toBe(1)
  })
})

describe('estMobile', () => {
  it('bascule en panneau du bas jusqu\'à 760 px', () => {
    expect(estMobile(760)).toBe(true)
    expect(estMobile(761)).toBe(false)
  })
})
