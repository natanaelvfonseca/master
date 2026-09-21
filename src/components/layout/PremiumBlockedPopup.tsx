import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";

const CONTACT_URL =
  "https://wa.me/5547991935149?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20o%20acesso%20ao%20sistema.";

export function PremiumBlockedPopup() {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="access-unavailable-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-border/80 bg-white p-6 text-center shadow-elegant sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <LockKeyhole className="h-6 w-6" />
        </div>
        <h2 id="access-unavailable-title" className="mt-4 text-xl font-bold text-foreground sm:text-2xl">
          Acesso temporariamente indisponível
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Identificamos uma pendência relacionada à disponibilidade deste ambiente.
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Entre em contato com nosso atendimento para verificar a situação e restabelecer o acesso.
        </p>
        <Button asChild className="mt-6 w-full bg-gradient-primary text-primary-foreground">
          <a href={CONTACT_URL} target="_blank" rel="noreferrer">
            Entrar em contato
          </a>
        </Button>
      </div>
    </div>
  );
}
