import { describe, test, expect } from 'vitest'
import {
  vueCommercial, vueAdmin, vueClient, vueEquipe, regrouper, libelleJour, lireRdv, blocCalendrier,
  phraseRdv, reponseClientRdv, piecesDeCarte, piecesDansTexte, carteDe, suggestions, texteSecoursPieces,
} from './conversation'

const now = new Date(2026, 10, 26, 15, 0).getTime()
const t = (h: number, m = 0, j = 26) => new Date(2026, 10, j, h, m).toISOString()
const COM = 'com-1'; const ADM = 'adm-1'
const msg = (o: any) => ({ id: Math.random().toString(36).slice(2), sender: 'client', content: 'Bonjour', created_at: t(10), read_at: null, author_id: null, author_name: null, visibility: 'all', kind: 'text', payload: null, ...o })

describe('qui parle et de quel côté', () => {
  test('vu par le commercial', () => {
    expect(vueCommercial(msg({}), COM, 'Alin LN')).toMatchObject({ cote: 'gauche', ton: 'client', auteur: 'Alin' })
    expect(vueCommercial(msg({ sender: 'commercial', author_id: COM, read_at: t(11) }), COM, 'Alin')).toMatchObject({ cote: 'droite', ton: 'moi', vu: true })
    expect(vueCommercial(msg({ sender: 'admin', author_id: ADM, author_name: 'Aldo' }), COM, 'Alin')).toMatchObject({ cote: 'gauche', ton: 'equipe', etiquette: 'Aldo' })
    expect(vueCommercial(msg({ sender: 'admin', author_id: ADM, visibility: 'internal' }), COM, 'Alin')).toMatchObject({ cote: 'droite', ton: 'note' })
  })
  test('vu par la direction', () => {
    expect(vueAdmin(msg({ sender: 'commercial', author_id: COM, author_name: 'Démo' }), ADM, 'Alin')).toMatchObject({ cote: 'droite', ton: 'equipe', etiquette: 'Démo · commercial' })
    expect(vueAdmin(msg({ sender: 'admin', author_id: ADM }), ADM, 'Alin')).toMatchObject({ cote: 'droite', ton: 'moi', etiquette: null })
  })
  test('vu par le client', () => {
    expect(vueClient(msg({}))).toMatchObject({ cote: 'droite', ton: 'moi' })
    expect(vueClient(msg({ sender: 'commercial', author_name: 'Ruth' }))).toMatchObject({ cote: 'gauche', etiquette: 'Ruth' })
  })
  test('fil direction <-> commercial', () => {
    const b = vueEquipe({ id: 'x', sender_type: 'director', body: 'Objectif', created_at: t(9) }, 'commercial')
    expect(b).toMatchObject({ cote: 'gauche', etiquette: 'Direction Mayinvest' })
  })
})

describe('regroupement', () => {
  test('messages rapprochés regroupés, séparateur de jour', () => {
    const b = [msg({ created_at: t(10, 0, 25) }), msg({ created_at: t(10, 0) }), msg({ created_at: t(10, 2) }), msg({ sender: 'commercial', author_id: COM, created_at: t(10, 3) })]
      .map(m => vueCommercial(m, COM, 'Alin'))
    const r = regrouper(b, now)
    expect(r.map(x => x.jour)).toEqual(['Hier', "Aujourd'hui", null, null])
    expect(r.map(x => [x.debut, x.fin])).toEqual([[true, true], [true, false], [false, true], [true, true]])
  })
  test('une carte n\'est jamais regroupée', () => {
    const b = [msg({ sender: 'commercial', author_id: COM, created_at: t(10) }), msg({ sender: 'commercial', author_id: COM, created_at: t(10, 1), kind: 'pieces' })]
      .map(m => vueCommercial(m, COM, 'Alin'))
    expect(regrouper(b, now)[1]!.debut).toBe(true)
  })
  test('libellés de jour', () => {
    expect(libelleJour(t(9), now)).toBe("Aujourd'hui")
    expect(libelleJour(t(9, 0, 20), now)).toBe('Vendredi 20 novembre')
  })
})

describe('cartes', () => {
  const at = new Date(2026, 10, 28, 15, 0).getTime()
  test('rendez-vous', () => {
    expect(lireRdv({ at: new Date(at).toISOString(), lieu: 'BGFI', statut: 'confirme' })).toEqual({ at, lieu: 'BGFI', statut: 'confirme' })
    expect(lireRdv({})).toBeNull()
    expect(blocCalendrier(at)).toEqual({ jour: 'SAM.', num: 28 })
    expect(phraseRdv(at)).toBe('Samedi 28 novembre à 15 h')
    expect(reponseClientRdv(at, 'confirme')).toBe('Je confirme le rendez-vous du samedi 28 novembre à 15 h.')
  })
  test('pièces de la carte', () => {
    const docs = [{ id: 'a', status: 'pending' }, { id: 'b', status: 'validated' }, { id: 'c', status: 'pending' }]
    expect(piecesDeCarte({ doc_ids: ['a', 'c'] }, docs).map(d => d.id)).toEqual(['a', 'c'])
    expect(piecesDeCarte({ doc_ids: [] }, docs)).toHaveLength(3)
    expect(piecesDeCarte({ doc_ids: ['zz'] }, docs)).toHaveLength(3)
  })
  test('anciens messages texte de pièces affichés en carte', () => {
    const texte = "Bonjour, pour avancer sur votre dossier il nous manque encore :\n- Carte Nationale d'Identité (ou passeport)\n- Relevé bancaire (3 derniers mois)\nVous pouvez les envoyer directement depuis votre espace, rubrique Documents."
    expect(piecesDansTexte(texte)).toEqual(["Carte Nationale d'Identité (ou passeport)", 'Relevé bancaire (3 derniers mois)'])
    expect(piecesDansTexte('Bonjour, merci !')).toBeNull()
    const c = carteDe({ kind: 'text', content: texte })
    expect(c.kind).toBe('pieces')
    const docs = [{ id: 'd1', doc_label: "Carte Nationale d'Identité (ou passeport)", status: 'uploaded' }]
    const liste = piecesDeCarte(c.payload, docs)
    expect(liste.map(d => d.id)).toEqual(['d1', 'texte-1'])
    expect(liste[1]!.status).toBe('pending')
    expect(carteDe({ kind: 'pack', payload: {} }).kind).toBe('pack')
    expect(texteSecoursPieces(['RIB'])).toContain('- RIB')
  })
})

describe('réponses suggérées', () => {
  test('selon le dernier message', () => {
    const conf = vueCommercial(msg({ content: 'Je confirme le rendez-vous du vendredi.' }), COM, 'Alin')
    expect(suggestions('equipe', [conf], 'Alin')[0]).toBe('Parfait, à bientôt !')
    expect(suggestions('equipe', [], 'Alin')[0]).toBe('Bonjour Alin, je prends en charge votre dossier.')
    const carte = vueClient(msg({ sender: 'commercial', kind: 'pieces' }))
    expect(suggestions('client', [carte])[0]).toBe("J'envoie mes pièces aujourd'hui.")
  })
})

describe('fichier partagé', () => {
  test('détecte nom, type et adresse', async () => {
    const { pieceJointe } = await import('./conversation')
    expect(pieceJointe('📎 cni.jpg\nhttps://x.supabase.co/storage/v1/object/public/lead-documents/a/cni.jpg')).toMatchObject({ nom: 'cni.jpg', type: 'image' })
    expect(pieceJointe('📎 releve.pdf\nhttps://x/r.pdf\nvoici')).toMatchObject({ type: 'pdf', reste: 'voici' })
    expect(pieceJointe('Bonjour')).toBeNull()
  })
})
