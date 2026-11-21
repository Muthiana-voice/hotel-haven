import { Link } from "@tanstack/react-router";
import { Compass, Scale, CalendarCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { compareStore, useCompare } from "@/lib/compare";
import { useAppExperience } from "./AppExperience";
import { toast } from "sonner";

export function MobileNav() {
  const items = useCompare();
  const { openAccount, openReservations } = useAppExperience();
  const itemClass = "h-14 min-w-0 flex-col gap-1 rounded-none px-1 text-[10px] [&_svg]:size-5";
  return <nav aria-label="Navegação mobile" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
    <Button variant="ghost" asChild className={`${itemClass} text-primary`}><Link to="/" search={{}}><Compass />Explorar</Link></Button>
    <Button variant="ghost" className={itemClass} onClick={() => items.length < 2 ? toast("Marque pelo menos 2 hotéis ou quartos para comparar.") : compareStore.requestOpen()}><span className="relative"><Scale />{items.length > 0 && <span className="absolute -right-2 -top-1 rounded-full bg-primary px-1 text-[9px] text-primary-foreground">{items.length}</span>}</span>Comparar</Button>
    <Button variant="ghost" className={itemClass} onClick={openReservations}><CalendarCheck />Reservas</Button>
    <Button variant="ghost" className={itemClass} onClick={openAccount}><UserRound />Perfil</Button>
  </nav>;
}