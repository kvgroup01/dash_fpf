export type FieldType = "text" | "date" | "numeric";

export interface LeadField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
}

/**
 * Catálogo de campos do sistema pro mapeador de colunas. Cobre os dois
 * layouts que a FPF usa hoje (CRM completo; Leads+UTM) — o mapeador resolve
 * as variações de nome de coluna, não engessa layout fixo no código.
 */
export const LEAD_FIELDS: LeadField[] = [
  { key: "chave", label: "Chave", type: "text", required: true },
  { key: "data", label: "Data", type: "date" },
  { key: "nome", label: "Nome", type: "text" },
  { key: "email", label: "E-mail", type: "text" },
  { key: "telefone", label: "Telefone", type: "text" },
  { key: "origem", label: "Origem", type: "text" },
  { key: "utm_source", label: "UTM Source", type: "text" },
  { key: "utm_medium", label: "UTM Medium", type: "text" },
  { key: "utm_campaign", label: "UTM Campaign", type: "text" },
  { key: "utm_content", label: "UTM Content", type: "text" },
  { key: "utm_term", label: "UTM Term", type: "text" },
  { key: "interesse", label: "Interesse", type: "text" },
  { key: "escolaridade", label: "Escolaridade", type: "text" },
  { key: "turno", label: "Turno", type: "text" },
  { key: "status", label: "Status", type: "text" },
  { key: "vendedor", label: "Vendedor", type: "text" },
  { key: "renda_familiar", label: "Renda Familiar", type: "text" },
  { key: "contato_1", label: "1º Contato", type: "text" },
  { key: "contato_2", label: "2º Contato", type: "text" },
  { key: "contato_3", label: "3º Contato", type: "text" },
  { key: "contato_4", label: "4º Contato", type: "text" },
  { key: "motivo", label: "Motivo", type: "text" },
  { key: "agendamento", label: "Agendamento", type: "text" },
  { key: "atendimento", label: "Atendimento", type: "text" },
  { key: "orcamento", label: "Orçamento (R$)", type: "numeric" },
  { key: "fechamento", label: "Fechamento", type: "text" },
  { key: "valor_venda", label: "Valor da Venda (R$)", type: "numeric" },
  { key: "pagou", label: "Pagou?", type: "text" },
  { key: "forma_pagamento", label: "Forma de Pagamento", type: "text" },
  { key: "data_pagamento", label: "Data Pagamento", type: "date" },
  { key: "matricula", label: "Matrícula", type: "text" },
  { key: "obs", label: "OBS", type: "text" },
];

/** Sentinela do mapeador: coluna não mapeada, cai em `extra` jsonb com o nome original. */
export const UNMAPPED = "";

function normalizeHeader(header: string): string {
  return header
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const HEADER_ALIASES: Record<string, string> = {
  chave: "chave",
  data: "data",
  nome: "nome",
  email: "email",
  telefone: "telefone",
  celular: "telefone",
  whatsapp: "telefone",
  origem: "origem",
  utmsource: "utm_source",
  utmmedium: "utm_medium",
  utmcampaign: "utm_campaign",
  utmcontent: "utm_content",
  utmterm: "utm_term",
  interesse: "interesse",
  cursodeinteresse: "interesse",
  escolaridade: "escolaridade",
  turno: "turno",
  turnodesejado: "turno",
  status: "status",
  vendedor: "vendedor",
  vendedores: "vendedor",
  rendafamiliar: "renda_familiar",
  "1ocontato": "contato_1",
  "2ocontato": "contato_2",
  "3ocontato": "contato_3",
  "4ocontato": "contato_4",
  motivo: "motivo",
  agendamento: "agendamento",
  atendimento: "atendimento",
  orcamento: "orcamento",
  "orcamentorreais": "orcamento",
  fechamento: "fechamento",
  valordavenda: "valor_venda",
  "valordavendarreais": "valor_venda",
  pagou: "pagou",
  formadepagamento: "forma_pagamento",
  datapagamento: "data_pagamento",
  matricula: "matricula",
  obs: "obs",
  observacoes: "obs",
};

/** Sugestão automática de mapeamento por nome de coluna — o usuário confirma/ajusta. */
export function suggestFieldForHeader(header: string): string {
  const normalized = normalizeHeader(header);
  return HEADER_ALIASES[normalized] ?? UNMAPPED;
}
