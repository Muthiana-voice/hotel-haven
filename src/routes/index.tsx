import { useEffect, useMemo, useRef, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Building2, List, Map as MapIcon, SlidersHorizontal } from 'lucide-react';
import { z } from 'zod';
import { zodValidator } from '@tanstack/zod-adapter';
import { toast } from 'sonner';
import { SearchBar } from '@/components/SearchBar';
import { HotelCard } from '@/components/HotelCard';
import { HotelsMapView } from '@/components/HotelsMapView';
import { LogoMark } from '@/components/Logo';
import { hotelsQuery } from '@/lib/hotels';
import { MAX_AUTO_DISTANCE_KM, NEARBY_KM, isBeach, normalizeText, toHotelView } from '@/lib/hotel-utils';
import { formatMZN } from '@/lib/format';
import { getCurrentPosition } from '@/lib/route';
import { cn } from '@/lib/utils';

const searchSchema = z.object({
  city: z.string().optional(),
  checkin: z.string().optional(),
  checkout: z.string().optional(),
  guests: z.coerce.number().int().min(1).optional(),
});

const POPULAR = ['Maputo', 'Beira', 'Inhambane', 'Pemba'];
const PRICE_STEPS = [3000, 5000, 8000, 10000];
const RATING_STEPS = [7, 8, 9];
const DISTANCE_STEPS = [5, 10, 25, 50];

type Sort = 'relevance' | 'price' | 'rating' | 'near';

const select = 'h-10 rounded-full border bg-card px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-50';
const chip = (active: boolean, tone: 'primary' | 'success' = 'primary') =>
  cn(
    'inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-sm font-semibold transition',
    active
      ? tone === 'success' ? 'border-success bg-success-soft text-success-ink' : 'border-primary bg-primary text-primary-foreground'
      : 'bg-card text-foreground hover:bg-muted',
  );

export const Route = createFileRoute('/')({
  validateSearch: zodValidator(searchSchema),
  loader: ({ context }) => context.queryClient.ensureQueryData(hotelsQuery()),
  head: () => ({
    meta: [
      { title: 'LUV CONECT — O mundo mais perto de si' },
      { name: 'description', content: 'Encontre, compare e reserve hotéis em Moçambique. Pague online ou em dinheiro no hotel.' },
      { property: 'og:title', content: 'LUV CONECT — O mundo mais perto de si' },
      { property: 'og:description', content: 'Encontre, compare e reserve hotéis em Moçambique, com preços em MZN.' },
    ],
  }),
  errorComponent: ({ error }) => <p role='alert' className='p-8 text-destructive'>{error instanceof Error ? error.message : String(error)}</p>,
  notFoundComponent: () => <p className='p-8'>Nada encontrado.</p>,
  component: Home,
});

function Home() {
  const search = Route.useSearch();
  const { data } = useSuspenseQuery(hotelsQuery());

  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [city, setCity] = useState<string | undefined>(search.city);
  const [province, setProvince] = useState('');
  const [maxPrice, setMaxPrice] = useState(0);
  const [minRating, setMinRating] = useState(0);
  const [maxDistance, setMaxDistance] = useState(0);
  const [sort, setSort] = useState<Sort>('relevance');
  const [payOnly, setPayOnly] = useState(false);
  const [beachOnly, setBeachOnly] = useState(false);
  const [nearby, setNearby] = useState(false);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [mapFocus, setMapFocus] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [message, setMessage] = useState('');
  const autoDone = useRef(false);
  const cityTouched = useRef(false);

  // A pesquisa digitada (URL) manda sobre tudo o resto.
  useEffect(() => {
    if (search.city !== undefined) { cityTouched.current = true; setCity(search.city); }
  }, [search.city]);

  const views = useMemo(() => (data as any[]).map((h) => toHotelView(h, userPos)), [data, userPos]);
  const provinces = useMemo(
    () => Array.from(new Set(views.map((h) => h.province).filter((p): p is string => !!p))).sort((a, b) => a.localeCompare(b, 'pt')),
    [views],
  );

  // Localização: só serve para distâncias e para sugerir a cidade mais próxima.
  // Nada disto é guardado no navegador.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (p) => { if (!cancelled) setUserPos([p.coords.latitude, p.coords.longitude]); },
      () => { if (!cancelled) setMessage('Escolha um destino para começar.'); },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
    return () => { cancelled = true; };
  }, []);

  // Detecção automática com limite máximo de distância.
  useEffect(() => {
    if (autoDone.current || !userPos || cityTouched.current) return;
    autoDone.current = true;
    let nearest = null as (typeof views)[number] | null;
    for (const h of views) {
      if (h.distanceKm != null && (nearest === null || h.distanceKm < (nearest.distanceKm ?? Infinity))) nearest = h;
    }
    if (nearest && nearest.distanceKm !== null && nearest.distanceKm <= MAX_AUTO_DISTANCE_KM) {
      setCity(nearest.city);
      setMessage('A mostrar hotéis em ' + nearest.city + ', o destino mais perto de si.');
    } else {
      setMessage('Não há hotéis a menos de ' + MAX_AUTO_DISTANCE_KM + ' km. A mostrar todos os destinos.');
    }
  }, [userPos, views]);

  const visible = useMemo(() => {
    const list = views.filter((h) => {
      if (city && !normalizeText(h.city + ' ' + (h.province ?? '')).includes(normalizeText(city))) return false;
      if (province && h.province !== province) return false;
      if (maxPrice && (h.minPrice == null || h.minPrice > maxPrice)) return false;
      if (minRating && h.rating < minRating) return false;
      if (maxDistance && (h.distanceKm == null || h.distanceKm > maxDistance)) return false;
      if (payOnly && !h.payAtHotel) return false;
      if (beachOnly && !isBeach(h)) return false;
      if (nearby && (h.distanceKm == null || h.distanceKm > NEARBY_KM)) return false;
      return true;
    });
    const byNumber = (get: (h: (typeof views)[number]) => number | null, dir: 1 | -1) => (a: (typeof views)[number], b: (typeof views)[number]) => {
      const x = get(a); const y = get(b);
      if (x === null && y === null) return 0;
      if (x === null) return 1;
      if (y === null) return -1;
      return (x - y) * dir;
    };
    if (sort === 'price') list.sort(byNumber((h) => h.minPrice, 1));
    else if (sort === 'rating' || sort === 'relevance') list.sort(byNumber((h) => h.rating, -1));
    else if (sort === 'near') list.sort(byNumber((h) => h.distanceKm, 1));
    return list;
  }, [views, city, province, maxPrice, minRating, maxDistance, payOnly, beachOnly, nearby, sort]);

  const filtersActive = !!(province || maxPrice || minRating || maxDistance || payOnly || beachOnly || nearby || city);

  function resetAll() {
    cityTouched.current = true;
    setCity(undefined); setProvince(''); setMaxPrice(0); setMinRating(0); setMaxDistance(0);
    setPayOnly(false); setBeachOnly(false); setNearby(false); setSort('relevance');
    setMessage('A mostrar todos os hotéis.');
  }

  function pickCity(name: string) {
    cityTouched.current = true;
    setCity((current) => (current && normalizeText(current) === normalizeText(name) ? undefined : name));
  }

  async function toggleNearby() {
    if (nearby) { setNearby(false); return; }
    try {
      const pos = userPos ?? (await getCurrentPosition());
      setUserPos(pos);
      setCity(undefined);
      cityTouched.current = true;
      setNearby(true);
      setSort('near');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível obter a sua localização.');
    }
  }

  function showOnMap(id: string) {
    setMapFocus(id);
    setView('map');
  }

  return (
    <main className='pb-10'>
      <section className='bg-hero px-4 pb-8 pt-8 md:px-6 md:pt-12'>
        <div className='mx-auto flex max-w-6xl flex-col items-center gap-6 text-center'>
          <div className='flex flex-col items-center'>
            <LogoMark size={56} />
            <h1 className='mt-3 font-display text-3xl font-extrabold tracking-tight md:text-4xl'>LUV <span className='text-primary'>CONECT</span></h1>
            <p className='mt-1 text-muted-foreground'>O mundo mais perto de si</p>
          </div>
          <div className='w-full max-w-4xl text-left'><SearchBar initial={search} /></div>
        </div>
      </section>

      <section id='hoteis' className='mx-auto max-w-6xl scroll-mt-20 space-y-4 px-4 pt-6 md:px-6'>
        <div className='flex items-center gap-2 overflow-x-auto pb-1'>
          <button type='button' className={chip(nearby)} aria-pressed={nearby} onClick={() => void toggleNearby()}>Perto de si</button>
          <button type='button' className={chip(payOnly, 'success')} aria-pressed={payOnly} onClick={() => setPayOnly((v) => !v)}>Dinheiro no hotel</button>
          <button type='button' className={chip(beachOnly)} aria-pressed={beachOnly} onClick={() => setBeachOnly((v) => !v)}>Praia</button>
          <button type='button' className={cn(chip(showFilters), 'md:hidden')} aria-expanded={showFilters} onClick={() => setShowFilters((v) => !v)}>
            <SlidersHorizontal className='mr-1.5 size-4' />Filtros
          </button>
          <div role='group' aria-label='Alternar vista' className='ml-auto flex shrink-0 rounded-full border bg-card p-1'>
            <button type='button' aria-pressed={view === 'list'} onClick={() => setView('list')} className={cn('inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-semibold', view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}><List className='size-4' />Lista</button>
            <button type='button' aria-pressed={view === 'map'} onClick={() => setView('map')} className={cn('inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-semibold', view === 'map' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}><MapIcon className='size-4' />Mapa</button>
          </div>
        </div>

        <div>
          <h2 className='mb-2 text-sm font-bold'>Destinos populares</h2>
          <div className='flex gap-2 overflow-x-auto pb-1'>
            {POPULAR.map((name) => (
              <button key={name} type='button' className={chip(!!city && normalizeText(city) === normalizeText(name))} onClick={() => pickCity(name)}>{name}</button>
            ))}
          </div>
        </div>

        <div className={cn('flex-wrap items-center gap-2', showFilters ? 'flex' : 'hidden', 'md:flex')}>
          <select aria-label='Província' className={select} value={province} onChange={(e) => setProvince(e.target.value)}>
            <option value=''>Província</option>
            {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select aria-label='Preço máximo (MZN)' className={select} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))}>
            <option value={0}>Preço (MZN)</option>
            {PRICE_STEPS.map((p) => <option key={p} value={p}>Até {formatMZN(p)}</option>)}
          </select>
          <select aria-label='Nota mínima' className={select} value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}>
            <option value={0}>Nota</option>
            {RATING_STEPS.map((r) => <option key={r} value={r}>{r}+</option>)}
          </select>
          <select aria-label='Distância máxima' className={select} value={maxDistance} disabled={!userPos} title={userPos ? undefined : 'Ative a localização para filtrar por distância'} onChange={(e) => setMaxDistance(Number(e.target.value))}>
            <option value={0}>Distância</option>
            {DISTANCE_STEPS.map((d) => <option key={d} value={d}>Até {d} km</option>)}
          </select>
          <select aria-label='Ordenar' className={cn(select, 'md:ml-auto')} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value='relevance'>Ordenar: Mais relevantes</option>
            <option value='price'>Menor preço</option>
            <option value='rating'>Melhor nota</option>
            <option value='near' disabled={!userPos}>Mais perto</option>
          </select>
        </div>

        <div className='flex flex-wrap items-center justify-between gap-2'>
          <p className='text-sm text-muted-foreground' aria-live='polite'>
            <span className='font-semibold text-foreground'>{visible.length} resultado(s)</span>
            {city ? ' em “' + city + '”' : ''}
            {message ? ' · ' + message : ''}
          </p>
          {filtersActive && <button type='button' onClick={resetAll} className='text-sm font-semibold text-primary underline'>Limpar filtros</button>}
        </div>

        {view === 'map' ? (
          <HotelsMapView hotels={visible} focusId={mapFocus} userPos={userPos} className='h-[calc(100dvh-12rem)] min-h-[480px]' />
        ) : visible.length === 0 ? (
          <div className='grid place-items-center gap-3 rounded-3xl border border-dashed py-20 text-center text-muted-foreground'>
            <Building2 className='size-10' />
            <p>Nenhum hotel encontrado com estes filtros.</p>
            <button type='button' onClick={resetAll} className='text-sm font-semibold text-primary underline'>Ver todos os hotéis</button>
          </div>
        ) : (
          <div className='grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4'>
            {visible.map((h) => <HotelCard key={h.id} hotel={h} search={search} onShowMap={showOnMap} />)}
          </div>
        )}
      </section>
    </main>
  );
}
