import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { compareStore, useCompare, MAX_COMPARE, type CompareItem } from "@/lib/compare";

export function CompareToggle({ item }: { item: CompareItem }) {
  const items = useCompare();
  const checked = items.some((i) => i.key === item.key);
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground" onClick={(e) => e.stopPropagation()}>
      <Checkbox
        checked={checked}
        onCheckedChange={() => {
          if (!compareStore.toggle(item)) toast.error(`Você pode comparar até ${MAX_COMPARE} itens.`);
        }}
      />
      Comparar
    </label>
  );
}
