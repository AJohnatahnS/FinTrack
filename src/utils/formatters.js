const currencyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatCurrency(value) {
  return currencyFormatter.format(value);
}

export function formatDisplayDate(value) {
  return dateFormatter.format(new Date(value));
}

export function getTodayValue() {
  return new Date().toISOString().slice(0, 10);
}
