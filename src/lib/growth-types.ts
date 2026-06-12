import type { UnitSummary } from "@/lib/auth-types";
import type { LeadStage } from "@/lib/commercial-types";

export type GrowthScope = {
  mode: "network" | "unit";
  label: string;
  unit: UnitSummary | null;
};

export type GrowthMetrics = {
  leadsReceived: number;
  qualifiedLeads: number;
  enrollments: number;
  conversionRate: number;
  followUpRate: number;
  averageTicket: number;
  leadsWithSource: number;
  sourceConversionRate: number;
  activeChannels: number;
  paidChannels: number;
};

export type GrowthSourceMetric = {
  source: string;
  leads: number;
  enrollments: number;
  conversionRate: number;
};

export type GrowthCourseMetric = {
  course: string;
  leads: number;
  enrollments: number;
  conversionRate: number;
};

export type GrowthCityMetric = {
  city: string;
  leads: number;
  enrollments: number;
  conversionRate: number;
};

export type GrowthUnitMetric = {
  id: string;
  name: string;
  leads: number;
  enrollments: number;
  conversionRate: number;
};

export type GrowthFunnelMetric = {
  stage: LeadStage;
  leads: number;
};

export type GrowthResponse = {
  scope: GrowthScope;
  availableUnits: Array<UnitSummary>;
  metrics: GrowthMetrics;
  sources: Array<GrowthSourceMetric>;
  courses: Array<GrowthCourseMetric>;
  cities: Array<GrowthCityMetric>;
  units: Array<GrowthUnitMetric>;
  funnel: Array<GrowthFunnelMetric>;
};
