import { describe, it as test, expect } from 'vitest'
import { modeApparition, estMobile, doitFermerParGlisse, cleSession, DELAIS } from './haki-teaser'

describe('apparition de Haki', () => {
  test('mobile : une bulle, jamais le panneau', () => {
    expect(modeApparition({ largeur: 390, autoActif: true, refuse: false, bulleDejaVue: false })).toBe('bulle')
  })
  test('mobile : plus rien une fois la bulle vue dans la session', () => {
    expect(modeApparition({ largeur: 390, autoActif: true, refuse: false, bulleDejaVue: true })).toBe('rien')
  })
  test('ordinateur : le panneau', () => {
    expect(modeApparition({ largeur: 1440, autoActif: true, refuse: false, bulleDejaVue: true })).toBe('panneau')
  })
  test('mode auto coupé ou refus : rien', () => {
    expect(modeApparition({ largeur: 1440, autoActif: false, refuse: false, bulleDejaVue: false })).toBe('rien')
    expect(modeApparition({ largeur: 390, autoActif: true, refuse: true, bulleDejaVue: false })).toBe('rien')
  })
  test('tablette 820 px traitée comme un ordinateur, téléphone 760 px comme un mobile', () => {
    expect(estMobile(760)).toBe(true)
    expect(estMobile(820)).toBe(false)
  })
  test('connexion : bulle plus rapide que sur l\'accueil', () => {
    expect(DELAIS.login.mobile).toBeLessThan(DELAIS.home.mobile)
  })
  test('glisser vers le bas pour fermer', () => {
    expect(doitFermerParGlisse(40, 600)).toBe(false)
    expect(doitFermerParGlisse(130, 600)).toBe(true)
    expect(doitFermerParGlisse(90, 300)).toBe(true)
  })
  test('clé de session par page', () => {
    expect(cleSession('home')).not.toBe(cleSession('login'))
  })
})
