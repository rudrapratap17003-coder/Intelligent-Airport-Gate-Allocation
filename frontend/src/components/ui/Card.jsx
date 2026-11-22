import React from 'react'
import { motion } from 'framer-motion'
import { cardHoverProps } from '../../lib/animations'

const CardComponent = ({
  children,
  className = '',
  title,
  subtitle,
  action,
  icon: Icon,
  badge,
  interactive = false,
  glass = true,
  _glow = false,
  ...props
}) => {
  const Component = interactive ? motion.div : 'div'
  const motionProps = interactive ? cardHoverProps : {}

  const glassClasses = glass
    ? 'bg-[#121826] border border-[#222E42]'
    : 'bg-[#121826] border border-[#222E42]'

  const glowClasses = 'shadow-[0_4px_16px_rgba(0,0,0,0.4)]'

  return (
    <Component
      className={`rounded-xl p-5 relative transition-all duration-200 ${glassClasses} ${glowClasses} ${
        interactive ? 'cursor-pointer hover:border-[#38BDF8]/60 hover:bg-[#1A2337]' : 'hover:border-[#2C3B54]'
      } ${className}`}
      {...motionProps}
      {...props}
    >
      {(title || action || Icon || badge) && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[#222E42]">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div className="p-2 rounded-lg bg-[#1E283D] text-[#38BDF8] border border-[#2A3B59] shrink-0" aria-hidden="true">
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

export const Card = React.memo(CardComponent)

export const CardHeader = ({ children, className = '', ...props }) => (
  <div className={`mb-4 pb-3 border-b border-[#222E42] ${className}`} {...props}>
    {children}
  </div>
)

export const CardTitle = ({ children, className = '', ...props }) => (
  <h3 className={`gw-card-heading ${className}`} {...props}>
    {children}
  </h3>
)

export const CardDescription = ({ children, className = '', ...props }) => (
  <p className={`gw-caption mt-1 ${className}`} {...props}>
    {children}
  </p>
)

export const CardContent = ({ children, className = '', ...props }) => (
  <div className={`space-y-4 ${className}`} {...props}>
    {children}
  </div>
)

export const CardFooter = ({ children, className = '', ...props }) => (
  <div className={`flex items-center justify-end gap-3 pt-3 border-t border-[#222E42] mt-4 ${className}`} {...props}>
    {children}
  </div>
)

export default Card
