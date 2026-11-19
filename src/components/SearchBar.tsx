import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MapPin, CalendarDays, Users, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type SearchValues = { city?: string | undefined; checkin?: string | undefined; checkout?: string | undefined; guests?: number | undefined };

export function SearchBar({ initial }: { initial: SearchValues }) {
  const navigate = useNavigate();
  const [v, setV] = useState(initial);
  const field = "flex flex-col gap-1 px-3 py-2";
  const label = "flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        navigate({ to: "/", search: { ...v, city: v.city?.trim() || undefined } });
      }}
      className="grid gap-2 rounded-2xl border bg-card p-2 shadow-lift md:grid-cols-[1.4fr_1fr_1fr_0.8fr_auto] md:items-center"
    >
      <label className={field}>
        <span className={label}><MapPin className="size-3.5" />Destino</span>
        <Input className="border-0 px-0 shadow-none focus-visible:ring-0" placeholder="Para onde vai?" value={v.city ?? ""} onChange={(e) => setV({ ...v, city: e.target.value })} />
      </label>
      <label className={field}>
        <span className={label}><CalendarDays className="size-3.5" />Check-in</span>
        <Input type="date" className="border-0 px-0 shadow-none focus-visible:ring-0" value={v.checkin ?? ""} onChange={(e) => setV({ ...v, checkin: e.target.value || undefined })} />
      </label>
      <label className={field}>
        <span className={label}><CalendarDays className="size-3.5" />Check-out</span>
        <Input type="date" min={v.checkin} className="border-0 px-0 shadow-none focus-visible:ring-0" value={v.checkout ?? ""} onChange={(e) => setV({ ...v, checkout: e.target.value || undefined })} />
      </label>
      <label className={field}>
        <span className={label}><Users className="size-3.5" />Hóspedes</span>
        <Input type="number" min={1} max={20} className="border-0 px-0 shadow-none focus-visible:ring-0" value={v.guests ?? 2} onChange={(e) => setV({ ...v, guests: Number(e.target.value) || 1 })} />
      </label>
      <Button type="submit" size="lg" className="h-12 rounded-xl"><Search />Buscar</Button>
    </form>
  );
}
