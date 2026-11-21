import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker, LeafletMouseEvent } from "leaflet";

type Props = { latitude: number; longitude: number; onChange: (latitude: number, longitude: number) => void };

export function LocationPickerMap({ latitude, longitude, onChange }: Props) {
  const elementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const changeRef = useRef(onChange);
  useEffect(() => { changeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | null = null;
    void import("leaflet").then((L) => {
      if (cancelled || !elementRef.current) return;
      map = L.map(elementRef.current).setView([latitude, longitude], 6);
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors", maxZoom: 19,
      }).addTo(map);
      markerRef.current = L.marker([latitude, longitude], { draggable: true }).addTo(map);
      map.on("click", (event: LeafletMouseEvent) => {
        const { lat, lng } = event.latlng;
        markerRef.current?.setLatLng([lat, lng]);
        changeRef.current(lat, lng);
      });
      markerRef.current.on("dragend", () => {
        const point = markerRef.current?.getLatLng();
        if (point) changeRef.current(point.lat, point.lng);
      });
    });
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (map && Number.isFinite(latitude) && Number.isFinite(longitude)) {
      markerRef.current?.setLatLng([latitude, longitude]);
      map.setView([latitude, longitude], Math.max(map.getZoom(), 6));
    }
  }, [latitude, longitude]);

  return <div ref={elementRef} className="h-64 w-full overflow-hidden rounded-xl border" aria-label="Selecione a localização do hotel no mapa" />;
}
