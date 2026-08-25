export interface GoalCardProps {
  name: string;
  /** 1-2 letter badge text */
  initials: string;
  /** CSS color for the badge + progress fill. Default: var(--color-primary) */
  color?: string;
  /** Due label, e.g. "Hạn: Th12/2026" */
  due: string;
  /** 0-100 */
  percent: number;
  /** Pre-formatted saved amount */
  saved: string;
  /** Pre-formatted target amount */
  target: string;
}
