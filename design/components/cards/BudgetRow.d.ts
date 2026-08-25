export interface BudgetRowProps {
  category: string;
  /** Pre-formatted amount spent */
  spent: string;
  /** Pre-formatted budget limit */
  limit: string;
  /** 0-100 */
  percent: number;
  /** Progress fill color. Default: var(--color-primary) */
  color?: string;
}
