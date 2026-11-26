// Espace client : étapes en mots simples et « prochaine étape » à afficher au client.

export const ETAPES_CLIENT: { statut: string; label: string }[] = [
  { statut: 'Nouveau', label: 'Demande reçue' },
  { statut: 'Contacté', label: 'Conseiller en contact' },
  { statut: 'RDV', label: 'Rendez-vous' },
  { statut: 'Dossier Déposé', label: 'Dossier déposé en banque' },
  { statut: 'Éligible', label: 'Réponse de la banque' },
  { statut: 'Financé', label: 'Crédit financé' },
]

/** Rang de l'étape en cours. Les statuts hors parcours bancaire restent à « Conseiller en contact ». */
export function etapeCourante(statut: string | null | undefined): number {
  const i = ETAPES_CLIENT.findIndex(e => e.statut === statut)
  if (i >= 0) return i
  return ['Non Éligible', 'Pack Formalisation Vendu', 'Bancarisé', 'Perdu'].includes(String(statut)) ? 1 : 0
}

export type DocClient = { status?: string | null }

export function compteDocs(docs: DocClient[]) {
  const envoyes = docs.filter(d => d.status === 'uploaded' || d.status === 'validated').length
  const valides = docs.filter(d => d.status === 'validated').length
  const aRefaire = docs.filter(d => d.status === 'rejected').length
  const aEnvoyer = docs.filter(d => !d.status || d.status === 'pending').length
  return { total: docs.length, envoyes, valides, aRefaire, aEnvoyer }
}

export type Prochaine = { titre: string; texte: string; action: 'documents' | 'discussion' | null; bouton?: string }

/** Ce que le client doit savoir ou faire maintenant, sans rien promettre de faux. */
export function prochaineEtape(statut: string | null | undefined, docs: DocClient[]): Prochaine {
  const d = compteDocs(docs)
  const pieces = (n: number) => `${n} document${n > 1 ? 's' : ''}`
  if (d.aRefaire > 0) return { titre: 'Un document est à remplacer', texte: `Votre conseiller vous demande de renvoyer ${pieces(d.aRefaire)}. Le motif est indiqué dans l'onglet Documents.`, action: 'documents', bouton: 'Voir mes documents' }
  switch (statut) {
    case 'Financé': return { titre: 'Votre crédit est financé', texte: 'Félicitations. Votre conseiller reste disponible si vous avez une question.', action: 'discussion', bouton: 'Écrire à mon conseiller' }
    case 'Éligible': return { titre: 'Réponse favorable de la banque', texte: 'Votre conseiller vous contacte pour les prochaines formalités avec la banque.', action: 'discussion', bouton: 'Écrire à mon conseiller' }
    case 'Dossier Déposé': return { titre: 'Votre dossier est à la banque', texte: 'La banque étudie votre demande. Votre conseiller vous prévient dès qu\'il a une réponse.', action: 'discussion', bouton: 'Écrire à mon conseiller' }
    case 'Non Éligible': return { titre: 'Votre conseiller vous propose une solution', texte: 'Votre dossier ne peut pas encore aller en banque. Votre conseiller vous explique comment le rendre éligible.', action: 'discussion', bouton: 'Écrire à mon conseiller' }
    case 'Perdu': return { titre: 'Votre demande est en pause', texte: 'Si vous souhaitez la relancer, écrivez à votre conseiller.', action: 'discussion', bouton: 'Écrire à mon conseiller' }
  }
  if (d.aEnvoyer > 0) {
    const quand = statut === 'RDV' ? 'avant le rendez-vous' : 'dès maintenant'
    return { titre: statut === 'RDV' ? 'Rendez-vous avec votre conseiller' : 'Préparez vos documents', texte: `Envoyez vos ${pieces(d.aEnvoyer)} ${quand} pour gagner du temps.`, action: 'documents', bouton: 'Envoyer mes documents' }
  }
  if (statut === 'Nouveau') return { titre: 'Votre demande est bien reçue', texte: 'Un conseiller Mayinvest va vous contacter.', action: 'discussion', bouton: 'Écrire à mon conseiller' }
  return { titre: 'Vos documents sont envoyés', texte: 'Votre conseiller les vérifie. Vous serez prévenu dans la discussion.', action: 'discussion', bouton: 'Écrire à mon conseiller' }
}

/** Libellé court d'une pièce : « Bulletins de salaire (3 derniers mois) » → titre et précision. */
export function decoupePiece(label: string): { titre: string; precision: string } {
  const m = String(label || '').match(/^(.*?)\s*\((.*)\)\s*$/)
  if (!m) return { titre: String(label || ''), precision: '' }
  return { titre: m[1]!.replace(/Carte Nationale d'Identité/i, "Carte d'identité"), precision: m[2]! }
}
