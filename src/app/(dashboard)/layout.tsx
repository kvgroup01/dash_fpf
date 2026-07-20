import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardNav } from "@/components/nav/dashboard-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import { logout } from "./actions";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="glass-surface sticky top-0 z-10 border-b">
        <div className="mx-auto max-w-7xl px-4 py-3 md:px-6">
          <div className="flex items-center justify-between gap-3">
            <Link href="/anuncios" className="flex items-center">
              <Logo className="h-7 sm:h-8" />
            </Link>
            <DashboardNav className="hidden md:flex" />
            <div className="flex items-center gap-1">
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="h-11 w-11"
                aria-label="Configurações"
              >
                <Link href="/configuracoes">
                  <Settings className="size-5" />
                </Link>
              </Button>
              <ThemeToggle />
              <form action={logout}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11"
                  aria-label="Sair"
                >
                  <LogOut className="size-5" />
                </Button>
              </form>
            </div>
          </div>
          <DashboardNav className="mt-2 md:hidden" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6">
        {children}
      </main>
    </div>
  );
}
