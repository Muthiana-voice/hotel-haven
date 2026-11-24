import { useEffect, useRef, useState } from 'react';
import { formatMZNCompact } from '@/lib/format';
import type { HotelView } from '@/lib/hotel-utils';

type Props = {
  hotels: HotelView[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  userLocation: [number, number] | null;
  route: [number, number][] | null;
  className?: string;
};

/** Mapa Leaflet com pins de preço (MZN 6.5k), posição do utilizador e rota. */
export function PriceMap({ hotels, selectedId, onSelect, userLocation, route, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const markersRef = useRef<any>(null);
  const overlayRef = useRef<any>(null);
  const fittedRef = useRef('');
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | undefined;
    (async () => {
      const L = await import('leaflet');
      const container = containerRef.current;
      if (cancelled || !container) return;
      leafletRef.current = L;
      const map = L.map(container, { center: [-18.7, 35.5], zoom: 5, scrollWheelZoom: false, zoomControl: false });
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);
      markersRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      observer = new ResizeObserver(() => map.invalidateSize());
      observer.observe(container);
      setReady(true);
    })();
    return () => {
      cancelled = true;
      observer?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = null;
      overlayRef.current = null;
    };
  }, []);

  // Pins de preço.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = markersRef.current;
    if (!ready || !L || !map || !layer) return;
    layer.clearLayers();
    const points: [number, number][] = [];
    hotels.forEach((h) => {
      if (h.latitude == null || h.longitude == null) return;
      points.push([h.latitude, h.longitude]);
      const selected = h.id === selectedId;
      const icon = L.divIcon({
        className: 'price-pin-wrapper',
        html: '<span class="price-pin' + (selected ? ' is-selected' : '') + '">' + formatMZNCompact(h.minPrice) + '</span>',
        iconSize: [76, 32],
        iconAnchor: [38, 16],
      });
      const marker = L.marker([h.latitude, h.longitude], { icon, zIndexOffset: selected ? 1000 : 0, title: h.name });
      marker.on('click', () => onSelectRef.current(h.id));
      marker.addTo(layer);
    });
    const key = hotels.map((h) => h.id).join(',');
    if (points.length > 0 && fittedRef.current !== key) {
      fittedRef.current = key;
      if (points.length === 1) map.setView(points[0], 13);
      else map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 13 });
    }
  }, [ready, hotels, selectedId]);

  // Posição do utilizador e rota.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    if (overlayRef.current) {
      overlayRef.current.remove();
      overlayRef.current = null;
    }
    if (!userLocation && !route) return;
    const group = L.layerGroup().addTo(map);
    overlayRef.current = group;
    if (route && route.length > 1) {
      const line = L.polyline(route, { color: '#3F59D9', weight: 5, opacity: 0.85 }).addTo(group);
      map.fitBounds(line.getBounds(), { padding: [48, 48] });
    } else if (userLocation) {
      map.setView(userLocation, Math.max(map.getZoom(), 12));
    }
    if (userLocation) {
      L.circleMarker(userLocation, { radius: 9, color: '#ffffff', weight: 3, fillColor: '#8B6CF0', fillOpacity: 1 })
        .addTo(group)
        .bindTooltip('Você está aqui', { permanent: true, direction: 'bottom', offset: [0, 8], className: 'price-user-label' });
    }
  }, [ready, userLocation, route]);

  return <div ref={containerRef} className={'price-map ' + className} role='region' aria-label='Mapa dos hotéis' />;
}
