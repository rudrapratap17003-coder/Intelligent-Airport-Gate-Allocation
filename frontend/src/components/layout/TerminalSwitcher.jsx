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
      className="inline-flex items-center bg-[#121826] p-1 rounded-xl border border-[#222E42]"
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
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
              ${
                isSelected
                  ? 'bg-sky-500 text-slate-950 font-semibold shadow-xs'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E2638]'
              }
            `}
            title={`${opt.label} — ${opt.desc}`}
          >
            <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-950' : 'text-sky-400'}`} />
            <span>{opt.label}</span>
            {opt.id === 'T2' && !compact && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${isSelected ? 'bg-sky-600/30 text-slate-950' : 'bg-[#1E2638] text-sky-300 border border-[#222E42]'}`}>
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
