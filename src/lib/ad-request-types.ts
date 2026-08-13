export const AD_REQUEST_STATUSES = [
  "novo",
  "em_producao",
  "aguardando_aprovacao",
  "concluido",
  "cancelado",
] as const;

export type AdRequestStatus = (typeof AD_REQUEST_STATUSES)[number];

export const adRequestStatusLabels: Record<AdRequestStatus, string> = {
  novo: "Nova",
  em_producao: "Em produção",
  aguardando_aprovacao: "Aguardando aprovação",
  concluido: "Concluída",
  cancelado: "Cancelada",
};

export type AdRequest = {
  id: string;
  unitId: string;
  unitName: string;
  courseId: string | null;
  courseName: string;
  city: string;
  consultantId: string | null;
  consultantName: string;
  classDate: string;
  observation: string;
  status: AdRequestStatus;
  masterNote: string;
  createdById: string | null;
  createdByName: string;
  createdAt: string;
  dueAt: string;
  updatedAt: string;
  completedAt: string | null;
  isRead: boolean;
};
