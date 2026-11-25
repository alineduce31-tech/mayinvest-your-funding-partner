import { describe, it as test, expect } from 'vitest'
import { aRelancer, etapeFaite, etapeSuivante, filtrerCom, indexSuivi, piecesManquantes, prochaineEtape, messagePieces, demainMatin, type ComRow } from './messagerie-commercial'

const now = Date.UTC(2026, 10, 25, 20)
const h = 3_600_000
const row = (c: Partial<ComRow> = {}): ComRow => ({
  lead_id: Math.random().toString(36).slice(2), nom: 'Alin LN', statut: 'Contacté', type: 'physique', montant: 5_200_000,
  activite: 'Fonctionnaire', ville: 'Brazzaville', tel: '060000001', score: 45, last_message: 'Bonjour', last_sender: 'client',
  last_visibility: 'all', last_at: new Date(now - h).toISOString(), unread: 0, waiting_since: null,
  docs_total: 4, docs_ok: 0, docs_uploaded: 1, created_at: new Date(now - 72 * h).toISOString(), ...c,
})

describe('suivi du dossier', () => {
  test('étapes et étape suivante', () => {
    expect(indexSuivi('Nouveau')).toBe(0)
    expect(indexSuivi('Éligible')).toBe(1)
    expect(indexSuivi('Perdu')).toBe(-1)
    expect(etapeSuivante('Contacté')).toBe('RDV')
    expect(etapeSuivante('Dossier Déposé')).toBe('Financé')
    expect(etapeSuivante('Financé')).toBeNull()
  })
  test('étapes faites', () => {
    expect(etapeFaite('Nouveau', 0)).toBe(false)
    expect(etapeFaite('Contacté', 0)).toBe(true)
    expect(etapeFaite('RDV', 0)).toBe(true)
    expect(etapeFaite('RDV', 1)).toBe(false)
    expect(etapeFaite('Financé', 3)).toBe(true)
  })
  test('pièces manquantes', () => {
    expect(piecesManquantes({ docs_total: 4, docs_ok: 1, docs_uploaded: 1 })).toBe(2)
  })
})

describe('relances', () => {
  test('48 h sans réponse après notre message', () => {
    expect(aRelancer(row({ last_sender: 'commercial', last_at: new Date(now - 50 * h).toISOString() }), now)).toBe(true)
    expect(aRelancer(row({ last_sender: 'commercial', last_at: new Date(now - 5 * h).toISOString() }), now)).toBe(false)
    expect(aRelancer(row({ last_sender: 'client', last_at: new Date(now - 90 * h).toISOString() }), now)).toBe(false)
  })
  test('une note interne ne compte pas comme une relance', () => {
    expect(aRelancer(row({ last_sender: 'commercial', last_visibility: 'internal', last_at: new Date(now - 90 * h).toISOString() }), now)).toBe(false)
  })
  test('rappel programmé échu', () => {
    const r = row()
    expect(aRelancer(r, now, { [r.lead_id]: now - 1 })).toBe(true)
    expect(aRelancer(r, now, { [r.lead_id]: now + h })).toBe(false)
  })
  test('rappel demain 9 h', () => {
    const t = new Date(demainMatin(now))
    expect(t.getHours()).toBe(9)
    expect(t.getTime()).toBeGreaterThan(now)
  })
})

describe('liste', () => {
  test('non lus en premier puis plus récents', () => {
    const a = row({ nom: 'A', last_at: new Date(now - h).toISOString() })
    const b = row({ nom: 'B', unread: 2, last_at: new Date(now - 10 * h).toISOString() })
    const c = row({ nom: 'Élise', last_at: new Date(now - 2 * h).toISOString() })
    expect(filtrerCom([a, c, b], 'tous', '', now).map(r => r.nom)).toEqual(['B', 'A', 'Élise'])
    expect(filtrerCom([a, b, c], 'non_lus', '', now).map(r => r.nom)).toEqual(['B'])
    expect(filtrerCom([a, b, c], 'tous', 'elise', now)).toHaveLength(1)
  })
})

describe('prochaine étape', () => {
  test('le client qui attend passe avant tout', () => {
    expect(prochaineEtape(row({ unread: 1, waiting_since: new Date(now - 26 * h).toISOString() }), now)).toMatchObject({ action: 'repondre', ton: 'warn' })
  })
  test('pièces manquantes avant le RDV', () => {
    const p = prochaineEtape(row(), now)
    expect(p.action).toBe('pieces')
    expect(p.texte).toContain('1 pièce sur 4')
  })
  test('nouveau client : appeler', () => {
    expect(prochaineEtape(row({ statut: 'Nouveau' }), now).action).toBe('appeler')
  })
  test('tout est là : proposer un RDV', () => {
    expect(prochaineEtape(row({ docs_ok: 4, docs_uploaded: 0 }), now).action).toBe('rdv')
  })
  test('message pièces', () => {
    expect(messagePieces(['CNI', 'Relevés'])).toContain('- CNI\n- Relevés')
  })
})
