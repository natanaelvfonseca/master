import * as React from "react";
import {
  Outlet,
  Link,
  createRootRoute,
  HeadContent,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { PremiumBlockedPopup } from "@/components/layout/PremiumBlockedPopup";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/lib/auth";
import { isDevRole } from "@/lib/auth-types";
import { setDeferredInstallPrompt, type BeforeInstallPromptEvent } from "@/lib/pwa-install";

const MARKETING_ALLOWED_PATHS = [
  "/crm",
  "/bi",
  "/branding",
  "/gestao/cadastro",
  "/meta-ads",
  "/treinamentos",
  "/feedback",
  "/usuarios",
  "/unidades",
  "/perfil",
];
const MARKETING_FALLBACK_PATH = "/";

function isMarketingPathAllowed(path: string) {
  return (
    path === "/" ||
    MARKETING_ALLOWED_PATHS.some(
      (allowedPath) => path === allowedPath || path.startsWith(`${allowedPath}/`),
    )
  );
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">Esta página não existe ou foi movida.</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#C2410C" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Master CRM" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { title: "Master CRM — CRM e Inteligência Comercial" },
      {
        name: "description",
        content:
          "Hub de crescimento para escolas profissionalizantes: CRM, IA, métricas e automação para vender mais matrículas e reduzir no-show.",
      },
      { property: "og:title", content: "Master CRM" },
      { property: "og:description", content: "CRM, BI e IA para escolas profissionalizantes." },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-master-192.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/icon-master-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const path = useRouterState({ select: (r) => r.location.pathname });

  React.useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => registration.update())
        .catch(() => undefined);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => setDeferredInstallPrompt(null);

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (path === "/login") {
    return (
      <>
        <Outlet />
        <Toaster />
      </>
    );
  }

  return (
    <AuthProvider>
      <AuthenticatedShell />
    </AuthProvider>
  );
}

function AuthenticatedShell() {
  const { loading, session } = useAuth();
  const path = useRouterState({ select: (state) => state.location.pathname });
  const [systemLocked, setSystemLocked] = React.useState(false);

  React.useEffect(() => {
    if (!loading && !session) {
      window.location.replace("/login");
    }
  }, [loading, session]);

  React.useEffect(() => {
    if (!loading && session?.user.role === "MARKETING" && !isMarketingPathAllowed(path)) {
      window.location.replace(MARKETING_FALLBACK_PATH);
    }
  }, [loading, path, session]);

  React.useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;

    fetch("/api/system-settings", {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { settings?: { systemLocked?: boolean } } | null) => {
        if (!cancelled) {
          setSystemLocked(Boolean(data?.settings?.systemLocked));
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [session]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (session.user.role === "MARKETING" && !isMarketingPathAllowed(path)) {
    return null;
  }

  const showSystemLockedPopup = systemLocked && !isDevRole(session.user.role);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 px-4 pb-4 pt-20 md:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
      {showSystemLockedPopup ? <PremiumBlockedPopup /> : null}
      <Toaster />
    </SidebarProvider>
  );
}
