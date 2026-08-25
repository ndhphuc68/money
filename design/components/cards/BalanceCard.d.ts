export interface BalanceCardProps {
  /** Label above the balance. Default: "Số dư khả dụng" */
  label?: string;
  /** Formatted balance, e.g. "24.850.000 ₫" */
  balance: string;
  /** Show maskedText instead of balance */
  masked?: boolean;
  /** Text shown when masked. Default: "•• ••• •••₫" */
  maskedText?: string;
  /** Masked card number, e.g. "•••• 4821" */
  cardNumber: string;
  /** Card expiry, e.g. "09/28" */
  expiry: string;
  onToggleMask?: () => void;
}
