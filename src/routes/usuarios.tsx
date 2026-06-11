import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, KeyRound, ShieldCheck, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import {
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

export const Route = createFileRoute("/usuarios")({
  head: () => ({ meta: [{ title: "Usuarios - Plenarius Growth Hub" }] }),
  component: UsersPage,
});

function UsersPage() {
  const { session, refreshSession } = useAuth();
  const [users, setUsers] = React.useState<Array<ManagedUser>>([]);
  const [units, setUnits] = React.useState<UnitsResponse["units"]>([]);
  const [loading, setLoading] = React.useState(true);
  const [savingUser, setSavingUser] = React.useState(false);
  const [savingUnit, setSavingUnit] = React.useState(false);
  const [unitName, setUnitName] = React.useState("");
  const assignableRoles = React.useMemo(
    () => (session ? getAssignableRoles(session.user.role) : []),
    [session?.user.role],
  );
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    password: "",
    role: "" as UserRole | "",
    unitId: "",
  });

  React.useEffect(() => {
    if (!session) {
      return;
    }

    setForm((current) => {
      const nextRole = current.role || assignableRoles[0] || "";
      const nextUnitId = current.unitId || session.activeUnit?.id || "";

      if (current.role === nextRole && current.unitId === nextUnitId) {
        return current;
      }

      return { ...current, role: nextRole, unitId: nextUnitId };
    });
  }, [assignableRoles, session]);

  const loadData = React.useCallback(async () => {
    if (!session?.canRegisterUsers) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [usersResponse, unitsResponse] = await Promise.all([
        fetch("/api/admin/users", { credentials: "same-origin" }),
        fetch("/api/admin/units", { credentials: "same-origin" }),
      ]);

      if (!usersResponse.ok || !unitsResponse.ok) {
        throw new Error("Nao foi possivel carregar usuarios.");
      }

      const usersData = (await usersResponse.json()) as UsersResponse;
      const unitsData = (await unitsResponse.json()) as UnitsResponse;
      setUsers(usersData.users);
      setUnits(unitsData.units);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao carregar usuarios.");
    } finally {
      setLoading(false);
    }
  }, [session?.activeUnit?.id, session?.canRegisterUsers]);

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
            Seu usuario nao tem permissao para cadastrar usuarios.
          </p>
        </div>
      </div>
    );
  }

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingUser(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        unit?: { id: string; name: string; slug: string };
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Nao foi possivel cadastrar usuario.");
      }

      toast.success("Usuario cadastrado.");
      setForm((current) => ({
        ...current,
        name: "",
        email: "",
        password: "",
      }));
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao cadastrar usuario.");
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
        throw new Error(data.error ?? "Nao foi possivel criar unidade.");
      }

      toast.success("Unidade criada.");
      setUnitName("");
      if (data.unit) {
        setUnits((current) => [...current, data.unit!].sort((a, b) => a.name.localeCompare(b.name)));
      }
      await refreshSession();
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao criar unidade.");
    } finally {
      setSavingUnit(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administracao"
        title="Usuarios e unidades"
        description="Cadastros internos vinculados a unidade ativa."
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
            <CardTitle className="text-base">Novo usuario</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
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
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                    className="pl-9"
                    minLength={8}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Funcao</Label>
                <Select
                  value={form.role}
                  onValueChange={(value) => setForm((current) => ({ ...current, role: value as UserRole }))}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {assignableRoles.map((role) => (
                      <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select
                  value={form.unitId}
                  onValueChange={(value) => setForm((current) => ({ ...current, unitId: value }))}
                  disabled={!["MASTER", "CEO"].includes(session.user.role)}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(units.length ? units : session.units).map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={savingUser || !form.role || !form.unitId}>
                  {savingUser ? "Salvando..." : "Cadastrar usuario"}
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
            <CardTitle className="text-base">Usuarios da unidade</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Funcao</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
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
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                      Nenhum usuario nesta unidade.
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
    </div>
  );
}
