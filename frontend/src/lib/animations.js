/**
 * GateWise — Centralized Animation Architecture
 * Standardized Framer Motion variants, easings, and duration tokens.
 * Enforces hardware-accelerated transforms (opacity, transform) and prefers-reduced-motion.
 */

// Master timing tokens (180ms - 260ms standard per design specification)
export const DURATION = {
  instant: 0.1,
  fast: 0.15,
  normal: 0.22,
  gentle: 0.28,
}

// Aviation cockpit precision easing curve
export const EASING = {
  // Smooth deceleration curve for natural organic entrance
  outExpo: [0.16, 1, 0.3, 1],
  // Standard UI ease for balanced transition
  standard: [0.2, 0, 0, 1],
  // Snappy feedback for micro-interactions
  spring: { type: 'spring', damping: 25, stiffness: 350 },
}

/**
 * 1. Global Page Transition Preset
 * Target: 180–260 ms subtle fade with restrained vertical movement (4px)
 */
export const pageVariants = {
  initial: {
    opacity: 0,
    y: 4,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.normal,
      ease: EASING.outExpo,
    },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: {
      duration: DURATION.fast,
      ease: EASING.standard,
    },
  },
}

/**
 * 2. Fade In / Out Presets
 */
export const fadeIn = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: DURATION.normal, ease: EASING.standard },
  },
  exit: {
    opacity: 0,
    transition: { duration: DURATION.fast, ease: EASING.standard },
  },
}

/**
 * 3. Modal & Dialog Entry/Exit Presets
 */
export const modalOverlayVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: DURATION.normal, ease: EASING.standard },
  },
  exit: {
    opacity: 0,
    transition: { duration: DURATION.fast, ease: EASING.standard },
  },
}

export const modalDialogVariants = {
  initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: DURATION.gentle, ease: EASING.outExpo },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 6,
    transition: { duration: DURATION.fast, ease: EASING.standard },
  },
}

/**
 * 4. Staggered Container & Child Presets
 */
export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
}

export const staggerItem = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.normal, ease: EASING.outExpo },
  },
}

/**
 * 5. Card Hover & Press Micro-interactions
 */
export const cardHoverProps = {
  whileHover: { y: -2, transition: { duration: DURATION.fast, ease: EASING.standard } },
  whileTap: { scale: 0.99, transition: { duration: DURATION.instant } },
}

/**
 * 6. Interactive Icon Pop Micro-interaction
 */
export const iconPopProps = {
  whileHover: { scale: 1.12, transition: { duration: DURATION.fast, ease: EASING.spring } },
  whileTap: { scale: 0.92, transition: { duration: DURATION.instant } },
}

/**
 * 7. Button Press Feedback Props
 */
export const buttonPressProps = {
  whileTap: { scale: 0.98, transition: { duration: DURATION.instant } },
}

/**
 * 8. Toast / Notification Entry Preset
 */
export const toastVariants = {
  initial: { opacity: 0, y: -10, scale: 0.95 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: DURATION.normal, ease: EASING.outExpo },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -6,
    transition: { duration: DURATION.fast, ease: EASING.standard },
  },
}
