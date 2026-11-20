import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'

export const Dropdown = ({
  options = [],
  value,
  onChange,
  placeholder = 'Select an option...',
  label,
  icon: Icon,
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  const selectedOption = options.find((opt) => opt.value === value)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between gap-2 bg-[#181818] text-left text-sm rounded-lg border px-3.5 py-2.5 transition-all outline-none cursor-pointer min-h-[42px]
          ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-[#555555]'}
          ${isOpen ? 'border-[#777777] ring-1 ring-white/20' : 'border-[#333333]'}
          ${selectedOption ? 'text-[#FFFFFF] font-medium' : 'text-[#737373]'}
        `}
      >
        <div className="flex items-center gap-2 truncate">
          {Icon && <Icon className="w-4 h-4 text-[#A3A3A3] shrink-0" />}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-[#A3A3A3] transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-[#FFFFFF]' : ''}`} />
      </button>

      {/* Animated Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 mt-1.5 bg-[#222222] border border-[#333333] rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto py-1"
            role="listbox"
          >
            {options.map((opt) => {
              const isSelected = opt.value === value
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange?.(opt.value)
                    setIsOpen(false)
                  }}
                  className={`
                    w-full flex items-center justify-between px-3.5 py-2 text-xs text-left transition-colors cursor-pointer
                    ${isSelected ? 'bg-[#383838] text-[#FFFFFF] font-semibold' : 'text-[#E5E5E5] hover:bg-[#2A2A2A] hover:text-[#FFFFFF]'}
                  `}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#FFFFFF] shrink-0" />}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Dropdown
