import { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ExternalLink, Loader2, LocateFixed, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ImagePlaceholder } from '@/components/ImagePlaceholder';
import { PriceMap } from '@/components/PriceMap';
import { formatMZN } from '@/lib/format';
import { formatDuration, formatKm, formatRating, haversineKm, type HotelView } from '@/lib/hotel-utils';
import { fetchDrivingRoute, getCurrentPosition, type RouteResult } from '@/lib/route';
import { cn } from '@/lib/utils';

type Mode = 'car' | 'walk' | 'taxi';

type Props = {
  hotels: HotelView[];
  focusId?: string | null;
  userPos?: [number, number] | null;
  className?: string;
};

/** Mapa interativo: pins de preço, cartão do hotel, rota desde a sua localização e atalhos. */
export function HotelsMapView({ hotels, focusId = null, userPos = null, className = '' }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(focusId);
  const [me, setMe] = useState<[number, number] | null>(userPos);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [mode, setMode] = useState<Mode>('car');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (focusId) setSelectedId(focusId); }, [focusId]);
  useEffect(() => { if (userPos) setMe((current) => current ?? userPos); }, [userPos]);
  useEffect(() => { setRoute(null); setMode('car'); }, [selectedId]);

  const selected = useMemo(() => hotels.find((h) => h.id === selectedId) ?? null, [hotels, selectedId]);
  const mappable = useMemo(() => hotels.filter((h) => h.latitude != null && h.longitude != null), [hotels]);
  const hasTarget = selected != null && selected.latitude != null && selected.longitude != null;

  const straightKm = me && hasTarget ? haversineKm(me, [selected.latitude as number, selected.longitude as number]) : null;
  const addressLine = selected ? [selected.address, selected.city].filter(Boolean).join(', ') : '';
  // Tempos estimados: carro vem da rota; a pé a 5 km/h; táxi = carro + espera.
  const carMin = route ? route.durationMin : null;
  const walkMin = route ? (route.distanceKm / 5) * 60 : null;
  const taxiMin = route ? route.durationMin * 1.1 + 1 : null;

  async function locateMe() {
    try {
      setMe(await getCurrentPosition());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível obter a sua localização.');
    }
  }

  async function traceRoute() {
    if (!selected || selected.latitude == null || selected.longitude == null) return;
    setLoading(true);
    try {
      const pos = me ?? (await getCurrentPosition());
      setMe(pos);
      setRoute(await fetchDrivingRoute(pos, [selected.latitude, selected.longitude]));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível traçar a rota.');
    } finally {
      setLoading(false);
    }
  }

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(addressLine);
      toast.success('Morada copiada.');
    } catch {
      toast.error('Não foi possível copiar. Morada: ' + addressLine);
    }
  }

  const dest = hasTarget ? selected.latitude + ',' + selected.longitude : '';
  const googleUrl = 'https://www.google.com/maps/dir/?api=1&destination=' + dest + (me ? '&origin=' + me[0] + ',' + me[1] : '') + '&travelmode=' + (mode === 'walk' ? 'walking' : 'driving');
  const wazeUrl = 'https://waze.com/ul?ll=' + dest + '&navigate=yes';
  const whatsappUrl = selected
    ? 'https://wa.me/?text=' + encodeURIComponent(selected.name + (addressLine ? ' — ' + addressLine : '') + '\nhttps://www.google.com/maps/search/?api=1&query=' + dest)
    : '';

  const modeChip = (id: Mode, label: string, minutes: number | null) => (
    <button
      key={id}
      type='button'
      aria-pressed={mode === id}
      onClick={() => setMode(id)}
      className={cn('h-10 flex-1 rounded-full px-3 text-sm font-semibold transition', mode === id ? 'bg-secondary text-primary' : 'bg-muted text-foreground')}
    >
      {label}{minutes != null ? ' ' + formatDuration(minutes) : ''}
    </button>
  );

  return (
    <div className={cn('relative overflow-hidden rounded-3xl border bg-muted', className)}>
      <PriceMap
        className='absolute inset-0'
        hotels={hotels}
        selectedId={selectedId}
        onSelect={setSelectedId}
        userLocation={me}
        route={route?.points ?? null}
      />

      <button
        type='button'
        onClick={() => void locateMe()}
        aria-label='Usar a minha localização'
        className='absolute right-3 top-3 z-[1000] grid size-11 place-items-center rounded-full border bg-card shadow-soft hover:bg-muted'
      >
        <LocateFixed className='size-5' />
      </button>

      {mappable.length === 0 && (
        <p className='absolute inset-x-4 top-4 z-[1000] rounded-2xl border bg-card p-4 text-sm text-muted-foreground shadow-soft'>
          Nenhum hotel com coordenadas disponíveis para mostrar no mapa.
        </p>
      )}

      {selected && (
        <div className='absolute inset-x-3 bottom-3 z-[1000] max-h-[75%] space-y-3 overflow-y-auto rounded-3xl border bg-card p-4 shadow-lift'>
          <div className='flex gap-3'>
            <ImagePlaceholder src={selected.image_url} alt={selected.name} className='size-20 shrink-0 rounded-2xl' />
            <div className='min-w-0 flex-1'>
              <p className='truncate font-bold'>{selected.name}</p>
              <p className='truncate text-sm text-muted-foreground'>
                {selected.city}{formatKm(route ? route.distanceKm : straightKm) ? ' · ' + formatKm(route ? route.distanceKm : straightKm) + ' de si' : ''}
              </p>
              <p className='text-sm'>
                Nota {formatRating(selected.rating)}{selected.minPrice != null ? ' · ' + formatMZN(selected.minPrice) : ''}
              </p>
              {addressLine && <p className='truncate text-xs text-muted-foreground'>{addressLine}</p>}
            </div>
            <button type='button' aria-label='Fechar' onClick={() => setSelectedId(null)} className='h-fit rounded-full p-1.5 text-muted-foreground hover:bg-muted'>
              <X className='size-4' />
            </button>
          </div>

          {route && (
            <>
              <div className='flex gap-2'>
                {modeChip('car', 'Carro', carMin)}
                {modeChip('walk', 'A pé', walkMin)}
                {modeChip('taxi', 'Táxi', taxiMin)}
              </div>
              <p className='text-xs text-muted-foreground'>Tempos estimados a partir da sua localização.</p>
              <div className='grid grid-cols-2 gap-2'>
                <Button asChild variant='outline' className='h-11 rounded-full'>
                  <a href={googleUrl} target='_blank' rel='noopener noreferrer'>Abrir no Google Maps <ExternalLink className='size-3.5' /></a>
                </Button>
                <Button asChild variant='outline' className='h-11 rounded-full'>
                  <a href={wazeUrl} target='_blank' rel='noopener noreferrer'>Abrir no Waze <ExternalLink className='size-3.5' /></a>
                </Button>
                <Button type='button' variant='outline' className='h-11 rounded-full' disabled={!addressLine} onClick={() => void copyAddress()}>Copiar morada</Button>
                <Button asChild variant='ghost' className='h-11 rounded-full bg-success-soft font-bold text-success-ink hover:bg-success-soft/70'>
                  <a href={whatsappUrl} target='_blank' rel='noopener noreferrer'>Partilhar no WhatsApp</a>
                </Button>
              </div>
            </>
          )}

          <div className='grid grid-cols-2 gap-2'>
            <Button type='button' variant='outline' className='h-11 rounded-full' disabled={!hasTarget || loading} onClick={() => void traceRoute()}>
              {loading && <Loader2 className='animate-spin' />}{route ? 'Atualizar rota' : 'Como chegar'}
            </Button>
            <Button asChild className='h-11 rounded-full font-bold'>
              <Link to='/hotel/$id' params={{ id: selected.id }} search={{}}>Ver quartos</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
