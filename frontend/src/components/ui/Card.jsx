import React from 'react'
import { motion } from 'framer-motion'
import { cardHoverProps } from '../../lib/animations'

export const Card = ({
  children,
  className = '',
  title,
  subtitle,
  action,
  icon: Icon,
  badge,
  interactive = false,
  glass = true,
  glow = false,
  ...props
}) => {
  const Component = interactive ? motion.div : 'div'
  const motionProps = interactive ? cardHoverProps : {}

  const glassClasses = glass
    ? 'bg-[#181818] border border-[#333333]'
    : 'bg-[#181818] border border-[#333333]'

  const glowClasses = 'shadow-[0_2px_8px_rgba(0,0,0,0.4)]'

  return (
    <Component
      className={`rounded-xl p-5 relative transition-all duration-200 ${glassClasses} ${glowClasses} ${
        interactive ? 'cursor-pointer hover:border-[#555555] hover:bg-[#222222]' : 'hover:border-[#444444]'
      } ${className}`}
      {...motionProps}
      {...props}
    >
      {(title || action || Icon || badge) && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[#333333]">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div className="p-2 rounded-lg bg-[#222222] text-[#FFFFFF] border border-[#333333] shrink-0">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {title && <h3 className="gw-card-heading truncate">{title}</h3>}
                {badge}
              </div>
              {subtitle && <p className="gw-caption mt-0.5 truncate">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </Component>
  )
}

export const CardHeader = ({ children, className = '', ...props }) => (
  <div className={`flex items-center justify-between gap-3 pb-3 border-b border-[#333333] mb-4 ${className}`} {...props}>
    {children}
  </div>
)

export const CardTitle = ({ children, className = '', ...props }) => (
  <h3 className={`text-base font-bold text-[#FFFFFF] tracking-tight ${className}`} {...props}>
    {children}
  </h3>
)

export const CardContent = ({ children, className = '', ...props }) => (
  <div className={`space-y-4 ${className}`} {...props}>
    {children}
  </div>
)

export const CardFooter = ({ children, className = '', ...props }) => (
  <div className={`flex items-center justify-end gap-3 pt-3 border-t border-[#333333] mt-4 ${className}`} {...props}>
    {children}
  </div>
)

export default Card
