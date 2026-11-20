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
import TerminalSwitcher from '../components/layout/TerminalSwitcher'

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
          fill: '#222222',
          stroke: '#444444',
          text: '#FFFFFF',
          border: 'border-[#444444]',
          bg: 'bg-[#222222]',
          badge: 'bg-[#222222] text-[#FFFFFF] border border-[#444444]'
        }
      case 'occupied':
        return {
          fill: '#383838',
          stroke: '#FFFFFF',
          text: '#FFFFFF',
          border: 'border-[#FFFFFF]',
          bg: 'bg-[#383838]',
          badge: 'bg-[#FFFFFF] text-[#090909]'
        }
      case 'maintenance':
      case 'restricted':
      case 'closed':
        return {
          fill: '#111111',
          stroke: '#555555',
          text: '#A3A3A3',
          border: 'border-[#555555]',
          bg: 'bg-[#111111]',
          badge: 'bg-[#111111] text-[#A3A3A3] border border-[#555555]'
        }
      default:
        return {
          fill: '#181818',
          stroke: '#333333',
          text: '#737373',
          border: 'border-[#333333]',
          bg: 'bg-[#181818]',
          badge: 'bg-[#181818] text-[#737373] border border-[#333333]'
        }
    }
  }

  const t1Stands = stands.filter((s) => s.terminal === 'T1')
  const t2Stands = stands.filter((s) => s.terminal === 'T2')

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#333333]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-[#A3A3A3] font-bold tracking-wider uppercase">
              Operational Digital Twin
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#222222] border border-[#333333] text-[#FFFFFF] font-mono">
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

        {/* Terminal Switcher */}
        <div className="flex items-center">
          <TerminalSwitcher />
        </div>
      </div>

      {/* Mandatory Disclaimer */}
      <div className="p-3.5 rounded-xl bg-[#181818] border border-[#333333] text-xs flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-[#FFFFFF] shrink-0 mt-0.5" />
          <p className="text-[11px] text-gw-text-secondary">
            <span className="font-semibold text-[#FFFFFF] uppercase tracking-wide">
              Illustrative Airport Operations Map — Not to Scale.
            </span>{' '}
            Academic demonstration prototype representing Kempegowda International Airport (BLR). Runway orientations (09L/27R & 09R/27L) and terminal locations represent verified public coordinates; stand layouts are configured for academic simulation.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 font-mono text-[10px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#444444]" />
            <span className="text-gw-text-secondary">Available</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFFFFF]" />
            <span className="text-gw-text-secondary">Occupied</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#111111] border border-[#555555]" />
            <span className="text-gw-text-secondary">Restricted / Maint</span>
          </span>
        </div>
      </div>

      {/* Interactive Airport Map Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Map Canvas Area */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="overflow-hidden border border-[#333333] bg-[#111111]">
            <CardHeader className="py-3 px-4 border-b border-[#333333] bg-[#181818] flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#FFFFFF]" />
                <span className="text-xs font-bold text-gw-text font-mono uppercase tracking-wider">
                  BLR Apron Operations Schematic
                </span>
              </div>
              <span className="text-[10px] text-[#FFFFFF] font-mono bg-[#222222] px-2 py-0.5 rounded border border-[#333333]">
                13°11'56" N, 77°42'20" E
              </span>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {/* SVG Schematic Blueprint */}
              <div className="relative w-full aspect-16/10 bg-[#0d0d0d] rounded-xl border border-[#333333] overflow-hidden p-2 sm:p-4 select-none">
                <svg
                  viewBox="0 0 900 520"
                  className="w-full h-full"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1c1c1c" strokeWidth="0.5" />
                    </pattern>
                  </defs>

                  {/* Grid Background */}
                  <rect width="900" height="520" fill="url(#grid)" />

                  {/* North Runway (09L/27R) */}
                  <g className="cursor-default">
                    <rect x="50" y="30" width="800" height="32" rx="4" fill="#181818" stroke="#333333" strokeWidth="1.5" />
                    <line x1="60" y1="46" x2="840" y2="46" stroke="#888888" strokeWidth="2" strokeDasharray="16 12" />
                    <text x="75" y="51" fill="#A3A3A3" fontSize="11" fontFamily="monospace" fontWeight="bold">09L</text>
                    <text x="805" y="51" fill="#A3A3A3" fontSize="11" fontFamily="monospace" fontWeight="bold">27R</text>
                    <text x="450" y="51" fill="#FFFFFF" fontSize="10" fontFamily="monospace" textAnchor="middle">
                      NORTH RUNWAY 09L/27R (4,000m × 45m CAT I)
                    </text>
                  </g>

                  {/* North Taxiway */}
                  <path d="M 120 62 L 120 110 L 780 110 L 780 62" fill="none" stroke="#2a2a2a" strokeWidth="4" strokeDasharray="6 4" />

                  {/* Terminal 1 Compound (West) */}
                  {(filterTerminal === 'ALL' || filterTerminal === 'T1') && (
                    <g className="transition-all duration-300">
                      <rect x="70" y="140" width="340" height="200" rx="8" fill="#141414" stroke="#333333" strokeWidth="1.5" />
                      <rect x="85" y="155" width="310" height="60" rx="6" fill="#181818" stroke="#444444" strokeWidth="1" />
                      <text x="240" y="185" fill="#FFFFFF" fontSize="14" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">
                        TERMINAL 1
                      </text>
                      <text x="240" y="202" fill="#A3A3A3" fontSize="10" fontFamily="monospace" textAnchor="middle">
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
                                stroke={isSelected ? '#FFFFFF' : colors.stroke}
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
                      <rect x="470" y="140" width="380" height="200" rx="8" fill="#141414" stroke="#333333" strokeWidth="1.5" />
                      <rect x="485" y="155" width="350" height="60" rx="6" fill="#181818" stroke="#444444" strokeWidth="1" />
                      <text x="660" y="185" fill="#FFFFFF" fontSize="14" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">
                        TERMINAL 2 — "Terminal in a Garden"
                      </text>
                      <text x="660" y="202" fill="#A3A3A3" fontSize="10" fontFamily="monospace" textAnchor="middle">
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
                                <line x1={xPos + 46} y1="215" x2={xPos + 46} y2={yPos} stroke="#666666" strokeWidth="2" />
                              )}
                              <rect
                                x={xPos}
                                y={yPos}
                                width="74"
                                height="65"
                                rx="6"
                                fill={colors.fill}
                                stroke={isSelected ? '#FFFFFF' : colors.stroke}
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
                    <rect x="50" y="440" width="800" height="32" rx="4" fill="#181818" stroke="#333333" strokeWidth="1.5" />
                    <line x1="60" y1="456" x2="840" y2="456" stroke="#888888" strokeWidth="2" strokeDasharray="16 12" />
                    <text x="75" y="461" fill="#A3A3A3" fontSize="11" fontFamily="monospace" fontWeight="bold">09R</text>
                    <text x="805" y="461" fill="#A3A3A3" fontSize="11" fontFamily="monospace" fontWeight="bold">27L</text>
                    <text x="450" y="461" fill="#FFFFFF" fontSize="10" fontFamily="monospace" textAnchor="middle">
                      SOUTH RUNWAY 09R/27L (4,000m × 45m CAT III-B)
                    </text>
                  </g>

                  {/* South Taxiway */}
                  <path d="M 120 440 L 120 380 L 780 380 L 780 440" fill="none" stroke="#2a2a2a" strokeWidth="4" strokeDasharray="6 4" />
                </svg>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-gw-text-secondary">
                <span>Tip: Click on any apron stand box (G1–G6) to view physical specifications and compatibility envelopes.</span>
                <span className="font-mono text-[#FFFFFF]">Click Stand to Inspect</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side Details Drawer: Stand Inspection */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border border-[#333333]">
            <CardHeader className="py-3 px-4 border-b border-[#333333] bg-[#181818] flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <DoorClosed className="w-4 h-4 text-[#FFFFFF]" />
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
                  <div className="p-3 rounded-xl bg-[#181818] border border-[#333333] flex items-center justify-between">
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
                    <div className="p-2.5 rounded-lg bg-[#181818] border border-[#333333]">
                      <div className="text-[10px] text-gw-text-secondary">TERMINAL</div>
                      <div className="text-xs font-bold text-gw-text mt-0.5">
                        {selectedStand.terminal === 'T1' ? 'Terminal 1' : 'Terminal 2'}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#181818] border border-[#333333]">
                      <div className="text-[10px] text-gw-text-secondary">MAX CATEGORY</div>
                      <div className="text-xs font-bold text-[#FFFFFF] mt-0.5">
                        {selectedStand.aircraft_category}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#181818] border border-[#333333]">
                      <div className="text-[10px] text-gw-text-secondary">MAX WINGSPAN</div>
                      <div className="text-xs font-bold text-gw-text mt-0.5">
                        {selectedStand.max_wingspan_m} meters
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#181818] border border-[#333333]">
                      <div className="text-[10px] text-gw-text-secondary">BOARDING TYPE</div>
                      <div className="text-xs font-bold text-[#FFFFFF] mt-0.5">
                        {selectedStand.has_jetway ? 'Contact Jetway' : 'Bus Apron'}
                      </div>
                    </div>
                  </div>

                  {/* Compatibility Diagnostic Information */}
                  <div className="p-3 rounded-lg bg-[#181818] border border-[#333333] space-y-2">
                    <div className="flex items-center gap-1.5 font-semibold text-gw-text text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#FFFFFF]" />
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
                  <div className="pt-2 border-t border-[#333333] flex items-center justify-between text-[10px] text-gw-text-secondary font-mono">
                    <span>DATA TIER:</span>
                    <span className="text-[#A3A3A3]">CONFIGURABLE DEMONSTRATION</span>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-gw-text-secondary text-xs space-y-2">
                  <DoorClosed className="w-8 h-8 text-[#737373] mx-auto" />
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
