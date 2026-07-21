"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEAD_FIELDS, UNMAPPED } from "@/lib/leads/fields";
import type { ColumnMapping } from "@/lib/leads/import";
import { analyzeImport, previewImport, commitImport, type PreviewResult } from "../../actions";

type Step = "paste" | "map" | "preview" | "done";

interface ImportWizardProps {
  sourceId: string;
  sourceLabel: string;
}

export function ImportWizard({ sourceId, sourceLabel }: ImportWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("paste");
  const [rawText, setRawText] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [rowCount, setRowCount] = useState(0);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [finalReport, setFinalReport] = useState<{
    novas: number;
    atualizadas: number;
    erros: number;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAnalyze() {
    if (!rawText.trim()) {
      toast.error("Cole o conteúdo da planilha primeiro.");
      return;
    }
    startTransition(async () => {
      const result = await analyzeImport(sourceId, rawText);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setHeaders(result.headers ?? []);
      setMapping(result.mapping ?? {});
      setRowCount(result.rowCount ?? 0);
      setStep("map");
    });
  }

  function handlePreview() {
    startTransition(async () => {
      const result = await previewImport(sourceId, rawText, mapping);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setPreview(result);
      setStep("preview");
    });
  }

  function handleCommit() {
    startTransition(async () => {
      const result = await commitImport(sourceId, rawText, mapping);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setFinalReport({
        novas: result.novas ?? 0,
        atualizadas: result.atualizadas ?? 0,
        erros: result.erros ?? 0,
      });
      toast.success(result.success);
      setStep("done");
    });
  }

  function reset() {
    setStep("paste");
    setRawText("");
    setHeaders([]);
    setMapping({});
    setPreview(null);
    setFinalReport(null);
  }

  if (step === "paste") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Copie as linhas da planilha (Ctrl+C no Google Sheets, incluindo o
          cabeçalho) e cole abaixo.
        </p>
        <Textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          rows={12}
          placeholder="CHAVE&#9;DATA&#9;NOME&#9;EMAIL..."
          className="font-mono text-xs"
        />
        <Button onClick={handleAnalyze} disabled={isPending}>
          {isPending ? "Analisando..." : "Analisar"}
        </Button>
      </div>
    );
  }

  if (step === "map") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {rowCount} linha(s) detectada(s). Confira o mapeamento de cada
          coluna — fica salvo pra próxima colagem dessa fonte.
        </p>
        <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
          {headers.map((header) => (
            <div key={header} className="grid grid-cols-2 items-center gap-3">
              <span className="truncate text-sm font-medium" title={header}>
                {header}
              </span>
              <Select
                value={mapping[header] || UNMAPPED}
                onValueChange={(value) =>
                  setMapping((prev) => ({ ...prev, [header]: value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNMAPPED}>Não mapear (vai pra extra)</SelectItem>
                  {LEAD_FIELDS.map((field) => (
                    <SelectItem key={field.key} value={field.key}>
                      {field.label}
                      {field.required ? " *" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep("paste")}>
            Voltar
          </Button>
          <Button onClick={handlePreview} disabled={isPending}>
            {isPending ? "Calculando..." : "Ver preview"}
          </Button>
        </div>
      </div>
    );
  }

  if (step === "preview" && preview) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-surface rounded-[var(--radius)] p-3 text-center">
            <p className="text-2xl font-semibold text-primary">{preview.novas}</p>
            <p className="text-xs text-muted-foreground">Novas</p>
          </div>
          <div className="glass-surface rounded-[var(--radius)] p-3 text-center">
            <p className="text-2xl font-semibold">{preview.atualizadas}</p>
            <p className="text-xs text-muted-foreground">Atualizam</p>
          </div>
          <div className="glass-surface rounded-[var(--radius)] p-3 text-center">
            <p className="text-2xl font-semibold text-destructive">
              {preview.erros?.length ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Com erro</p>
          </div>
        </div>

        {!!preview.erros?.length && (
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-[var(--radius)] border border-border p-3 text-xs">
            {preview.erros.map((e, i) => (
              <p key={i} className="text-muted-foreground">
                Linha {e.index + 2}
                {e.chave ? ` (${e.chave})` : ""}: {e.error}
              </p>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep("map")}>
            Voltar
          </Button>
          <Button
            onClick={handleCommit}
            disabled={isPending || preview.novas! + preview.atualizadas! === 0}
          >
            {isPending ? "Importando..." : "Confirmar importação"}
          </Button>
        </div>
      </div>
    );
  }

  if (step === "done" && finalReport) {
    return (
      <div className="space-y-4">
        <p className="text-sm">
          Importação de <strong>{sourceLabel}</strong> concluída:{" "}
          {finalReport.novas} nova(s), {finalReport.atualizadas} atualizada(s)
          {finalReport.erros > 0 && `, ${finalReport.erros} com erro`}.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reset}>
            Importar outro lote
          </Button>
          <Button onClick={() => router.push("/planilhas")}>Ver leads</Button>
        </div>
      </div>
    );
  }

  return null;
}
