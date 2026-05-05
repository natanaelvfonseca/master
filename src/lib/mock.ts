export const kpis = {
  leads: 1284,
  qualified: 612,
  enrollments: 218,
  conversion: 17.0,
  speedToLead: "4m 12s",
  followupRate: 86,
  avgTicket: 1290,
  forecast: 1_950_000,
  revenue: 1_412_500,
  delinquency: 6.4,
  noShowRisk: 47,
  recovered: 132,
  attendance: 88,
  campaignRoi: 4.7,
};

export const revenueSeries = [
  { m: "Jan", real: 820, prev: 900 },
  { m: "Fev", real: 940, prev: 980 },
  { m: "Mar", real: 1080, prev: 1100 },
  { m: "Abr", real: 1180, prev: 1220 },
  { m: "Mai", real: 1290, prev: 1310 },
  { m: "Jun", real: 1412, prev: 1500 },
  { m: "Jul", real: 1520, prev: 1700 },
];

export const funnelData = [
  { stage: "Leads", value: 1284 },
  { stage: "Em contato", value: 940 },
  { stage: "Qualificados", value: 612 },
  { stage: "Proposta", value: 384 },
  { stage: "Pagamento", value: 268 },
  { stage: "Matriculados", value: 218 },
];

export const cityData = [
  { city: "São Paulo", leads: 312, conv: 22 },
  { city: "Rio de Janeiro", leads: 248, conv: 18 },
  { city: "Belo Horizonte", leads: 188, conv: 19 },
  { city: "Curitiba", leads: 162, conv: 16 },
  { city: "Porto Alegre", leads: 144, conv: 14 },
  { city: "Salvador", leads: 122, conv: 12 },
  { city: "Recife", leads: 108, conv: 11 },
];

export const sourceData = [
  { name: "Instagram Ads", value: 38 },
  { name: "Google Ads", value: 26 },
  { name: "Indicação", value: 18 },
  { name: "Orgânico", value: 12 },
  { name: "Outros", value: 6 },
];

export const courses = ["Estética Avançada", "Harmonização", "Microblading", "Lash Designer", "Podologia"];
export const cities = ["São Paulo", "Rio de Janeiro", "Belo Horizonte", "Curitiba", "Porto Alegre", "Salvador", "Recife"];

export type LeadStage =
  | "Novo lead" | "Em contato" | "Qualificado" | "Proposta"
  | "Pagamento pendente" | "Confirmado" | "Recuperação"
  | "Matriculado" | "No-show em risco" | "Concluído";

export const stages: LeadStage[] = [
  "Novo lead", "Em contato", "Qualificado", "Proposta",
  "Pagamento pendente", "Confirmado", "Recuperação",
  "Matriculado", "No-show em risco", "Concluído",
];

const names = [
  "Mariana Silva", "Carlos Eduardo", "Beatriz Rocha", "Felipe Souza", "Juliana Pereira",
  "Rafael Lima", "Camila Andrade", "Lucas Martins", "Patrícia Gomes", "André Ribeiro",
  "Larissa Castro", "Bruno Almeida", "Fernanda Dias", "Gustavo Nunes", "Isabela Cunha",
  "Thiago Barros", "Vanessa Melo", "Rodrigo Pinto", "Amanda Teixeira", "Eduardo Faria",
];

const sellers = ["Ana Beatriz", "Marcos Vinícius", "Helena Costa", "Pedro Henrique", "Renata Sá"];
const sources = ["Instagram", "Google", "Indicação", "Orgânico", "WhatsApp"];

export const leads = Array.from({ length: 48 }).map((_, i) => {
  const stage = stages[i % stages.length];
  const score = 40 + ((i * 17) % 60);
  return {
    id: `L-${1000 + i}`,
    name: names[i % names.length],
    course: courses[i % courses.length],
    city: cities[i % cities.length],
    source: sources[i % sources.length],
    seller: sellers[i % sellers.length],
    stage,
    score,
    hot: score > 80,
    value: 890 + ((i * 73) % 1800),
    lastContactDays: (i * 3) % 9,
    priority: score > 80 ? "Alta" : score > 60 ? "Média" : "Baixa",
  };
});

export const rankingData = [
  { pos: 1, name: "Helena Costa", initials: "HC", sales: 42, revenue: 142500, conv: 28, response: "2m 10s", followup: 94, attendance: 96, score: 982 },
  { pos: 2, name: "Pedro Henrique", initials: "PH", sales: 38, revenue: 128900, conv: 25, response: "3m 04s", followup: 91, attendance: 92, score: 921 },
  { pos: 3, name: "Ana Beatriz", initials: "AB", sales: 35, revenue: 119800, conv: 23, response: "4m 12s", followup: 88, attendance: 90, score: 884 },
  { pos: 4, name: "Marcos Vinícius", initials: "MV", sales: 31, revenue: 102300, conv: 21, response: "5m 33s", followup: 84, attendance: 87, score: 812 },
  { pos: 5, name: "Renata Sá", initials: "RS", sales: 27, revenue: 91200, conv: 19, response: "6m 18s", followup: 79, attendance: 85, score: 754 },
  { pos: 6, name: "Diego Martins", initials: "DM", sales: 22, revenue: 74500, conv: 16, response: "8m 02s", followup: 72, attendance: 80, score: 668 },
];

export const conversations = [
  { id: 1, seller: "Helena Costa", lead: "Mariana Silva", channel: "WhatsApp", score: 92, sentiment: "Positivo", duration: "12m", objection: "Preço", strength: "Escuta ativa", improvement: "Fechamento", convChance: 84 },
  { id: 2, seller: "Pedro Henrique", lead: "Carlos Eduardo", channel: "Ligação", score: 78, sentiment: "Neutro", duration: "8m", objection: "Tempo", strength: "Argumentação", improvement: "Urgência", convChance: 62 },
  { id: 3, seller: "Marcos Vinícius", lead: "Beatriz Rocha", channel: "WhatsApp", score: 54, sentiment: "Negativo", duration: "5m", objection: "Confiança", strength: "—", improvement: "Tom de voz", convChance: 28 },
  { id: 4, seller: "Ana Beatriz", lead: "Felipe Souza", channel: "Ligação", score: 88, sentiment: "Positivo", duration: "15m", objection: "Parcelamento", strength: "Empatia", improvement: "Follow-up", convChance: 79 },
  { id: 5, seller: "Renata Sá", lead: "Juliana Pereira", channel: "WhatsApp", score: 71, sentiment: "Neutro", duration: "9m", objection: "Data do curso", strength: "Conhecimento técnico", improvement: "Velocidade", convChance: 55 },
];

export const recoveryData = [
  { name: "Lembrete pré-curso", sent: 412, opened: 386, recovered: 78 },
  { name: "Cobrança amigável", sent: 268, opened: 240, recovered: 112 },
  { name: "Reativação no-show", sent: 184, opened: 162, recovered: 64 },
  { name: "Confirmação 24h", sent: 218, opened: 210, recovered: 196 },
];

export const campaigns = [
  { name: "Estética SP - Verão", channel: "Instagram", spend: 18500, leads: 312, cpl: 59, roi: 5.2, status: "Ativa" },
  { name: "Harmonização RJ", channel: "Google", spend: 12400, leads: 188, cpl: 66, roi: 4.1, status: "Ativa" },
  { name: "Microblading BH", channel: "Instagram", spend: 9800, leads: 142, cpl: 69, roi: 3.8, status: "Ativa" },
  { name: "Lash Designer Sul", channel: "Meta + Google", spend: 14200, leads: 224, cpl: 63, roi: 4.6, status: "Ativa" },
  { name: "Podologia Nordeste", channel: "Instagram", spend: 7200, leads: 96, cpl: 75, roi: 2.9, status: "Pausada" },
];

export const integrations = [
  { name: "Sistema Acadêmico", desc: "Sincroniza turmas, alunos e matrículas", status: "Conectado", icon: "GraduationCap" },
  { name: "WhatsApp Business", desc: "Mensagens, automações e bots", status: "Conectado", icon: "MessageCircle" },
  { name: "E-mail Marketing", desc: "Disparos e jornadas automatizadas", status: "Conectado", icon: "Mail" },
  { name: "Telefonia / VoIP", desc: "Ligações, gravações e análise IA", status: "Conectado", icon: "Phone" },
  { name: "Meta Ads", desc: "Campanhas de Instagram e Facebook", status: "Conectado", icon: "Megaphone" },
  { name: "Google Ads", desc: "Pesquisa, Display e YouTube", status: "Conectado", icon: "Search" },
  { name: "Formulários / LP", desc: "Captura de leads em landing pages", status: "Conectado", icon: "FileText" },
  { name: "Planilhas / Sheets", desc: "Importação e exportação de dados", status: "Conectado", icon: "Table" },
  { name: "Financeiro / Pagamentos", desc: "Boletos, Pix, cartão e recorrência", status: "Conectado", icon: "CreditCard" },
  { name: "API Aberta", desc: "Webhooks e integrações sob medida", status: "Disponível", icon: "Code2" },
];

export const insights = [
  { tone: "warning", title: "Speed-to-lead acima de 5min", body: "Leads sem atendimento em até 5 minutos estão reduzindo sua conversão em 31%. Ative roteamento automático.", impact: "+R$ 184k previstos" },
  { tone: "success", title: "Cidade com alta demanda", body: "Florianópolis tem demanda 2.4x acima da oferta. Recomendamos abrir nova turma de Harmonização.", impact: "+58 matrículas" },
  { tone: "info", title: "Curso com melhor ROI", body: "Microblading apresenta ROI de 5.8x e ticket médio 24% acima da média.", impact: "Priorizar mídia" },
  { tone: "warning", title: "Equipe perde no follow-up", body: "Time de Curitiba converte bem na 1ª etapa, mas perde 38% dos leads quentes na fase de proposta.", impact: "Treinamento sugerido" },
  { tone: "success", title: "Automação reduziu perdas", body: "Fluxo de confirmação 24h reduziu no-show em 27% nas últimas 4 turmas.", impact: "R$ 312k preservados" },
];
