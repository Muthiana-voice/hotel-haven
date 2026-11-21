import type { Tables } from "@/integrations/supabase/types";

export type RoomSummary = Pick<Tables<"rooms">, "hotel_id" | "price_per_night" | "capacity" | "amenities">;
export type HotelSummary = { price: number | null; capacity: number | null; amenities: string[] };
export type QuickFilter = "all" | "cheap" | "rated" | "pool" | "sea" | "breakfast";
export type HotelSort = "recommended" | "price" | "rating";

export const formatMzn = (value: number) => `${new Intl.NumberFormat("pt-MZ", { maximumFractionDigits: 0 }).format(value)} MZN`;

export function summarizeRooms(rooms: RoomSummary[]): HotelSummary {
  const sorted = rooms.filter((room) => Number.isFinite(Number(room.price_per_night))).sort((a, b) => Number(a.price_per_night) - Number(b.price_per_night));
  const cheapest = sorted[0];
  return { price: cheapest ? Number(cheapest.price_per_night) : null, capacity: cheapest?.capacity ?? null, amenities: Array.from(new Set(rooms.flatMap((room) => room.amenities))) };
}

export function matchesQuickFilter(amenities: string[], filter: QuickFilter): boolean {
  const text = amenities.join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (filter === "pool") return /piscina|pool/.test(text);
  if (filter === "sea") return /frente ao mar|beira.mar|beachfront|sea.front|vista.*mar|ocean/.test(text);
  if (filter === "breakfast") return /pequeno.almoco|cafe da manha|breakfast/.test(text);
  return true;
}

export function compareHotelOrder(a: { rating: number | null; price: number | null }, b: { rating: number | null; price: number | null }, sort: HotelSort): number {
  if (sort === "price") return (a.price ?? Infinity) - (b.price ?? Infinity);
  return (b.rating ?? 0) - (a.rating ?? 0);
}