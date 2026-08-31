import { fireEvent, render } from '@testing-library/react-native';

import { Dropdown } from '@/components/base/Dropdown';

describe('Dropdown', () => {
  it('renders field label, value label, and handles open/close/select', () => {
    const onToggle = jest.fn();
    const onSelect = jest.fn();

    const screen = render(
      <Dropdown
        fieldLabel="Danh mục"
        onSelect={onSelect}
        onToggle={onToggle}
        open={false}
        options={[
          { key: 'cat-1', label: 'Ăn uống', isActive: true },
          { key: 'cat-2', label: 'Di chuyển', isActive: false },
        ]}
        valueLabel="Ăn uống"
      />,
    );

    expect(screen.getByText('Danh mục')).toBeTruthy();
    expect(screen.getByText('Ăn uống')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Danh mục' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('renders dropdown options when open', () => {
    const onSelect = jest.fn();
    const onToggle = jest.fn();

    const screen = render(
      <Dropdown
        fieldLabel="Danh mục"
        onSelect={onSelect}
        onToggle={onToggle}
        open={true}
        options={[
          { key: 'cat-1', label: 'Ăn uống', isActive: true },
          { key: 'cat-2', label: 'Di chuyển', isActive: false },
        ]}
        valueLabel="Ăn uống"
      />,
    );

    expect(screen.getByRole('button', { name: 'Di chuyển' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Di chuyển' }));
    expect(onSelect).toHaveBeenCalledWith('cat-2');
  });

  it('renders error message when provided', () => {
    const screen = render(
      <Dropdown
        errorMessage="Vui lòng chọn danh mục"
        fieldLabel="Danh mục"
        onSelect={jest.fn()}
        onToggle={jest.fn()}
        open={false}
        options={[]}
        valueLabel="Chọn danh mục"
      />,
    );

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Vui lòng chọn danh mục')).toBeTruthy();
  });
});
