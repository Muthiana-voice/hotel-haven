import { useEffect, useState } from "react";
import { X, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { compareStore, useCompare, MAX_COMPARE } from "@/lib/compare";
import { formatMzn } from "@/lib/hotel-presentation";

const brl = (n?: number | null) =>
  n == null ? "—" : formatMzn(n);

export function CompareBar() {
  const items = useCompare();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const off = compareStore.onOpenRequest(() => setOpen(true));
    return () => { off(); };
  }, []);
  if (items.length < 2) return null;
  const allAmenities = Array.from(new Set(items.flatMap((i) => i.amenities ?? [])));

  return (
    <>
      <div className="fixed inset-x-3 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 rounded-lg border bg-card/95 shadow-lift backdrop-blur md:bottom-4 md:left-[calc(var(--sidebar-width)+0.75rem)]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
          <span className="text-sm font-medium text-muted-foreground">
            Comparar ({items.length}/{MAX_COMPARE})
          </span>
          <div className="hidden flex-1 flex-wrap gap-2 sm:flex">
            {items.map((i) => (
              <span key={i.key} className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">
                {i.name}
                <Button variant="ghost" size="icon" className="size-6 rounded-full" aria-label={`Remover ${i.name}`} onClick={() => compareStore.toggle(i)}>
                  <X className="size-3.5" />
                </Button>
              </span>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => compareStore.clear()}>Limpar</Button>
          <Button size="sm" disabled={items.length < 2} onClick={() => setOpen(true)}>
            <Scale /> Comparar agora
          </Button>
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Comparação lado a lado</DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-sm">
              <thead>
                <tr>
                  <th className="w-36" />
                  {items.map((i) => (
                    <th key={i.key} className="p-3 text-left align-top">
                      <div className="font-semibold text-foreground">{i.name}</div>
                      {i.subtitle && <div className="text-xs font-normal text-muted-foreground">{i.subtitle}</div>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="p-3 text-muted-foreground">Preço / noite</td>
                  {items.map((i) => <td key={i.key} className="p-3 font-semibold text-primary">{brl(i.price)}</td>)}
                </tr>
                <tr>
                  <td className="p-3 text-muted-foreground">Capacidade</td>
                  {items.map((i) => <td key={i.key} className="p-3">{i.capacity ? `${i.capacity} hóspedes` : "—"}</td>)}
                </tr>
                {allAmenities.length === 0 && (
                  <tr><td className="p-3 text-muted-foreground">Comodidades</td>{items.map((i) => <td key={i.key} className="p-3">—</td>)}</tr>
                )}
                {allAmenities.map((a) => (
                  <tr key={a}>
                    <td className="p-3 text-muted-foreground">{a}</td>
                    {items.map((i) => <td key={i.key} className="p-3">{i.amenities?.includes(a) ? "✓" : "—"}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
