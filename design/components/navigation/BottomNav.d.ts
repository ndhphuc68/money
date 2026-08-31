export interface BottomNavItem {
  key: string;
  label: string;
  icon: 'overview' | 'list' | 'target' | 'profile' | 'transactions' | 'reports' | 'settings' | string;
}

export interface BottomNavProps {
  /** Exactly 4 items — 2 render before the center FAB, 2 after */
  items: BottomNavItem[];
  activeKey: string;
  onChange?: (key: string) => void;
  /** Called when the center "+" FAB is tapped */
  onAdd?: () => void;
}
