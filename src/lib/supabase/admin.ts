import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Único arquivo autorizado a instanciar um cliente com service_role.
 * Ignora RLS inteiramente — nunca importar isto de um Client Component
 * nem devolver este cliente (ou dados sensíveis lidos por ele) numa
 * resposta HTTP exposta ao browser sem antes filtrar o que é público.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
