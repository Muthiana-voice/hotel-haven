import { createFileRoute, Link } from '@tanstack/react-router';
import { CalendarCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAccount } from '@/lib/use-account';

export const Route = createFileRoute('/reservas')({
  head: () => ({ meta: [{ title: 'Minhas reservas — LUV CONECT' }] }),
  component: ReservationsPage,
});

function ReservationsPage() {
  const { loading, account } = useAccount();

  return (
    <main className='mx-auto max-w-2xl px-4 py-8'>
      <h1 className='font-display text-3xl font-extrabold tracking-tight'>Minhas reservas</h1>
      <div className='mt-6 grid place-items-center gap-3 rounded-3xl border border-dashed bg-card px-6 py-16 text-center'>
        <CalendarCheck className='size-10 text-primary' />
        {loading ? (
          <p className='text-muted-foreground'>A carregar…</p>
        ) : account ? (
          <>
            <p className='font-semibold'>Ainda não tem reservas</p>
            <p className='text-sm text-muted-foreground'>As suas reservas e códigos vão aparecer aqui.</p>
            <Button asChild className='mt-2 rounded-full'><Link to='/' search={{}}>Explorar hotéis</Link></Button>
          </>
        ) : (
          <>
            <p className='font-semibold'>Entre para acompanhar as suas reservas</p>
            <p className='text-sm text-muted-foreground'>Com a conta guarda os códigos de reserva e os recibos num só lugar.</p>
            <Button asChild className='mt-2 rounded-full'><Link to='/auth'>Entrar ou criar conta</Link></Button>
          </>
        )}
      </div>
    </main>
  );
}
