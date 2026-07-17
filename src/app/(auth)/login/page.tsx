import { GlassSurface } from "@/components/glass/glass-surface";

export default function LoginPage() {
  return (
    <GlassSurface level="popover" className="w-full max-w-sm rounded-[var(--radius)] p-6">
      <h1 className="text-lg font-semibold">Entrar</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Autenticação chega na Fase 1. Cadastro público fica desligado.
      </p>
    </GlassSurface>
  );
}
