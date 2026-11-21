import { Link } from "@tanstack/react-router";
import { Home, BedDouble, Scale, UserRound, Building2, ShieldCheck } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { compareStore, useCompare } from "@/lib/compare";
import { toast } from "sonner";

export function AppSidebar() {
  const { setOpenMobile } = useSidebar();
  const compare = useCompare();
  const close = () => setOpenMobile(false);
  const item = "h-11 rounded-xl text-[15px]";

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="px-4 py-5">
        <span className="font-display text-lg font-semibold tracking-[0.18em]">LUV <span className="text-primary">CONECT</span></span>
        <span className="text-xs text-muted-foreground">O mundo mais perto de si</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Explorar</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem><SidebarMenuButton asChild className={item}><Link to="/" search={{}} onClick={close}><Home />Início</Link></SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem><SidebarMenuButton asChild className={item}><Link to="/" hash="hoteis" search={(p) => p} onClick={close}><BedDouble />Hotéis</Link></SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton className={item} onClick={() => { close(); if (compare.length < 2) toast("Marque pelo menos 2 hotéis ou quartos para comparar."); else compareStore.requestOpen(); }}>
                  <Scale />Comparar
                </SidebarMenuButton>
                {compare.length > 0 && <SidebarMenuBadge>{compare.length}</SidebarMenuBadge>}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Conta e gestão</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem><SidebarMenuButton asChild className={item}><Link to="/auth" onClick={close}><UserRound />Entrar / Conta</Link></SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem><SidebarMenuButton asChild className={item}><Link to="/admin/hotel" onClick={close}><Building2 />Painel do Hotel</Link></SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem><SidebarMenuButton asChild className={item}><Link to="/admin/geral" onClick={close}><ShieldCheck />Administração Geral</Link></SidebarMenuButton></SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-4 py-4 text-xs text-muted-foreground">Reservas simples, em qualquer lugar.</SidebarFooter>
    </Sidebar>
  );
}
