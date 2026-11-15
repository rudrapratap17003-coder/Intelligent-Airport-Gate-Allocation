import React from 'react'

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
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-gw-text-secondary uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <div className="relative rounded-lg shadow-sm">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gw-text-secondary">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          id={inputId}
          type={type}
          className={`
            w-full bg-gw-bg-secondary text-gw-text text-sm rounded-lg border px-3.5 py-2 transition-all outline-none
            placeholder:text-gw-text-secondary/50
            ${Icon ? 'pl-9' : ''}
            ${error ? 'border-gw-error focus:ring-1 focus:ring-gw-error' : 'border-[#1e3a5f] focus:border-gw-cyan focus:ring-1 focus:ring-gw-cyan'}
          `}
          {...props}
        />
      </div>
      {error ? (
        <p className="mt-1 text-xs text-gw-error">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-gw-text-secondary">{helperText}</p>
      ) : null}
    </div>
  )
}

export default Input
