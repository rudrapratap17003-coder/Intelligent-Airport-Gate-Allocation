import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Compass,
  Building2,
  Plane,
  DoorClosed,
  CheckCircle2,
  AlertTriangle,
  Info,
  Maximize2,
  X,
  ShieldCheck,
  RefreshCw,
  Clock,
  Filter
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useAirport } from '../context/AirportContext'
import blrService from '../lib/blrService'

export const DigitalAirportMap = () => {
  const { selectedTerminal, setSelectedTerminal } = useAirport()
  const [filterTerminal, setFilterTerminal] = useState(selectedTerminal || 'ALL')
  const [stands, setStands] = useState([])
  const [selectedStand, setSelectedStand] = useState(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('SCHEMATIC') // SCHEMATIC or GRID

  useEffect(() => {
    setFilterTerminal(selectedTerminal)
  }, [selectedTerminal])

  const fetchStands = async () => {
    setLoading(true)
    try {
      const data = await blrService.getStands(filterTerminal)
      setStands(data)
      if (selectedStand) {
        const updated = data.find((s) => s.id === selectedStand.id)
        if (updated) setSelectedStand(updated)
      }
    } catch (err) {
      console.error('Failed to load stands for map:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStands()
  }, [filterTerminal])

  const handleTerminalFilterChange = (term) => {
    setFilterTerminal(term)
    setSelectedTerminal(term)
  }

  const getStandColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'available':
        return {
          fill: '#064e3b',
          stroke: '#10b981',
          text: '#34d399',
          border: 'border-emerald-500/40',
          bg: 'bg-emerald-950/40',
          badge: 'bg-emerald-500/20 text-emerald-400'
        }
      case 'occupied':
        return {
          fill: '#1e3a8a',
          stroke: '#3b82f6',
          text: '#60a5fa',
          border: 'border-blue-500/40',
          bg: 'bg-blue-950/40',
          badge: 'bg-blue-500/20 text-blue-400'
        }
      case 'maintenance':
      case 'restricted':
      case 'closed':
        return {
          fill: '#78350f',
          stroke: '#f59e0b',
          text: '#fbbf24',
          border: 'border-amber-500/40',
          bg: 'bg-amber-950/40',
          badge: 'bg-amber-500/20 text-amber-400'
        }
      default:
        return {
          fill: '#1e293b',
          stroke: '#64748b',
          text: '#94a3b8',
          border: 'border-slate-500/40',
          bg: 'bg-slate-900/40',
          badge: 'bg-slate-500/20 text-slate-400'
        }
    }
  }

  const t1Stands = stands.filter((s) => s.terminal === 'T1')
  const t2Stands = stands.filter((s) => s.terminal === 'T2')

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e3a5f]/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-gw-cyan font-bold tracking-wider uppercase">
              Operational Digital Twin
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono">
              BLR AIRPORT MAP
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gw-text tracking-tight">
            Digital Airport Apron & Stand Map
          </h1>
          <p className="text-xs text-gw-text-secondary mt-1">
            Interactive schematic of Kempegowda International Airport Bengaluru runways, aprons, and docking stands.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 bg-[#091524] p-1.5 rounded-xl border border-[#1e3a5f]">
          <span className="text-[11px] text-gw-text-secondary pl-2 font-mono flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          <button
            type="button"
            onClick={() => handleTerminalFilterChange('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterTerminal === 'ALL'
                ? 'bg-gw-cyan text-[#091524]'
                : 'text-gw-text-secondary hover:text-gw-text hover:bg-white/5'
            }`}
          >
            All BLR
          </button>
          <button
            type="button"
            onClick={() => handleTerminalFilterChange('T1')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterTerminal === 'T1'
                ? 'bg-gw-cyan text-[#091524]'
                : 'text-gw-text-secondary hover:text-gw-text hover:bg-white/5'
            }`}
          >
            Terminal 1
          </button>
          <button
            type="button"
            onClick={() => handleTerminalFilterChange('T2')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterTerminal === 'T2'
                ? 'bg-gw-cyan text-[#091524]'
                : 'text-gw-text-secondary hover:text-gw-text hover:bg-white/5'
            }`}
          >
            Terminal 2
          </button>
        </div>
      </div>

      {/* Mandatory Disclaimer */}
      <div className="p-3.5 rounded-xl bg-[#0b1a2f] border border-cyan-800/40 text-xs text-cyan-200/90 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-gw-cyan shrink-0 mt-0.5" />
          <p className="text-[11px] text-gw-text-secondary">
            <span className="font-semibold text-gw-cyan uppercase tracking-wide">
              Illustrative Airport Operations Map — Not to Scale.
            </span>{' '}
            Academic demonstration prototype representing Kempegowda International Airport (BLR). Runway orientations (09L/27R & 09R/27L) and terminal locations represent verified public coordinates; stand layouts are configured for academic simulation.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 font-mono text-[10px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-gw-text-secondary">Available</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-gw-text-secondary">Occupied</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-gw-text-secondary">Restricted / Maint</span>
          </span>
        </div>
      </div>

      {/* Interactive Airport Map Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Map Canvas Area */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="overflow-hidden border border-[#1e3a5f] bg-[#07101e]">
            <CardHeader className="py-3 px-4 border-b border-[#1e3a5f]/60 bg-[#091524] flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-gw-cyan" />
                <span className="text-xs font-bold text-gw-text font-mono uppercase tracking-wider">
                  BLR Apron Operations Schematic
                </span>
              </div>
              <span className="text-[10px] text-gw-cyan font-mono bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                13°11'56" N, 77°42'20" E
              </span>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {/* SVG Schematic Blueprint */}
              <div className="relative w-full aspect-16/10 bg-[#050c18] rounded-xl border border-[#142844] overflow-hidden p-2 sm:p-4 select-none">
                <svg
                  viewBox="0 0 900 520"
                  className="w-full h-full"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#0e233d" strokeWidth="0.5" />
                    </pattern>
                  </defs>

                  {/* Grid Background */}
                  <rect width="900" height="520" fill="url(#grid)" />

                  {/* North Runway (09L/27R) */}
                  <g className="cursor-default">
                    <rect x="50" y="30" width="800" height="32" rx="4" fill="#0f1f33" stroke="#1e3a5f" strokeWidth="1.5" />
                    <line x1="60" y1="46" x2="840" y2="46" stroke="#fbbf24" strokeWidth="2" strokeDasharray="16 12" />
                    <text x="75" y="51" fill="#94a3b8" fontSize="11" fontFamily="monospace" fontWeight="bold">09L</text>
                    <text x="805" y="51" fill="#94a3b8" fontSize="11" fontFamily="monospace" fontWeight="bold">27R</text>
                    <text x="450" y="51" fill="#38bdf8" fontSize="10" fontFamily="monospace" textAnchor="middle">
                      NORTH RUNWAY 09L/27R (4,000m × 45m CAT I)
                    </text>
                  </g>

                  {/* North Taxiway */}
                  <path d="M 120 62 L 120 110 L 780 110 L 780 62" fill="none" stroke="#193557" strokeWidth="4" strokeDasharray="6 4" />

                  {/* Terminal 1 Compound (West) */}
                  {(filterTerminal === 'ALL' || filterTerminal === 'T1') && (
                    <g className="transition-all duration-300">
                      <rect x="70" y="140" width="340" height="200" rx="8" fill="#091b30" stroke="#1e4e7e" strokeWidth="1.5" />
                      <rect x="85" y="155" width="310" height="60" rx="6" fill="#112d4e" stroke="#2563eb" strokeWidth="1" />
                      <text x="240" y="185" fill="#e2e8f0" fontSize="14" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">
                        TERMINAL 1
                      </text>
                      <text x="240" y="202" fill="#38bdf8" fontSize="10" fontFamily="monospace" textAnchor="middle">
                        Dedicated Domestic (IndiGo, Akasa, SpiceJet)
                      </text>

                      {/* T1 Stands (G1, G2, etc.) */}
                      <g>
                        {t1Stands.map((stand, idx) => {
                          const xPos = 110 + idx * 110
                          const yPos = 250
                          const isSelected = selectedStand?.id === stand.id
                          const colors = getStandColor(stand.status)
                          return (
                            <g
                              key={stand.id}
                              onClick={() => setSelectedStand(stand)}
                              className="cursor-pointer group"
                            >
                              {/* Jetway bridge line */}
                              <line x1={xPos + 35} y1="215" x2={xPos + 35} y2={yPos} stroke={colors.stroke} strokeWidth="2.5" />
                              <rect
                                x={xPos}
                                y={yPos}
                                width="70"
                                height="65"
                                rx="6"
                                fill={colors.fill}
                                stroke={isSelected ? '#38bdf8' : colors.stroke}
                                strokeWidth={isSelected ? '3' : '1.5'}
                                className="transition-all hover:scale-105"
                              />
                              <text x={xPos + 35} y={yPos + 22} fill="#ffffff" fontSize="12" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                                {stand.gate_number}
                              </text>
                              <text x={xPos + 35} y={yPos + 38} fill={colors.text} fontSize="9" fontFamily="monospace" textAnchor="middle">
                                {stand.aircraft_category}
                              </text>
                              <text x={xPos + 35} y={yPos + 52} fill="#cbd5e1" fontSize="8" fontFamily="monospace" textAnchor="middle">
                                {stand.status.toUpperCase()}
                              </text>
                            </g>
                          )
                        })}
                      </g>
                    </g>
                  )}

                  {/* Terminal 2 Compound (East) */}
                  {(filterTerminal === 'ALL' || filterTerminal === 'T2') && (
                    <g className="transition-all duration-300">
                      <rect x="470" y="140" width="380" height="200" rx="8" fill="#091b30" stroke="#1e4e7e" strokeWidth="1.5" />
                      <rect x="485" y="155" width="350" height="60" rx="6" fill="#0f343a" stroke="#0d9488" strokeWidth="1" />
                      <text x="660" y="185" fill="#e2e8f0" fontSize="14" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">
                        TERMINAL 2 — "Terminal in a Garden"
                      </text>
                      <text x="660" y="202" fill="#2dd4bf" fontSize="10" fontFamily="monospace" textAnchor="middle">
                        International & Full-Service Domestic (Code E/F)
                      </text>

                      {/* T2 Stands (G3, G4, G5, G6) */}
                      <g>
                        {t2Stands.map((stand, idx) => {
                          const xPos = 500 + idx * 85
                          const yPos = 250
                          const isSelected = selectedStand?.id === stand.id
                          const colors = getStandColor(stand.status)
                          return (
                            <g
                              key={stand.id}
                              onClick={() => setSelectedStand(stand)}
                              className="cursor-pointer group"
                            >
                              {/* Dual or Single Aerobridge */}
                              <line x1={xPos + 30} y1="215" x2={xPos + 30} y2={yPos} stroke={colors.stroke} strokeWidth="2.5" />
                              {stand.aircraft_category === 'Code F' && (
                                <line x1={xPos + 46} y1="215" x2={xPos + 46} y2={yPos} stroke="#c084fc" strokeWidth="2" />
                              )}
                              <rect
                                x={xPos}
                                y={yPos}
                                width="74"
                                height="65"
                                rx="6"
                                fill={colors.fill}
                                stroke={isSelected ? '#38bdf8' : colors.stroke}
                                strokeWidth={isSelected ? '3' : '1.5'}
                                className="transition-all hover:scale-105"
                              />
                              <text x={xPos + 37} y={yPos + 22} fill="#ffffff" fontSize="12" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                                {stand.gate_number}
                              </text>
                              <text x={xPos + 37} y={yPos + 38} fill={colors.text} fontSize="9" fontFamily="monospace" textAnchor="middle">
                                {stand.aircraft_category}
                              </text>
                              <text x={xPos + 37} y={yPos + 52} fill="#cbd5e1" fontSize="8" fontFamily="monospace" textAnchor="middle">
                                {stand.status.toUpperCase()}
                              </text>
                            </g>
                          )
                        })}
                      </g>
                    </g>
                  )}

                  {/* South Runway (09R/27L) */}
                  <g className="cursor-default">
                    <rect x="50" y="440" width="800" height="32" rx="4" fill="#0f1f33" stroke="#1e3a5f" strokeWidth="1.5" />
                    <line x1="60" y1="456" x2="840" y2="456" stroke="#fbbf24" strokeWidth="2" strokeDasharray="16 12" />
                    <text x="75" y="461" fill="#94a3b8" fontSize="11" fontFamily="monospace" fontWeight="bold">09R</text>
                    <text x="805" y="461" fill="#94a3b8" fontSize="11" fontFamily="monospace" fontWeight="bold">27L</text>
                    <text x="450" y="461" fill="#38bdf8" fontSize="10" fontFamily="monospace" textAnchor="middle">
                      SOUTH RUNWAY 09R/27L (4,000m × 45m CAT III-B)
                    </text>
                  </g>

                  {/* South Taxiway */}
                  <path d="M 120 440 L 120 380 L 780 380 L 780 440" fill="none" stroke="#193557" strokeWidth="4" strokeDasharray="6 4" />
                </svg>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-gw-text-secondary">
                <span>Tip: Click on any apron stand box (G1–G6) to view physical specifications and compatibility envelopes.</span>
                <span className="font-mono text-gw-cyan">Click Stand to Inspect</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side Details Drawer: Stand Inspection */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border border-[#1e3a5f]">
            <CardHeader className="py-3 px-4 border-b border-[#1e3a5f]/60 bg-[#091524] flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <DoorClosed className="w-4 h-4 text-gw-cyan" />
                <span>Stand Inspection Telemetry</span>
              </CardTitle>
              {selectedStand && (
                <button
                  type="button"
                  onClick={() => setSelectedStand(null)}
                  className="p-1 rounded text-gw-text-secondary hover:text-gw-text cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </CardHeader>
            <CardContent className="p-4">
              {selectedStand ? (
                <div className="space-y-4 text-xs">
                  {/* Stand Identity Card */}
                  <div className="p-3 rounded-xl bg-[#091524] border border-[#1e3a5f] flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-gw-text-secondary font-mono">STAND CODE</div>
                      <div className="text-lg font-bold text-gw-text font-mono flex items-center gap-2">
                        <span>{selectedStand.gate_number}</span>
                        <span className="text-xs font-normal text-gw-text-secondary">({selectedStand.stand_number})</span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${getStandColor(selectedStand.status).badge}`}>
                      {selectedStand.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Specifications Grid */}
                  <div className="grid grid-cols-2 gap-2 font-mono">
                    <div className="p-2.5 rounded-lg bg-[#07111e] border border-[#142844]">
                      <div className="text-[10px] text-gw-text-secondary">TERMINAL</div>
                      <div className="text-xs font-bold text-gw-text mt-0.5">
                        {selectedStand.terminal === 'T1' ? 'Terminal 1' : 'Terminal 2'}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#07111e] border border-[#142844]">
                      <div className="text-[10px] text-gw-text-secondary">MAX CATEGORY</div>
                      <div className="text-xs font-bold text-gw-cyan mt-0.5">
                        {selectedStand.aircraft_category}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#07111e] border border-[#142844]">
                      <div className="text-[10px] text-gw-text-secondary">MAX WINGSPAN</div>
                      <div className="text-xs font-bold text-gw-text mt-0.5">
                        {selectedStand.max_wingspan_m} meters
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#07111e] border border-[#142844]">
                      <div className="text-[10px] text-gw-text-secondary">BOARDING TYPE</div>
                      <div className="text-xs font-bold text-emerald-400 mt-0.5">
                        {selectedStand.has_jetway ? 'Contact Jetway' : 'Bus Apron'}
                      </div>
                    </div>
                  </div>

                  {/* Compatibility Diagnostic Information */}
                  <div className="p-3 rounded-lg bg-[#07111e] border border-[#142844] space-y-2">
                    <div className="flex items-center gap-1.5 font-semibold text-gw-text text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5 text-gw-cyan" />
                      <span>Operational Compatibility Rules</span>
                    </div>
                    <p className="text-[11px] text-gw-text-secondary leading-relaxed">
                      {selectedStand.terminal === 'T1'
                        ? 'Permits Code C domestic aircraft (A320, B737). International carriers and Code E/F wide-bodies are forbidden by terminal policy.'
                        : selectedStand.aircraft_category === 'Code F'
                        ? 'Configured with dual-level boarding aerobridges for Code F (Airbus A380-800) and Code E wide-body aircraft.'
                        : 'Accommodates Code C through Code E aircraft (up to 65m wingspan, B777, A350, B787).'}
                    </p>
                  </div>

                  {/* Data Tier Tag */}
                  <div className="pt-2 border-t border-[#1e3a5f]/60 flex items-center justify-between text-[10px] text-gw-text-secondary font-mono">
                    <span>DATA TIER:</span>
                    <span className="text-amber-400">CONFIGURABLE DEMONSTRATION</span>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-gw-text-secondary text-xs space-y-2">
                  <DoorClosed className="w-8 h-8 text-gw-text-secondary/50 mx-auto" />
                  <p className="font-semibold text-gw-text">No Stand Selected</p>
                  <p className="text-[11px] text-gw-text-secondary max-w-[220px] mx-auto">
                    Click any stand on the map schematic to inspect its physical constraints, terminal association, and aircraft envelope.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default DigitalAirportMap
