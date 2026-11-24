import { Link, useRouterState } from '@tanstack/react-router';
import { CalendarCheck, Compass, Building2, Globe, LogIn, LogOut, Map as MapIcon, Scale, ShieldCheck } from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { compareStore, useCompare } from '@/lib/compare';
import { useSignOut } from '@/lib/auth';
import { ROLE_LABEL, useAccount } from '@/lib/use-account';
import { toast } from 'sonner';

export function AppSidebar() {
  const { setOpenMobile } = useSidebar();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const compare = useCompare();
  const { account } = useAccount();
  const signOut = useSignOut();
  const close = () => setOpenMobile(false);
  const item = 'h-11 rounded-xl text-[15px]';

  const isHotelAdmin = account?.role === 'hotel_admin' || account?.role === 'super_admin';
  const isSuperAdmin = account?.role === 'super_admin';

  return (
    <Sidebar collapsible='offcanvas'>
      <SidebarHeader className='gap-4 px-4 pb-2 pt-5'>
        <Logo tagline />
        {account ? (
          <div className='flex items-center gap-3 rounded-2xl bg-secondary p-3'>
            <span className='grid size-11 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground'>{account.initials}</span>
            <div className='min-w-0'>
              <p className='truncate text-sm font-bold'>{account.name}</p>
              {account.email && <p className='truncate text-xs text-muted-foreground'>{account.email}</p>}
              {account.role && <p className='mt-0.5 text-[11px] font-medium text-violet-ink'>{ROLE_LABEL[account.role]}</p>}
            </div>
          </div>
        ) : (
          <Button asChild className='h-11 rounded-full' onClick={close}>
            <Link to='/auth'><LogIn />Entrar ou criar conta</Link>
          </Button>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/' || pathname.startsWith('/hotel')} className={item}>
                  <Link to='/' search={{}} onClick={close}><Compass />Explorar hotéis</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith('/mapa')} className={item}>
                  <Link to='/mapa' onClick={close}><MapIcon />Mapa de hotéis</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton className={item} onClick={() => { close(); if (compare.length < 2) toast('Marque pelo menos 2 hotéis ou quartos para comparar.'); else compareStore.requestOpen(); }}>
                  <Scale />Comparar{compare.length > 0 ? ' (' + compare.length + ')' : ''}
                </SidebarMenuButton>
                {compare.length > 0 && <SidebarMenuBadge>{compare.length}</SidebarMenuBadge>}
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith('/reservas')} className={item}>
                  <Link to='/reservas' onClick={close}><CalendarCheck />Minhas reservas</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupContent>
            <p className='flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground'><Globe className='size-4' />Idioma e moeda: PT · MZN</p>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className='gap-2 px-4 pb-5'>
        {isHotelAdmin && (
          <Button asChild variant='ghost' className='h-11 rounded-full bg-violet-soft font-bold text-violet-ink hover:bg-violet-soft/70'>
            <Link to='/admin/hotel' onClick={close}><Building2 />Área do hotel</Link>
          </Button>
        )}
        {isSuperAdmin && (
          <Button asChild variant='ghost' className='h-11 rounded-full bg-violet-soft font-bold text-violet-ink hover:bg-violet-soft/70'>
            <Link to='/admin/geral' onClick={close}><ShieldCheck />Administração geral</Link>
          </Button>
        )}
        {account && (
          <Button type='button' variant='outline' className='h-11 rounded-full' onClick={() => { close(); void signOut(); }}>
            <LogOut />Terminar sessão
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
