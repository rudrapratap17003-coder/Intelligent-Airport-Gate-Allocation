import React, { useState, useMemo, useCallback } from 'react'
import {
  Sparkles,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Info,
  CheckCircle2,
  Ban,
  Layers,
  ShieldCheck
} from 'lucide-react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import rookPolynomialService from '../../lib/rookPolynomialService'

export const RookPolynomialVisualizer = ({
  scenarioName = 'Selected Scenario',
  scenarioId = '',
  matrix = [],
  flights = [],
  gates = [],
  autoCalculate = true,
  onCalculated,
  className = ''
}) => {
  const [result, setResult] = useState(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState(null)

  const [selectedDegree, setSelectedDegree] = useState(1)
  const [arrangementIndex, setArrangementIndex] = useState(0)
  const [highlightAttacks, setHighlightAttacks] = useState(true)

  const handleCalculate = useCallback(() => {
    if (!matrix || matrix.length === 0 || !matrix[0] || matrix[0].length === 0) {
      setError('Matrix is empty or not loaded.')
      return
    }

    try {
      setIsCalculating(true)
      setError(null)
      const res = rookPolynomialService.computeRookPolynomial(matrix)
      setResult(res)

      if (res.forbiddenCount > 0 && res.coefficients.length > 1) {
        setSelectedDegree(1)
      } else {
        setSelectedDegree(0)
      }
      setArrangementIndex(0)

      if (onCalculated) {
        onCalculated(res)
      }
    } catch (err) {
      console.error('Rook polynomial computation failed:', err)
      setError(err.message || 'Failed to compute rook polynomial.')
    } finally {
      setIsCalculating(false)
    }
  }, [matrix, onCalculated])

  React.useEffect(() => {
    if (autoCalculate && matrix && matrix.length > 0 && matrix[0] && matrix[0].length > 0) {
      handleCalculate()
    }
  }, [autoCalculate, matrix, handleCalculate])

  const currentDegreePlacements = useMemo(() => {
    if (!result || !result.placementsByDegree || selectedDegree === 0) {
      return []
    }
    return result.placementsByDegree[selectedDegree] || []
  }, [result, selectedDegree])

  const activeArrangement = useMemo(() => {
    if (!currentDegreePlacements || currentDegreePlacements.length === 0) {
      return []
    }
    const idx = Math.min(arrangementIndex, currentDegreePlacements.length - 1)
    return currentDegreePlacements[idx] || []
  }, [currentDegreePlacements, arrangementIndex])

  const attackedRays = useMemo(() => {
    const attackedRows = new Set()
    const attackedCols = new Set()
    const rookCellMap = new Map()

    activeArrangement.forEach((rook, rookIdx) => {
      attackedRows.add(rook.row)
      attackedCols.add(rook.col)
      rookCellMap.set(`${rook.row}-${rook.col}`, rookIdx + 1)
    })

    return { attackedRows, attackedCols, rookCellMap }
  }, [activeArrangement])

  const numRows = matrix?.length || 0
  const numCols = matrix?.[0]?.length || 0

  const matrixRows = result?.matrixDimensions?.rows ?? result?.dimensions?.rows ?? numRows
  const matrixCols = result?.matrixDimensions?.columns ?? result?.dimensions?.columns ?? numCols
  const totalForbidden = result?.forbiddenCellCount ?? result?.forbiddenCount ?? 0

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. ACTION & SCENARIO HEADER */}
      <Card className="p-5 border-[#222E42] bg-[#121826]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono uppercase tracking-wider text-[#FFFFFF] font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#FFFFFF]" />
                Rook Polynomial Engine
              </span>
              {scenarioId && (
                <Badge variant="default" size="sm" className="font-mono text-[#FFFFFF] border-[#334155]">
                  {scenarioId}
                </Badge>
              )}
              <Badge variant="default" size="sm" className="font-mono text-[#A3A3A3]">
                {numRows} × {numCols} Board
              </Badge>
            </div>
            <h3 className="text-lg font-bold text-[#FFFFFF]">
              Rook Polynomial Analysis — {scenarioName}
            </h3>
            <p className="text-xs text-[#A3A3A3]">
              Enumerate non-attacking rook configurations on forbidden cells B using dynamic programming with column bitmasks.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="primary"
              size="md"
              icon={Calculator}
              onClick={handleCalculate}
              disabled={isCalculating || numRows === 0 || numCols === 0}
              className="font-mono"
            >
              {isCalculating ? 'Computing Polynomial...' : 'CALCULATE ROOK POLYNOMIAL'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-[#1E2638] border border-[#334155] text-xs text-[#FFFFFF] flex items-center gap-2">
            <Ban className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </Card>

      {/* 2. POLYNOMIAL EXPRESSION & METRICS */}
      {result && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
            <Card className="p-3 text-center bg-[#121826] border-[#222E42]">
              <span className="text-[10px] uppercase tracking-wider text-[#A3A3A3] block font-sans font-medium">
                Scenario
              </span>
              <span className="text-sm font-bold text-[#FFFFFF] truncate block mt-0.5" title={scenarioName}>
                {scenarioId || 'Active'}
              </span>
              <span className="text-[10px] text-[#737373] font-sans truncate block">
                {scenarioName}
              </span>
            </Card>

            <Card className="p-3 text-center bg-[#121826] border-[#222E42]">
              <span className="text-[10px] uppercase tracking-wider text-[#A3A3A3] block font-sans font-medium">
                Dimensions
              </span>
              <span className="text-lg font-extrabold text-[#FFFFFF] mt-0.5 block">
                {matrixRows} × {matrixCols}
              </span>
              <span className="text-[10px] text-[#737373] font-sans">
                Rows × Columns
              </span>
            </Card>

            <Card className="p-3 text-center bg-[#121826] border-[#222E42]">
              <span className="text-[10px] uppercase tracking-wider text-[#A3A3A3] block font-sans font-medium">
                Forbidden Cells (r₁)
              </span>
              <span className="text-lg font-extrabold text-[#FFFFFF] mt-0.5 block">
                {totalForbidden}
              </span>
              <span className="text-[10px] text-[#737373] font-sans">
                1-Rook positions
              </span>
            </Card>

            <Card className="p-3 text-center bg-[#121826] border-[#222E42]">
              <span className="text-[10px] uppercase tracking-wider text-[#A3A3A3] block font-sans font-medium">
                Degree (k)
              </span>
              <span className="text-lg font-extrabold text-[#FFFFFF] mt-0.5 block">
                deg = {result.degree}
              </span>
              <span className="text-[10px] text-[#737373] font-sans">
                min(m, n) = {Math.min(matrixRows, matrixCols)}
              </span>
            </Card>

            <Card className="p-3 text-center bg-[#121826] border-[#222E42]">
              <span className="text-[10px] uppercase tracking-wider text-[#A3A3A3] block font-sans font-medium">
                Compute Time
              </span>
              <span className="text-lg font-extrabold text-[#FFFFFF] mt-0.5 block">
                {result.computationTimeMs} ms
              </span>
              <span className="text-[10px] text-[#737373] font-sans">
                Client DP Execution
              </span>
            </Card>

            <Card className="p-3 text-center bg-[#121826] border-[#222E42]">
              <span className="text-[10px] uppercase tracking-wider text-[#A3A3A3] block font-sans font-medium">
                Algorithm
              </span>
              <span className="text-xs font-bold text-[#FFFFFF] mt-1 block truncate" title={result.algorithm}>
                Bitmask DP
              </span>
              <span className="text-[10px] text-[#737373] font-sans">
                O(m · 2^min(m,n))
              </span>
            </Card>
          </div>

          {/* Formatted Polynomial Equation Banner */}
          <Card className="p-6 border-[#222E42] bg-[#121826] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#222E42] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#FFFFFF]" />
                <h4 className="text-sm font-bold uppercase tracking-wider font-mono text-[#FFFFFF]">
                  Evaluated Rook Polynomial Formula R(B, x)
                </h4>
              </div>
              <Badge variant="default" size="sm" className="font-mono text-[#FFFFFF] border-[#334155]">
                Exact Integer Form
              </Badge>
            </div>

            <div className="p-4 rounded-xl bg-[#0D121F] border border-[#222E42] overflow-x-auto text-center shadow-inner">
              <div className="text-xl sm:text-2xl md:text-3xl font-mono font-extrabold text-[#F8FAFC] tracking-wide">
                R(B, x) = <span className="text-sky-400">{result.polynomial}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#A3A3A3] font-mono">
              <span>
                Standard form: <strong className="text-[#FFFFFF]">R(x) = r₀ + r₁x + r₂x² + ... + rₖxᵏ</strong>
              </span>
              <span>
                {result.isTransposed && (
                  <span className="text-[#A3A3A3]">
                    * Transposed internally (columns &gt; rows) for optimal DP state complexity.
                  </span>
                )}
              </span>
            </div>
          </Card>

          {/* 3. COEFFICIENTS ITEMIZATION */}
          <Card className="p-5 space-y-4 bg-[#121826] border-[#222E42]">
            <div className="flex items-center justify-between pb-2 border-b border-[#222E42]">
              <div>
                <h4 className="gw-card-heading flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#FFFFFF]" />
                  Individual Coefficients Breakdown (r₀ through r_{result.degree})
                </h4>
                <p className="text-xs text-[#A3A3A3] mt-0.5">
                  Click any coefficient card below to visualize its corresponding non-attacking rook arrangements on the board.
                </p>
              </div>
              <span className="text-xs font-mono text-[#737373]">
                {result.coefficients.length} Terms Total
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {result.coefficients.map((coeff, k) => {
                const isSelected = selectedDegree === k
                return (
                  <div
                    key={k}
                    onClick={() => {
                      setSelectedDegree(k)
                      setArrangementIndex(0)
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                      isSelected
                        ? 'bg-sky-500/10 border-sky-400 shadow-xs'
                        : 'bg-[#0D121F] border-[#222E42] hover:border-sky-500/30 hover:bg-[#1E2638]'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl font-mono font-bold flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? 'bg-sky-500 text-slate-950 font-extrabold border-sky-400'
                          : 'bg-[#1E2638] border-[#222E42] text-sky-400'
                      }`}
                    >
                      r{k}
                    </div>

                    <div className="text-xs font-mono space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#FFFFFF] text-sm">
                          r{k} = {coeff.toLocaleString()}
                        </span>
                        <Badge variant="default" size="sm" className={isSelected ? 'text-[#FFFFFF] border-[#FFFFFF]' : 'text-[#A3A3A3]'}>
                          {k} {k === 1 ? 'rook' : 'rooks'}
                        </Badge>
                      </div>

                      <p className="text-[11px] text-[#A3A3A3] leading-relaxed font-sans">
                        {k === 0 ? (
                          <span>Trivial baseline: 1 way to place 0 rooks (the unconstrained board).</span>
                        ) : k === 1 ? (
                          <span>{coeff} ways to place 1 rook on any forbidden cell.</span>
                        ) : coeff > 0 ? (
                          <span>{coeff} ways to place {k} non-attacking rooks on forbidden cells.</span>
                        ) : (
                          <span className="text-[#737373]">Impossible to place {k} non-attacking rooks on this board.</span>
                        )}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* 4. INTERACTIVE ROOK PLACEMENT BOARD */}
          <Card className="p-5 space-y-5 border border-[#222E42] bg-[#121826]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#222E42]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-[#1E2638] border border-[#222E42] flex items-center justify-center text-sm font-bold text-[#FFFFFF]">
                    ♜
                  </span>
                  <h4 className="gw-card-heading">
                    Interactive Non-Attacking Rook Board Visualizer
                  </h4>
                  <Badge variant="default" size="sm" className="font-mono text-[#FFFFFF] border-[#334155]">
                    Degree k = {selectedDegree}
                  </Badge>
                </div>
                <p className="text-xs text-[#A3A3A3]">
                  Visual proof of non-attacking placements: every placed rook excludes its entire row and column from other rooks.
                </p>
              </div>

              {/* Attack Ray Toggle */}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs font-mono text-[#FFFFFF] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={highlightAttacks}
                    onChange={(e) => setHighlightAttacks(e.target.checked)}
                    className="rounded border-[#222E42] bg-[#1E2638] text-[#FFFFFF] focus:ring-white cursor-pointer"
                  />
                  <span>Show Attack Rays</span>
                </label>
              </div>
            </div>

            {/* Controls Bar: Degree Selector Tabs & Arrangement Navigator */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 rounded-xl bg-[#0D121F] border border-[#222E42]">
              {/* Degree Selector Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-mono text-[#A3A3A3] mr-1">Rooks (k):</span>
                {result.coefficients.map((coeff, k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setSelectedDegree(k)
                      setArrangementIndex(0)
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                      selectedDegree === k
                        ? 'bg-sky-500 text-slate-950 font-bold border-sky-400 shadow-xs'
                        : 'bg-[#121826] text-[#94A3B8] border-[#222E42] hover:text-[#F8FAFC] hover:border-sky-500/30 hover:bg-[#1E2638]'
                    }`}
                  >
                    k = {k} ({coeff})
                  </button>
                ))}
              </div>

              {/* Arrangement Navigator */}
              {selectedDegree > 0 && currentDegreePlacements.length > 0 && (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono text-[#A3A3A3]">
                    Arrangement <strong className="text-[#FFFFFF]">{arrangementIndex + 1}</strong> of{' '}
                    <strong className="text-[#FFFFFF]">{currentDegreePlacements.length}</strong>
                  </span>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={ChevronLeft}
                      onClick={() => setArrangementIndex((prev) => Math.max(0, prev - 1))}
                      disabled={arrangementIndex === 0}
                      title="Previous arrangement"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={ChevronRight}
                      onClick={() =>
                        setArrangementIndex((prev) => Math.min(currentDegreePlacements.length - 1, prev + 1))
                      }
                      disabled={arrangementIndex >= currentDegreePlacements.length - 1}
                      title="Next arrangement"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Board Notice for k = 0 */}
            {selectedDegree === 0 && (
              <div className="p-4 rounded-xl bg-[#0D121F] border border-[#222E42] text-xs text-[#FFFFFF] flex items-center gap-3">
                <Info className="w-5 h-5 text-[#FFFFFF] shrink-0" />
                <div>
                  <strong>Degree k = 0 (r₀ = 1):</strong> Represents the empty placement (zero rooks placed).
                  There are no conflicts or attack rays. This serves as the combinatorial baseline representing all unconstrained permutations.
                </div>
              </div>
            )}

            {/* Board Notice if r_k = 0 for k > 0 */}
            {selectedDegree > 0 && currentDegreePlacements.length === 0 && (
              <div className="p-4 rounded-xl bg-[#0D121F] border border-[#222E42] text-xs text-[#A3A3A3] flex items-center gap-3">
                <Ban className="w-5 h-5 shrink-0" />
                <div>
                  <strong>Zero Placements Possible:</strong> r_{selectedDegree} = 0.
                  No combination of {selectedDegree} forbidden cells can be selected such that no two share a row or column.
                </div>
              </div>
            )}

            {/* Board Grid Display */}
            {numRows > 0 && numCols > 0 && (
              <div className="overflow-x-auto rounded-xl border border-[#222E42] bg-[#0D121F] p-3">
                <table className="border-collapse select-none w-full min-w-[500px]">
                  <thead>
                    <tr>
                      <th className="p-2.5 text-left font-mono text-[11px] text-[#A3A3A3] uppercase tracking-wider border-b border-r border-[#222E42] min-w-[130px] sticky left-0 z-20 bg-[#121826]">
                        Flight \ Gate
                      </th>

                      {Array.from({ length: numCols }, (_, c) => {
                        const gate = gates[c]
                        const isColAttacked = highlightAttacks && attackedRays.attackedCols.has(c)
                        return (
                          <th
                            key={c}
                            className={`p-2.5 text-center font-mono text-xs border-b border-[#222E42] min-w-[70px] transition-colors ${
                              isColAttacked
                                ? 'bg-[#1E2638] text-[#FFFFFF] font-bold border-b-2 border-white'
                                : 'text-[#A3A3A3]'
                            }`}
                          >
                            <div className="flex flex-col items-center">
                              <span className="font-bold text-[#FFFFFF]">
                                {gate?.gateNumber || `G${c + 1}`}
                              </span>
                              <span className="text-[9px] text-[#737373]">
                                Col {c + 1}
                              </span>
                            </div>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#333333]">
                    {Array.from({ length: numRows }, (_, r) => {
                      const flight = flights[r]
                      const isRowAttacked = highlightAttacks && attackedRays.attackedRows.has(r)

                      return (
                        <tr
                          key={r}
                          className={`transition-colors ${
                            isRowAttacked ? 'bg-[#1E2638]/40' : 'hover:bg-[#121826]'
                          }`}
                        >
                          <td
                            className={`p-2.5 font-mono text-xs border-r border-[#222E42] sticky left-0 z-10 transition-colors ${
                              isRowAttacked
                                ? 'bg-[#1E2638] text-[#FFFFFF] font-bold border-r-2 border-white'
                                : 'bg-[#121826] text-[#A3A3A3]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-[#FFFFFF]">
                                {flight?.flightNumber || `Flight ${r + 1}`}
                              </span>
                              <span className="text-[9px] text-[#737373]">
                                R{r + 1}
                              </span>
                            </div>
                          </td>

                          {Array.from({ length: numCols }, (_, c) => {
                            const isForbidden = matrix[r]?.[c] === 1
                            const cellKey = `${r}-${c}`
                            const rookNumber = attackedRays.rookCellMap.get(cellKey)
                            const hasRook = rookNumber !== undefined

                            const inAttackRow = highlightAttacks && attackedRays.attackedRows.has(r)
                            const inAttackCol = highlightAttacks && attackedRays.attackedCols.has(c)
                            const inAttackZone = (inAttackRow || inAttackCol) && !hasRook

                            return (
                              <td
                                key={c}
                                className={`p-1.5 text-center transition-all relative border border-[#222E42] ${
                                  hasRook
                                    ? 'bg-sky-500 text-slate-950 font-bold border-2 border-sky-400 shadow-sm shadow-sky-500/20'
                                    : isForbidden
                                    ? inAttackZone
                                      ? 'bg-rose-950/40 border border-rose-500/50 text-rose-300/60'
                                      : 'bg-rose-950/30 border border-rose-500/40 text-rose-200'
                                    : inAttackZone
                                    ? 'bg-[#121826]/60 border-[#222E42] text-slate-600'
                                    : 'bg-[#121826] hover:bg-[#1E2638] text-slate-400'
                                }`}
                              >
                                {hasRook ? (
                                  <div className="py-1 px-1 flex flex-col items-center justify-center">
                                    <span className="text-xl leading-none text-slate-950">
                                      ♜
                                    </span>
                                    <span className="text-[9px] font-mono font-bold text-slate-950 mt-0.5">
                                      Rook {rookNumber}
                                    </span>
                                  </div>
                                ) : isForbidden ? (
                                  <div className="py-2 px-1 flex flex-col items-center justify-center">
                                    <span className="text-xs font-mono font-bold text-[#FFFFFF]">
                                      1
                                    </span>
                                    <span className="text-[8px] font-mono text-[#A3A3A3] uppercase">
                                      Forbid
                                    </span>
                                  </div>
                                ) : (
                                  <div className="py-2 px-1 flex flex-col items-center justify-center opacity-60">
                                    <span className="text-xs font-mono text-[#737373]">
                                      0
                                    </span>
                                    <span className="text-[8px] font-mono text-[#737373]">
                                      Open
                                    </span>
                                  </div>
                                )}

                                {inAttackZone && (
                                  <div className="absolute inset-0 border border-dashed border-[#334155]/60 pointer-events-none" />
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Placed Rooks Summary Chips */}
            {activeArrangement.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#222E42]">
                <span className="text-xs font-mono text-[#A3A3A3] font-semibold uppercase tracking-wider block">
                  Active Coordinates for Arrangement {arrangementIndex + 1}:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {activeArrangement.map((rook, rIdx) => {
                    const flightName = flights[rook.row]?.flightNumber || `Flight ${rook.row + 1}`
                    const gateName = gates[rook.col]?.gateNumber || `Gate ${rook.col + 1}`

                    return (
                      <div
                        key={rIdx}
                        className="px-3 py-1.5 rounded-lg bg-[#1E2638] border border-[#222E42] text-xs font-mono flex items-center gap-2 text-[#FFFFFF]"
                      >
                        <span className="font-bold">♜ Rook {rIdx + 1}:</span>
                        <span className="text-[#E5E5E5]">
                          {flightName} (Row {rook.row + 1}) ↔ {gateName} (Col {rook.col + 1})
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </Card>

          {/* 5. EDUCATIONAL EXPLANATION */}
          <Card className="p-5 space-y-4 bg-[#121826] border-[#222E42]">
            <div className="flex items-center gap-2.5 pb-2 border-b border-[#222E42]">
              <Info className="w-5 h-5 text-[#FFFFFF] shrink-0" />
              <h4 className="gw-card-heading">
                Mathematical Theory & Combinatorial Interpretation
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed text-[#A3A3A3]">
              <div className="p-4 rounded-xl bg-[#0D121F] border border-[#222E42] space-y-2">
                <h5 className="font-mono font-bold text-[#FFFFFF] text-sm flex items-center gap-1.5">
                  <span>1. Why is r₀ = 1?</span>
                </h5>
                <p>
                  By combinatorial definition, there is exactly <strong className="text-[#FFFFFF]">1 way</strong> to place 0 rooks on any board (the empty set).
                  Algebraically, r₀ represents the coefficient of x⁰, serving as the baseline for unconstrained assignment permutations (n!).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0D121F] border border-[#222E42] space-y-2">
                <h5 className="font-mono font-bold text-[#FFFFFF] text-sm flex items-center gap-1.5">
                  <span>2. Why does r₁ equal Forbidden Count?</span>
                </h5>
                <p>
                  Placing a single rook requires picking exactly one forbidden cell. Because there are no other rooks on the board to conflict with,
                  any forbidden cell is mutually non-attacking. Therefore, <strong className="text-[#FFFFFF]">r₁ is always identical to the count of 1s in matrix B</strong> ({totalForbidden}).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0D121F] border border-[#222E42] space-y-2">
                <h5 className="font-mono font-bold text-[#FFFFFF] text-sm flex items-center gap-1.5">
                  <span>3. Non-Attacking Rooks & Simultaneous Violations</span>
                </h5>
                <p>
                  In chess, rooks attack along entire rows and columns. In gate allocation, assigning flight i to gate j where b_ij = 1 is a forbidden violation.
                  A valid placement of k non-attacking rooks means selecting k distinct flights and k distinct gates that are all simultaneously forbidden.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0D121F] border border-[#222E42] space-y-2">
                <h5 className="font-mono font-bold text-[#FFFFFF] text-sm flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#FFFFFF]" />
                  <span>4. Phase 11 Scope vs Phase 12 Valid Assignments</span>
                </h5>
                <p className="text-[#E5E5E5]">
                  <strong>Important Distinction:</strong> The Rook Polynomial R(B, x) enumerates <strong className="text-[#FFFFFF]">forbidden conflict combinations</strong> only.
                  It does <strong className="text-[#FFFFFF]">NOT</strong> yet produce the final count of conflict-free flight allocations.
                  Computing the number of valid allocations N will be performed via the Principle of Inclusion-Exclusion:
                  <span className="block mt-1 font-mono text-[11px] text-[#FFFFFF]">
                    N = ∑ (-1)^k · r_k · (n - k)!
                  </span>
                </p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

export default RookPolynomialVisualizer
