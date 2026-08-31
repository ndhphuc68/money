import React, { useState, useRef, useEffect } from 'react';

export function Dropdown({ label, options, value, onChange, placeholder = 'Chọn...' }) {
  const [open, setOpen] = useState(false);
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

  const selected = options.find((o) => o.value === value);

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
          aria-haspopup="listbox"
          aria-expanded={open}
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
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: selected ? '#101828' : '#9AA1B4',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
            {selected ? selected.label : placeholder}
          </span>
          <svg
            width="12"
            height="8"
            viewBox="0 0 12 8"
            fill="none"
            style={{
              flexShrink: 0,
              transform: open ? 'rotate(180deg)' : 'none',
              transition: 'transform 150ms ease',
            }}>
            <path
              d="M1 1.5 6 6.5l5-5"
              stroke="#667085"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {open && (
          <div
            role="listbox"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 'calc(100% + 6px)',
              zIndex: 30,
              background: '#fff',
              borderRadius: 14,
              padding: 6,
              boxShadow: '0 12px 28px rgba(16,24,40,.16)',
              border: '1px solid rgba(16,24,40,.06)',
              maxHeight: 240,
              overflowY: 'auto',
            }}>
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange && onChange(opt.value);
                    setOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    padding: '11px 10px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    background: active ? 'rgba(47,111,237,.08)' : 'transparent',
                    color: active ? 'var(--color-primary)' : '#101828',
                    fontSize: 14,
                    fontWeight: active ? 800 : 600,
                  }}>
                  <span
                    style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {opt.label}
                  </span>
                  {active && (
                    <svg
                      width="14"
                      height="11"
                      viewBox="0 0 14 11"
                      fill="none"
                      style={{ flexShrink: 0 }}>
                      <path
                        d="M1 5.5 5 9.5 13 1.5"
                        stroke="var(--color-primary)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
              );
            })}
            {options.length === 0 && (
              <div
                style={{
                  padding: '14px 10px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#8B93A7',
                  textAlign: 'center',
                }}>
                Không có lựa chọn
              </div>
            )}
          </div>
        )}
      </div>
    </label>
  );
}
