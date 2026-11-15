import React, { useState, useRef, useEffect } from 'react'
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
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-medium text-gw-text-secondary uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between gap-2 bg-gw-bg-secondary text-left text-sm rounded-lg border px-3.5 py-2.5 transition-all outline-none cursor-pointer
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#2a4d7d]'}
          ${isOpen ? 'border-gw-cyan ring-1 ring-gw-cyan' : 'border-[#1e3a5f]'}
          ${selectedOption ? 'text-gw-text' : 'text-gw-text-secondary/60'}
        `}
      >
        <div className="flex items-center gap-2 truncate">
          {Icon && <Icon className="w-4 h-4 text-gw-text-secondary shrink-0" />}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gw-text-secondary transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-gw-cyan' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 z-40 bg-gw-card border border-[#1e3a5f] rounded-xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto backdrop-blur-md">
          {options.length === 0 ? (
            <div className="px-3.5 py-2 text-xs text-gw-text-secondary">No choices available</div>
          ) : (
            options.map((option) => {
              const isSelected = option.value === value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange?.(option.value)
                    setIsOpen(false)
                  }}
                  className={`
                    w-full flex items-center justify-between px-3.5 py-2 text-sm text-left transition-colors cursor-pointer
                    ${isSelected ? 'bg-gw-cyan/15 text-gw-cyan font-medium' : 'text-gw-text hover:bg-white/5'}
                  `}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && <Check className="w-4 h-4 shrink-0 text-gw-cyan ml-2" />}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

export default Dropdown
