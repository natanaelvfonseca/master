import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bot,
  Building2,
  FileText,
  Image as ImageIcon,
  Inbox,
  LoaderCircle,
  MessageCircle,
  Music,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  Video,
  Wifi,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  AttendanceConsultant,
  AttendanceConversation,
  AttendanceMessage,
  AttendanceMessageType,
} from "@/lib/attendance-types";
import { useAuth } from "@/lib/auth";
import { canViewAttendances, getInitials } from "@/lib/auth-types";
import { cn } from "@/lib/utils";

type ConsultantsResponse = {
  ok: true;
  consultants: Array<AttendanceConsultant>;
};

type ConversationsResponse = {
  ok: true;
  consultant: AttendanceConsultant;
  conversations: Array<AttendanceConversation>;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
    total: number;
  };
};

type MessagesResponse = {
  ok: true;
  consultant: AttendanceConsultant;
  messages: Array<AttendanceMessage>;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
    total: number;
  };
};

const CONVERSATION_PAGE_SIZE = 30;
const MESSAGE_PAGE_SIZE = 40;
const ATTENDANCE_ALL_UNITS = "__all__";

const messageTypeLabels: Record<AttendanceMessageType, string> = {
  text: "Texto",
  image: "Imagem",
  audio: "Áudio",
  document: "Documento",
  video: "Vídeo",
  unknown: "Mensagem",
};

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export const Route = createFileRoute("/atendimentos")({
  head: () => ({ meta: [{ title: "Atendimentos | Planarius" }] }),
  component: AtendimentosPage,
});

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    credentials: "same-origin",
    headers: { Accept: "application/json", ...init?.headers },
    ...init,
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error || "Não foi possível concluir a operação.");
  }

  return data;
}

function buildUrl(path: string, params: Record<string, string | number | null | undefined>) {
  const url = new URL(path, window.location.origin);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return `${url.pathname}${url.search}`;
}

function formatDate(value: string | null, mode: "time" | "dateTime" = "dateTime") {
  if (!value) {
    return "Sem registro";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sem registro";
  }

  return mode === "time" ? timeFormatter.format(date) : dateTimeFormatter.format(date);
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 13 && digits.startsWith("55")) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }

  if (digits.length === 12 && digits.startsWith("55")) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  }

  return digits ? `+${digits}` : phone;
}

function statusLabel(status: AttendanceConsultant["status"]) {
  return status === "connected" ? "Online" : "Offline";
}

function statusClassName(status: AttendanceConsultant["status"]) {
  return status === "connected"
    ? "border-emerald-300/40 bg-emerald-500/10 text-emerald-700"
    : "border-slate-300 bg-slate-100 text-slate-600";
}

function typeIcon(type: AttendanceMessageType) {
  if (type === "image") return ImageIcon;
  if (type === "audio") return Music;
  if (type === "video") return Video;
  if (type === "document") return FileText;
  return MessageCircle;
}

function AtendimentosPage() {
  const { session } = useAuth();
  const canAccess = session ? canViewAttendances(session.user.role) : false;
  const canUseUnitFilter = session?.user.role === "MASTER" || session?.user.role === "CEO";
  const [unitFilter, setUnitFilter] = React.useState(ATTENDANCE_ALL_UNITS);
  const [consultants, setConsultants] = React.useState<Array<AttendanceConsultant>>([]);
  const [loadingConsultants, setLoadingConsultants] = React.useState(true);
  const [selectedConsultantId, setSelectedConsultantId] = React.useState<string | null>(null);
  const [conversations, setConversations] = React.useState<Array<AttendanceConversation>>([]);
  const [conversationSearch, setConversationSearch] = React.useState("");
  const [loadingConversations, setLoadingConversations] = React.useState(false);
  const [loadingMoreConversations, setLoadingMoreConversations] = React.useState(false);
  const [conversationHasMore, setConversationHasMore] = React.useState(false);
  const [selectedConversation, setSelectedConversation] =
    React.useState<AttendanceConversation | null>(null);
  const [messages, setMessages] = React.useState<Array<AttendanceMessage>>([]);
  const [loadingMessages, setLoadingMessages] = React.useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = React.useState(false);
  const [messageHasMore, setMessageHasMore] = React.useState(false);
  const conversationCountRef = React.useRef(0);
  const messageCountRef = React.useRef(0);

  const selectedConsultant =
    consultants.find((consultant) => consultant.id === selectedConsultantId) ?? null;

  React.useEffect(() => {
    conversationCountRef.current = conversations.length;
  }, [conversations.length]);

  React.useEffect(() => {
    messageCountRef.current = messages.length;
  }, [messages.length]);

  const loadConsultants = React.useCallback(
    async (silent = false) => {
      if (!session || !canAccess) {
        setLoadingConsultants(false);
        return;
      }

      if (!silent) {
        setLoadingConsultants(true);
      }

      try {
        const data = await requestJson<ConsultantsResponse>(
          buildUrl("/api/atendimentos/consultores", {
            unitId: canUseUnitFilter ? unitFilter : undefined,
          }),
        );

        setConsultants(data.consultants);
        setSelectedConsultantId((current) => {
          if (current && data.consultants.some((consultant) => consultant.id === current)) {
            return current;
          }

          return null;
        });
      } catch (error) {
        if (!silent) {
          toast.error(error instanceof Error ? error.message : "Falha ao carregar consultores.");
        }
      } finally {
        if (!silent) {
          setLoadingConsultants(false);
        }
      }
    },
    [canAccess, canUseUnitFilter, session, unitFilter],
  );

  const loadConversations = React.useCallback(
    async (options?: { reset?: boolean; silent?: boolean }) => {
      if (!selectedConsultantId) {
        setConversations([]);
        setConversationHasMore(false);
        return;
      }

      const reset = options?.reset ?? false;
      const offset = reset ? 0 : conversationCountRef.current;

      if (reset && !options?.silent) {
        setLoadingConversations(true);
      } else if (!reset) {
        setLoadingMoreConversations(true);
      }

      try {
        const data = await requestJson<ConversationsResponse>(
          buildUrl("/api/atendimentos/conversas", {
            consultantId: selectedConsultantId,
            unitId: canUseUnitFilter ? unitFilter : undefined,
            search: conversationSearch,
            limit: CONVERSATION_PAGE_SIZE,
            offset,
          }),
        );

        setConversations((current) => {
          const next = reset ? data.conversations : [...current, ...data.conversations];
          const map = new Map<string, AttendanceConversation>();

          next.forEach((conversation) => {
            map.set(conversation.remoteJid, conversation);
          });

          return Array.from(map.values());
        });
        setConversationHasMore(data.pagination.hasMore);
      } catch (error) {
        if (!options?.silent) {
          toast.error(error instanceof Error ? error.message : "Falha ao carregar conversas.");
        }
      } finally {
        setLoadingConversations(false);
        setLoadingMoreConversations(false);
      }
    },
    [canUseUnitFilter, conversationSearch, selectedConsultantId, unitFilter],
  );

  const loadMessages = React.useCallback(
    async (
      conversation: AttendanceConversation,
      options?: { reset?: boolean; silent?: boolean },
    ) => {
      if (!selectedConsultantId) {
        return;
      }

      const reset = options?.reset ?? false;
      const offset = reset ? 0 : messageCountRef.current;

      if (reset && !options?.silent) {
        setLoadingMessages(true);
      } else if (!reset) {
        setLoadingOlderMessages(true);
      }

      try {
        const data = await requestJson<MessagesResponse>(
          buildUrl("/api/atendimentos/mensagens", {
            consultantId: selectedConsultantId,
            unitId: canUseUnitFilter ? unitFilter : undefined,
            remoteJid: conversation.remoteJid,
            limit: MESSAGE_PAGE_SIZE,
            offset,
          }),
        );

        setMessages((current) => (reset ? data.messages : [...data.messages, ...current]));
        setMessageHasMore(data.pagination.hasMore);
      } catch (error) {
        if (!options?.silent) {
          toast.error(error instanceof Error ? error.message : "Falha ao carregar mensagens.");
        }
      } finally {
        setLoadingMessages(false);
        setLoadingOlderMessages(false);
      }
    },
    [canUseUnitFilter, selectedConsultantId, unitFilter],
  );

  React.useEffect(() => {
    void loadConsultants();
  }, [loadConsultants]);

  React.useEffect(() => {
    const interval = window.setInterval(() => void loadConsultants(true), 20_000);
    return () => window.clearInterval(interval);
  }, [loadConsultants]);

  React.useEffect(() => {
    setSelectedConsultantId(null);
    setConversations([]);
    setSelectedConversation(null);
    setMessages([]);
  }, [unitFilter]);

  React.useEffect(() => {
    if (!selectedConsultantId) {
      return;
    }

    const timeout = window.setTimeout(() => void loadConversations({ reset: true }), 250);
    return () => window.clearTimeout(timeout);
  }, [conversationSearch, loadConversations, selectedConsultantId]);

  React.useEffect(() => {
    if (!selectedConsultantId) {
      return;
    }

    const interval = window.setInterval(
      () => void loadConversations({ reset: true, silent: true }),
      15_000,
    );

    return () => window.clearInterval(interval);
  }, [loadConversations, selectedConsultantId]);

  React.useEffect(() => {
    if (!selectedConversation) {
      return;
    }

    const interval = window.setInterval(
      () => void loadMessages(selectedConversation, { reset: true, silent: true }),
      12_000,
    );

    return () => window.clearInterval(interval);
  }, [loadMessages, selectedConversation]);

  if (session && !canAccess) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
            <ShieldCheck className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold">Acesso restrito</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A central de atendimentos está disponível para Master, CEO, Diretor e Gerente.
          </p>
        </div>
      </div>
    );
  }

  const handleSelectConsultant = (consultant: AttendanceConsultant) => {
    setSelectedConsultantId(consultant.id);
    setConversationSearch("");
    setConversations([]);
    setConversationHasMore(false);
    setSelectedConversation(null);
    setMessages([]);
  };

  const handleOpenConversation = (conversation: AttendanceConversation) => {
    setSelectedConversation(conversation);
    setMessages([]);
    setMessageHasMore(false);
    void loadMessages(conversation, { reset: true });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Comercial"
        title="Atendimentos"
        description="Monitore, em tempo real, as conversas dos consultores conectados pelo WhatsApp."
        actions={
          canUseUnitFilter ? (
            <div className="w-full sm:w-64">
              <Label className="sr-only">Unidade</Label>
              <Select value={unitFilter} onValueChange={setUnitFilter}>
                <SelectTrigger>
                  <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ATTENDANCE_ALL_UNITS}>Todas as unidades</SelectItem>
                  {session?.units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              {session?.units.length === 1
                ? session.units[0].name
                : `${session?.units.length ?? 0} unidade(s) vinculada(s)`}
            </Badge>
          )
        }
      />

      <div className="grid min-h-[660px] gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="overflow-hidden border-primary/10 shadow-card">
          <CardHeader className="border-b border-border/70 bg-muted/20">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Consultores</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {loadingConsultants
                    ? "Atualizando conexões..."
                    : `${consultants.length} conexão(ões) encontrada(s)`}
                </p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => void loadConsultants()}
                disabled={loadingConsultants}
                aria-label="Atualizar consultores"
              >
                <RefreshCw className={cn("h-4 w-4", loadingConsultants && "animate-spin")} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="max-h-[596px] overflow-y-auto p-2">
            {loadingConsultants ? (
              <LoadingBlock label="Carregando consultores..." />
            ) : consultants.length ? (
              <div className="space-y-2">
                {consultants.map((consultant) => {
                  const selected = consultant.id === selectedConsultantId;

                  return (
                    <button
                      key={consultant.id}
                      type="button"
                      onClick={() => handleSelectConsultant(consultant)}
                      className={cn(
                        "w-full rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5",
                        selected
                          ? "border-primary/40 bg-primary/10 shadow-[0_18px_42px_-28px_rgba(23,70,184,0.9)]"
                          : "border-border bg-card",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-11 w-11 border border-primary/10">
                          <AvatarImage
                            src={consultant.avatarUrl ?? undefined}
                            alt={consultant.name}
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-gradient-primary text-xs font-semibold text-primary-foreground">
                            {getInitials(consultant.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold">{consultant.name}</p>
                            {consultant.status === "connected" ? (
                              <Wifi className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {consultant.unitName}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className={cn("h-6", statusClassName(consultant.status))}
                            >
                              {statusLabel(consultant.status)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {consultant.conversationCount} conversa(s)
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <EmptyPanel
                icon={Users}
                title="Nenhum consultor conectado"
                description="Assim que um consultor conectar o WhatsApp em Conversas IA, ele aparecerá aqui."
              />
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-primary/10 shadow-card">
          <CardHeader className="border-b border-border/70 bg-muted/20">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageCircle className="h-4 w-4 text-primary" />
                  Conversas
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedConsultant
                    ? `Atendimentos de ${selectedConsultant.name}`
                    : "Selecione um consultor para carregar as conversas."}
                </p>
              </div>
              <div className="relative w-full lg:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={conversationSearch}
                  onChange={(event) => setConversationSearch(event.target.value)}
                  placeholder="Buscar conversa por nome ou número..."
                  className="pl-9"
                  disabled={!selectedConsultantId}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="max-h-[596px] overflow-y-auto p-0">
            {!selectedConsultantId ? (
              <EmptyPanel
                icon={Bot}
                title="Escolha um consultor"
                description="As conversas só serão carregadas depois que um consultor for selecionado."
                className="min-h-[420px]"
              />
            ) : loadingConversations ? (
              <LoadingBlock label="Carregando conversas..." className="min-h-[420px]" />
            ) : conversations.length ? (
              <div className="divide-y divide-border">
                {conversations.map((conversation) => {
                  const TypeIcon = typeIcon(conversation.messageType);

                  return (
                    <button
                      key={conversation.remoteJid}
                      type="button"
                      onClick={() => handleOpenConversation(conversation)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-primary/5"
                    >
                      <Avatar className="h-11 w-11 border border-primary/10">
                        <AvatarImage
                          src={conversation.profilePictureUrl ?? undefined}
                          alt={conversation.contactName}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                          {getInitials(conversation.contactName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {conversation.contactName}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {formatPhone(conversation.phone)}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatDate(conversation.lastMessageAt, "time")}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <p className="min-w-0 truncate text-sm text-muted-foreground">
                            <TypeIcon className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]" />
                            {conversation.lastMessage}
                          </p>
                          {conversation.unreadCount ? (
                            <Badge className="h-5 min-w-5 justify-center rounded-full px-1.5 text-[10px]">
                              {conversation.unreadCount}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
                {conversationHasMore ? (
                  <div className="p-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => void loadConversations()}
                      disabled={loadingMoreConversations}
                    >
                      {loadingMoreConversations ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : null}
                      Carregar mais conversas
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyPanel
                icon={Inbox}
                title="Nenhuma conversa encontrada"
                description={
                  conversationSearch
                    ? "Tente buscar por outro nome ou número."
                    : "Não há conversas disponíveis para este consultor ainda."
                }
                className="min-h-[420px]"
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={Boolean(selectedConversation)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedConversation(null);
            setMessages([]);
          }
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-hidden p-0 sm:max-w-4xl">
          {selectedConversation ? (
            <div className="flex max-h-[92vh] flex-col">
              <DialogHeader className="border-b border-border bg-muted/30 px-5 py-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-11 w-11 border border-primary/10">
                    <AvatarImage
                      src={selectedConversation.profilePictureUrl ?? undefined}
                      alt={selectedConversation.contactName}
                    />
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                      {getInitials(selectedConversation.contactName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="truncate text-lg">
                      {selectedConversation.contactName}
                    </DialogTitle>
                    <DialogDescription>
                      {formatPhone(selectedConversation.phone)} · visualização somente leitura
                    </DialogDescription>
                  </div>
                  <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
                    Sem envio
                  </Badge>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto bg-[#eef3fb] px-4 py-4">
                {messageHasMore ? (
                  <div className="mb-4 flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void loadMessages(selectedConversation)}
                      disabled={loadingOlderMessages}
                      className="bg-white/90"
                    >
                      {loadingOlderMessages ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : null}
                      Carregar mensagens anteriores
                    </Button>
                  </div>
                ) : null}

                {loadingMessages ? (
                  <LoadingBlock label="Carregando histórico..." className="min-h-[360px]" />
                ) : messages.length ? (
                  <div className="space-y-3">
                    {messages.map((message) => (
                      <MessageBubble key={`${message.id}-${message.sentAt}`} message={message} />
                    ))}
                  </div>
                ) : (
                  <EmptyPanel
                    icon={MessageCircle}
                    title="Histórico vazio"
                    description="Nenhuma mensagem foi encontrada para esta conversa."
                    className="min-h-[360px]"
                  />
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LoadingBlock({ label, className }: { label: string; className?: string }) {
  return (
    <div
      className={cn("flex min-h-40 items-center justify-center text-muted-foreground", className)}
    >
      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

function EmptyPanel({
  icon: Icon,
  title,
  description,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-52 items-center justify-center p-6 text-center", className)}>
      <div className="max-w-sm">
        <Icon className="mx-auto mb-3 h-7 w-7 text-muted-foreground/60" />
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: AttendanceMessage }) {
  const outbound = message.direction === "outbound";

  return (
    <div className={cn("flex", outbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-3 py-2 shadow-sm",
          outbound
            ? "rounded-br-sm bg-[#d9fdd3] text-slate-900"
            : "rounded-bl-sm bg-white text-slate-900",
        )}
      >
        <MediaPreview message={message} />
        <p className="whitespace-pre-wrap text-sm leading-5">{message.content}</p>
        <div className="mt-1 flex items-center justify-end gap-2 text-[10px] text-slate-500">
          <span>{messageTypeLabels[message.type]}</span>
          <span>{formatDate(message.sentAt, "time")}</span>
        </div>
      </div>
    </div>
  );
}

function MediaPreview({ message }: { message: AttendanceMessage }) {
  if (!message.mediaUrl) {
    if (message.type === "text" || message.type === "unknown") {
      return null;
    }

    const Icon = typeIcon(message.type);

    return (
      <div className="mb-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs text-slate-600">
        <Icon className="h-4 w-4" />
        <span>{message.fileName || messageTypeLabels[message.type]}</span>
      </div>
    );
  }

  if (message.type === "image") {
    return (
      <img
        src={message.mediaUrl}
        alt={message.fileName || "Imagem da conversa"}
        className="mb-2 max-h-72 rounded-xl object-cover"
      />
    );
  }

  if (message.type === "video") {
    return <video src={message.mediaUrl} controls className="mb-2 max-h-72 rounded-xl" />;
  }

  if (message.type === "audio") {
    return <audio src={message.mediaUrl} controls className="mb-2 w-64 max-w-full" />;
  }

  if (message.type === "document") {
    return (
      <a
        href={message.mediaUrl}
        target="_blank"
        rel="noreferrer"
        className="mb-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-medium text-primary hover:underline"
      >
        <FileText className="h-4 w-4" />
        {message.fileName || "Abrir documento"}
      </a>
    );
  }

  return null;
}
