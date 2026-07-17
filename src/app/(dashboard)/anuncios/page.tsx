import { Megaphone } from "lucide-react";
import { BentoGrid } from "@/components/bento/bento-grid";
import { BentoCard } from "@/components/bento/bento-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AnunciosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Gerenciador de Anúncios</h1>
        <p className="text-sm text-muted-foreground">
          Investimento, resultados e criativos por conta, campanha e conjunto.
        </p>
      </div>
      <BentoGrid>
        <BentoCard span="1x1" />
        <BentoCard span="1x1" />
        <BentoCard span="1x1" />
        <BentoCard span="1x1" />
        <BentoCard span="4x1">
          <EmptyState
            icon={Megaphone}
            title="Nenhuma conta de anúncios configurada ainda"
            description="Cadastre uma conta do Gerenciador de Anúncios da Meta para começar a sincronizar investimento e resultados."
            action={
              <Button asChild size="sm">
                <Link href="/configuracoes/contas">Configurar conta</Link>
              </Button>
            }
          />
        </BentoCard>
      </BentoGrid>
    </div>
  );
}
