import React, { useMemo } from 'react'
import {
  Info
} from 'lucide-react'

export const BipartiteDiagram = ({
  flights = [],
  gates = [],
  allocation = null,
  matrix = [],
  hoveredPair = null,
  onHoverPair = () => {},
  selectedPair = null,
  onSelectPair = () => {}
}) => {
  const n = Math.max(flights.length, gates.length)

  // Map flight IDs to index and gate IDs to index
  const flightIndexMap = useMemo(() => {
    return new Map(flights.map((f, i) => [f.id, i]))
  }, [flights])

  const gateIndexMap = useMemo(() => {
    return new Map(gates.map((g, i) => [g.id, i]))
  }, [gates])

  // Extract assignments map from allocation
  const assignments = useMemo(() => {
    return allocation?.assignments || []
  }, [allocation])

  const assignedGatesByFlight = useMemo(() => {
    const map = new Map()
    for (const a of assignments) {
      if (!map.has(a.flight_id)) map.set(a.flight_id, [])
      map.get(a.flight_id).push(a.gate_id)
    }
    return map
  }, [assignments])

  const assignedFlightsByGate = useMemo(() => {
    const map = new Map()
    for (const a of assignments) {
      if (!map.has(a.gate_id)) map.set(a.gate_id, [])
      map.get(a.gate_id).push(a.flight_id)
    }
    return map
  }, [assignments])

  // Map conflicts from independent Phase 17 validation
  const conflictsByPair = useMemo(() => {
    const map = new Map()
    const conflicts = allocation?.validation?.conflicts || []
    for (const c of conflicts) {
      if (c.flight_id && c.gate_id) {
        const key = `${c.flight_id}->${c.gate_id}`
        if (!map.has(key)) map.set(key, [])
        map.get(key).push(c)
      }
    }
    return map
  }, [allocation])

  // SVG Dimension Calculations
  const nodeHeight = 58
  const nodeSpacing = 20
  const topPadding = 45
  const bottomPadding = 35
  const totalHeight = Math.max(n * (nodeHeight + nodeSpacing) + topPadding + bottomPadding, 480)
  const svgWidth = 820
  const flightColX = 30
  const gateColX = svgWidth - 250
  const flightAnchorX = flightColX + 220
  const gateAnchorX = gateColX
  const nodeWidth = 220

  // Calculate node center Y coordinates
  const getNodeY = (index) => {
    return topPadding + index * (nodeHeight + nodeSpacing) + nodeHeight / 2
  }

  // Active highlighted pair (either hovered or locked selected)
  const activePair = selectedPair || hoveredPair

  return (
    <div className="w-full bg-gw-bg-secondary/40 border border-[#1e3a5f]/60 rounded-2xl p-4 overflow-x-auto shadow-inner">
      {/* Visual Bipartite Header / Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1e3a5f]/40 mb-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gw-cyan uppercase tracking-wider font-mono">
            Bipartite Matching G = (V_F, V_G, E)
          </span>
          <span className="text-[11px] text-gw-text-secondary hidden sm:inline">
            • {assignments.length} flight-to-gate links
          </span>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-gw-cyan rounded-full" />
            <span className="text-gw-text-secondary">Valid Link</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-gw-error rounded-full" />
            <span className="text-gw-text-secondary">Forbidden Link</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-gw-warning rounded-full" />
            <span className="text-gw-text-secondary">Duplicate Link</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm border border-dashed border-gw-text-secondary/60" />
            <span className="text-gw-text-secondary">Unassigned</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="min-w-[760px] flex justify-center">
        <svg
          viewBox={`0 0 ${svgWidth} ${totalHeight}`}
          className="w-full max-w-[820px] select-none"
          style={{ height: `${totalHeight}px` }}
        >
          <defs>
            {/* Glow Filter for Active Edges */}
            <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#38bdf8" floodOpacity="0.8" />
            </filter>
            <filter id="glow-error" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#ef4444" floodOpacity="0.8" />
            </filter>
            <filter id="glow-warning" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#f59e0b" floodOpacity="0.8" />
            </filter>

            {/* Gradients for Connection Edges */}
            <linearGradient id="edge-valid" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id="edge-active" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
            <linearGradient id="edge-forbidden" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
            <linearGradient id="edge-duplicate" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>

          {/* Column Titles */}
          <text
            x={flightColX}
            y={24}
            fill="#38bdf8"
            className="font-mono text-xs font-bold tracking-wider uppercase"
          >
            FLIGHT VERTICES (V_F)
          </text>
          <text
            x={gateColX}
            y={24}
            fill="#94a3b8"
            className="font-mono text-xs font-bold tracking-wider uppercase"
          >
            GATE VERTICES (V_G)
          </text>

          {/* 1. RENDER CONNECTION LINES (EDGES) */}
          <g className="edges-layer">
            {assignments.map((assignment, idx) => {
              const fIdx = flightIndexMap.get(assignment.flight_id)
              const gIdx = gateIndexMap.get(assignment.gate_id)
              if (fIdx === undefined || gIdx === undefined) return null

              const y1 = getNodeY(fIdx)
              const y2 = getNodeY(gIdx)
              const dx = (gateAnchorX - flightAnchorX) * 0.45
              const pathD = `M ${flightAnchorX} ${y1} C ${flightAnchorX + dx} ${y1}, ${gateAnchorX - dx} ${y2}, ${gateAnchorX} ${y2}`

              // Check if edge is active or hovered
              const isPairActive =
                activePair &&
                activePair.flight_id === assignment.flight_id &&
                activePair.gate_id === assignment.gate_id

              // Determine Conflict Status for Edge
              const pairConflicts = conflictsByPair.get(`${assignment.flight_id}->${assignment.gate_id}`) || []
              const hasForbiddenConflict = pairConflicts.some(c => c.conflict_type === 'FORBIDDEN_ASSIGNMENT')
              const hasDuplicateConflict = pairConflicts.some(
                c => c.conflict_type === 'DUPLICATE_GATE' || c.conflict_type === 'DUPLICATE_FLIGHT'
              )

              // Stroke styling
              let strokeUrl = 'url(#edge-valid)'
              let filter = undefined
              let strokeWidth = isPairActive ? 3.5 : 2
              let strokeOpacity = activePair ? (isPairActive ? 1 : 0.2) : 0.75

              if (hasForbiddenConflict) {
                strokeUrl = 'url(#edge-forbidden)'
                if (isPairActive) filter = 'url(#glow-error)'
              } else if (hasDuplicateConflict) {
                strokeUrl = 'url(#edge-duplicate)'
                if (isPairActive) filter = 'url(#glow-warning)'
              } else if (isPairActive) {
                strokeUrl = 'url(#edge-active)'
                filter = 'url(#glow-cyan)'
              }

              return (
                <g key={`edge-${idx}`}>
                  {/* Invisible broad stroke for easy hovering */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={18}
                    className="cursor-pointer"
                    onMouseEnter={() => onHoverPair(assignment)}
                    onMouseLeave={() => onHoverPair(null)}
                    onClick={() => {
                      if (selectedPair?.flight_id === assignment.flight_id && selectedPair?.gate_id === assignment.gate_id) {
                        onSelectPair(null)
                      } else {
                        onSelectPair(assignment)
                      }
                    }}
                  />
                  {/* Visible Bézier edge */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={strokeUrl}
                    strokeWidth={strokeWidth}
                    strokeOpacity={strokeOpacity}
                    filter={filter}
                    className="transition-all duration-200 pointer-events-none"
                    strokeDasharray={hasForbiddenConflict ? '6,4' : undefined}
                  />

                  {/* Anchor Connection Dots */}
                  <circle
                    cx={flightAnchorX}
                    cy={y1}
                    r={isPairActive ? 4.5 : 3}
                    fill={hasForbiddenConflict ? '#ef4444' : '#38bdf8'}
                    opacity={strokeOpacity}
                  />
                  <circle
                    cx={gateAnchorX}
                    cy={y2}
                    r={isPairActive ? 4.5 : 3}
                    fill={hasForbiddenConflict ? '#ef4444' : '#38bdf8'}
                    opacity={strokeOpacity}
                  />
                </g>
              )
            })}
          </g>

          {/* 2. RENDER FLIGHT NODES (LEFT COLUMN) */}
          <g className="flights-layer">
            {flights.map((flight, idx) => {
              const y = topPadding + idx * (nodeHeight + nodeSpacing)
              const assignedGates = assignedGatesByFlight.get(flight.id) || []
              const isUnassigned = assignedGates.length === 0
              const isHovered = activePair?.flight_id === flight.id

              let nodeBorderColor = isHovered ? '#38bdf8' : '#1e3a5f'
              let nodeBgColor = isHovered ? '#0f2942' : '#0b192c'
              if (isUnassigned) {
                nodeBorderColor = '#eab308'
                nodeBgColor = '#1c1917'
              }

              return (
                <g
                  key={flight.id}
                  transform={`translate(${flightColX}, ${y})`}
                  className="cursor-pointer group"
                  onMouseEnter={() => {
                    if (assignedGates.length > 0) {
                      onHoverPair({ flight_id: flight.id, gate_id: assignedGates[0] })
                    }
                  }}
                  onMouseLeave={() => onHoverPair(null)}
                  onClick={() => {
                    if (assignedGates.length > 0) {
                      const target = { flight_id: flight.id, gate_id: assignedGates[0] }
                      if (selectedPair?.flight_id === flight.id) onSelectPair(null)
                      else onSelectPair(target)
                    }
                  }}
                >
                  {/* Node Background Box */}
                  <rect
                    width={nodeWidth}
                    height={nodeHeight}
                    rx={10}
                    fill={nodeBgColor}
                    stroke={nodeBorderColor}
                    strokeWidth={isHovered ? 2 : 1}
                    strokeDasharray={isUnassigned ? '4,3' : undefined}
                    className="transition-colors duration-150"
                  />

                  {/* Flight Icon Badge */}
                  <rect x={10} y={12} width={34} height={34} rx={8} fill="#38bdf8" fillOpacity="0.12" />
                  <path
                    d="M 27 21 L 27 37 M 21 27 L 33 27 M 24 35 L 30 35"
                    stroke="#38bdf8"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                  />

                  {/* Flight Identifiers & Airline Info */}
                  <text x={54} y={28} fill="#f8fafc" className="font-mono text-xs font-bold">
                    {flight.id}
                  </text>
                  <text x={54} y={43} fill="#94a3b8" className="text-[10px] font-sans">
                    {flight.airline || 'Aviation'} • {flight.flightNumber || 'FLT'}
                  </text>

                  {/* Unassigned Warning Indicator */}
                  {isUnassigned && (
                    <text x={nodeWidth - 12} y={32} textAnchor="end" fill="#eab308" className="font-mono text-[10px]">
                      ⚠ Unassigned
                    </text>
                  )}
                </g>
              )
            })}
          </g>

          {/* 3. RENDER GATE NODES (RIGHT COLUMN) */}
          <g className="gates-layer">
            {gates.map((gate, idx) => {
              const y = topPadding + idx * (nodeHeight + nodeSpacing)
              const assignedFlights = assignedFlightsByGate.get(gate.id) || []
              const isUnassigned = assignedFlights.length === 0
              const isDuplicate = assignedFlights.length > 1
              const isHovered = activePair?.gate_id === gate.id

              let nodeBorderColor = isHovered ? '#38bdf8' : '#1e3a5f'
              let nodeBgColor = isHovered ? '#0f2942' : '#0b192c'
              if (isDuplicate) {
                nodeBorderColor = '#f59e0b'
                nodeBgColor = '#241a08'
              } else if (isUnassigned) {
                nodeBorderColor = '#64748b'
                nodeBgColor = '#0b192c'
              }

              return (
                <g
                  key={gate.id}
                  transform={`translate(${gateColX}, ${y})`}
                  className="cursor-pointer group"
                  onMouseEnter={() => {
                    if (assignedFlights.length > 0) {
                      onHoverPair({ flight_id: assignedFlights[0], gate_id: gate.id })
                    }
                  }}
                  onMouseLeave={() => onHoverPair(null)}
                  onClick={() => {
                    if (assignedFlights.length > 0) {
                      const target = { flight_id: assignedFlights[0], gate_id: gate.id }
                      if (selectedPair?.gate_id === gate.id) onSelectPair(null)
                      else onSelectPair(target)
                    }
                  }}
                >
                  {/* Node Background Box */}
                  <rect
                    width={nodeWidth}
                    height={nodeHeight}
                    rx={10}
                    fill={nodeBgColor}
                    stroke={nodeBorderColor}
                    strokeWidth={isHovered ? 2 : 1}
                    strokeDasharray={isUnassigned ? '4,3' : undefined}
                    className="transition-colors duration-150"
                  />

                  {/* Gate Icon Badge */}
                  <rect x={10} y={12} width={34} height={34} rx={8} fill="#94a3b8" fillOpacity="0.1" />
                  <rect x={21} y={20} width={12} height={18} rx={2} stroke="#94a3b8" strokeWidth={1.5} fill="none" />
                  <circle cx={29} cy={29} r={1.5} fill="#94a3b8" />

                  {/* Gate Identifiers & Terminal Info */}
                  <text x={54} y={28} fill="#f8fafc" className="font-mono text-xs font-bold">
                    {gate.id}
                  </text>
                  <text x={54} y={43} fill="#94a3b8" className="text-[10px] font-sans">
                    {gate.terminal || 'Main'} • {gate.gateType || 'Standard'}
                  </text>

                  {/* Status Indicator */}
                  {isDuplicate ? (
                    <text x={nodeWidth - 12} y={32} textAnchor="end" fill="#f59e0b" className="font-mono text-[10px]">
                      ⚠ Duplicate ({assignedFlights.length})
                    </text>
                  ) : isUnassigned ? (
                    <text x={nodeWidth - 12} y={32} textAnchor="end" fill="#64748b" className="font-mono text-[10px]">
                      Unoccupied
                    </text>
                  ) : null}
                </g>
              )
            })}
          </g>
        </svg>
      </div>

      {/* Discrete Math Disclaimer Banner (Section 7) */}
      <div className="mt-2 pt-2 border-t border-[#1e3a5f]/40 flex items-center justify-between text-[11px] text-gw-text-secondary">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-gw-cyan shrink-0" />
          <span>
            Bipartite graph model displays discrete mathematical pairing relationships ($f: V_F \to V_G$), not physical airport geography.
          </span>
        </div>
        {selectedPair && (
          <button
            type="button"
            onClick={() => onSelectPair(null)}
            className="text-gw-cyan hover:underline font-mono cursor-pointer"
          >
            Clear Selected Link
          </button>
        )}
      </div>
    </div>
  )
}

export default BipartiteDiagram
