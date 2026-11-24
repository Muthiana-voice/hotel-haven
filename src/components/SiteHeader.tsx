import { Link, useRouterState } from '@tanstack/react-router';
import { UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Logo } from '@/components/Logo';
import { useAccount } from '@/lib/use-account';

export function SiteHeader() {
  const { account } = useAccount();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Na página inicial o logótipo grande já aparece no corpo da página.
  const isHome = pathname === '/';

  return (
    <header className='sticky top-0 z-30 border-b bg-background/85 backdrop-blur-xl'>
      <div className='grid h-16 grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-2 px-3 md:px-6'>
        <SidebarTrigger className='md:invisible' aria-label='Abrir menu' />
        {isHome ? (
          <span aria-hidden='true' />
        ) : (
          <Link to='/' search={{}} title='LUV CONECT — O mundo mais perto de si' className='justify-self-center'>
            <Logo size={34} />
          </Link>
        )}
        {account ? (
          <Link
            to='/perfil'
            aria-label={'O meu perfil — ' + account.name}
            title={account.name}
            className='grid size-10 place-items-center justify-self-end rounded-full bg-violet-soft text-sm font-bold text-violet-ink transition hover:opacity-80'
          >
            {account.initials}
          </Link>
        ) : (
          <Button asChild variant='ghost' size='icon' className='justify-self-end rounded-full' aria-label='Entrar / Conta'>
            <Link to='/auth'><UserRound /></Link>
          </Button>
        )}
      </div>
    </header>
  );
}
