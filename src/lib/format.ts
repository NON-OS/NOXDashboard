import { formatNox } from "./units";

/** formatNox with thousands separators for display: 52431.5 → "52,431.5000" */
export function formatNoxDisplay(wei: bigint, digits = 4): string {
  const [whole, frac] = formatNox(wei, digits).split(".");
  const grouped = whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return frac ? `${grouped}.${frac}` : grouped;
}

/** Exact decimal string for a wei amount, trailing zeros trimmed. Used by MAX. */
export function weiToNoxString(wei: bigint): string {
  const whole = wei / 10n ** 18n;
  const frac = (wei % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

/** Group a plain integer string: "52431" → "52,431" */
export function groupDigits(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
