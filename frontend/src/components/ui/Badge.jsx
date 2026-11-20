import React from 'react'

const badgeVariants = {
  default: 'bg-[#222222] text-[#A3A3A3] border-[#333333]',
  gold: 'bg-[#2A2A2A] text-[#FFFFFF] border-[#555555]',
  cyan: 'bg-[#2A2A2A] text-[#FFFFFF] border-[#555555]',
  blue: 'bg-[#222222] text-[#E5E5E5] border-[#444444]',
  success: 'bg-[#222222] text-[#FFFFFF] border-[#555555]',
  warning: 'bg-[#181818] text-[#A3A3A3] border-[#333333]',
  error: 'bg-[#181818] text-[#E5E5E5] border-[#555555]',
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
          className="w-1.5 h-1.5 rounded-full bg-[#FFFFFF]"
        />
      )}
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      <span>{children}</span>
    </span>
  )
}

export default Badge
