import { render } from '@testing-library/react-native';

import { CategoryIcon } from '@/components/finance/icons';
import { CATEGORY_ICON_REGISTRY } from '@/components/finance/category-icon-registry';
import { VELA_CATEGORY_COLORS } from '@/components/finance/category-colors';

describe('CategoryIcon & Registries', () => {
  it('has 16 colors in VELA_CATEGORY_COLORS', () => {
    expect(VELA_CATEGORY_COLORS.length).toBe(16);
    expect(VELA_CATEGORY_COLORS).toContain('#F2734A');
    expect(VELA_CATEGORY_COLORS).toContain('#1DB954');
    expect(VELA_CATEGORY_COLORS).toContain('#010101');
  });

  it('contains social and brand icons in CATEGORY_ICON_REGISTRY', () => {
    const ids = CATEGORY_ICON_REGISTRY.map((i) => i.id);
    expect(ids).toContain('fa6:tiktok');
    expect(ids).toContain('fa6:spotify');
    expect(ids).toContain('fa6:youtube');
    expect(ids).toContain('fa6:facebook');
    expect(ids).toContain('fa6:instagram');
  });

  it('renders CategoryIcon with fa6 icon and custom color', () => {
    const { getByTestId } = render(
      <CategoryIcon color="#1DB954" icon="fa6:spotify" testID="cat-icon-spotify" />,
    );
    expect(getByTestId('cat-icon-spotify')).toBeTruthy();
  });

  it('renders CategoryIcon with legacy fallback icon name', () => {
    const { getByTestId } = render(
      <CategoryIcon color="#F59E0B" icon="food" testID="cat-icon-food" />,
    );
    expect(getByTestId('cat-icon-food')).toBeTruthy();
  });
});
