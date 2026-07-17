import { Building2 } from "lucide-react";
import { BentoGrid } from "@/components/bento/bento-grid";
import { BentoCard } from "@/components/bento/bento-card";
import { EmptyState } from "@/components/empty-state";

export default function ContasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Contas de Anúncios</h1>
        <p className="text-sm text-muted-foreground">
          Credenciais e configuração das contas do Gerenciador de Anúncios.
        </p>
      </div>
      <BentoGrid>
        <BentoCard span="4x1">
          <EmptyState
            icon={Building2}
            title="Nenhuma conta cadastrada ainda"
            description="Configuração de contas de anúncios (token cifrado no Vault, testar conexão) chega na Fase 1."
          />
        </BentoCard>
      </BentoGrid>
    </div>
  );
}
