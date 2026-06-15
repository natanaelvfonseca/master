import * as React from "react";
import { Bell, CheckCircle2, Clock3, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import type { CrmLeadTask } from "@/lib/crm-task-types";
import { cn } from "@/lib/utils";

type NotificationsResponse = {
  tasks: Array<CrmLeadTask>;
};

type TaskResponse = {
  task: CrmLeadTask;
};

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? "Falha na requisição.");
  }

  return data;
}

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function Topbar() {
  const { session, setActiveUnit } = useAuth();
  const activeUnit = session?.activeUnit;
  const [notifications, setNotifications] = React.useState<Array<CrmLeadTask>>([]);
  const [loadingNotifications, setLoadingNotifications] = React.useState(false);
  const [updatingTaskId, setUpdatingTaskId] = React.useState<string | null>(null);
  const [browserPermission, setBrowserPermission] = React.useState<
    NotificationPermission | "unsupported"
  >(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported",
  );
  const notifiedTaskIdsRef = React.useRef<Set<string>>(new Set());

  const notifyBrowser = React.useCallback(
    (tasks: Array<CrmLeadTask>) => {
      if (
        browserPermission !== "granted" ||
        typeof window === "undefined" ||
        !("Notification" in window)
      ) {
        return;
      }

      tasks.forEach((task) => {
        if (notifiedTaskIdsRef.current.has(task.id)) {
          return;
        }

        notifiedTaskIdsRef.current.add(task.id);
        new Notification("Tarefa do CRM", {
          body: `${task.title} - ${task.leadName} às ${formatNotificationDate(task.dueAt)}`,
          tag: `crm-task-${task.id}`,
        });
      });
    },
    [browserPermission],
  );

  const loadNotifications = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!session) {
        setNotifications([]);
        return;
      }

      if (!silent) {
        setLoadingNotifications(true);
      }

      try {
        const data = await readJson<NotificationsResponse>(
          await fetch("/api/crm/tasks?view=notifications", {
            credentials: "same-origin",
            headers: { Accept: "application/json" },
          }),
        );

        setNotifications(data.tasks);
        notifyBrowser(data.tasks);
      } catch (error) {
        if (!silent) {
          toast.error(error instanceof Error ? error.message : "Falha ao carregar notificações.");
        }
      } finally {
        if (!silent) {
          setLoadingNotifications(false);
        }
      }
    },
    [notifyBrowser, session],
  );

  React.useEffect(() => {
    void loadNotifications();

    const intervalId = window.setInterval(() => {
      void loadNotifications({ silent: true });
    }, 60_000);

    const handleFocus = () => void loadNotifications({ silent: true });
    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadNotifications]);

  async function requestBrowserNotifications() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setBrowserPermission("unsupported");
      toast.error("Este navegador não suporta notificações.");
      return;
    }

    const permission = await Notification.requestPermission();
    setBrowserPermission(permission);

    if (permission === "granted") {
      toast.success("Notificações do navegador ativadas.");
      notifyBrowser(notifications);
    }
  }

  async function completeTask(task: CrmLeadTask) {
    setUpdatingTaskId(task.id);

    try {
      await readJson<TaskResponse>(
        await fetch("/api/crm/tasks", {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ taskId: task.id, status: "done" }),
        }),
      );

      setNotifications((current) => current.filter((item) => item.id !== task.id));
      toast.success("Tarefa concluída.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao concluir tarefa.");
    } finally {
      setUpdatingTaskId(null);
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <div className="hidden items-center gap-2 md:flex">
        {session && session.units.length > 1 ? (
          <Select value={activeUnit?.id} onValueChange={(value) => void setActiveUnit(value)}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {session.units.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>
                  {unit.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : activeUnit ? (
          <div className="flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium">
            {activeUnit.name}
          </div>
        ) : null}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar aluno, lead, turma..." className="h-9 w-[280px] pl-9" />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {notifications.length ? (
                <Badge className="absolute -right-1 -top-1 h-4 min-w-4 rounded-full bg-gold p-0 px-1 text-[10px] text-gold-foreground">
                  {notifications.length}
                </Badge>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[min(92vw,380px)] p-0">
            <div className="border-b bg-[linear-gradient(135deg,#0B2A6F_0%,#1746B8_100%)] p-4 text-white">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold">Notificações</div>
                  <p className="mt-1 text-xs text-white/70">
                    Tarefas do CRM próximas ou atrasadas.
                  </p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => loadNotifications()}
                  disabled={loadingNotifications}
                  className="text-white hover:bg-white/10 hover:text-white"
                >
                  {loadingNotifications ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Bell className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="max-h-[360px] overflow-y-auto p-3">
              {notifications.length ? (
                <div className="space-y-2">
                  {notifications.map((task) => (
                    <div key={task.id} className="rounded-lg border bg-card p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="break-words text-sm font-bold">{task.title}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{task.leadName}</div>
                          <div
                            className={cn(
                              "mt-2 flex items-center gap-1 text-xs font-semibold",
                              new Date(task.dueAt).getTime() < Date.now()
                                ? "text-destructive"
                                : "text-primary",
                            )}
                          >
                            <Clock3 className="h-3.5 w-3.5" />
                            {formatNotificationDate(task.dueAt)}
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          className="shrink-0 gap-1.5 bg-gradient-primary"
                          onClick={() => void completeTask(task)}
                          disabled={updatingTaskId === task.id}
                        >
                          {updatingTaskId === task.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          Feita
                        </Button>
                      </div>
                      {task.notes ? (
                        <p className="mt-2 whitespace-pre-line text-xs text-muted-foreground">
                          {task.notes}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-32 flex-col items-center justify-center text-center">
                  <Bell className="h-8 w-8 text-muted-foreground" />
                  <div className="mt-2 text-sm font-semibold">Nenhuma tarefa próxima</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    O sino avisa quando uma tarefa estiver a 15 minutos.
                  </p>
                </div>
              )}
            </div>

            {browserPermission === "default" ? (
              <div className="border-t p-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => void requestBrowserNotifications()}
                >
                  Ativar alertas do navegador
                </Button>
              </div>
            ) : null}
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
