import React from 'react'
import Button from './Button'

export const EmptyState = ({
  icon: Icon,
  title = 'No records found',
  description = 'There is currently no data available for this view.',
  actionLabel,
  onAction,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl bg-[#181818] border border-[#333333] ${className}`}>
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-[#222222] border border-[#333333] flex items-center justify-center text-[#FFFFFF] mb-4">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h4 className="text-base font-semibold text-[#FFFFFF] tracking-tight mb-1">
        {title}
      </h4>
      <p className="text-xs text-[#A3A3A3] max-w-sm leading-relaxed mb-5">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

export default EmptyState
