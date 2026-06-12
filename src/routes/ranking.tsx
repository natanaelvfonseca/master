import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Award, Crown, GraduationCap, Medal, Trophy, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { StatCard } from "@/components/layout/StatCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getInitials } from "@/lib/auth-types";
import { useAuth } from "@/lib/auth";
import type { RankingMember, RankingResponse } from "@/lib/ranking-types";

const emptyTotals: RankingResponse["totals"] = {
  consultants: 0,
  leads: 0,
  taxaFeita: 0,
};

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
});

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T;

  if (!response.ok) {
    const message =
      typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : "Falha ao carregar ranking.";
    throw new Error(message);
  }

  return data;
}

function unitQuery(unitId: string) {
  return `?unitId=${encodeURIComponent(unitId)}`;
}

function metricValue(loading: boolean, value: string | number) {
  return loading ? "..." : value;
}

function formatPercent(value: number) {
  return `${percentFormatter.format(value)}%`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "--";
  }

  return dateFormatter.format(new Date(value));
}

export const Route = createFileRoute("/ranking")({
  head: () => ({ meta: [{ title: "Ranking - Planarius" }] }),
  component: Ranking,
});

function Ranking() {
  const { session, loading: authLoading } = useAuth();
  const [data, setData] = React.useState<RankingResponse | null>(null);
  const [loadingRanking, setLoadingRanking] = React.useState(false);
  const activeUnitId = session?.activeUnit?.id ?? "";
  const activeUnitName = data?.unit.name ?? session?.activeUnit?.name ?? "Unidade ativa";
  const isLoading = authLoading || loadingRanking;
  const ranking = data?.ranking ?? [];
  const totals = data?.totals ?? emptyTotals;
  const leader = ranking[0];
  const topTaxaFeita = Math.max(...ranking.map((member) => member.taxaFeita), 0);
  const teamConversionRate = totals.leads > 0 ? (totals.taxaFeita / totals.leads) * 100 : 0;

  React.useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!activeUnitId) {
      setData(null);
      return;
    }

    let ignore = false;

    async function loadRanking() {
      setLoadingRanking(true);

      try {
        const response = await readJson<RankingResponse>(
          await fetch(`/api/ranking${unitQuery(activeUnitId)}`, {
            credentials: "same-origin",
            headers: { Accept: "application/json" },
          }),
        );

        if (!ignore) {
          setData(response);
        }
      } catch (error) {
        if (!ignore) {
          toast.error(error instanceof Error ? error.message : "Falha ao carregar ranking.");
        }
      } finally {
        if (!ignore) {
          setLoadingRanking(false);
        }
      }
    }

    void loadRanking();

    return () => {
      ignore = true;
    };
  }, [activeUnitId, authLoading]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gamificacao"
        title="Ranking da Equipe Comercial"
        description={`Taxas feitas confirmadas por consultor na unidade ${activeUnitName}.`}
        actions={<Badge variant="outline">{activeUnitName}</Badge>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Taxas feitas"
          value={metricValue(isLoading, totals.taxaFeita)}
          icon={GraduationCap}
          accent="gold"
          hint="Total da equipe"
        />
        <StatCard
          label="Consultores"
          value={metricValue(isLoading, totals.consultants)}
          icon={Users}
          accent="primary"
          hint={activeUnitName}
        />
        <StatCard
          label="Lider"
          value={metricValue(isLoading, leader?.name ?? "--")}
          icon={Crown}
          accent="success"
          hint={leader ? `${leader.taxaFeita} taxas` : "Sem lider"}
        />
        <StatCard
          label="Conversao"
          value={metricValue(isLoading, formatPercent(teamConversionRate))}
          icon={Award}
          accent="primary"
          hint="Taxas/leads"
        />
      </div>

      {isLoading ? (
        <RankingLoading />
      ) : ranking.length ? (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            {ranking.slice(0, 3).map((member) => (
              <PodiumCard
                key={member.userId}
                member={member}
                progress={topTaxaFeita > 0 ? (member.taxaFeita / topTaxaFeita) * 100 : 0}
              />
            ))}
          </div>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Ranking por taxa feita</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[96px] pl-5">Posicao</TableHead>
                    <TableHead>Consultor</TableHead>
                    <TableHead className="text-right">Taxas feitas</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">Conversao</TableHead>
                    <TableHead>Ultima taxa</TableHead>
                    <TableHead className="w-[160px] pr-5">Ritmo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranking.map((member) => (
                    <RankingRow
                      key={member.userId}
                      member={member}
                      progress={topTaxaFeita > 0 ? (member.taxaFeita / topTaxaFeita) * 100 : 0}
                    />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="shadow-card">
          <CardContent className="p-4">
            <EmptyState
              icon={Trophy}
              title="Nenhum consultor encontrado"
              description="Cadastre consultores ativos na unidade para montar o ranking."
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PodiumCard({ member, progress }: { member: RankingMember; progress: number }) {
  const rankClass =
    member.rank === 1
      ? "border-gold/40 bg-gold/10 text-gold"
      : member.rank === 2
        ? "border-primary/20 bg-primary/5 text-primary"
        : "border-success/20 bg-success/5 text-success";

  return (
    <Card className="shadow-card">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11 border border-border">
              <AvatarImage src={member.avatarUrl ?? undefined} alt={member.name} />
              <AvatarFallback className="text-xs font-semibold">
                {getInitials(member.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-semibold">{member.name}</p>
              <p className="truncate text-xs text-muted-foreground">{member.email}</p>
            </div>
          </div>
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${rankClass}`}
          >
            {member.rank === 1 ? <Crown className="h-5 w-5" /> : <Medal className="h-5 w-5" />}
          </div>
        </div>

        <div className="mt-5 flex items-end justify-between gap-4">
          <div>
            <div className="text-3xl font-bold tracking-tight">{member.taxaFeita}</div>
            <p className="text-xs text-muted-foreground">taxas feitas</p>
          </div>
          <Badge variant="outline">#{member.rank}</Badge>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-gold" style={{ width: `${progress}%` }} />
        </div>
      </CardContent>
    </Card>
  );
}

function RankingRow({ member, progress }: { member: RankingMember; progress: number }) {
  return (
    <TableRow>
      <TableCell className="pl-5 font-semibold">
        <div className="flex items-center gap-2">
          {member.rank === 1 ? (
            <Crown className="h-4 w-4 text-gold" />
          ) : (
            <Medal className="h-4 w-4 text-muted-foreground" />
          )}
          #{member.rank}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarImage src={member.avatarUrl ?? undefined} alt={member.name} />
            <AvatarFallback className="text-xs font-semibold">
              {getInitials(member.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate font-medium">{member.name}</div>
            <div className="truncate text-xs text-muted-foreground">{member.email}</div>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right font-semibold text-gold">{member.taxaFeita}</TableCell>
      <TableCell className="text-right">{member.leads}</TableCell>
      <TableCell className="text-right">{formatPercent(member.conversionRate)}</TableCell>
      <TableCell className="text-muted-foreground">{formatDate(member.lastTaxaAt)}</TableCell>
      <TableCell className="pr-5">
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
      </TableCell>
    </TableRow>
  );
}

function RankingLoading() {
  return (
    <Card className="shadow-card">
      <CardContent className="space-y-4 p-5">
        <div className="h-5 w-48 animate-pulse rounded bg-muted" />
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
              <div className="h-2 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
