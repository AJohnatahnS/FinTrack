import { formatCurrency } from "../utils/formatters";

export function BudgetList({ entries, categorySpending }) {
  return (
    <div className="budget-list">
      {entries.map(([category, limit]) => {
        const spent = categorySpending[category] ?? 0;
        const ratio = limit > 0 ? (spent / limit) * 100 : 0;
        const statusClass = ratio > 100 ? "warn" : "good";

        return (
          <article className="budget-item" key={category}>
            <div className="budget-meta">
              <span>{category}</span>
              <strong>
                {formatCurrency(spent)} / {formatCurrency(limit)}
              </strong>
            </div>
            <div className="budget-bar-track">
              <div
                className={`budget-bar ${statusClass}`}
                style={{ width: `${Math.min(Math.max(ratio, 4), 100)}%` }}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}
