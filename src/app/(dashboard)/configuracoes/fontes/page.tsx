import { Table2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BentoGrid } from "@/components/bento/bento-grid";
import { BentoCard } from "@/components/bento/bento-card";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NewSourceDialog } from "./new-source-dialog";
import { SourceRowActions } from "./source-row-actions";

const TIPO_LABELS: Record<string, string> = {
  crm: "CRM",
  leads_utm: "Leads + UTM",
};

export default async function FontesPage() {
  const supabase = await createClient();
  const [{ data: sources }, { data: accounts }] = await Promise.all([
    supabase.from("lead_sources").select("*").order("created_at", { ascending: true }),
    supabase.from("meta_ad_accounts").select("*").order("created_at", { ascending: true }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Fontes de Leads</h1>
          <p className="text-sm text-muted-foreground">
            Abas de planilha e o mapeamento de colunas de cada uma.
          </p>
        </div>
        <NewSourceDialog accounts={accounts ?? []} />
      </div>

      {!sources?.length ? (
        <BentoGrid>
          <BentoCard span="4x1">
            <EmptyState
              icon={Table2}
              title="Nenhuma fonte cadastrada ainda"
              description='Clique em "Nova fonte" para cadastrar a primeira aba de planilha.'
            />
          </BentoCard>
        </BentoGrid>
      ) : (
        <div className="glass-card overflow-x-auto rounded-[var(--radius)] p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Conta vinculada</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.map((source) => (
                <TableRow key={source.id}>
                  <TableCell className="font-medium">{source.label}</TableCell>
                  <TableCell>{TIPO_LABELS[source.tipo] ?? source.tipo}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {accounts?.find((a) => a.id === source.ad_account_id)?.label ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={source.ativo ? "default" : "secondary"}>
                      {source.ativo ? "Ativa" : "Inativa"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <SourceRowActions source={source} accounts={accounts ?? []} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
