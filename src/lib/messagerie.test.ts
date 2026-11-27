import { describe, it as test, expect } from 'vitest'
import { filtrerInbox, filtrerEquipe, compteurs, heuresAttente, apercu, initiales, messageRdv, type InboxRow, type TeamRow } from './messagerie'

const now = Date.UTC(2026, 10, 25, 20)
const h = 3_600_000
const row = (c: Partial<InboxRow> = {}): InboxRow => ({
  lead_id: Math.random().toString(36).slice(2), nom: 'Alin LN', statut: 'RDV', type: 'physique', montant: 5_200_000,
  ville: 'Brazzaville', agent_id: 'a1', agent_nom: 'Commercial Démo', last_message: 'Bonjour', last_sender: 'client',
  last_visibility: 'all', last_at: new Date(now - h).toISOString(), unread: 0, waiting_since: null, docs_total: 0, docs_ok: 0, ...c,
})
const team = (c: Partial<TeamRow> = {}): TeamRow => ({ commercial_id: 'c1', nom: 'Commercial Démo', ville: 'Pointe-Noire', telephone: null, last_body: null, last_sender: null, last_at: null, unread: 0, ...c })

describe('filtres', () => {
  const rows = [
    row({ nom: 'Élodie Mavoungou', unread: 2, waiting_since: new Date(now - 30 * h).toISOString() }),
    row({ nom: 'Paul', agent_id: null, agent_nom: null }),
    row({ nom: 'Jean', unread: 1, waiting_since: new Date(now - 2 * h).toISOString() }),
  ]
  test('non lus, attente, sans conseiller', () => {
    expect(filtrerInbox(rows, 'non_lus', '', now)).toHaveLength(2)
    expect(filtrerInbox(rows, 'attente', '', now).map(r => r.nom)).toEqual(['Élodie Mavoungou'])
    expect(filtrerInbox(rows, 'sans_conseiller', '', now).map(r => r.nom)).toEqual(['Paul'])
    expect(filtrerInbox(rows, 'equipe', '', now)).toHaveLength(0)
  })
  test('recherche sans accents ni majuscules', () => {
    expect(filtrerInbox(rows, 'tous', 'elodie', now)).toHaveLength(1)
    expect(filtrerEquipe([team(), team({ nom: 'Marie', ville: 'Dolisie' })], 'dolisie')).toHaveLength(1)
  })
  test('compteurs', () => {
    expect(compteurs(rows, [team({ unread: 3 })], now)).toEqual({ nonLus: 6, enAttente: 1, sansConseiller: 1 })
  })
})

describe('affichage', () => {
  test('heures d\'attente', () => {
    expect(heuresAttente(null, now)).toBe(0)
    expect(heuresAttente(new Date(now - 26 * h).toISOString(), now)).toBe(26)
  })
  test('aperçu signale les notes internes', () => {
    expect(apercu({ last_message: 'à  déposer', last_sender: 'admin', last_visibility: 'internal' })).toBe('Note · Direction : à déposer')
  })
  test('initiales', () => {
    expect(initiales('Commercial Démo')).toBe('CD')
    expect(initiales('')).toBe('?')
  })
  test('message de rendez-vous ignore les créneaux vides', () => {
    const m = messageRdv(['Jeu. 10:00', ' ', 'Ven. 09:30'])
    expect(m).toContain('- Jeu. 10:00\n- Ven. 09:30')
  })
})

import { messageConseille, filtrerMessages, MESSAGES_TYPES as MT } from './messagerie'
describe('menu des messages types', () => {
  test('message conseillé selon le statut', () => {
    expect(messageConseille('Nouveau')).toBe('prise')
    expect(messageConseille('RDV')).toBe('pieces')
    expect(messageConseille('Dossier Déposé')).toBe('depose')
    expect(messageConseille('Perdu')).toBeNull()
  })
  test('recherche sans accents', () => {
    expect(filtrerMessages(MT, 'depose').map(m => m.cle)).toContain('depose')
    expect(filtrerMessages(MT, '')).toHaveLength(MT.length)
    expect(filtrerMessages(MT, 'zzz')).toHaveLength(0)
  })
})

import { etapeDirection } from './messagerie'
describe('étape vue par la direction', () => {
  const base = { statut: 'Contacté', agentId: 'a1', unread: 0, waitingSince: null, docs: [] as any[] }
  const now = Date.parse('2026-11-27T12:00:00Z')
  test('sans conseiller : attribuer', () => {
    expect(etapeDirection({ ...base, agentId: null }, now).action).toBe('attribuer')
  })
  test('client en attente : répondre', () => {
    const e = etapeDirection({ ...base, unread: 2, waitingSince: '2026-11-27T09:00:00Z' }, now)
    expect(e.action).toBe('repondre'); expect(e.texte).toContain('3 h')
  })
  test('pièces reçues à vérifier, avec progression', () => {
    const e = etapeDirection({ ...base, docs: [{ status: 'uploaded' }, { status: 'pending' }, { status: 'validated' }] }, now)
    expect(e.action).toBe('verifier'); expect(e.progression).toEqual({ recu: 2, total: 3 })
  })
  test('pièces manquantes au RDV', () => {
    const e = etapeDirection({ ...base, statut: 'RDV', docs: [{ status: 'pending' }, { status: 'rejected' }, { status: 'validated' }] }, now)
    expect(e.action).toBe('pieces'); expect(e.texte).toContain('2 pièces')
  })
  test('financé : rien à faire', () => {
    expect(etapeDirection({ ...base, statut: 'Financé' }, now).action).toBeNull()
  })
})
