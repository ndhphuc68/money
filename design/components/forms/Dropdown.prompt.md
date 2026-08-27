# Dropdown

Custom select control matching the `.gold-field` input style — replaces native `<select>` for a consistent, branded look across browsers/platforms.

```jsx
<Dropdown
  label="Thương hiệu / nơi mua"
  value={brand}
  onChange={setBrand}
  options={[
    { value: 'PNJ', label: 'PNJ' },
    { value: 'SJC', label: 'SJC' },
    { value: '__add_new__', label: '+ Thêm thương hiệu mới…' },
  ]}
/>
```

- Closes on outside click and Escape.
- Selected option shows a check icon; unselected rows use body text.
- Empty `options` renders a muted "Không có lựa chọn" row instead of an empty list.
