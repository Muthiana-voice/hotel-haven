import { Link } from "@tanstack/react-router";
import { Home, Compass, Scale, UserRound, Heart, CalendarCheck } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { compareStore, useCompare } from "@/lib/compare";
import { toast } from "sonner";
import { useAppExperience } from "./AppExperience";

export function AppSidebar() {
  const { setOpenMobile } = useSidebar();
  const compare = useCompare();
  const { favorites, openAccount, openReservations } = useAppExperience();
  const close = () => setOpenMobile(false);
  const item = "h-11 rounded-lg text-sm font-medium";

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="px-4 py-5">
        <span className="text-lg font-extrabold">LUV <span className="text-primary">CONECT</span></span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
            <SidebarGroupLabel>Descobrir</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={item}>
                  <Link to="/" search={{}} onClick={close}><Home />Início</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={item}>
                  <Link to="/" hash="hoteis" search={{}} onClick={close}><Compass />Explorar</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  className={item}
                  onClick={() => {
                    close();
                    if (compare.length < 2) toast("Marque pelo menos 2 hotéis ou quartos para comparar.");
                    else compareStore.requestOpen();
                  }}
                >
                  <Scale />Comparar
                </SidebarMenuButton>
                {compare.length > 0 && <SidebarMenuBadge>{compare.length}</SidebarMenuBadge>}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Conta</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton className={item} onClick={() => { close(); openReservations(); }}><CalendarCheck />Reservas</SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={item}><Link to="/" search={{ favorites: true, city: "__all__" }} onClick={close}><Heart />Favoritos</Link></SidebarMenuButton>
                {favorites.length > 0 && <SidebarMenuBadge>{favorites.length}</SidebarMenuBadge>}
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton className={item} onClick={() => { close(); openAccount(); }}><UserRound />Conta</SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-4 py-4 text-xs text-muted-foreground">O mundo mais perto de si</SidebarFooter>
    </Sidebar>
  );
}
