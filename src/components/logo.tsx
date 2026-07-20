import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * A logo original ("FPF tech") tem letreiro escuro pensado pra fundo claro —
 * some no tema escuro sem um fundo próprio. Por isso o selo branco fixo,
 * independente do tema do app.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-8 items-center rounded-md bg-white px-2 shadow-sm",
        className
      )}
    >
      <Image
        src="/brand/fpf-logo.png"
        alt="FPF tech"
        width={470}
        height={129}
        priority
        className="h-full w-auto"
      />
    </span>
  );
}
