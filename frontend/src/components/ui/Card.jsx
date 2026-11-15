import React from 'react'

export const Card = ({
  children,
  className = '',
  title,
  subtitle,
  action,
  icon: Icon,
  badge,
  ...props
}) => {
  return (
    <div
      className={`bg-gw-card border border-[#1e3a5f]/65 rounded-xl p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.35)] relative transition-all duration-200 hover:border-[#24436c] ${className}`}
      {...props}
    >
      {(title || action || Icon || badge) && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[#1e3a5f]/50">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div className="p-2 rounded-lg bg-gw-cyan/10 text-gw-cyan border border-gw-cyan/20 shrink-0">
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
    </div>
  )
}

export default Card
