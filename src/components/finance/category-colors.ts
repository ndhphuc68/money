export const VELA_CATEGORY_COLORS = [
  '#F2734A', // Vela Coral
  '#2F6FED', // Vela Blue
  '#10B981', // Emerald Green
  '#F59E0B', // Amber Gold
  '#8B5CF6', // Purple Violet
  '#EC4899', // Rose Pink
  '#06B6D4', // Cyan Teal
  '#6366F1', // Indigo
  '#EA580C', // Deep Orange
  '#010101', // Pure Dark / TikTok
  '#1DB954', // Spotify Green
  '#FF0000', // YouTube Red
  '#1877F2', // Facebook Blue
  '#0EA5E9', // Sky Blue
  '#E11D48', // Crimson Red
  '#64748B', // Slate Muted
] as const;

export type VelaCategoryColor = (typeof VELA_CATEGORY_COLORS)[number];

export const DEFAULT_CATEGORY_COLOR = '#2F6FED';
