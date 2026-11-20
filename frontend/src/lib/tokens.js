/**
 * GateWise BLR Design System Tokens
 * Master token definitions and styling helpers for pure monochrome aviation ops UI
 */

export const colors = {
  bg: {
    primary: '#090909',
    secondary: '#111111',
    tertiary: '#181818',
    glass: 'rgba(17, 17, 17, 0.9)',
  },
  card: {
    bg: '#181818',
    hover: '#222222',
    active: '#2A2A2A',
  },
  border: {
    subtle: '#262626',
    default: '#333333',
    strong: '#555555',
    highlight: '#FFFFFF',
  },
  accent: {
    primary: '#FFFFFF',
    secondary: '#E5E5E5',
    muted: '#A3A3A3',
    dark: '#222222',
  },
  status: {
    nominal: '#FFFFFF',
    notice: '#E5E5E5',
    warning: '#A3A3A3',
    critical: '#E5E5E5',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#A3A3A3',
    muted: '#737373',
    inverse: '#090909',
  },
}

export const typography = {
  fontFamily: {
    sans: "'Inter', 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
  },
}

export default {
  colors,
  typography,
}
