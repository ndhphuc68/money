/**
 * Money design system — Research Premium Indigo palette.
 * Keep component styles semantic; do not use raw hex values in screens.
 */
export const colors = {
  brand: {
    primary: '#281C9D',
    primaryPressed: '#1E157C',
    secondary: '#5655B9',
    soft: '#F2F1F9',
    tint: '#A8A3D7',
  },
  content: {
    primary: '#343434',
    secondary: '#898989',
    inverse: '#FFFFFF',
    placeholder: '#989898',
  },
  surface: {
    canvas: '#F2F1F9',
    primary: '#FFFFFF',
    raised: '#E0E0E0',
    input: '#FFFFFF',
  },
  border: {
    subtle: '#E0E0E0',
    strong: '#CACACA',
  },
  status: {
    positive: '#52D5BA',
    positiveSoft: '#E1F8F2',
    warning: '#FFAF2A',
    warningSoft: '#FFF3DA',
    negative: '#FF4267',
    negativeSoft: '#FFE5EB',
    info: '#0890FE',
    infoSoft: '#E0F2FF',
    accent: '#FB6818',
  },
} as const;

export type AppColors = typeof colors;
