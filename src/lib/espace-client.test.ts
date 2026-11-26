import { describe, expect, test } from 'vitest'
import { etapeCourante, compteDocs, prochaineEtape, decoupePiece } from './espace-client'

describe('espace client', () => {
  test('étape courante', () => {
    expect(etapeCourante('Nouveau')).toBe(0)
    expect(etapeCourante('RDV')).toBe(2)
    expect(etapeCourante('Financé')).toBe(5)
    expect(etapeCourante('Non Éligible')).toBe(1)
    expect(etapeCourante(undefined)).toBe(0)
  })
  test('compte des documents', () => {
    expect(compteDocs([{ status: 'pending' }, { status: 'uploaded' }, { status: 'validated' }, { status: 'rejected' }]))
      .toEqual({ total: 4, envoyes: 2, valides: 1, aRefaire: 1, aEnvoyer: 1 })
  })
  test('prochaine étape', () => {
    const p4 = [{ status: 'pending' }, { status: 'pending' }, { status: 'pending' }, { status: 'pending' }]
    expect(prochaineEtape('RDV', p4)).toMatchObject({ titre: 'Rendez-vous avec votre conseiller', action: 'documents' })
    expect(prochaineEtape('RDV', p4).texte).toContain('4 documents avant le rendez-vous')
    expect(prochaineEtape('Contacté', [{ status: 'rejected' }]).action).toBe('documents')
    expect(prochaineEtape('Dossier Déposé', p4).titre).toBe('Votre dossier est à la banque')
    expect(prochaineEtape('Nouveau', []).titre).toBe('Votre demande est bien reçue')
    expect(prochaineEtape('Contacté', [{ status: 'uploaded' }]).titre).toBe('Vos documents sont envoyés')
  })
  test('découpe du libellé de pièce', () => {
    expect(decoupePiece("Carte Nationale d'Identité (ou passeport)")).toEqual({ titre: "Carte d'identité", precision: 'ou passeport' })
    expect(decoupePiece('NIU')).toEqual({ titre: 'NIU', precision: '' })
  })
})
