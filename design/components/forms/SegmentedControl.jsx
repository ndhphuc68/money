import React from 'react';

export function SegmentedControl({ options, value, onChange }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 6,
        background: '#EDEEF3',
        borderRadius: 'var(--radius-sm)',
        padding: 4,
        fontFamily: 'var(--font-sans)',
      }}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <div
            key={opt}
            onClick={() => onChange && onChange(opt)}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '9px 0',
              borderRadius: 10,
              cursor: 'pointer',
              background: active ? 'var(--color-text)' : 'transparent',
              color: active ? '#fff' : 'var(--color-text-muted)',
              fontWeight: active ? 'var(--weight-bold)' : 'var(--weight-semibold)',
              fontSize: 13,
            }}>
            {opt}
          </div>
        );
      })}
    </div>
  );
}
