"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MultiSelectChecklist } from "@/components/forms/multi-select-checklist";
import { GlassSurface } from "@/components/glass/glass-surface";
import type { Tables } from "@/types/database.types";
import { createAcao, deleteAcao } from "./actions";

const NOVA = "__nova__";

export interface SavedAcao {
  id: string;
  label: string;
  ad_account_id: string;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  campanhas: string[];
  fontes: string[];
}

interface AcaoBuilderProps {
  accounts: Tables<"meta_ad_accounts">[];
  sources: Tables<"lead_sources">[];
  campaignsByAccount: Record<string, { value: string; label: string }[]>;
  savedAcoes: SavedAcao[];
  initial: {
    acaoId: string;
    contaId: string;
    campanhas: string[];
    fontes: string[];
    since: string;
    until: string;
  };
}

export function AcaoBuilder({
  accounts,
  sources,
  campaignsByAccount,
  savedAcoes,
  initial,
}: AcaoBuilderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [acaoId, setAcaoId] = useState(initial.acaoId);
  const [contaId, setContaId] = useState(initial.contaId);
  const [campanhas, setCampanhas] = useState<string[]>(initial.campanhas);
  const [fontes, setFontes] = useState<string[]>(initial.fontes);
  const [since, setSince] = useState(initial.since);
  const [until, setUntil] = useState(initial.until);
  const [saveOpen, setSaveOpen] = useState(false);

  const campaignOptions = useMemo(
    () => campaignsByAccount[contaId] ?? [],
    [campaignsByAccount, contaId]
  );
  const sourceOptions = useMemo(
    () => sources.map((s) => ({ value: s.id, label: s.label })),
    [sources]
  );

  function selectSavedAcao(id: string) {
    setAcaoId(id);
    if (id === NOVA) return;
    const saved = savedAcoes.find((a) => a.id === id);
    if (!saved) return;
    setContaId(saved.ad_account_id);
    setCampanhas(saved.campanhas);
    setFontes(saved.fontes);
    if (saved.periodo_inicio) setSince(saved.periodo_inicio);
    if (saved.periodo_fim) setUntil(saved.periodo_fim);
  }

  function applyAndAnalyze() {
    const params = new URLSearchParams();
    if (contaId) params.set("conta", contaId);
    if (campanhas.length) params.set("campanhas", campanhas.join(","));
    if (fontes.length) params.set("fontes", fontes.join(","));
    if (since) params.set("since", since);
    if (until) params.set("until", until);
    router.push(`/visualizacao?${params.toString()}`);
  }

  function handleDelete() {
    if (acaoId === NOVA) return;
    startTransition(async () => {
      const result = await deleteAcao(acaoId);
      if (result?.success) toast.success(result.success);
      if (result?.error) toast.error(result.error);
      setAcaoId(NOVA);
    });
  }

  return (
    <GlassSurface level="card" className="space-y-4 rounded-[var(--radius)] p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Ação salva</Label>
          <Select value={acaoId} onValueChange={selectSavedAcao}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NOVA}>Nova (montar na hora)</SelectItem>
              {savedAcoes.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Conta</Label>
          <Select
            value={contaId}
            onValueChange={(v) => {
              setContaId(v);
              setCampanhas([]);
            }}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">De</Label>
          <Input type="date" className="w-40" value={since} onChange={(e) => setSince(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Até</Label>
          <Input type="date" className="w-40" value={until} onChange={(e) => setUntil(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="text-xs text-muted-foreground">Campanhas</Label>
          <MultiSelectChecklist
            options={campaignOptions}
            selected={campanhas}
            onChange={setCampanhas}
            searchPlaceholder="Buscar campanha..."
            emptyMessage="Selecione uma conta primeiro."
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Fontes de leads</Label>
          <MultiSelectChecklist
            options={sourceOptions}
            selected={fontes}
            onChange={setFontes}
            searchPlaceholder="Buscar fonte..."
            emptyMessage="Nenhuma fonte cadastrada."
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={applyAndAnalyze} disabled={!contaId || !campanhas.length || !fontes.length}>
          Analisar
        </Button>

        <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              disabled={!contaId || !campanhas.length || !fontes.length}
            >
              Salvar como Ação
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-popover">
            <DialogHeader>
              <DialogTitle>Salvar como Ação</DialogTitle>
            </DialogHeader>
            <SaveAcaoForm
              contaId={contaId}
              campanhas={campanhas}
              fontes={fontes}
              since={since}
              until={until}
              onSuccess={(id) => {
                setSaveOpen(false);
                setAcaoId(id);
              }}
            />
          </DialogContent>
        </Dialog>

        {acaoId !== NOVA && (
          <Button variant="ghost" className="text-destructive" onClick={handleDelete} disabled={isPending}>
            Excluir Ação
          </Button>
        )}
      </div>
    </GlassSurface>
  );
}

function SaveAcaoForm({
  contaId,
  campanhas,
  fontes,
  since,
  until,
  onSuccess,
}: {
  contaId: string;
  campanhas: string[];
  fontes: string[];
  since: string;
  until: string;
  onSuccess: (acaoId: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createAcao(undefined, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (result?.success) {
        toast.success(result.success);
        onSuccess(result.acaoId!);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <input type="hidden" name="ad_account_id" value={contaId} />
      <input type="hidden" name="periodo_inicio" value={since} />
      <input type="hidden" name="periodo_fim" value={until} />
      {campanhas.map((c) => (
        <input key={c} type="hidden" name="campanhas" value={c} />
      ))}
      {fontes.map((f) => (
        <input key={f} type="hidden" name="fontes" value={f} />
      ))}

      <div className="space-y-2">
        <Label htmlFor="label">Nome da Ação</Label>
        <Input id="label" name="label" required placeholder="Ex.: Escola Técnica — Vestibular 2026" />
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
