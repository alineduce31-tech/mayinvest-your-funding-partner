import { describe, expect, it } from 'vitest'
import { banqueParDefaut, doitDemanderDepot, formatMontant, lireMontant } from './depot'

describe('doitDemanderDepot', () => {
  it('ne demande rien hors des statuts de dépôt', () => {
    expect(doitDemanderDepot('Contacté', {})).toBe(false)
    expect(doitDemanderDepot('Bancarisé', {})).toBe(false)
  })
  it('demande la banque tant qu’elle manque', () => {
    expect(doitDemanderDepot('Dossier Déposé', { banque_depot: null })).toBe(true)
    expect(doitDemanderDepot('Éligible', { banque_depot: ' ' })).toBe(true)
    expect(doitDemanderDepot('Dossier Déposé', { banque_depot: 'UBA' })).toBe(false)
  })
  it('au financement, demande aussi le montant financé', () => {
    expect(doitDemanderDepot('Financé', { banque_depot: 'UBA' })).toBe(true)
    expect(doitDemanderDepot('Financé', { banque_depot: 'UBA', montant_finance: 5_000_000 })).toBe(false)
  })
})

describe('banqueParDefaut', () => {
  it('reprend la banque de dépôt, sinon celle du client', () => {
    expect(banqueParDefaut({ banque_depot: 'BGFI', banque_actuelle: 'UBA' })).toBe('BGFI')
    expect(banqueParDefaut({ banque_actuelle: 'UBA' })).toBe('UBA')
    expect(banqueParDefaut({ banque_actuelle: 'Aucune' })).toBe('')
    expect(banqueParDefaut(null)).toBe('')
  })
})

describe('lireMontant', () => {
  it('lit les écritures courantes', () => {
    expect(lireMontant('25 000 000')).toBe(25_000_000)
    expect(lireMontant('25000000 XAF')).toBe(25_000_000)
    expect(lireMontant('25.000.000')).toBe(25_000_000)
    expect(lireMontant('2,5 M')).toBe(2_500_000)
    expect(lireMontant('12 millions')).toBe(12_000_000)
  })
  it('vide → null, illisible → NaN', () => {
    expect(lireMontant('')).toBeNull()
    expect(lireMontant('beaucoup')).toBeNaN()
  })
  it('formate avec des espaces', () => {
    expect(formatMontant(25_000_000)).toBe('25 000 000')
    expect(formatMontant(null)).toBe('')
  })
})
