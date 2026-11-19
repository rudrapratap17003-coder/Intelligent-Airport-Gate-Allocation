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
    ? 'bg-gw-card/85 backdrop-blur-md border border-[#1e3a5f]/70'
    : 'bg-gw-card border border-[#1e3a5f]/65'

  const glowClasses = glow
    ? 'border-gw-cyan/40 shadow-[0_0_20px_-3px_rgba(36,200,232,0.25)]'
    : 'shadow-[0_4px_24px_-2px_rgba(0,0,0,0.4)]'

  return (
    <Component
      className={`rounded-xl p-5 relative transition-all duration-200 ${glassClasses} ${glowClasses} ${
        interactive ? 'cursor-pointer hover:border-gw-cyan/45 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]' : 'hover:border-[#224872]'
      } ${className}`}
      {...motionProps}
      {...props}
    >
      {(title || action || Icon || badge) && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[#1e3a5f]/50">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div className="p-2 rounded-lg bg-gw-cyan/10 text-gw-cyan border border-gw-cyan/25 shrink-0">
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
  <div className={`flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[#1e3a5f]/50 ${className}`} {...props}>
    {children}
  </div>
)

export const CardTitle = ({ children, className = '', ...props }) => (
  <h3 className={`gw-card-heading ${className}`} {...props}>
    {children}
  </h3>
)

export const CardDescription = ({ children, className = '', ...props }) => (
  <p className={`gw-caption mt-0.5 ${className}`} {...props}>
    {children}
  </p>
)

export const CardContent = ({ children, className = '', ...props }) => (
  <div className={className} {...props}>
    {children}
  </div>
)

export default Card
