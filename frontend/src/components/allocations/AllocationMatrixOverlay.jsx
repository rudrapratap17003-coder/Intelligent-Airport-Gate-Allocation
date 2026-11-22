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
    <div className="w-full bg-[#121826] border border-[#222E42] rounded-2xl p-4 shadow-sm">
      {/* Header and Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#222E42] mb-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#FFFFFF] uppercase tracking-wider font-mono">
            Restriction Matrix B with Allocation Overlay
          </span>
          <span className="text-[11px] text-[#A3A3A3] hidden sm:inline">
            • {n}×{n} Board ({allocation?.assignments?.length || 0} active assignments)
          </span>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-[#FFFFFF] border border-[#FFFFFF] text-[#090909] flex items-center justify-center text-[9px] font-bold">
              ✓
            </span>
            <span className="text-[#A3A3A3]">Assigned & Allowed (0)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-[#383838] border border-[#FFFFFF] text-[#FFFFFF] flex items-center justify-center text-[9px] font-bold">
              !
            </span>
            <span className="text-[#A3A3A3]">Assigned Forbidden (1)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-[#0D121F] border border-[#334155] text-[#FFFFFF] flex items-center justify-center text-[9px] font-bold">
              1
            </span>
            <span className="text-[#A3A3A3]">Forbidden (1)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-[#121826] border border-[#222E42] text-[#737373] flex items-center justify-center text-[9px]">
              0
            </span>
            <span className="text-[#A3A3A3]">Allowed (0)</span>
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
                <th className="p-2 text-left text-[#A3A3A3] text-[11px] font-medium border-b border-r border-[#222E42] min-w-[90px]">
                  Flights \ Gates
                </th>
                {gates.map((g, colIdx) => {
                  const isColActive = activePair?.gate_id === g.id
                  return (
                    <th
                      key={g.id || colIdx}
                      className={`p-2.5 text-center text-xs font-bold border-b border-[#222E42] min-w-[70px] transition-colors ${
                        isColActive
                          ? 'bg-[#1E2638] text-[#FFFFFF] border-b-2 border-b-white'
                          : 'text-[#FFFFFF] hover:text-[#FFFFFF]'
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <span>{g.id}</span>
                        <span className="text-[9px] font-normal text-[#A3A3A3] font-sans truncate max-w-[65px]">
                          {g.terminal || `G-${colIdx + 1}`}
                        </span>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>

            {/* Matrix Rows */}
            <tbody className="divide-y divide-[#333333]">
              {flights.map((f, rowIdx) => {
                const isRowActive = activePair?.flight_id === f.id

                return (
                  <tr key={f.id || rowIdx} className="hover:bg-[#1E2638]/40">
                    {/* Flight Row Header */}
                    <th
                      className={`p-2.5 text-left text-xs font-bold border-r border-[#222E42] transition-colors ${
                        isRowActive
                          ? 'bg-[#1E2638] text-[#FFFFFF] border-r-2 border-r-white'
                          : 'text-[#FFFFFF]'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span>{f.id}</span>
                        <span className="text-[9px] font-normal text-[#A3A3A3] font-sans truncate max-w-[85px]">
                          {f.airline || `F-${rowIdx + 1}`}
                        </span>
                      </div>
                    </th>

                    {/* Matrix Cells */}
                    {gates.map((g, colIdx) => {
                      const isForbidden = matrix[rowIdx] ? matrix[rowIdx][colIdx] === 1 : false
                      const isAssigned = assignedPairsSet.has(`${f.id}->${g.id}`)
                      const isCellFocused = activePair?.flight_id === f.id && activePair?.gate_id === g.id

                      let cellBg = 'bg-[#121826]'
                      let cellBorder = 'border border-[#222E42]'
                      let textColor = 'text-[#737373]'

                      if (isAssigned) {
                        if (isForbidden) {
                          cellBg = 'bg-[#383838]'
                          cellBorder = 'border-2 border-dashed border-[#FFFFFF]'
                          textColor = 'text-[#FFFFFF] font-bold'
                        } else {
                          cellBg = 'bg-[#FFFFFF]'
                          cellBorder = 'border-2 border-[#FFFFFF]'
                          textColor = 'text-[#090909] font-bold'
                        }
                      } else if (isForbidden) {
                        cellBg = 'bg-[#0D121F]'
                        cellBorder = 'border-2 border-[#334155]'
                        textColor = 'text-[#FFFFFF]'
                      }

                      if (isCellFocused) {
                        cellBorder += ' ring-2 ring-white'
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
                            className={`w-12 h-11 mx-auto rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer ${cellBg} ${cellBorder}`}
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
                            <span className={`text-xs ${textColor}`}>
                              {isAssigned ? (
                                isForbidden ? (
                                  <AlertTriangle className="w-4 h-4 text-[#FFFFFF]" />
                                ) : (
                                  <Check className="w-4 h-4 text-[#090909]" />
                                )
                              ) : isForbidden ? (
                                '1'
                              ) : (
                                '0'
                              )}
                            </span>

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
      <div className="mt-2 text-[11px] text-[#A3A3A3] flex items-center justify-between">
        <span>
          Click any cell to highlight the corresponding flight-to-gate connection in the bipartite graph.
        </span>
        {selectedPair && (
          <span className="font-mono text-[#FFFFFF]">
            Selected: {selectedPair.flight_id} → {selectedPair.gate_id}
          </span>
        )}
      </div>
    </div>
  )
}

export default AllocationMatrixOverlay
