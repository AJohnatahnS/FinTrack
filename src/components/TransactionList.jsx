export function TransactionList({ items, onRemove }) {
  return (
    <div className="transaction-list">
      {items.map((item) => (
        <article className="transaction-item" key={item.id}>
          <div className="transaction-meta">
            <div>
              <strong>{item.description}</strong>
            </div>
            <strong>{item.amountLabel}</strong>
          </div>
          <div className="transaction-sub">
            <span className={`pill ${item.type}`}>{item.typeLabel}</span>
            <span>{item.category}</span>
            <span>{item.dateLabel}</span>
            <button className="ghost-btn" type="button" onClick={() => onRemove(item.id)}>
              ลบ
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
