import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
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

const FEATURES = [
  {
    title: "Physique ou PME",
    text: "Un parcours adapté aux particuliers comme aux entreprises congolaises.",
  },
  {
    title: "Dossier sur mesure",
    text: "Les bons justificatifs, dans le bon ordre, pour la bonne banque.",
  },
  {
    title: "Score en temps réel",
    text: "Votre bancabilité calculée dès la dernière étape du formulaire.",
  },
];

function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-5xl px-5 pb-24 pt-16">
        <section className="grid items-center gap-12 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Qualifiez vos demandes de financement en 2 minutes.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Mayinvest Conseil présélectionne les dossiers de crédit au Congo et vous indique,
              chiffres en main, vos chances réelles d'obtenir un financement.
            </p>
            <Link
              to="/simulation"
              className="btn-primary mt-8 inline-flex px-7 py-3 text-sm sm:text-base"
            >
              Commencer ma simulation
            </Link>
          </div>

          <div className="card-soft mx-auto flex w-full max-w-xs flex-col items-center gap-4 p-8">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              Score de bancabilité
            </span>
            <ScoreGauge score={78} size={170} />
            <p className="text-center text-sm text-muted-foreground">
              Bon profil — dossier présentable auprès de deux banques partenaires.
            </p>
          </div>
        </section>

        <section className="mt-20 grid gap-5 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card-soft p-6">
              <h3 className="text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
