import { Link } from "@tanstack/react-router";
import { Hotel } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" search={{}} className="flex items-center gap-2 font-display text-xl font-semibold text-foreground">
          <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <Hotel className="size-4" />
          </span>
          Estadia
        </Link>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" size="sm">Entrar</Button>
          <Button size="sm">Cadastrar Hotel</Button>
        </nav>
      </div>
    </header>
  );
}
