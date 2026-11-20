import React, { createContext, useContext, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react'
import { toastVariants } from '../lib/animations'

const ToastContext = createContext(null)

const icons = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info
}

const styles = {
  success: 'bg-[#181818] border-[#555555] text-[#FFFFFF] shadow-xl',
  warning: 'bg-[#181818] border-[#333333] text-[#E5E5E5] shadow-xl',
  error: 'bg-[#181818] border-[#555555] text-[#FFFFFF] shadow-xl',
  info: 'bg-[#181818] border-[#333333] text-[#FFFFFF] shadow-xl'
}

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 6)
    const newToast = { id, type, title, message }

    setToasts((prev) => [...prev, newToast])

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
    return id
  }, [removeToast])

  const success = useCallback((title, message, duration = 4000) => {
    return showToast({ type: 'success', title, message, duration })
  }, [showToast])

  const error = useCallback((title, message, duration = 6000) => {
    return showToast({ type: 'error', title, message, duration })
  }, [showToast])

  const warning = useCallback((title, message, duration = 5000) => {
    return showToast({ type: 'warning', title, message, duration })
  }, [showToast])

  const info = useCallback((title, message, duration = 4000) => {
    return showToast({ type: 'info', title, message, duration })
  }, [showToast])

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info, removeToast }}>
      {children}

      {/* Global Toast Container */}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map((toast) => {
            const Icon = icons[toast.type] || icons.info
            const style = styles[toast.type] || styles.info

            return (
              <motion.div
                key={toast.id}
                variants={toastVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                layout
                className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md ${style}`}
              >
                <Icon className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  {toast.title && (
                    <h5 className="font-semibold text-sm leading-snug">{toast.title}</h5>
                  )}
                  {toast.message && (
                    <p className="text-xs text-[#A3A3A3] mt-0.5 leading-relaxed">{toast.message}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  aria-label="Dismiss toast"
                  className="text-[#A3A3A3] hover:text-[#FFFFFF] p-1 rounded-md transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export default ToastContext
