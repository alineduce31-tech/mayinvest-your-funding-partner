// État applicatif provisoire (en mémoire, le temps de brancher la base de données).
import { useEffect, useState } from "react";

export type LeadType = "physique" | "morale";

export const STATUSES = [
  "Nouveau",
  "Contacté",
  "Non Éligible",
  "Pack Formalisation Vendu",
  "Bancarisé",
  "Éligible",
  "Dossier déposé",
  "Financé",
  "Perdu",
] as const;
export type Status = (typeof STATUSES)[number];

export const ACTIVITES_PHYSIQUE = [
  "Fonctionnaire",
  "Salarié privé",
  "Commerçant",
  "Artisan",
  "Profession libérale",
  "Agriculteur",
];

export const SECTEURS_PME = [
  "Commerce",
  "Tourisme",
  "BTP",
  "Industrie / Bois",
  "Agriculture",
  "Transport",
  "Santé",
  "Tech",
  "Autre",
];

export type LeadForm = {
  type: LeadType;
  activite: string;
  // Identité
  nom: string;
  telephone: string;
  ville: string;
  raisonSociale: string;
  // Situation pro / juridique
  anciennete: string; // mois
  salaireDomicilie: string; // oui/non
  revenu: string; // FCFA
  rccm: string; // oui/non
  fluxMensuel: string; // FCFA
  compteMouvemente: string; // oui/non
  // Besoin
  montant: string;
  objet: string;
  duree: string;
  // Éligibilité
  banque: string;
  refusRecent: string; // oui/non
  garanties: string; // oui/non
};

export const emptyForm: LeadForm = {
  type: "physique",
  activite: "",
  nom: "",
  telephone: "",
  ville: "",
  raisonSociale: "",
  anciennete: "",
  salaireDomicilie: "",
  revenu: "",
  rccm: "",
  fluxMensuel: "",
  compteMouvemente: "",
  montant: "",
  objet: "",
  duree: "",
  banque: "",
  refusRecent: "",
  garanties: "",
};

const n = (v: string) => Number(String(v).replace(/[^\d]/g, "")) || 0;
const yes = (v: string) => v === "oui";

export function computeScore(f: LeadForm): number {
  let s = 40;
  if (f.type === "physique") {
    if (n(f.anciennete) > 6) s += 20;
    if (yes(f.salaireDomicilie)) s += 20;
    const r = n(f.revenu);
    if (r >= 500000) s += 20;
    else if (r >= 200000) s += 10;
  } else {
    if (f.rccm === "oui") s += 25;
    else if (f.rccm === "non") s -= 15;
    if (yes(f.compteMouvemente)) s += 15;
    if (f.refusRecent === "non") s += 10;
    if (yes(f.garanties)) s += 15;
    const flux = n(f.fluxMensuel);
    if (flux >= 5000000) s += 15;
    else if (flux >= 1000000) s += 5;
  }
  return Math.max(0, Math.min(100, s));
}

export type Lead = LeadForm & {
  id: string;
  score: number;
  statut: Status;
  createdAt: string;
  agent: string;
};

export type Session = { nom: string; telephone: string } | null;

type Store = { leads: Lead[]; session: Session };

const store: Store = { leads: [], session: null };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function addLead(form: LeadForm, score: number) {
  const lead: Lead = {
    ...form,
    id: Math.random().toString(36).slice(2, 10),
    score,
    statut: "Nouveau",
    createdAt: new Date().toISOString(),
    agent: store.session?.nom ?? form.nom ?? "Agent",
  };
  store.leads = [lead, ...store.leads];
  emit();
  return lead;
}

export function setStatus(id: string, statut: Status) {
  store.leads = store.leads.map((l) => (l.id === id ? { ...l, statut } : l));
  emit();
}

export function signIn(session: Exclude<Session, null>) {
  store.session = session;
  emit();
}

export function signOut() {
  store.session = null;
  emit();
}

export function useStore() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((v) => v + 1);
    listeners.add(l);
    return () => listeners.delete(l);
  }, []);
  return { leads: store.leads, session: store.session };
}
