import React from 'react'

const variants = {
  primary: 'bg-gw-cyan text-gw-bg font-semibold hover:bg-[#32d4f5] active:bg-[#1bb8d6] focus:ring-gw-cyan shadow-sm',
  secondary: 'bg-gw-card text-gw-text hover:bg-gw-card-hover border border-[#1e3a5f] focus:ring-gw-blue shadow-sm',
  outline: 'bg-transparent border border-gw-cyan/40 text-gw-cyan hover:bg-gw-cyan/10 active:bg-gw-cyan/20 focus:ring-gw-cyan',
  danger: 'bg-gw-error text-white hover:bg-red-600 active:bg-red-700 focus:ring-gw-error shadow-sm',
  ghost: 'bg-transparent text-gw-text-secondary hover:text-gw-text hover:bg-white/5 active:bg-white/10 focus:ring-gw-cyan/50'
}

const sizes = {
  sm: 'px-2.5 py-1.5 text-xs rounded-md',
  md: 'px-3.5 py-2 text-sm rounded-lg',
  lg: 'px-5 py-2.5 text-base rounded-lg'
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
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`
        inline-flex items-center justify-center gap-2 transition-all duration-150 font-medium
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gw-bg
        disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : Icon ? (
        <Icon className={`${size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} shrink-0`} />
      ) : null}
      <span>{children}</span>
    </button>
  )
}

export default Button
