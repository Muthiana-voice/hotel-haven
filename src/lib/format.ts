// Formatação única de preços: toda a aplicação usa MZN (Metical moçambicano).
// Usa o agrupamento "6.500" do wireframe e evita variações entre dispositivos.
const numberFormat = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const NBSP = "\u00A0";

/** Ex.: 6500 -> "MZN 6.500" */
export function formatMZN(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return "MZN" + NBSP + numberFormat.format(value);
}

/** Versão curta para pins do mapa. Ex.: 6500 -> "MZN 6.5k" */
export function formatMZNCompact(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (Math.abs(value) < 1000) return "MZN" + NBSP + numberFormat.format(value);
  const thousands = (value / 1000).toFixed(1).replace(/\.0$/, "");
  return "MZN" + NBSP + thousands + "k";
}
