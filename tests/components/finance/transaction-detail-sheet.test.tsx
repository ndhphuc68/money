import { fireEvent, render } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { TransactionDetailSheet, type TransactionDetailData } from '@/components/finance';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe('TransactionDetailSheet', () => {
  const sampleDetail: TransactionDetailData = {
    id: 'tx-123',
    name: 'Ăn trưa với đồng nghiệp',
    type: 'expense',
    typeLabel: 'Chi tiêu',
    amountLabel: '-50.000 ₫',
    positive: false,
    categoryLabel: 'Ăn uống',
    categoryIcon: 'food',
    accountName: 'Ví tiền mặt',
    destinationAccountName: null,
    dateLabel: '25/08/2026',
    note: 'Ăn phở',
  };

  const defaultProps = {
    visible: true,
    detail: sampleDetail,
    loading: false,
    closeLabel: 'Đóng',
    title: 'Chi tiết giao dịch',
    deleteLabel: 'Xóa giao dịch',
    deleteConfirmTitle: 'Xóa giao dịch?',
    deleteConfirmMessage: 'Bạn có chắc muốn xóa "{name}"?',
    deleteConfirmCancel: 'Hủy',
    deleteConfirmConfirm: 'Xóa',
    labels: {
      type: 'Loại giao dịch',
      category: 'Danh mục',
      account: 'Tài khoản',
      destination: 'Tài khoản đích',
      date: 'Ngày giao dịch',
      note: 'Ghi chú',
    },
    onDelete: jest.fn(),
    onClose: jest.fn(),
  };

  it('renders all transaction details correctly', () => {
    const screen = render(<TransactionDetailSheet {...defaultProps} />);

    expect(screen.getByText('Chi tiết giao dịch')).toBeTruthy();
    expect(screen.getByText('Ăn trưa với đồng nghiệp')).toBeTruthy();
    expect(screen.getByText('-50.000 ₫')).toBeTruthy();
    expect(screen.getAllByText('Chi tiêu').length).toBeGreaterThan(0);
    expect(screen.getByText('Ăn uống')).toBeTruthy();
    expect(screen.getByText('Ví tiền mặt')).toBeTruthy();
    expect(screen.getByText('25/08/2026')).toBeTruthy();
    expect(screen.getByText('Ăn phở')).toBeTruthy();
    expect(screen.getByText('Xóa giao dịch')).toBeTruthy();
  });

  it('prompts confirmation when clicking delete and executes onDelete', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      const confirmButton = buttons?.find((b) => b.style === 'destructive');
      confirmButton?.onPress?.();
    });

    const onDelete = jest.fn();
    const onClose = jest.fn();
    const screen = render(
      <TransactionDetailSheet {...defaultProps} onClose={onClose} onDelete={onDelete} />,
    );

    fireEvent.press(screen.getByText('Xóa giao dịch'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Xóa giao dịch?',
      'Bạn có chắc muốn xóa "Ăn trưa với đồng nghiệp"?',
      expect.any(Array),
    );
    expect(onDelete).toHaveBeenCalledWith('tx-123');
    expect(onClose).toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it('renders transfer transaction without category and with destination account', () => {
    const transferDetail: TransactionDetailData = {
      id: 'tx-456',
      name: 'Chuyển tiền tiết kiệm',
      type: 'transfer',
      typeLabel: 'Chuyển khoản',
      amountLabel: '-1.000.000 ₫',
      positive: false,
      accountName: 'Ví tiền mặt',
      destinationAccountName: 'Tài khoản tiết kiệm',
      dateLabel: '26/08/2026',
    };

    const screen = render(<TransactionDetailSheet {...defaultProps} detail={transferDetail} />);

    expect(screen.getByText('Chuyển tiền tiết kiệm')).toBeTruthy();
    expect(screen.getByText('Tài khoản tiết kiệm')).toBeTruthy();
    expect(screen.queryByText('Ăn uống')).toBeNull();
  });
});
