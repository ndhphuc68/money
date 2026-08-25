export interface SegmentedControlProps {
  /** 2-3 short labels */
  options: string[];
  value: string;
  onChange?: (value: string) => void;
}
