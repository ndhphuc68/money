import React from 'react';

export function BalanceCard({
  label = 'Số dư khả dụng',
  balance,
  masked = false,
  maskedText = '•• ••• •••₫',
  cardNumber,
  expiry,
  onToggleMask,
}) {
  return (
    <div
      style={{
        borderRadius: 'var(--radius-xl)',
        padding: 22,
        color: '#fff',
        background: 'var(--gradient-balance)',
        boxShadow: 'var(--shadow-elevated)',
        fontFamily: 'var(--font-sans)',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 'var(--weight-semibold)',
            opacity: 0.8,
            letterSpacing: 0.3,
          }}>
          {label}
        </span>
        <button
          onClick={onToggleMask}
          style={{
            cursor: 'pointer',
            width: 28,
            height: 28,
            borderRadius: 'var(--radius-circle)',
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <svg width="15" height="15" viewBox="0 0 20 14" fill="none">
            <path d="M1 7s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" stroke="#fff" strokeWidth="1.4" />
            <circle cx="10" cy="7" r="2.5" stroke="#fff" strokeWidth="1.4" />
          </svg>
        </button>
      </div>
      <div style={{ fontSize: 30, fontWeight: 'var(--weight-black)', margin: '10px 0 18px' }}>
        {masked ? maskedText : balance}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: 14,
            letterSpacing: 2,
            fontWeight: 'var(--weight-semibold)',
            opacity: 0.9,
          }}>
          {cardNumber}
        </span>
        <span style={{ fontSize: 12, opacity: 0.75, fontWeight: 'var(--weight-semibold)' }}>
          {expiry}
        </span>
      </div>
    </div>
  );
}
