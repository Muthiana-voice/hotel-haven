import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Star, MapPin, Building2, LocateFixed } from "lucide-react";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { SearchBar } from "@/components/SearchBar";
import { ImagePlaceholder } from "@/components/ImagePlaceholder";
import { CompareToggle } from "@/components/CompareToggle";
import { hotelsQuery } from "@/lib/hotels";

const LOCATION_STORAGE_KEY = "luv-conect-location";
const ALL_LOCATIONS_VALUE = "__all__";

const searchSchema = z.object({
  city: z.string().optional(),
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
    ],
  }),
  errorComponent: ({ error }) => <p role="alert" className="p-8 text-destructive">{error instanceof Error ? error.message : String(error)}</p>,
  notFoundComponent: () => <p className="p-8">Nada encontrado.</p>,
  component: Home,
});

function Home() {
  const search = Route.useSearch();
  const { data: hotels } = useSuspenseQuery(hotelsQuery());
  const [selectedCity, setSelectedCity] = useState<string | undefined>(search.city);
  const [locationMessage, setLocationMessage] = useState("A localizar hotéis próximos de si…");

  const cities = useMemo(
    () => Array.from(new Set(hotels.map((hotel) => hotel.city).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt")),
    [hotels],
  );
  const activeCity = selectedCity;
  const visibleHotels = useMemo(
    () => activeCity
      ? hotels.filter((hotel) => hotel.city.toLocaleLowerCase().includes(activeCity.toLocaleLowerCase()))
      : hotels,
    [hotels, activeCity],
  );

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
      saveLocation(search.city);
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

  return (
    <main className="pb-10">
      <section className="px-3 pt-3 md:px-6 md:pt-6">
        <div className="bg-hero mx-auto max-w-6xl rounded-3xl border px-5 pb-10 pt-12 md:px-10 md:pb-14 md:pt-16">
          <h1 className="max-w-2xl font-display text-4xl font-semibold leading-tight text-foreground md:text-5xl">
            Sua próxima estadia, <em className="text-primary">sem complicação.</em>
          </h1>
          <p className="mt-4 max-w-lg text-muted-foreground">Busque, compare e escolha o quarto ideal.</p>
          <div className="mt-10"><SearchBar initial={search} /></div>
        </div>
      </section>

      <section id="hoteis" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-12 md:px-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold">
              {activeCity ? `Hotéis em “${activeCity}”` : "Hotéis em destaque"}
            </h2>
            <span className="text-sm text-muted-foreground">{visibleHotels.length} resultado(s)</span>
          </div>
          <div className="w-full sm:max-w-xs">
            <label htmlFor="hotel-location-filter" className="mb-1.5 flex items-center gap-2 text-sm font-medium">
              <LocateFixed className="size-4 text-primary" /> Localização
            </label>
            <select
              id="hotel-location-filter"
              value={activeCity ?? ALL_LOCATIONS_VALUE}
              onChange={(event) => handleLocationChange(event.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value={ALL_LOCATIONS_VALUE}>Todos os destinos</option>
              {cities.map((city) => <option key={city} value={city}>{city}</option>)}
            </select>
            <p className="mt-1 text-xs text-muted-foreground" aria-live="polite">{locationMessage}</p>
          </div>
        </div>

        {visibleHotels.length === 0 ? (
          <div className="grid place-items-center gap-3 rounded-2xl border border-dashed py-20 text-center text-muted-foreground">
            <Building2 className="size-10" />
            <p>Nenhum hotel encontrado nesta localização.</p>
            <button type="button" onClick={() => handleLocationChange(ALL_LOCATIONS_VALUE)} className="text-sm font-semibold text-primary underline">
              Ver todos os hotéis
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visibleHotels.map((h) => (
              <article key={h.id} className="group overflow-hidden rounded-3xl border bg-card transition hover:-translate-y-0.5 hover:shadow-lift">
                <Link to="/hotel/$id" params={{ id: h.id }} search={search}>
                  <ImagePlaceholder src={h.image_url} alt={h.name} className="aspect-[4/3] w-full" />
                </Link>
                <div className="space-y-3 p-5">
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
