export const brandColors = [
  { hex: "#011039", name: "Azul Plenarius" },
  { hex: "#0238A4", name: "Azul Royal" },
  { hex: "#FCFBFF", name: "Off White" },
];

export const pieceTypes = [
  { id: "post", label: "Post Instagram", ratio: "4:5" },
  { id: "story", label: "Story", ratio: "9:16" },
  { id: "banner", label: "Banner Site", ratio: "16:6" },
  { id: "capa", label: "Capa de Curso", ratio: "16:9" },
  { id: "ads", label: "Anúncio Facebook/Ads", ratio: "1:1" },
  { id: "comercial", label: "Material Comercial", ratio: "A4" },
  { id: "custom", label: "Personalizado", ratio: "Livre" },
];

export const objectives = [
  "Matrícula", "Campanha institucional", "Divulgação de curso",
  "Evento", "Promoção", "Conteúdo educativo",
  "Boas-vindas aos alunos", "Foto de turmas",
];

export const courses = [
  "Inseminação Artificial", "Ciências Mortuárias", "Máquinas Agrícolas",
  "Máquinas Pesadas", "Drone", "Confeitaria", "Mecânica de Moto",
  "Diagnóstico Gestacional", "Bombeiro Civil",
];

export const visualStyles = [
  "Institucional", "Premium", "Moderno", "Educacional", "Jovem", "Corporativo",
];

export const audiences = [
  "Jovens 18-25", "Profissionais em transição", "Produtores rurais",
  "Empresas e RH", "Público geral", "Ex-alunos",
];

const seed = (i: number) => `https://picsum.photos/seed/brandplen-${i}/600/600`;

export const generatedImages = Array.from({ length: 18 }).map((_, i) => ({
  id: `IMG-${2000 + i}`,
  url: seed(i + 1),
  piece: pieceTypes[i % pieceTypes.length].label,
  objective: objectives[i % objectives.length],
  course: courses[i % courses.length],
  style: visualStyles[i % visualStyles.length],
  author: ["Lucas Andrade", "Mariana Vieira", "Helena Costa", "Pedro Henrique"][i % 4],
  date: `${(i % 27) + 1}/06/2026`,
  status: ["Aprovado", "Pendente", "Em revisão", "Aprovado"][i % 4],
  credits: 4 + (i % 6),
  favorite: i % 5 === 0,
}));

export const promptRules = {
  obrigatorias: [
    "Sempre exibir o logo da Plenarius com proteção mínima",
    "Usar paleta oficial (azul-marinho, azul royal e off-white)",
    "Pessoas reais com aparência profissional e diversa",
    "Iluminação clean e profissional",
  ],
  proibidas: [
    "Tipografia serifada decorativa",
    "Fundo roxo, gradiente neon ou cores fora da paleta",
    "Imagens com baixa resolução ou ruído",
    "Elementos genéricos de banco de imagens 2010",
  ],
  tom: "Profissional, acolhedor, inspirador e orientado a crescimento.",
  estilo: "Editorial moderno com tipografia sans-serif geométrica, fotografia premium e composição limpa.",
};
