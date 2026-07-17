import { Table2 } from "lucide-react";
import { BentoGrid } from "@/components/bento/bento-grid";
import { BentoCard } from "@/components/bento/bento-card";
import { EmptyState } from "@/components/empty-state";

export default function PlanilhasPage() {
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
            description="Cadastre uma fonte (aba de planilha) para colar leads do CRM ou de campanhas com UTM."
          />
        </BentoCard>
      </BentoGrid>
    </div>
  );
}
