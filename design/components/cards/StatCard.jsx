import React from 'react';

export function StatCard({ label, value, tone = 'positive' }) {
  const color = tone === 'positive' ? 'var(--color-success)' : 'var(--color-danger)';
  return (
    <div style={{ flex: 1, background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: 14, boxShadow: 'var(--shadow-card)', fontFamily: 'var(--font-sans)' }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 'var(--weight-semibold)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 'var(--weight-black)', color }}>{value}</div>
    </div>
  );
}
