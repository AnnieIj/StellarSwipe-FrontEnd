import { usePricePrecisionStore } from "@/store/usePricePrecisionStore";

/**
 * Returns a formatter function that formats a price number according to
 * the user's current precision preference (standard or high).
 */
export function usePriceFormat(): (price: number) => string {
  const { precision } = usePricePrecisionStore();
  const decimals = precision === "high" ? 6 : 4;
  return (price: number) => price.toFixed(decimals);
}
