export type CommercialStatus = "active" | "inactive";

export type CourseRecord = {
  id: string;
  unitId: string;
  name: string;
  value: number;
  category: string | null;
  status: CommercialStatus;
  createdAt: string;
};

export type AcquisitionChannelRecord = {
  id: string;
  unitId: string;
  name: string;
  type: string;
  status: CommercialStatus;
  createdAt: string;
};

export type LeadStage =
  | "Novo lead"
  | "Em contato"
  | "Qualificado"
  | "Proposta"
  | "Pagamento pendente"
  | "Confirmado"
  | "Recuperação"
  | "Matriculado";

export type LeadRecord = {
  id: string;
  unitId: string;
  unitName: string;
  fullName: string;
  phone: string;
  email: string | null;
  courseId: string | null;
  courseName: string | null;
  courseValue: number | null;
  acquisitionChannelId: string | null;
  acquisitionChannelName: string | null;
  observations: string | null;
  stage: LeadStage;
  createdAt: string;
};
