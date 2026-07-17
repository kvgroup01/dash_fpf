import { LineChart } from "lucide-react";
import { BentoGrid } from "@/components/bento/bento-grid";
import { BentoCard } from "@/components/bento/bento-card";
import { EmptyState } from "@/components/empty-state";

export default function VisualizacaoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Visualização</h1>
        <p className="text-sm text-muted-foreground">
          O cruzamento entre investimento e leads reais, por Ação.
        </p>
      </div>
      <BentoGrid>
        <BentoCard span="4x1">
          <EmptyState
            icon={LineChart}
            title="Nenhuma Ação criada ainda"
            description="Uma Ação amarra uma conta de anúncios, suas campanhas e as fontes de leads correspondentes. Crie uma para ver o cruzamento aqui."
          />
        </BentoCard>
      </BentoGrid>
    </div>
  );
}
