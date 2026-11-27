import { describe, test, expect } from 'vitest'
import { scripts, lienWhatsappTexte, lienFacebook, lienSms, chiffresParrainage } from './outils'

describe('mes outils', () => {
  test('messages personnalisés et relance honnête', () => {
    const s = scripts('Aldo', 'https://x/preselection?ref=AB')
    expect(s[0]!.texte).toContain('je suis Aldo de Mayinvest')
    expect(s[0]!.texte).toContain('ref=AB')
    expect(s[1]!.texte).not.toMatch(/banques partenaires|avant vendredi/)
    expect(scripts('', 'l')[0]!.texte).toContain('je suis votre conseiller')
  })
  test('liens de partage', () => {
    expect(lienWhatsappTexte('a b')).toBe('https://wa.me/?text=a%20b')
    expect(lienFacebook('https://x/?ref=A')).toContain('u=https%3A%2F%2Fx%2F%3Fref%3DA')
    expect(lienSms('Salut')).toBe('sms:?&body=Salut')
  })
  test('gains et chiffres', () => {
    const now = new Date(2026, 10, 26).getTime()
    const ls = [{ statut: 'Financé', created_at: new Date(2026, 10, 3).toISOString() }, { statut: 'Nouveau', created_at: new Date(2026, 9, 3).toISOString() }]
    expect(chiffresParrainage(ls, now)).toEqual({ total: 2, mois: 1, finances: 1 })
  })
})
