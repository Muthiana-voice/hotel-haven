// Funções partilhadas pela página inicial, mapa e comparador.

/** Limite da detecção automática: acima disto não se filtra por cidade. */
export const MAX_AUTO_DISTANCE_KM = 100;
/** Raio do filtro "Perto de si". */
export const NEARBY_KM = 50;

export function haversineKm(a: [number, number], b: [number, number]): number {
  const rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad;
  const dLon = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Minúsculas e sem acentos, para pesquisas tolerantes. */
export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export type HotelView = {
  id: string;
  name: string;
  city: string;
  province: string | null;
  address: string | null;
  description: string | null;
  image_url: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number;
  minPrice: number | null;
  breakfast: boolean;
  payAtHotel: boolean;
  distanceKm: number | null;
};

function num(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Converte uma linha da tabela hotels (com rooms) no formato usado pelos ecrãs. */
export function toHotelView(h: any, position: [number, number] | null): HotelView {
  const rooms: any[] = Array.isArray(h.rooms) ? h.rooms : [];
  const prices = rooms.map((r) => num(r.price_per_night)).filter((p): p is number => p !== null);
  const latitude = num(h.latitude);
  const longitude = num(h.longitude);
  const hasCoords = latitude !== null && longitude !== null;
  return {
    id: String(h.id),
    name: String(h.name ?? ''),
    city: String(h.city ?? ''),
    province: h.province ?? null,
    address: h.address ?? null,
    description: h.description ?? null,
    image_url: h.image_url ?? null,
    latitude,
    longitude,
    rating: num(h.rating) ?? 0,
    minPrice: prices.length > 0 ? Math.min(...prices) : null,
    breakfast: rooms.some((r) => Array.isArray(r.amenities) && r.amenities.some((a: string) => normalizeText(String(a)).includes('pequeno'))),
    // Até existir a coluna pay_at_hotel, todos os hotéis aceitam pagamento no hotel.
    payAtHotel: h.pay_at_hotel !== false,
    distanceKm: position && hasCoords ? haversineKm(position, [latitude, longitude]) : null,
  };
}

export function isBeach(h: HotelView): boolean {
  return /praia|beach|costa|oceano/.test(normalizeText([h.name, h.description ?? '', h.city].join(' ')));
}

export function formatKm(km: number | null | undefined): string | null {
  if (km == null || !Number.isFinite(km)) return null;
  const text = km < 10 ? km.toFixed(1) : String(Math.round(km));
  return text.replace('.', ',') + ' km';
}

export function formatRating(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toFixed(1).replace('.', ',');
}

export function formatDuration(minutes: number): string {
  const total = Math.max(1, Math.round(minutes));
  if (total < 60) return total + ' min';
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? h + ' h' : h + ' h ' + m + ' min';
}
