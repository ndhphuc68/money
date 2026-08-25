/**
 * Money finance app design system.
 * Keep component styles semantic; do not use raw hex values in screens.
 */
export const colors = {
  brand: {
    primary: '#2F6FED',
    primaryPressed: '#2558BE',
    secondary: '#182B6E',
    soft: '#EAF1FF',
    tint: '#BFD3FF',
    accent: '#F2734A',
  },
  content: {
    primary: '#101828',
    secondary: '#8B93A7',
    muted: '#8B93A7',
    muted2: '#9AA1B4',
    faint: '#B4BACB',
    inverse: '#FFFFFF',
    placeholder: '#9AA1B4',
  },
  surface: {
    canvas: '#F4F5FA',
    primary: '#FFFFFF',
    raised: '#FFFFFF',
    input: '#FFFFFF',
    muted: '#EDEEF3',
  },
  border: {
    subtle: 'rgba(16, 24, 40, 0.06)',
    strong: '#EDEEF3',
  },
  status: {
    positive: '#1FAA59',
    positiveSoft: '#E7F7EE',
    warning: '#F2734A',
    warningSoft: '#FDECE6',
    negative: '#E25050',
    negativeSoft: '#FBEAEA',
    info: '#2F6FED',
    infoSoft: '#EAF1FF',
    accent: '#F2734A',
  },
  category: {
    income: '#1FAA59',
    food: '#F2734A',
    shopping: '#7C5CFC',
    bills: '#2F6FED',
    transport: '#14B8A6',
  },
  gradient: {
    balance: ['#3A5FE5', '#182B6E'],
    premium: ['#F58B5E', '#D9502F'],
  },
  divider: 'rgba(16, 24, 40, 0.06)',
} as const;

export type AppColors = typeof colors;
