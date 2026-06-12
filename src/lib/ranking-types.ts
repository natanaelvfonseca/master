import type { UnitSummary } from "@/lib/auth-types";

export type RankingMember = {
  rank: number;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  leads: number;
  taxaFeita: number;
  conversionRate: number;
  lastTaxaAt: string | null;
};

export type RankingResponse = {
  unit: UnitSummary;
  ranking: Array<RankingMember>;
  totals: {
    consultants: number;
    leads: number;
    taxaFeita: number;
  };
};
