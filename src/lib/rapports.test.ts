import { describe, expect, it } from 'vitest'
import { dernierEnvoi, ecart, echantillonFaible, envoisDe, lignesPhrase, tauxTxt, type Envoi } from './rapports'

const envois: Envoi[] = [
  { id: '1', type: 'hebdo', status: 'failed', sent_at: '2026-11-19T09:04:00Z' },
  { id: '2', type: 'hebdo', status: 'sent', sent_at: '2026-11-23T07:00:00Z', declencheur: 'auto' },
  { id: '3', type: 'banques', status: 'failed', sent_at: '2026-11-01T07:00:00Z' },
]

describe('envois', () => {
  it('trie les envois d’un type du plus récent au plus ancien', () => {
    expect(envoisDe(envois, 'hebdo').map(e => e.id)).toEqual(['2', '1'])
  })
  it('donne l’état du dernier envoi', () => {
    expect(dernierEnvoi(envois, 'hebdo')).toEqual({ ok: true, date: '2026-11-23T07:00:00Z', manuel: false })
    expect(dernierEnvoi(envois, 'banques')?.ok).toBe(false)
    expect(dernierEnvoi(envois, 'bancarisation')).toBeNull()
  })
})

describe('mise en forme', () => {
  it('écart avec la période précédente', () => {
    expect(ecart(8, 5)).toEqual({ sens: 'hausse', texte: '+3' })
    expect(ecart(2, 5).sens).toBe('baisse')
    expect(ecart(3, 3).sens).toBe('egal')
    expect(ecart(150000, 50000, ' XAF').texte).toBe('+100 000 XAF')
  })
  it('taux absent → tiret', () => {
    expect(tauxTxt(null)).toBe('—')
    expect(tauxTxt(62)).toBe('62 %')
  })
  it('signale les taux calculés sur moins de 5 décisions', () => {
    expect(echantillonFaible(3)).toBe(true)
    expect(echantillonFaible(5)).toBe(false)
  })
  it('découpe la phrase du rapport banques', () => {
    expect(lignesPhrase('UBA a financé 2 dossiers\nBGFI a financé 1 dossier\n')).toEqual(['UBA a financé 2 dossiers', 'BGFI a financé 1 dossier'])
  })
})
