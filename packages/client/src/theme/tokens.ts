/**
 * Theme tokens for Sheriff of Nottingham 2D Design Overhaul
 * Sourced from docs/2d-design-overhaul.md §2, §5, §6
 */

export const PALETTE = {
  parchment: {
    base: '#f2e6ce',
    light: '#fdfbf7',
    dark: '#e5d3b3',
  },
  walnut: {
    bg: '#140e0a',
    surface: '#221811',
    card: '#2c2017',
    border: '#453324',
  },
  gold: {
    light: '#ffd875',
    base: '#d4a84b',
    dark: '#946d23',
    glow: 'rgba(212, 168, 75, 0.4)',
  },
  crimson: {
    light: '#ef4444',
    base: '#991b1b',
    dark: '#7f1d1d',
  },
  emerald: {
    light: '#34d399',
    base: '#059669',
    dark: '#065f46',
  },
  contraband: {
    light: '#c084fc',
    base: '#7e22ce',
    dark: '#3b0764',
    border: '#a855f7',
  },
  royal: {
    light: '#e9d5ff',
    base: '#9333ea',
    dark: '#581c87',
  },
} as const;

export const GOOD_TOKENS = {
  APPLE: {
    name: 'Apple',
    icon: '🍎',
    color: '#dc2626',
    border: '#b91c1c',
    bg: '#14532d',
  },
  CHEESE: {
    name: 'Cheese',
    icon: '🧀',
    color: '#d97706',
    border: '#b45309',
    bg: '#78350f',
  },
  BREAD: {
    name: 'Bread',
    icon: '🍞',
    color: '#ea580c',
    border: '#c2410c',
    bg: '#7c2d12',
  },
  CHICKEN: {
    name: 'Chicken',
    icon: '🍗',
    color: '#0284c7',
    border: '#0369a1',
    bg: '#0f4c81',
  },
  CONTRABAND: {
    name: 'Contraband',
    icon: '⚜️',
    color: '#a855f7',
    border: '#7e22ce',
    bg: '#7f1d1d',
  },
  ROYAL: {
    name: 'Royal',
    icon: '👑',
    color: '#c084fc',
    border: '#9333ea',
    bg: '#4a154b',
  },
} as const;

export const MOTION_PRESETS = {
  snap: {
    type: 'spring' as const,
    stiffness: 350,
    damping: 20,
  },
  settle: {
    type: 'spring' as const,
    stiffness: 200,
    damping: 26,
  },
  flourish: {
    type: 'spring' as const,
    stiffness: 120,
    damping: 14,
  },
  instant: {
    duration: 0,
  },
} as const;
