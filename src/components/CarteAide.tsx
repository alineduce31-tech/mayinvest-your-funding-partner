import { useEffect, useState, type ReactNode } from 'react'
import {
  Info, LayoutGrid, Users, PieChart, Landmark, Ban, Package, BarChart3, MessageCircle, ClipboardCheck, Crown,
  Filter, UserPlus, ArrowLeftRight, FileText, Download, Phone, Send, Link2, QrCode, Share2, CalendarDays, Wallet,
  Bell, Upload, Route, ShieldCheck, Eye, CheckCircle2, ListChecks, Trash2, KeyRound, Search, Megaphone, CreditCard,
} from 'lucide-react'

/**
 * Carte d'explication en haut d'un écran (« À quoi sert cette page ? »).
 * Affichée à la première visite ; après « Compris », elle se range et le petit bouton (i)
 * placé à côté du titre (BoutonAide) permet de la rouvrir. Le choix est gardé sur l'appareil.
 */

type Aide = { titre: string; texte: string; ic: ReactNode; actions: { ic: ReactNode; l: string }[] }
const s = 13

export const AIDES: Record<string, Aide> = {
  // ---- Admin ----
  'admin-general': { titre: 'À quoi sert le Dashboard ?', ic: <LayoutGrid size={19}/>, texte: "La vue d'ensemble de l'activité sur la période choisie : demandes reçues, dossiers éligibles, montants financés et alertes à traiter en priorité.", actions: [{ ic: <CalendarDays size={s}/>, l: 'Changer la période' }, { ic: <Bell size={s}/>, l: 'Voir les alertes' }, { ic: <Eye size={s}/>, l: 'Ouvrir les dossiers concernés' }] },
  'admin-crm': { titre: 'À quoi sert le CRM ?', ic: <Users size={19}/>, texte: 'Toutes les demandes de crédit reçues, du premier contact au financement. Chaque ligne est un dossier avec son score, son statut et son conseiller.', actions: [{ ic: <Filter size={s}/>, l: 'Filtrer et rechercher' }, { ic: <UserPlus size={s}/>, l: 'Attribuer un conseiller' }, { ic: <ArrowLeftRight size={s}/>, l: 'Changer le statut' }, { ic: <FileText size={s}/>, l: 'Ouvrir un dossier' }] },
  'admin-segments': { titre: 'À quoi servent les Segments ?', ic: <PieChart size={19}/>, texte: 'Les dossiers regroupés par profil (activité, ville, type de client) pour repérer où se trouvent les meilleures opportunités.', actions: [{ ic: <PieChart size={s}/>, l: 'Comparer les profils' }, { ic: <Search size={s}/>, l: 'Repérer les opportunités' }] },
  'admin-bancarisation': { titre: 'À quoi sert la Bancarisation ?', ic: <Landmark size={19}/>, texte: "Les prospects sans compte bancaire ou sans salaire domicilié, à accompagner vers l'ouverture d'un compte.", actions: [{ ic: <Phone size={s}/>, l: 'Contacter le prospect' }, { ic: <UserPlus size={s}/>, l: 'Attribuer un conseiller' }, { ic: <ArrowLeftRight size={s}/>, l: 'Suivre son statut' }] },
  'admin-non-eligibles': { titre: 'À quoi servent les Non éligibles ?', ic: <Ban size={19}/>, texte: 'Les dossiers refusés par le score, avec le motif. On peut leur proposer le Pack formalisation pour les rendre éligibles plus tard.', actions: [{ ic: <Eye size={s}/>, l: 'Voir le motif' }, { ic: <Package size={s}/>, l: 'Proposer le pack' }, { ic: <UserPlus size={s}/>, l: 'Attribuer un conseiller' }] },
  'admin-packs': { titre: 'À quoi servent les Packs ?', ic: <Package size={19}/>, texte: 'Les Packs formalisation souscrits par les clients : paiement à confirmer, étapes à suivre et références PF.', actions: [{ ic: <CreditCard size={s}/>, l: 'Confirmer un paiement' }, { ic: <ListChecks size={s}/>, l: 'Suivre les étapes' }, { ic: <Search size={s}/>, l: 'Chercher une référence' }] },
  'admin-tarifs': { titre: 'À quoi servent les Tarifs banques ?', ic: <Landmark size={19}/>, texte: "Les frais des banques relevés en agence, utilisés par le comparateur public. Mettez-les à jour tous les 3 mois avec une photo du hall.", actions: [{ ic: <Upload size={s}/>, l: 'Ajouter une photo' }, { ic: <ListChecks size={s}/>, l: 'Saisir les frais' }, { ic: <Eye size={s}/>, l: 'Voir le comparateur' }] },
  'admin-rapports': { titre: 'À quoi servent les Rapports ?', ic: <BarChart3 size={19}/>, texte: 'Les chiffres par statut, à exporter en Excel, CSV ou PDF pour vos réunions et vos partenaires.', actions: [{ ic: <BarChart3 size={s}/>, l: 'Lire les chiffres' }, { ic: <Download size={s}/>, l: 'Exporter' }] },
  'admin-messagerie': { titre: 'À quoi sert la Messagerie ?', ic: <MessageCircle size={19}/>, texte: "Toutes les conversations avec les clients et avec l'équipe commerciale, au même endroit.", actions: [{ ic: <Send size={s}/>, l: 'Répondre à un client' }, { ic: <FileText size={s}/>, l: 'Demander des pièces' }, { ic: <Megaphone size={s}/>, l: "Écrire à l'équipe" }] },
  'admin-candidatures': { titre: 'À quoi servent les Candidatures ?', ic: <ClipboardCheck size={19}/>, texte: 'Les personnes qui veulent devenir commerciaux : leurs scores aux épreuves, à valider ou refuser.', actions: [{ ic: <Eye size={s}/>, l: 'Voir les scores' }, { ic: <CheckCircle2 size={s}/>, l: 'Valider un compte' }, { ic: <Ban size={s}/>, l: 'Refuser' }] },
  'admin-equipe-commerciale': { titre: "À quoi sert l'Équipe commerciale ?", ic: <Users size={19}/>, texte: 'Les commerciaux actifs, leurs dossiers, leurs financements et leurs gains.', actions: [{ ic: <Wallet size={s}/>, l: 'Suivre les gains' }, { ic: <Ban size={s}/>, l: 'Désactiver' }, { ic: <Trash2 size={s}/>, l: 'Supprimer' }] },
  'admin-equipe-admin': { titre: "À quoi sert l'Équipe admin ?", ic: <Crown size={19}/>, texte: "Les membres de la direction et leurs droits d'accès.", actions: [{ ic: <UserPlus size={s}/>, l: 'Ajouter un membre' }, { ic: <ShieldCheck size={s}/>, l: 'Modifier les droits' }, { ic: <KeyRound size={s}/>, l: 'Réinitialiser un mot de passe' }] },
  // ---- Espace commercial (tutoiement, comme le reste de l'espace) ----
  'com-dashboard': { titre: "À quoi sert l'Accueil ?", ic: <LayoutGrid size={19}/>, texte: 'Ton tableau de bord : tes dossiers en cours, tes gains et tes prochaines actions.', actions: [{ ic: <Users size={s}/>, l: 'Voir mes dossiers' }, { ic: <Wallet size={s}/>, l: 'Suivre mes gains' }, { ic: <Bell size={s}/>, l: 'Mes rappels' }] },
  'com-leads': { titre: 'À quoi sert Mes dossiers ?', ic: <Users size={19}/>, texte: "Les clients que tu suis. Appelle-les et fais avancer leur dossier étape par étape jusqu'au financement.", actions: [{ ic: <Phone size={s}/>, l: 'Appeler' }, { ic: <ArrowLeftRight size={s}/>, l: "Changer l'étape" }, { ic: <UserPlus size={s}/>, l: 'Nouveau lead' }] },
  'com-messagerie': { titre: 'À quoi sert la Messagerie ?', ic: <MessageCircle size={19}/>, texte: 'Tes conversations avec tes clients et avec la direction. Le bandeau en haut de chaque discussion te dit quoi faire ensuite.', actions: [{ ic: <Send size={s}/>, l: 'Répondre' }, { ic: <FileText size={s}/>, l: 'Demander des pièces' }, { ic: <CalendarDays size={s}/>, l: 'Proposer un RDV' }] },
  'com-outils': { titre: 'À quoi servent les Outils ?', ic: <Link2 size={19}/>, texte: 'Ton lien et ton QR code de parrainage, et des messages prêts à partager pour trouver de nouveaux clients.', actions: [{ ic: <Link2 size={s}/>, l: 'Copier mon lien' }, { ic: <QrCode size={s}/>, l: 'Télécharger le QR code' }, { ic: <Share2 size={s}/>, l: 'Partager un message' }] },
  // ---- Espace client (vouvoiement) ----
  'cli-suivi': { titre: 'À quoi sert cet écran ?', ic: <Route size={19}/>, texte: "Où en est votre demande de crédit, étape par étape, et ce qu'il vous reste à faire.", actions: [{ ic: <Route size={s}/>, l: "Suivre l'avancement" }, { ic: <Upload size={s}/>, l: 'Envoyer mes documents' }, { ic: <MessageCircle size={s}/>, l: 'Écrire à mon conseiller' }] },
  'cli-docs': { titre: 'À quoi servent vos Documents ?', ic: <FileText size={19}/>, texte: 'Les pièces demandées par votre conseiller. Envoyez-les en photo ou en PDF : il les vérifie avant le dépôt en banque.', actions: [{ ic: <Upload size={s}/>, l: 'Envoyer une pièce' }, { ic: <CheckCircle2 size={s}/>, l: 'Voir ce qui est validé' }] },
  'cli-infos': { titre: 'À quoi servent vos Infos ?', ic: <Info size={19}/>, texte: "Les informations de votre demande. Si quelque chose est faux, écrivez à votre conseiller dans l'onglet Discussion.", actions: [{ ic: <Eye size={s}/>, l: 'Vérifier mes informations' }, { ic: <MessageCircle size={s}/>, l: 'Signaler une erreur' }] },
}

const CLE = (k: string) => `mi_aide_vue_${k}`
const EVT = 'mi-aide'
function estRangee(k: string) { try { return localStorage.getItem(CLE(k)) === '1' } catch { return false } }
function ranger(k: string, v: boolean) {
  try { v ? localStorage.setItem(CLE(k), '1') : localStorage.removeItem(CLE(k)) } catch { /* stockage indisponible */ }
  window.dispatchEvent(new CustomEvent(EVT, { detail: k }))
}
function useRangee(k: string) {
  const [monte, setMonte] = useState(false)
  const [r, setR] = useState(false)
  useEffect(() => {
    setMonte(true); setR(estRangee(k))
    const maj = (e: Event) => { if ((e as CustomEvent).detail === k) setR(estRangee(k)) }
    window.addEventListener(EVT, maj)
    return () => window.removeEventListener(EVT, maj)
  }, [k])
  return { monte, rangee: r }
}

export default function CarteAide({ cle, className = '' }: { cle: string; className?: string }) {
  const a = AIDES[cle]
  const { monte, rangee } = useRangee(cle)
  if (!a || !monte || rangee) return null
  return (
    <div className={`ca ${className}`} role="note">
      <style>{CSS}</style>
      <span className="ca-ic" aria-hidden="true">{a.ic}</span>
      <div className="ca-c">
        <b>{a.titre}</b>
        <p>{a.texte}</p>
        <div className="ca-acts">{a.actions.map(x => <span key={x.l}>{x.ic}{x.l}</span>)}</div>
      </div>
      <button type="button" className="ca-ok" onClick={() => ranger(cle, true)}>Compris</button>
    </div>
  )
}

/** Petit bouton (i) à côté du titre : visible quand la carte est rangée, la rouvre. */
export function BoutonAide({ cle }: { cle: string }) {
  const { monte, rangee } = useRangee(cle)
  if (!AIDES[cle] || !monte || !rangee) return null
  return (
    <button type="button" className="ca-i" onClick={() => ranger(cle, false)} title="À quoi sert cette page ?" aria-label="À quoi sert cette page ?">
      <style>{CSS}</style>
      <Info size={15}/>
    </button>
  )
}

const CSS = `
  .ca { display: flex; gap: 14px; align-items: flex-start; background: #fff; border: 1px solid #E2E8F2; border-radius: 16px; padding: 14px 14px 14px 16px; margin-bottom: 14px; box-shadow: 0 1px 2px rgba(13,27,62,.04); animation: caIn .2s ease; }
  @keyframes caIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
  .ca-ic { width: 38px; height: 38px; border-radius: 11px; flex: none; display: inline-flex; align-items: center; justify-content: center; background: #EAF1FF; color: #1A6BFF; }
  .ca-c { flex: 1; min-width: 0; }
  .ca-c b { display: block; font-size: 14px !important; font-weight: 700; color: #0D1B3E; margin-bottom: 3px; }
  .ca-c p { margin: 0 0 10px; font-size: 13px !important; line-height: 1.55; color: #475569; }
  .ca-acts { display: flex; flex-wrap: wrap; gap: 6px; }
  .ca-acts span { display: inline-flex; align-items: center; gap: 5px; font-size: 12px !important; color: #0D1B3E; background: #F5F7FB; border-radius: 999px; padding: 5px 10px; }
  .ca-acts svg { color: #1A6BFF; flex: none; }
  .ca-ok { flex: none; border: none; border-radius: 999px; background: #F3F5F9; color: #475569; font-family: inherit; font-size: 12.5px !important; font-weight: 600; padding: 7px 13px; cursor: pointer; }
  .ca-ok:hover { background: #E8ECF3; color: #0D1B3E; }
  .ca-i { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; border: none; background: #EAF1FF; color: #1A6BFF; cursor: pointer; vertical-align: middle; margin-left: 8px; flex: none; padding: 0; }
  .ca-i:hover { background: #DCE7FF; }
  .ca.ca-liste { margin: 10px 10px 4px; flex-wrap: wrap; padding: 12px; gap: 10px 12px; }
  .ca.ca-liste .ca-c { flex-basis: calc(100% - 52px); }
  .ca.ca-liste .ca-ok { margin-left: 50px; }
  @media (max-width: 640px) {
    .ca { flex-wrap: wrap; padding: 12px; gap: 10px 12px; }
    .ca-c { flex-basis: calc(100% - 52px); }
    .ca-ok { margin-left: 50px; }
  }
`
