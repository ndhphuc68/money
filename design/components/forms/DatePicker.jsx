import React, { useState, useRef, useEffect } from 'react';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MONTHS = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
];

function formatDisplay(date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
}

function isSameDay(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildGrid(viewYear, viewMonth) {
  const first = new Date(viewYear, viewMonth, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));
  return cells;
}

export function DatePicker({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(value) : null;
  const [viewYear, setViewYear] = useState((selected || new Date()).getFullYear());
  const [viewMonth, setViewMonth] = useState((selected || new Date()).getMonth());
  const rootRef = useRef(null);

  useEffect(() => {
    function handleOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  const today = new Date();
  const cells = buildGrid(viewYear, viewMonth);

  function shiftMonth(delta) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  }

  function pickDay(date) {
    onChange && onChange(formatDisplay(date).split('/').reverse().join('-'));
    setOpen(false);
  }

  return (
    <label style={{ display: 'block', fontFamily: 'var(--font-sans)' }} ref={rootRef}>
      {label && (
        <span
          style={{
            display: 'block',
            fontSize: 12,
            lineHeight: '18px',
            fontWeight: 800,
            color: '#344054',
            marginBottom: 6,
          }}>
          {label}
        </span>
      )}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            width: '100%',
            height: 48,
            border: `1px solid ${open ? 'var(--color-primary)' : '#D0D5DD'}`,
            borderRadius: 12,
            background: '#fff',
            padding: '0 13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            cursor: 'pointer',
            boxShadow: open ? '0 0 0 3px rgba(47,111,237,.14)' : 'none',
            fontFamily: 'inherit',
          }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: selected ? '#101828' : '#9AA1B4' }}>
            {selected ? formatDisplay(selected) : 'Chọn ngày'}
          </span>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
            <rect
              x="2.5"
              y="3.5"
              width="13"
              height="12"
              rx="2.5"
              stroke="#667085"
              strokeWidth="1.5"
            />
            <path
              d="M2.5 7h13M6 2v3M12 2v3"
              stroke="#667085"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {open && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 'calc(100% + 6px)',
              zIndex: 30,
              background: '#fff',
              borderRadius: 16,
              padding: 14,
              boxShadow: '0 12px 28px rgba(16,24,40,.16)',
              border: '1px solid rgba(16,24,40,.06)',
            }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}>
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                aria-label="Tháng trước"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  border: 0,
                  background: '#F2F4F7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}>
                <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
                  <path
                    d="M6 1 1 6l5 5"
                    stroke="#344054"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#101828' }}>
                {MONTHS[viewMonth]} {viewYear}
              </div>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                aria-label="Tháng sau"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  border: 0,
                  background: '#F2F4F7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}>
                <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
                  <path
                    d="M1 1 6 6l-5 5"
                    stroke="#344054"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 2,
                marginBottom: 4,
              }}>
              {WEEKDAYS.map((w) => (
                <div
                  key={w}
                  style={{
                    textAlign: 'center',
                    fontSize: 10,
                    fontWeight: 800,
                    color: '#9AA1B4',
                    padding: '4px 0',
                  }}>
                  {w}
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {cells.map((date, i) => {
                if (!date) return <div key={`empty-${i}`} />;
                const isSelected = isSameDay(date, selected);
                const isToday = isSameDay(date, today);
                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    onClick={() => pickDay(date)}
                    style={{
                      aspectRatio: '1',
                      border: 0,
                      borderRadius: 10,
                      background: isSelected
                        ? 'linear-gradient(135deg,#F4B942 0%,#C98213 100%)'
                        : 'transparent',
                      color: isSelected ? '#fff' : '#101828',
                      fontSize: 12,
                      fontWeight: isSelected || isToday ? 800 : 600,
                      cursor: 'pointer',
                      position: 'relative',
                    }}>
                    {date.getDate()}
                    {isToday && !isSelected && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: 3,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 4,
                          height: 4,
                          borderRadius: 2,
                          background: 'var(--color-primary)',
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </label>
  );
}
