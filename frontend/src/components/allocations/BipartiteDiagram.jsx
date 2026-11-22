import React, { useMemo } from 'react'
import { Info } from 'lucide-react'

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

  const flightIndexMap = useMemo(() => {
    return new Map(flights.map((f, i) => [f.id, i]))
  }, [flights])

  const gateIndexMap = useMemo(() => {
    return new Map(gates.map((g, i) => [g.id, i]))
  }, [gates])

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

  const nodeHeight = 56
  const nodeWidth = 210
  const nodeSpacing = 16
  const topPadding = 48
  const bottomPadding = 32
  const totalHeight = Math.max(340, topPadding + n * (nodeHeight + nodeSpacing) + bottomPadding)
  const svgWidth = 820

  const flightColX = 24
  const gateColX = svgWidth - nodeWidth - 24
  const flightAnchorX = flightColX + nodeWidth
  const gateAnchorX = gateColX

  const getNodeY = (idx) => topPadding + idx * (nodeHeight + nodeSpacing) + nodeHeight / 2

  const activePair = selectedPair || hoveredPair

  return (
    <div className="w-full overflow-x-auto select-none py-2">
      <div className="min-w-[760px] flex justify-center">
        <svg
          viewBox={`0 0 ${svgWidth} ${totalHeight}`}
          className="w-full max-w-[820px] select-none"
          style={{ height: `${totalHeight}px` }}
        >
          {/* Column Titles */}
          <text
            x={flightColX}
            y={24}
            fill="#FFFFFF"
            className="font-mono text-xs font-bold tracking-wider uppercase"
          >
            FLIGHT VERTICES (V_F)
          </text>
          <text
            x={gateColX}
            y={24}
            fill="#A3A3A3"
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

              const isPairActive =
                activePair &&
                activePair.flight_id === assignment.flight_id &&
                activePair.gate_id === assignment.gate_id

              const pairConflicts = conflictsByPair.get(`${assignment.flight_id}->${assignment.gate_id}`) || []
              const hasForbiddenConflict = pairConflicts.some(c => c.conflict_type === 'FORBIDDEN_ASSIGNMENT')
              const hasDuplicateConflict = pairConflicts.some(
                c => c.conflict_type === 'DUPLICATE_GATE' || c.conflict_type === 'DUPLICATE_FLIGHT'
              )

              let strokeColor = isPairActive ? '#FFFFFF' : '#888888'
              let strokeWidth = isPairActive ? 3 : 1.75
              let strokeOpacity = activePair ? (isPairActive ? 1 : 0.25) : 0.75

              if (hasForbiddenConflict) {
                strokeColor = '#555555'
              } else if (hasDuplicateConflict) {
                strokeColor = '#AAAAAA'
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
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeOpacity={strokeOpacity}
                    className="transition-all duration-200 pointer-events-none"
                    strokeDasharray={hasForbiddenConflict ? '6,4' : hasDuplicateConflict ? '4,2' : undefined}
                  />

                  {/* Anchor Connection Dots */}
                  <circle
                    cx={flightAnchorX}
                    cy={y1}
                    r={isPairActive ? 4 : 2.5}
                    fill={hasForbiddenConflict ? '#555555' : '#FFFFFF'}
                    opacity={strokeOpacity}
                  />
                  <circle
                    cx={gateAnchorX}
                    cy={y2}
                    r={isPairActive ? 4 : 2.5}
                    fill={hasForbiddenConflict ? '#555555' : '#FFFFFF'}
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

              let nodeBorderColor = isHovered ? '#FFFFFF' : '#333333'
              let nodeBgColor = isHovered ? '#222222' : '#181818'
              if (isUnassigned) {
                nodeBorderColor = '#555555'
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
                  <rect x={10} y={12} width={34} height={34} rx={8} fill="#222222" />
                  <path
                    d="M 27 21 L 27 37 M 21 27 L 33 27 M 24 35 L 30 35"
                    stroke="#FFFFFF"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                  />

                  {/* Flight Identifiers & Airline Info */}
                  <text x={54} y={28} fill="#FFFFFF" className="font-mono text-xs font-bold">
                    {flight.id}
                  </text>
                  <text x={54} y={43} fill="#A3A3A3" className="text-[10px] font-sans">
                    {flight.airline || 'Aviation'} • {flight.flightNumber || 'FLT'}
                  </text>

                  {/* Unassigned Warning Indicator */}
                  {isUnassigned && (
                    <text x={nodeWidth - 12} y={32} textAnchor="end" fill="#A3A3A3" className="font-mono text-[10px]">
                      Unassigned
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

              let nodeBorderColor = isHovered ? '#FFFFFF' : '#333333'
              let nodeBgColor = isHovered ? '#222222' : '#181818'
              if (isDuplicate) {
                nodeBorderColor = '#777777'
              } else if (isUnassigned) {
                nodeBorderColor = '#333333'
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
                  <rect x={10} y={12} width={34} height={34} rx={8} fill="#222222" />
                  <rect x={21} y={20} width={12} height={18} rx={2} stroke="#FFFFFF" strokeWidth={1.5} fill="none" />
                  <circle cx={29} cy={29} r={1.5} fill="#FFFFFF" />

                  {/* Gate Identifiers & Terminal Info */}
                  <text x={54} y={28} fill="#FFFFFF" className="font-mono text-xs font-bold">
                    {gate.id}
                  </text>
                  <text x={54} y={43} fill="#A3A3A3" className="text-[10px] font-sans">
                    {gate.terminal || 'Main'} • {gate.gateType || 'Standard'}
                  </text>

                  {/* Status Indicator */}
                  {isDuplicate ? (
                    <text x={nodeWidth - 12} y={32} textAnchor="end" fill="#FFFFFF" className="font-mono text-[10px]">
                      Duplicate ({assignedFlights.length})
                    </text>
                  ) : isUnassigned ? (
                    <text x={nodeWidth - 12} y={32} textAnchor="end" fill="#737373" className="font-mono text-[10px]">
                      Unoccupied
                    </text>
                  ) : null}
                </g>
              )
            })}
          </g>
        </svg>
      </div>

      {/* Discrete Math Disclaimer Banner */}
      <div className="mt-2 pt-2 border-t border-[#222E42] flex items-center justify-between text-[11px] text-[#A3A3A3]">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-[#FFFFFF] shrink-0" />
          <span>
            Bipartite graph model displays discrete mathematical pairing relationships (f: V_F → V_G), not physical airport geography.
          </span>
        </div>
        {selectedPair && (
          <button
            type="button"
            onClick={() => onSelectPair(null)}
            className="text-[#FFFFFF] hover:underline font-mono cursor-pointer"
          >
            Clear Selected Link
          </button>
        )}
      </div>
    </div>
  )
}

export default BipartiteDiagram
