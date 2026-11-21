import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CalendarCheck, Loader2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";

type Experience = {
  favorites: string[];
  toggleFavorite: (id: string) => void;
  openAccount: () => void;
  openReservations: () => void;
  activeCity: string | undefined;
  setActiveCity: (city: string | undefined) => void;
};
const ExperienceContext = createContext<Experience | null>(null);

export function useAppExperience() {
  const value = useContext(ExperienceContext);
  if (!value) throw new Error("AppExperienceProvider is required");
  return value;
}

export function AppExperienceProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeCity, setActiveCity] = useState<string | undefined>();
  const [dialog, setDialog] = useState<"account" | "reservations" | null>(null);
  const [register, setRegister] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem("luv-conect-favorites") ?? "[]");
      if (Array.isArray(saved) && saved.every((id) => typeof id === "string")) setFavorites(saved);
    } catch { /* Favorites remain available for this visit. */ }
    void supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  const toggleFavorite = (id: string) => setFavorites((current) => {
    const next = current.includes(id) ? current.filter((value) => value !== id) : [...current, id];
    try { localStorage.setItem("luv-conect-favorites", JSON.stringify(next)); } catch { /* Storage may be disabled. */ }
    return next;
  });
  return (
    <ExperienceContext.Provider value={{ favorites, toggleFavorite, activeCity, setActiveCity, openAccount: () => { setFeedback(""); setDialog("account"); }, openReservations: () => setDialog("reservations") }}>
      {children}
      <Dialog open={dialog !== null} onOpenChange={(open) => { if (!open) setDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{dialog === "reservations" ? "Reservas" : user ? "A minha conta" : register ? "Registar no LUV CONECT" : "Entrar no LUV CONECT"}</DialogTitle></DialogHeader>
          {dialog === "reservations" ? <div className="py-6 text-center"><CalendarCheck className="mx-auto mb-4 size-10 text-primary" /><p className="text-sm text-muted-foreground">As reservas online ainda não estão disponíveis.</p></div> : user ? <div className="space-y-4"><p className="break-all text-sm">{user.email}</p><Button variant="outline" className="w-full" onClick={async () => { const { error } = await supabase.auth.signOut(); setFeedback(error?.message ?? "Sessão terminada."); }}>Terminar sessão</Button></div> : <form className="space-y-4" onSubmit={async (event) => {
            event.preventDefault(); setBusy(true); setFeedback("");
            const form = new FormData(event.currentTarget);
            const credentials = { email: String(form.get("email")), password: String(form.get("password")) };
            try {
              const { error } = register ? await supabase.auth.signUp(credentials) : await supabase.auth.signInWithPassword(credentials);
              if (error) setFeedback(error.message);
              else if (register) setFeedback("Registo enviado. Verifique o seu email para confirmar a conta.");
              else setDialog(null);
            } catch { setFeedback("Não foi possível ligar. Tente novamente."); } finally { setBusy(false); }
          }}>
            <label className="block space-y-1.5 text-sm">Email<Input name="email" type="email" autoComplete="email" required /></label>
            <label className="block space-y-1.5 text-sm">Palavra-passe<Input name="password" type="password" autoComplete={register ? "new-password" : "current-password"} minLength={6} required /></label>
            <Button type="submit" disabled={busy} className="w-full">{busy && <Loader2 className="animate-spin" />}{register ? "Registar" : "Entrar"}</Button>
            <Button type="button" variant="link" className="w-full" onClick={() => { setRegister(!register); setFeedback(""); }}>{register ? "Já tenho conta — Entrar" : "Criar uma conta"}</Button>
          </form>}
          {feedback && <p role="status" className="text-sm text-muted-foreground">{feedback}</p>}
        </DialogContent>
      </Dialog>
    </ExperienceContext.Provider>
  );
}