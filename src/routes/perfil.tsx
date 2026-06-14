import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, Mail, Save, Trash2, Upload, UserRound } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { getInitials } from "@/lib/auth-types";

const MAX_AVATAR_UPLOAD_BYTES = 1_000_000;

type ProfileResponse = {
  error?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
  };
};

export const Route = createFileRoute("/perfil")({
  head: () => ({ meta: [{ title: "Perfil - Plenarius Growth Hub" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { session, refreshSession } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    avatarUrl: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const user = session?.user;

  React.useEffect(() => {
    if (!user) {
      return;
    }

    setForm((current) => ({
      ...current,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl ?? "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }));
  }, [user?.id, user?.name, user?.email, user?.avatarUrl]);

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida.");
      return;
    }

    if (file.size > MAX_AVATAR_UPLOAD_BYTES) {
      toast.error("A imagem precisa ter até 1 MB.");
      return;
    }

    const avatarUrl = await readFileAsDataUrl(file).catch(() => "");

    if (!avatarUrl) {
      toast.error("Não foi possível carregar a imagem.");
      return;
    }

    setForm((current) => ({ ...current, avatarUrl }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (form.newPassword || form.confirmPassword) {
      if (!form.currentPassword) {
        toast.error("Informe a senha atual.");
        return;
      }

      if (!form.newPassword) {
        toast.error("Informe a nova senha.");
        return;
      }

      if (form.newPassword !== form.confirmPassword) {
        toast.error("A confirmação da senha não confere.");
        return;
      }
    }

    setSaving(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          avatarUrl: form.avatarUrl,
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as ProfileResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível salvar o perfil.");
      }

      await refreshSession();
      setForm((current) => ({
        ...current,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      toast.success("Perfil atualizado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  }

  const initials = user ? getInitials(form.name || user.name) : "PG";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configurações"
        title="Perfil"
        description="Dados da sua conta e acesso."
      />

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 xl:grid-cols-[minmax(260px,0.72fr)_minmax(0,1.28fr)]"
      >
        <Card className="shadow-card">
          <CardHeader className="flex-row items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
              <UserRound className="h-4 w-4" />
            </div>
            <CardTitle className="text-base">Foto do perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-col items-center gap-4 rounded-lg border border-primary/10 bg-primary/5 px-5 py-6 text-center">
              <Avatar className="h-28 w-28 border-4 border-background shadow-[0_18px_40px_-24px_rgba(23,70,184,0.95)]">
                <AvatarImage
                  src={form.avatarUrl || undefined}
                  alt={form.name || "Perfil"}
                  className="object-cover"
                />
                <AvatarFallback className="bg-gradient-primary text-2xl font-bold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="text-sm font-semibold">
                  {form.name || user?.name || "Plenarius"}
                </div>
                <div className="text-xs text-muted-foreground">{form.email || user?.email}</div>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => void handleAvatarChange(event)}
            />

            <div className="flex flex-col gap-2 sm:flex-row xl:flex-col 2xl:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1"
              >
                <Upload className="h-4 w-4" />
                Trocar imagem
              </Button>
              {form.avatarUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setForm((current) => ({ ...current, avatarUrl: "" }))}
                  className="flex-1 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Remover
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex-row items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-gold text-gold-foreground">
              <KeyRound className="h-4 w-4" />
            </div>
            <CardTitle className="text-base">Dados de acesso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Nome</Label>
                <Input
                  id="profile-name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="profile-email"
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, email: event.target.value }))
                    }
                    className="pl-9"
                    required
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="current-password">Senha atual</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={form.currentPassword}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, currentPassword: event.target.value }))
                  }
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">Nova senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={form.newPassword}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, newPassword: event.target.value }))
                  }
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={form.confirmPassword}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, confirmPassword: event.target.value }))
                  }
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" className="bg-gradient-primary" disabled={saving}>
                <Save className="h-4 w-4" />
                {saving ? "Salvando..." : "Salvar perfil"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
