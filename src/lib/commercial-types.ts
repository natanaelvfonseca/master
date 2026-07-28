export type CommercialStatus = "active" | "inactive";

export function formatCommercialDate(value: string | null | undefined) {
  if (!value) return "";
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export function buildTurmaLabel(input: {
  courseName: string;
  city: string;
  state: string;
  classDate: string;
}) {
  return `${input.courseName} · ${input.city}/${input.state} · ${formatCommercialDate(input.classDate)}`;
}

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

export type TurmaRecord = {
  id: string;
  unitId: string;
  unitName: string;
  courseId: string;
  courseName: string;
  city: string;
  state: string;
  name: string;
  classDate: string;
  status: CommercialStatus;
  consultantIds: Array<string>;
  consultantNames: Array<string>;
};

export type LeadStage =
  | "Leads Novos"
  | "Em Atendimento"
  | "Follow UP"
  | "Aguardando matrícula"
  | "Lead Sem retorno"
  | "Matriculado";

export type StudentStage =
  | "Matriculado"
  | "Contrato Feito"
  | "Aluno Confirmado"
  | "Aluno Presente"
  | "Aluno Cancelado";

export type LeadRecord = {
  id: string;
  unitId: string;
  unitName: string;
  fullName: string;
  phone: string;
  phone2: string | null;
  email: string | null;
  city: string | null;
  turmaId: string | null;
  turmaName: string | null;
  turmaDate: string | null;
  courseId: string | null;
  courseName: string | null;
  courseValue: number | null;
  acquisitionChannelId: string | null;
  acquisitionChannelName: string | null;
  createdById: string | null;
  createdByName: string | null;
  observations: string | null;
  campaignName: string | null;
  formId: string | null;
  stage: LeadStage;
  studentStage: StudentStage;
  createdAt: string;
};
