// tests/features/finance/recurring-occurrences-screen.test.tsx
import { fireEvent, render } from '@testing-library/react-native';

import { RecurringOccurrencesScreen } from '@/features/finance/screens/recurring-occurrences-screen';
import type { RecurringOccurrencesViewModel } from '@/features/finance/view-models/use-recurring-occurrences';
import { translate, Translate } from '@/i18n/translations';

const t: Translate = (key, params) => translate('vi', key, params);

const baseViewModel: RecurringOccurrencesViewModel = {
  loading: false,
  submitting: false,
  view: 'list',
  items: [
    {
      id: 'occ-1',
      displayName: 'YouTube Premium',
      amountLabel: '179.000 ₫',
      scheduledDateLabel: '27/08/2026',
      metaLabel: 'Quá hạn · 27/08/2026',
      displayStatus: 'overdue',
      categoryInitials: 'HĐ',
      categoryBg: '#2F6FED',
    },
    {
      id: 'occ-2',
      displayName: 'Shopee VIP',
      amountLabel: '29.000 ₫',
      scheduledDateLabel: '03/09/2026',
      metaLabel: 'Sắp tới · 03/09/2026',
      displayStatus: 'pending',
      categoryInitials: 'MS',
      categoryBg: '#7C5CFC',
    },
  ],
  overdueCount: 1,
  upcomingCount: 1,
  selected: null,
  editedAmount: null,
  scopeDiffLabel: null,
  successSummary: null,
  error: null,
  openDetail: jest.fn(),
  backToList: jest.fn(),
  setEditedAmount: jest.fn(),
  confirm: jest.fn(),
  chooseScope: jest.fn(),
  backToDetailFromScope: jest.fn(),
  skip: jest.fn(),
};

describe('RecurringOccurrencesScreen UI', () => {
  it('renders list view with summary pills, section headers, and bottom CTA', () => {
    const onBack = jest.fn();
    const onOpenManagement = jest.fn();
    const onAddRecurring = jest.fn();

    const { getByText } = render(
      <RecurringOccurrencesScreen
        {...baseViewModel}
        onAddRecurring={onAddRecurring}
        onBack={onBack}
        onOpenManagement={onOpenManagement}
        t={t}
      />,
    );

    expect(getByText('Chi tiêu định kỳ')).toBeTruthy();
    expect(getByText('Sắp tới 1')).toBeTruthy();
    expect(getByText('Quá hạn 1')).toBeTruthy();
    expect(getByText('CẦN XỬ LÝ')).toBeTruthy();
    expect(getByText('SẮP TỚI')).toBeTruthy();
    expect(getByText('YouTube Premium')).toBeTruthy();
    expect(getByText('Shopee VIP')).toBeTruthy();
    expect(getByText('Thêm chi tiêu định kỳ')).toBeTruthy();

    fireEvent.press(getByText('Thêm chi tiêu định kỳ'));
    expect(onAddRecurring).toHaveBeenCalled();
  });

  it('renders detail view with warning notice, hero card, and details card', () => {
    const detailViewModel: RecurringOccurrencesViewModel = {
      ...baseViewModel,
      view: 'detail',
      selected: {
        id: 'occ-1',
        displayName: 'YouTube Premium',
        amount: 189000,
        scheduledDateLabel: '27/08/2026',
        frequencyLabel: 'Hàng tháng',
        metaLabel: '27/08/2026 · Hàng tháng',
      },
    };

    const { getByText } = render(
      <RecurringOccurrencesScreen
        {...detailViewModel}
        onBack={jest.fn()}
        onOpenManagement={jest.fn()}
        t={t}
      />,
    );

    expect(getByText('YouTube Premium')).toBeTruthy();
    expect(getByText('Quá hạn 1 ngày · Khoản này chưa ảnh hưởng số dư hoặc báo cáo.')).toBeTruthy();
    expect(getByText('SỐ TIỀN DỰ KIẾN')).toBeTruthy();
    expect(getByText('So với lịch')).toBeTruthy();
    expect(getByText('+10.000 ₫')).toBeTruthy();
    expect(getByText('Xác nhận đã chi')).toBeTruthy();
    expect(getByText('Bỏ qua kỳ này')).toBeTruthy();
  });

  it('renders scope view with standard and recommended choice cards', () => {
    const scopeViewModel: RecurringOccurrencesViewModel = {
      ...baseViewModel,
      view: 'scope',
      selected: {
        id: 'occ-1',
        displayName: 'YouTube Premium',
        amount: 189000,
        scheduledDateLabel: '27/08/2026',
        frequencyLabel: 'Hàng tháng',
        metaLabel: '27/08/2026 · Hàng tháng',
      },
      scopeDiffLabel: 'Số tiền kỳ này khác 10.000 ₫ so với lịch hiện tại.',
    };

    const { getByText } = render(
      <RecurringOccurrencesScreen
        {...scopeViewModel}
        onBack={jest.fn()}
        onOpenManagement={jest.fn()}
        t={t}
      />,
    );

    expect(getByText('Áp dụng thay đổi thế nào?')).toBeTruthy();
    expect(getByText('Số tiền kỳ này khác 10.000 ₫ so với lịch hiện tại.')).toBeTruthy();
    expect(getByText('Chỉ kỳ này')).toBeTruthy();
    expect(getByText('Kỳ này và các kỳ sau')).toBeTruthy();
    expect(getByText('Quay lại chỉnh sửa')).toBeTruthy();
  });

  it('renders success view with checkmark badge and summary card', () => {
    const successViewModel: RecurringOccurrencesViewModel = {
      ...baseViewModel,
      view: 'success',
      successSummary: {
        amountLabel: '189.000 ₫',
        nextDateLabel: '27/09/2026',
      },
    };

    const { getByText } = render(
      <RecurringOccurrencesScreen
        {...successViewModel}
        onBack={jest.fn()}
        onOpenManagement={jest.fn()}
        t={t}
      />,
    );

    expect(getByText('Đã xác nhận khoản chi')).toBeTruthy();
    expect(getByText('Lịch hiện tại')).toBeTruthy();
    expect(getByText('Kỳ tiếp theo')).toBeTruthy();
    expect(getByText('27/09/2026')).toBeTruthy();
    expect(getByText('Về danh sách định kỳ')).toBeTruthy();
  });
});
