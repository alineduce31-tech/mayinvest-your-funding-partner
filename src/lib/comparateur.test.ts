import { describe, expect, test } from 'vitest'
import { calculTop3, coutBanque, economie, aVerifier, lireValeur, formatF, presenteDans, FRAIS, type Banque } from './comparateur'

const b = (nom: string, tarifs: Record<string, number>, villes = ['Brazzaville', 'Pointe-Noire']): Banque => ({
  id: nom, nom, villes,
  tarifs: Object.fromEntries(Object.entries(tarifs).map(([k, v]) => [k, { v, u: k.includes('taux') || k.includes('pct') ? '%' : 'XAF' }])) as any,
})

const BANQUES = [
  b('BCI', { tenue_mois: 1500, carte_prix: 15000, ouverture_frais: 0 }),
  b('UBA', { tenue_mois: 1000, carte_prix: 12000, ouverture_frais: 0 }),
  b('BGFI', { tenue_mois: 2000, carte_prix: 25000, ouverture_frais: 0 }),
  b('LCB', { tenue_mois: 500 }),
]

describe('calculTop3', () => {
  test('exemple du cahier des charges : compte + carte', () => {
    const c = calculTop3(BANQUES, 'particulier', ['compte', 'carte'])
    expect(c.top.map(r => [r.banque.nom, r.total])).toEqual([['UBA', 24000], ['BCI', 33000], ['BGFI', 49000]])
    expect(economie(c)).toBe(25000)
    expect(c.sansTarif).toBe(1)
  })
  test('une banque sans le tarif nécessaire est exclue, pas classée à 0', () => {
    expect(coutBanque(BANQUES[3]!, 'particulier', ['carte'])).toBeNull()
  })
  test('filtre par ville', () => {
    const bs = [...BANQUES, b('Locale', { tenue_mois: 100, carte_prix: 100, ouverture_frais: 0 }, ['Pointe-Noire'])]
    expect(calculTop3(bs, 'particulier', ['carte'], 'Brazzaville').top[0]!.banque.nom).toBe('UBA')
    expect(calculTop3(bs, 'particulier', ['carte'], 'Pointe-Noire').top[0]!.banque.nom).toBe('Locale')
    expect(presenteDans(bs[4]!, 'Autre')).toBe(true)
  })
  test('crédit seul : classement au taux', () => {
    const bs = [b('A', { tenue_mois: 0, credit_frais_dossier: 5000, credit_taux_min: 12 }), b('B', { tenue_mois: 9000, credit_frais_dossier: 90000, credit_taux_min: 9 })]
    const c = calculTop3(bs, 'particulier', ['credit'])
    expect(c.parTaux).toBe(true)
    expect(c.top[0]!.banque.nom).toBe('B')
    expect(economie(c)).toBe(0)
  })
  test('entreprise : TPE selon la tranche de chiffre d’affaires', () => {
    const bs = [b('A', { pro_tenue_mois: 10000, pro_tpe_pct: 2 }), b('B', { pro_tenue_mois: 8000, pro_tpe_pct: 3 })]
    const petit = calculTop3(bs, 'entreprise', ['tpe'], '', 'moins_50m')
    expect(petit.top.map(r => r.total)).toEqual([240000, 276000])
    const grand = calculTop3(bs, 'entreprise', ['tpe'], '', 'plus_50m')
    expect(grand.top[0]!.banque.nom).toBe('A')
  })
})

describe('outils', () => {
  test('aVerifier : jamais vérifiée ou plus de 90 jours', () => {
    const now = new Date('2026-11-28T12:00:00Z')
    expect(aVerifier(null, now)).toBe(true)
    expect(aVerifier('2026-10-01T00:00:00Z', now)).toBe(false)
    expect(aVerifier('2026-08-01T00:00:00Z', now)).toBe(true)
  })
  test('lireValeur', () => {
    expect(lireValeur('1 500')).toBe(1500)
    expect(lireValeur('2,5')).toBe(2.5)
    expect(lireValeur('')).toBe('')
    expect(lireValeur('abc')).toBeNull()
  })
  test('formatF et clés uniques', () => {
    expect(formatF(24000)).toBe('24 000 F')
    expect(new Set(FRAIS.map(f => f.cle)).size).toBe(FRAIS.length)
  })
})
