import React from 'react'
import { motion } from 'framer-motion'
import { buttonPressProps } from '../../lib/animations'

const variants = {
  primary: 'bg-gw-cyan text-gw-bg font-semibold hover:bg-[#32d4f5] active:bg-[#1bb8d6] focus:ring-gw-cyan shadow-md shadow-gw-cyan/15 hover:shadow-gw-cyan/25',
  secondary: 'bg-gw-card text-gw-text hover:bg-gw-card-hover border border-[#1e3a5f] hover:border-gw-cyan/40 focus:ring-gw-blue shadow-sm',
  outline: 'bg-transparent border border-gw-cyan/40 text-gw-cyan hover:bg-gw-cyan/10 active:bg-gw-cyan/20 focus:ring-gw-cyan',
  danger: 'bg-gw-error text-white hover:bg-red-600 active:bg-red-700 focus:ring-gw-error shadow-md shadow-red-500/15',
  ghost: 'bg-transparent text-gw-text-secondary hover:text-gw-text hover:bg-white/5 active:bg-white/10 focus:ring-gw-cyan/50'
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-lg min-h-[36px]',
  md: 'px-4 py-2 text-sm rounded-lg min-h-[40px]',
  lg: 'px-5 py-2.5 text-base rounded-xl min-h-[46px]'
}

export const Button = ({
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
      whileHover={!isActionDisabled ? { scale: 1.02 } : undefined}
      onClick={handleClick}
      className={`
        inline-flex items-center justify-center gap-2 transition-all duration-150 font-medium
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gw-bg
        disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none
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
        <Icon className={`${size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} shrink-0`} />
      ) : null}
      <span>{children}</span>
    </motion.button>
  )
}

export default Button
