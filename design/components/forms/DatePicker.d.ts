export interface DatePickerProps {
  /** Field label rendered above the control */
  label?: string;
  /** ISO date string, e.g. "2026-08-27" */
  value: string;
  onChange?: (isoDate: string) => void;
}
