"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/types/database.types";
import { updateSettings } from "./actions";

export function SettingsForm({ settings }: { settings: Tables<"settings"> }) {
  const [state, formAction, isPending] = useActionState(
    updateSettings,
    undefined
  );

  return (
    <form action={formAction} className="max-w-sm space-y-4">
      <div className="space-y-2">
        <Label htmlFor="moeda_padrao">Moeda padrão</Label>
        <Input
          id="moeda_padrao"
          name="moeda_padrao"
          required
          maxLength={3}
          defaultValue={settings.moeda_padrao}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="timezone_padrao">Timezone padrão</Label>
        <Input
          id="timezone_padrao"
          name="timezone_padrao"
          required
          defaultValue={settings.timezone_padrao}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="janela_atribuicao_padrao">
          Janela de atribuição padrão
        </Label>
        <Input
          id="janela_atribuicao_padrao"
          name="janela_atribuicao_padrao"
          required
          defaultValue={settings.janela_atribuicao_padrao}
        />
      </div>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-sm text-primary" role="status">
          {state.success}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
