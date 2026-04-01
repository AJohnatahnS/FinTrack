export function SummaryCard({ label, value, tone }) {
  return (
    <article className={`panel metric-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
