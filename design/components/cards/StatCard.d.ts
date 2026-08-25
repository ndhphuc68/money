export interface StatCardProps {
  label: string;
  /** Pre-formatted value, e.g. "+18.200.000 ₫" */
  value: string;
  /** Controls the value color. Default: "positive" */
  tone?: 'positive' | 'negative';
}
