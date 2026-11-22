import React from 'react'
import { motion } from 'framer-motion'
import { buttonPressProps } from '../../lib/animations'

const variants = {
  primary: 'bg-[#0284C7] text-[#FFFFFF] font-semibold hover:bg-[#0369A1] active:bg-[#075985] focus-visible:ring-2 focus-visible:ring-sky-400 border border-[#38BDF8]/40 shadow-sm',
  secondary: 'bg-[#162032] text-[#F8FAFC] hover:bg-[#1E293B] border border-[#222E42] hover:border-[#38BDF8]/50 focus-visible:ring-2 focus-visible:ring-sky-400 shadow-sm',
  outline: 'bg-transparent border border-[#222E42] text-[#F8FAFC] hover:bg-[#162032] active:bg-[#1E293B] hover:border-[#38BDF8]/60 focus-visible:ring-2 focus-visible:ring-sky-400',
  danger: 'bg-[#2D1217] text-[#F87171] border border-[#7F1D1D] hover:bg-[#3D181F] active:bg-[#4C1D24] focus-visible:ring-2 focus-visible:ring-red-400',
  ghost: 'bg-transparent text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#162032] active:bg-[#1E293B] focus-visible:ring-2 focus-visible:ring-sky-400/50'
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-lg min-h-[36px]',
  md: 'px-4 py-2 text-sm rounded-lg min-h-[40px]',
  lg: 'px-5 py-2.5 text-base rounded-xl min-h-[46px]'
}

const ButtonComponent = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  icon: Icon,
  type = 'button',
  onClick,
  ...props
}) => {
  const isActionDisabled = disabled || loading

  const handleClick = (e) => {
    if (isActionDisabled) {
      e.preventDefault()
      return
    }
    onClick?.(e)
  }

  return (
    <motion.button
      type={type}
      disabled={isActionDisabled}
      aria-busy={loading ? 'true' : 'false'}
      whileTap={!isActionDisabled ? buttonPressProps.whileTap : undefined}
      whileHover={!isActionDisabled ? { scale: 1.01 } : undefined}
      onClick={handleClick}
      className={`
        inline-flex items-center justify-center gap-2 transition-all duration-150 font-medium
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080B11]
        disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer select-none
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <span
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0"
          aria-hidden="true"
        />
      ) : Icon ? (
        <Icon className={`${size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} shrink-0`} aria-hidden="true" />
      ) : null}
      <span>{children}</span>
    </motion.button>
  )
}

export const Button = React.memo(ButtonComponent)
export default Button
