import { describe, test, expect } from 'vitest'
import {
  decouperLibelle, titreCourt, etatPiece, iconePiece, piecesARelancer, progressionPieces,
  montantCourt, dateRelative, tonScore, tonStatut, initialesNom,
} from './affichage'

describe('pièces', () => {
  test('libellé découpé en titre et précision', () => {
    expect(decouperLibelle('Bulletins de salaire (3 derniers mois)')).toEqual({ titre: 'Bulletins de salaire', precision: '3 derniers mois' })
    expect(decouperLibelle("Attestation d'employeur")).toEqual({ titre: "Attestation d'employeur", precision: '' })
    expect(titreCourt(decouperLibelle("Carte Nationale d'Identité (ou passeport)").titre)).toBe("Carte d'identité")
  })
  test('états et icônes', () => {
    expect(etatPiece('uploaded')).toBe('uploaded')
    expect(etatPiece(null)).toBe('pending')
    expect(iconePiece('releve_bancaire', 'Relevé bancaire')).toBe('banque')
    expect(iconePiece(null, 'RCCM de la société')).toBe('societe')
  })
  test('relance : manquantes et refusées seulement', () => {
    const docs = [{ status: 'validated' }, { status: 'pending' }, { status: 'rejected' }, { status: 'uploaded' }]
    expect(piecesARelancer(docs)).toHaveLength(2)
  })
  test('progression', () => {
    expect(progressionPieces([{ status: 'validated' }, { status: 'uploaded' }, { status: 'pending' }, { status: 'pending' }])).toEqual({ valide: 25, aVerifier: 25 })
    expect(progressionPieces([])).toEqual({ valide: 0, aVerifier: 0 })
  })
})

describe('ligne de lead', () => {
  const now = new Date(2026, 10, 26, 15, 0).getTime()
  test('montant abrégé', () => {
    expect(montantCourt(5_200_000)).toBe('5,2 M XAF')
    expect(montantCourt(12_000_000)).toBe('12 M XAF')
    expect(montantCourt(850_000)).toBe('850 000 XAF')
    expect(montantCourt(0)).toBe('—')
  })
  test('date relative', () => {
    expect(dateRelative(new Date(2026, 10, 26, 9).toISOString(), now)).toBe('auj.')
    expect(dateRelative(new Date(2026, 10, 25, 20).toISOString(), now)).toBe('hier')
    expect(dateRelative(new Date(2026, 10, 22).toISOString(), now)).toBe('il y a 4 j')
    expect(dateRelative(new Date(2026, 9, 3).toISOString(), now)).toBe('03/10')
  })
  test('couleur du score et du statut', () => {
    expect(tonScore(82)).toBe('vert')
    expect(tonScore(45)).toBe('orange')
    expect(tonScore(20)).toBe('rouge')
    expect(tonScore(null)).toBe('aucun')
    expect(tonStatut('Dossier Déposé')).toBe('violet')
    expect(tonStatut('Nouveau')).toBe('bleu')
  })
  test('initiales', () => {
    expect(initialesNom('Alin LN')).toBe('AL')
    expect(initialesNom('Grâce Marie Mabiala')).toBe('GM')
    expect(initialesNom('Boutique')).toBe('BO')
  })
})

describe('messages', () => {
  test('les lignes à tirets deviennent une liste', async () => {
    const { segmentsMessage } = await import('./affichage')
    const m = "Bonjour, il nous manque encore :\n- Carte d'identité\n- Relevé bancaire\nVous pouvez les envoyer depuis votre espace."
    expect(segmentsMessage(m)).toEqual([
      { type: 'texte', texte: 'Bonjour, il nous manque encore :' },
      { type: 'liste', items: ["Carte d'identité", 'Relevé bancaire'] },
      { type: 'texte', texte: 'Vous pouvez les envoyer depuis votre espace.' },
    ])
  })
  test('un message sans liste reste intact', async () => {
    const { segmentsMessage } = await import('./affichage')
    expect(segmentsMessage('Bonjour\nà demain')).toEqual([{ type: 'texte', texte: 'Bonjour\nà demain' }])
    expect(segmentsMessage('Prix : 10 - 20 000')).toEqual([{ type: 'texte', texte: 'Prix : 10 - 20 000' }])
  })
})

describe('avatar', () => {
  test('même nom, même couleur', async () => {
    const { couleurAvatar } = await import('./affichage')
    expect(couleurAvatar('Alin LN')).toEqual(couleurAvatar('Alin LN'))
    expect(couleurAvatar('').fond).toMatch(/^#/)
  })
})

describe('montant complet', () => {
  test('espaces et devise', async () => {
    const { montantComplet } = await import('./affichage')
    expect(montantComplet(22_800_000)).toBe('22 800 000 XAF')
    expect(montantComplet(null)).toBe('—')
  })
})
