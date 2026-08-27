export interface DropdownOption {
  value: string;
  label: string;
}

export interface DropdownProps {
  /** Field label rendered above the control */
  label?: string;
  options: DropdownOption[];
  value: string;
  onChange?: (value: string) => void;
  /** Shown when value has no matching option */
  placeholder?: string;
}
