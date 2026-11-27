// Page « Mes outils » du commercial (module pur, testé) : messages prêts, liens de partage, gains.


export type Script = { k: string; etiquette: string; ton: 'vert' | 'orange' | 'violet'; titre: string; texte: string }

export function scripts(prenom: string, lien: string): Script[] {
  const p = (prenom || '').trim()
  return [
    {
      k: 'intro', etiquette: '1er contact', ton: 'vert', titre: 'Présentation',
      texte: `Bonjour, je suis ${p || 'votre conseiller'} de Mayinvest Conseil. On aide les Congolais à obtenir leur crédit bancaire plus vite et sans se faire renvoyer. Vous remplissez un formulaire de 2 minutes et on vous dit sous 24 h si votre dossier est bancable. C'est gratuit, et vous ne payez que si on obtient votre financement. Voici le lien : ${lien}`,
    },
    {
      k: 'relance', etiquette: 'Après 48 h', ton: 'orange', titre: 'Relance',
      texte: 'Bonjour, je reviens vers vous pour votre projet de financement. Votre dossier est prêt à avancer : avez-vous 5 minutes cette semaine pour qu\'on en parle ?',
    },
    {
      k: 'pme', etiquette: 'PME sans RCCM', ton: 'violet', titre: 'Pack mise en règle',
      texte: 'Bonjour, vous n\'avez pas encore de RCCM ? Pas de problème : pour 50 000 XAF, on vous met en règle (RCCM, NIU, compte bancaire pro) en 2 semaines. Votre entreprise pourra ensuite présenter un dossier de crédit complet. On commence ?',
    },
  ]
}

export function lienWhatsappTexte(texte: string): string {
  return `https://wa.me/?text=${encodeURIComponent(texte)}`
}
export function lienFacebook(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
}
export function lienSms(texte: string): string {
  return `sms:?&body=${encodeURIComponent(texte)}`
}

/** Chiffres du bandeau : dossiers attribués, reçus ce mois-ci, financés. */
export function chiffresParrainage(leads: { statut: string; created_at: string }[], now: number): { total: number; mois: number; finances: number } {
  const d = new Date(now)
  const mois = leads.filter(l => { const c = new Date(l.created_at); return c.getMonth() === d.getMonth() && c.getFullYear() === d.getFullYear() }).length
  return { total: leads.length, mois, finances: leads.filter(l => l.statut === 'Financé').length }
}
