import Papa from "papaparse";
import { createClient } from "@/lib/supabase/server";

/** Rota de API — proxy.ts não cobre /api, então valida a sessão aqui também. */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const fonte = url.searchParams.get("fonte");
  const busca = url.searchParams.get("busca");

  let query = supabase
    .from("leads")
    .select(
      "chave,data,nome,email,telefone,origem,status,vendedor,match_metodo,campaign_id_matched,created_at"
    )
    .order("created_at", { ascending: false })
    .limit(5000);

  if (fonte) query = query.eq("source_id", fonte);
  if (busca) {
    query = query.or(
      `nome.ilike.%${busca}%,email.ilike.%${busca}%,telefone.ilike.%${busca}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const csv = Papa.unparse(data ?? []);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads.csv"`,
    },
  });
}
