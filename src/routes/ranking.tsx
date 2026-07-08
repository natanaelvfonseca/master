import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Award, Crown, Flame, Medal, Trophy, Zap, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { PremiumBlockedPopup } from "@/components/layout/PremiumBlockedPopup";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";

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

function progressWidth(value: number, max: number) {
  if (max <= 0 || value <= 0) {
    return 0;
  }

  return Math.max(8, Math.round((value / max) * 100));
}

export const Route = createFileRoute("/ranking")({
  head: () => ({ meta: [{ title: "Ranking Master - Master" }] }),
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
  const leader = ranking[0];
  const topTaxaFeita = Math.max(...ranking.map((member) => member.taxaFeita), 0);
  const isPremiumBlocked = Boolean(session && session.user.role !== "MASTER");

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
    <div className="ranking-elite-shell -m-4 min-h-[calc(100vh-4rem)] overflow-hidden px-4 py-5 text-foreground md:-m-6 md:px-6 md:py-7 lg:-m-8 lg:px-8 lg:py-8">
      {isPremiumBlocked ? <PremiumBlockedPopup /> : null}
      <div className="ranking-light-beams" />
      <div className="ranking-energy-lines" />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-6">
        <RankingHero activeUnitName={activeUnitName} isLoading={isLoading} leader={leader} />

        {isLoading ? (
          <RankingLoading />
        ) : ranking.length ? (
          <>
            <ElitePodium members={ranking.slice(0, 3)} topTaxaFeita={topTaxaFeita} />

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
              <RankingBoard members={ranking} topTaxaFeita={topTaxaFeita} />
              <SpotlightPanel leader={leader} />
            </div>
          </>
        ) : (
          <EmptyRankingPanel />
        )}
      </div>
    </div>
  );
}

function RankingHero({
  activeUnitName,
  isLoading,
  leader,
}: {
  activeUnitName: string;
  isLoading: boolean;
  leader: RankingMember | undefined;
}) {
  return (
    <header className="ranking-hero-panel">
      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge className="border-gold/50 bg-gold/20 text-gold hover:bg-gold/20">
            <Trophy className="mr-1.5 h-3.5 w-3.5" />
            Top Consultores
          </Badge>
        </div>

        <h1 className="max-w-4xl text-4xl font-extrabold leading-[1.02] text-[#071a42] md:text-6xl">
          Ranking Master - {activeUnitName}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[#526a9a] md:text-base">
          O topo é reservado para quem tem responsabilidade como resultado
        </p>
      </div>

      <div className="min-w-0 lg:min-w-[320px]">
        <MetricTile
          icon={Crown}
          label="Líder"
          value={metricValue(isLoading, leader?.name ?? "--")}
          detail={leader ? `${leader.taxaFeita} taxas` : "sem líder"}
          tone="gold"
        />
      </div>
    </header>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  detail: string;
  tone: "gold" | "blue";
}) {
  return (
    <div className={cn("ranking-metric-tile", `ranking-metric-${tone}`)}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase text-white/60">{label}</div>
          <div className="mt-2 truncate text-2xl font-extrabold leading-none text-white">
            {value}
          </div>
        </div>
        <div className="ranking-metric-icon">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3 truncate text-xs text-white/60">{detail}</div>
    </div>
  );
}

function ElitePodium({
  members,
  topTaxaFeita,
}: {
  members: Array<RankingMember>;
  topTaxaFeita: number;
}) {
  return (
    <section className="ranking-stage-panel" aria-label="Top 3 consultores">
      <div className="ranking-stage-title">
        <div>
          <div className="text-xs font-semibold uppercase text-gold">Top 3 consultores</div>
          <h2 className="mt-1 text-2xl font-extrabold leading-none text-white md:text-3xl">
            Pódio do mês
          </h2>
        </div>
        <div className="hidden items-center gap-2 text-sm text-white/60 md:flex">
          <Zap className="h-4 w-4 text-gold" />
          Ordenado por matrículas pagas
        </div>
      </div>

      <div className="ranking-podium-grid">
        {members.map((member) => (
          <ChampionCard
            key={member.userId}
            member={member}
            progress={progressWidth(member.taxaFeita, topTaxaFeita)}
          />
        ))}
      </div>
    </section>
  );
}

function ChampionCard({ member, progress }: { member: RankingMember; progress: number }) {
  const visual = getRankVisual(member.rank);
  const Icon = visual.icon;
  const podiumHeight = member.rank === 1 ? 168 : member.rank === 2 ? 128 : 112;

  return (
    <article
      className={cn("ranking-podium-card", visual.cardClass)}
      data-rank={member.rank}
      style={
        {
          "--podium-height": `${podiumHeight}px`,
          "--entry-delay": `${member.rank * 90}ms`,
        } as React.CSSProperties
      }
    >
      <div className="ranking-person-card">
        <div className="ranking-person-shine" />
        <div className="flex items-start justify-between gap-3">
          <Badge className={cn("ranking-medal-badge", visual.badgeClass)}>
            <Icon className="mr-1.5 h-4 w-4" />
            {visual.medal}
          </Badge>
          <div className="ranking-rank-chip">#{member.rank}</div>
        </div>

        <div className="mt-5 flex flex-col items-center text-center">
          <div className="ranking-avatar-frame">
            {member.rank === 1 && <Crown className="ranking-floating-crown h-10 w-10" />}
            <Avatar className="h-28 w-28 border-4 border-white/20 bg-white/10 shadow-2xl md:h-32 md:w-32">
              <AvatarImage src={member.avatarUrl ?? undefined} alt={member.name} />
              <AvatarFallback className="bg-gradient-primary text-3xl font-extrabold text-white">
                {getInitials(member.name)}
              </AvatarFallback>
            </Avatar>
          </div>

          <h3 className="mt-5 w-full truncate text-xl font-extrabold leading-tight text-white">
            {member.name}
          </h3>
          <p className="mt-1 w-full truncate text-xs text-white/50">{member.email}</p>

          <div className="mt-5 flex w-full items-end justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.07] p-3">
            <div className="text-left">
              <div className="text-4xl font-extrabold leading-none text-white">
                {member.taxaFeita}
              </div>
              <div className="mt-1 text-xs text-white/50">taxas feitas</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-white">
                {formatPercent(member.conversionRate)}
              </div>
              <div className="mt-1 text-xs text-white/50">conversão</div>
            </div>
          </div>

          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className={cn("h-full rounded-full", visual.barClass)}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className={cn("ranking-podium-base", visual.baseClass)}>
        <span className="ranking-podium-number">{member.rank}</span>
      </div>
    </article>
  );
}

function RankingBoard({
  members,
  topTaxaFeita,
}: {
  members: Array<RankingMember>;
  topTaxaFeita: number;
}) {
  return (
    <section className="ranking-board-panel">
      <div className="flex flex-col gap-2 border-b border-white/10 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase text-white/50">Classificação geral</div>
          <h2 className="mt-1 text-xl font-extrabold leading-tight text-white">
            Esteira da equipe
          </h2>
        </div>
        <Badge className="w-fit border-white/20 bg-white/10 text-white hover:bg-white/10">
          <Flame className="mr-1.5 h-3.5 w-3.5 text-gold" />
          {members.length} consultores
        </Badge>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="w-[96px] pl-5 text-white/50">Posição</TableHead>
              <TableHead className="min-w-[240px] text-white/50">Consultor</TableHead>
              <TableHead className="min-w-[120px] text-right text-white/50">Taxas</TableHead>
              <TableHead className="min-w-[100px] text-right text-white/50">Leads</TableHead>
              <TableHead className="min-w-[116px] text-right text-white/50">Conversão</TableHead>
              <TableHead className="min-w-[120px] text-white/50">Última taxa</TableHead>
              <TableHead className="min-w-[180px] pr-5 text-white/50">Ritmo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <RankingRow
                key={member.userId}
                member={member}
                progress={progressWidth(member.taxaFeita, topTaxaFeita)}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function RankingRow({ member, progress }: { member: RankingMember; progress: number }) {
  const visual = getRankVisual(member.rank);
  const Icon = visual.icon;

  return (
    <TableRow className="border-white/10 hover:bg-white/[0.06]">
      <TableCell className="pl-5 font-semibold">
        <div className="flex items-center gap-2 text-white">
          <Icon className={cn("h-4 w-4", visual.iconClass)} />#{member.rank}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="h-10 w-10 border border-white/20 bg-white/10">
            <AvatarImage src={member.avatarUrl ?? undefined} alt={member.name} />
            <AvatarFallback className="bg-white/10 text-xs font-semibold text-white">
              {getInitials(member.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate font-semibold text-white">{member.name}</div>
            <div className="truncate text-xs text-white/50">{member.email}</div>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right text-lg font-extrabold text-gold">
        {member.taxaFeita}
      </TableCell>
      <TableCell className="text-right text-white/70">{member.leads}</TableCell>
      <TableCell className="text-right text-white/70">
        {formatPercent(member.conversionRate)}
      </TableCell>
      <TableCell className="text-white/60">{formatDate(member.lastTaxaAt)}</TableCell>
      <TableCell className="pr-5">
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className={cn("h-full rounded-full", visual.barClass)}
            style={{ width: `${progress}%` }}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}

function SpotlightPanel({ leader }: { leader: RankingMember | undefined }) {
  return (
    <aside className="ranking-spotlight-panel">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase text-gold">Destaque</div>
          <h2 className="mt-1 text-xl font-extrabold leading-tight text-white">
            Consultor em foco
          </h2>
        </div>
        <Award className="h-7 w-7 text-gold" />
      </div>

      {leader ? (
        <div className="mt-6">
          <div className="ranking-leader-portrait">
            <Crown className="absolute -top-6 left-1/2 h-12 w-12 -translate-x-1/2 text-gold drop-shadow-[0_8px_18px_rgba(18,54,201,0.45)]" />
            <Avatar className="h-32 w-32 border-4 border-gold/50 bg-white/10">
              <AvatarImage src={leader.avatarUrl ?? undefined} alt={leader.name} />
              <AvatarFallback className="bg-gradient-gold text-4xl font-extrabold text-gold-foreground">
                {getInitials(leader.name)}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="mt-5 text-center">
            <div className="truncate text-2xl font-extrabold text-white">{leader.name}</div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <MiniScore label="Taxas" value={leader.taxaFeita} />
            <MiniScore label="Conversão" value={formatPercent(leader.conversionRate)} />
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function MiniScore({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.07] p-3 text-center">
      <div className="text-2xl font-extrabold leading-none text-white">{value}</div>
      <div className="mt-1 text-xs text-white/50">{label}</div>
    </div>
  );
}

function EmptyRankingPanel() {
  return (
    <section className="ranking-board-panel p-6">
      <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-gold">
          <Trophy className="h-8 w-8" />
        </div>
        <h2 className="mt-5 text-2xl font-extrabold text-white">Nenhum consultor encontrado</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-white/60">
          Cadastre consultores ativos na unidade para montar o ranking da Taxa Feita.
        </p>
      </div>
    </section>
  );
}

function RankingLoading() {
  return (
    <section className="ranking-board-panel p-5">
      <div className="mb-5 h-7 w-64 animate-pulse rounded bg-white/10" />
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-white/10 bg-white/[0.06] p-5">
            <div className="mx-auto h-28 w-28 animate-pulse rounded-full bg-white/10" />
            <div className="mx-auto mt-5 h-5 w-36 animate-pulse rounded bg-white/10" />
            <div className="mt-6 h-24 animate-pulse rounded-lg bg-white/10" />
          </div>
        ))}
      </div>
    </section>
  );
}

function getRankVisual(rank: number): {
  icon: LucideIcon;
  medal: string;
  cardClass: string;
  badgeClass: string;
  baseClass: string;
  barClass: string;
  iconClass: string;
} {
  if (rank === 1) {
    return {
      icon: Crown,
      medal: "Ouro",
      cardClass: "ranking-place-gold",
      badgeClass: "border-gold/50 bg-gold/20 text-gold",
      baseClass: "ranking-base-gold",
      barClass: "bg-gradient-gold",
      iconClass: "text-gold",
    };
  }

  if (rank === 2) {
    return {
      icon: Medal,
      medal: "Prata",
      cardClass: "ranking-place-silver",
      badgeClass: "border-slate-200/50 bg-slate-100/10 text-slate-100",
      baseClass: "ranking-base-silver",
      barClass: "bg-slate-200",
      iconClass: "text-slate-200",
    };
  }

  if (rank === 3) {
    return {
      icon: Medal,
      medal: "Bronze",
      cardClass: "ranking-place-bronze",
      badgeClass: "border-amber-700/60 bg-amber-800/20 text-amber-200",
      baseClass: "ranking-base-bronze",
      barClass: "bg-amber-600",
      iconClass: "text-amber-500",
    };
  }

  return {
    icon: Trophy,
    medal: "Equipe",
    cardClass: "ranking-place-default",
    badgeClass: "border-white/20 bg-white/10 text-white",
    baseClass: "ranking-base-default",
    barClass: "bg-primary",
    iconClass: "text-white/60",
  };
}
