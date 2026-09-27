import { Link, useNavigate } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { signOut, useStore } from "@/lib/mayinvest";

export function Header() {
  const { session } = useStore();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5">
        <Link to="/" aria-label="Mayinvest, accueil" className="-ml-2">
          <Logo height={66} tone="dark" />
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            to="/simulation"
            className="hidden px-3 py-2 text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            Simulation
          </Link>
          {session ? (
            <>
              <Link to="/admin" className="btn-ghost px-4 py-2">
                Back-office
              </Link>
              <button
                className="btn-ghost px-4 py-2"
                onClick={() => {
                  signOut();
                  navigate({ to: "/" });
                }}
              >
                Déconnexion
              </button>
            </>
          ) : (
            <Link to="/auth" className="btn-primary px-5 py-2">
              Espace agents
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
