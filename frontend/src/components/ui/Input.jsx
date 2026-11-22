import React, { useId } from 'react'

export const Input = ({
  label,
  error,
  helperText,
  icon: Icon,
  className = '',
  id,
  type = 'text',
  ...props
}) => {
  const reactGeneratedId = useId()
  const inputId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]+/g, '-') : `input-${reactGeneratedId}`)
  const errorId = error ? `${inputId}-error` : undefined
  const helperId = !error && helperText ? `${inputId}-helper` : undefined
  const describedBy = errorId || helperId || undefined

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <div className="relative rounded-lg shadow-xs">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]" aria-hidden="true">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          id={inputId}
          type={type}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`
            w-full bg-[#0D121F] text-[#F8FAFC] text-sm rounded-lg border px-3.5 py-2.5 transition-all outline-none
            placeholder:text-[#64748B] min-h-[42px]
            ${Icon ? 'pl-9' : ''}
            ${error
              ? 'border-red-500/80 focus:ring-1 focus:ring-red-500/40 focus:border-red-500'
              : 'border-[#222E42] focus:border-[#38BDF8] focus:ring-1 focus:ring-sky-400/30'
            }
          `}
          {...props}
        />
      </div>
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-red-400 font-medium">{error}</p>
      ) : helperText ? (
        <p id={helperId} className="mt-1.5 text-xs text-[#94A3B8]">{helperText}</p>
      ) : null}
    </div>
  )
}

export default Input
