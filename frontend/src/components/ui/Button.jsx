import React from 'react'
import { motion } from 'framer-motion'
import { buttonPressProps } from '../../lib/animations'

const variants = {
  primary: 'bg-[#FFFFFF] text-[#090909] font-semibold hover:bg-[#E5E5E5] active:bg-[#CCCCCC] focus:ring-white shadow-xs',
  secondary: 'bg-[#222222] text-[#FFFFFF] hover:bg-[#2A2A2A] border border-[#333333] hover:border-[#555555] focus:ring-white shadow-xs',
  outline: 'bg-transparent border border-[#555555] text-[#FFFFFF] hover:bg-[#222222] active:bg-[#2A2A2A] hover:border-[#777777] focus:ring-white',
  danger: 'bg-[#222222] text-[#FFFFFF] border border-[#555555] hover:bg-[#2A2A2A] active:bg-[#333333] focus:ring-white',
  ghost: 'bg-transparent text-[#A3A3A3] hover:text-[#FFFFFF] hover:bg-[#222222] active:bg-[#2A2A2A] focus:ring-white/50'
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
      whileHover={!isActionDisabled ? { scale: 1.01 } : undefined}
      onClick={handleClick}
      className={`
        inline-flex items-center justify-center gap-2 transition-all duration-150 font-medium
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#090909]
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
        <Icon className={`${size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} shrink-0`} />
      ) : null}
      <span>{children}</span>
    </motion.button>
  )
}

export default Button
