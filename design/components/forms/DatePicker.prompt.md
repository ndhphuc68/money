# DatePicker

Branded calendar popover — replaces the native `<input type="date">`, which renders inconsistently (locale, icon, format) across browsers.

```jsx
<DatePicker label="Ngày giao dịch" value={date} onChange={setDate} />
```

- `value`/`onChange` use ISO `yyyy-mm-dd` strings; the trigger button displays `dd/mm/yyyy`.
- Monday-first week grid, Vietnamese month labels, gold gradient fill on the selected day, a small dot under today.
- Closes on outside click, Escape, or day selection.
