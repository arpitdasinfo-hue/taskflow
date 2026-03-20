export const MOTION_EASE = [0.22, 1, 0.36, 1]

export const MOTION_TIMINGS = {
  fast: 0.18,
  base: 0.28,
  slow: 0.42,
  ambient: 18,
}

export const MOTION_SPRINGS = {
  soft: { type: 'spring', stiffness: 230, damping: 26, mass: 0.9 },
  gentle: { type: 'spring', stiffness: 170, damping: 24, mass: 1 },
  snappy: { type: 'spring', stiffness: 300, damping: 28, mass: 0.82 },
}

export const createPageVariants = (reduced) => (
  reduced
    ? {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
        exit: { opacity: 1 },
      }
    : {
        initial: { opacity: 0, y: 18, filter: 'blur(10px)' },
        animate: {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          transition: { duration: MOTION_TIMINGS.base, ease: MOTION_EASE },
        },
        exit: {
          opacity: 0,
          y: -12,
          filter: 'blur(8px)',
          transition: { duration: MOTION_TIMINGS.fast, ease: MOTION_EASE },
        },
      }
)

export const createFadeUpVariants = (reduced, distance = 18, delay = 0) => (
  reduced
    ? {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
        exit: { opacity: 1 },
      }
    : {
        initial: { opacity: 0, y: distance },
        animate: {
          opacity: 1,
          y: 0,
          transition: { duration: MOTION_TIMINGS.base, ease: MOTION_EASE, delay },
        },
        exit: {
          opacity: 0,
          y: Math.max(6, Math.round(distance * 0.5)),
          transition: { duration: MOTION_TIMINGS.fast, ease: MOTION_EASE },
        },
      }
)

export const createScaleFadeVariants = (reduced, delay = 0) => (
  reduced
    ? {
        initial: { opacity: 1, scale: 1 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 1, scale: 1 },
      }
    : {
        initial: { opacity: 0, scale: 0.97 },
        animate: {
          opacity: 1,
          scale: 1,
          transition: { duration: MOTION_TIMINGS.base, ease: MOTION_EASE, delay },
        },
        exit: {
          opacity: 0,
          scale: 0.985,
          transition: { duration: MOTION_TIMINGS.fast, ease: MOTION_EASE },
        },
      }
)

export const createStaggerContainer = (reduced, staggerChildren = 0.05, delayChildren = 0) => (
  reduced
    ? {
        initial: {},
        animate: {},
        exit: {},
      }
    : {
        initial: {},
        animate: {
          transition: {
            staggerChildren,
            delayChildren,
          },
        },
        exit: {},
      }
)

export const createDrawerVariants = (reduced, side = 'right') => {
  const axis = side === 'bottom' ? 'y' : 'x'
  const hiddenValue = side === 'bottom' ? 48 : 44

  return reduced
    ? {
        initial: { opacity: 1, [axis]: 0 },
        animate: { opacity: 1, [axis]: 0 },
        exit: { opacity: 1, [axis]: 0 },
      }
    : {
        initial: { opacity: 0, [axis]: hiddenValue },
        animate: {
          opacity: 1,
          [axis]: 0,
          transition: MOTION_SPRINGS.gentle,
        },
        exit: {
          opacity: 0,
          [axis]: hiddenValue,
          transition: { duration: MOTION_TIMINGS.fast, ease: MOTION_EASE },
        },
      }
}

export const createOverlayVariants = (reduced) => (
  reduced
    ? {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
        exit: { opacity: 1 },
      }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: MOTION_TIMINGS.fast, ease: MOTION_EASE } },
        exit: { opacity: 0, transition: { duration: 0.14, ease: MOTION_EASE } },
      }
)

export const createCollapseVariants = (reduced) => (
  reduced
    ? {
        initial: { opacity: 1, height: 'auto' },
        animate: { opacity: 1, height: 'auto' },
        exit: { opacity: 1, height: 'auto' },
      }
    : {
        initial: { opacity: 0, height: 0, y: -10 },
        animate: {
          opacity: 1,
          height: 'auto',
          y: 0,
          transition: {
            height: { duration: MOTION_TIMINGS.base, ease: MOTION_EASE },
            opacity: { duration: MOTION_TIMINGS.base, ease: MOTION_EASE },
            y: { duration: MOTION_TIMINGS.fast, ease: MOTION_EASE },
          },
        },
        exit: {
          opacity: 0,
          height: 0,
          y: -8,
          transition: {
            height: { duration: MOTION_TIMINGS.fast, ease: MOTION_EASE },
            opacity: { duration: MOTION_TIMINGS.fast, ease: MOTION_EASE },
            y: { duration: MOTION_TIMINGS.fast, ease: MOTION_EASE },
          },
        },
      }
)
