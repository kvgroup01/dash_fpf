"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LineChart, Megaphone, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/anuncios", label: "Anúncios", icon: Megaphone },
  { href: "/planilhas", label: "Planilhas", icon: Table2 },
  { href: "/visualizacao", label: "Visualização", icon: LineChart },
];

export function DashboardNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className={cn("flex items-center gap-1 overflow-x-auto", className)}
    >
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname?.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius)] px-3 text-xs font-medium transition-colors sm:gap-2 sm:px-4 sm:text-sm",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
