import { Link } from "@tanstack/react-router";
import { Home, BedDouble, Scale, UserRound, Building2 } from "lucide-react";
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
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Explorar</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={item}>
                  <Link to="/" search={{}} onClick={close}><Home />Início</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={item}>
                  <Link to="/" hash="hoteis" search={(p) => p} onClick={close}><BedDouble />Hotéis</Link>
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
                <SidebarMenuButton className={item} onClick={() => toast("Área do usuário em breve.")}><UserRound />Entrar</SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton className={item} onClick={() => toast("Cadastro de hotel em breve.")}><Building2 />Área do hotel</SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-4 py-4 text-xs text-muted-foreground">Reservas simples, em qualquer lugar.</SidebarFooter>
    </Sidebar>
  );
}
