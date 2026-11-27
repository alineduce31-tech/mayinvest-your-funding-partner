import { describe, expect, it } from 'vitest'
import { delaiOk, delaiTxt, etapesParcours, messageConseille, texteMessage, type PerfCommercial } from './performance'

const base: PerfCommercial = {
  id: 'c1', rang: 1, nom: 'Grâce Kimbembe', ville: 'Brazzaville', recus: 10, contactes: 8, delai_h: 5,
  parcours: { recus: 10, contactes: 8, rdv: 6, deposes: 4, finances: 2 },
  deposes: 4, finances: 2, refus: 1, taux_acceptation: 67, transfo: 20, fiable: true, montant_finance: 0, gains: 0,
  packs: 0, bancarises: 0, actifs: 5, retard: 0, retard_liste: [], precedent: { recus: 7, finances: 1 },
}

describe('délai du 1er contact', () => {
  it('heures puis jours', () => {
    expect(delaiTxt(0.4)).toBe('< 1 h')
    expect(delaiTxt(6.2)).toBe('6 h')
    expect(delaiTxt(50)).toBe('2 j')
    expect(delaiTxt(null)).toBe('—')
  })
  it('objectif 24 h', () => {
    expect(delaiOk(10)).toBe(true)
    expect(delaiOk(31)).toBe(false)
    expect(delaiOk(null)).toBeNull()
  })
})

describe('parcours', () => {
  it('en % des leads reçus', () => {
    expect(etapesParcours(base.parcours).map(e => e.pct)).toEqual([100, 80, 60, 40, 20])
  })
  it('sans lead reçu, pas de division par zéro', () => {
    expect(etapesParcours({ recus: 0, contactes: 0, rdv: 0, deposes: 0, finances: 0 })[0]?.pct).toBe(0)
  })
})

describe('messages', () => {
  it('conseille la relance en priorité', () => {
    expect(messageConseille({ retard: 2, finances: 3, rang: 1 })).toBe('relance')
    expect(messageConseille({ retard: 0, finances: 3, rang: 1 })).toBe('felicitations')
    expect(messageConseille({ retard: 0, finances: 0, rang: 3 })).toBe('encouragement')
  })
  it('la relance cite les leads en retard', () => {
    const t = texteMessage('relance', { ...base, retard: 2, retard_liste: [{ nom: 'Boulangerie La Clé', depuis: '', ville: 'Nkayi' }, { nom: 'Alin LN', depuis: '' }] }, 'Ce mois', 3)
    expect(t).toContain('Bonjour Grâce')
    expect(t).toContain('2 leads attendent')
    expect(t).toContain('• Boulangerie La Clé (Nkayi)')
  })
  it('les félicitations donnent le rang quand il est 1er', () => {
    expect(texteMessage('felicitations', base, 'Mois en cours', 3)).toContain("Tu es 1er de l'équipe")
    expect(texteMessage('felicitations', { ...base, rang: 2 }, 'Mois en cours', 3)).not.toContain('1er')
  })
})
