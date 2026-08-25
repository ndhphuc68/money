import React from 'react';

function NavIcon({ type, color }) {
  const common = { width: 22, height: 22, viewBox: '0 0 22 22', fill: 'none' };
  if (type === 'overview') return <svg {...common}><circle cx="11" cy="11" r="7.5" stroke={color} strokeWidth="1.8" /><circle cx="11" cy="11" r="2.5" fill={color} /></svg>;
  if (type === 'list') return <svg {...common}><rect x="3" y="5" width="16" height="2.4" rx="1.2" fill={color} /><rect x="3" y="10" width="16" height="2.4" rx="1.2" fill={color} /><rect x="3" y="15" width="10" height="2.4" rx="1.2" fill={color} /></svg>;
  if (type === 'target') return <svg {...common}><circle cx="11" cy="11" r="8" stroke={color} strokeWidth="1.8" /><circle cx="11" cy="11" r="3.5" stroke={color} strokeWidth="1.8" /></svg>;
  if (type === 'profile') return <svg {...common}><circle cx="11" cy="7.5" r="3.5" stroke={color} strokeWidth="1.8" /><path d="M3.5 19c1.3-4 4.3-6 7.5-6s6.2 2 7.5 6" stroke={color} strokeWidth="1.8" strokeLinecap="round" /></svg>;
  return null;
}

function NavItem({ item, active, onChange }) {
  const color = active ? 'var(--color-primary)' : 'var(--color-text-faint)';
  const textColor = active ? 'var(--color-text)' : 'var(--color-text-muted-2)';
  return (
    <div onClick={() => onChange && onChange(item.key)} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 56 }}>
      <NavIcon type={item.icon} color={color} />
      <span style={{ fontSize: 10, fontWeight: 'var(--weight-bold)', color: textColor }}>{item.label}</span>
    </div>
  );
}

export function BottomNav({ items, activeKey, onChange, onAdd }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '10px 8px 26px', background: 'var(--color-surface)', borderTop: '1px solid var(--divider)', fontFamily: 'var(--font-sans)' }}>
      {items.slice(0, 2).map((it) => <NavItem key={it.key} item={it} active={it.key === activeKey} onChange={onChange} />)}
      <div onClick={onAdd} style={{ cursor: 'pointer', width: 52, height: 52, borderRadius: 'var(--radius-circle)', background: 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: -30, boxShadow: 'var(--shadow-fab)' }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 3v14M3 10h14" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" /></svg>
      </div>
      {items.slice(2).map((it) => <NavItem key={it.key} item={it} active={it.key === activeKey} onChange={onChange} />)}
    </div>
  );
}
