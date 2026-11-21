import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Star, MapPin, Building2, Heart, ArrowRight, SlidersHorizontal, Waves, Coffee, Sparkles, TrendingDown } from "lucide-react";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { SearchBar } from "@/components/SearchBar";
import { ImagePlaceholder } from "@/components/ImagePlaceholder";
import { CompareToggle } from "@/components/CompareToggle";
import { hotelsQuery } from "@/lib/hotels";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAppExperience } from "@/components/AppExperience";
import { summarizeRooms, matchesQuickFilter, compareHotelOrder, formatMzn, type QuickFilter, type HotelSort } from "@/lib/hotel-presentation";

const LOCATION_STORAGE_KEY = "luv-conect-location";
const ALL_LOCATIONS_VALUE = "__all__";

const searchSchema = z.object({
  city: z.string().optional(),
  favorites: z.boolean().optional(),
  checkin: z.string().optional(),
  checkout: z.string().optional(),
  guests: z.coerce.number().int().min(1).optional(),
});

function nearestHotelCity(latitude: number, longitude: number, hotels: Array<{
  city: string;
  latitude: number | null;
  longitude: number | null;
}>): string | undefined {
  let nearestCity: string | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const hotel of hotels) {
    if (typeof hotel.latitude !== "number" || typeof hotel.longitude !== "number") continue;
    if (!Number.isFinite(hotel.latitude) || !Number.isFinite(hotel.longitude)) continue;

    const radians = Math.PI / 180;
    const lat1 = latitude * radians;
    const lat2 = hotel.latitude * radians;
    const deltaLat = (hotel.latitude - latitude) * radians;
    const deltaLon = (hotel.longitude - longitude) * radians;
    const a = Math.sin(deltaLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
    const distance = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestCity = hotel.city;
    }
  }

  return nearestCity;
}

export const Route = createFileRoute("/")({
  validateSearch: zodValidator(searchSchema),
  loader: ({ context }) => context.queryClient.ensureQueryData(hotelsQuery()),
  head: () => ({
    meta: [
      { title: "LUV CONECT — Reserve hotéis com facilidade" },
      { name: "description", content: "Encontre e compare hotéis e quartos por destino, datas e número de hóspedes." },
      { property: "og:title", content: "LUV CONECT — Reserve hotéis com facilidade" },
      { property: "og:description", content: "Encontre e compare hotéis e quartos por destino, datas e hóspedes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: ({ error }) => <p role="alert" className="p-8 text-destructive">{error instanceof Error ? error.message : String(error)}</p>,
  notFoundComponent: () => <p className="p-8">Nada encontrado.</p>,
  component: Home,
});

function Home() {
  const search = Route.useSearch();
  const { data: hotels } = useSuspenseQuery(hotelsQuery());
  const [selectedCity, setSelectedCity] = useState<string | undefined>(search.city === ALL_LOCATIONS_VALUE ? undefined : search.city);
  const [locationMessage, setLocationMessage] = useState("A localizar hotéis próximos de si…");
  const [filter, setFilter] = useState<QuickFilter>("all");
  const [sort, setSort] = useState<HotelSort>("recommended");
  const { favorites, toggleFavorite, setActiveCity } = useAppExperience();
  // Presentation-only read: the existing hotel queries and location detection stay unchanged.
  const { data: roomData = [], isError: roomError } = useQuery({
    queryKey: ["hotel-card-room-summaries"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("hotel_id, price_per_night, capacity, amenities");
      if (error) throw error;
      return data;
    },
  });
  const activeCity = selectedCity;
  useEffect(() => setActiveCity(activeCity), [activeCity, setActiveCity]);
  const visibleHotels = useMemo(() => hotels
    .filter((hotel) => !activeCity || hotel.city.toLocaleLowerCase().includes(activeCity.toLocaleLowerCase()) || hotel.province?.toLocaleLowerCase() === activeCity.toLocaleLowerCase())
    .filter((hotel) => !search.favorites || favorites.includes(hotel.id))
    .map((hotel) => ({ ...hotel, summary: summarizeRooms(roomData.filter((room) => room.hotel_id === hotel.id)) }))
    .filter((hotel) => matchesQuickFilter(hotel.summary.amenities, filter))
    .sort((a, b) => compareHotelOrder({ rating: a.rating, price: a.summary.price }, { rating: b.rating, price: b.summary.price }, sort)),
    [hotels, activeCity, search.favorites, favorites, roomData, filter, sort]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    const saveLocation = (city: string | undefined) => {
      if (cancelled) return;
      setSelectedCity(city);
      setLocationMessage(city ? `A mostrar hotéis em ${city}.` : "A mostrar todos os hotéis. Pode escolher uma localização.");
      try {
        window.localStorage.setItem(LOCATION_STORAGE_KEY, city ?? ALL_LOCATIONS_VALUE);
      } catch {
        // Storage may be disabled; location filtering still works for this visit.
      }
    };

    if (search.city) {
      saveLocation(search.city === ALL_LOCATIONS_VALUE ? undefined : search.city);
      return () => { cancelled = true; };
    }

    try {
      const saved = window.localStorage.getItem(LOCATION_STORAGE_KEY);
      if (saved !== null) {
        saveLocation(saved === ALL_LOCATIONS_VALUE ? undefined : saved);
        return () => { cancelled = true; };
      }
    } catch {
      // Continue with automatic location detection when storage is unavailable.
    }

    if (!("geolocation" in navigator)) {
      saveLocation(undefined);
      return () => { cancelled = true; };
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const city = nearestHotelCity(
          position.coords.latitude,
          position.coords.longitude,
          hotels,
        );
        saveLocation(city);
      },
      () => saveLocation(undefined),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );

    return () => { cancelled = true; };
  }, [hotels, search.city]);

  const handleLocationChange = (value: string) => {
    const city = value === ALL_LOCATIONS_VALUE ? undefined : value;
    setSelectedCity(city);
    setLocationMessage(city ? `A mostrar hotéis em ${city}.` : "A mostrar todos os hotéis.");
    try {
      window.localStorage.setItem(LOCATION_STORAGE_KEY, city ?? ALL_LOCATIONS_VALUE);
    } catch {
      // Keep the selection active for the current visit if storage is unavailable.
    }
  };

  const filters = [
    { value: "all", label: "Todos", icon: SlidersHorizontal },
    { value: "cheap", label: "Mais Baratos", icon: TrendingDown },
    { value: "rated", label: "Melhor Avaliados", icon: Star },
    { value: "pool", label: "Piscina", icon: Waves },
    { value: "sea", label: "Frente ao Mar", icon: Sparkles },
    { value: "breakfast", label: "Pequeno-almoço", icon: Coffee },
  ] as const;

  return (
    <main className="mx-auto max-w-7xl px-3 pb-32 pt-7 md:px-7 md:pt-9">
      <section aria-label="Pesquisar hotéis">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-primary">Encontre a sua estadia</p>
            <h1 className="text-2xl font-bold md:text-3xl">{search.favorites ? "Os seus favoritos" : activeCity ? `Hotéis em ${activeCity}` : "Explore os melhores destinos"}</h1>
          </div>
          <span className="hidden text-sm text-muted-foreground lg:block">Hotéis · Quartos · Novos destinos</span>
        </div>
        <SearchBar initial={{ ...search, city: activeCity }} />
        <div className="mt-5 flex gap-2 overflow-x-auto pb-2" aria-label="Filtros rápidos">
          {filters.map(({ value, label, icon: Icon }) => <Button key={value} variant={filter === value ? "default" : "outline"} size="sm" className="h-9 shrink-0 rounded-full px-3 text-xs" aria-pressed={filter === value} onClick={() => { setFilter(value); if (value === "cheap") setSort("price"); else if (value === "rated") setSort("rating"); else if (value === "all") setSort("recommended"); }}><Icon />{label}</Button>)}
        </div>
      </section>

      <section id="hoteis" className="scroll-mt-44 pt-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          <div><h2 className="text-lg font-bold">{search.favorites ? "Hotéis guardados" : "Estadias para si"}</h2><p className="mt-0.5 text-xs text-muted-foreground" aria-live="polite">{visibleHotels.length} {visibleHotels.length === 1 ? "hotel encontrado" : "hotéis encontrados"}</p></div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">Ordenar por:<select aria-label="Ordenar hotéis" value={sort} onChange={(event) => setSort(event.target.value as HotelSort)} className="max-w-36 rounded-md border bg-card px-2 py-2 font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring"><option value="recommended">Recomendados</option><option value="price">Menor preço</option><option value="rating">Avaliação</option></select></label>
        </div>
        <p className="sr-only" aria-live="polite">{locationMessage}</p>
        {roomError && <p role="status" className="mb-4 text-sm text-muted-foreground">Os preços e as comodidades não estão disponíveis neste momento.</p>}
        {visibleHotels.length === 0 ? (
          <div className="grid place-items-center gap-3 border-y border-dashed py-20 text-center text-muted-foreground">
            {search.favorites ? <Heart className="size-10" /> : <Building2 className="size-10" />}
            <p>{search.favorites ? "Ainda não há hotéis favoritos nesta seleção." : "Nenhum hotel encontrado com estes filtros."}</p>
            <Button variant="link" onClick={() => { handleLocationChange(ALL_LOCATIONS_VALUE); setFilter("all"); }}>Ver todos os destinos</Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-3 2xl:grid-cols-4">
            {visibleHotels.map((h) => (
              <article key={h.id} className="group min-w-0 overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-lift">
                <div className="relative">
                  <Link to="/hotel/$id" params={{ id: h.id }} search={search} aria-label={`Ver ${h.name}`}>
                    <ImagePlaceholder src={h.image_url} alt={h.name} className="aspect-[4/3] w-full" />
                  </Link>
                  <Button variant="secondary" size="icon" className="absolute right-2 top-2 size-8 rounded-full bg-card/95 shadow-sm" aria-label={`${favorites.includes(h.id) ? "Remover dos" : "Adicionar aos"} favoritos: ${h.name}`} aria-pressed={favorites.includes(h.id)} title="Favoritar hotel" onClick={() => toggleFavorite(h.id)}><Heart className={favorites.includes(h.id) ? "fill-primary text-primary" : "text-foreground"} /></Button>
                  <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-card/95 px-2 py-1 text-xs font-bold shadow-sm"><Star className="size-3 fill-accent text-accent" />{h.rating == null ? "Sem nota" : Number(h.rating).toFixed(1)}</span>
                </div>
                <div className="flex flex-col gap-2 p-3 md:p-4">
                  <Link to="/hotel/$id" params={{ id: h.id }} search={search} className="line-clamp-2 min-h-10 break-words text-sm font-bold leading-5 text-foreground hover:text-primary md:text-base">{h.name}</Link>
                  <p className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3 shrink-0" /><span className="truncate">{h.city}</span></p>
                  <div className="mt-2 border-t pt-3">
                    <p className="text-[10px] text-muted-foreground">{h.summary.price == null ? "Preço" : "A partir de"}</p>
                    <p className="break-words text-base font-extrabold text-primary md:text-xl">{h.summary.price == null ? "Consultar" : formatMzn(h.summary.price)}</p>
                    <p className="text-[10px] text-muted-foreground">por noite</p>
                  </div>
                  <CompareToggle item={{ key: `hotel-${h.id}`, kind: "hotel", name: h.name, subtitle: `${h.city} · ★ ${Number(h.rating ?? 0).toFixed(1)}`, ...h.summary }} />
                  <Button asChild className="mt-1 h-10 w-full gap-1 px-2 text-xs md:text-sm"><Link to="/hotel/$id" params={{ id: h.id }} search={search}>Ver Quartos<ArrowRight className="size-3.5" /></Link></Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
