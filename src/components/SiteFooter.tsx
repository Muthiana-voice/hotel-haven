export function SiteFooter() {
  return (
    <footer className="mt-8 border-t px-4 pb-28 pt-6 text-sm text-muted-foreground md:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 sm:flex-row">
        <span className="font-display font-semibold tracking-[0.15em] text-foreground">LUV CONECT</span>
        <span>© {new Date().getFullYear()} · Reservas de hotéis</span>
      </div>
    </footer>
  );
}
