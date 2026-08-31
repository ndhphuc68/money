import { fireEvent, render } from '@testing-library/react-native';

import { CategoryFormSheet } from '@/components/finance/CategoryFormSheet';
import type { Category } from '@/core/domain/finance/category';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe('CategoryFormSheet component', () => {
  const mockCategory: Category = {
    id: 'cat-001',
    name: 'Ăn uống',
    type: 'expense',
    icon: 'mci:silverware-fork-knife',
    color: '#F59E0B',
    isArchived: false,
    createdAt: '2026-08-24T10:00:00.000Z',
    updatedAt: '2026-08-24T10:00:00.000Z',
    deletedAt: null,
    revision: 1,
    originDeviceId: 'dev-1',
  };

  it('renders in create mode and submits new category data', () => {
    const onSave = jest.fn();
    const onClose = jest.fn();

    const screen = render(<CategoryFormSheet onClose={onClose} onSave={onSave} visible={true} />);

    expect(screen.getByText('Thêm danh mục mới')).toBeTruthy();

    // Type category name
    fireEvent.changeText(
      screen.getByPlaceholderText('vd: Cà phê, Spotify, Tiền phòng...'),
      'TikTok Shop',
    );

    // Pick a color
    const colorBtn = screen.getByLabelText('Màu #1DB954');
    fireEvent.press(colorBtn);

    // Save
    fireEvent.press(screen.getByRole('button', { name: 'Lưu danh mục' }));

    expect(onSave).toHaveBeenCalledWith({
      name: 'TikTok Shop',
      type: 'expense',
      icon: 'fa6:shapes',
      color: '#1DB954',
    });
  });

  it('renders in edit mode with existing data and supports editing', () => {
    const onSave = jest.fn();
    const onClose = jest.fn();

    const screen = render(
      <CategoryFormSheet
        editingCategory={mockCategory}
        onClose={onClose}
        onSave={onSave}
        visible={true}
      />,
    );

    expect(screen.getByText('Chỉnh sửa danh mục')).toBeTruthy();
    expect(screen.getByDisplayValue('Ăn uống')).toBeTruthy();

    fireEvent.changeText(screen.getByDisplayValue('Ăn uống'), 'Ăn tiệm & Cafe');
    fireEvent.press(screen.getByRole('button', { name: 'Lưu danh mục' }));

    expect(onSave).toHaveBeenCalledWith({
      id: 'cat-001',
      name: 'Ăn tiệm & Cafe',
      type: 'expense',
      icon: 'mci:silverware-fork-knife',
      color: '#F59E0B',
    });
  });
});
