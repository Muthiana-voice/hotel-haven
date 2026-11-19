import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Map, Star, Users } from "lucide-react";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImagePlaceholder } from "@/components/ImagePlaceholder";
import { CompareToggle } from "@/components/CompareToggle";
import { hotelQuery } from "@/lib/hotels";

const searchSchema = z.object({
  city: z.string().optional(),
  checkin: z.string().optional(),
  checkout: z.string().optional(),
  guests: z.coerce.number().int().min(1).optional(),
});

export const Route = createFileRoute("/hotel/$id")({
  validateSearch: zodValidator(searchSchema),
  loader: async ({ context, params }) => {
    const hotel = await context.queryClient.ensureQueryData(hotelQuery(params.id));
    if (!hotel) throw notFound();
    return { name: hotel.name, description: hotel.description };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.name} — Estadia` : "Hotel — Estadia" },
      { name: "description", content: loaderData?.description ?? "Detalhes do hotel e quartos disponíveis." },
      { property: "og:title", content: loaderData ? `${loaderData.name} — Estadia` : "Hotel — Estadia" },
      { property: "og:description", content: loaderData?.description ?? "Detalhes do hotel e quartos disponíveis." },
    ],
  }),
  errorComponent: ({ error }) => <p role="alert" className="p-8 text-destructive">{error instanceof Error ? error.message : String(error)}</p>,
  notFoundComponent: () => (
    <div className="p-8">
      <p>Hotel não encontrado.</p>
      <Link to="/" search={{}} className="text-primary underline">Voltar</Link>
    </div>
  ),
  component: HotelPage,
});

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function HotelPage() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const { data: hotel } = useSuspenseQuery(hotelQuery(id));
  if (!hotel) return null;
  const guests = search.guests ?? 1;
  const rooms = [...(hotel.rooms ?? [])].sort((a, b) => Number(a.price_per_night) - Number(b.price_per_night));

  return (
    <main className="mx-auto max-w-6xl px-4 pb-28 pt-6">
      <Link to="/" search={search} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Voltar aos resultados
      </Link>

      <ImagePlaceholder src={hotel.image_url} alt={hotel.name} className="mt-4 aspect-[21/9] w-full rounded-2xl" />

      <div className="mt-8 grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div>
          <h1 className="font-display text-3xl font-semibold md:text-4xl">{hotel.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Star className="size-4 fill-accent text-accent" />{Number(hotel.rating ?? 0).toFixed(1)}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="size-4" />{[hotel.address, hotel.city].filter(Boolean).join(", ")}</span>
          </div>
          {hotel.description && <p className="mt-6 leading-relaxed text-foreground/80">{hotel.description}</p>}
        </div>
        <div className="grid aspect-square place-items-center rounded-2xl border border-dashed bg-muted text-muted-foreground lg:aspect-auto">
          <div className="flex flex-col items-center gap-2 text-sm"><Map className="size-8" />Mapa em breve</div>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="mb-4 font-display text-2xl font-semibold">Quartos disponíveis</h2>
        {rooms.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">Nenhum quarto cadastrado.</p>
        ) : (
          <div className="space-y-4">
            {rooms.map((r) => {
              const fits = r.capacity >= guests;
              return (
                <article key={r.id} className="grid gap-4 overflow-hidden rounded-2xl border bg-card sm:grid-cols-[220px_1fr_auto]">
                  <ImagePlaceholder src={r.images?.[0]} alt={r.name} className="aspect-[4/3] w-full sm:aspect-auto sm:h-full" />
                  <div className="space-y-2 p-4 sm:pl-0">
                    <h3 className="font-semibold">{r.name}</h3>
                    {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
                    <p className="inline-flex items-center gap-1 text-sm"><Users className="size-4" />Até {r.capacity} hóspedes</p>
                    <div className="flex flex-wrap gap-1.5">
                      {r.amenities?.map((a) => <Badge key={a} variant="secondary">{a}</Badge>)}
                    </div>
                    <CompareToggle item={{ key: `room-${r.id}`, kind: "room", name: r.name, subtitle: hotel.name, price: Number(r.price_per_night), capacity: r.capacity, amenities: r.amenities }} />
                  </div>
                  <div className="flex flex-col items-start justify-between gap-3 border-t p-4 sm:items-end sm:border-l sm:border-t-0">
                    <div className="sm:text-right">
                      <div className="text-2xl font-semibold text-primary">{brl(Number(r.price_per_night))}</div>
                      <div className="text-xs text-muted-foreground">por noite</div>
                    </div>
                    <Button disabled={!fits} onClick={() => toast.success(`${r.name} selecionado`)}>
                      {fits ? "Selecionar Quarto" : "Capacidade insuficiente"}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
