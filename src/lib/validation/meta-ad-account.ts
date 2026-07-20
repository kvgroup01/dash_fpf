import { z } from "zod";

export const metaAdAccountSchema = z.object({
  label: z.string().trim().min(1, "Obrigatório"),
  ad_account_id: z
    .string()
    .trim()
    .min(1, "Obrigatório")
    .transform((value) => (value.startsWith("act_") ? value : `act_${value}`)),
  moeda: z
    .string()
    .trim()
    .toUpperCase()
    .length(3, "Use o código de 3 letras (ex.: BRL)"),
  data_inicio: z.string().trim().min(1, "Obrigatório"),
  timezone: z.string().trim().min(1, "Obrigatório"),
  janela_atribuicao: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || null),
  ativo: z.coerce.boolean(),
});

export type MetaAdAccountInput = z.infer<typeof metaAdAccountSchema>;
