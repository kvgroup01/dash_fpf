import Link from "next/link";
import { Download, Table2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BentoGrid } from "@/components/bento/bento-grid";
import { BentoCard } from "@/components/bento/bento-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatDateTime } from "@/lib/format/date";
import { LeadsFilters } from "./leads-filters";

const TIPO_LABELS: Record<string, string> = {
  crm: "CRM",
  leads_utm: "Leads + UTM",
};

export default async function PlanilhasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: sources } = await supabase
    .from("lead_sources")
    .select("*")
    .order("created_at", { ascending: true });

  if (!sources?.length) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Planilhas / Leads</h1>
          <p className="text-sm text-muted-foreground">
            Fontes de leads, colagem em lote e taxa de match por fonte.
          </p>
        </div>
        <BentoGrid>
          <BentoCard span="4x1">
            <EmptyState
              icon={Table2}
              title="Nenhuma fonte de leads cadastrada ainda"
              description="Cadastre uma fonte em Configurações → Fontes para colar leads do CRM ou de campanhas com UTM."
              action={
                <Button asChild size="sm">
                  <Link href="/configuracoes/fontes">Cadastrar fonte</Link>
                </Button>
              }
            />
          </BentoCard>
        </BentoGrid>
      </div>
    );
  }

  const sourceIds = sources.map((s) => s.id);
  const { data: leadCounts } = await supabase
    .from("leads")
    .select("source_id, match_metodo")
    .in("source_id", sourceIds);

  const countsBySource = new Map<string, { total: number; semMatch: number }>();
  for (const lead of leadCounts ?? []) {
    const entry = countsBySource.get(lead.source_id) ?? { total: 0, semMatch: 0 };
    entry.total += 1;
    if (!lead.match_metodo) entry.semMatch += 1;
    countsBySource.set(lead.source_id, entry);
  }

  const fonte = params.fonte || "";
  const busca = (params.busca || "").trim();

  let leadsQuery = supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (fonte) leadsQuery = leadsQuery.eq("source_id", fonte);
  if (busca) {
    leadsQuery = leadsQuery.or(
      `nome.ilike.%${busca}%,email.ilike.%${busca}%,telefone.ilike.%${busca}%`
    );
  }

  const { data: leads } = await leadsQuery;

  const exportParams = new URLSearchParams();
  if (fonte) exportParams.set("fonte", fonte);
  if (busca) exportParams.set("busca", busca);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Planilhas / Leads</h1>
        <p className="text-sm text-muted-foreground">
          Fontes de leads, colagem em lote e taxa de match por fonte.
        </p>
      </div>

      <BentoGrid>
        <BentoCard span="4x1">
          <p className="mb-3 text-sm font-medium">Fontes</p>
          <div className="space-y-2">
            {sources.map((source) => {
              const counts = countsBySource.get(source.id) ?? { total: 0, semMatch: 0 };
              return (
                <div
                  key={source.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius)] border border-border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{source.label}</span>
                    <Badge variant="secondary">{TIPO_LABELS[source.tipo] ?? source.tipo}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{counts.total} leads</span>
                    <span>{counts.semMatch} sem match</span>
                    <span>
                      {source.last_import_at
                        ? `último import: ${formatDateTime(source.last_import_at)}`
                        : "nunca importado"}
                    </span>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/planilhas/${source.id}/importar`}>
                        <Upload className="size-3.5" />
                        Importar
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </BentoCard>

        <BentoCard span="4x1">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium">Leads</p>
            <Button asChild size="sm" variant="outline">
              <a href={`/api/leads/export?${exportParams.toString()}`}>
                <Download className="size-3.5" />
                Exportar CSV
              </a>
            </Button>
          </div>
          <div className="mb-4">
            <LeadsFilters sources={sources} />
          </div>
          {!leads?.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum lead encontrado pros filtros atuais.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chave</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Match</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-mono text-xs">{lead.chave}</TableCell>
                      <TableCell>{lead.data ? formatDate(lead.data) : "—"}</TableCell>
                      <TableCell>{lead.nome ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {lead.email ?? lead.telefone ?? "—"}
                      </TableCell>
                      <TableCell>{lead.origem ?? lead.utm_source ?? "—"}</TableCell>
                      <TableCell>{lead.status ?? "—"}</TableCell>
                      <TableCell>
                        {lead.match_metodo ? (
                          <Badge>{lead.match_metodo}</Badge>
                        ) : (
                          <Badge variant="secondary">sem match</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </BentoCard>
      </BentoGrid>
    </div>
  );
}
