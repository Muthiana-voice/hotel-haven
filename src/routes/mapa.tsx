import { useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { zodValidator } from '@tanstack/zod-adapter';
import { HotelsMapView } from '@/components/HotelsMapView';
import { hotelsQuery } from '@/lib/hotels';
import { toHotelView } from '@/lib/hotel-utils';

const searchSchema = z.object({ hotel: z.string().optional() });

export const Route = createFileRoute('/mapa')({
  validateSearch: zodValidator(searchSchema),
  loader: ({ context }) => context.queryClient.ensureQueryData(hotelsQuery()),
  head: () => ({
    meta: [
      { title: 'Mapa de hotéis — LUV CONECT' },
      { name: 'description', content: 'Veja no mapa os hotéis disponíveis em Moçambique, com preços em MZN.' },
    ],
  }),
  errorComponent: ({ error }) => <p role='alert' className='p-8 text-destructive'>{error instanceof Error ? error.message : String(error)}</p>,
  component: MapPage,
});

function MapPage() {
  const { hotel } = Route.useSearch();
  const { data } = useSuspenseQuery(hotelsQuery());
  const hotels = useMemo(() => (data as any[]).map((h) => toHotelView(h, null)), [data]);

  return (
    <main className='mx-auto max-w-6xl space-y-4 px-4 py-4 md:px-6 md:py-6'>
      <header>
        <h1 className='font-display text-2xl font-extrabold tracking-tight md:text-3xl'>Mapa de hotéis</h1>
        <p className='mt-1 text-sm text-muted-foreground'>Toque num preço para ver o hotel e como chegar.</p>
      </header>
      <HotelsMapView hotels={hotels} focusId={hotel ?? null} className='h-[calc(100dvh-14rem)] min-h-[480px]' />
    </main>
  );
}
