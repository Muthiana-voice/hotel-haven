import { useCallback } from "react";
import { redirect, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export type Role = "cliente" | "hotel_admin" | "super_admin";

const db = supabase as any;

/** Lê o cargo do utilizador na tabela profiles. Devolve null se não existir ou falhar. */
export async function fetchRole(userId: string): Promise<Role | null> {
  const { data, error } = await db.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (error || !data) return null;
  return data.role as Role;
}

/**
 * Protecção de rotas por cargo, para usar em beforeLoad.
 * - Sem sessão -> /auth
 * - Com sessão mas sem permissão -> painel do próprio cargo (ou / para clientes)
 *
 * A sessão do Supabase vive no navegador, por isso no servidor (SSR) a verificação é
 * ignorada. As páginas mantêm a sua própria verificação como segunda camada, e a
 * segurança real continua nas políticas RLS do Supabase.
 */
export async function requireRole(allowed: Role[]): Promise<void> {
  if (typeof window === "undefined") return;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) throw redirect({ to: "/auth" });
  const role = await fetchRole(session.user.id);
  if (role && allowed.includes(role)) return;
  if (role === "super_admin") throw redirect({ to: "/admin/geral" });
  if (role === "hotel_admin") throw redirect({ to: "/admin/hotel" });
  throw redirect({ to: "/", search: {} });
}

/** Depois do login: super_admin -> /admin/geral, hotel_admin -> /admin/hotel, cliente -> / */
export function useGoToPanel() {
  const navigate = useNavigate();
  return useCallback(
    async (role: Role | null | undefined) => {
      if (role === "super_admin") await navigate({ to: "/admin/geral", replace: true });
      else if (role === "hotel_admin") await navigate({ to: "/admin/hotel", replace: true });
      else await navigate({ to: "/", search: {}, replace: true });
    },
    [navigate],
  );
}
