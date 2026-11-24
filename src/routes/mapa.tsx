import { useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { HotelMap } from '@/components/HotelMap';
import { hotelsQuery } from '@/lib/hotels';

export const Route = createFileRoute('/mapa')({
  loader: ({ context }) => context.queryClient.ensureQueryData(hotelsQuery()),
  head: () => ({
    meta: [
      { title: 'Mapa de hotéis — LUV CONECT' },
      { name: 'description', content: 'Veja no mapa os hotéis disponíveis em Moçambique.' },
    ],
  }),
  errorComponent: ({ error }) => <p role='alert' className='p-8 text-destructive'>{error instanceof Error ? error.message : String(error)}</p>,
  component: MapPage,
});

function MapPage() {
  const { data: hotels } = useSuspenseQuery(hotelsQuery());
  const items = useMemo(
    () => hotels.map((h: any) => ({ id: h.id, name: h.name, city: h.city ?? null, address: h.address ?? null, latitude: h.latitude ?? null, longitude: h.longitude ?? null })),
    [hotels],
  );

  return (
    <main className='mx-auto max-w-6xl space-y-4 px-4 py-6 md:px-6'>
      <header>
        <h1 className='font-display text-3xl font-extrabold tracking-tight'>Mapa de hotéis</h1>
        <p className='mt-1 text-sm text-muted-foreground'>Toque num marcador para ver o hotel.</p>
      </header>
      <HotelMap hotels={items} className='h-[65vh]' />
    </main>
  );
}
