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
    title: "Vous choisissez votre profil",
    text: "Particulier ou entreprise, puis votre activité : fonctionnaire, commerçant, BTP, transport…",
  },
  {
    title: "Vous décrivez votre situation",
    text: "Revenus, ancienneté, montant et durée souhaités, banque actuelle et garanties.",
  },
  {
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
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main>
        {/* Accueil */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-14 md:grid-cols-[1.15fr_0.85fr] md:pt-20">
          <div>
            <h1 className="max-w-xl text-4xl sm:text-5xl lg:text-[3.6rem]">
              Votre demande de crédit, évaluée avant d'aller à la banque.
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Mayinvest Conseil présélectionne les dossiers de crédit au Congo et vous indique,
              chiffres en main, vos chances réelles d'obtenir un financement.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link to="/simulation" className="btn-primary px-7 py-3.5 text-base">
                Commencer ma simulation
              </Link>
              <span className="text-sm text-muted-foreground">
                2 minutes, particulier ou entreprise
              </span>
            </div>
          </div>

          {/* Fiche exemple : montre comment le score se construit */}
          <div className="card-soft mx-auto w-full max-w-sm p-6 sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Exemple de résultat</p>
                <p className="text-sm text-muted-foreground">Fonctionnaire, 3 ans de poste</p>
              </div>
              <ScoreGauge score={90} size={92} />
            </div>

            <dl className="mt-6 border-t border-border text-sm">
              {EXEMPLE.map((l) => (
                <div
                  key={l.label}
                  className="flex items-baseline justify-between gap-4 border-b border-border py-2.5"
                >
                  <dt className="text-muted-foreground">{l.label}</dt>
                  <dd className="font-medium tabular-nums">{l.points}</dd>
                </div>
              ))}
              <div className="flex items-baseline justify-between gap-4 pt-3">
                <dt className="font-medium">Score</dt>
                <dd className="font-display text-xl font-semibold tabular-nums">90 / 100</dd>
              </div>
            </dl>

            <p className="mt-4 rounded-lg bg-accent px-3.5 py-2.5 text-sm">
              Profil solide : le dossier peut être présenté à une banque partenaire.
            </p>
          </div>
        </section>

        {/* Vague de transition, reprise du logo */}
        <svg
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
          className="block h-12 w-full sm:h-20"
          aria-hidden="true"
        >
          <path
            d="M0 48 C 240 8, 480 8, 720 40 S 1200 80, 1440 30 L1440 80 L0 80 Z"
            className="fill-vague"
            opacity="0.45"
          />
          <path
            d="M0 64 C 260 30, 520 34, 760 56 S 1220 84, 1440 50 L1440 80 L0 80 Z"
            className="fill-marine"
          />
        </svg>

        {/* Comment ça marche */}
        <section className="bg-marine text-white">
          <div className="mx-auto max-w-6xl px-5 pb-20 pt-10 sm:pt-14">
            <h2 className="text-3xl sm:text-4xl">Comment ça marche</h2>
            <ol className="mt-10 grid gap-10 sm:grid-cols-3 sm:gap-8">
              {ETAPES.map((e, i) => (
                <li key={e.title} className="border-t border-white/20 pt-5">
                  <span className="font-display text-3xl text-vague">{i + 1}</span>
                  <h3 className="mt-3 text-lg">{e.title}</h3>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/70">{e.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Critères */}
        <section className="mx-auto max-w-6xl px-5 py-20">
          <div className="grid gap-12 md:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h2 className="text-3xl sm:text-4xl">Ce que les banques regardent</h2>
              <p className="mt-4 max-w-sm text-muted-foreground">
                Le score reprend les critères que les banques vérifient en premier. Vous savez
                ainsi quoi renforcer avant de déposer votre dossier.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {CRITERES.map((c) => (
                <div key={c.title}>
                  <h3 className="border-b border-border pb-3 text-lg">{c.title}</h3>
                  <ul className="mt-3 space-y-2.5 text-sm">
                    {c.items.map((it) => (
                      <li key={it} className="flex gap-3">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16 flex flex-col items-start justify-between gap-5 rounded-2xl bg-accent px-6 py-7 sm:flex-row sm:items-center sm:px-8">
            <p className="font-display text-xl sm:text-2xl">Connaissez votre score avant la banque.</p>
            <Link to="/simulation" className="btn-primary px-6 py-3 text-sm">
              Commencer ma simulation
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-marine text-white/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
          <Logo height={70} tone="dark" className="-ml-2" />
          <p>Mayinvest Conseil, présélection de dossiers de crédit au Congo.</p>
          <p>© {new Date().getFullYear()} Mayinvest</p>
        </div>
      </footer>
    </div>
  );
}
