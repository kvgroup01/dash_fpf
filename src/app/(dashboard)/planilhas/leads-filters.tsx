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

export function LeadsFilters({ sources }: { sources: Tables<"lead_sources">[] }) {
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

  const fonte = searchParams.get("fonte") ?? "todas";
  const busca = searchParams.get("busca") ?? "";

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Fonte</label>
        <Select value={fonte} onValueChange={(v) => setParam("fonte", v === "todas" ? "" : v)}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as fontes</SelectItem>
            {sources.map((source) => (
              <SelectItem key={source.id} value={source.id}>
                {source.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Busca</label>
        <Input
          type="search"
          placeholder="Nome, e-mail ou telefone"
          className="w-64"
          defaultValue={busca}
          onChange={(e) => setParam("busca", e.target.value)}
        />
      </div>
    </div>
  );
}
