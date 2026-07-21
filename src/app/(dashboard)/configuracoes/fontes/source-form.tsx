"use client";

import { useActionState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Tables } from "@/types/database.types";
import { createSource, updateSource } from "./actions";

interface SourceFormProps {
  source?: Tables<"lead_sources">;
  accounts: Tables<"meta_ad_accounts">[];
  onSuccess: () => void;
}

export function SourceForm({ source, accounts, onSuccess }: SourceFormProps) {
  const isEdit = Boolean(source);
  const action = isEdit ? updateSource : createSource;
  const [state, formAction, isPending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      onSuccess();
      formRef.current?.reset();
    }
  }, [state, onSuccess]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={source!.id} />}

      <div className="space-y-2">
        <Label htmlFor="label">Label</Label>
        <Input
          id="label"
          name="label"
          required
          defaultValue={source?.label}
          placeholder="Ex.: CRM — Escola Técnica"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tipo">Tipo</Label>
        <Select name="tipo" defaultValue={source?.tipo ?? "crm"}>
          <SelectTrigger id="tipo" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="crm">CRM (completo)</SelectItem>
            <SelectItem value="leads_utm">Leads + UTM</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ad_account_id">Conta de anúncios vinculada (opcional)</Label>
        <Select name="ad_account_id" defaultValue={source?.ad_account_id ?? "__none__"}>
          <SelectTrigger id="ad_account_id" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Nenhuma</SelectItem>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Switch id="ativo" name="ativo" defaultChecked={source?.ativo ?? true} />
        <Label htmlFor="ativo">Ativa</Label>
      </div>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar fonte"}
      </Button>
    </form>
  );
}
