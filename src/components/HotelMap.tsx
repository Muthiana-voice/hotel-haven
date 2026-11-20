import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";

export type HotelMapItem = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

type HotelMapProps = {
  hotels: HotelMapItem[];
  className?: string;
  zoom?: number;
  singleHotel?: boolean;
};

function hasCoordinates(hotel: HotelMapItem): hotel is HotelMapItem & { latitude: number; longitude: number } {
  return typeof hotel.latitude === "number" && Number.isFinite(hotel.latitude) &&
    typeof hotel.longitude === "number" && Number.isFinite(hotel.longitude) &&
    hotel.latitude >= -90 && hotel.latitude <= 90 && hotel.longitude >= -180 && hotel.longitude <= 180;
}

export function HotelMap({ hotels, className = "", zoom = 6, singleHotel = false }: HotelMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const mappedHotels = hotels.filter(hasCoordinates);

  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | undefined;

    async function renderMap() {
      const container = containerRef.current;
      if (!container || mappedHotels.length === 0) return;
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;

      const map = L.map(container, {
        center: [mappedHotels[0].latitude, mappedHotels[0].longitude],
        zoom: singleHotel ? 14 : zoom,
        scrollWheelZoom: false,
        zoomControl: true,
        tap: true,
      });
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({
        className: "hotel-map-pin-wrapper",
        html: '<span class="hotel-map-pin" aria-hidden="true"></span>',
        iconSize: [24, 32],
        iconAnchor: [12, 30],
        popupAnchor: [0, -28],
      });

      markersRef.current = mappedHotels.map((hotel) => {
        const marker = L.marker([hotel.latitude, hotel.longitude], { icon }).addTo(map);
        const popup = document.createElement("div");
        popup.className = "hotel-map-popup";
        const name = document.createElement("strong");
        name.textContent = hotel.name;
        popup.appendChild(name);
        const location = document.createElement("p");
        location.textContent = [hotel.address, hotel.city].filter(Boolean).join(", ");
        if (location.textContent) popup.appendChild(location);
        const link = document.createElement("a");
        link.href = "/hotel/" + encodeURIComponent(hotel.id);
        link.textContent = "Ver detalhes do hotel";
        popup.appendChild(link);
        marker.bindPopup(popup);
        return marker;
      });

      if (markersRef.current.length > 1 && !singleHotel) {
        const bounds = L.latLngBounds(mappedHotels.map((hotel) => [hotel.latitude, hotel.longitude] as [number, number]));
        map.fitBounds(bounds, { padding: [28, 28], maxZoom: 13 });
      } else {
        map.setView([mappedHotels[0].latitude, mappedHotels[0].longitude], singleHotel ? 14 : zoom);
      }
      observer = new ResizeObserver(() => map.invalidateSize());
      observer.observe(container);
      requestAnimationFrame(() => map.invalidateSize());
    }

    void renderMap();
    return () => {
      cancelled = true;
      observer?.disconnect();
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [hotels, zoom, singleHotel, mappedHotels.length]);

  if (mappedHotels.length === 0) return (
    <p className="rounded-xl border border-dashed bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
      Nenhum hotel com coordenadas geográficas disponíveis para apresentar no mapa.
    </p>
  );

  return <div ref={containerRef} className={"hotel-map w-full overflow-hidden rounded-2xl border bg-muted " + className}
    role="region" aria-label={singleHotel ? "Localização do hotel" : "Mapa dos hotéis disponíveis"} />;
}
