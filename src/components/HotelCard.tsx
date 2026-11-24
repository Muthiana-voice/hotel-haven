import { Link } from '@tanstack/react-router';
import { Check, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ImagePlaceholder } from '@/components/ImagePlaceholder';
import type { SearchValues } from '@/components/SearchBar';
import { compareStore, useCompare, MAX_COMPARE } from '@/lib/compare';
import { formatMZN } from '@/lib/format';
import { formatKm, formatRating, type HotelView } from '@/lib/hotel-utils';
import { cn } from '@/lib/utils';

/** Cartão de hotel: compacto no mobile (grelha 2x2) e com botões no desktop. */
export function HotelCard({ hotel, search, onShowMap }: { hotel: HotelView; search: SearchValues; onShowMap: (id: string) => void }) {
  const items = useCompare();
  const key = 'hotel-' + hotel.id;
  const selected = items.some((i) => i.key === key);
  const distance = formatKm(hotel.distanceKm);

  function toggle() {
    const ok = compareStore.toggle({
      key,
      kind: 'hotel',
      hotelId: hotel.id,
      name: hotel.name,
      subtitle: hotel.city,
      image: hotel.image_url,
      price: hotel.minPrice,
      rating: hotel.rating,
      distanceKm: hotel.distanceKm,
      payAtHotel: hotel.payAtHotel,
      breakfast: hotel.breakfast,
    });
    if (!ok) toast.error('Pode comparar até ' + MAX_COMPARE + ' hotéis.');
  }

  return (
    <article className='flex flex-col overflow-hidden rounded-3xl border bg-card shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift'>
      <div className='relative'>
        <Link to='/hotel/$id' params={{ id: hotel.id }} search={search} aria-label={'Ver ' + hotel.name}>
          <ImagePlaceholder src={hotel.image_url} alt={hotel.name} className='aspect-[4/3] w-full' />
        </Link>
        <span className='absolute left-2 top-2 rounded-full bg-success-soft px-2.5 py-1 text-xs font-extrabold text-success-ink'>{formatRating(hotel.rating)}</span>
        <button
          type='button'
          onClick={toggle}
          aria-pressed={selected}
          aria-label={selected ? 'Remover ' + hotel.name + ' da comparação' : 'Comparar ' + hotel.name}
          className={cn('absolute right-2 top-2 grid size-9 place-items-center rounded-full border shadow-soft transition', selected ? 'border-violet bg-violet text-violet-foreground' : 'bg-card text-foreground hover:bg-muted')}
        >
          {selected ? <Check className='size-4' /> : <Plus className='size-4' />}
        </button>
      </div>
      <div className='flex flex-1 flex-col gap-1 p-3 sm:p-4'>
        <Link to='/hotel/$id' params={{ id: hotel.id }} search={search} className='line-clamp-1 font-bold hover:text-primary'>{hotel.name}</Link>
        <p className='line-clamp-1 text-sm text-muted-foreground'>{hotel.city}{distance ? ' · ' + distance : ''}</p>
        {hotel.province && <p className='hidden text-xs text-muted-foreground sm:block'>{hotel.province}</p>}
        <p className='mt-auto pt-2 text-lg font-extrabold'>
          {hotel.minPrice != null ? formatMZN(hotel.minPrice) : 'Preço sob consulta'}
          {hotel.minPrice != null && <span className='hidden text-xs font-normal text-muted-foreground sm:inline'> / noite</span>}
        </p>
        {hotel.payAtHotel && <span className='w-fit rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success-ink'>Pagar no hotel</span>}
        <div className='mt-2 hidden gap-2 sm:flex'>
          <Button type='button' variant='outline' size='sm' className='flex-1 rounded-full' onClick={() => onShowMap(hotel.id)}>Ver no mapa</Button>
          <Button asChild size='sm' className='flex-1 rounded-full'>
            <Link to='/hotel/$id' params={{ id: hotel.id }} search={search}>Ver quartos</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
