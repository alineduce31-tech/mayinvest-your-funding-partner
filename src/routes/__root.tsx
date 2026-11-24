import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

const MI_GREEN = "#0F6E3E";
const MI_GREEN_DARK = "#0A4E2C";
const MI_GREEN_SOFT = "#E6F2EB";
const MI_GOLD = "#B4871F";
const MI_GOLD_SOFT = "#FBF2DC";

function NotFoundComponent() {
  const QUICK_LINKS: { to: string; name: string; sub: string; icon: ReactNode }[] = [
    {
      to: "/preselection",
      name: "Préselection",
      sub: "Évaluer mon dossier",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      ),
    },
    {
      to: "/mon-dossier",
      name: "Mon dossier",
      sub: "Suivre ma demande",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      ),
    },
    {
      to: "/mon-espace",
      name: "Mon espace",
      sub: "Connexion commercial",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      ),
    },
    {
      to: "/rejoindre-equipe",
      name: "Rejoindre l'équipe",
      sub: "Postuler comme commercial",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87"/>
          <path d="M16 3.13a4 4 0 010 7.75"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="mi-404-wrap">
      <style>{`
        .mi-404-wrap {
          min-height: 100vh;
          background: #FAFAF8;
          color: #0F1729;
          font-family: 'Inter', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          display: flex;
          flex-direction: column;
        }
        .mi-404-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 24px;
          border-bottom: 1px solid #F3F3F1;
          background: rgba(255,255,255,0.88);
          backdrop-filter: saturate(180%) blur(14px);
        }
        .mi-404-logo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-size: 15px;
          font-weight: 800;
          color: #0F1729;
          letter-spacing: -0.01em;
          text-decoration: none;
        }
        .mi-404-logo-mark {
          width: 28px; height: 28px;
          border-radius: 8px;
          background: ${MI_GREEN};
          color: white;
          display: inline-flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 13px;
        }
        .mi-404-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 24px 60px;
        }
        .mi-404-head {
          text-align: center;
          max-width: 480px;
          margin-bottom: 28px;
        }
        .mi-404-badge {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 14px;
          background: ${MI_GOLD_SOFT};
          color: ${MI_GOLD};
          border-radius: 999px;
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase;
          margin-bottom: 14px;
        }
        .mi-404-big {
          display: flex; align-items: baseline; justify-content: center; gap: 2px;
          margin: 0 0 14px;
          line-height: 1;
        }
        .mi-404-big .n {
          font-size: 72px;
          font-weight: 900;
          color: #0F1729;
          letter-spacing: -0.04em;
          font-variant-numeric: tabular-nums;
        }
        .mi-404-big .n.mid {
          color: ${MI_GREEN};
          position: relative;
        }
        .mi-404-big .n.mid::after {
          content: '';
          position: absolute;
          left: 10%; right: 10%; bottom: 10px;
          height: 8px;
          background: ${MI_GREEN_SOFT};
          z-index: -1;
          border-radius: 2px;
        }
        .mi-404-title {
          font-size: 20px; font-weight: 800;
          color: #0F1729;
          margin: 0 0 8px;
          letter-spacing: -0.02em;
        }
        .mi-404-sub {
          font-size: 14px;
          color: #6B7280;
          line-height: 1.55;
          margin: 0;
        }

        .mi-404-links-title {
          font-size: 10px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: #9CA3AF;
          margin: 0 0 14px;
          text-align: center;
        }
        .mi-404-links {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          width: 100%;
          max-width: 460px;
          margin-bottom: 24px;
        }
        @media (max-width: 480px) {
          .mi-404-links { grid-template-columns: 1fr; }
          .mi-404-big .n { font-size: 56px; }
        }
        .mi-404-link {
          background: #FFFFFF;
          border: 1px solid #ECECEA;
          border-radius: 12px;
          padding: 14px;
          display: flex; align-items: center; gap: 12px;
          text-decoration: none;
          color: #0F1729;
          cursor: pointer;
          transition: all 0.15s;
          box-shadow: 0 1px 2px rgba(17, 24, 39, 0.03);
        }
        .mi-404-link:hover {
          border-color: ${MI_GREEN};
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(15,110,62,0.1);
        }
        .mi-404-link-ic {
          width: 34px; height: 34px;
          border-radius: 9px;
          background: ${MI_GREEN_SOFT};
          color: ${MI_GREEN};
          display: inline-flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .mi-404-link-text { flex: 1; min-width: 0; }
        .mi-404-link-name {
          font-size: 13px; font-weight: 700;
          color: #0F1729;
        }
        .mi-404-link-sub {
          font-size: 11px;
          color: #6B7280;
          margin-top: 2px;
        }

        .mi-404-home {
          width: 100%;
          max-width: 460px;
          padding: 14px 20px;
          border-radius: 999px;
          border: none;
          font-size: 14px; font-weight: 700;
          cursor: pointer;
          display: flex; align-items: center; gap: 12px;
          text-align: left;
          font-family: inherit;
          transition: all 0.15s;
          background: ${MI_GREEN};
          color: white;
          box-shadow: 0 6px 18px rgba(15,110,62,0.25);
          text-decoration: none;
        }
        .mi-404-home:hover {
          background: ${MI_GREEN_DARK};
          transform: translateY(-1px);
          box-shadow: 0 8px 22px rgba(15,110,62,0.32);
        }
        .mi-404-home-ic,
        .mi-404-home-ar {
          width: 24px; height: 24px;
          border-radius: 50%;
          background: rgba(255,255,255,0.18);
          display: inline-flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .mi-404-home-tx { flex: 1; }
      `}</style>

      <header className="mi-404-top">
        <Link to="/" className="mi-404-logo">
          <span className="mi-404-logo-mark">M</span>
          Mayinvest
        </Link>
      </header>

      <div className="mi-404-body">
        <div className="mi-404-head">
          <div className="mi-404-badge">Erreur 404</div>
          <div className="mi-404-big">
            <span className="n">4</span>
            <span className="n mid">0</span>
            <span className="n">4</span>
          </div>
          <h1 className="mi-404-title">Cette page n'existe pas</h1>
          <p className="mi-404-sub">
            Peut-être que l'adresse est incorrecte ou que la page a été déplacée. Voici où vous vouliez peut-être aller :
          </p>
        </div>

        <h3 className="mi-404-links-title">Accès rapides</h3>
        <div className="mi-404-links">
          {QUICK_LINKS.map(l => (
            <Link key={l.to} to={l.to as any} className="mi-404-link">
              <span className="mi-404-link-ic">{l.icon}</span>
              <span className="mi-404-link-text">
                <span className="mi-404-link-name" style={{ display: "block" }}>{l.name}</span>
                <span className="mi-404-link-sub" style={{ display: "block" }}>{l.sub}</span>
              </span>
            </Link>
          ))}
        </div>

        <Link to="/" className="mi-404-home">
          <span className="mi-404-home-ic">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </span>
          <span className="mi-404-home-tx">Retour à l'accueil</span>
          <span className="mi-404-home-ar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </span>
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" },
      { title: "Mayinvest PréSelect — Votre crédit évalué avant la banque" },
      { name: "description", content: "Remplissez notre formulaire de présélection en 2 minutes et recevez immédiatement votre score d'éligibilité au crédit. Un conseiller Mayinvest vous rappelle sous 24h. Service gratuit au Congo." },
      { name: "author", content: "Mayinvest" },
      { name: "theme-color", content: "#0D1B3E" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { property: "og:title", content: "Mayinvest PréSelect — Votre crédit évalué avant la banque" },
      { property: "og:description", content: "Votre score d'éligibilité au crédit en 2 minutes. Gratuit. Un conseiller vous rappelle sous 24h." },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "fr_FR" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent as never,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
        {/* Styles globaux Mayinvest — s'appliquent sur mobile, tablette ET desktop */}
        <style dangerouslySetInnerHTML={{ __html: `
          /* ============================================
             RESET GLOBAL
             IMPORTANT: on utilise overflow-x: clip au lieu de hidden
             car "hidden" casse position: sticky (crée un conteneur de scroll).
             "clip" fait pareil visuellement mais préserve le sticky.
             ============================================ */
          html, body {
            margin: 0;
            padding: 0;
            max-width: 100%;
            overflow-x: clip;
            -webkit-text-size-adjust: 100%;
          }
          body {
            padding-top: env(safe-area-inset-top, 0);
            padding-bottom: env(safe-area-inset-bottom, 0);
          }

          /* ============================================
             ANTI-ZOOM (mobile + tablette + desktop)
             16px partout empêche iOS/iPadOS Safari de zoomer à la saisie
             ============================================ */
          input, select, textarea {
            font-size: 16px !important;
          }

          /* Pas de double-tap zoom sur boutons/liens */
          button, a {
            touch-action: manipulation;
          }

          /* ============================================
             HEADER STICKY GLOBAL
             Toutes les pages (index, preselection, mon-espace…)
             Toutes les tailles d'écran (mobile + tablette + desktop)
             ============================================ */
          .nav, .top {
            position: -webkit-sticky !important;
            position: sticky !important;
            top: 0 !important;
            z-index: 100 !important;
            background: rgba(255, 255, 255, 0.88) !important;
            backdrop-filter: saturate(180%) blur(14px);
            -webkit-backdrop-filter: saturate(180%) blur(14px);
            box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04), 0 4px 20px rgba(13, 27, 62, 0.04);
          }

          /* Garantit que le wrapper direct du nav n'est pas en overflow */
          /* (sécurité au cas où une page aurait un wrapper avec un overflow) */
          .nav, .top { will-change: transform; }
        ` }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
