"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectChecklistProps {
  /** Se passado, renderiza inputs hidden com esse name — pra participar de um <form> nativo. */
  name?: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
}

export function MultiSelectChecklist({
  name,
  options,
  selected,
  onChange,
  searchPlaceholder = "Buscar...",
  emptyMessage = "Nada encontrado.",
}: MultiSelectChecklistProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter((o) => o.label.toLowerCase().includes(term));
  }, [options, search]);

  function toggle(value: string, checked: boolean) {
    if (checked) {
      onChange([...selected, value]);
    } else {
      onChange(selected.filter((v) => v !== value));
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-8"
        />
        <button
          type="button"
          className="shrink-0 text-xs text-primary hover:underline"
          onClick={() => onChange(filtered.map((o) => o.value))}
        >
          Selecionar todas
        </button>
      </div>
      <ScrollArea className="h-40 rounded-[var(--radius)] border border-border p-2">
        {filtered.length === 0 ? (
          <p className="p-2 text-xs text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="space-y-1">
            {filtered.map((option) => (
              <label
                key={option.value}
                className="flex min-h-8 cursor-pointer items-center gap-2 rounded px-1 text-sm hover:bg-accent"
              >
                <Checkbox
                  checked={selected.includes(option.value)}
                  onCheckedChange={(checked) => toggle(option.value, checked === true)}
                />
                {name && selected.includes(option.value) && (
                  <input type="hidden" name={name} value={option.value} />
                )}
                <span className="truncate">{option.label}</span>
              </label>
            ))}
          </div>
        )}
      </ScrollArea>
      <p className="text-xs text-muted-foreground">{selected.length} selecionada(s)</p>
    </div>
  );
}
