import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import anniversary30 from "@/assets/plenarius-30-anos.png";
import plenariusLogo from "@/assets/logo-plenarios-branca.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login - Plenarius Growth Hub" }] }),
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let active = true;

    fetch("/api/auth/session", { credentials: "same-origin" })
      .then((response) => {
        if (active && response.ok) {
          window.location.replace("/");
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Nao foi possivel entrar.");
      }

      window.location.assign("/");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Nao foi possivel entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-gradient-hero text-primary-foreground md:h-dvh md:min-h-0 md:overflow-hidden">
      <section className="grid min-h-screen w-full md:h-full md:min-h-0 md:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
        <div className="flex min-h-[42vh] flex-col justify-between overflow-hidden p-6 md:h-full md:min-h-0 md:px-8 md:py-7 lg:px-10 lg:py-8">
          <div>
            <img
              src={plenariusLogo}
              alt="Plenarius"
              className="h-20 w-auto object-contain md:h-[min(5rem,10vh)]"
            />
          </div>
          <div className="max-w-xl pb-4 pt-8 md:pb-0 md:pt-6">
            <div className="pointer-events-none -ml-4 -mt-6 mb-6 w-[88vw] max-w-[390px] md:-ml-10 md:-mt-8 md:mb-5 md:w-[min(520px,46vh)] md:max-w-none lg:-ml-12 lg:w-[min(560px,49vh)]">
              <img
                src={anniversary30}
                alt="30 anos Plenarius"
                className="block aspect-square w-full object-cover drop-shadow-[0_30px_52px_rgba(0,0,0,0.28)]"
              />
            </div>
            <div className="relative z-10 mb-4 inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">
              Growth Hub
            </div>
            <h1 className="relative z-10 max-w-lg font-display text-3xl font-bold leading-tight md:text-[clamp(2rem,5vh,3rem)]">
              A educacao profissional
              <br />
              que transforma vidas.
            </h1>
            <p className="relative z-10 mt-4 max-w-lg text-sm leading-6 text-white/70">
              Cada matricula e o inicio
              <br />
              de uma nova historia.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center bg-background/95 p-4 text-foreground backdrop-blur md:p-8">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-elegant md:p-8"
          >
            <div className="mb-7">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">
                Login seguro
              </div>
              <h2 className="mt-2 text-2xl font-bold">Entrar no sistema</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="px-9"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              <Button type="submit" className="h-10 w-full" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
