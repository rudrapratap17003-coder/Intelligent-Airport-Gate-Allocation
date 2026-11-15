import React, { useMemo } from 'react'
import {
  AlertTriangle,
  Check
} from 'lucide-react'

export const AllocationMatrixOverlay = ({
  matrix = [],
  flights = [],
  gates = [],
  allocation = null,
  hoveredPair = null,
  onHoverPair = () => {},
  selectedPair = null,
  onSelectPair = () => {}
}) => {
  const n = matrix.length

  // Build assigned pairs lookup set: "flightId->gateId"
  const assignedPairsSet = useMemo(() => {
    const set = new Set()
    if (!allocation?.assignments) return set
    for (const a of allocation.assignments) {
      set.add(`${a.flight_id}->${a.gate_id}`)
    }
    return set
  }, [allocation])

  const activePair = selectedPair || hoveredPair

  return (
    <div className="w-full bg-gw-bg-secondary/40 border border-[#1e3a5f]/60 rounded-2xl p-4 shadow-inner">
      {/* Header and Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1e3a5f]/40 mb-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gw-cyan uppercase tracking-wider font-mono">
            Restriction Matrix B with Allocation Overlay
          </span>
          <span className="text-[11px] text-gw-text-secondary hidden sm:inline">
            • {n}×{n} Board ({allocation?.assignments?.length || 0} active assignments)
          </span>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-gw-cyan/20 border border-gw-cyan text-gw-cyan flex items-center justify-center text-[9px] font-bold">
              ✓
            </span>
            <span className="text-gw-text-secondary">Assigned & Allowed (0)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-gw-error/25 border border-gw-error text-gw-error flex items-center justify-center text-[9px] font-bold">
              ✗
            </span>
            <span className="text-gw-text-secondary">Assigned Forbidden (1)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-gw-error/10 border border-gw-error/30 text-gw-error flex items-center justify-center text-[9px]">
              1
            </span>
            <span className="text-gw-text-secondary">Forbidden (1)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-gw-card/60 border border-[#1e3a5f]/60 text-gw-text-secondary flex items-center justify-center text-[9px]">
              0
            </span>
            <span className="text-gw-text-secondary">Allowed (0)</span>
          </div>
        </div>
      </div>

      {/* Grid Container */}
      <div className="overflow-x-auto pb-2">
        <div className="inline-block min-w-full align-middle">
          <table className="border-collapse select-none font-mono text-xs">
            {/* Gate Column Headers */}
            <thead>
              <tr>
                <th className="p-2 text-left text-gw-text-secondary text-[11px] font-medium border-b border-r border-[#1e3a5f]/60 min-w-[90px]">
                  Flights \ Gates
                </th>
                {gates.map((g, colIdx) => {
                  const isColActive = activePair?.gate_id === g.id
                  return (
                    <th
                      key={g.id || colIdx}
                      className={`p-2.5 text-center text-xs font-bold border-b border-[#1e3a5f]/60 min-w-[70px] transition-colors ${
                        isColActive
                          ? 'bg-gw-cyan/15 text-gw-cyan border-b-2 border-b-gw-cyan'
                          : 'text-gw-text hover:text-gw-cyan'
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <span>{g.id}</span>
                        <span className="text-[9px] font-normal text-gw-text-secondary font-sans truncate max-w-[65px]">
                          {g.terminal || `G-${colIdx + 1}`}
                        </span>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>

            {/* Matrix Rows */}
            <tbody className="divide-y divide-[#1e3a5f]/40">
              {flights.map((f, rowIdx) => {
                const isRowActive = activePair?.flight_id === f.id

                return (
                  <tr key={f.id || rowIdx} className="hover:bg-white/[0.01]">
                    {/* Flight Row Header */}
                    <th
                      className={`p-2.5 text-left text-xs font-bold border-r border-[#1e3a5f]/60 transition-colors ${
                        isRowActive
                          ? 'bg-gw-cyan/15 text-gw-cyan border-r-2 border-r-gw-cyan'
                          : 'text-gw-text hover:text-gw-cyan'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span>{f.id}</span>
                        <span className="text-[9px] font-normal text-gw-text-secondary font-sans truncate max-w-[85px]">
                          {f.airline || `F-${rowIdx + 1}`}
                        </span>
                      </div>
                    </th>

                    {/* Matrix Cells */}
                    {gates.map((g, colIdx) => {
                      const isForbidden = matrix[rowIdx] ? matrix[rowIdx][colIdx] === 1 : false
                      const isAssigned = assignedPairsSet.has(`${f.id}->${g.id}`)
                      const isCellFocused = activePair?.flight_id === f.id && activePair?.gate_id === g.id

                      // Cell Appearance Logic
                      let cellBg = 'bg-gw-card/40'
                      let cellBorder = 'border border-[#1e3a5f]/40'
                      let textColor = 'text-gw-text-secondary/70'

                      if (isAssigned) {
                        if (isForbidden) {
                          cellBg = 'bg-gw-error/25'
                          cellBorder = 'border-2 border-gw-error shadow-sm shadow-gw-error/30'
                          textColor = 'text-gw-error font-bold'
                        } else {
                          cellBg = 'bg-gw-cyan/20'
                          cellBorder = 'border-2 border-gw-cyan shadow-sm shadow-gw-cyan/30'
                          textColor = 'text-gw-cyan font-bold'
                        }
                      } else if (isForbidden) {
                        cellBg = 'bg-gw-error/10'
                        cellBorder = 'border border-gw-error/30'
                        textColor = 'text-gw-error/80'
                      }

                      if (isCellFocused) {
                        cellBorder += ' ring-2 ring-white ring-offset-1 ring-offset-gw-bg'
                      }

                      const pairObj = { flight_id: f.id, gate_id: g.id }

                      return (
                        <td
                          key={colIdx}
                          className="p-1.5 text-center"
                          onMouseEnter={() => onHoverPair(pairObj)}
                          onMouseLeave={() => onHoverPair(null)}
                          onClick={() => {
                            if (selectedPair?.flight_id === f.id && selectedPair?.gate_id === g.id) {
                              onSelectPair(null)
                            } else {
                              onSelectPair(pairObj)
                            }
                          }}
                        >
                          <div
                            className={`w-12 h-11 mx-auto rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${cellBg} ${cellBorder}`}
                            title={`Pair: ${f.id} → ${g.id} | Status: ${
                              isAssigned
                                ? isForbidden
                                  ? 'ASSIGNED FORBIDDEN (CONFLICT)'
                                  : 'ASSIGNED IN PLAN (VALID)'
                                : isForbidden
                                ? 'Forbidden cell (1)'
                                : 'Allowed cell (0)'
                            }`}
                          >
                            {/* Main value indicator */}
                            <span className={`text-xs ${textColor}`}>
                              {isAssigned ? (
                                isForbidden ? (
                                  <AlertTriangle className="w-4 h-4 text-gw-error animate-pulse" />
                                ) : (
                                  <Check className="w-4 h-4 text-gw-cyan" />
                                )
                              ) : isForbidden ? (
                                '1'
                              ) : (
                                '0'
                              )}
                            </span>

                            {/* Subtitle tag */}
                            <span className="text-[8px] uppercase tracking-tighter opacity-80">
                              {isAssigned ? (isForbidden ? 'FORB' : 'PLAN') : isForbidden ? 'BLOCK' : 'OPEN'}
                            </span>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Helper Footer Note */}
      <div className="mt-2 text-[11px] text-gw-text-secondary flex items-center justify-between">
        <span>
          Click any cell to highlight the corresponding flight-to-gate connection in the bipartite graph.
        </span>
        {selectedPair && (
          <span className="font-mono text-gw-cyan">
            Selected: {selectedPair.flight_id} → {selectedPair.gate_id}
          </span>
        )}
      </div>
    </div>
  )
}

export default AllocationMatrixOverlay
