import { formatCurrency } from "../utils/formatters";

export function ChartList({ entries }) {
  const highest = entries[0]?.[1] ?? 0;

  return (
    <div className="chart-list">
      {entries.map(([category, amount]) => (
        <article className="chart-item" key={category}>
          <div className="chart-meta">
            <span>{category}</span>
            <strong>{formatCurrency(amount)}</strong>
          </div>
          <div className="chart-bar-track">
            <div
              className="chart-bar"
              style={{ width: `${Math.max(highest > 0 ? (amount / highest) * 100 : 0, 6)}%` }}
            />
          </div>
        </article>
      ))}
    </div>
  );
}
