// Gerado manualmente a partir de supabase/migrations/*.sql (Fase 0.5), no
// mesmo formato que `supabase gen types typescript` produziria. Sem Docker
// disponível nesta máquina, o comando não roda localmente (ele introspecta
// via um container). Regenerar com o comando oficial assim que a CLI estiver
// autenticada (`supabase login`) ou o Docker estiver instalado:
//
//   npx supabase gen types typescript --linked --schema public > src/types/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      settings: {
        Row: {
          id: boolean;
          moeda_padrao: string;
          timezone_padrao: string;
          janela_atribuicao_padrao: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: boolean;
          moeda_padrao?: string;
          timezone_padrao?: string;
          janela_atribuicao_padrao?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: boolean;
          moeda_padrao?: string;
          timezone_padrao?: string;
          janela_atribuicao_padrao?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      meta_ad_accounts: {
        Row: {
          id: string;
          label: string;
          ad_account_id: string;
          ads_token_secret_id: string | null;
          moeda: string;
          data_inicio: string;
          timezone: string;
          janela_atribuicao: string | null;
          rate_limit_state: Json;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          label: string;
          ad_account_id: string;
          ads_token_secret_id?: string | null;
          moeda?: string;
          data_inicio: string;
          timezone?: string;
          janela_atribuicao?: string | null;
          rate_limit_state?: Json;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          label?: string;
          ad_account_id?: string;
          ads_token_secret_id?: string | null;
          moeda?: string;
          data_inicio?: string;
          timezone?: string;
          janela_atribuicao?: string | null;
          rate_limit_state?: Json;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      meta_entities: {
        Row: {
          ad_account_id: string;
          entity_id: string;
          tipo: string;
          parent_id: string | null;
          nome: string | null;
          status: string | null;
          objetivo: string | null;
          creative: Json | null;
          updated_at: string;
        };
        Insert: {
          ad_account_id: string;
          entity_id: string;
          tipo: string;
          parent_id?: string | null;
          nome?: string | null;
          status?: string | null;
          objetivo?: string | null;
          creative?: Json | null;
          updated_at?: string;
        };
        Update: {
          ad_account_id?: string;
          entity_id?: string;
          tipo?: string;
          parent_id?: string | null;
          nome?: string | null;
          status?: string | null;
          objetivo?: string | null;
          creative?: Json | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meta_entities_ad_account_id_fkey";
            columns: ["ad_account_id"];
            isOneToOne: false;
            referencedRelation: "meta_ad_accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      meta_insights_daily: {
        Row: {
          id: string;
          ad_account_id: string;
          date: string;
          campaign_id: string;
          campaign_name: string | null;
          adset_id: string;
          adset_name: string | null;
          ad_id: string;
          ad_name: string | null;
          spend: number;
          impressions: number;
          reach: number;
          frequency: number | null;
          clicks: number;
          inline_link_clicks: number;
          actions: Json;
          action_values: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          ad_account_id: string;
          date: string;
          campaign_id: string;
          campaign_name?: string | null;
          adset_id: string;
          adset_name?: string | null;
          ad_id: string;
          ad_name?: string | null;
          spend?: number;
          impressions?: number;
          reach?: number;
          frequency?: number | null;
          clicks?: number;
          inline_link_clicks?: number;
          actions?: Json;
          action_values?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          ad_account_id?: string;
          date?: string;
          campaign_id?: string;
          campaign_name?: string | null;
          adset_id?: string;
          adset_name?: string | null;
          ad_id?: string;
          ad_name?: string | null;
          spend?: number;
          impressions?: number;
          reach?: number;
          frequency?: number | null;
          clicks?: number;
          inline_link_clicks?: number;
          actions?: Json;
          action_values?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meta_insights_daily_ad_account_id_fkey";
            columns: ["ad_account_id"];
            isOneToOne: false;
            referencedRelation: "meta_ad_accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      meta_custom_conversions: {
        Row: {
          ad_account_id: string;
          custom_conversion_id: string;
          nome: string | null;
          regra_resumo: string | null;
          updated_at: string;
        };
        Insert: {
          ad_account_id: string;
          custom_conversion_id: string;
          nome?: string | null;
          regra_resumo?: string | null;
          updated_at?: string;
        };
        Update: {
          ad_account_id?: string;
          custom_conversion_id?: string;
          nome?: string | null;
          regra_resumo?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meta_custom_conversions_ad_account_id_fkey";
            columns: ["ad_account_id"];
            isOneToOne: false;
            referencedRelation: "meta_ad_accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      lead_sources: {
        Row: {
          id: string;
          label: string;
          ad_account_id: string | null;
          tipo: string;
          planilha_url: string | null;
          nome_da_aba: string | null;
          mapeamento: Json;
          ativo: boolean;
          last_import_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          label: string;
          ad_account_id?: string | null;
          tipo: string;
          planilha_url?: string | null;
          nome_da_aba?: string | null;
          mapeamento?: Json;
          ativo?: boolean;
          last_import_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          label?: string;
          ad_account_id?: string | null;
          tipo?: string;
          planilha_url?: string | null;
          nome_da_aba?: string | null;
          mapeamento?: Json;
          ativo?: boolean;
          last_import_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lead_sources_ad_account_id_fkey";
            columns: ["ad_account_id"];
            isOneToOne: false;
            referencedRelation: "meta_ad_accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      leads: {
        Row: {
          id: string;
          source_id: string;
          chave: string;
          data: string | null;
          nome: string | null;
          email: string | null;
          email_norm: string | null;
          telefone: string | null;
          telefone_norm: string | null;
          origem: string | null;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          utm_content: string | null;
          utm_term: string | null;
          interesse: string | null;
          escolaridade: string | null;
          turno: string | null;
          status: string | null;
          vendedor: string | null;
          renda_familiar: string | null;
          contato_1: string | null;
          contato_2: string | null;
          contato_3: string | null;
          contato_4: string | null;
          motivo: string | null;
          agendamento: string | null;
          atendimento: string | null;
          orcamento: number | null;
          fechamento: string | null;
          valor_venda: number | null;
          pagou: string | null;
          forma_pagamento: string | null;
          data_pagamento: string | null;
          matricula: string | null;
          obs: string | null;
          extra: Json;
          campaign_id_matched: string | null;
          match_metodo: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          source_id: string;
          chave: string;
          data?: string | null;
          nome?: string | null;
          email?: string | null;
          email_norm?: string | null;
          telefone?: string | null;
          telefone_norm?: string | null;
          origem?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          utm_term?: string | null;
          interesse?: string | null;
          escolaridade?: string | null;
          turno?: string | null;
          status?: string | null;
          vendedor?: string | null;
          renda_familiar?: string | null;
          contato_1?: string | null;
          contato_2?: string | null;
          contato_3?: string | null;
          contato_4?: string | null;
          motivo?: string | null;
          agendamento?: string | null;
          atendimento?: string | null;
          orcamento?: number | null;
          fechamento?: string | null;
          valor_venda?: number | null;
          pagou?: string | null;
          forma_pagamento?: string | null;
          data_pagamento?: string | null;
          matricula?: string | null;
          obs?: string | null;
          extra?: Json;
          campaign_id_matched?: string | null;
          match_metodo?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          source_id?: string;
          chave?: string;
          data?: string | null;
          nome?: string | null;
          email?: string | null;
          email_norm?: string | null;
          telefone?: string | null;
          telefone_norm?: string | null;
          origem?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          utm_term?: string | null;
          interesse?: string | null;
          escolaridade?: string | null;
          turno?: string | null;
          status?: string | null;
          vendedor?: string | null;
          renda_familiar?: string | null;
          contato_1?: string | null;
          contato_2?: string | null;
          contato_3?: string | null;
          contato_4?: string | null;
          motivo?: string | null;
          agendamento?: string | null;
          atendimento?: string | null;
          orcamento?: number | null;
          fechamento?: string | null;
          valor_venda?: number | null;
          pagou?: string | null;
          forma_pagamento?: string | null;
          data_pagamento?: string | null;
          matricula?: string | null;
          obs?: string | null;
          extra?: Json;
          campaign_id_matched?: string | null;
          match_metodo?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leads_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "lead_sources";
            referencedColumns: ["id"];
          },
        ];
      };
      acoes: {
        Row: {
          id: string;
          label: string;
          ad_account_id: string;
          periodo_inicio: string | null;
          periodo_fim: string | null;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          label: string;
          ad_account_id: string;
          periodo_inicio?: string | null;
          periodo_fim?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          label?: string;
          ad_account_id?: string;
          periodo_inicio?: string | null;
          periodo_fim?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "acoes_ad_account_id_fkey";
            columns: ["ad_account_id"];
            isOneToOne: false;
            referencedRelation: "meta_ad_accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      acao_campanhas: {
        Row: {
          acao_id: string;
          campaign_id: string;
        };
        Insert: {
          acao_id: string;
          campaign_id: string;
        };
        Update: {
          acao_id?: string;
          campaign_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "acao_campanhas_acao_id_fkey";
            columns: ["acao_id"];
            isOneToOne: false;
            referencedRelation: "acoes";
            referencedColumns: ["id"];
          },
        ];
      };
      acao_fontes: {
        Row: {
          acao_id: string;
          source_id: string;
        };
        Insert: {
          acao_id: string;
          source_id: string;
        };
        Update: {
          acao_id?: string;
          source_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "acao_fontes_acao_id_fkey";
            columns: ["acao_id"];
            isOneToOne: false;
            referencedRelation: "acoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "acao_fontes_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "lead_sources";
            referencedColumns: ["id"];
          },
        ];
      };
      regras_match: {
        Row: {
          id: string;
          acao_id: string | null;
          source_id: string | null;
          valor_utm_campaign: string;
          campaign_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          acao_id?: string | null;
          source_id?: string | null;
          valor_utm_campaign: string;
          campaign_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          acao_id?: string | null;
          source_id?: string | null;
          valor_utm_campaign?: string;
          campaign_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "regras_match_acao_id_fkey";
            columns: ["acao_id"];
            isOneToOne: false;
            referencedRelation: "acoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "regras_match_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "lead_sources";
            referencedColumns: ["id"];
          },
        ];
      };
      import_batches: {
        Row: {
          id: string;
          source_id: string;
          quando: string;
          linhas_recebidas: number;
          novas: number;
          atualizadas: number;
          ignoradas: number;
          erros: Json;
          amostra_payload: Json | null;
        };
        Insert: {
          id?: string;
          source_id: string;
          quando?: string;
          linhas_recebidas?: number;
          novas?: number;
          atualizadas?: number;
          ignoradas?: number;
          erros?: Json;
          amostra_payload?: Json | null;
        };
        Update: {
          id?: string;
          source_id?: string;
          quando?: string;
          linhas_recebidas?: number;
          novas?: number;
          atualizadas?: number;
          ignoradas?: number;
          erros?: Json;
          amostra_payload?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "import_batches_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "lead_sources";
            referencedColumns: ["id"];
          },
        ];
      };
      meta_sync_jobs: {
        Row: {
          id: string;
          ad_account_id: string;
          kind: string;
          status: string;
          meta_report_run_id: string | null;
          date_range: Json | null;
          cursor: Json | null;
          attempt_count: number;
          next_poll_at: string | null;
          last_error: string | null;
          stats: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          ad_account_id: string;
          kind: string;
          status?: string;
          meta_report_run_id?: string | null;
          date_range?: Json | null;
          cursor?: Json | null;
          attempt_count?: number;
          next_poll_at?: string | null;
          last_error?: string | null;
          stats?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          ad_account_id?: string;
          kind?: string;
          status?: string;
          meta_report_run_id?: string | null;
          date_range?: Json | null;
          cursor?: Json | null;
          attempt_count?: number;
          next_poll_at?: string | null;
          last_error?: string | null;
          stats?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meta_sync_jobs_ad_account_id_fkey";
            columns: ["ad_account_id"];
            isOneToOne: false;
            referencedRelation: "meta_ad_accounts";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      save_secret: {
        Args: { secret_name: string; secret_value: string };
        Returns: string;
      };
      get_secret: {
        Args: { secret_id: string };
        Returns: string;
      };
      update_secret: {
        Args: { secret_id: string; secret_value: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

type DefaultSchema = Database["public"];

export type Tables<
  TableName extends keyof DefaultSchema["Tables"],
> = DefaultSchema["Tables"][TableName]["Row"];

export type TablesInsert<
  TableName extends keyof DefaultSchema["Tables"],
> = DefaultSchema["Tables"][TableName]["Insert"];

export type TablesUpdate<
  TableName extends keyof DefaultSchema["Tables"],
> = DefaultSchema["Tables"][TableName]["Update"];
