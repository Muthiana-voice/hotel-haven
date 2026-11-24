import { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Scale, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { compareStore, useCompare, MAX_COMPARE, type CompareItem } from '@/lib/compare';
import { formatMZN } from '@/lib/format';
import { formatKm, formatRating } from '@/lib/hotel-utils';
import { cn } from '@/lib/utils';

type Cell = { text: string; value: number | null };
type Row = { key: string; label: string; best: 'min' | 'max'; cells: Cell[] };

const EMPTY: Cell = { text: '—', value: null };

/** Linhas do comparador: só aparecem as que têm dados em pelo menos um item. */
function buildRows(items: CompareItem[]): Row[] {
  const rows: Row[] = [];
  const add = (key: string, label: string, best: 'min' | 'max', pick: (i: CompareItem) => Cell | null) => {
    const cells = items.map((i) => pick(i) ?? EMPTY);
    if (cells.every((c) => c.value === null)) return;
    rows.push({ key, label, best, cells });
  };
  add('price', 'Preço por noite (MZN)', 'min', (i) => (i.price != null ? { text: formatMZN(i.price), value: i.price } : null));
  add('rating', 'Nota dos hóspedes', 'max', (i) => (i.rating != null ? { text: formatRating(i.rating), value: i.rating } : null));
  add('distance', 'Distância', 'min', (i) => (i.distanceKm != null ? { text: formatKm(i.distanceKm) ?? '—', value: i.distanceKm } : null));
  add('cash', 'Pagar em dinheiro no hotel', 'max', (i) => (i.payAtHotel != null ? { text: i.payAtHotel ? 'Sim' : 'Não', value: i.payAtHotel ? 1 : 0 } : null));
  add('breakfast', 'Pequeno-almoço', 'max', (i) => (i.breakfast != null ? { text: i.breakfast ? 'Incluído' : 'Não', value: i.breakfast ? 1 : 0 } : null));
  add('capacity', 'Capacidade', 'max', (i) => (i.capacity ? { text: i.capacity + ' hóspedes', value: i.capacity } : null));
  const amenities = Array.from(new Set(items.flatMap((i) => i.amenities ?? [])));
  amenities.forEach((a) => add('amenity-' + a, a, 'max', (i) => ({ text: i.amenities?.includes(a) ? '✓' : '—', value: i.amenities?.includes(a) ? 1 : 0 })));
  return rows;
}

function isBest(row: Row, cell: Cell): boolean {
  const values = row.cells.map((c) => c.value).filter((v): v is number => v !== null);
  if (cell.value === null || values.length < 2 || new Set(values).size === 1) return false;
  const target = row.best === 'min' ? Math.min(...values) : Math.max(...values);
  return cell.value === target;
}

export function CompareBar() {
  const items = useCompare();
  const [open, setOpen] = useState(false);
  const [onlyDiff, setOnlyDiff] = useState(false);
  useEffect(() => {
    const off = compareStore.onOpenRequest(() => setOpen(true));
    return () => { off(); };
  }, []);
  const rows = useMemo(() => {
    const all = buildRows(items);
    return onlyDiff ? all.filter((r) => new Set(r.cells.map((c) => c.text)).size > 1) : all;
  }, [items, onlyDiff]);
  if (items.length === 0) return null;
  const cols = { gridTemplateColumns: 'minmax(5.5rem, 8rem) repeat(' + items.length + ', minmax(0, 1fr))' };

  return (
    <>
      {/* No mobile fica acima da barra inferior de navegação. */}
      <div className='fixed inset-x-3 bottom-[4.75rem] z-40 rounded-2xl border bg-card/95 shadow-lift backdrop-blur md:bottom-3 md:left-[calc(var(--sidebar-width)+0.75rem)]'>
        <div className='mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3'>
          <span className='text-sm font-semibold text-muted-foreground'>
            {items.length} de {MAX_COMPARE} selecionados
          </span>
          <div className='flex flex-1 flex-wrap gap-2'>
            {items.map((i) => (
              <span key={i.key} className='inline-flex items-center gap-2 rounded-full bg-violet-soft py-1 pl-1 pr-3 text-sm font-medium text-violet-ink'>
                {i.image ? (
                  <img src={i.image} alt='' className='size-7 rounded-full object-cover' />
                ) : (
                  <span className='grid size-7 place-items-center rounded-full bg-card text-xs font-bold'>{i.name.slice(0, 1)}</span>
                )}
                <span className='max-w-28 truncate'>{i.name}</span>
                <button aria-label={'Remover ' + i.name} onClick={() => compareStore.toggle(i)}>
                  <X className='size-3.5' />
                </button>
              </span>
            ))}
          </div>
          <Button variant='ghost' size='sm' onClick={() => compareStore.clear()}>Limpar</Button>
          <Button size='sm' className='rounded-full' disabled={items.length < 2} onClick={() => setOpen(true)}>
            <Scale /> Comparar agora
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='max-h-[92vh] max-w-4xl overflow-y-auto p-4 sm:p-6'>
          <DialogHeader>
            <DialogTitle className='font-display text-2xl font-extrabold'>Comparar hotéis</DialogTitle>
          </DialogHeader>
          <div className='flex flex-wrap items-center gap-2'>
            <button
              type='button'
              aria-pressed={onlyDiff}
              onClick={() => setOnlyDiff((v) => !v)}
              className={cn('h-9 rounded-full px-4 text-sm font-semibold transition', onlyDiff ? 'bg-violet text-violet-foreground' : 'bg-violet-soft text-violet-ink')}
            >
              Só diferenças
            </button>
            <Button asChild variant='outline' size='sm' className='rounded-full'>
              <Link to='/mapa' onClick={() => setOpen(false)}>Ver no mapa</Link>
            </Button>
          </div>

          <div className='mt-2 space-y-2'>
            <div className='grid gap-2' style={cols}>
              <span />
              {items.map((i) => (
                <div key={i.key} className='min-w-0 rounded-2xl bg-secondary p-2 text-center'>
                  {i.image ? (
                    <img src={i.image} alt='' className='mb-2 aspect-[4/3] w-full rounded-xl object-cover' />
                  ) : (
                    <div className='mb-2 grid aspect-[4/3] w-full place-items-center rounded-xl bg-card text-2xl font-extrabold text-primary'>{i.name.slice(0, 1)}</div>
                  )}
                  <p className='truncate text-sm font-bold'>{i.name}</p>
                  {i.subtitle && <p className='truncate text-xs text-muted-foreground'>{i.subtitle}</p>}
                </div>
              ))}
            </div>

            {rows.length === 0 ? (
              <p className='rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground'>Os itens escolhidos não têm diferenças para mostrar.</p>
            ) : (
              rows.map((row) => (
                <div key={row.key} className='grid items-center gap-2' style={cols}>
                  <span className='text-sm text-muted-foreground'>{row.label}</span>
                  {row.cells.map((cell, idx) => (
                    <span
                      key={idx}
                      className={cn('rounded-xl border px-2 py-3 text-center text-sm', isBest(row, cell) ? 'border-success/40 bg-success-soft font-bold text-success-ink' : 'bg-card')}
                    >
                      {cell.text}
                    </span>
                  ))}
                </div>
              ))
            )}

            {items.some((i) => i.hotelId) && (
              <div className='sticky bottom-0 grid gap-2 border-t bg-card pt-3' style={cols}>
                <span />
                {items.map((i) => (
                  <div key={i.key} className='min-w-0'>
                    {i.hotelId ? (
                      <Button asChild className='h-11 w-full rounded-full font-bold'>
                        <Link to='/hotel/$id' params={{ id: i.hotelId }} search={{}} onClick={() => setOpen(false)}>Reservar</Link>
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
            <p className='pt-1 text-xs text-muted-foreground'>O melhor valor de cada linha fica em verde.</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
