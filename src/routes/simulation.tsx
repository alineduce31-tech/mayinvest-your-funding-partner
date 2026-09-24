import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/Header";
import { ScoreGauge } from "@/components/ScoreGauge";
import {
  ACTIVITES_PHYSIQUE,
  SECTEURS_PME,
  addLead,
  computeScore,
  emptyForm,
  type LeadForm,
  type LeadType,
} from "@/lib/mayinvest";

export const Route = createFileRoute("/simulation")({
  head: () => ({
    meta: [
      { title: "Simulation de financement — Mayinvest" },
      {
        name: "description",
        content:
          "Quatre étapes pour qualifier votre demande de financement et obtenir votre score de bancabilité.",
      },
      { property: "og:title", content: "Simulation de financement — Mayinvest" },
      {
        property: "og:description",
        content: "Particulier ou PME : obtenez votre score de bancabilité sur 100 en 2 minutes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Simulation,
});

const OUI_NON = [
  { value: "oui", label: "Oui" },
  { value: "non", label: "Non" },
];

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input
        className="field mt-1.5"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function Choice({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="mt-1.5 flex gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`pill border px-4 py-2 text-sm transition-colors ${
              value === o.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-accent"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-soft p-6">
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

function Simulation() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<LeadForm>(emptyForm);
  const [submitted, setSubmitted] = useState(false);
  const set = (k: keyof LeadForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const score = computeScore(form);
  const isPme = form.type === "morale";

  const finish = () => {
    if (!submitted) {
      addLead(form, score);
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-2xl px-5 pb-24 pt-12">
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-border"}`}
            />
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Étape {step} sur 4</p>

        {step === 1 && (
          <section className="mt-8">
            <h1 className="text-2xl font-semibold tracking-tight">Qui demande le financement ?</h1>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["physique", "Personne physique", "Particulier, salarié, commerçant, artisan…"],
                  ["morale", "Personne morale / PME", "Entreprise, coopérative, société"],
                ] as [LeadType, string, string][]
              ).map(([value, title, text]) => (
                <button
                  key={value}
                  onClick={() => {
                    setForm((f) => ({ ...f, type: value, activite: "" }));
                    setStep(2);
                  }}
                  className="card-soft p-6 text-left transition-transform hover:-translate-y-0.5"
                >
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{text}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="mt-8">
            <h1 className="text-2xl font-semibold tracking-tight">
              {isPme ? "Secteur d'activité" : "Votre activité"}
            </h1>
            <div className="mt-6 flex flex-wrap gap-2">
              {(isPme ? SECTEURS_PME : ACTIVITES_PHYSIQUE).map((a) => (
                <button
                  key={a}
                  onClick={() => {
                    set("activite")(a);
                    setStep(3);
                  }}
                  className={`pill border px-5 py-2.5 text-sm transition-colors ${
                    form.activite === a
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:bg-accent"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
            <button onClick={() => setStep(1)} className="btn-ghost mt-8 px-5 py-2 text-sm">
              Retour
            </button>
          </section>
        )}

        {step === 3 && (
          <section className="mt-8 space-y-5">
            <h1 className="text-2xl font-semibold tracking-tight">Votre dossier</h1>

            <Block title="Identité">
              {isPme ? (
                <>
                  <Field
                    label="Raison sociale"
                    value={form.raisonSociale}
                    onChange={set("raisonSociale")}
                  />
                  <Field
                    label="Nom du dirigeant"
                    value={form.nom}
                    onChange={set("nom")}
                  />
                </>
              ) : (
                <Field label="Nom complet" value={form.nom} onChange={set("nom")} />
              )}
              <Field
                label="Téléphone"
                value={form.telephone}
                onChange={set("telephone")}
                placeholder="+242 06 000 00 00"
              />
              <Field label="Ville" value={form.ville} onChange={set("ville")} />
            </Block>

            <Block title={isPme ? "Situation juridique" : "Situation professionnelle"}>
              {isPme ? (
                <>
                  <Choice label="RCCM" value={form.rccm} onChange={set("rccm")} options={OUI_NON} />
                  <Field
                    label="Flux mensuel (FCFA)"
                    value={form.fluxMensuel}
                    onChange={set("fluxMensuel")}
                    inputMode="numeric"
                  />
                  <Choice
                    label="Compte bancaire mouvementé"
                    value={form.compteMouvemente}
                    onChange={set("compteMouvemente")}
                    options={OUI_NON}
                  />
                </>
              ) : (
                <>
                  <Field
                    label="Ancienneté dans l'activité (mois)"
                    value={form.anciennete}
                    onChange={set("anciennete")}
                  />
                  <Choice
                    label="Salaire domicilié en banque"
                    value={form.salaireDomicilie}
                    onChange={set("salaireDomicilie")}
                    options={OUI_NON}
                  />
                  <Field
                    label="Revenu mensuel (FCFA)"
                    value={form.revenu}
                    onChange={set("revenu")}
                  />
                </>
              )}
            </Block>

            <Block title="Besoin de financement">
              <Field
                label="Montant demandé (FCFA)"
                value={form.montant}
                onChange={set("montant")}
              />
              <Field label="Objet du financement" value={form.objet} onChange={set("objet")} />
              <Field label="Durée souhaitée (mois)" value={form.duree} onChange={set("duree")} />
            </Block>

            <Block title="Éligibilité">
              <Field label="Banque actuelle" value={form.banque} onChange={set("banque")} />
              <Choice
                label="Refus bancaire récent"
                value={form.refusRecent}
                onChange={set("refusRecent")}
                options={OUI_NON}
              />
              <Choice
                label="Garanties disponibles"
                value={form.garanties}
                onChange={set("garanties")}
                options={OUI_NON}
              />
            </Block>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="btn-ghost px-5 py-2.5 text-sm">
                Retour
              </button>
              <button
                onClick={() => {
                  setStep(4);
                  finish();
                }}
                className="btn-primary px-6 py-2.5 text-sm"
              >
                Voir mon score
              </button>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="mt-10 flex flex-col items-center text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Votre score de bancabilité</h1>
            <div className="card-soft mt-8 flex w-full flex-col items-center gap-4 p-10">
              <ScoreGauge score={score} />
              <p className="max-w-sm text-sm text-muted-foreground">
                {score >= 70
                  ? "Profil solide : votre dossier peut être présenté à une banque partenaire."
                  : score >= 50
                    ? "Profil intermédiaire : quelques pièces à renforcer avant dépôt."
                    : "Profil à préparer : un pack de formalisation augmentera vos chances."}
              </p>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Un conseiller Mayinvest vous contacte pour la suite du dossier.
            </p>
            <div className="mt-6 flex gap-3">
              <Link to="/" className="btn-ghost px-5 py-2.5 text-sm">
                Retour à l'accueil
              </Link>
              <Link to="/admin" className="btn-primary px-6 py-2.5 text-sm">
                Voir dans le back-office
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
