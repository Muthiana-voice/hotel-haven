import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { fetchRole, useGoToPanel } from "@/lib/auth";

// O sufixo "_" em "auth_" faz desta rota irmã de /auth (e não filha).
// Assim o OAuth do Google já não cai no ecrã de login. O URL continua a ser /auth/callback.
export const Route = createFileRoute("/auth_/callback")({
  component: GoogleAuthCallback,
});

const WORKING_MESSAGE = "A concluir a entrada na sua conta…";

function GoogleAuthCallback() {
  const goToPanel = useGoToPanel();
  const [message, setMessage] = useState(WORKING_MESSAGE);

  useEffect(() => {
    let active = true;

    async function completeSignIn() {
      try {
        const params = new URLSearchParams(window.location.search);
        const providerError = params.get("error_description") || params.get("error");
        if (providerError) throw new Error(providerError);

        // O Supabase normalmente processa o regresso do OAuth ao iniciar o cliente.
        // Verificamos primeiro se já há sessão para não trocar o mesmo código duas vezes.
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

        const {
          data: { session },
        } = await supabase.auth.getSession();
        const role = session?.user ? await fetchRole(session.user.id) : null;
        if (active) await goToPanel(role);
      } catch (error) {
        console.error("Falha ao concluir autenticação Google:", error);
        if (active) {
          setMessage(error instanceof Error ? error.message : "Não foi possível concluir a autenticação.");
        }
      }
    }

    void completeSignIn();
    return () => {
      active = false;
    };
  }, [goToPanel]);

  return (
    <main className="mx-auto flex min-h-[65vh] max-w-md items-center px-4 py-12">
      <section className="w-full rounded-2xl border bg-card p-6 text-center shadow-sm sm:p-8">
        <h1 className="font-display text-2xl font-semibold">Autenticação Google</h1>
        <p className="mt-3 text-sm text-muted-foreground" role="status">{message}</p>
        {message !== WORKING_MESSAGE && (
          <Link to="/auth" className="mt-6 inline-flex text-sm font-medium text-primary underline">
            Voltar ao início de sessão
          </Link>
        )}
      </section>
    </main>
  );
}
