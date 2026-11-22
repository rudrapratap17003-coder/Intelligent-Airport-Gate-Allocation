import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  Grid3X3,
  Calculator,
  Layers,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Eye,
  PlayCircle,
  Zap,
  RefreshCw
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import mathExplorerService from '../lib/mathExplorerService'

// Available Board Presets
const PRESETS = [
  {
    id: 'empty',
    name: 'Unrestricted (Empty)',
    desc: 'Zero restrictions. Feasibility = 100%, N = n!',
    generator: (n) => Array(n).fill(0).map(() => Array(n).fill(0))
  },
  {
    id: 'derangement',
    name: 'Derangement (Diagonal)',
    desc: 'Forbidden diagonal (subcontiguity). Classic de Montmort derangement problem.',
    generator: (n) => Array(n).fill(0).map((_, r) => Array(n).fill(0).map((_, c) => (r === c ? 1 : 0)))
  },
  {
    id: 'upper_triangular',
    name: 'Upper Triangular',
    desc: 'Ascending gate clearance constraints (flight i cannot use gate j >= i).',
    generator: (n) => Array(n).fill(0).map((_, r) => Array(n).fill(0).map((_, c) => (c >= r ? 1 : 0)))
  },
  {
    id: 'bottleneck',
    name: 'Gate Bottleneck',
    desc: 'Gate 1 completely disabled for all flights (column 0 = 1).',
    generator: (n) => Array(n).fill(0).map(() => Array(n).fill(0).map((_, c) => (c === 0 ? 1 : 0)))
  },
  {
    id: 'full',
    name: 'Full Blockade',
    desc: '100% restricted. Completely infeasible (N = 0).',
    generator: (n) => Array(n).fill(0).map(() => Array(n).fill(1))
  }
]

export const MathExplorer = () => {
  // Navigation tabs: 'sandbox' | 'permutations' | 'rook_puzzle' | 'pie_theory'
  const [activeTab, setActiveTab] = useState('sandbox')

  // Sandbox state
  const [matrixSize, setMatrixSize] = useState(4)
  const [matrix, setMatrix] = useState(() => PRESETS[1].generator(4))
  const [evalResult, setEvalResult] = useState(null)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [evalError, setEvalError] = useState(null)
  const [selectedAllocationIdx, setSelectedAllocationIdx] = useState(0)

  // Rook Puzzle state (manual rook placement on forbidden cells)
  const [placedRooks, setPlacedRooks] = useState([]) // Array of [row, col]

  // Permutation Explorer state
  const [permN, setPermN] = useState(4)
  const [permData, setPermData] = useState(null)
  const [isLoadingPerms, setIsLoadingPerms] = useState(false)

  // 1. Evaluate Sandbox Matrix whenever matrix changes
  const evaluateSandbox = useCallback(async (currentMatrix) => {
    try {
      setIsEvaluating(true)
      setEvalError(null)
      const data = await mathExplorerService.evaluateMatrix(currentMatrix, true, 8)
      setEvalResult(data)
      setSelectedAllocationIdx(0)
    } catch (err) {
      console.error('Failed to evaluate matrix in Math Explorer:', err)
      setEvalError(err.message || 'Matrix evaluation failed')
    } finally {
      setIsEvaluating(false)
    }
  }, [])

  // Initial mount & size change
  useEffect(() => {
    evaluateSandbox(matrix)
  }, [matrix, evaluateSandbox])

  // Handle matrix cell toggle
  const toggleCell = (r, c) => {
    const updated = matrix.map((rowArr, rowIdx) =>
      rowArr.map((val, colIdx) => (rowIdx === r && colIdx === c ? (val === 1 ? 0 : 1) : val))
    )
    setMatrix(updated)
    // Clear puzzle rooks on toggled cell
    setPlacedRooks((prev) => prev.filter(([pr, pc]) => !(pr === r && pc === c)))
  }

  // Handle Dimension Change
  const handleDimensionChange = (newSize) => {
    if (newSize === matrixSize) return
    setMatrixSize(newSize)
    const newMatrix = PRESETS[1].generator(newSize)
    setMatrix(newMatrix)
    setPlacedRooks([])
  }

  // Handle Preset Selection
  const applyPreset = (presetId) => {
    const preset = PRESETS.find((p) => p.id === presetId)
    if (preset) {
      const generated = preset.generator(matrixSize)
      setMatrix(generated)
      setPlacedRooks([])
    }
  }

  // 2. Load Permutations data
  const loadPermutations = useCallback(async (n) => {
    try {
      setIsLoadingPerms(true)
      const data = await mathExplorerService.explorePermutations(n, 48)
      setPermData(data)
    } catch (err) {
      console.error('Failed to load permutations:', err)
    } finally {
      setIsLoadingPerms(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'permutations') {
      loadPermutations(permN)
    }
  }, [activeTab, permN, loadPermutations])

  // 3. Rook Puzzle Conflicts Check
  const rookConflicts = useMemo(() => {
    const conflicts = new Set()
    for (let i = 0; i < placedRooks.length; i++) {
      for (let j = i + 1; j < placedRooks.length; j++) {
        const [r1, c1] = placedRooks[i]
        const [r2, c2] = placedRooks[j]
        if (r1 === r2 || c1 === c2) {
          conflicts.add(`${r1},${c1}`)
          conflicts.add(`${r2},${c2}`)
        }
      }
    }
    return conflicts
  }, [placedRooks])

  const togglePuzzleRook = (r, c) => {
    // Only allow placing rook on forbidden cells (B[r][c] === 1)
    if (matrix[r][c] !== 1) return

    setPlacedRooks((prev) => {
      const exists = prev.some(([pr, pc]) => pr === r && pc === c)
      if (exists) {
        return prev.filter(([pr, pc]) => !(pr === r && pc === c))
      } else {
        return [...prev, [r, c]]
      }
    })
  }

  // Bar chart data for rook coefficients
  const rookBarData = useMemo(() => {
    if (!evalResult?.rook_coefficients) return []
    return evalResult.rook_coefficients.map((coeff, k) => ({
      name: `r${k}`,
      rooks: k,
      count: coeff,
      meaning: evalResult.rook_details?.[k]?.meaning || `${coeff} placements`
    }))
  }, [evalResult])

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ----------------- 1. HEADER & TOP BAR ----------------- */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-[#222E42]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="gw-page-heading">Discrete Mathematics Explorer</h1>
            <Badge variant="default" size="sm" dot>
              Phase 24 Live
            </Badge>
          </div>
          <p className="text-sm text-gw-text-secondary leading-relaxed">
            Interactive educational laboratory explaining Permutations, Rook Polynomials $R(B, x)$, and the Principle of Inclusion-Exclusion with real-time combinatorial evaluation.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link to="/simulator">
            <Button size="md" icon={PlayCircle}>
              Open Simulator
            </Button>
          </Link>
          <Link to="/calculation">
            <Button size="md" variant="outline" icon={Calculator}>
              Step Engine
            </Button>
          </Link>
        </div>
      </div>

      {/* ----------------- 2. MODULE NAVIGATION TABS ----------------- */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#222E42] pb-3">
        <button
          onClick={() => setActiveTab('sandbox')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
            activeTab === 'sandbox'
              ? 'bg-sky-500 text-slate-950 font-bold shadow-xs'
              : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E2638]'
          }`}
        >
          <Grid3X3 className="w-4 h-4" />
          <span>Interactive Restriction Sandbox</span>
        </button>

        <button
          onClick={() => setActiveTab('rook_puzzle')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
            activeTab === 'rook_puzzle'
              ? 'bg-sky-500 text-slate-950 font-bold shadow-xs'
              : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E2638]'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Rook Placement Simulator</span>
          {placedRooks.length > 0 && (
            <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono ${
              activeTab === 'rook_puzzle'
                ? 'bg-slate-950 text-sky-400 font-bold'
                : 'bg-[#1E2638] text-sky-300 border border-[#222E42]'
            }`}>
              {placedRooks.length} placed
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('permutations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
            activeTab === 'permutations'
              ? 'bg-sky-500 text-slate-950 font-bold shadow-xs'
              : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E2638]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Permutation Explorer (n!)</span>
        </button>

        <button
          onClick={() => setActiveTab('pie_theory')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
            activeTab === 'pie_theory'
              ? 'bg-sky-500 text-slate-950 font-bold shadow-xs'
              : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E2638]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>PIE Theory & Derivations</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: INTERACTIVE RESTRICTION SANDBOX                                    */}
      {/* ========================================================================= */}
      {activeTab === 'sandbox' && (
        <div className="space-y-8">
          {/* Controls Bar: Dimension & Presets */}
          <Card className="p-5 border-[#222E42] bg-[#121826]">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Matrix Dimension Selector */}
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase font-mono tracking-wider text-gw-text-secondary">
                  Grid Dimension (n × n):
                </span>
                <div className="flex items-center gap-1.5 bg-[#0D121F] p-1 rounded-lg border border-[#222E42]">
                  {[2, 3, 4, 5, 6].map((size) => (
                    <button
                      key={size}
                      onClick={() => handleDimensionChange(size)}
                      className={`px-3 py-1 text-xs font-mono font-medium rounded transition-all ${
                        matrixSize === size
                          ? 'bg-[#FFFFFF] text-[#090909] font-bold shadow-sm'
                          : 'text-gw-text-secondary hover:text-gw-text'
                      }`}
                    >
                      {size}×{size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template Presets */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase font-mono tracking-wider text-gw-text-secondary mr-1">
                  Templates:
                </span>
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset.id)}
                    className="px-2.5 py-1 text-xs rounded-md border border-[#222E42] bg-[#1E2638] hover:border-[#334155] text-gw-text hover:text-white transition-all"
                    title={preset.desc}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Main Sandbox Grid & Live Mathematics Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Interactive Matrix Sandbox (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <Card className="p-5 border-[#222E42]">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#222E42]">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-semibold text-gw-text flex items-center gap-2">
                      <Grid3X3 className="w-4 h-4 text-white" />
                      Restriction Board B ({matrixSize} × {matrixSize})
                    </h3>
                    <p className="text-xs text-gw-text-secondary">
                      Click any cell to toggle <span className="text-white font-semibold">0 (Allowed)</span> vs <span className="text-[#A3A3A3] font-semibold">1 (Forbidden)</span>.
                    </p>
                  </div>
                  <Button
                    size="xs"
                    variant="ghost"
                    icon={RotateCcw}
                    onClick={() => applyPreset('empty')}
                  >
                    Clear
                  </Button>
                </div>

                {/* Grid Visualizer */}
                <div className="overflow-x-auto py-2">
                  <div className="inline-block min-w-full">
                    {/* Column Headers (Gates) */}
                    <div className="flex items-center gap-1.5 mb-1.5 pl-12">
                      {Array(matrixSize).fill(0).map((_, c) => (
                        <div
                          key={c}
                          className="w-12 text-center font-mono text-[11px] text-white font-bold"
                        >
                          G{c + 1}
                        </div>
                      ))}
                    </div>

                    {/* Matrix Rows */}
                    <div className="space-y-1.5">
                      {matrix.map((rowArr, r) => (
                        <div key={r} className="flex items-center gap-1.5">
                          {/* Row Header (Flight) */}
                          <div className="w-10 font-mono text-[11px] text-gw-text-secondary text-right pr-2 font-medium">
                            F{r + 1}
                          </div>

                          {/* Row Cells */}
                          {rowArr.map((cellVal, c) => (
                            <button
                              key={c}
                              onClick={() => toggleCell(r, c)}
                              className={`w-12 h-12 rounded-lg font-mono text-xs font-bold transition-all flex flex-col items-center justify-center border ${
                                cellVal === 1
                                  ? 'bg-[#0D121F] text-white border-2 border-[#334155] shadow-inner hover:bg-[#1E2638]'
                                  : 'bg-[#121826] text-[#737373] border-[#222E42] hover:border-[#334155] hover:bg-[#1E2638] hover:text-[#A3A3A3]'
                              }`}
                            >
                              <span>{cellVal}</span>
                              <span className="text-[9px] font-normal uppercase opacity-75">
                                {cellVal === 1 ? 'Forbid' : 'Allow'}
                              </span>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Matrix Legend */}
                <div className="mt-4 pt-3 border-t border-[#222E42] flex items-center justify-between text-xs text-gw-text-secondary">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-[#121826] border border-[#222E42]" />
                      0 = Allowed
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-[#0D121F] border-2 border-[#334155]" />
                      1 = Forbidden
                    </span>
                  </div>
                  <span className="font-mono text-white">
                    {evalResult?.forbidden_cell_count || 0} / {matrixSize * matrixSize} restricted ({evalResult?.restriction_density || 0}%)
                  </span>
                </div>
              </Card>

              {/* Bipartite Graph Mini Visualizer */}
              {evalResult && (
                <Card className="p-4 border-[#222E42]">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-gw-text uppercase font-mono tracking-wider flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-white" />
                      Bipartite Matchings ({evalResult.valid_assignments} Valid)
                    </h4>
                    {evalResult.sample_allocations?.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gw-text-secondary font-mono mr-1">
                          Sample #{selectedAllocationIdx + 1}:
                        </span>
                        {evalResult.sample_allocations.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedAllocationIdx(idx)}
                            className={`w-5 h-5 rounded text-[10px] font-mono transition-all ${
                              selectedAllocationIdx === idx
                                ? 'bg-[#FFFFFF] text-[#090909] font-bold'
                                : 'bg-[#1E2638] text-gw-text-secondary hover:text-gw-text'
                            }`}
                          >
                            {idx + 1}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Visual Match Table */}
                  {evalResult.valid_assignments === 0 ? (
                    <div className="p-4 text-center text-xs text-[#A3A3A3] font-mono bg-[#0D121F] rounded-lg border border-[#222E42]">
                      Zero valid bipartite matchings exist under these constraints.
                    </div>
                  ) : evalResult.sample_allocations?.[selectedAllocationIdx] ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                      {evalResult.sample_allocations[selectedAllocationIdx].map((pair, pIdx) => (
                        <div
                          key={pIdx}
                          className="p-2 rounded bg-[#1E2638] border border-[#222E42] flex items-center justify-between text-xs font-mono"
                        >
                          <span className="text-gw-text font-semibold">{pair.flight_id}</span>
                          <span className="text-[#737373]">→</span>
                          <span className="text-white font-bold">{pair.gate_id}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </Card>
              )}
            </div>

            {/* Right Column: Live Combinatorial Results & PIE Steps (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {evalError && (
                <div className="p-3 rounded-lg bg-[#0D121F] border border-[#334155] text-white text-xs font-mono">
                  Evaluation error: {evalError}
                </div>
              )}
              {/* Evaluated KPI Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative">
                {isEvaluating && (
                  <div className="absolute -top-3 right-0 flex items-center gap-1.5 text-[10px] text-white font-mono">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Evaluating...</span>
                  </div>
                )}
                <Card className="p-3.5 border-[#222E42] bg-[#121826]">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-gw-text-secondary block mb-1">
                    Total Permutations
                  </span>
                  <div className="text-xl font-bold font-mono text-white">
                    {evalResult?.total_possible_assignments?.toLocaleString() || '...'}
                  </div>
                  <span className="text-[10px] text-gw-text-secondary font-mono">
                    n! = {matrixSize}!
                  </span>
                </Card>

                <Card className="p-3.5 border-[#222E42] bg-[#121826]">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-gw-text-secondary block mb-1">
                    Valid Assignments (N)
                  </span>
                  <div className="text-xl font-bold font-mono text-white">
                    {evalResult?.valid_assignments?.toLocaleString() ?? '...'}
                  </div>
                  <span className="text-[10px] text-[#A3A3A3] font-mono">
                    {evalResult?.feasibility_percentage ?? 0}% feasible
                  </span>
                </Card>

                <Card className="p-3.5 border-[#222E42] bg-[#121826]">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-gw-text-secondary block mb-1">
                    Violations Blocked
                  </span>
                  <div className="text-xl font-bold font-mono text-white">
                    {evalResult?.invalid_assignments?.toLocaleString() ?? '...'}
                  </div>
                  <span className="text-[10px] text-[#A3A3A3] font-mono">
                    n! - N invalid
                  </span>
                </Card>

                <Card className="p-3.5 border-[#222E42] bg-[#121826]">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-gw-text-secondary block mb-1">
                    Max Rook Placements
                  </span>
                  <div className="text-xl font-bold font-mono text-white">
                    {evalResult?.rook_coefficients ? evalResult.rook_coefficients.length - 1 : 0}
                  </div>
                  <span className="text-[10px] text-[#A3A3A3] font-mono">
                    Degree of R(B, x)
                  </span>
                </Card>
              </div>

              {/* Exact Rook Polynomial Formulation */}
              <Card className="p-5 border-[#222E42] bg-[#121826]">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#222E42]">
                  <span className="text-xs uppercase font-mono tracking-wider text-white font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Exact Rook Polynomial R(B, x)
                  </span>
                  <Badge variant="default" size="xs">
                    Row Bitmask DP
                  </Badge>
                </div>
                <div className="p-3.5 rounded-lg bg-[#0D121F] border border-[#222E42] font-mono text-sm sm:text-base text-white font-bold tracking-wide overflow-x-auto">
                  {evalResult?.polynomial || 'Calculating...'}
                </div>
                <p className="text-xs text-gw-text-secondary mt-2 leading-relaxed">
                  Where coefficient $r_k$ counts the exact number of ways to place $k$ non-attacking rooks onto forbidden cells of board $B$.
                </p>
              </Card>

              {/* Inclusion-Exclusion Alternating Step Table */}
              <Card className="p-5 border-[#222E42]">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#222E42]">
                  <h3 className="text-sm font-semibold text-gw-text flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-white" />
                    Principle of Inclusion-Exclusion (PIE) Step Table
                  </h3>
                  <span className="text-xs font-mono text-gw-text-secondary">
                    N = Σ (-1)ᵏ · rₖ · (n-k)!
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-[#222E42] text-gw-text-secondary uppercase text-[10px]">
                        <th className="py-2 px-3">k</th>
                        <th className="py-2 px-2 text-center">Sign</th>
                        <th className="py-2 px-3 text-right">Rook rₖ</th>
                        <th className="py-2 px-3 text-right">(n - k)!</th>
                        <th className="py-2 px-4 text-right">Term Value</th>
                        <th className="py-2 px-4 text-right">Partial Sum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#333333]">
                      {evalResult?.inclusion_exclusion_terms?.map((term) => {
                        const isPositive = term.sign === '+'
                        return (
                          <tr key={term.k} className="hover:bg-[#1E2638] transition-colors">
                            <td className="py-2.5 px-3 font-bold text-gw-text">k = {term.k}</td>
                            <td className="py-2.5 px-2 text-center">
                              <span
                                className={`px-1.5 py-0.5 rounded font-bold border ${
                                  isPositive
                                    ? 'bg-[#1E2638] text-white border-[#444444]'
                                    : 'bg-[#0D121F] text-[#A3A3A3] border-[#222E42]'
                                }`}
                              >
                                {term.sign}1
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right text-white font-bold">
                              {term.rook_coefficient}
                            </td>
                            <td className="py-2.5 px-3 text-right text-gw-text-secondary">
                              {term.factorial_value?.toLocaleString()}
                            </td>
                            <td
                              className={`py-2.5 px-4 text-right font-bold ${
                                isPositive ? 'text-white' : 'text-[#A3A3A3]'
                              }`}
                            >
                              {term.sign}
                              {Math.abs(term.contribution).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-4 text-right font-bold text-white bg-[#1E2638]/30">
                              {/* Running sum calculation if needed */}
                              {term.contribution?.toLocaleString()}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 p-3 rounded-lg bg-[#0D121F] border border-[#222E42] flex items-center justify-between text-xs font-mono">
                  <span className="text-gw-text-secondary font-medium">
                    Final Exact Valid Assignments:
                  </span>
                  <span className="text-base font-bold text-white">
                    N = {evalResult?.valid_assignments?.toLocaleString()}
                  </span>
                </div>
              </Card>

              {/* Rook Coefficient Histogram */}
              <Card className="p-5 border-[#222E42]">
                <h3 className="text-sm font-semibold text-gw-text mb-1">
                  Rook Placement Spectrum Histogram
                </h3>
                <p className="text-xs text-gw-text-secondary mb-4">
                  Visual distribution of non-attacking rook placement counts across degrees $k = 0 \dots n$.
                </p>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rookBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333333" opacity={0.3} />
                      <XAxis dataKey="name" stroke="#737373" tick={{ fontSize: 11, fill: '#737373' }} />
                      <YAxis stroke="#737373" tick={{ fontSize: 11, fill: '#737373' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#181818',
                          borderColor: '#333333',
                          borderRadius: '8px',
                          color: '#FFFFFF',
                          fontSize: '12px'
                        }}
                      />
                      <Bar dataKey="count" name="Placements r_k" fill="#FFFFFF" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ROOK PLACEMENT SIMULATOR & PUZZLE                                  */}
      {/* ========================================================================= */}
      {activeTab === 'rook_puzzle' && (
        <div className="space-y-6">
          <Card className="p-6 border-[#222E42]">
            <div className="max-w-3xl space-y-2 mb-6">
              <h2 className="text-base font-bold text-gw-text flex items-center gap-2">
                <Zap className="w-5 h-5 text-white" />
                Non-Attacking Rook Placement Simulator
              </h2>
              <p className="text-sm text-gw-text-secondary leading-relaxed">
                In discrete mathematics, two rooks attack each other if they share the same row or column.
                Click on any <span className="text-white font-semibold">forbidden cell (1)</span> on the board below to place or remove a rook.
                Observe how the conflict engine immediately flags any row or column collisions in real time!
              </p>
            </div>

            {/* Conflict Alert Banner */}
            {rookConflicts.size > 0 ? (
              <div className="p-4 rounded-xl bg-[#0D121F] border border-[#334155] text-white flex items-center gap-3 mb-6">
                <AlertTriangle className="w-5 h-5 shrink-0 text-[#A3A3A3]" />
                <div className="text-xs">
                  <span className="font-bold uppercase tracking-wider block">Attack Conflict Detected:</span>
                  Two or more rooks share the same row or column! In the Rook Polynomial $R(B, x)$, only conflict-free placements contribute to $r_k$.
                </div>
              </div>
            ) : placedRooks.length > 0 ? (
              <div className="p-4 rounded-xl bg-[#1E2638] border border-[#222E42] text-white flex items-center gap-3 mb-6">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-white" />
                <div className="text-xs">
                  <span className="font-bold uppercase tracking-wider block">
                    Valid Non-Attacking Placement!
                  </span>
                  You have placed {placedRooks.length} non-attacking rooks onto forbidden cells.
                  This configuration counts towards coefficient{' '}
                  <span className="font-mono font-bold text-white">r{placedRooks.length}</span>.
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#121826] border border-[#222E42] text-gw-text-secondary text-xs mb-6">
                Click any forbidden cell below to position a chess rook onto the restriction board.
              </div>
            )}

            {/* Interactive Chess Board */}
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="overflow-x-auto p-4 bg-[#0D121F] rounded-2xl border border-[#222E42]">
                <div className="inline-block">
                  {/* Column Labels */}
                  <div className="flex items-center gap-2 mb-2 pl-12">
                    {Array(matrixSize).fill(0).map((_, c) => (
                      <div key={c} className="w-14 text-center font-mono text-xs font-bold text-white">
                        Gate {c + 1}
                      </div>
                    ))}
                  </div>

                  {/* Rows */}
                  <div className="space-y-2">
                    {matrix.map((rowArr, r) => (
                      <div key={r} className="flex items-center gap-2">
                        {/* Flight Label */}
                        <div className="w-10 font-mono text-xs text-gw-text-secondary text-right pr-2 font-medium">
                          F{r + 1}
                        </div>

                        {rowArr.map((cellVal, c) => {
                          const isForbidden = cellVal === 1
                          const isRookPlaced = placedRooks.some(([pr, pc]) => pr === r && pc === c)
                          const hasConflict = rookConflicts.has(`${r},${c}`)

                          return (
                            <button
                              key={c}
                              disabled={!isForbidden}
                              onClick={() => togglePuzzleRook(r, c)}
                              className={`w-14 h-14 rounded-xl font-mono text-sm transition-all flex flex-col items-center justify-center border relative ${
                                !isForbidden
                                  ? 'bg-[#090909] border-[#222222] text-[#333333] cursor-not-allowed opacity-40'
                                  : isRookPlaced
                                  ? hasConflict
                                    ? 'bg-[#121826] border-2 border-white text-white shadow-lg ring-2 ring-[#737373] scale-105'
                                    : 'bg-white border-2 border-white text-[#090909] shadow-lg scale-105 font-bold'
                                  : 'bg-[#121826] border-2 border-[#334155] text-white hover:bg-[#1E2638] hover:border-white'
                              }`}
                            >
                              {isRookPlaced ? (
                                <span className="text-2xl animate-bounce">♜</span>
                              ) : isForbidden ? (
                                <span className="text-[10px] uppercase font-bold text-white/80">
                                  Drop ♜
                                </span>
                              ) : (
                                <span className="text-xs text-[#333333]">•</span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status & Placement Scoreboard */}
              <div className="flex-1 space-y-4">
                <Card className="p-4 border-[#222E42] bg-[#121826]">
                  <h4 className="text-xs font-semibold uppercase font-mono tracking-wider text-gw-text mb-3">
                    Puzzle Placement Stats
                  </h4>
                  <div className="space-y-2.5 text-xs font-mono">
                    <div className="flex justify-between py-1 border-b border-[#222E42]">
                      <span className="text-gw-text-secondary">Rooks Placed:</span>
                      <span className="text-white font-bold">{placedRooks.length}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#222E42]">
                      <span className="text-gw-text-secondary">Conflict Status:</span>
                      <span className="text-white font-bold">
                        {rookConflicts.size > 0 ? `${rookConflicts.size / 2} Collisions` : 'Conflict-Free'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#222E42]">
                      <span className="text-gw-text-secondary">Target Coefficient:</span>
                      <span className="text-white font-bold">r{placedRooks.length}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gw-text-secondary">Theoretical Ways (r{placedRooks.length}):</span>
                      <span className="text-gw-text font-bold">
                        {evalResult?.rook_coefficients?.[placedRooks.length] ?? '—'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#222E42] flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs"
                      onClick={() => setPlacedRooks([])}
                      disabled={placedRooks.length === 0}
                    >
                      Reset Placements
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PERMUTATION THEORY EXPLORER (n!)                                    */}
      {/* ========================================================================= */}
      {activeTab === 'permutations' && (
        <div className="space-y-6">
          <Card className="p-6 border-[#222E42]">
            <div className="max-w-3xl space-y-2 mb-6">
              <h2 className="text-base font-bold text-gw-text flex items-center gap-2">
                <Layers className="w-5 h-5 text-white" />
                Permutation Theory & Factorial Growth (n!)
              </h2>
              <p className="text-sm text-gw-text-secondary leading-relaxed">
                In airport gate allocation without restrictions, $n$ flights can be assigned to $n$ gates in exactly $n!$ ways (one-to-one matchings).
                As $n$ grows, $n!$ explodes factorially, demonstrating why brute-force permutation search is computationally prohibitive.
              </p>
            </div>

            {/* Slider & Formula Card */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center mb-8">
              <div className="md:col-span-5 p-5 rounded-2xl bg-[#0D121F] border border-[#222E42]">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs uppercase font-mono tracking-wider text-white font-bold">
                    Choose Dimension n
                  </span>
                  <span className="text-2xl font-mono font-bold text-white">
                    n = {permN}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={permN}
                  onChange={(e) => setPermN(Number(e.target.value))}
                  className="w-full h-2 bg-[#1E2638] rounded-lg appearance-none cursor-pointer accent-white"
                />
                <div className="flex justify-between text-[10px] font-mono text-gw-text-secondary mt-2">
                  <span>n=1</span>
                  <span>n=4</span>
                  <span>n=6 (GateWise Max)</span>
                  <span>n=8</span>
                </div>
              </div>

              <div className="md:col-span-7 p-5 rounded-2xl bg-[#121826] border border-[#222E42] space-y-2">
                <span className="text-xs uppercase font-mono tracking-wider text-gw-text-secondary flex items-center justify-between">
                  <span>Combinatorial Factorial Formula:</span>
                  {isLoadingPerms && (
                    <span className="flex items-center gap-1 text-white text-[10px]">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Loading...
                    </span>
                  )}
                </span>
                <div className="font-mono text-lg sm:text-xl text-white font-bold overflow-x-auto">
                  {permData?.formula || `${permN}! = calculating...`}
                </div>
                <p className="text-xs text-gw-text-secondary leading-relaxed">
                  For $n = {permN}$, an unconstrained airport has exactly{' '}
                  <span className="text-white font-mono font-bold">
                    {permData?.factorial?.toLocaleString() || '...'}
                  </span>{' '}
                  possible one-to-one flight-to-gate assignments.
                </p>
              </div>
            </div>

            {/* Factorial Growth Table & Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Growth Table */}
              <div className="lg:col-span-5">
                <h3 className="text-xs font-semibold uppercase font-mono tracking-wider text-gw-text mb-3">
                  Factorial Growth Scale (1 to 8)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono text-left">
                    <thead>
                      <tr className="border-b border-[#222E42] text-gw-text-secondary text-[10px] uppercase">
                        <th className="py-2 px-3">Dimension n</th>
                        <th className="py-2 px-3 text-right">n! Permutations</th>
                        <th className="py-2 px-3 text-right">Multiplier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#333333]">
                      {permData?.growth_table?.map((row) => (
                        <tr
                          key={row.n}
                          className={`hover:bg-[#1E2638] transition-colors ${
                            row.n === permN ? 'bg-[#1E2638] font-bold text-white' : 'text-gw-text'
                          }`}
                        >
                          <td className="py-2 px-3">n = {row.n}</td>
                          <td className="py-2 px-3 text-right font-mono">
                            {row.factorial.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-right text-gw-text-secondary">
                            {row.ratio_to_previous > 1 ? `×${row.ratio_to_previous}` : '1'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sample Permutations Grid */}
              <div className="lg:col-span-7">
                <h3 className="text-xs font-semibold uppercase font-mono tracking-wider text-gw-text mb-3">
                  Sample Permutations of [0 .. {permN - 1}] ({permData?.sample_permutations?.length || 0} shown)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto p-2 bg-[#0D121F] rounded-xl border border-[#222E42]">
                  {permData?.sample_permutations?.map((perm, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-[#121826] border border-[#222E42] text-[11px] font-mono text-center text-white hover:border-[#334155] transition-all"
                    >
                      [{perm.join(', ')}]
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PIE THEORY & DERIVATIONS                                           */}
      {/* ========================================================================= */}
      {activeTab === 'pie_theory' && (
        <div className="space-y-6">
          <Card className="p-6 border-[#222E42] space-y-6">
            <div className="space-y-2">
              <h2 className="text-base font-bold text-gw-text flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-white" />
                Principle of Inclusion-Exclusion (PIE) in Discrete Mathematics
              </h2>
              <p className="text-sm text-gw-text-secondary leading-relaxed">
                How discrete mathematics rigorously counts valid one-to-one matchings subject to forbidden configurations without simulating every individual permutation.
              </p>
            </div>

            {/* Theory Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 border-[#222E42] bg-[#121826] space-y-2">
                <span className="text-xs uppercase font-mono text-white font-bold block">
                  1. Unconstrained Baseline
                </span>
                <p className="text-xs text-gw-text-secondary leading-relaxed">
                  Start with the universe of all possible assignments without restrictions: $S_0 = r_0 \times n! = 1 \times n! = n!$.
                </p>
              </Card>

              <Card className="p-4 border-[#222E42] bg-[#121826] space-y-2">
                <span className="text-xs uppercase font-mono text-white font-bold block">
                  2. Subtract Single Violations
                </span>
                <p className="text-xs text-gw-text-secondary leading-relaxed">
                  Subtract all assignments violating at least 1 restriction: $- r_1 \times (n-1)!$. But this double-counts assignments that violate two restrictions.
                </p>
              </Card>

              <Card className="p-4 border-[#222E42] bg-[#121826] space-y-2">
                <span className="text-xs uppercase font-mono text-white font-bold block">
                  3. Add Double Violations Back
                </span>
                <p className="text-xs text-gw-text-secondary leading-relaxed">
                  Add back assignments violating at least 2 restrictions: $+ r_2 \times (n-2)!$. Continue alternating signs until $k = n$.
                </p>
              </Card>
            </div>

            {/* Master Formula Box */}
            <div className="p-6 rounded-2xl bg-[#0D121F] border border-[#222E42] space-y-3">
              <span className="text-xs uppercase font-mono text-white font-bold tracking-wider">
                The Master GateWise Inclusion-Exclusion Equation
              </span>
              <div className="font-mono text-xl sm:text-2xl text-gw-text font-bold">
                N = ∑ₖ₌₀ⁿ (-1)ᵏ · rₖ · (n - k)!
              </div>
              <p className="text-xs text-gw-text-secondary leading-relaxed">
                By pairing the exact Rook Polynomial $R(B, x) = \sum r_k x^k$ with the Principle of Inclusion-Exclusion, GateWise calculates the exact integer count of valid flight-to-gate assignments in sub-millisecond execution time.
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

export default MathExplorer
