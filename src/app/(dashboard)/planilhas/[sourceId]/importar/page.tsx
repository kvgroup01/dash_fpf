import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GlassSurface } from "@/components/glass/glass-surface";
import { ImportWizard } from "./import-wizard";

export default async function ImportarPage({
  params,
}: {
  params: Promise<{ sourceId: string }>;
}) {
  const { sourceId } = await params;
  const supabase = await createClient();
  const { data: source } = await supabase
    .from("lead_sources")
    .select("*")
    .eq("id", sourceId)
    .single();

  if (!source) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Importar leads — {source.label}</h1>
        <p className="text-sm text-muted-foreground">
          Cole o conteúdo copiado da planilha (Ctrl+C no Google Sheets).
        </p>
      </div>
      <GlassSurface level="card" className="max-w-2xl rounded-[var(--radius)] p-6">
        <ImportWizard sourceId={source.id} sourceLabel={source.label} />
      </GlassSurface>
    </div>
  );
}
