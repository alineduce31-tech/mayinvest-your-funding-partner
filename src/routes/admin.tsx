import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { STATUSES, setStatus, useStore, type Status } from "@/lib/mayinvest";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Back-office — Mayinvest" },
      {
        name: "description",
        content:
          "Suivi des dossiers de financement Mayinvest : leads, scores, statuts et taux de transformation.",
      },
      { property: "og:title", content: "Back-office — Mayinvest" },
      {
        property: "og:description",
        content: "Pilotage des dossiers présélectionnés par Mayinvest Conseil.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Admin,
});

function Admin() {
  const { leads, session } = useStore();
  const finances = leads.filter((l) => l.statut === "Financé").length;
  const taux = leads.length ? Math.round((finances / leads.length) * 100) : 0;

  if (!session) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <main className="mx-auto max-w-md px-5 py-24 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Accès réservé</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Connectez-vous pour consulter les dossiers.
          </p>
          <Link to="/auth" className="btn-primary mt-6 inline-flex px-6 py-2.5 text-sm">
            Connexion
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-5xl px-5 pb-24 pt-12">
        <h1 className="text-2xl font-semibold tracking-tight">Back-office</h1>
        <p className="mt-2 text-sm text-muted-foreground">Bonjour {session.nom}.</p>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ["Total leads", String(leads.length)],
            ["Financés", String(finances)],
            ["Taux de transformation", `${taux} %`],
          ].map(([label, value]) => (
            <div key={label} className="card-soft p-6">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
            </div>
          ))}
        </section>

        <section className="card-soft mt-8 overflow-x-auto p-2">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-4 py-3 font-normal">Nom</th>
                <th className="px-4 py-3 font-normal">Type</th>
                <th className="px-4 py-3 font-normal">Activité</th>
                <th className="px-4 py-3 font-normal">Montant</th>
                <th className="px-4 py-3 font-normal">Score</th>
                <th className="px-4 py-3 font-normal">Statut</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    Aucun dossier pour l'instant.{" "}
                    <Link to="/simulation" className="text-primary">
                      Lancer une simulation
                    </Link>
                  </td>
                </tr>
              )}
              {leads.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="px-4 py-3">{l.raisonSociale || l.nom || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {l.type === "morale" ? "PME" : "Physique"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{l.activite || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.montant || "—"}</td>
                  <td className="px-4 py-3 font-medium">{l.score}</td>
                  <td className="px-4 py-3">
                    <select
                      className="field py-2"
                      value={l.statut}
                      onChange={(e) => setStatus(l.id, e.target.value as Status)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
