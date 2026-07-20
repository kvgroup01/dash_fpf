"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * Acesso por código único, não por conta individual — decisão deliberada
 * (o link vai pro cliente final, que só precisa de um código, não de
 * cadastro). O código é a senha de um usuário fixo do Supabase Auth por
 * baixo: continua sendo uma sessão real, então a RLS (leitura só
 * `authenticated`) segue protegendo as tabelas contra acesso direto via
 * REST API com a chave anon pública. Nunca trocar isso por RLS `to anon` —
 * viraria acesso público sem precisar nem do código.
 */
const SHARED_LOGIN_EMAIL = "admin@adm.com";

const schema = z.object({
  codigo: z.string().min(1, "Código obrigatório"),
});

export type LoginState = { error?: string } | undefined;

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = schema.safeParse({
    codigo: formData.get("codigo"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: SHARED_LOGIN_EMAIL,
    password: parsed.data.codigo,
  });

  if (error) {
    return { error: "Código incorreto." };
  }

  redirect("/anuncios");
}
