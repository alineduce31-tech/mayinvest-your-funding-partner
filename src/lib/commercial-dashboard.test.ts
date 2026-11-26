import { describe, it as test, expect } from 'vitest'
import {
  etapeDe,
  grouperParEtape,
  financesCeMois,
  progressionObjectif,
  gainsPour,
  tachesDuJour,
  COMMISSION_PAR_DOSSIER,
  type CommercialLead,
} from './commercial-dashboard'

const now = Date.UTC(2026, 10, 25, 12)
const h = 3_600_000
const lead = (c: Partial<CommercialLead> = {}): CommercialLead => ({
  id: Math.random().toString(36).slice(2),
  statut: 'Nouveau',
  created_at: new Date(now - h).toISOString(),
  ...c,
})

describe('étapes', () => {
  test('classe les statuts dans les bonnes colonnes', () => {
    expect(etapeDe('Nouveau')).toBe('a_contacter')
    expect(etapeDe('Contacté')).toBe('a_contacter')
    expect(etapeDe('RDV')).toBe('rdv')
    expect(etapeDe('Éligible')).toBe('rdv')
    expect(etapeDe('Dossier Déposé')).toBe('depose')
    expect(etapeDe('Financé')).toBeNull()
    expect(etapeDe('Perdu')).toBeNull()
  })
  test('groupe sans perdre ni dupliquer', () => {
    const g = grouperParEtape([lead(), lead({ statut: 'RDV' }), lead({ statut: 'Financé' })])
    expect(g.a_contacter).toHaveLength(1)
    expect(g.rdv).toHaveLength(1)
    expect(g.depose).toHaveLength(0)
  })
})

describe('objectif et gains', () => {
  test('ne compte que les financés du mois en cours', () => {
    const leads = [
      lead({ statut: 'Financé', updated_at: new Date(Date.UTC(2026, 10, 3)).toISOString() }),
      lead({ statut: 'Financé', updated_at: new Date(Date.UTC(2026, 9, 30)).toISOString() }),
      lead({ statut: 'RDV' }),
    ]
    expect(financesCeMois(leads, now)).toBe(1)
  })
  test('progression plafonnée à 100 %', () => {
    expect(progressionObjectif(1, 3)).toMatchObject({ pct: 33, reste: 2, atteint: false })
    expect(progressionObjectif(5, 3)).toMatchObject({ pct: 100, reste: 0, atteint: true })
  })
  test('gains par dossier', () => {
    expect(gainsPour(3)).toBe(3 * COMMISSION_PAR_DOSSIER)
    expect(gainsPour(-2)).toBe(0)
  })
})

describe('ma journée', () => {
  test('priorise les clients qui attendent puis les relances de 48 h', () => {
    const t = tachesDuJour([
      lead(),
      lead({ statut: 'Contacté', created_at: new Date(now - 50 * h).toISOString() }),
      lead({ statut: 'Contacté', created_at: new Date(now - 2 * h).toISOString() }),
    ], 2, now)
    expect(t.map(x => x.key)).toEqual(['repondre', 'appeler', 'relancer'])
    expect(t[2].nb).toBe(1)
  })
  test('rien à faire, liste vide', () => {
    expect(tachesDuJour([], 0, now)).toEqual([])
  })
})

describe('fraîcheur de la liste', () => {
  test('libellés selon l\'ancienneté', async () => {
    const { aJourDepuis } = await import('./commercial-dashboard')
    const t = 1_800_000_000_000
    expect(aJourDepuis(t, t + 20_000)).toBe("à l'instant")
    expect(aJourDepuis(t, t + 3 * 60_000)).toBe('il y a 3 min')
    expect(aJourDepuis(t, t + 125 * 60_000)).toBe('il y a 2 h')
  })
})

describe('pipeline par urgence', () => {
  const now = new Date(2026, 10, 26, 15, 0).getTime()
  const j = (n: number) => new Date(now - n * 86_400_000 - 3_600_000).toISOString()
  test('seuils de retard selon l\'étape', async () => {
    const { urgence } = await import('./commercial-dashboard')
    expect(urgence({ id: 'a', statut: 'Nouveau', created_at: j(5) }, undefined, now)).toEqual({ jours: 5, ton: 'rouge', libelle: '5 j' })
    expect(urgence({ id: 'a', statut: 'Nouveau', created_at: j(1) }, undefined, now).ton).toBe('orange')
    expect(urgence({ id: 'a', statut: 'RDV', created_at: j(9) }, { last_public_at: j(2) }, now)).toMatchObject({ jours: 2, ton: 'orange' })
    expect(urgence({ id: 'a', statut: 'Dossier Déposé', created_at: j(8) }, undefined, now).ton).toBe('gris')
    expect(urgence({ id: 'a', statut: 'Contacté', created_at: j(9) }, { last_public_at: new Date(now - 3_600_000).toISOString() }, now).libelle).toBe('auj.')
  })
  test('tri, retards, montants et pièces', async () => {
    const { trierParUrgence, nbEnRetard, totalMontant, piecesRecues } = await import('./commercial-dashboard')
    const ls = [{ id: 'a', statut: 'Nouveau', created_at: j(1) }, { id: 'b', statut: 'Nouveau', created_at: j(5) }, { id: 'c', statut: 'Perdu', created_at: j(9) }]
    expect(trierParUrgence(ls, {}, now).map(l => l.id)).toEqual(['c', 'b', 'a'])
    expect(nbEnRetard(ls, {}, now)).toBe(1)
    expect(totalMontant([{ montant_demande: 2_000_000 }, { montant_demande: null }, { montant_demande: 5_200_000 }])).toBe(7_200_000)
    expect(piecesRecues({ docs_total: 4, docs_ok: 1, docs_uploaded: 2 })).toEqual({ recues: 3, total: 4 })
  })
})

describe('glisser-déposer', () => {
  test('statut selon la colonne d\'arrivée', async () => {
    const { statutPourEtape } = await import('./commercial-dashboard')
    expect(statutPourEtape('rdv', 'Nouveau')).toBe('RDV')
    expect(statutPourEtape('depose', 'RDV')).toBe('Dossier Déposé')
    expect(statutPourEtape('a_contacter', 'RDV')).toBe('Contacté')
    expect(statutPourEtape('rdv', 'Éligible')).toBeNull()
    expect(statutPourEtape('a_contacter', 'Nouveau')).toBeNull()
  })
})
