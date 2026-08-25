export interface SettingsListItem {
  label: string;
  /** CSS color for the leading icon swatch */
  iconColor: string;
}

export interface SettingsListProps {
  items: SettingsListItem[];
  onSelect?: (index: number) => void;
}
