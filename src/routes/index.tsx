import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Logo } from "@/components/Logo";
import { ScoreGauge } from "@/components/ScoreGauge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mayinvest — Qualifiez vos demandes de financement" },
      {
        name: "description",
        content:
          "Mayinvest Conseil présélectionne les dossiers de financement au Congo : simulation en 2 minutes et score de bancabilité.",
      },
      { property: "og:title", content: "Mayinvest — Présélection de dossiers de financement" },
      {
        property: "og:description",
        content:
          "Simulez votre éligibilité bancaire en 2 minutes et obtenez un score de bancabilité sur 100.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

// Exemple réel, calculé avec les mêmes règles que le simulateur
const EXEMPLE = [
  { label: "Point de départ", points: "40" },
  { label: "Plus de 6 mois d'ancienneté", points: "+20" },
  { label: "Salaire domicilié en banque", points: "+20" },
  { label: "Revenu mensuel de 350 000 FCFA", points: "+10" },
];

const ETAPES = [
  {
    icon: "◈",
    title: "Vous choisissez votre profil",
    text: "Particulier ou entreprise, puis votre activité : fonctionnaire, commerçant, BTP, transport…",
  },
  {
    icon: "◎",
    title: "Vous décrivez votre situation",
    text: "Revenus, ancienneté, montant et durée souhaités, banque actuelle et garanties.",
  },
  {
    icon: "✓",
    title: "Vous obtenez votre score",
    text: "Une note sur 100 s'affiche immédiatement, puis un conseiller vous rappelle pour la suite.",
  },
];

const CRITERES = [
  {
    title: "Particuliers",
    items: [
      "Ancienneté dans votre activité",
      "Salaire domicilié en banque",
      "Revenu mensuel",
    ],
  },
  {
    title: "Entreprises et PME",
    items: [
      "Immatriculation au RCCM",
      "Compte bancaire mouvementé et flux mensuel",
      "Garanties disponibles",
      "Absence de refus bancaire récent",
    ],
  },
];

function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="ambient-blue pointer-events-none fixed -top-64 left-1/2 h-[680px] w-[900px] -translate-x-1/2 opacity-80" />
      <div className="ambient-teal pointer-events-none fixed right-[-260px] top-[28rem] h-[720px] w-[720px] opacity-70" />
      <Header />

      <main className="relative z-10">
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-24 pt-16 md:grid-cols-[1.12fr_0.88fr] md:pb-28 md:pt-24">
          <div>
            <div className="pill inline-flex items-center gap-2 border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-soft" />
              Présélection bancaire · Congo
            </div>
            <h1 className="mt-7 max-w-2xl text-4xl sm:text-5xl lg:text-[3.65rem]">
              Votre demande de crédit, <span className="text-primary-soft">qualifiée</span> avant
              d'aller à la banque.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Mayinvest Conseil présélectionne les dossiers de crédit au Congo et vous indique,
              chiffres en main, vos chances réelles d'obtenir un financement.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-5">
              <Link to="/simulation" className="btn-primary px-7 py-3.5 text-sm sm:text-base">
                Commencer ma simulation
              </Link>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground sm:text-sm">
              {[
                "Résultat en 2 minutes",
                "Particulier ou entreprise",
                "Sans engagement",
              ].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal shadow-[0_0_10px_var(--color-teal)]" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="card-soft relative mx-auto w-full max-w-md p-6 sm:p-8">
            <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-primary-soft/60 to-transparent" />
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="pill mb-4 inline-flex items-center gap-2 border border-teal/25 bg-teal/10 px-3 py-1 text-xs font-semibold text-teal">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal" />
                  Éligible
                </div>
                <p className="text-sm font-semibold">Exemple de résultat</p>
                <p className="mt-1 text-sm text-muted-foreground">Fonctionnaire, 3 ans de poste</p>
              </div>
              <ScoreGauge score={90} size={108} />
            </div>

            <dl className="mt-7 border-t border-border text-sm">
              {EXEMPLE.map((l) => (
                <div
                  key={l.label}
                  className="flex items-baseline justify-between gap-4 border-b border-border py-2.5"
                >
                  <dt className="text-muted-foreground">{l.label}</dt>
                  <dd className={l.points.startsWith("+") ? "font-semibold tabular-nums text-teal" : "font-medium tabular-nums"}>{l.points}</dd>
                </div>
              ))}
              <div className="flex items-baseline justify-between gap-4 pt-3">
                <dt className="font-medium">Score</dt>
                <dd className="font-display text-xl font-semibold tabular-nums text-primary-soft">90 / 100</dd>
              </div>
            </dl>

            <p className="mt-5 rounded-lg border border-primary/15 bg-primary/10 px-4 py-3 text-sm text-accent-foreground">
              Profil solide : le dossier peut être présenté à une banque partenaire.
            </p>
          </div>
        </section>

        <section className="border-y border-border bg-marine/45">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase text-primary-soft">Un parcours simple</p>
              <h2 className="mt-3 text-3xl sm:text-4xl">Comment ça marche</h2>
            </div>
            <ol className="mt-10 grid gap-5 sm:grid-cols-3">
              {ETAPES.map((e, i) => (
                <li key={e.title} className="card-soft step-card min-h-64 p-6 sm:p-7">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">ÉTAPE 0{i + 1}</span>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-lg text-primary-soft">{e.icon}</span>
                  </div>
                  <h3 className="mt-10 text-lg">{e.title}</h3>
                  <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">{e.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
          <div className="grid gap-12 md:grid-cols-[0.72fr_1.28fr] md:gap-16">
            <div className="md:pt-4">
              <p className="text-xs font-semibold uppercase text-teal">Critères bancaires</p>
              <h2 className="mt-3 text-3xl sm:text-4xl">Ce que les banques regardent</h2>
              <p className="mt-5 max-w-sm leading-relaxed text-muted-foreground">
                Le score reprend les critères que les banques vérifient en premier. Vous savez
                ainsi quoi renforcer avant de déposer votre dossier.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {CRITERES.map((c) => (
                <div key={c.title} className="card-soft p-6 sm:p-7">
                  <div className="mb-6 h-10 w-10 rounded-lg border border-primary/20 bg-primary/10" />
                  <h3 className="border-b border-border pb-4 text-lg">{c.title}</h3>
                  <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
                    {c.items.map((it) => (
                      <li key={it} className="flex gap-3">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="gradient-frame relative mt-16 flex min-h-40 flex-col items-start justify-between gap-6 overflow-hidden rounded-2xl px-7 py-8 sm:flex-row sm:items-center sm:px-10">
            <div className="ambient-teal pointer-events-none absolute -right-24 -top-40 h-96 w-96 opacity-60" />
            <div className="relative">
              <p className="font-display text-xl sm:text-2xl">Connaissez votre score avant la banque.</p>
              <p className="mt-2 text-sm text-muted-foreground">Une première lecture claire de votre dossier.</p>
            </div>
            <Link to="/simulation" className="btn-primary relative px-6 py-3 text-sm">
              Commencer ma simulation
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border bg-marine/70 text-muted-foreground">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-10 text-sm sm:flex-row sm:items-center sm:justify-between">
          <Logo height={70} tone="light" className="-ml-2 opacity-80" />
          <p>Mayinvest Conseil, présélection de dossiers de crédit au Congo.</p>
          <p>© {new Date().getFullYear()} Mayinvest</p>
        </div>
      </footer>
    </div>
  );
}
