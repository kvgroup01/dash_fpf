"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Tables } from "@/types/database.types";

interface FiltersProps {
  accounts: Tables<"meta_ad_accounts">[];
}

export function Filters({ accounts }: FiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const conta = searchParams.get("conta") ?? "todas";
  const since = searchParams.get("since") ?? "";
  const until = searchParams.get("until") ?? "";
  const busca = searchParams.get("busca") ?? "";

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Conta</label>
        <Select value={conta} onValueChange={(v) => setParam("conta", v === "todas" ? "" : v)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as contas</SelectItem>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">De</label>
        <Input
          type="date"
          className="w-40"
          defaultValue={since}
          onChange={(e) => setParam("since", e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Até</label>
        <Input
          type="date"
          className="w-40"
          defaultValue={until}
          onChange={(e) => setParam("until", e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Busca</label>
        <Input
          type="search"
          placeholder="Campanha, conjunto ou anúncio"
          className="w-56"
          defaultValue={busca}
          onChange={(e) => setParam("busca", e.target.value)}
        />
      </div>
    </div>
  );
}
