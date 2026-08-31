import React from 'react';

const CATEGORY_COLORS = {
  income: 'var(--color-cat-income)',
  food: 'var(--color-cat-food)',
  shopping: 'var(--color-cat-shopping)',
  bills: 'var(--color-cat-bills)',
  transport: 'var(--color-cat-transport)',
};

function CategoryIcon({ type }) {
  const common = { width: 18, height: 18, viewBox: '0 0 20 20', fill: 'none' };
  if (type === 'income')
    return (
      <svg {...common}>
        <path
          d="M10 15V5M10 5l-4 4M10 5l4 4"
          stroke="#fff"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  if (type === 'food')
    return (
      <svg {...common}>
        <path
          d="M6 2v6M8 2v6M6 5h2M7 8v10"
          stroke="#fff"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M13 2c-1.2 0-2 1.5-2 4s.8 3 2 3v9"
          stroke="#fff"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  if (type === 'shopping')
    return (
      <svg {...common}>
        <path d="M5 7h10l-1 10.5H6L5 7Z" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M8 7a2 2 0 0 1 4 0" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  if (type === 'bills')
    return (
      <svg {...common}>
        <rect x="5" y="2.5" width="10" height="15" rx="1.2" stroke="#fff" strokeWidth="1.5" />
        <path
          d="M7.5 7h5M7.5 10h5M7.5 13h3"
          stroke="#fff"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  if (type === 'transport')
    return (
      <svg {...common}>
        <path
          d="M4 12.5l1.2-4.3A2 2 0 0 1 7.1 6.8h5.8a2 2 0 0 1 1.9 1.4l1.2 4.3"
          stroke="#fff"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="3" y="12.5" width="14" height="3" rx="1" stroke="#fff" strokeWidth="1.5" />
        <circle cx="6.5" cy="16" r="1.1" fill="#fff" />
        <circle cx="13.5" cy="16" r="1.1" fill="#fff" />
      </svg>
    );
  return null;
}

export function TransactionRow({
  name,
  category,
  meta,
  amount,
  positive,
  icon,
  showDivider = true,
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 0',
        borderBottom: showDivider ? '1px solid var(--divider)' : 'none',
        fontFamily: 'var(--font-sans)',
      }}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 'var(--radius-circle)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: CATEGORY_COLORS[icon] || 'var(--color-text-faint)',
        }}>
        <CategoryIcon type={icon} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 'var(--weight-bold)',
            color: 'var(--color-text)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
          {name}
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--color-text-muted)',
            fontWeight: 'var(--weight-semibold)',
          }}>
          {category} · {meta}
        </div>
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 'var(--weight-black)',
          color: positive ? 'var(--color-success)' : 'var(--color-danger)',
        }}>
        {amount}
      </div>
    </div>
  );
}
