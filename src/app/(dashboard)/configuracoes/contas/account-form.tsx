"use client";

import { useActionState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { Tables } from "@/types/database.types";
import { createAccount, updateAccount, type ActionState } from "./actions";

const TIMEZONES = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Fortaleza",
  "America/Bahia",
  "America/Cuiaba",
  "America/Rio_Branco",
  "America/Noronha",
  "UTC",
];

interface AccountFormProps {
  account?: Tables<"meta_ad_accounts">;
  onSuccess: () => void;
}

export function AccountForm({ account, onSuccess }: AccountFormProps) {
  const isEdit = Boolean(account);
  const action = isEdit ? updateAccount : createAccount;
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    action,
    undefined
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      onSuccess();
      formRef.current?.reset();
    }
  }, [state, onSuccess]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={account!.id} />}

      <div className="space-y-2">
        <Label htmlFor="label">Label</Label>
        <Input
          id="label"
          name="label"
          required
          defaultValue={account?.label}
          placeholder="Ex.: Cliente X — conta principal"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ad_account_id">ID da conta de anúncios</Label>
        <Input
          id="ad_account_id"
          name="ad_account_id"
          required
          defaultValue={account?.ad_account_id}
          placeholder="act_123456789 ou só 123456789"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="token">
          Token de acesso {isEdit && "(deixe em branco para manter o atual)"}
        </Label>
        <Input
          id="token"
          name="token"
          type="password"
          required={!isEdit}
          placeholder={isEdit ? "••••••••" : ""}
          autoComplete="off"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="moeda">Moeda</Label>
          <Input
            id="moeda"
            name="moeda"
            required
            maxLength={3}
            defaultValue={account?.moeda ?? "BRL"}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="data_inicio">Início do histórico</Label>
          <Input
            id="data_inicio"
            name="data_inicio"
            type="date"
            required
            defaultValue={account?.data_inicio}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone da conta</Label>
        <Input
          id="timezone"
          name="timezone"
          required
          list="timezones"
          defaultValue={account?.timezone ?? "America/Sao_Paulo"}
        />
        <datalist id="timezones">
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz} />
          ))}
        </datalist>
      </div>

      <div className="space-y-2">
        <Label htmlFor="janela_atribuicao">
          Janela de atribuição (opcional)
        </Label>
        <Input
          id="janela_atribuicao"
          name="janela_atribuicao"
          placeholder="Ex.: 7d_click_1d_view"
          defaultValue={account?.janela_atribuicao ?? ""}
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="ativo"
          name="ativo"
          defaultChecked={account?.ativo ?? true}
        />
        <Label htmlFor="ativo">Ativa</Label>
      </div>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar conta"}
      </Button>
    </form>
  );
}
