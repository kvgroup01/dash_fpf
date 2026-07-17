import { Table2 } from "lucide-react";
import { BentoGrid } from "@/components/bento/bento-grid";
import { BentoCard } from "@/components/bento/bento-card";
import { EmptyState } from "@/components/empty-state";

export default function FontesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Fontes de Leads</h1>
        <p className="text-sm text-muted-foreground">
          Abas de planilha e o mapeamento de colunas de cada uma.
        </p>
      </div>
      <BentoGrid>
        <BentoCard span="4x1">
          <EmptyState
            icon={Table2}
            title="Nenhuma fonte cadastrada ainda"
            description="O cadastro de fontes com mapeador de colunas chega na Fase 3."
          />
        </BentoCard>
      </BentoGrid>
    </div>
  );
}
