import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const [accountName, setAccountName] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const name = session?.user.user_metadata?.full_name || session?.user.email || null;
      setAccountName(name);
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const user = data.session?.user;
      setAccountName(user ? (user.user_metadata?.full_name || user.email || "Conta activa") : null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Não foi possível terminar a sessão:", error);
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-xl">
      <div className="grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 md:px-6">
        <SidebarTrigger className="md:invisible" aria-label="Abrir menu" />
        <Link to="/" search={{}} title="LUV CONECT — O mundo mais perto de si" className="justify-self-center truncate font-display text-xl font-semibold tracking-[0.18em] text-foreground md:text-2xl">
          LUV <span className="text-primary">CONECT</span>
        </Link>
        {accountName ? (
          <div className="flex min-w-0 items-center gap-2 justify-self-end">
            <span className="hidden max-w-36 truncate text-xs text-muted-foreground sm:inline" title={accountName}>
              Sessão iniciada: {accountName}
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={signOut} className="text-xs">
              Sair
            </Button>
          </div>
        ) : (
          <Button asChild variant="ghost" size="icon" className="rounded-full" aria-label="Entrar / Conta">
            <Link to="/auth"><UserRound /></Link>
          </Button>
        )}
      </div>
    </header>
  );
}
