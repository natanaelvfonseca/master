export const brandColors = [
  { hex: "#0B2A6F", name: "Azul Profundo" },
  { hex: "#1746B8", name: "Azul Royal" },
  { hex: "#3F73D8", name: "Azul Medio Frio" },
  { hex: "#DCE8FF", name: "Azul Claro Suave" },
  { hex: "#FFFFFF", name: "Branco" },
  { hex: "#E3AA2B", name: "Dourado Mostarda" },
];

export const pieceTypes = [
  { id: "post", label: "Post Instagram", ratio: "4:5" },
  { id: "story", label: "Story", ratio: "9:16" },
  { id: "banner", label: "Banner Site", ratio: "16:6" },
  { id: "capa", label: "Capa de Curso", ratio: "16:9" },
  { id: "ads", label: "Anuncio Facebook/Ads", ratio: "1:1" },
  { id: "comercial", label: "Material Comercial", ratio: "A4" },
  { id: "custom", label: "Personalizado", ratio: "Livre" },
];

export const objectives = [
  "Matricula", "Campanha institucional", "Divulgacao de curso",
  "Evento", "Promocao", "Conteudo educativo",
  "Boas-vindas aos alunos", "Foto de turmas",
];

export const courses = [
  "Inseminacao Artificial", "Ciencias Mortuarias", "Maquinas Agricolas",
  "Maquinas Pesadas", "Drone", "Confeitaria", "Mecanica de Moto",
  "Diagnostico Gestacional", "Bombeiro Civil",
];

export const visualStyles = [
  "Institucional", "Premium", "Moderno", "Educacional", "Jovem", "Corporativo",
];

export const audiences = [
  "Jovens 18-25", "Profissionais em transicao", "Produtores rurais",
  "Empresas e RH", "Publico geral", "Ex-alunos",
];

const palettePairs = [
  ["#0B2A6F", "#1746B8", "#3F73D8"],
  ["#1746B8", "#3F73D8", "#DCE8FF"],
  ["#0B2A6F", "#DCE8FF", "#E3AA2B"],
  ["#1746B8", "#FFFFFF", "#E3AA2B"],
  ["#0B2A6F", "#3F73D8", "#FFFFFF"],
  ["#1746B8", "#DCE8FF", "#E3AA2B"],
];

export const generatedImages = Array.from({ length: 18 }).map((_, i) => ({
  id: `IMG-${2000 + i}`,
  palette: palettePairs[i % palettePairs.length],
  piece: pieceTypes[i % pieceTypes.length].label,
  objective: objectives[i % objectives.length],
  course: courses[i % courses.length],
  style: visualStyles[i % visualStyles.length],
  author: ["Lucas Andrade", "Mariana Vieira", "Helena Costa", "Pedro Henrique"][i % 4],
  date: `${(i % 27) + 1}/06/2026`,
  status: ["Aprovado", "Pendente", "Em revisao", "Aprovado"][i % 4],
  credits: 4 + (i % 6),
  favorite: i % 5 === 0,
}));

export const promptRules = {
  obrigatorias: [
    "Sempre exibir o logo da Plenarius com protecao minima",
    "Usar a paleta oficial: azul profundo, azul royal, azul medio frio, azul claro suave, branco e dourado mostarda",
    "Pessoas reais com aparencia profissional e diversa",
    "Iluminacao clean, forte e profissional",
  ],
  proibidas: [
    "Tipografia serifada decorativa",
    "Fundo roxo, gradiente neon ou cores fora da paleta",
    "Imagens com baixa resolucao ou ruido",
    "Elementos genericos de banco de imagens 2010",
  ],
  tom: "Profissional, forte, premium e orientado a crescimento.",
  estilo: "Visual tech premium com contraste elegante, azuis vibrantes, branco limpo e dourado controlado.",
};
