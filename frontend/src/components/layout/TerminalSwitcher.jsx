import React from 'react'
import { Building2, Globe2, Plane } from 'lucide-react'
import { useAirport } from '../../context/AirportContext'

export const TerminalSwitcher = ({ compact = false }) => {
  const { selectedTerminal, setSelectedTerminal } = useAirport()

  const options = [
    { id: 'ALL', label: 'All BLR', icon: Globe2, desc: 'Kempegowda Int\'l' },
    { id: 'T1', label: 'Terminal 1', icon: Plane, desc: 'Domestic (IndiGo, Akasa)' },
    { id: 'T2', label: 'Terminal 2', icon: Building2, desc: 'Int\'l & Full-Service' }
  ]

  return (
    <div
      role="radiogroup"
      aria-label="Select Airport Terminal View"
      className="inline-flex items-center bg-[#0d1e36] p-1 rounded-xl border border-[#1e3a5f]/80 shadow-inner"
    >
      {options.map((opt) => {
        const Icon = opt.icon
        const isSelected = selectedTerminal === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => setSelectedTerminal(opt.id)}
            className={`
              flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer
              ${
                isSelected
                  ? 'bg-gw-cyan text-[#0a1628] font-semibold shadow-xs shadow-gw-cyan/30'
                  : 'text-gw-text-secondary hover:text-gw-text hover:bg-white/5'
              }
            `}
            title={`${opt.label} — ${opt.desc}`}
          >
            <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#0a1628]' : 'text-gw-text-secondary'}`} />
            <span>{opt.label}</span>
            {opt.id === 'T2' && !compact && (
              <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${isSelected ? 'bg-black/20 text-[#0a1628]' : 'bg-[#1e3a5f] text-gw-cyan'}`}>
                Code F
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default TerminalSwitcher
