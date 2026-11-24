import { useSyncExternalStore } from 'react';

export type CompareItem = {
  key: string;
  kind: 'hotel' | 'room';
  name: string;
  subtitle?: string;
  price?: number | null;
  capacity?: number | null;
  amenities?: string[];
  /** Campos extra usados pelo comparador de hotéis. */
  hotelId?: string;
  image?: string | null;
  rating?: number | null;
  distanceKm?: number | null;
  payAtHotel?: boolean;
  breakfast?: boolean;
};

export const MAX_COMPARE = 3;
let items: CompareItem[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const openListeners = new Set<() => void>();

export const compareStore = {
  get: () => items,
  toggle(item: CompareItem): boolean {
    if (items.some((i) => i.key === item.key)) {
      items = items.filter((i) => i.key !== item.key);
    } else {
      if (items.length >= MAX_COMPARE) return false;
      items = [...items, item];
    }
    emit();
    return true;
  },
  clear() {
    items = [];
    emit();
  },
  /** Ask the compare bar to open its side-by-side dialog. */
  requestOpen() {
    openListeners.forEach((l) => l());
  },
  onOpenRequest(l: () => void) {
    openListeners.add(l);
    return () => openListeners.delete(l);
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

const empty: CompareItem[] = [];
export function useCompare() {
  return useSyncExternalStore(compareStore.subscribe, compareStore.get, () => empty);
}
