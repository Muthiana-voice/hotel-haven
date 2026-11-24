import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { CalendarDays, MapPin, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type SearchValues = { city?: string | undefined; checkin?: string | undefined; checkout?: string | undefined; guests?: number | undefined };

const label = 'flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground';
const input = 'w-full bg-transparent text-[15px] font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground';

export function SearchBar({ initial }: { initial: SearchValues }) {
  const navigate = useNavigate();
  const [v, setV] = useState(initial);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void navigate({ to: '/', search: { ...v, city: v.city?.trim() || undefined } });
      }}
      className='grid grid-cols-2 gap-2 rounded-3xl border bg-card p-3 shadow-soft md:grid-cols-[1.5fr_1.3fr_0.7fr_auto] md:items-center md:gap-3 md:rounded-full md:py-2 md:pl-6 md:pr-2'
    >
      <label className='col-span-2 flex flex-col gap-1 rounded-2xl bg-secondary px-4 py-2.5 md:col-span-1 md:bg-transparent md:p-0'>
        <span className={label}><MapPin className='size-3.5' />Destino</span>
        <input className={input} placeholder='Para onde vai? Província ou cidade' value={v.city ?? ''} onChange={(e) => setV({ ...v, city: e.target.value })} />
      </label>
      <div className='col-span-2 flex flex-col gap-1 rounded-2xl bg-secondary px-4 py-2.5 md:col-span-1 md:border-l md:bg-transparent md:py-0 md:pl-4'>
        <span className={label}><CalendarDays className='size-3.5' />Datas</span>
        <div className='flex items-center gap-1.5'>
          <input type='date' aria-label='Check-in' className={input} value={v.checkin ?? ''} onChange={(e) => setV({ ...v, checkin: e.target.value || undefined })} />
          <span className='text-muted-foreground'>–</span>
          <input type='date' aria-label='Check-out' min={v.checkin} className={input} value={v.checkout ?? ''} onChange={(e) => setV({ ...v, checkout: e.target.value || undefined })} />
        </div>
      </div>
      <label className='flex flex-col gap-1 rounded-2xl bg-secondary px-4 py-2.5 md:border-l md:bg-transparent md:py-0 md:pl-4'>
        <span className={label}><Users className='size-3.5' />Hóspedes</span>
        <input type='number' min={1} max={20} className={input} value={v.guests ?? 2} onChange={(e) => setV({ ...v, guests: Number(e.target.value) || 1 })} />
      </label>
      <Button type='submit' size='lg' className='h-full min-h-12 rounded-2xl font-bold md:rounded-full md:px-8'><Search />Buscar</Button>
    </form>
  );
}
