export function formatCurrency(value: number) {
  const locale = typeof window !== 'undefined' ? (localStorage.getItem('locale') ?? 'en-IN') : 'en-IN';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'INR',
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number) {
  const locale = typeof window !== 'undefined' ? (localStorage.getItem('locale') ?? 'en-IN') : 'en-IN';
  return new Intl.NumberFormat(locale).format(value);
}