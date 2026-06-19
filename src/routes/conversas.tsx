import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Check,
  CircleAlert,
  Copy,
  LoaderCircle,
  MessageCircle,
  Phone,
  Plug,
  Power,
  QrCode,
  RefreshCw,
  Search,
  Send,
  Smartphone,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { canViewManagement } from "@/lib/auth-types";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

type InstanceState = {
  id: string;
  name: string;
  status: ConnectionStatus;
  phoneNumber: string | null;
  connectedAt: string | null;
  lastEventAt: string | null;
  webhookUrl: string;
};

type Conversation = {
  remoteJid: string;
  phone: string;
  contactName: string | null;
  lastMessage: string;
  messageType: string;
  direction: "inbound" | "outbound";
  sentAt: string;
  unreadCount: number;
};

type Message = {
  id: string;
  remoteJid: string;
  phone: string;
  contactName: string | null;
  content: string;
  messageType: string;
  direction: "inbound" | "outbound";
  sentAt: string;
};

type EvolutionState = {
  configured: boolean;
  instance: InstanceState | null;
  conversations: Conversation[];
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
  return digits ? `+${digits}` : "Número não identificado";
}

function formatTime(value: string, withDate = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("pt-BR", {
    ...(withDate ? { day: "2-digit", month: "short" } : {}),
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function statusInfo(status: ConnectionStatus | undefined) {
  if (status === "connected") {
    return {
      label: "Conectado",
      icon: Wifi,
      className: "border-success/30 bg-success/10 text-success",
    };
  }
  if (status === "connecting") {
    return {
      label: "Aguardando leitura",
      icon: QrCode,
      className: "border-gold/30 bg-gold/10 text-gold",
    };
  }
  if (status === "error") {
    return {
      label: "Erro",
      icon: CircleAlert,
      className: "border-destructive/30 bg-destructive/10 text-destructive",
    };
  }
  return {
    label: "Desconectado",
    icon: WifiOff,
    className: "border-border bg-muted text-muted-foreground",
  };
}

function Conversas() {
  const { session } = useAuth();
  const [state, setState] = React.useState<EvolutionState | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [working, setWorking] = React.useState(false);
  const [qrCode, setQrCode] = React.useState<string | null>(null);
  const [qrOpen, setQrOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [selectedJid, setSelectedJid] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const canManage = session ? canViewManagement(session.user.role) : false;

  const loadState = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await requestJson<{ ok: true } & EvolutionState>("/api/integrations/evolution");
      setState({
        configured: data.configured,
        instance: data.instance,
        conversations: data.conversations,
      });
      setSelectedJid((current) => current ?? data.conversations[0]?.remoteJid ?? null);
    } catch (error) {
      if (!silent)
        toast.error(error instanceof Error ? error.message : "Falha ao carregar conversas.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const loadMessages = React.useCallback(async (remoteJid: string, silent = false) => {
    if (!silent) setMessagesLoading(true);
    try {
      const data = await requestJson<{ ok: true; messages: Message[] }>(
        `/api/integrations/evolution?remoteJid=${encodeURIComponent(remoteJid)}`,
      );
      setMessages(data.messages);
    } catch (error) {
      if (!silent)
        toast.error(error instanceof Error ? error.message : "Falha ao carregar mensagens.");
    } finally {
      if (!silent) setMessagesLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadState();
  }, [loadState, session?.activeUnit?.id]);

  React.useEffect(() => {
    if (!selectedJid) {
      setMessages([]);
      return;
    }
    void loadMessages(selectedJid);
  }, [loadMessages, selectedJid]);

  React.useEffect(() => {
    const interval = window.setInterval(
      () => {
        void loadState(true);
        if (selectedJid) void loadMessages(selectedJid, true);
      },
      state?.instance?.status === "connecting" ? 3_000 : 10_000,
    );
    return () => window.clearInterval(interval);
  }, [loadMessages, loadState, selectedJid, state?.instance?.status]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        toast.success("WhatsApp conectado.");
        setQrOpen(false);
      } else if (data.qrCode) {
        setQrCode(data.qrCode);
        setQrOpen(true);
      } else {
        toast.info("A instância foi preparada. Atualize o QR Code em alguns segundos.");
      }
      await loadState(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao gerar QR Code.");
    } finally {
      setWorking(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Desconectar este WhatsApp da unidade?")) return;
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

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedJid || !draft.trim()) return;
    const text = draft.trim();
    setDraft("");
    setSending(true);
    try {
      await requestJson("/api/integrations/evolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", remoteJid: selectedJid, text }),
      });
      window.setTimeout(() => void loadMessages(selectedJid, true), 800);
    } catch (error) {
      setDraft(text);
      toast.error(error instanceof Error ? error.message : "Falha ao enviar mensagem.");
    } finally {
      setSending(false);
    }
  };

  const copyWebhook = async () => {
    if (!state?.instance?.webhookUrl) return;
    await navigator.clipboard.writeText(state.instance.webhookUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  };

  const conversations = (state?.conversations ?? []).filter((conversation) => {
    const term = query.trim().toLowerCase();
    return (
      !term ||
      conversation.contactName?.toLowerCase().includes(term) ||
      conversation.phone.includes(term)
    );
  });
  const selected = state?.conversations.find((item) => item.remoteJid === selectedJid) ?? null;
  const status = statusInfo(state?.instance?.status);

  return (
    <div className="min-w-0">
      <PageHeader
        eyebrow="IA Comercial"
        title="Conversas"
        description="WhatsApp da unidade, mensagens recebidas e histórico de atendimento em um só lugar."
        actions={
          canManage ? (
            state?.instance?.status === "connected" ? (
              <Button variant="outline" onClick={handleDisconnect} disabled={working}>
                <Power className="h-4 w-4" />
                Desconectar
              </Button>
            ) : (
              <Button onClick={handleConnect} disabled={working || !state?.configured}>
                {working ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <QrCode className="h-4 w-4" />
                )}
                Gerar QR Code
              </Button>
            )
          ) : null
        }
      />

      <section className="mb-5 border-y bg-card">
        <div className="grid min-h-24 gap-0 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <div className="flex items-center gap-3 px-4 py-4 md:px-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#25D366]/10 text-[#168B45]">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">WhatsApp da unidade</span>
                <Badge variant="outline" className={status.className}>
                  <status.icon className="mr-1 h-3 w-3" />
                  {status.label}
                </Badge>
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {state?.instance?.phoneNumber
                  ? formatPhone(state.instance.phoneNumber)
                  : state?.instance?.name || "Nenhuma linha vinculada"}
              </p>
            </div>
          </div>

          <Separator orientation="vertical" className="hidden h-12 md:block" />

          <div className="flex min-w-0 items-center justify-between gap-4 px-4 py-4 md:px-5">
            <div className="min-w-0">
              <div className="text-xs font-medium text-foreground">Webhook Evolution</div>
              <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                {state?.instance?.webhookUrl || "Será criado automaticamente com a conexão"}
              </p>
            </div>
            {state?.instance?.webhookUrl && (
              <Button
                variant="ghost"
                size="icon"
                onClick={copyWebhook}
                title="Copiar URL do webhook"
              >
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
      </section>

      {!state?.configured && !loading && (
        <div className="mb-5 flex items-start gap-3 border border-destructive/25 bg-destructive/5 p-4 text-sm">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <div className="font-medium">Credenciais da Evolution não encontradas</div>
            <p className="mt-1 text-muted-foreground">
              Configure EVOLUTION_API_URL e EVOLUTION_API_KEY no ambiente do projeto.
            </p>
          </div>
        </div>
      )}

      <section className="grid min-h-[620px] overflow-hidden border bg-card lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="border-b lg:border-b-0 lg:border-r">
          <div className="border-b p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar nome ou telefone"
                className="pl-9"
              />
            </div>
          </div>

          <ScrollArea className="h-[260px] lg:h-[558px]">
            {loading ? (
              <div className="space-y-3 p-3">
                {[0, 1, 2, 3].map((item) => (
                  <Skeleton key={item} className="h-16 w-full" />
                ))}
              </div>
            ) : conversations.length ? (
              <div>
                {conversations.map((conversation) => {
                  const active = selectedJid === conversation.remoteJid;
                  return (
                    <button
                      key={conversation.remoteJid}
                      type="button"
                      onClick={() => setSelectedJid(conversation.remoteJid)}
                      className={cn(
                        "flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-muted/50",
                        active && "bg-primary/5 shadow-[inset_3px_0_0_hsl(var(--primary))]",
                      )}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground">
                        {(
                          conversation.contactName?.[0] ||
                          conversation.phone.slice(-2, -1) ||
                          "?"
                        ).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium">
                            {conversation.contactName || formatPhone(conversation.phone)}
                          </span>
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {formatTime(conversation.sentAt, true)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                            {conversation.direction === "outbound" ? "Você: " : ""}
                            {conversation.lastMessage}
                          </p>
                          {conversation.unreadCount > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#25D366] px-1 text-[10px] font-bold text-white">
                              {conversation.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center px-6 text-center">
                <MessageCircle className="h-8 w-8 text-muted-foreground/40" />
                <p className="mt-3 text-sm font-medium">Nenhuma conversa recebida</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  As mensagens aparecerão aqui após a leitura do QR Code.
                </p>
              </div>
            )}
          </ScrollArea>
        </aside>

        <div className="flex min-w-0 flex-col">
          {selected ? (
            <>
              <header className="flex h-16 items-center justify-between border-b px-4">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">
                    {selected.contactName || formatPhone(selected.phone)}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {formatPhone(selected.phone)}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void loadMessages(selected.remoteJid)}
                  title="Atualizar mensagens"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </header>

              <ScrollArea className="h-[470px] flex-1 bg-muted/20">
                <div className="mx-auto flex max-w-4xl flex-col gap-2 p-4 md:p-6">
                  {messagesLoading ? (
                    <div className="flex justify-center py-16">
                      <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "max-w-[82%] rounded-md px-3 py-2 text-sm shadow-sm",
                          message.direction === "outbound"
                            ? "ml-auto bg-[#D9FDD3] text-slate-900"
                            : "mr-auto border bg-background",
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        <div className="mt-1 text-right text-[10px] opacity-60">
                          {formatTime(message.sentAt)}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <form onSubmit={handleSend} className="flex items-center gap-2 border-t p-3">
                <Input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Digite uma mensagem"
                  disabled={state?.instance?.status !== "connected" || sending}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!draft.trim() || sending || state?.instance?.status !== "connected"}
                  title="Enviar mensagem"
                >
                  {sending ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </>
          ) : (
            <div className="flex min-h-[500px] flex-1 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MessageCircle className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-base font-semibold">Conversas da unidade</h2>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Conecte a linha e selecione uma conversa para acompanhar as mensagens do WhatsApp.
              </p>
              {canManage && state?.instance?.status !== "connected" && (
                <Button
                  className="mt-5"
                  onClick={handleConnect}
                  disabled={working || !state?.configured}
                >
                  <Plug className="h-4 w-4" />
                  Conectar WhatsApp
                </Button>
              )}
            </div>
          )}
        </div>
      </section>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
            <DialogDescription>
              No celular, abra Aparelhos conectados e leia o código abaixo.
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
              A tela atualiza automaticamente assim que a Evolution confirmar a conexão.
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
