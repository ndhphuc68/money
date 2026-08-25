import { colors, radius, shadows, spacing, typography } from '@/theme';

describe('finance design system tokens', () => {
  it('exports the handoff finance palette as semantic colors', () => {
    expect(colors.surface.canvas).toBe('#F4F5FA');
    expect(colors.surface.primary).toBe('#FFFFFF');
    expect(colors.content.primary).toBe('#101828');
    expect(colors.brand.primary).toBe('#2F6FED');
    expect(colors.status.positive).toBe('#1FAA59');
    expect(colors.category.shopping).toBe('#7C5CFC');
    expect(colors.divider).toBe('rgba(16, 24, 40, 0.06)');
    expect(colors.gradient.balance).toEqual(['#3A5FE5', '#182B6E']);
  });

  it('exports spacing, radius, typography, and shadows for component styling', () => {
    expect(spacing[1]).toBe(4);
    expect(spacing[7]).toBe(32);
    expect(radius.xl).toBe(22);
    expect(radius.pill).toBe(9999);
    expect(typography.sizes.display).toBe(30);
    expect(typography.weights.black).toBe('800');
    expect(shadows.card).toMatchObject({ shadowOpacity: 0.05, elevation: 2 });
  });
});
