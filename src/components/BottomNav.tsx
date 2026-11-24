import { Link, useRouterState } from '@tanstack/react-router';
import { CalendarCheck, Compass, Map as MapIcon, Scale, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { compareStore, useCompare } from '@/lib/compare';
import { cn } from '@/lib/utils';

const base = 'relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[11px] font-medium transition-colors';
const idle = 'text-muted-foreground hover:text-foreground';
const on = 'bg-secondary font-bold text-primary';

/** Barra inferior fixa (só no mobile): Explorar, Mapa, Comparar, Reservas e Perfil. */
export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const compare = useCompare();
  const exploring = pathname === '/' || pathname.startsWith('/hotel');
  const tab = (active: boolean) => cn(base, active ? on : idle);
  const current = (active: boolean) => (active ? 'page' : undefined);

  return (
    <nav aria-label='Navegação principal' className='fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-soft backdrop-blur md:hidden'>
      <div className='mx-auto grid max-w-md grid-cols-5 gap-1 px-2 py-1.5'>
        <Link to='/' search={{}} className={tab(exploring)} aria-current={current(exploring)}>
          <Compass className='size-5' />Explorar
        </Link>
        <Link to='/mapa' className={tab(pathname.startsWith('/mapa'))} aria-current={current(pathname.startsWith('/mapa'))}>
          <MapIcon className='size-5' />Mapa
        </Link>
        <button
          type='button'
          className={tab(false)}
          onClick={() => {
            if (compare.length < 2) toast('Marque pelo menos 2 hotéis ou quartos para comparar.');
            else compareStore.requestOpen();
          }}
        >
          <Scale className='size-5' />Comparar
          {compare.length > 0 && (
            <span className='absolute right-2 top-1 grid min-w-4 place-items-center rounded-full bg-violet px-1 text-[10px] font-bold leading-4 text-violet-foreground'>
              {compare.length}
            </span>
          )}
        </button>
        <Link to='/reservas' className={tab(pathname.startsWith('/reservas'))} aria-current={current(pathname.startsWith('/reservas'))}>
          <CalendarCheck className='size-5' />Reservas
        </Link>
        <Link to='/perfil' className={tab(pathname.startsWith('/perfil'))} aria-current={current(pathname.startsWith('/perfil'))}>
          <UserRound className='size-5' />Perfil
        </Link>
      </div>
    </nav>
  );
}
