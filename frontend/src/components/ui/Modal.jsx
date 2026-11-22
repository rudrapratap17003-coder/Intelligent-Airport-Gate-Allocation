import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { modalOverlayVariants, modalDialogVariants } from '../../lib/animations'

export const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'max-w-lg',
  icon: Icon,
}) => {
  const modalRef = useRef(null)
  const previousActiveElement = useRef(null)

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement
      document.body.style.overflow = 'hidden'

      const timer = setTimeout(() => {
        if (modalRef.current) {
          const focusable = modalRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
          if (focusable.length > 0) {
            focusable[0].focus()
          }
        }
      }, 50)

      return () => clearTimeout(timer)
    } else {
      document.body.style.overflow = 'unset'
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus()
      }
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return

      if (e.key === 'Escape') {
        e.preventDefault()
        onClose?.()
        return
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return

        const firstElement = focusable[0]
        const lastElement = focusable[focusable.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          aria-describedby={subtitle ? 'modal-subtitle' : undefined}
        >
          {/* Backdrop */}
          <motion.div
            variants={modalOverlayVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Dialog Container */}
          <motion.div
            ref={modalRef}
            variants={modalDialogVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={`relative w-full ${maxWidth} bg-[#121826] border border-[#222E42] rounded-2xl shadow-2xl z-10 overflow-hidden flex flex-col max-h-[88vh] my-auto`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#222E42] bg-[#0D121F] shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {Icon && (
                  <div className="p-2 rounded-xl bg-[#1E283D] border border-[#26354D] text-[#38BDF8] shrink-0" aria-hidden="true">
                    <Icon className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0">
                  {title && (
                    <h3 id="modal-title" className="text-base sm:text-lg font-bold text-[#F8FAFC] truncate">
                      {title}
                    </h3>
                  )}
                  {subtitle && (
                    <p id="modal-subtitle" className="text-xs text-[#94A3B8] mt-0.5 truncate">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="text-[#94A3B8] hover:text-[#F8FAFC] p-1.5 rounded-lg hover:bg-[#1E283D] border border-transparent hover:border-[#222E42] transition-all cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 text-[#F8FAFC]">{children}</div>

            {/* Footer */}
            {footer && (
              <div className="flex items-center justify-end gap-3 px-5 sm:px-6 py-3.5 border-t border-[#222E42] bg-[#0D121F]/80 shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default Modal
