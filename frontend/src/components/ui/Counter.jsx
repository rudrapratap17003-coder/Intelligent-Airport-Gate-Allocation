import React, { useEffect, useState, useRef } from 'react'

/**
 * Animated number counter component for aviation metrics.
 * Transitions smoothly from 0 or previous value to target value.
 */
export const Counter = ({ value = 0, duration = 800, prefix = '', suffix = '', className = '' }) => {
  const [displayValue, setDisplayValue] = useState(0)
  const prevValueRef = useRef(0)

  useEffect(() => {
    const target = Number(value) || 0
    let startTimestamp = null
    const startValue = prevValueRef.current

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / duration, 1)
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      const current = Math.floor(startValue + (target - startValue) * easeProgress)
      setDisplayValue(current)

      if (progress < 1) {
        requestAnimationFrame(step)
      } else {
        setDisplayValue(target)
        prevValueRef.current = target
      }
    }

    const animId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animId)
  }, [value, duration])

  return (
    <span className={`tabular-nums font-mono ${className}`}>
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  )
}

export default Counter
