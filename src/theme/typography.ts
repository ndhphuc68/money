import type { TextStyle } from 'react-native';

export const typography = {
  fontFamily: 'Manrope, system-ui, sans-serif',
  sizes: {
    display: 30,
    title: 24,
    heading: 18,
    bodyLg: 16,
    body: 14,
    caption: 13,
    small: 12,
    micro: 10,
  },
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    black: '800',
  },
  lineHeights: {
    display: 38,
    title: 32,
    heading: 24,
    bodyLg: 24,
    body: 20,
    caption: 18,
    small: 16,
    micro: 12,
  },
} as const;

export const textStyles = {
  display: {
    fontSize: typography.sizes.display,
    fontWeight: typography.weights.black,
    lineHeight: typography.lineHeights.display,
  },
  title: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.black,
    lineHeight: typography.lineHeights.title,
  },
  heading: {
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
    lineHeight: typography.lineHeights.heading,
  },
  body: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    lineHeight: typography.lineHeights.body,
  },
  caption: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    lineHeight: typography.lineHeights.caption,
  },
} satisfies Record<string, TextStyle>;

export type AppTypography = typeof typography;
