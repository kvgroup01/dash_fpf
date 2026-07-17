import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Tamanhos fixos (não montar col-span-${n} em runtime — o Tailwind JIT não
 * detecta classes construídas dinamicamente). O nome do span descreve a
 * importância relativa do dado, não literalmente a proporção do grid:
 *  - "1x1": métrica secundária (na tablet, dois cabem lado a lado)
 *  - "2x1": card médio/largo
 *  - "2x2": card em destaque (ocupa mais área, mais alto)
 *  - "4x1": linha inteira (ex.: gráfico de série temporal)
 */
const bentoCardVariants = cva(
  "glass-card min-w-0 rounded-[var(--radius)] p-4 flex flex-col gap-3 sm:p-5",
  {
    variants: {
      span: {
        "1x1": "col-span-1 row-span-1 md:col-span-3 xl:col-span-3",
        "2x1": "col-span-1 row-span-1 md:col-span-6 xl:col-span-6",
        "2x2": "col-span-1 row-span-1 md:col-span-6 md:row-span-2 xl:col-span-6 xl:row-span-2",
        "4x1": "col-span-1 row-span-1 md:col-span-6 xl:col-span-12",
      },
    },
    defaultVariants: {
      span: "1x1",
    },
  }
);

interface BentoCardProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof bentoCardVariants> {}

export function BentoCard({ span, className, ...props }: BentoCardProps) {
  return (
    <div className={cn(bentoCardVariants({ span }), className)} {...props} />
  );
}
