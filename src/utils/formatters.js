export function formatCurrency(value, locale = "th-TH", currency = "THB") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDisplayDate(value, locale = "th-TH") {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function getTodayValue() {
  return new Date().toISOString().slice(0, 10);
}
