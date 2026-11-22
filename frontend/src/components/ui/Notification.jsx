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
  success: 'bg-[#1E2638] border-[#334155] text-[#FFFFFF]',
  warning: 'bg-[#1E1E1E] border-[#222E42] text-[#E5E5E5]',
  error: 'bg-[#121826] border-[#334155] text-[#FFFFFF]',
  info: 'bg-[#1E2638] border-[#222E42] text-[#E5E5E5]'
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
      className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-md ${style} ${className}`}
    >
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {title && <h5 className="font-semibold text-sm leading-snug">{title}</h5>}
        {message && <p className="text-xs text-[#A3A3A3] mt-0.5 leading-relaxed">{message}</p>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss notification"
          className="text-[#A3A3A3] hover:text-[#FFFFFF] p-1 rounded-md transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  )
}

export default Notification
