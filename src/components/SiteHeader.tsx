import { Link } from "@tanstack/react-router";
import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-xl">
      <div className="grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 md:px-6">
        <SidebarTrigger className="md:invisible" aria-label="Abrir menu" />
        <Link to="/" search={{}} className="justify-self-center truncate font-display text-xl font-semibold tracking-[0.18em] text-foreground md:text-2xl">
          LUV <span className="text-primary">CONECT</span>
        </Link>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Entrar">
          <UserRound />
        </Button>
      </div>
    </header>
  );
}
