import React, { useEffect } from 'react'
import { X } from 'lucide-react'

export const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'max-w-lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose?.()
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Dialog container */}
      <div
        className={`relative w-full ${maxWidth} bg-gw-card border border-[#1e3a5f] rounded-2xl shadow-2xl z-10 overflow-hidden flex flex-col max-h-[90vh]`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e3a5f]/60 bg-gw-bg-secondary/50">
          <div>
            {title && <h3 className="text-lg font-semibold text-gw-text">{title}</h3>}
            {subtitle && <p className="text-xs text-gw-text-secondary mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gw-text-secondary hover:text-gw-text p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#1e3a5f]/60 bg-gw-bg-secondary/30">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export default Modal
