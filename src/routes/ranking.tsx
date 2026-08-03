import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, CalendarDays, Trophy, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { getInitials } from "@/lib/auth-types";
import type { RankingMember, RankingResponse } from "@/lib/ranking-types";
import { cn } from "@/lib/utils";

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
});

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

type CalendarMonth = {
  key: string;
  label: string;
  range: string;
};

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

function formatPercent(value: number) {
  return `${percentFormatter.format(value)}%`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getCalendarMonth(): CalendarMonth {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value ?? now.getFullYear());
  const month = Number(parts.find((part) => part.type === "month")?.value ?? now.getMonth() + 1);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const referenceDate = new Date(Date.UTC(year, month - 1, 15, 12));
  const paddedMonth = String(month).padStart(2, "0");

  return {
    key: `${year}-${paddedMonth}`,
    label: capitalize(monthFormatter.format(referenceDate)),
    range: `01/${paddedMonth}/${year} — ${String(lastDay).padStart(2, "0")}/${paddedMonth}/${year}`,
  };
}

export const Route = createFileRoute("/ranking")({
  head: () => ({ meta: [{ title: "Ranking Master - Master" }] }),
  component: Ranking,
});

function Ranking() {
  const { session, loading: authLoading } = useAuth();
  const [data, setData] = React.useState<RankingResponse | null>(null);
  const [loadingRanking, setLoadingRanking] = React.useState(false);
  const [calendarMonth, setCalendarMonth] = React.useState(getCalendarMonth);
  const activeUnitId = session?.activeUnit?.id ?? "";
  const activeUnitName = data?.unit.name ?? session?.activeUnit?.name ?? "Unidade ativa";
  const isLoading = authLoading || loadingRanking;
  const ranking = data?.ranking ?? [];

  React.useEffect(() => {
    const intervalId = window.setInterval(() => {
      const nextMonth = getCalendarMonth();
      setCalendarMonth((current) => (current.key === nextMonth.key ? current : nextMonth));
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

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
  }, [activeUnitId, authLoading, calendarMonth.key]);

  return (
    <div className="relative -m-4 min-h-[calc(100vh-4rem)] overflow-hidden bg-[#f4efe8] text-[#071a42] md:-m-6 lg:-m-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(7,26,66,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(7,26,66,.045) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <main className="relative mx-auto max-w-[1480px] px-4 py-5 md:px-7 md:py-7 lg:px-10 lg:py-9">
        <ScoreboardHeader
          activeUnitName={activeUnitName}
          calendarMonth={calendarMonth}
          leader={ranking[0]}
          loading={isLoading}
        />

        {isLoading ? (
          <RankingLoading />
        ) : ranking.length ? (
          <div className="mt-8 space-y-10">
            <MonthlyLedger data={data} />
            <FrontRow members={ranking.slice(0, 3)} />
            <RankingBoard members={ranking} />
          </div>
        ) : (
          <EmptyRankingPanel calendarMonth={calendarMonth} />
        )}
      </main>
    </div>
  );
}

function ScoreboardHeader({
  activeUnitName,
  calendarMonth,
  leader,
  loading,
}: {
  activeUnitName: string;
  calendarMonth: CalendarMonth;
  leader: RankingMember | undefined;
  loading: boolean;
}) {
  return (
    <header className="relative overflow-hidden border-2 border-[#071a42] bg-[#071a42] text-white shadow-[8px_8px_0_#f97316]">
      <div className="absolute inset-y-0 right-[35%] hidden w-px bg-white/15 lg:block" />
      <div className="absolute -right-24 -top-24 h-64 w-64 rotate-12 border-[38px] border-[#1236c9] opacity-50" />
      <div className="relative grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,.48fr)]">
        <div className="px-5 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-11">
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-black uppercase tracking-[0.22em] text-white/60">
            <span className="bg-[#f97316] px-3 py-1.5 text-white">Placar comercial</span>
            <span>{activeUnitName}</span>
          </div>

          <div className="mt-7 max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#f6cf62]">
              Mês em jogo
            </p>
            <h1 className="mt-2 text-[clamp(2.7rem,7vw,6.8rem)] font-black uppercase leading-[0.82] tracking-[-0.07em]">
              {calendarMonth.label}
            </h1>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/20 pt-5 text-sm text-white/75">
            <span className="flex items-center gap-2 font-semibold">
              <CalendarDays className="h-4 w-4 text-[#f97316]" />
              {calendarMonth.range}
            </span>
            <span>O placar considera somente o mês atual.</span>
          </div>
        </div>

        <div className="relative flex min-h-[250px] items-end border-t-2 border-[#071a42] bg-[#f6cf62] p-6 text-[#071a42] lg:border-l-2 lg:border-t-0 lg:p-8">
          <div className="absolute left-6 top-6 text-[10px] font-black uppercase tracking-[0.26em]">
            Liderança do mês
          </div>
          <div className="absolute right-5 top-4 text-[84px] font-black leading-none text-[#071a42]/10">
            01
          </div>

          {loading ? (
            <div className="w-full animate-pulse space-y-4">
              <div className="h-16 w-16 rounded-full bg-[#071a42]/15" />
              <div className="h-7 w-3/4 bg-[#071a42]/15" />
              <div className="h-5 w-1/2 bg-[#071a42]/15" />
            </div>
          ) : leader ? (
            <div className="flex min-w-0 items-end gap-4">
              <Avatar className="h-20 w-20 shrink-0 border-4 border-[#071a42] bg-white sm:h-24 sm:w-24">
                <AvatarImage src={leader.avatarUrl ?? undefined} alt={leader.name} />
                <AvatarFallback className="bg-[#1236c9] text-xl font-black text-white">
                  {getInitials(leader.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 pb-1">
                <div className="truncate text-2xl font-black leading-tight sm:text-3xl">
                  {leader.name}
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm font-bold">
                  <Trophy className="h-4 w-4" />
                  {leader.taxaFeita} taxas feitas
                </div>
              </div>
            </div>
          ) : (
            <p className="text-lg font-bold">O primeiro nome do mês ainda será escrito.</p>
          )}
        </div>
      </div>
    </header>
  );
}

function MonthlyLedger({ data }: { data: RankingResponse | null }) {
  const totals = data?.totals ?? { consultants: 0, leads: 0, taxaFeita: 0 };
  const metrics = [
    { label: "Equipe no placar", value: totals.consultants, suffix: "consultores" },
    { label: "Leads do mês", value: totals.leads, suffix: "recebidos" },
    { label: "Taxas feitas", value: totals.taxaFeita, suffix: "confirmadas" },
  ];

  return (
    <section aria-label="Resumo mensal" className="border-y-2 border-[#071a42] bg-white/60">
      <div className="grid md:grid-cols-3">
        {metrics.map((metric, index) => (
          <div
            key={metric.label}
            className={cn(
              "flex items-end justify-between gap-4 px-5 py-5 sm:px-7",
              index > 0 && "border-t border-[#071a42]/25 md:border-l md:border-t-0",
            )}
          >
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#071a42]/55">
                {metric.label}
              </div>
              <div className="mt-2 text-4xl font-black leading-none tracking-[-0.06em]">
                {metric.value}
              </div>
            </div>
            <span className="pb-1 text-xs font-bold uppercase tracking-wider text-[#f97316]">
              {metric.suffix}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function FrontRow({ members }: { members: Array<RankingMember> }) {
  if (!members.length) {
    return null;
  }

  return (
    <section aria-labelledby="front-row-title">
      <SectionMarker
        number="01"
        eyebrow="Linha de frente"
        title="Quem puxou o placar"
        id="front-row-title"
      />

      <div className="mt-5 grid gap-4 lg:grid-cols-12 lg:grid-rows-2">
        {members.map((member) => (
          <FrontRowMember key={member.userId} member={member} />
        ))}
      </div>
    </section>
  );
}

function FrontRowMember({ member }: { member: RankingMember }) {
  const isLeader = member.rank === 1;
  const tone = member.rank === 1 ? "navy" : member.rank === 2 ? "orange" : "cream";

  return (
    <article
      className={cn(
        "relative overflow-hidden border-2 border-[#071a42] p-5 sm:p-6",
        isLeader ? "lg:col-span-7 lg:row-span-2 lg:min-h-[390px]" : "lg:col-span-5",
        tone === "navy" && "bg-[#1236c9] text-white",
        tone === "orange" && "bg-[#f97316] text-white",
        tone === "cream" && "bg-[#fff4ea] text-[#071a42]",
      )}
    >
      <div
        className={cn(
          "absolute -right-3 -top-8 font-black leading-none tracking-[-0.09em]",
          isLeader ? "text-[190px]" : "text-[126px]",
          tone === "cream" ? "text-[#071a42]/[0.07]" : "text-white/[0.09]",
        )}
      >
        {String(member.rank).padStart(2, "0")}
      </div>

      <div
        className={cn(
          "relative flex h-full min-w-0",
          isLeader ? "flex-col justify-between" : "items-end gap-4",
        )}
      >
        <div
          className={cn(
            "flex min-w-0",
            isLeader ? "items-start justify-between" : "items-center gap-4",
          )}
        >
          <Avatar
            className={cn(
              "shrink-0 border-4",
              isLeader ? "h-24 w-24 border-[#f6cf62] sm:h-28 sm:w-28" : "h-16 w-16 border-white/70",
            )}
          >
            <AvatarImage src={member.avatarUrl ?? undefined} alt={member.name} />
            <AvatarFallback
              className={cn(
                "font-black",
                tone === "cream" ? "bg-[#071a42] text-white" : "bg-white text-[#071a42]",
              )}
            >
              {getInitials(member.name)}
            </AvatarFallback>
          </Avatar>
          {isLeader ? (
            <div className="border-2 border-[#f6cf62] px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#f6cf62]">
              Posição 01
            </div>
          ) : null}
        </div>

        <div className={cn("relative min-w-0", isLeader ? "mt-12" : "flex-1")}>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] opacity-65">
            {member.rank === 1
              ? "Primeiro lugar"
              : member.rank === 2
                ? "Segundo lugar"
                : "Terceiro lugar"}
          </div>
          <h3
            className={cn(
              "mt-1 truncate font-black leading-none tracking-[-0.05em]",
              isLeader ? "text-4xl sm:text-5xl" : "text-2xl",
            )}
          >
            {member.name}
          </h3>

          <div
            className={cn(
              "mt-5 flex flex-wrap gap-x-6 gap-y-3 border-t pt-4",
              tone === "cream" ? "border-[#071a42]/25" : "border-white/30",
            )}
          >
            <FrontStat label="Taxas" value={member.taxaFeita} />
            <FrontStat label="Leads" value={member.leads} />
            <FrontStat label="Conversão" value={formatPercent(member.conversionRate)} />
          </div>
        </div>
      </div>
    </article>
  );
}

function FrontStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xl font-black leading-none">{value}</div>
      <div className="mt-1 text-[9px] font-black uppercase tracking-[0.16em] opacity-60">
        {label}
      </div>
    </div>
  );
}

function RankingBoard({ members }: { members: Array<RankingMember> }) {
  return (
    <section aria-labelledby="ranking-board-title" className="pb-6">
      <SectionMarker
        number="02"
        eyebrow="Classificação completa"
        title="Placar da equipe"
        id="ranking-board-title"
      />

      <div className="mt-5 border-2 border-[#071a42] bg-[#fffaf5] shadow-[6px_6px_0_rgba(7,26,66,.12)]">
        <div className="hidden grid-cols-[76px_minmax(220px,1fr)_100px_120px_120px] border-b-2 border-[#071a42] bg-[#071a42] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/65 lg:grid">
          <span>Posição</span>
          <span>Consultor</span>
          <span className="text-right">Leads</span>
          <span className="text-right">Taxas feitas</span>
          <span className="text-right">Conversão</span>
        </div>

        <div>
          {members.map((member) => (
            <BoardRow key={member.userId} member={member} />
          ))}
        </div>
      </div>
    </section>
  );
}

function BoardRow({ member }: { member: RankingMember }) {
  const topThree = member.rank <= 3;

  return (
    <article
      className={cn(
        "group relative grid grid-cols-[54px_minmax(0,1fr)] items-center gap-x-3 border-b border-[#071a42]/20 px-4 py-4 transition-colors last:border-b-0 hover:bg-white lg:grid-cols-[76px_minmax(220px,1fr)_100px_120px_120px] lg:gap-0",
        topThree && "bg-[#fff4ea]",
      )}
    >
      {topThree ? <div className="absolute inset-y-0 left-0 w-1.5 bg-[#f97316]" /> : null}

      <div className="text-2xl font-black tracking-[-0.08em] text-[#1236c9]">
        {String(member.rank).padStart(2, "0")}
      </div>

      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="h-11 w-11 shrink-0 border-2 border-[#071a42] bg-white">
          <AvatarImage src={member.avatarUrl ?? undefined} alt={member.name} />
          <AvatarFallback className="bg-[#f6cf62] text-xs font-black text-[#071a42]">
            {getInitials(member.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="truncate font-black text-[#071a42]">{member.name}</div>
          <div className="truncate text-xs text-[#071a42]/50">{member.email}</div>
        </div>
      </div>

      <div className="col-span-2 mt-3 grid grid-cols-3 border-t border-[#071a42]/15 pt-3 lg:contents">
        <MobileMetric label="Leads" value={member.leads} />
        <MobileMetric label="Taxas feitas" value={member.taxaFeita} emphasis />
        <MobileMetric label="Conversão" value={formatPercent(member.conversionRate)} />
      </div>
    </article>
  );
}

function MobileMetric({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className="text-right">
      <span className="block text-[8px] font-black uppercase tracking-wider text-[#071a42]/45 lg:hidden">
        {label}
      </span>
      <span className={cn("font-black", emphasis ? "text-lg text-[#f97316]" : "text-[#071a42]")}>
        {value}
      </span>
    </div>
  );
}

function SectionMarker({
  number,
  eyebrow,
  title,
  id,
}: {
  number: string;
  eyebrow: string;
  title: string;
  id: string;
}) {
  return (
    <div className="flex items-end gap-4 border-b-2 border-[#071a42] pb-3">
      <span className="text-5xl font-black leading-[0.78] tracking-[-0.1em] text-[#f97316]">
        {number}
      </span>
      <div>
        <div className="text-[9px] font-black uppercase tracking-[0.24em] text-[#071a42]/50">
          {eyebrow}
        </div>
        <h2
          id={id}
          className="mt-1 text-2xl font-black leading-none tracking-[-0.04em] sm:text-3xl"
        >
          {title}
        </h2>
      </div>
      <ArrowUpRight className="ml-auto h-6 w-6 text-[#1236c9]" />
    </div>
  );
}

function EmptyRankingPanel({ calendarMonth }: { calendarMonth: CalendarMonth }) {
  return (
    <section className="mt-8 border-2 border-[#071a42] bg-[#fffaf5] p-7 shadow-[7px_7px_0_#f97316] sm:p-10">
      <div className="flex max-w-2xl flex-col items-start">
        <div className="flex h-16 w-16 items-center justify-center bg-[#1236c9] text-white">
          <Trophy className="h-8 w-8" />
        </div>
        <p className="mt-7 text-[10px] font-black uppercase tracking-[0.22em] text-[#f97316]">
          {calendarMonth.label}
        </p>
        <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] sm:text-4xl">
          O placar está em branco.
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#071a42]/65">
          Cadastre consultores ativos na unidade. Leads e taxas feitas aparecerão aqui somente
          dentro do mês atual.
        </p>
      </div>
    </section>
  );
}

function RankingLoading() {
  return (
    <div className="mt-8 space-y-8" aria-label="Carregando ranking">
      <div className="grid animate-pulse gap-0 border-y-2 border-[#071a42] bg-white/60 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="border-[#071a42]/20 p-6 md:border-l md:first:border-l-0">
            <div className="h-3 w-28 bg-[#071a42]/10" />
            <div className="mt-3 h-10 w-16 bg-[#071a42]/10" />
          </div>
        ))}
      </div>
      <div className="grid animate-pulse gap-4 lg:grid-cols-12">
        <div className="h-80 border-2 border-[#071a42] bg-[#1236c9]/20 lg:col-span-7" />
        <div className="space-y-4 lg:col-span-5">
          <div className="h-[152px] border-2 border-[#071a42] bg-[#f97316]/20" />
          <div className="h-[152px] border-2 border-[#071a42] bg-white/50" />
        </div>
      </div>
      <div className="border-2 border-[#071a42] bg-white/60 p-5">
        <div className="flex items-center gap-4">
          <UsersRound className="h-5 w-5 text-[#071a42]/30" />
          <div className="h-5 w-56 animate-pulse bg-[#071a42]/10" />
        </div>
      </div>
    </div>
  );
}
