import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

export default async function ConfiguracoesGeralPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("settings")
    .select("*")
    .eq("id", true)
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Configurações gerais</h1>
        <p className="text-sm text-muted-foreground">
          Valores padrão usados quando uma conta ou ação não define os
          próprios.
        </p>
      </div>
      {settings && <SettingsForm settings={settings} />}
    </div>
  );
}
