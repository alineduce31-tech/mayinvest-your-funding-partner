// ============================================================
// Mayinvest PréSelect - Templates WhatsApp (4 scripts)
// Fichier: src/lib/lead-templates.ts (NOUVEAU FICHIER)
// ============================================================
//
// Ces templates sont utilisés par les boutons d'action sur la fiche lead.
// Modifiable en 1 ligne pour ajuster le ton, les prix, le numéro de contact.
//
// IMPORTANT: Pour que les variables {prenom}, {raison_sociale} marchent,
// le lead doit avoir ces champs remplis dans identite / situation.
// ============================================================

export const MAYINVEST_CONTACT = '+242 06 53 13 187'
export const MAYINVEST_WHATSAPP = '24265313187' // Format international sans +

export const PRIX_OUVERTURE_COMPTE = 30_000
export const PRIX_PACK_FORMALISATION = 50_000
export const PRIX_RESTRUCTURATION = 50_000

// ============================================================
// Helper: remplace les variables {x} par les valeurs du lead
// ============================================================
export function fillTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `[${key}]`))
}

// ============================================================
// 4 TEMPLATES WHATSAPP (un par raison de non-éligibilité)
// ============================================================

export const TEMPLATE_OUVERTURE_COMPTE = `Bonjour {prenom},

Suite à votre pré-sélection Mayinvest, nous avons identifié que vous n'avez pas encore de compte bancaire professionnel.

C'est la 1ère étape avant tout financement. Mayinvest vous accompagne pour l'ouverture rapide (sous 15 jours) auprès de nos banques partenaires.

Coût de l'accompagnement : 30 000 XAF (dossier complet, prise de RDV, suivi).

Souhaitez-vous qu'on démarre ?

Mayinvest · ${MAYINVEST_CONTACT}`

export const TEMPLATE_PACK_FORMALISATION = `Bonjour {prenom},

Nous avons étudié votre dossier Mayinvest. Votre activité est viable, mais il vous manque le RCCM pour accéder au financement bancaire.

Mayinvest propose le Pack Formalisation : création RCCM + NIU + statuts, en 21 jours, tout inclus.

Tarif : 50 000 XAF (facture détaillée fournie).

Je peux vous envoyer le devis complet ?

Mayinvest · ${MAYINVEST_CONTACT}`

export const TEMPLATE_COUVEUSE_3MOIS = `Bonjour {prenom},

Merci d'avoir déposé votre dossier Mayinvest.

Aujourd'hui, vos flux mensuels sont encore un peu justes pour un financement classique. Mais votre activité est prometteuse.

Nous vous proposons notre programme "Couveuse 3 mois" (gratuit) : accompagnement, structuration de vos flux et préparation au dossier bancaire.

Objectif : passer au financement d'ici 3 mois.

On en discute ?

Mayinvest · ${MAYINVEST_CONTACT}`

export const TEMPLATE_RESTRUCTURATION = `Bonjour {prenom},

Nous avons analysé votre situation Mayinvest. Un refus bancaire ne signifie pas la fin du projet, il faut juste restructurer le dossier.

Mayinvest propose un service de restructuration : analyse du refus, correction des faiblesses, nouvelle approche bancaire ciblée.

Tarif : 50 000 XAF (diagnostic + nouveau montage).

Taux de succès après restructuration : 70%.

On regarde ensemble ?

Mayinvest · ${MAYINVEST_CONTACT}`

// ============================================================
// Catalogue des actions disponibles sur une fiche lead
// ============================================================

export type LeadActionKey = 'ouverture_compte' | 'pack_formalisation' | 'couveuse' | 'restructuration'

export const LEAD_ACTIONS = [
  {
    key: 'ouverture_compte' as const,
    label: 'Envoyer script WhatsApp · Ouverture Compte',
    short: 'Ouverture Compte',
    prix: PRIX_OUVERTURE_COMPTE,
    template: TEMPLATE_OUVERTURE_COMPTE,
    color: '#1E40AF',
    icon: '🏦',
  },
  {
    key: 'pack_formalisation' as const,
    label: 'Envoyer Devis · Pack Formalisation 50 000 XAF',
    short: 'Pack Formalisation',
    prix: PRIX_PACK_FORMALISATION,
    template: TEMPLATE_PACK_FORMALISATION,
    color: '#D97706',
    icon: '📄',
  },
  {
    key: 'couveuse' as const,
    label: 'Proposer Couveuse 3 mois (gratuit)',
    short: 'Couveuse 3 mois',
    prix: 0,
    template: TEMPLATE_COUVEUSE_3MOIS,
    color: '#047857',
    icon: '🌱',
  },
  {
    key: 'restructuration' as const,
    label: 'Proposer Restructuration 50 000 XAF',
    short: 'Restructuration',
    prix: PRIX_RESTRUCTURATION,
    template: TEMPLATE_RESTRUCTURATION,
    color: '#4338CA',
    icon: '🔄',
  },
] as const

// ============================================================
// Helper: construit l'URL WhatsApp à ouvrir
// ============================================================
export function buildWhatsappUrl(telephone: string, message: string): string {
  // Nettoie le numéro : garde uniquement les chiffres
  const cleaned = telephone.replace(/\D/g, '')
  // Si pas de préfixe pays, assume +242 (Congo-Brazzaville)
  const withCountry = cleaned.startsWith('242') ? cleaned : cleaned.length === 9 ? '242' + cleaned : cleaned
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`
}

// ============================================================
// Cycle de vie officiel des leads (cahier des charges)
// ============================================================

export const LIFECYCLE_STATUTS = [
  'Nouveau',
  'Contacté',
  'RDV',                        // bonus opérationnel (prise de RDV)
  'Non Éligible',
  'Pack Formalisation Vendu',
  'Bancarisé',
  'Éligible',
  'Dossier Déposé',
  'Financé',
  'Perdu',                      // bonus opérationnel (dossier abandonné)
] as const

export type LeadStatut = typeof LIFECYCLE_STATUTS[number]

// Palette de couleurs par statut (cohérent avec le funnel du dashboard)
export const STATUT_COLORS: Record<string, { bg: string; fg: string }> = {
  'Nouveau':                  { bg: '#F1F5F9', fg: '#475569' },  // slate
  'Contacté':                 { bg: '#DBEAFE', fg: '#1E40AF' },  // bleu clair
  'RDV':                      { bg: '#C7D2FE', fg: '#3730A3' },  // indigo
  'Non Éligible':             { bg: '#FEF3C7', fg: '#B45309' },  // ambre
  'Pack Formalisation Vendu': { bg: '#FED7AA', fg: '#C2410C' },  // orange
  'Bancarisé':                { bg: '#A7F3D0', fg: '#065F46' },  // vert clair
  'Éligible':                 { bg: '#CCFBF1', fg: '#115E59' },  // teal
  'Dossier Déposé':           { bg: '#BFDBFE', fg: '#1D4ED8' },  // bleu
  'Financé':                  { bg: '#D1FAE5', fg: '#047857' },  // vert émeraude
  'Perdu':                    { bg: '#FEE2E2', fg: '#B91C1C' },  // rouge
}
