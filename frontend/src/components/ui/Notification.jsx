import React from 'react'
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react'

const icons = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info
}

const styles = {
  success: 'bg-gw-success/10 border-gw-success/30 text-gw-success',
  warning: 'bg-gw-warning/10 border-gw-warning/30 text-gw-warning',
  error: 'bg-gw-error/10 border-gw-error/30 text-gw-error',
  info: 'bg-gw-cyan/10 border-gw-cyan/30 text-gw-cyan'
}

export const Notification = ({
  type = 'info',
  title,
  message,
  onClose,
  className = ''
}) => {
  const Icon = icons[type] || icons.info
  const style = styles[type] || styles.info

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur-sm ${style} ${className}`}>
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {title && <h5 className="font-semibold text-sm leading-snug">{title}</h5>}
        {message && <p className="text-xs text-gw-text mt-0.5 leading-relaxed">{message}</p>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-gw-text-secondary hover:text-gw-text p-1 rounded-md transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

export default Notification
