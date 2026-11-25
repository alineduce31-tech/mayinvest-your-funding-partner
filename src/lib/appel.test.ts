import { describe, it as test, expect } from 'vitest'
import { appelDirect, lienTel, lienWhatsapp, noteAppel, numeroInternational } from './appel'

describe('numéros', () => {
  test('garde le 0 congolais après +242', () => {
    expect(numeroInternational('06 655 32 18')).toBe('+242066553218')
    expect(numeroInternational('+242 06 655 32 18')).toBe('+242066553218')
    expect(lienTel('066553218')).toBe('tel:+242066553218')
  })
  test('WhatsApp sans le +', () => {
    expect(lienWhatsapp('04 023 23 17')).toBe('https://wa.me/242040232317')
  })
  test('numéro incomplet : pas de lien', () => {
    expect(lienTel('0665')).toBeNull()
    expect(lienWhatsapp(null)).toBeNull()
  })
})

describe('comportement', () => {
  test('appel direct seulement sur téléphone tactile', () => {
    expect(appelDirect(390, true)).toBe(true)
    expect(appelDirect(820, true)).toBe(false)
    expect(appelDirect(1440, false)).toBe(false)
  })
  test('note d\'appel lisible', () => {
    const n = noteAppel('066553218', new Date(2026, 10, 25, 14, 32), 'whatsapp')
    expect(n).toBe('Appel vers 06 655 32 18 via WhatsApp à 14:32.')
  })
})
