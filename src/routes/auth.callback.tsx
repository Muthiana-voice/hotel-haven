import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  component: GoogleAuthCallback,
});

function GoogleAuthCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("A concluir a entrada na sua conta…");

  useEffect(() => {
    let active = true;

    async function completeSignIn() {
      try {
        const params = new URLSearchParams(window.location.search);
        const providerError = params.get("error_description") || params.get("error");
        if (providerError) throw new Error(providerError);

        // Supabase normally processes the OAuth return during client initialisation.
        // Check for that session first to avoid exchanging the same code twice.
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!data.session) {
          const code = params.get("code");
          if (!code) {
            throw new Error("Não foi possível confirmar a sessão devolvida pelo Google. Tente novamente.");
          }
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        if (active) await navigate({ to: "/", replace: true });
      } catch (error) {
        console.error("Falha ao concluir autenticação Google:", error);
        if (active) {
          setMessage(error instanceof Error ? error.message : "Não foi possível concluir a autenticação.");
        }
      }
    }

    void completeSignIn();
    return () => { active = false; };
  }, [navigate]);

  return (
    <main className="mx-auto flex min-h-[65vh] max-w-md items-center px-4 py-12">
      <section className="w-full rounded-2xl border bg-card p-6 text-center shadow-sm sm:p-8">
        <h1 className="font-display text-2xl font-semibold">Autenticação Google</h1>
        <p className="mt-3 text-sm text-muted-foreground" role="status">{message}</p>
        {message !== "A concluir a entrada na sua conta…" && (
          <Link to="/auth" className="mt-6 inline-flex text-sm font-medium text-primary underline">
            Voltar ao início de sessão
          </Link>
        )}
      </section>
    </main>
  );
}
