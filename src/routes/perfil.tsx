import { createFileRoute, Link } from '@tanstack/react-router';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSignOut } from '@/lib/auth';
import { ROLE_LABEL, useAccount } from '@/lib/use-account';

export const Route = createFileRoute('/perfil')({
  head: () => ({ meta: [{ title: 'O meu perfil — LUV CONECT' }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { loading, account } = useAccount();
  const signOut = useSignOut();

  return (
    <main className='mx-auto max-w-md px-4 py-8'>
      <h1 className='font-display text-3xl font-extrabold tracking-tight'>O meu perfil</h1>
      {loading ? (
        <p className='mt-6 text-muted-foreground'>A carregar…</p>
      ) : account ? (
        <div className='mt-6 space-y-6'>
          <div className='flex flex-col items-center gap-3 text-center'>
            <span className='grid size-24 place-items-center rounded-full bg-violet-soft text-3xl font-extrabold text-violet-ink'>{account.initials}</span>
            <div>
              <p className='text-lg font-bold'>{account.name}</p>
              {account.email && <p className='text-sm text-muted-foreground'>{account.email}</p>}
              {account.role && <p className='mt-1 text-xs font-semibold text-violet-ink'>{ROLE_LABEL[account.role]}</p>}
            </div>
          </div>
          <p className='rounded-2xl bg-secondary p-4 text-sm text-secondary-foreground'>Idioma e moeda: PT · MZN</p>
          <Button type='button' variant='outline' className='h-12 w-full rounded-full' onClick={() => void signOut()}>
            <LogOut />Terminar sessão
          </Button>
        </div>
      ) : (
        <div className='mt-6 grid place-items-center gap-3 rounded-3xl border border-dashed bg-card px-6 py-14 text-center'>
          <p className='font-semibold'>Entre para ver o seu perfil</p>
          <Button asChild className='rounded-full'><Link to='/auth'>Entrar ou criar conta</Link></Button>
        </div>
      )}
    </main>
  );
}
