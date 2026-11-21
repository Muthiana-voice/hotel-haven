import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"cliente" | "hotel_admin">("cliente");
  const [busy, setBusy] = useState(false);

  async function signInWithGoogle() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível iniciar a autenticação com Google.");
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { data: { full_name: fullName.trim(), role } },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Registo criado. Confirme o endereço de e-mail para activar a conta.");
          setMode("login");
          return;
        }
        toast.success("Conta criada com sucesso.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        toast.success("Sessão iniciada.");
      }
      await navigate({ to: "/" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível autenticar.");
    } finally { setBusy(false); }
  }

  return (
    <main className="mx-auto flex min-h-[65vh] max-w-md items-center px-4 py-12">
      <section className="w-full rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <Link to="/" search={{}} className="text-sm text-muted-foreground hover:text-foreground">← Voltar ao LUV CONECT</Link>
        <h1 className="mt-5 font-display text-3xl font-semibold">{mode === "login" ? "Entrar na sua conta" : "Criar conta"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">O mundo mais perto de si.</p>
        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={busy}
          className="mt-6 flex h-11 w-full items-center justify-center rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "A processar…" : "Continuar com Google"}
        </button>
        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          <span>ou utilize o seu e-mail</span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <form onSubmit={submit} className="space-y-4">
          {mode === "register" && <>
            <label className="block text-sm font-medium">Nome completo
              <input required value={fullName} onChange={e=>setFullName(e.target.value)} className="mt-1 h-11 w-full rounded-lg border bg-background px-3" autoComplete="name" />
            </label>
            <label className="block text-sm font-medium">Tipo de conta
              <select value={role} onChange={e=>setRole(e.target.value as "cliente" | "hotel_admin")} className="mt-1 h-11 w-full rounded-lg border bg-background px-3">
                <option value="cliente">Cliente</option>
                <option value="hotel_admin">Gestor de Hotel</option>
              </select>
            </label>
          </>}
          <label className="block text-sm font-medium">E-mail
            <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 h-11 w-full rounded-lg border bg-background px-3" autoComplete="email" />
          </label>
          <label className="block text-sm font-medium">Senha
            <input type="password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 h-11 w-full rounded-lg border bg-background px-3" autoComplete={mode === "login" ? "current-password" : "new-password"} />
          </label>
          <Button type="submit" className="h-11 w-full" disabled={busy}>{busy ? "A processar…" : mode === "login" ? "Entrar" : "Criar conta"}</Button>
        </form>
        <button type="button" onClick={()=>setMode(mode === "login" ? "register" : "login")} className="mt-5 w-full text-sm text-primary underline">
          {mode === "login" ? "Ainda não tem conta? Registar" : "Já tem conta? Entrar"}
        </button>
        <p className="mt-4 text-xs text-muted-foreground">O cargo de administrador geral não pode ser escolhido no registo público.</p>
      </section>
    </main>
  );
}
