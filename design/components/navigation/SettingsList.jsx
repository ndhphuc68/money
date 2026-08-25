import React from 'react';

export function SettingsList({ items, onSelect }) {
  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: 26, overflow: 'hidden', fontFamily: 'var(--font-sans)' }}>
      {items.map((item, i) => (
        <div key={item.label} onClick={() => onSelect && onSelect(i)} style={{ display: 'flex', alignItems: 'center', minHeight: 52, padding: '0 16px', position: 'relative', fontSize: 17, cursor: 'pointer', borderBottom: i < items.length - 1 ? '1px solid rgba(60,60,67,0.12)' : 'none' }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: item.iconColor, marginRight: 12, flexShrink: 0 }} />
          <div style={{ flex: 1, color: 'var(--color-text)' }}>{item.label}</div>
          <svg width="8" height="14" viewBox="0 0 8 14"><path d="M1 1l6 6-6 6" stroke="rgba(60,60,67,0.3)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
      ))}
    </div>
  );
}
