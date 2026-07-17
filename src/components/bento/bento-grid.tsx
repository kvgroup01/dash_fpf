import { cn } from "@/lib/utils";

/**
 * Grid de 12 colunas (desktop, >=1280px) → 6 (tablet, >=768px) → 1 (mobile).
 * A ordem de colapso no mobile é a ordem de declaração dos <BentoCard> no
 * JSX — sempre declare KPIs primeiro, gráficos depois, tabelas por último.
 */
export function BentoGrid({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 md:grid-cols-6 md:gap-4 xl:grid-cols-12",
        "auto-rows-[minmax(7rem,auto)]",
        className
      )}
      {...props}
    />
  );
}
