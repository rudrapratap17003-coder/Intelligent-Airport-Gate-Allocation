import React from 'react'

const badgeVariants = {
  default: 'bg-gw-bg-secondary text-gw-text-secondary border-[#1e3a5f]',
  cyan: 'bg-gw-cyan/10 text-gw-cyan border-gw-cyan/30',
  blue: 'bg-gw-blue/10 text-gw-blue border-gw-blue/30',
  success: 'bg-gw-success/10 text-gw-success border-gw-success/30',
  warning: 'bg-gw-warning/10 text-gw-warning border-gw-warning/30',
  error: 'bg-gw-error/10 text-gw-error border-gw-error/30',
}

const badgeSizes = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-1 text-xs',
}

export const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  icon: Icon,
  dot = false,
  className = '',
  ...props
}) => {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-mono font-medium border
        ${badgeVariants[variant] || badgeVariants.default}
        ${badgeSizes[size] || badgeSizes.md}
        ${className}
      `}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            variant === 'success'
              ? 'bg-gw-success animate-pulse'
              : variant === 'error'
              ? 'bg-gw-error'
              : variant === 'warning'
              ? 'bg-gw-warning'
              : variant === 'cyan'
              ? 'bg-gw-cyan'
              : 'bg-gw-text-secondary'
          }`}
        />
      )}
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      <span>{children}</span>
    </span>
  )
}

export default Badge
