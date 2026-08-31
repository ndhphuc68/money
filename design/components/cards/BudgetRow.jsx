import React from 'react';

export function BudgetRow({ category, spent, limit, percent, color = 'var(--color-primary)' }) {
  return (
    <div style={{ marginBottom: 14, fontFamily: 'var(--font-sans)' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 13,
          fontWeight: 'var(--weight-bold)',
          color: 'var(--color-text)',
          marginBottom: 6,
        }}>
        <span>{category}</span>
        <span style={{ color: 'var(--color-text-muted)', fontWeight: 'var(--weight-semibold)' }}>
          {spent} / {limit}
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: '#EDEEF3' }}>
        <div style={{ height: 6, borderRadius: 3, width: percent + '%', background: color }} />
      </div>
    </div>
  );
}
