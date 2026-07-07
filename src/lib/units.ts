export function noxToWei(value: string): bigint {
  if (!value) return 0n;
  const [whole, frac = ""] = value.split(".");
  const padded = (frac + "0".repeat(18)).slice(0, 18);
  return BigInt(whole || "0") * 10n ** 18n + BigInt(padded || "0");
}

export function formatNox(wei: bigint, digits = 4): string {
  const w = wei / 10n ** 18n;
  const f = wei % 10n ** 18n;
  const frac = (f + 10n ** 18n).toString().slice(1, 1 + digits);
  return `${w}.${frac}`;
}
