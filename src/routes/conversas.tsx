import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CircleAlert, LoaderCircle, Power, QrCode, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import plenaImage from "@/assets/plena-ia.png";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

type InstanceState = {
  id: string;
  name: string;
  status: ConnectionStatus;
  phoneNumber: string | null;
  connectedAt: string | null;
  lastEventAt: string | null;
};

type EvolutionState = {
  configured: boolean;
  instance: InstanceState | null;
};

export const Route = createFileRoute("/conversas")({
  head: () => ({ meta: [{ title: "Conversas IA | Planarius" }] }),
  component: Conversas,
});

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    credentials: "same-origin",
    headers: { Accept: "application/json", ...init?.headers },
    ...init,
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Não foi possível concluir a operação.");
  return data;
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("55")) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 12 && digits.startsWith("55")) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  }
  return digits ? `+${digits}` : "WhatsApp conectado";
}

function statusInfo(status: ConnectionStatus | undefined) {
  if (status === "connected") {
    return {
      label: "WhatsApp conectado",
      icon: Wifi,
      className: "border-emerald-300/30 bg-emerald-400/15 text-emerald-100",
    };
  }
  if (status === "connecting") {
    return {
      label: "Aguardando leitura do QR Code",
      icon: QrCode,
      className: "border-amber-300/30 bg-amber-300/15 text-amber-100",
    };
  }
  if (status === "error") {
    return {
      label: "Falha na conexão",
      icon: CircleAlert,
      className: "border-red-300/30 bg-red-400/15 text-red-100",
    };
  }
  return {
    label: "WhatsApp desconectado",
    icon: WifiOff,
    className: "border-white/20 bg-white/10 text-white/80",
  };
}

function Conversas() {
  const { session } = useAuth();
  const [state, setState] = React.useState<EvolutionState | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [working, setWorking] = React.useState(false);
  const [qrCode, setQrCode] = React.useState<string | null>(null);
  const [qrOpen, setQrOpen] = React.useState(false);

  const loadState = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await requestJson<{ ok: true } & EvolutionState>("/api/integrations/evolution");
      setState({ configured: data.configured, instance: data.instance });

      if (data.instance?.status === "connected") {
        setQrCode(null);
        setQrOpen(false);
      }
    } catch (error) {
      if (!silent) {
        toast.error(error instanceof Error ? error.message : "Falha ao verificar a conexão.");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadState();
  }, [loadState, session?.activeUnit?.id, session?.user.id]);

  React.useEffect(() => {
    const interval = window.setInterval(
      () => void loadState(true),
      state?.instance?.status === "connecting" || qrOpen ? 2_500 : 12_000,
    );
    return () => window.clearInterval(interval);
  }, [loadState, qrOpen, state?.instance?.status]);

  const handleConnect = async () => {
    setWorking(true);
    try {
      const data = await requestJson<{ ok: true; status: ConnectionStatus; qrCode: string | null }>(
        "/api/integrations/evolution",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "connect" }),
        },
      );

      if (data.status === "connected") {
        setQrCode(null);
        setQrOpen(false);
        toast.success("WhatsApp conectado.");
      } else if (data.qrCode) {
        setQrCode(data.qrCode);
        setQrOpen(true);
      } else {
        toast.info("A conexão está sendo preparada. Tente atualizar o QR Code.");
      }

      await loadState(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao gerar QR Code.");
    } finally {
      setWorking(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Desconectar seu WhatsApp da Plena?")) return;
    setWorking(true);
    try {
      await requestJson("/api/integrations/evolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect" }),
      });
      setQrCode(null);
      setQrOpen(false);
      await loadState(true);
      toast.success("WhatsApp desconectado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao desconectar.");
    } finally {
      setWorking(false);
    }
  };

  const connected = state?.instance?.status === "connected";
  const status = statusInfo(state?.instance?.status);
  const StatusIcon = status.icon;
  const firstName = session?.user.name.split(/\s+/)[0] || "Olá";

  return (
    <div className="min-w-0">
      <PageHeader
        eyebrow="IA Comercial"
        title="Conversas IA"
        description="Conecte seu WhatsApp para a Plena acompanhar seus atendimentos e apoiar sua evolução comercial."
      />

      {!state?.configured && !loading && (
        <div className="mb-5 flex items-start gap-3 border border-destructive/25 bg-destructive/5 p-4 text-sm">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <div className="font-medium">Integração indisponível</div>
            <p className="mt-1 text-muted-foreground">
              As credenciais da Evolution ainda não estão configuradas.
            </p>
          </div>
        </div>
      )}

      <section className="relative min-h-[620px] overflow-hidden rounded-md bg-[#0B2A6F] text-white shadow-[0_24px_70px_rgba(11,42,111,0.22)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(63,115,216,0.45),transparent_34%),linear-gradient(125deg,#0B2A6F_0%,#0B2A6F_54%,#061B49_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-white/15" />

        <div className="relative grid min-h-[620px] items-end lg:grid-cols-[minmax(320px,0.9fr)_minmax(420px,1.1fr)]">
          <div className="relative order-2 flex h-[430px] items-end justify-center lg:order-1 lg:h-[620px]">
            <img
              src={plenaImage}
              alt="Plena, assistente comercial da Plenarius"
              className="h-full w-auto max-w-none object-contain object-bottom drop-shadow-[0_25px_35px_rgba(0,0,0,0.3)]"
            />
          </div>

          <div className="order-1 flex items-center px-5 pb-2 pt-8 sm:px-10 lg:order-2 lg:px-14 lg:py-14">
            <div className="relative w-full max-w-xl rounded-md border border-white/20 bg-white p-6 text-[#10234D] shadow-[0_24px_55px_rgba(0,0,0,0.22)] sm:p-8">
              <div className="absolute -bottom-4 left-14 h-8 w-8 rotate-45 border-b border-r border-white/20 bg-white lg:-left-4 lg:bottom-auto lg:top-24" />

              {loading ? (
                <div className="flex min-h-64 items-center justify-center">
                  <LoaderCircle className="h-6 w-6 animate-spin text-[#1746B8]" />
                </div>
              ) : (
                <>
                  <Badge variant="outline" className={status.className}>
                    <StatusIcon className="mr-1.5 h-3.5 w-3.5" />
                    {status.label}
                  </Badge>

                  <h2 className="mt-6 text-2xl font-bold tracking-normal sm:text-3xl">
                    {connected
                      ? `${firstName}, estou analisando suas conversas.`
                      : `${firstName}, vamos conectar seu WhatsApp?`}
                  </h2>

                  <p className="mt-4 max-w-md text-sm leading-6 text-slate-600 sm:text-base">
                    {connected
                      ? "Vou acompanhar seus atendimentos para identificar oportunidades e ajudar você a vender mais."
                      : "Leia o QR Code com seu celular. A conexão é individual e fica vinculada somente ao seu usuário."}
                  </p>

                  {connected && state?.instance?.phoneNumber && (
                    <div className="mt-5 text-sm font-semibold text-[#1746B8]">
                      {formatPhone(state.instance.phoneNumber)}
                    </div>
                  )}

                  <div className="mt-7 flex flex-wrap gap-3">
                    {connected ? (
                      <Button
                        variant="outline"
                        onClick={handleDisconnect}
                        disabled={working}
                        className="border-slate-300 text-slate-700"
                      >
                        {working ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                        Desconectar
                      </Button>
                    ) : (
                      <Button
                        onClick={handleConnect}
                        disabled={working || !state?.configured}
                        className="bg-[#1746B8] text-white hover:bg-[#0B2A6F]"
                      >
                        {working ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <QrCode className="h-4 w-4" />
                        )}
                        Conectar WhatsApp
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <Dialog open={qrOpen && !connected} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Conectar seu WhatsApp</DialogTitle>
            <DialogDescription>
              No celular, abra WhatsApp, Aparelhos conectados e leia o código.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-3">
            {qrCode ? (
              <img
                src={qrCode}
                alt="QR Code para conectar o WhatsApp"
                className="aspect-square w-64 max-w-full border bg-white p-2"
              />
            ) : (
              <div className="flex aspect-square w-64 max-w-full items-center justify-center border bg-muted">
                <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            <p className="mt-4 text-center text-xs text-muted-foreground">
              O QR Code desaparecerá automaticamente quando a conexão for confirmada.
            </p>
            <Button variant="outline" className="mt-4" onClick={handleConnect} disabled={working}>
              {working ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Atualizar QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
