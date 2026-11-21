import { Link, useNavigate } from "@tanstack/react-router";
import { MapPin, UserRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { hotelsQuery } from "@/lib/hotels";
import { useAppExperience } from "./AppExperience";

export function SiteHeader() {
  const { activeCity, openAccount } = useAppExperience();
  const { data: hotels = [] } = useQuery(hotelsQuery());
  const navigate = useNavigate();
  const destinations = Array.from(new Set(hotels.flatMap((hotel) => [hotel.city, hotel.province]).filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b, "pt"));
  return (
    <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur-xl">
      <div className="relative mx-auto grid min-h-24 max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 md:px-7">
        <div className="flex min-w-0 items-center gap-1">
          <SidebarTrigger className="md:hidden" aria-label="Abrir menu" />
          <label className="hidden min-w-0 items-center gap-1.5 rounded-full border bg-background px-3 py-2 sm:flex">
            <MapPin className="size-4 shrink-0 text-primary" />
            <select aria-label="Localização ativa" value={activeCity ?? "__all__"} onChange={(event) => void navigate({ to: "/", search: (previous) => ({ ...previous, city: event.target.value }) })} className="max-w-32 bg-transparent text-sm font-semibold outline-none">
              <option value="__all__">Todos</option>
              {activeCity && !destinations.includes(activeCity) && <option value={activeCity}>{activeCity}</option>}
              {destinations.map((city) => <option key={city} value={city}>{city}</option>)}
            </select>
          </label>
        </div>
        <div className="min-w-0 text-center">
          <Link to="/" search={{}} className="whitespace-nowrap text-xl font-extrabold text-foreground md:text-2xl">LUV <span className="text-primary">CONECT</span></Link>
          <p className="mt-1 whitespace-nowrap text-[10px] text-muted-foreground md:text-xs">O mundo mais perto de si</p>
        </div>
        <Button variant="outline" className="justify-self-end rounded-full px-3" onClick={openAccount} aria-label="Entrar / Registar"><UserRound /><span className="hidden lg:inline">Entrar / Registar</span></Button>
      </div>
      <div className="flex justify-center border-t px-3 py-2 sm:hidden"><label className="flex items-center gap-2 text-xs font-semibold"><MapPin className="size-3.5 text-primary" /><select aria-label="Localização ativa mobile" value={activeCity ?? "__all__"} onChange={(event) => void navigate({ to: "/", search: (previous) => ({ ...previous, city: event.target.value }) })} className="max-w-52 bg-transparent outline-none"><option value="__all__">Todos os destinos</option>{activeCity && !destinations.includes(activeCity) && <option value={activeCity}>{activeCity}</option>}{destinations.map((city) => <option key={city} value={city}>{city}</option>)}</select></label></div>
    </header>
  );
}
