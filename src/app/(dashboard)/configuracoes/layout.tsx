import { ConfigNav } from "./config-nav";

export default function ConfiguracoesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <ConfigNav />
      {children}
    </div>
  );
}
