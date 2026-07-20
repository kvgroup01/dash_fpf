"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/types/database.types";
import { formatDateTime } from "@/lib/format/date";
import { startSync } from "./actions";

const STATUS_LABELS: Record<string, string> = {
  queued: "Na fila",
  running: "Iniciando",
  polling: "Aguardando relatório",
  processing: "Gravando dados",
  throttled: "Pausado (limite da Meta)",
  done: "Concluído",
  error: "Erro",
};

interface SyncButtonProps {
  accountId: string;
  timezone: string;
  initialJob: Tables<"meta_sync_jobs"> | null;
}

/**
 * O componente pai passa key={accountId} — troca de conta remonta o
 * componente e reseta o estado a partir de initialJob, em vez de
 * sincronizar prop→state manualmente num efeito.
 */
export function SyncButton({ accountId, timezone, initialJob }: SyncButtonProps) {
  const [job, setJob] = useState(initialJob);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`meta_sync_jobs_${accountId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "meta_sync_jobs",
          filter: `ad_account_id=eq.${accountId}`,
        },
        (payload) => {
          setJob(payload.new as Tables<"meta_sync_jobs">);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [accountId]);

  function handleSync(kind: "backfill" | "incremental") {
    startTransition(async () => {
      const result = await startSync(accountId, kind);
      if (result?.success) toast.success(result.success);
      if (result?.error) toast.error(result.error);
    });
  }

  const isActive = Boolean(job && !["done", "error"].includes(job.status));

  return (
    <div className="flex items-center gap-2">
      {job && (
        <Badge
          variant={
            job.status === "error"
              ? "destructive"
              : job.status === "done"
                ? "secondary"
                : "default"
          }
        >
          {STATUS_LABELS[job.status] ?? job.status}
        </Badge>
      )}
      {job?.status === "done" && (
        <span className="hidden text-xs text-muted-foreground sm:inline">
          último sync: {formatDateTime(job.updated_at, timezone)}
        </span>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" disabled={isPending || isActive}>
            {isPending || isActive ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Sincronizar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => handleSync("backfill")}>
            Backfill completo
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleSync("incremental")}>
            Últimos 7 dias
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
