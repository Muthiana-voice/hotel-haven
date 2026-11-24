import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from '@tanstack/react-router';
import { useEffect, type ReactNode } from 'react';

import { SiteHeader } from '@/components/SiteHeader';
import { AppSidebar } from '@/components/AppSidebar';
import { SiteFooter } from '@/components/SiteFooter';
import { BottomNav } from '@/components/BottomNav';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { CompareBar } from '@/components/CompareBar';
import { Toaster } from '@/components/ui/sonner';
import appCss from '../styles.css?url';
import { reportLovableError } from '../lib/lovable-error-reporting';

function NotFoundComponent() {
  return (
    <div className='flex min-h-screen items-center justify-center bg-background px-4'>
      <div className='max-w-md text-center'>
        <h1 className='text-7xl font-bold text-foreground'>404</h1>
        <h2 className='mt-4 text-xl font-semibold text-foreground'>Página não encontrada</h2>
        <p className='mt-2 text-sm text-muted-foreground'>
          A página que procura não existe ou foi movida.
        </p>
        <div className='mt-6'>
          <Link
            to='/'
            className='inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90'
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: 'tanstack_root_error_component' });
  }, [error]);

  return (
    <div className='flex min-h-screen items-center justify-center bg-background px-4'>
      <div className='max-w-md text-center'>
        <h1 className='text-xl font-semibold tracking-tight text-foreground'>
          Não foi possível carregar esta página
        </h1>
        <p className='mt-2 text-sm text-muted-foreground'>
          Ocorreu um erro do nosso lado. Pode tentar novamente ou voltar ao início.
        </p>
        <div className='mt-6 flex flex-wrap justify-center gap-2'>
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className='inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90'
          >
            Tentar novamente
          </button>
          {/* Link simples de propósito: se o router falhou, um carregamento completo é mais seguro. */}
          <a
            href='/'
            className='inline-flex items-center justify-center rounded-full border border-input bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent'
          >
            Voltar ao início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    // Each content route, / included, must still set its own head(). Never add og:image or
    // twitter:image here: every page without its own would inherit the root's preview image.
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { title: 'LUV CONECT — O mundo mais perto de si' },
      { name: 'description', content: 'Descubra, compare e reserve hotéis em Moçambique. Pague online ou em dinheiro no hotel.' },
      { name: 'theme-color', content: '#3F59D9' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap' },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang='pt-MZ'>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // O ecrã de login ocupa a página toda, sem menu lateral nem barra inferior.
  const bare = pathname === '/auth' || pathname.startsWith('/auth/');
  const hideBottomNav = bare || pathname.startsWith('/admin');

  return (
    <QueryClientProvider client={queryClient}>
      {bare ? (
        // Required: nested routes render here. Removing <Outlet /> breaks all child routes.
        <Outlet />
      ) : (
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className='min-w-0'>
            <SiteHeader />
            <div className={hideBottomNav ? 'flex-1' : 'flex-1 pb-20 md:pb-0'}><Outlet /></div>
            <SiteFooter />
          </SidebarInset>
        </SidebarProvider>
      )}
      {!hideBottomNav && <BottomNav />}
      {!bare && <CompareBar />}
      <Toaster />
    </QueryClientProvider>
  );
}
