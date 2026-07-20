import { GlassSurface } from "@/components/glass/glass-surface";
import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <GlassSurface
      level="popover"
      className="w-full max-w-sm rounded-[var(--radius)] p-6"
    >
      <Logo className="mx-auto mb-6 h-9" />
      <h1 className="text-lg font-semibold">Entrar</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Digite o código de acesso para entrar no dashboard.
      </p>
      <LoginForm />
    </GlassSurface>
  );
}
