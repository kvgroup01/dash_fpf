import { cn } from "@/lib/utils";

type GlassLevel = "surface" | "card" | "popover";

interface GlassSurfaceProps extends React.ComponentProps<"div"> {
  level?: GlassLevel;
}

const levelClass: Record<GlassLevel, string> = {
  surface: "glass-surface",
  card: "glass-card",
  popover: "glass-popover",
};

/** Wrapper genérico de vidro para os casos que não são um BentoCard (shell, sidebar, headers). */
export function GlassSurface({
  level = "surface",
  className,
  ...props
}: GlassSurfaceProps) {
  return <div className={cn(levelClass[level], className)} {...props} />;
}
