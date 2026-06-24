import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, KeyRound, Pencil, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth";
import {
  canDeleteManagedUser,
  canDeleteUsers,
  canEditManagedUser,
  canEditUsers,
  getAssignableRoles,
  ROLE_LABELS,
  type ManagedUser,
  type UserRole,
} from "@/lib/auth-types";

type UsersResponse = {
  users: Array<ManagedUser>;
};

type UnitsResponse = {
  units: Array<{ id: string; name: string; slug: string }>;
};

type DeleteTarget = {
  id: string;
  name: string;
  role: UserRole;
};

type EditForm = {
  userId: string;
  name: string;
  email: string;
  password: string;
};

export const Route = createFileRoute("/usuarios")({
  head: () => ({ meta: [{ title: "Usuários - Plenarius Growth Hub" }] }),
  component: UsersPage,
});

function UsersPage() {
  const { session, refreshSession } = useAuth();
  const [users, setUsers] = React.useState<Array<ManagedUser>>([]);
  const [units, setUnits] = React.useState<UnitsResponse["units"]>([]);
  const [loading, setLoading] = React.useState(true);
  const [savingUser, setSavingUser] = React.useState(false);
  const [savingEdit, setSavingEdit] = React.useState(false);
  const [savingUnit, setSavingUnit] = React.useState(false);
  const [deletingUser, setDeletingUser] = React.useState(false);
  const [unitName, setUnitName] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState<DeleteTarget | null>(null);
  const [editForm, setEditForm] = React.useState<EditForm | null>(null);
  const userRole = session?.user.role;
  const assignableRoles = React.useMemo(
    () => (userRole ? getAssignableRoles(userRole) : []),
    [userRole],
  );
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    password: "",
    role: "" as UserRole | "",
    unitId: "",
  });
  const canChooseUnit = userRole ? ["MASTER", "CEO"].includes(userRole) : false;
  const canDeleteUserRecords = userRole ? canDeleteUsers(userRole) : false;
  const canEditUserRecords = userRole ? canEditUsers(userRole) : false;
  const defaultUnit = session?.activeUnit ?? session?.units[0] ?? null;
  const defaultUnitId = defaultUnit?.id ?? "";
  const effectiveUnitId = canChooseUnit ? form.unitId : defaultUnitId || form.unitId;
  const unitOptionsBase = units.length ? units : (session?.units ?? []);
  const unitOptions =
    defaultUnit && !unitOptionsBase.some((unit) => unit.id === defaultUnit.id)
      ? [defaultUnit, ...unitOptionsBase]
      : unitOptionsBase;

  React.useEffect(() => {
    if (!session) {
      return;
    }

    setForm((current) => {
      const nextRole = current.role || assignableRoles[0] || "";
      const sessionDefaultUnitId = session.activeUnit?.id || session.units[0]?.id || "";
      const nextUnitId = ["MASTER", "CEO"].includes(session.user.role)
        ? current.unitId || sessionDefaultUnitId
        : sessionDefaultUnitId;

      if (current.role === nextRole && current.unitId === nextUnitId) {
        return current;
      }

      return { ...current, role: nextRole, unitId: nextUnitId };
    });
  }, [assignableRoles, session]);

  const loadData = React.useCallback(async () => {
    if (!session?.canRegisterUsers || !defaultUnitId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const usersResponse = await fetch("/api/admin/users", { credentials: "same-origin" });
      const unitsResponse = canChooseUnit
        ? await fetch("/api/admin/units", { credentials: "same-origin" })
        : null;

      if (!usersResponse.ok || (unitsResponse && !unitsResponse.ok)) {
        throw new Error("Não foi possível carregar usuários.");
      }

      const usersData = (await usersResponse.json()) as UsersResponse;
      const unitsData = unitsResponse
        ? ((await unitsResponse.json()) as UnitsResponse)
        : { units: session.units };
      setUsers(usersData.users);
      setUnits(unitsData.units);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao carregar usuários.");
    } finally {
      setLoading(false);
    }
  }, [canChooseUnit, defaultUnitId, session]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  if (!session?.canRegisterUsers) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
            <ShieldCheck className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold">Acesso restrito</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Seu usuário não tem permissão para cadastrar usuários.
          </p>
        </div>
      </div>
    );
  }

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!effectiveUnitId) {
      toast.error("Unidade indisponível para o cadastro.");
      return;
    }

    setSavingUser(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...form, unitId: effectiveUnitId }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        unit?: { id: string; name: string; slug: string };
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível cadastrar usuário.");
      }

      toast.success("Usuário cadastrado.");
      setForm((current) => ({
        ...current,
        name: "",
        email: "",
        password: "",
      }));
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao cadastrar usuário.");
    } finally {
      setSavingUser(false);
    }
  }

  async function handleCreateUnit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingUnit(true);

    try {
      const response = await fetch("/api/admin/units", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: unitName }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível criar unidade.");
      }

      toast.success("Unidade criada.");
      setUnitName("");
      if (data.unit) {
        setUnits((current) =>
          [...current, data.unit!].sort((a, b) => a.name.localeCompare(b.name)),
        );
      }
      await refreshSession();
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao criar unidade.");
    } finally {
      setSavingUnit(false);
    }
  }

  async function handleDeleteUser() {
    if (!deleteTarget) {
      return;
    }

    setDeletingUser(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: deleteTarget.id }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível excluir usuário.");
      }

      toast.success("Usuário excluído.");
      setUsers((current) => current.filter((user) => user.id !== deleteTarget.id));
      setDeleteTarget(null);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao excluir usuário.");
    } finally {
      setDeletingUser(false);
    }
  }

  async function handleEditUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editForm) {
      return;
    }

    setSavingEdit(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "PUT",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editForm),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        user?: ManagedUser;
      };

      if (!response.ok || !data.user) {
        throw new Error(data.error ?? "Não foi possível editar usuário.");
      }

      setUsers((current) => current.map((user) => (user.id === data.user!.id ? data.user! : user)));
      setEditForm(null);
      toast.success(editForm.password ? "Usuário e senha atualizados." : "Usuário atualizado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao editar usuário.");
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administração"
        title="Usuários e unidades"
        description="Cadastros internos vinculados à unidade ativa."
        actions={
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            {session.activeUnit?.name ?? "Sem unidade ativa"}
          </Badge>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="shadow-card">
          <CardHeader className="flex-row items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
              <UserPlus className="h-4 w-4" />
            </div>
            <CardTitle className="text-base">Novo usuário</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, email: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha inicial</Label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, password: event.target.value }))
                    }
                    className="pl-9"
                    minLength={8}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Função</Label>
                <Select
                  value={form.role}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, role: value as UserRole }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                {canChooseUnit ? (
                  <Select
                    value={effectiveUnitId}
                    onValueChange={(value) => setForm((current) => ({ ...current, unitId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {unitOptions.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={defaultUnit?.name ?? ""} disabled readOnly />
                )}
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={savingUser || !form.role || !effectiveUnitId}>
                  {savingUser ? "Salvando..." : "Cadastrar usuário"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex-row items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-gold text-gold-foreground">
              <Users className="h-4 w-4" />
            </div>
            <CardTitle className="text-base">Usuários da unidade</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[96px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : users.length ? (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={user.status === "active" ? "bg-success/10 text-success" : ""}
                        >
                          {user.status === "active" ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {canEditUserRecords &&
                          canEditManagedUser(session.user.role, user.role) ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-primary hover:bg-primary/10 hover:text-primary"
                              onClick={() =>
                                setEditForm({
                                  userId: user.id,
                                  name: user.name,
                                  email: user.email,
                                  password: "",
                                })
                              }
                              aria-label={`Editar ${user.name}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          ) : null}
                          {canDeleteUserRecords &&
                          user.id !== session.user.id &&
                          canDeleteManagedUser(session.user.role, user.role) ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() =>
                                setDeleteTarget({
                                  id: user.id,
                                  name: user.name,
                                  role: user.role,
                                })
                              }
                              aria-label={`Excluir ${user.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                      Nenhum usuário nesta unidade.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {session.canCreateUnits ? (
        <Card className="shadow-card">
          <CardHeader className="flex-row items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <Building2 className="h-4 w-4" />
            </div>
            <CardTitle className="text-base">Nova unidade</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUnit} className="flex flex-col gap-3 md:flex-row">
              <Input
                value={unitName}
                onChange={(event) => setUnitName(event.target.value)}
                placeholder="Nome da unidade"
                className="md:max-w-md"
                required
              />
              <Button type="submit" variant="outline" disabled={savingUnit}>
                {savingUnit ? "Criando..." : "Criar unidade"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
      <Dialog
        open={Boolean(editForm)}
        onOpenChange={(open) => !open && !savingEdit && setEditForm(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleEditUser}>
            <DialogHeader>
              <DialogTitle>Editar usuário</DialogTitle>
              <DialogDescription>
                Altere nome, email ou defina uma nova senha. Os dados serão atualizados no banco.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-5">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome</Label>
                <Input
                  id="edit-name"
                  value={editForm?.name ?? ""}
                  onChange={(event) =>
                    setEditForm((current) =>
                      current ? { ...current, name: event.target.value } : current,
                    )
                  }
                  autoComplete="name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm?.email ?? ""}
                  onChange={(event) =>
                    setEditForm((current) =>
                      current ? { ...current, email: event.target.value } : current,
                    )
                  }
                  autoComplete="email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-password">Nova senha</Label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="edit-password"
                    type="password"
                    value={editForm?.password ?? ""}
                    onChange={(event) =>
                      setEditForm((current) =>
                        current ? { ...current, password: event.target.value } : current,
                      )
                    }
                    className="pl-9"
                    minLength={8}
                    placeholder="Deixe em branco para manter"
                    autoComplete="new-password"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Ao trocar a senha, as sessões abertas deste usuário serão encerradas.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditForm(null)}
                disabled={savingEdit}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={savingEdit}>
                {savingEdit ? "Salvando..." : "Salvar alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && !deletingUser && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Deseja excluir "${deleteTarget.name}" permanentemente? O cadastro e o acesso serão removidos do banco de dados.`
                : "Deseja excluir este usuário?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingUser}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletingUser}
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteUser();
              }}
            >
              {deletingUser ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
