export function TransactionList({ items, onEdit, onRemove, labels }) {
  return (
    <div className="transaction-list">
      {items.map((item) => (
        <article className="transaction-item" key={item.id}>
          <div className="transaction-meta">
            <div>
              <strong>{item.description || labels.noDescription}</strong>
            </div>
            <strong>{item.amountLabel}</strong>
          </div>
          <div className="transaction-sub">
            <span className={`pill ${item.type}`}>{item.typeLabel}</span>
            <span>{item.categoryLabel}</span>
            <span>{item.dateLabel}</span>
            <div className="transaction-actions">
              <button className="close-btn transaction-edit-btn" type="button" onClick={() => onEdit(item)}>
                {labels.edit}
              </button>
              <button className="ghost-btn" type="button" onClick={() => onRemove(item.id)}>
                {labels.delete}
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
