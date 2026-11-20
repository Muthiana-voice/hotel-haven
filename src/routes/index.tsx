import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Star, MapPin, Building2 } from "lucide-react";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { SearchBar } from "@/components/SearchBar";
import { ImagePlaceholder } from "@/components/ImagePlaceholder";
import { CompareToggle } from "@/components/CompareToggle";
import { HotelMap } from "@/components/HotelMap";
import { hotelsQuery } from "@/lib/hotels";

const searchSchema = z.object({
  city: z.string().optional(),
  checkin: z.string().optional(),
  checkout: z.string().optional(),
  guests: z.coerce.number().int().min(1).optional(),
});

export const Route = createFileRoute("/")({
  validateSearch: zodValidator(searchSchema),
  loaderDeps: ({ search }) => ({ city: search.city }),
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(hotelsQuery(deps.city)),
  head: () => ({
    meta: [
      { title: "Estadia — Reserve hotéis com facilidade" },
      { name: "description", content: "Encontre e compare hotéis e quartos por destino, datas e número de hóspedes." },
      { property: "og:title", content: "Estadia — Reserve hotéis com facilidade" },
      { property: "og:description", content: "Encontre e compare hotéis e quartos por destino, datas e hóspedes." },
    ],
  }),
  errorComponent: ({ error }) => <p role="alert" className="p-8 text-destructive">{error instanceof Error ? error.message : String(error)}</p>,
  notFoundComponent: () => <p className="p-8">Nada encontrado.</p>,
  component: Home,
});

function Home() {
  const search = Route.useSearch();
  const { data: hotels } = useSuspenseQuery(hotelsQuery(search.city));
  return (
    <main className="pb-28">
      <section className="bg-hero">
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-20">
          <h1 className="max-w-2xl font-display text-4xl font-semibold leading-tight text-foreground md:text-6xl">
            Sua próxima estadia, <em className="text-primary">sem complicação.</em>
          </h1>
          <p className="mt-4 max-w-lg text-muted-foreground">Busque, compare e escolha o quarto ideal.</p>
          <div className="mt-10"><SearchBar initial={search} /></div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-12">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-display text-2xl font-semibold">
            {search.city ? `Hotéis em “${search.city}”` : "Hotéis em destaque"}
          </h2>
          <span className="text-sm text-muted-foreground">{hotels.length} resultado(s)</span>
        </div>

        <div className="mb-8">
          <h3 className="mb-3 font-display text-xl font-semibold">Mapa dos hotéis</h3>
          <HotelMap hotels={hotels.map((hotel) => ({
            id: hotel.id,
            name: hotel.name,
            city: hotel.city,
            address: hotel.address,
            latitude: hotel.latitude,
            longitude: hotel.longitude,
          }))} />
        </div>

        {hotels.length === 0 ? (
          <div className="grid place-items-center gap-3 rounded-2xl border border-dashed py-20 text-center text-muted-foreground">
            <Building2 className="size-10" />
            <p>Nenhum hotel cadastrado ainda.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {hotels.map((h) => (
              <article key={h.id} className="group overflow-hidden rounded-2xl border bg-card transition hover:shadow-lift">
                <Link to="/hotel/$id" params={{ id: h.id }} search={search}>
                  <ImagePlaceholder src={h.image_url} alt={h.name} className="aspect-[4/3] w-full" />
                </Link>
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link to="/hotel/$id" params={{ id: h.id }} search={search} className="font-semibold text-foreground hover:text-primary">
                      {h.name}
                    </Link>
                    <span className="inline-flex items-center gap-1 text-sm font-medium"><Star className="size-4 fill-accent text-accent" />{Number(h.rating ?? 0).toFixed(1)}</span>
                  </div>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-3.5" />{h.city}</p>
                  <CompareToggle item={{ key: `hotel-${h.id}`, kind: "hotel", name: h.name, subtitle: `${h.city} · ★ ${Number(h.rating ?? 0).toFixed(1)}` }} />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
