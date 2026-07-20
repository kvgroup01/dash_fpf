import { Building2 } from "lucide-react";
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
import { formatDate } from "@/lib/format/date";
import { NewAccountDialog } from "./new-account-dialog";
import { AccountRowActions } from "./account-row-actions";

export default async function ContasPage() {
  const supabase = await createClient();
  const { data: accounts } = await supabase
    .from("meta_ad_accounts")
    .select("*")
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Contas de Anúncios</h1>
          <p className="text-sm text-muted-foreground">
            Credenciais e configuração das contas do Gerenciador de Anúncios.
          </p>
        </div>
        <NewAccountDialog />
      </div>

      {!accounts?.length ? (
        <BentoGrid>
          <BentoCard span="4x1">
            <EmptyState
              icon={Building2}
              title="Nenhuma conta cadastrada ainda"
              description='Clique em "Nova conta" para cadastrar a primeira conta do Gerenciador de Anúncios.'
            />
          </BentoCard>
        </BentoGrid>
      ) : (
        <div className="glass-card overflow-x-auto rounded-[var(--radius)] p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Moeda</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Timezone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">
                    {account.label}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {account.ad_account_id}
                  </TableCell>
                  <TableCell>{account.moeda}</TableCell>
                  <TableCell>{formatDate(account.data_inicio)}</TableCell>
                  <TableCell className="text-xs">
                    {account.timezone}
                  </TableCell>
                  <TableCell>
                    <Badge variant={account.ativo ? "default" : "secondary"}>
                      {account.ativo ? "Ativa" : "Inativa"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <AccountRowActions account={account} />
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
