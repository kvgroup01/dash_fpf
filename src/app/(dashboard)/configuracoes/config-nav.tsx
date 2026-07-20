"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/configuracoes", label: "Geral" },
  { href: "/configuracoes/contas", label: "Contas" },
  { href: "/configuracoes/fontes", label: "Fontes" },
];

export function ConfigNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegação de configurações" className="flex gap-1">
      {items.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-9 items-center rounded-[var(--radius)] px-3 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
