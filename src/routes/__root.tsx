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

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
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
