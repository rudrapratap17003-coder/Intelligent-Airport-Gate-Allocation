import React from 'react'

const badgeVariants = {
  default: 'bg-[#162032] text-[#94A3B8] border-[#22314A]',
  cyan: 'bg-[#0E283E] text-[#38BDF8] border-[#164E63]',
  blue: 'bg-[#112240] text-[#60A5FA] border-[#1D3D6F]',
  success: 'bg-[#0D281E] text-[#34D399] border-[#065F46]',
  warning: 'bg-[#2E200B] text-[#FBBF24] border-[#78350F]',
  error: 'bg-[#2D1217] text-[#F87171] border-[#7F1D1D]',
  danger: 'bg-[#2D1217] text-[#F87171] border-[#7F1D1D]',
  gold: 'bg-[#251F14] text-[#FDE047] border-[#713F12]',
  outline: 'bg-transparent text-[#94A3B8] border-[#222E42]',
}

const badgeSizes = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
}

const BadgeComponent = ({
  children,
  variant = 'default',
  size = 'md',
  icon: Icon,
  dot = false,
  className = '',
  ...props
}) => {
  const dotColor =
    variant === 'success' ? 'bg-[#10B981]' :
    variant === 'error' || variant === 'danger' ? 'bg-[#EF4444]' :
    variant === 'warning' ? 'bg-[#F59E0B]' :
    variant === 'cyan' || variant === 'blue' ? 'bg-[#38BDF8]' :
    'bg-[#94A3B8]'

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
          className={`w-1.5 h-1.5 rounded-full ${dotColor}`}
          aria-hidden="true"
        />
      )}
      {Icon && <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />}
      <span>{children}</span>
    </span>
  )
}

export const Badge = React.memo(BadgeComponent)
export default Badge
