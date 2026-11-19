import React from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react'
import { toastVariants } from '../../lib/animations'

const icons = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info
}

const styles = {
  success: 'bg-gw-success/15 border-gw-success/35 text-gw-success',
  warning: 'bg-gw-warning/15 border-gw-warning/35 text-gw-warning',
  error: 'bg-gw-error/15 border-gw-error/35 text-gw-error',
  info: 'bg-gw-cyan/15 border-gw-cyan/35 text-gw-cyan'
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
    <motion.div
      variants={toastVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      role="status"
      aria-live="polite"
      className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-lg ${style} ${className}`}
    >
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {title && <h5 className="font-semibold text-sm leading-snug">{title}</h5>}
        {message && <p className="text-xs text-gw-text mt-0.5 leading-relaxed">{message}</p>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss notification"
          className="text-gw-text-secondary hover:text-gw-text p-1 rounded-md transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  )
}

export default Notification
