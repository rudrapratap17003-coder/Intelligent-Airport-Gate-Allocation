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
  success: 'bg-[#0f2a24]/90 border-gw-success/40 text-gw-success shadow-[0_8px_30px_rgba(34,197,94,0.15)]',
  warning: 'bg-[#2b2210]/90 border-gw-warning/40 text-gw-warning shadow-[0_8px_30px_rgba(245,158,11,0.15)]',
  error: 'bg-[#2d1214]/90 border-gw-error/40 text-gw-error shadow-[0_8px_30px_rgba(239,68,68,0.15)]',
  info: 'bg-[#0c2236]/90 border-gw-cyan/40 text-gw-cyan shadow-[0_8px_30px_rgba(36,200,232,0.15)]'
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

      {/* Floating Top-Right Toast Container */}
      <div
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-2"
        aria-live="polite"
        aria-atomic="true"
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
                className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl ${style}`}
              >
                <Icon className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  {toast.title && <h5 className="font-semibold text-sm leading-snug">{toast.title}</h5>}
                  {toast.message && <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">{toast.message}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  aria-label="Dismiss alert"
                  className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer shrink-0"
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

export default ToastProvider
