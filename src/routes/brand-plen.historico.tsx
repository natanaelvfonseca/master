import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
  Loader2,
  Lock,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BrandPlenGeneration } from "@/lib/brand-plen-types";
import { pieceTypes } from "@/lib/brand";
import { useAuth } from "@/lib/auth";
import { canViewBrandPlenHistory, getInitials } from "@/lib/auth-types";
import { toast } from "sonner";

type GenerateResponse = {
  generations?: Array<BrandPlenGeneration>;
  error?: string;
};

const statusColor: Record<BrandPlenGeneration["status"], string> = {
  ready: "border-success/30 bg-success/15 text-success",
  generating: "border-primary/20 bg-primary/10 text-primary",
  failed: "border-destructive/30 bg-destructive/10 text-destructive",
};

const statusLabel: Record<BrandPlenGeneration["status"], string> = {
  ready: "Pronta",
  generating: "Gerando",
  failed: "Erro",
};

export const Route = createFileRoute("/brand-plen/historico")({
  head: () => ({ meta: [{ title: "Histórico · Brand Plen" }] }),
  component: Historico,
});

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? "Não foi possível concluir a ação.");
  }

  return data;
}

function unitQuery(unitId: string) {
  const params = new URLSearchParams({ unitId, scope: "unit" });

  return `?${params.toString()}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getPieceLabel(pieceType: string) {
  return pieceTypes.find((piece) => piece.id === pieceType)?.label ?? pieceType;
}

function Historico() {
  const { session } = useAuth();
  const activeUnitId = session?.activeUnit?.id ?? "";
  const activeUnitName = session?.activeUnit?.name ?? "Unidade ativa";
  const [generations, setGenerations] = useState<Array<BrandPlenGeneration>>([]);
  const [loading, setLoading] = useState(false);

  const canViewHistory = session ? canViewBrandPlenHistory(session.user.role) : false;

  const loadHistory = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!activeUnitId || !canViewHistory) {
        setGenerations([]);
        return;
      }

      if (!silent) {
        setLoading(true);
      }

      try {
        const data = await readJson<GenerateResponse>(
          await fetch(`/api/brand-plen/generate${unitQuery(activeUnitId)}`, {
            credentials: "same-origin",
            headers: { Accept: "application/json" },
          }),
        );

        setGenerations(data.generations ?? []);
      } catch (error) {
        if (!silent) {
          toast.error(error instanceof Error ? error.message : "Falha ao carregar histórico.");
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [activeUnitId, canViewHistory],
  );

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const stats = useMemo(
    () => ({
      total: generations.length,
      ready: generations.filter((generation) => generation.status === "ready").length,
      generating: generations.filter((generation) => generation.status === "generating").length,
      failed: generations.filter((generation) => generation.status === "failed").length,
    }),
    [generations],
  );

  if (session && !canViewHistory) {
    return <BrandAdminAccessDenied />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Brand Plen · Unidade"
        title="Histórico de criações"
        description={`Criações realizadas pela equipe da unidade ${activeUnitName}.`}
        actions={
          <div className="flex items-center gap-2">
            <Badge className="gap-1 border-primary/20 bg-primary/10 text-primary">
              <Lock className="h-3 w-3" /> Acesso liderança
            </Badge>
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => loadHistory()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Criações da unidade"
          value={stats.total}
          icon={Sparkles}
          accent="primary"
        />
        <StatCard label="Imagens prontas" value={stats.ready} icon={ImageIcon} accent="success" />
        <StatCard label="Em geração" value={stats.generating} icon={Clock} accent="primary" />
        <StatCard label="Com erro" value={stats.failed} icon={AlertCircle} accent="gold" />
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          {generations.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prévia</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo de peça</TableHead>
                  <TableHead>Objetivo</TableHead>
                  <TableHead>Curso</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Destino</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generations.map((generation) => {
                  const creatorName = generation.createdByName ?? "Usuário";

                  return (
                    <TableRow key={generation.id}>
                      <TableCell>
                        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-md border bg-muted">
                          {generation.dataUrl ? (
                            <img
                              src={generation.dataUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : generation.status === "generating" ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-[10px]">
                              {getInitials(creatorName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{creatorName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(generation.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {getPieceLabel(generation.pieceType)}
                      </TableCell>
                      <TableCell className="text-sm">{generation.objective}</TableCell>
                      <TableCell className="text-sm">{generation.course}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColor[generation.status]}>
                          {generation.status === "ready" ? (
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                          ) : generation.status === "generating" ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <AlertCircle className="mr-1 h-3 w-3" />
                          )}
                          {statusLabel[generation.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            generation.publishedMaterialId
                              ? "border-primary/20 bg-primary/10 text-primary"
                              : "border-muted bg-muted/30 text-muted-foreground"
                          }
                        >
                          {generation.publishedMaterialId ? "Biblioteca" : "Privada"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex min-h-[300px] flex-col items-center justify-center p-6 text-center">
              {loading ? (
                <Loader2 className="h-9 w-9 animate-spin text-primary" />
              ) : (
                <ImageIcon className="h-9 w-9 text-muted-foreground" />
              )}
              <div className="mt-3 text-sm font-semibold">
                {loading ? "Carregando histórico..." : "Nenhuma criação nesta unidade"}
              </div>
              <p className="mt-1 max-w-[280px] text-xs text-muted-foreground">
                As imagens criadas pela equipe aparecem aqui por unidade.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BrandAdminAccessDenied() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O histórico do Brand Plen fica disponível para Master, CEO, CVO, Diretor e Gerente.
        </p>
      </div>
    </div>
  );
}
