/**
 * GateWise BLR Design System Tokens
 * Master token definitions and styling helpers for dark aviation operations UI
 */

export const colors = {
  bg: {
    primary: '#080B11',
    secondary: '#0D121F',
    tertiary: '#121826',
    elevated: '#1E2638',
    glass: 'rgba(13, 18, 31, 0.85)',
  },
  card: {
    bg: '#121826',
    hover: '#1E2638',
    active: '#22314A',
  },
  border: {
    subtle: '#162032',
    default: '#222E42',
    strong: '#334155',
    highlight: '#38BDF8',
  },
  accent: {
    primary: '#38BDF8',
    secondary: '#0284C7',
    muted: '#94A3B8',
    dark: '#1E2638',
  },
  status: {
    nominal: '#10B981',
    notice: '#38BDF8',
    warning: '#F59E0B',
    critical: '#EF4444',
  },
  text: {
    primary: '#F8FAFC',
    secondary: '#94A3B8',
    muted: '#64748B',
    inverse: '#080B11',
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
