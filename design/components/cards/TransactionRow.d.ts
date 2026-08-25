export interface TransactionRowProps {
  name: string;
  category: string;
  /** Secondary text after the category, e.g. a time or relative date */
  meta: string;
  /** Pre-formatted, signed amount, e.g. "-45.000 ₫" */
  amount: string;
  positive: boolean;
  icon: 'income' | 'food' | 'shopping' | 'bills' | 'transport';
  /** Hide on the last row in a group. Default: true */
  showDivider?: boolean;
}
