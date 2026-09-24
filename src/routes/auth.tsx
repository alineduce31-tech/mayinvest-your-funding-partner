import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { signIn } from "@/lib/mayinvest";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — Mayinvest" },
      {
        name: "description",
        content: "Connectez-vous à Mayinvest avec votre numéro de téléphone et votre mot de passe.",
      },
      { property: "og:title", content: "Connexion — Mayinvest" },
      {
        property: "og:description",
        content: "Accès agents Mayinvest Conseil : téléphone et mot de passe.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Auth,
});

function Auth() {
  const [mode, setMode] = useState<"connexion" | "inscription">("connexion");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const navigate = useNavigate();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (telephone.replace(/\D/g, "").length < 6 || motDePasse.length < 4) {
      setErreur("Numéro de téléphone ou mot de passe incomplet.");
      return;
    }
    if (mode === "inscription" && nom.trim().length < 2) {
      setErreur("Indiquez votre nom complet.");
      return;
    }
    setErreur("");
    signIn({ nom: nom.trim() || "Agent Mayinvest", telephone });
    navigate({ to: "/admin" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center">
          <Logo width={165} />
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">
            {mode === "connexion" ? "Connexion" : "Créer un compte"}
          </h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Espace agents Mayinvest Conseil
          </p>
        </div>

        <div className="mt-8 flex pill border border-border p-1 text-sm">
          {(["connexion", "inscription"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setErreur("");
              }}
              className={`pill flex-1 py-2 capitalize transition-colors ${
                mode === m
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="card-soft mt-5 space-y-4 p-6">
          {mode === "inscription" && (
            <label className="block text-sm">
              <span className="text-muted-foreground">Nom complet</span>
              <input
                className="field mt-1.5"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Jean Makaya"
              />
            </label>
          )}
          <label className="block text-sm">
            <span className="text-muted-foreground">Numéro de téléphone</span>
            <input
              className="field mt-1.5"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="+242 06 000 00 00"
              inputMode="tel"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Mot de passe</span>
            <input
              className="field mt-1.5"
              type="password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
            />
          </label>

          {erreur && <p className="text-sm text-destructive">{erreur}</p>}

          <button type="submit" className="btn-primary w-full py-3 text-sm">
            {mode === "connexion" ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Les comptes ne sont pas encore enregistrés durablement : la base de données reste à
          activer.
        </p>
      </div>
    </div>
  );
}
