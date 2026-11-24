import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { fetchRole, type Role } from '@/lib/auth';

export type Account = {
  id: string;
  name: string;
  email: string | null;
  initials: string;
  role: Role | null;
};

export const ROLE_LABEL: Record<Role, string> = {
  cliente: 'Hóspede',
  hotel_admin: 'Gestor de hotel',
  super_admin: 'Administrador geral',
};

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'L';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase();
}

/** Estado da conta actual: nome, e-mail, iniciais e cargo. */
export function useAccount() {
  const [state, setState] = useState<{ loading: boolean; account: Account | null }>({ loading: true, account: null });

  useEffect(() => {
    let active = true;

    async function apply(user: User | null | undefined) {
      if (!user) {
        if (active) setState({ loading: false, account: null });
        return;
      }
      const meta = user.user_metadata as { full_name?: string } | undefined;
      const name = meta?.full_name || user.email?.split('@')[0] || 'Conta';
      const role = await fetchRole(user.id);
      if (active) {
        setState({ loading: false, account: { id: user.id, name, email: user.email ?? null, initials: initialsOf(name), role } });
      }
    }

    void supabase.auth.getSession().then(({ data }) => apply(data.session?.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Sem chamadas ao Supabase dentro do callback: adia-se para evitar bloqueios.
      setTimeout(() => void apply(session?.user), 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}
