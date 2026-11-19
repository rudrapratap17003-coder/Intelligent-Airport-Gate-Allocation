import React, { useState, useMemo, useCallback } from 'react'
import {
  Sparkles,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Info,
  Clock,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  Ban,
  Layers,
  HelpCircle,
  Eye,
  Grid
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
  // Calculation result state
  const [result, setResult] = useState(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState(null)

  // Interactive arrangement navigation state
  const [selectedDegree, setSelectedDegree] = useState(1)
  const [arrangementIndex, setArrangementIndex] = useState(0)
  const [highlightAttacks, setHighlightAttacks] = useState(true)

  // Execute rook polynomial computation
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

      // Set initial degree to 1 if forbidden cells exist, else 0
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

  // Automatically compute on matrix change if autoCalculate is enabled
  React.useEffect(() => {
    if (autoCalculate && matrix && matrix.length > 0 && matrix[0] && matrix[0].length > 0) {
      handleCalculate()
    }
  }, [autoCalculate, matrix, handleCalculate])

  // Available placements for the currently selected degree
  const currentDegreePlacements = useMemo(() => {
    if (!result || !result.placementsByDegree || selectedDegree === 0) {
      return []
    }
    return result.placementsByDegree[selectedDegree] || []
  }, [result, selectedDegree])

  // Active placement coordinates for the board
  const activeArrangement = useMemo(() => {
    if (!currentDegreePlacements || currentDegreePlacements.length === 0) {
      return []
    }
    const idx = Math.min(arrangementIndex, currentDegreePlacements.length - 1)
    return currentDegreePlacements[idx] || []
  }, [currentDegreePlacements, arrangementIndex])

  // Precompute row and column sets attacked by placed rooks
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

  // Matrix dimensions
  const numRows = matrix?.length || 0
  const numCols = matrix?.[0]?.length || 0

  // Normalized result metadata
  const matrixRows = result?.matrixDimensions?.rows ?? result?.dimensions?.rows ?? numRows
  const matrixCols = result?.matrixDimensions?.columns ?? result?.dimensions?.columns ?? numCols
  const totalForbidden = result?.forbiddenCellCount ?? result?.forbiddenCount ?? 0
  const coefficientsList = (result?.coefficientsNumeric || result?.coefficients || []).map(Number)

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ----------------- 1. ACTION & SCENARIO HEADER ----------------- */}
      <Card className="p-5 border-[#1e3a5f]/80 bg-gw-bg-secondary/70">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono uppercase tracking-wider text-gw-cyan font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-gw-cyan" />
                Phase 11 Combinatorial Engine
              </span>
              {scenarioId && (
                <Badge variant="cyan" size="sm" className="font-mono">
                  {scenarioId}
                </Badge>
              )}
              <Badge variant="default" size="sm" className="font-mono">
                {numRows} × {numCols} Board
              </Badge>
            </div>
            <h3 className="text-lg font-bold text-gw-text">
              Rook Polynomial Analysis — {scenarioName}
            </h3>
            <p className="text-xs text-gw-text-secondary">
              Enumerate non-attacking rook configurations on forbidden cells $B$ using dynamic programming with column bitmasks.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="primary"
              size="md"
              icon={Calculator}
              onClick={handleCalculate}
              disabled={isCalculating || numRows === 0 || numCols === 0}
              className="shadow-lg shadow-gw-cyan/10 font-mono"
            >
              {isCalculating ? 'Computing Polynomial...' : 'CALCULATE ROOK POLYNOMIAL'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-gw-error/15 border border-gw-error/30 text-xs text-gw-error flex items-center gap-2">
            <Ban className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </Card>

      {/* ----------------- 2. POLYNOMIAL EXPRESSION & METRICS ----------------- */}
      {result && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
            <Card className="p-3 text-center bg-gw-bg-secondary/40 border-[#1e3a5f]/60">
              <span className="text-[10px] uppercase tracking-wider text-gw-text-secondary block font-sans font-medium">
                Scenario
              </span>
              <span className="text-sm font-bold text-gw-text truncate block mt-0.5" title={scenarioName}>
                {scenarioId || 'Active'}
              </span>
              <span className="text-[10px] text-gw-text-secondary font-sans truncate block">
                {scenarioName}
              </span>
            </Card>

            <Card className="p-3 text-center bg-gw-bg-secondary/40 border-[#1e3a5f]/60">
              <span className="text-[10px] uppercase tracking-wider text-gw-cyan block font-sans font-medium">
                Dimensions
              </span>
              <span className="text-lg font-extrabold text-gw-cyan mt-0.5 block">
                {matrixRows} × {matrixCols}
              </span>
              <span className="text-[10px] text-gw-text-secondary font-sans">
                Rows × Columns
              </span>
            </Card>

            <Card className="p-3 text-center bg-gw-bg-secondary/40 border-[#1e3a5f]/60">
              <span className="text-[10px] uppercase tracking-wider text-gw-error block font-sans font-medium">
                Forbidden Cells (r₁)
              </span>
              <span className="text-lg font-extrabold text-gw-error mt-0.5 block">
                {totalForbidden}
              </span>
              <span className="text-[10px] text-gw-text-secondary font-sans">
                1-Rook positions
              </span>
            </Card>

            <Card className="p-3 text-center bg-gw-bg-secondary/40 border-[#1e3a5f]/60">
              <span className="text-[10px] uppercase tracking-wider text-gw-warning block font-sans font-medium">
                Degree (k)
              </span>
              <span className="text-lg font-extrabold text-gw-warning mt-0.5 block">
                deg = {result.degree}
              </span>
              <span className="text-[10px] text-gw-text-secondary font-sans">
                min(m, n) = {Math.min(matrixRows, matrixCols)}
              </span>
            </Card>

            <Card className="p-3 text-center bg-gw-bg-secondary/40 border-[#1e3a5f]/60">
              <span className="text-[10px] uppercase tracking-wider text-gw-success block font-sans font-medium">
                Compute Time
              </span>
              <span className="text-lg font-extrabold text-gw-success mt-0.5 block">
                {result.computationTimeMs} ms
              </span>
              <span className="text-[10px] text-gw-text-secondary font-sans">
                Client DP Execution
              </span>
            </Card>

            <Card className="p-3 text-center bg-gw-bg-secondary/40 border-[#1e3a5f]/60">
              <span className="text-[10px] uppercase tracking-wider text-gw-blue block font-sans font-medium">
                Algorithm
              </span>
              <span className="text-xs font-bold text-gw-blue mt-1 block truncate" title={result.algorithm}>
                Bitmask DP
              </span>
              <span className="text-[10px] text-gw-text-secondary font-sans">
                O(m · 2^min(m,n))
              </span>
            </Card>
          </div>

          {/* Formatted Polynomial Equation Banner */}
          <Card className="p-6 border-gw-cyan/40 bg-gw-bg-secondary/80 space-y-3 shadow-xl shadow-gw-cyan/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1e3a5f]/50 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-gw-cyan" />
                <h4 className="text-sm font-bold uppercase tracking-wider font-mono text-gw-text">
                  Evaluated Rook Polynomial Formula R(B, x)
                </h4>
              </div>
              <Badge variant="cyan" size="sm" className="font-mono">
                Exact Integer Form
              </Badge>
            </div>

            <div className="p-4 rounded-xl bg-gw-bg-primary/80 border border-[#1e3a5f] overflow-x-auto text-center">
              <div className="text-xl sm:text-2xl md:text-3xl font-mono font-extrabold text-gw-cyan tracking-wide">
                R(B, x) = {result.polynomial}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gw-text-secondary font-mono">
              <span>
                Standard form: <strong className="text-gw-text">R(x) = r₀ + r₁x + r₂x² + ... + rₖxᵏ</strong>
              </span>
              <span>
                {result.isTransposed && (
                  <span className="text-gw-blue">
                    * Transposed internally (columns &gt; rows) for optimal DP state complexity.
                  </span>
                )}
              </span>
            </div>
          </Card>

          {/* ----------------- 3. COEFFICIENTS ITEMIZATION ----------------- */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#1e3a5f]/50">
              <div>
                <h4 className="gw-card-heading flex items-center gap-2">
                  <Layers className="w-4 h-4 text-gw-cyan" />
                  Individual Coefficients Breakdown (r₀ through r_{result.degree})
                </h4>
                <p className="text-xs text-gw-text-secondary mt-0.5">
                  Click any coefficient card below to visualize its corresponding non-attacking rook arrangements on the board.
                </p>
              </div>
              <span className="text-xs font-mono text-gw-text-secondary">
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
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'bg-gw-cyan/15 border-gw-cyan shadow-md shadow-gw-cyan/10'
                        : 'bg-gw-bg-secondary/50 border-[#1e3a5f]/60 hover:border-gw-cyan/50 hover:bg-gw-bg-secondary/80'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl font-mono font-bold flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? 'bg-gw-cyan text-gw-bg font-extrabold border-gw-cyan'
                          : 'bg-gw-cyan/10 border-gw-cyan/30 text-gw-cyan'
                      }`}
                    >
                      r{k}
                    </div>

                    <div className="text-xs font-mono space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gw-text text-sm">
                          r{k} = {coeff.toLocaleString()}
                        </span>
                        <Badge variant={coeff > 0 ? (isSelected ? 'cyan' : 'default') : 'warning'} size="sm">
                          {k} {k === 1 ? 'rook' : 'rooks'}
                        </Badge>
                      </div>

                      <p className="text-[11px] text-gw-text-secondary leading-relaxed font-sans">
                        {k === 0 ? (
                          <span>Trivial baseline: 1 way to place 0 rooks (the unconstrained board).</span>
                        ) : k === 1 ? (
                          <span>{coeff} ways to place 1 rook on any forbidden cell.</span>
                        ) : coeff > 0 ? (
                          <span>{coeff} ways to place {k} non-attacking rooks on forbidden cells.</span>
                        ) : (
                          <span className="text-gw-warning">Impossible to place {k} non-attacking rooks on this board.</span>
                        )}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* ----------------- 4. INTERACTIVE ROOK PLACEMENT BOARD ----------------- */}
          <Card className="p-5 space-y-5 border-2 border-[#1e3a5f]/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e3a5f]/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-gw-cyan/15 border border-gw-cyan/30 flex items-center justify-center text-sm font-bold text-gw-cyan">
                    ♜
                  </span>
                  <h4 className="gw-card-heading">
                    Interactive Non-Attacking Rook Board Visualizer
                  </h4>
                  <Badge variant="cyan" size="sm" className="font-mono">
                    Degree k = {selectedDegree}
                  </Badge>
                </div>
                <p className="text-xs text-gw-text-secondary">
                  Visual proof of non-attacking placements: every placed rook excludes its entire row and column from other rooks.
                </p>
              </div>

              {/* Attack Ray Toggle */}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs font-mono text-gw-text cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={highlightAttacks}
                    onChange={(e) => setHighlightAttacks(e.target.checked)}
                    className="rounded border-[#1e3a5f] bg-gw-bg-secondary text-gw-cyan focus:ring-gw-cyan cursor-pointer"
                  />
                  <span>Show Attack Rays</span>
                </label>
              </div>
            </div>

            {/* Controls Bar: Degree Selector Tabs & Arrangement Navigator */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 rounded-xl bg-gw-bg-primary/70 border border-[#1e3a5f]">
              {/* Degree Selector Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-mono text-gw-text-secondary mr-1">Rooks (k):</span>
                {result.coefficients.map((coeff, k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setSelectedDegree(k)
                      setArrangementIndex(0)
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border cursor-pointer ${
                      selectedDegree === k
                        ? 'bg-gw-cyan text-gw-bg border-gw-cyan shadow-sm shadow-gw-cyan/20'
                        : 'bg-gw-bg-secondary text-gw-text-secondary border-[#1e3a5f] hover:text-gw-text hover:border-gw-cyan/40'
                    }`}
                  >
                    k = {k} ({coeff})
                  </button>
                ))}
              </div>

              {/* Arrangement Navigator (for k >= 1 and r_k > 0) */}
              {selectedDegree > 0 && currentDegreePlacements.length > 0 && (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono text-gw-text-secondary">
                    Arrangement <strong className="text-gw-cyan">{arrangementIndex + 1}</strong> of{' '}
                    <strong className="text-gw-text">{currentDegreePlacements.length}</strong>
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
              <div className="p-4 rounded-xl bg-gw-bg-primary/80 border border-gw-cyan/30 text-xs text-gw-text flex items-center gap-3">
                <Info className="w-5 h-5 text-gw-cyan shrink-0" />
                <div>
                  <strong>Degree k = 0 (r₀ = 1):</strong> Represents the empty placement (zero rooks placed).
                  There are no conflicts or attack rays. This serves as the combinatorial baseline representing all unconstrained permutations.
                </div>
              </div>
            )}

            {/* Board Notice if r_k = 0 for k > 0 */}
            {selectedDegree > 0 && currentDegreePlacements.length === 0 && (
              <div className="p-4 rounded-xl bg-gw-warning/10 border border-gw-warning/30 text-xs text-gw-warning flex items-center gap-3">
                <Ban className="w-5 h-5 shrink-0" />
                <div>
                  <strong>Zero Placements Possible:</strong> r_{selectedDegree} = 0.
                  No combination of {selectedDegree} forbidden cells can be selected such that no two share a row or column.
                </div>
              </div>
            )}

            {/* Board Grid Display */}
            {numRows > 0 && numCols > 0 && (
              <div className="overflow-x-auto rounded-xl border border-[#1e3a5f] bg-gw-bg-primary/60 shadow-inner p-3">
                <table className="border-collapse select-none w-full min-w-[500px]">
                  <thead>
                    <tr>
                      {/* Top-left corner */}
                      <th className="p-2.5 text-left font-mono text-[11px] text-gw-text-secondary uppercase tracking-wider border-b border-r border-[#1e3a5f]/60 min-w-[130px] sticky left-0 z-20 bg-gw-bg-secondary">
                        Flight \ Gate
                      </th>

                      {/* Gate Column Headers */}
                      {Array.from({ length: numCols }, (_, c) => {
                        const gate = gates[c]
                        const isColAttacked = highlightAttacks && attackedRays.attackedCols.has(c)
                        return (
                          <th
                            key={c}
                            className={`p-2.5 text-center font-mono text-xs border-b border-[#1e3a5f]/60 min-w-[70px] transition-colors ${
                              isColAttacked
                                ? 'bg-gw-cyan/20 text-gw-cyan font-bold border-b-2 border-gw-cyan'
                                : 'text-gw-text-secondary'
                            }`}
                          >
                            <div className="flex flex-col items-center">
                              <span className="font-bold text-gw-text">
                                {gate?.gateNumber || `G${c + 1}`}
                              </span>
                              <span className="text-[9px] text-gw-text-secondary opacity-75">
                                Col {c + 1}
                              </span>
                            </div>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#1e3a5f]/40">
                    {Array.from({ length: numRows }, (_, r) => {
                      const flight = flights[r]
                      const isRowAttacked = highlightAttacks && attackedRays.attackedRows.has(r)

                      return (
                        <tr
                          key={r}
                          className={`transition-colors ${
                            isRowAttacked ? 'bg-gw-cyan/[0.04]' : 'hover:bg-white/[0.01]'
                          }`}
                        >
                          {/* Flight Row Header */}
                          <td
                            className={`p-2.5 font-mono text-xs border-r border-[#1e3a5f]/60 sticky left-0 z-10 transition-colors ${
                              isRowAttacked
                                ? 'bg-gw-cyan/15 text-gw-cyan font-bold border-r-2 border-gw-cyan'
                                : 'bg-gw-bg-secondary text-gw-text-secondary'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-gw-text">
                                {flight?.flightNumber || `Flight ${r + 1}`}
                              </span>
                              <span className="text-[9px] text-gw-text-secondary opacity-75">
                                R{r + 1}
                              </span>
                            </div>
                          </td>

                          {/* Matrix Cells */}
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
                                className={`p-1.5 text-center transition-all relative border border-[#1e3a5f]/30 ${
                                  hasRook
                                    ? 'bg-gw-cyan/25 border-gw-cyan ring-2 ring-gw-cyan shadow-lg shadow-gw-cyan/20'
                                    : isForbidden
                                    ? inAttackZone
                                      ? 'bg-gw-error/25 border-gw-error/40'
                                      : 'bg-gw-error/15 border-gw-error/30'
                                    : inAttackZone
                                    ? 'bg-gw-cyan/[0.05] border-[#1e3a5f]/50'
                                    : 'bg-gw-bg-secondary/40 hover:bg-white/[0.03]'
                                }`}
                              >
                                {hasRook ? (
                                  <div className="py-1 px-1 flex flex-col items-center justify-center animate-scaleIn">
                                    <span className="text-xl leading-none text-gw-cyan drop-shadow-md">
                                      ♜
                                    </span>
                                    <span className="text-[9px] font-mono font-bold text-gw-cyan mt-0.5">
                                      Rook {rookNumber}
                                    </span>
                                  </div>
                                ) : isForbidden ? (
                                  <div className="py-2 px-1 flex flex-col items-center justify-center">
                                    <span className="text-xs font-mono font-bold text-gw-error">
                                      1
                                    </span>
                                    <span className="text-[8px] font-mono text-gw-error/70 uppercase">
                                      Forbid
                                    </span>
                                  </div>
                                ) : (
                                  <div className="py-2 px-1 flex flex-col items-center justify-center opacity-60">
                                    <span className="text-xs font-mono text-gw-text-secondary">
                                      0
                                    </span>
                                    <span className="text-[8px] font-mono text-gw-text-secondary/60">
                                      Open
                                    </span>
                                  </div>
                                )}

                                {/* Subtle attack ray crosshair indicator */}
                                {inAttackZone && (
                                  <div className="absolute inset-0 border border-dashed border-gw-cyan/20 pointer-events-none" />
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
              <div className="space-y-2 pt-2 border-t border-[#1e3a5f]/40">
                <span className="text-xs font-mono text-gw-text-secondary font-semibold uppercase tracking-wider block">
                  Active Coordinates for Arrangement {arrangementIndex + 1}:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {activeArrangement.map((rook, rIdx) => {
                    const flightName = flights[rook.row]?.flightNumber || `Flight ${rook.row + 1}`
                    const gateName = gates[rook.col]?.gateNumber || `Gate ${rook.col + 1}`

                    return (
                      <div
                        key={rIdx}
                        className="px-3 py-1.5 rounded-lg bg-gw-cyan/15 border border-gw-cyan/40 text-xs font-mono flex items-center gap-2 text-gw-cyan"
                      >
                        <span className="font-bold">♜ Rook {rIdx + 1}:</span>
                        <span className="text-gw-text">
                          {flightName} (Row {rook.row + 1}) ↔ {gateName} (Col {rook.col + 1})
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </Card>

          {/* ----------------- 5. EDUCATIONAL EXPLANATION ----------------- */}
          <Card className="p-5 space-y-4 bg-gw-bg-secondary/60 border-[#1e3a5f]">
            <div className="flex items-center gap-2.5 pb-2 border-b border-[#1e3a5f]/50">
              <Info className="w-5 h-5 text-gw-cyan shrink-0" />
              <h4 className="gw-card-heading">
                Mathematical Theory & Combinatorial Interpretation
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed text-gw-text-secondary">
              <div className="p-4 rounded-xl bg-gw-bg-primary/60 border border-[#1e3a5f] space-y-2">
                <h5 className="font-mono font-bold text-gw-cyan text-sm flex items-center gap-1.5">
                  <span>1. Why is r₀ = 1?</span>
                </h5>
                <p>
                  By combinatorial definition, there is exactly <strong className="text-gw-text">1 way</strong> to place 0 rooks on any board (the empty set).
                  Algebraically, $r_0$ represents the coefficient of $x^0$, serving as the baseline for unconstrained assignment permutations ($n!$).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-gw-bg-primary/60 border border-[#1e3a5f] space-y-2">
                <h5 className="font-mono font-bold text-gw-cyan text-sm flex items-center gap-1.5">
                  <span>2. Why does r₁ equal Forbidden Count?</span>
                </h5>
                <p>
                  Placing a single rook requires picking exactly one forbidden cell. Because there are no other rooks on the board to conflict with,
                  any forbidden cell is mutually non-attacking. Therefore, <strong className="text-gw-text">r₁ is always identical to the count of 1s in matrix B</strong> ({totalForbidden}).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-gw-bg-primary/60 border border-[#1e3a5f] space-y-2">
                <h5 className="font-mono font-bold text-gw-cyan text-sm flex items-center gap-1.5">
                  <span>3. Non-Attacking Rooks & Simultaneous Violations</span>
                </h5>
                <p>
                  In chess, rooks attack along entire rows and columns. In gate allocation, assigning flight i to gate j where bᵢⱼ = 1 is a forbidden violation.
                  A valid placement of $k$ non-attacking rooks means selecting $k$ distinct flights and $k$ distinct gates that are all simultaneously forbidden.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-gw-bg-primary/60 border border-gw-warning/40 bg-gw-warning/[0.02] space-y-2">
                <h5 className="font-mono font-bold text-gw-warning text-sm flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-gw-warning" />
                  <span>4. Phase 11 Scope vs Phase 12 Valid Assignments</span>
                </h5>
                <p className="text-gw-text">
                  <strong>Important Distinction:</strong> The Rook Polynomial $R(B, x)$ enumerates <strong className="text-gw-error">forbidden conflict combinations</strong> only.
                  It does <strong className="text-gw-warning">NOT</strong> yet produce the final count of conflict-free flight allocations.
                  Computing the number of valid allocations $N$ will be performed in <strong className="text-gw-cyan">Phase 12</strong> via the Principle of Inclusion-Exclusion:
                  <span className="block mt-1 font-mono text-[11px] text-gw-cyan">
                    N = ∑ₖ₌₀ⁿ (-1)ᵏ · rₖ · (n - k)!
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
