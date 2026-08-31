import { fireEvent, render } from '@testing-library/react-native';

import { ColorPicker } from '@/components/finance/ColorPicker';
import { IconPickerSheet } from '@/components/finance/IconPickerSheet';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe('ColorPicker component', () => {
  it('renders color swatches and calls onSelectColor when pressed', () => {
    const onSelectColor = jest.fn();
    const screen = render(<ColorPicker onSelectColor={onSelectColor} selectedColor="#F2734A" />);

    const spotifyColorButton = screen.getByLabelText('Màu #1DB954');
    expect(spotifyColorButton).toBeTruthy();
    fireEvent.press(spotifyColorButton);
    expect(onSelectColor).toHaveBeenCalledWith('#1DB954');
  });
});

describe('IconPickerSheet component', () => {
  it('renders search input and allows filtering icons by search query', () => {
    const onSelectIcon = jest.fn();
    const onClose = jest.fn();

    const screen = render(
      <IconPickerSheet
        onClose={onClose}
        onSelectIcon={onSelectIcon}
        selectedColor="#1DB954"
        selectedIcon="fa6:spotify"
        visible={true}
      />,
    );

    expect(screen.getByPlaceholderText('Tìm kiếm biểu tượng...')).toBeTruthy();

    // Type "tiktok" into search input
    fireEvent.changeText(screen.getByPlaceholderText('Tìm kiếm biểu tượng...'), 'tiktok');

    const tiktokIcon = screen.getByLabelText('Biểu tượng TikTok');
    expect(tiktokIcon).toBeTruthy();
    fireEvent.press(tiktokIcon);
    expect(onSelectIcon).toHaveBeenCalledWith('fa6:tiktok');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('allows switching icon group tabs', () => {
    const onSelectIcon = jest.fn();
    const onClose = jest.fn();

    const screen = render(
      <IconPickerSheet
        onClose={onClose}
        onSelectIcon={onSelectIcon}
        selectedColor="#F2734A"
        selectedIcon="fa6:shapes"
        visible={true}
      />,
    );

    const foodTab = screen.getByText('Ăn uống');
    expect(foodTab).toBeTruthy();
    fireEvent.press(foodTab);

    const diningIcon = screen.getByLabelText('Biểu tượng Ăn tiệm / Nhà hàng');
    expect(diningIcon).toBeTruthy();
    fireEvent.press(diningIcon);
    expect(onSelectIcon).toHaveBeenCalledWith('mci:silverware-fork-knife');
  });
});
