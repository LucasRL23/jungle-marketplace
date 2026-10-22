/** ETH crosses the network as decimal strings; calculations use integer wei. */
export function wei(value: string): bigint {
  if (!/^\d+(\.\d{1,18})?$/.test(value)) throw new Error("Invalid ETH amount");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, "0"));
}
export function eth(value: bigint): string {
  const fraction = (value % 10n ** 18n)
    .toString()
    .padStart(18, "0")
    .replace(/0+$/, "");
  return `${value / 10n ** 18n}${fraction ? `.${fraction}` : ""}`;
}
