import React from 'react';

export function GoalCard({ name, initials, color = 'var(--color-primary)', due, percent, saved, target }) {
  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: 16, boxShadow: 'var(--shadow-card)', fontFamily: 'var(--font-sans)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-circle)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'var(--weight-black)', fontSize: 12, background: color }}>{initials}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 'var(--weight-black)', color: 'var(--color-text)' }}>{name}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 'var(--weight-semibold)' }}>{due}</div>
        </div>
        <span style={{ fontSize: 13, fontWeight: 'var(--weight-black)', color: 'var(--color-text)' }}>{percent}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: '#EDEEF3', marginBottom: 8 }}>
        <div style={{ width: percent + '%', height: 6, borderRadius: 3, background: color }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-muted)' }}>
        <span>{saved} đã tiết kiệm</span>
        <span>Mục tiêu {target}</span>
      </div>
    </div>
  );
}
