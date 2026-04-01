export function BudgetList({ entries, categorySpending, onEdit, labels, formatMoney, getCategoryLabel }) {
  return (
    <div className="budget-list">
      {entries.map(([category, limit]) => {
        const spent = categorySpending[category] ?? 0;
        const ratio = limit > 0 ? (spent / limit) * 100 : 0;
        const statusClass = ratio > 100 ? "warn" : ratio >= 80 ? "near" : "good";
        const statusText = ratio > 100 ? labels.overBudget : ratio >= 80 ? labels.nearBudget : labels.inBudget;

        return (
          <article className="budget-item" key={category}>
            <div className="budget-meta">
              <span>{getCategoryLabel(category)}</span>
              <strong>
                {formatMoney(spent)} / {formatMoney(limit)}
              </strong>
            </div>
            <div className="budget-bar-track">
              <div
                className={`budget-bar ${statusClass}`}
                style={{ width: `${Math.min(Math.max(ratio, 4), 100)}%` }}
              />
            </div>
            <div className="budget-footer">
              <small className={`budget-status ${statusClass}`}>{statusText}</small>
              <button className="ghost-btn budget-edit-btn" type="button" onClick={() => onEdit(category, limit)}>
                {labels.editBudget}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
