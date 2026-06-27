const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  MAD: 'MAD ',
  CAD: 'CA$',
  AUD: 'A$',
  INR: '₹',
  BRL: 'R$',
  MXN: 'MX$',
  CHF: 'CHF ',
  JPY: '¥',
  AED: 'AED ',
  SAR: 'SAR ',
  EGP: 'EGP ',
  TND: 'TND ',
  DZD: 'DZD ',
  PLN: 'zł',
  SEK: 'kr ',
};

export function formatMoneySavedForPush(
  amount: number,
  currencyCode: string | null | undefined,
): string {
  const safe = Math.max(0, amount);
  const code = currencyCode?.trim().toUpperCase() || 'USD';
  const symbol = CURRENCY_SYMBOLS[code];

  const formatted =
    safe >= 100
      ? safe.toFixed(0)
      : safe >= 10
        ? safe.toFixed(1)
        : safe.toFixed(2);

  if (symbol) return `${symbol}${formatted}`;
  return `${formatted} ${code}`;
}
