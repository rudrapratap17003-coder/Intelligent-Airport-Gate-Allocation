/**
 * GateWise Design System Tokens
 * Master token definitions and styling helpers for aviation ops UI
 */

export const colors = {
  bg: {
    primary: '#081421',
    secondary: '#102236',
    tertiary: '#0c1b2c',
    glass: 'rgba(8, 20, 33, 0.85)',
  },
  card: {
    bg: '#142A40',
    hover: '#18344e',
    active: '#1a3a58',
  },
  border: {
    subtle: 'rgba(30, 58, 95, 0.4)',
    default: 'rgba(30, 58, 95, 0.7)',
    strong: '#1e3a5f',
    highlight: 'rgba(36, 200, 232, 0.4)',
  },
  accent: {
    cyan: '#24C8E8',
    cyanMuted: 'rgba(36, 200, 232, 0.12)',
    blue: '#4389FF',
    blueMuted: 'rgba(67, 137, 255, 0.12)',
  },
  status: {
    success: '#22C55E',
    successMuted: 'rgba(34, 197, 94, 0.12)',
    warning: '#F59E0B',
    warningMuted: 'rgba(245, 158, 11, 0.12)',
    error: '#EF4444',
    errorMuted: 'rgba(239, 68, 68, 0.12)',
    info: '#24C8E8',
    infoMuted: 'rgba(36, 200, 232, 0.12)',
  },
  text: {
    primary: '#F1F5F9',
    secondary: '#94A3B8',
    muted: '#64748B',
    inverse: '#081421',
  },
}

export const typography = {
  fontFamily: {
    sans: "'Inter', 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem',// 30px
    '4xl': '2.25rem', // 36px
  },
}

export const transitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  default: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  smooth: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
}

export default { colors, typography, transitions }
