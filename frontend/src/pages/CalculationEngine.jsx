import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Calculator,
  Grid3X3,
  Layers,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  ArrowRight,
  Play,
  Pause,
  BookOpen,
  FileText,
  Download
} from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import allocationService from '../lib/allocationService'
import analyticsService from '../lib/analyticsService'
import simulationService from '../lib/simulationService'
import exportService from '../lib/exportService'

const STEPS = [
  { id: 1, title: 'Problem & Board Formulation', short: '1. Board Matrix' },
  { id: 2, title: 'Unrestricted Permutations (n!)', short: '2. Total Permutations' },
  { id: 3, title: 'Rook Polynomial Derivation R(B, x)', short: '3. Rook Polynomial' },
  { id: 4, title: 'Inclusion-Exclusion Step Sums', short: '4. PIE Alternation' },
  { id: 5, title: 'Final Feasibility Verdict', short: '5. Final Verdict' }
]

export const CalculationEngine = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [allSimulations, setAllSimulations] = useState([])
  const [selectedSimId, setSelectedSimId] = useState(searchParams.get('sim') || '')
  const [currentStep, setCurrentStep] = useState(1)
  const [isAutoPlaying, setIsAutoPlaying] = useState(false)

  // Data states
  const [calcData, setCalcData] = useState(null)
  const [simDetails, setSimDetails] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // 1. Fetch simulations on mount
  useEffect(() => {
    const fetchSims = async () => {
      try {
        const sims = await simulationService.getSimulations()
        setAllSimulations(sims || [])
        if (!selectedSimId && sims?.length > 0) {
          const defaultSim = sims.find((s) => s.id === 'SIM-001') || sims[0]
          setSelectedSimId(defaultSim.id)
        }
      } catch (err) {
        console.error('Failed to load simulations list:', err)
      }
    }
    fetchSims()
  }, [])

  // 2. Fetch calculation & analytics data whenever selectedSimId changes
  const loadCalculation = useCallback(async (simId) => {
    if (!simId) return
    try {
      setIsLoading(true)
      setError(null)
      const [calculation, details] = await Promise.all([
        allocationService.getCalculation(simId),
        analyticsService.getSimulationDetails(simId, false)
      ])
      setCalcData(calculation)
      setSimDetails(details)
    } catch (err) {
      console.error(`Failed to load calculation for ${simId}:`, err)
      setError(err.message || 'Failed to retrieve calculation steps')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedSimId) {
      loadCalculation(selectedSimId)
      setSearchParams({ sim: selectedSimId })
    }
  }, [selectedSimId, loadCalculation, setSearchParams])

  // Auto-play stepper timer
  useEffect(() => {
    let timer
    if (isAutoPlaying) {
      timer = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= 5) {
            setIsAutoPlaying(false)
            return 5
          }
          return prev + 1
        })
      }, 4000)
    }
    return () => clearInterval(timer)
  }, [isAutoPlaying])

  const matrixSize = calcData?.matrix_size || 0
  const matrix = simDetails?.matrix || []

  // Precompute factorial multiplication factors for step 2
  const factorialFactors = useMemo(() => {
    if (!matrixSize) return []
    return Array.from({ length: matrixSize }, (_, i) => ({
      flightIndex: i + 1,
      availableGates: matrixSize - i,
      explanation: `Flight ${i + 1} chooses from ${matrixSize - i} remaining unassigned gates`
    }))
  }, [matrixSize])

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ----------------- 1. HEADER & SIMULATION SELECTOR ----------------- */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-[#1e3a5f]/50">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="gw-page-heading">Step-by-Step Calculation Engine</h1>
            <Badge variant="cyan" size="sm" dot>
              Phase 25 Live
            </Badge>
          </div>
          <p className="text-sm text-gw-text-secondary leading-relaxed">
            Interactive mathematical walkthrough explaining the exact derivation of valid flight-to-gate assignments using Rook Polynomials and the Principle of Inclusion-Exclusion.
          </p>
        </div>

        {/* Scenario Switcher */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 bg-gw-bg-secondary p-1.5 rounded-xl border border-[#1e3a5f]">
            <span className="text-xs font-mono text-gw-text-secondary pl-2">Scenario:</span>
            <select
              value={selectedSimId}
              onChange={(e) => {
                setSelectedSimId(e.target.value)
                setCurrentStep(1)
              }}
              className="bg-gw-bg-tertiary text-gw-text font-mono text-xs px-3 py-1.5 rounded-lg border border-[#1e3a5f] focus:outline-none focus:border-gw-cyan"
            >
              {allSimulations.map((sim) => (
                <option key={sim.id} value={sim.id}>
                  {sim.name} ({sim.id})
                </option>
              ))}
            </select>
          </div>

          <Link to={`/simulator?sim=${selectedSimId}`}>
            <Button size="md" icon={PlayCircle} className="shadow-lg shadow-gw-cyan/10">
              Run Simulator
            </Button>
          </Link>
        </div>
      </div>

      {/* ----------------- 2. INTERACTIVE STEP PROGRESS BAR ----------------- */}
      <Card className="p-4 border-[#1e3a5f]/80 bg-gw-bg-secondary/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Stepper Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {STEPS.map((step) => {
              const isActive = currentStep === step.id
              const isCompleted = currentStep > step.id
              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono transition-all ${
                    isActive
                      ? 'bg-gw-cyan text-gw-bg-primary font-bold shadow-md shadow-gw-cyan/20'
                      : isCompleted
                      ? 'bg-gw-bg-tertiary text-gw-cyan border border-gw-cyan/30'
                      : 'bg-gw-bg-tertiary/50 text-gw-text-secondary border border-[#1e3a5f]/40 hover:text-gw-text'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                      isActive
                        ? 'bg-gw-bg-primary text-gw-cyan font-bold'
                        : isCompleted
                        ? 'bg-gw-cyan/20 text-gw-cyan'
                        : 'bg-gw-bg-secondary text-gw-text-secondary'
                    }`}
                  >
                    {isCompleted ? '✓' : step.id}
                  </span>
                  <span>{step.short}</span>
                </button>
              )
            })}
          </div>

          {/* Stepper Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              icon={ChevronLeft}
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
            >
              Prev
            </Button>
            <Button
              size="sm"
              variant="outline"
              icon={isAutoPlaying ? Pause : Play}
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              className={isAutoPlaying ? 'border-gw-cyan text-gw-cyan' : ''}
            >
              {isAutoPlaying ? 'Pause' : 'Auto-Play'}
            </Button>
            <Button
              size="sm"
              icon={ChevronRight}
              onClick={() => setCurrentStep((prev) => Math.min(5, prev + 1))}
              disabled={currentStep === 5}
            >
              Next Step
            </Button>
          </div>
        </div>
      </Card>

      {/* ----------------- 3. ERROR & LOADING STATES ----------------- */}
      {isLoading && (
        <div className="p-12 text-center space-y-4">
          <div className="w-12 h-12 border-2 border-gw-cyan border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-mono text-gw-cyan">Calculating discrete mathematics steps...</p>
        </div>
      )}

      {error && (
        <Card className="p-6 border-gw-danger/30 bg-gw-danger/5 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-gw-danger mx-auto" />
          <h3 className="text-base font-bold text-gw-text">Calculation Engine Error</h3>
          <p className="text-xs text-gw-danger font-mono">{error}</p>
          <Button size="sm" icon={RotateCcw} onClick={() => loadCalculation(selectedSimId)}>
            Retry Calculation
          </Button>
        </Card>
      )}

      {/* ----------------- 4. STEP WALKTHROUGH CONTENT ----------------- */}
      {!isLoading && !error && calcData && (
        <div className="space-y-6">
          {/* ================================================================= */}
          {/* STEP 1: PROBLEM DEFINITION & BOARD MATRIX                         */}
          {/* ================================================================= */}
          {currentStep === 1 && (
            <Card className="p-6 border-[#1e3a5f]/80 space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between pb-4 border-b border-[#1e3a5f]/50">
                <div className="space-y-1">
                  <span className="text-xs font-mono uppercase tracking-wider text-gw-cyan font-bold">
                    Step 1 of 5
                  </span>
                  <h2 className="text-lg font-bold text-gw-text flex items-center gap-2">
                    <Grid3X3 className="w-5 h-5 text-gw-cyan" />
                    Problem Definition & Restriction Board Matrix B
                  </h2>
                </div>
                <Badge variant="cyan" size="sm">
                  Dimension {matrixSize} × {matrixSize}
                </Badge>
              </div>

              <p className="text-sm text-gw-text-secondary leading-relaxed">
                In the GateWise assignment framework, we are given a set of{' '}
                <span className="font-semibold text-gw-cyan">{matrixSize} flights</span> and{' '}
                <span className="font-semibold text-gw-cyan">{matrixSize} gates</span>.
                A valid allocation is a bijective one-to-one matching where each flight is assigned to exactly one distinct gate,
                subject to operational constraints encoded in the binary restriction board{' '}
                <span className="font-mono font-bold text-gw-text">B</span>.
              </p>

              {/* Grid & Stats */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                {/* Visual Matrix */}
                <div className="md:col-span-6 overflow-x-auto p-4 rounded-xl bg-gw-bg-tertiary border border-[#1e3a5f]">
                  <h4 className="text-xs font-semibold uppercase font-mono tracking-wider text-gw-text mb-3">
                    Restriction Matrix Board B:
                  </h4>
                  <div className="inline-block">
                    {/* Gate Headers */}
                    <div className="flex items-center gap-1.5 mb-1.5 pl-10">
                      {Array.from({ length: matrixSize }).map((_, c) => (
                        <div key={c} className="w-10 text-center font-mono text-[10px] text-gw-cyan font-bold">
                          G{c + 1}
                        </div>
                      ))}
                    </div>
                    {/* Rows */}
                    <div className="space-y-1.5">
                      {matrix.map((row, r) => (
                        <div key={r} className="flex items-center gap-1.5">
                          <div className="w-8 font-mono text-[10px] text-gw-text-secondary text-right pr-2">
                            F{r + 1}
                          </div>
                          {row.map((val, c) => (
                            <div
                              key={c}
                              className={`w-10 h-10 rounded flex items-center justify-center font-mono text-xs font-bold border ${
                                val === 1
                                  ? 'bg-gw-warning/20 border-gw-warning/50 text-gw-warning'
                                  : 'bg-gw-bg-secondary border-[#1e3a5f] text-gw-cyan'
                              }`}
                            >
                              {val}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Key Concepts */}
                <div className="md:col-span-6 space-y-4">
                  <Card className="p-4 border-[#1e3a5f] bg-gw-bg-secondary/60 space-y-2">
                    <span className="text-xs font-mono uppercase text-gw-cyan font-bold">
                      Binary Semantics:
                    </span>
                    <ul className="space-y-2 text-xs text-gw-text-secondary leading-relaxed">
                      <li className="flex items-start gap-2">
                        <span className="w-2 h-2 rounded-full bg-gw-cyan mt-1 shrink-0" />
                        <span>
                          <strong className="text-gw-cyan font-mono">B[i][j] = 0 (Allowed):</strong> Flight $i$ is permitted to park at Gate $j$.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-2 h-2 rounded-full bg-gw-warning mt-1 shrink-0" />
                        <span>
                          <strong className="text-gw-warning font-mono">B[i][j] = 1 (Forbidden):</strong> Flight $i$ is forbidden from Gate $j$ due to aircraft wingspan, international customs, or curfew restrictions.
                        </span>
                      </li>
                    </ul>
                  </Card>

                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <div className="p-3 rounded-lg bg-gw-bg-tertiary border border-[#1e3a5f]">
                      <span className="text-gw-text-secondary block mb-0.5">Total Board Cells:</span>
                      <span className="text-base font-bold text-gw-text">{matrixSize * matrixSize}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-gw-bg-tertiary border border-[#1e3a5f]">
                      <span className="text-gw-text-secondary block mb-0.5">Forbidden Cells:</span>
                      <span className="text-base font-bold text-gw-warning">
                        {calcData.forbidden_cell_count} ({simDetails?.restriction_density || 0}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ================================================================= */}
          {/* STEP 2: TOTAL UNRESTRICTED PERMUTATIONS (n!)                      */}
          {/* ================================================================= */}
          {currentStep === 2 && (
            <Card className="p-6 border-[#1e3a5f]/80 space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between pb-4 border-b border-[#1e3a5f]/50">
                <div className="space-y-1">
                  <span className="text-xs font-mono uppercase tracking-wider text-gw-cyan font-bold">
                    Step 2 of 5
                  </span>
                  <h2 className="text-lg font-bold text-gw-text flex items-center gap-2">
                    <Layers className="w-5 h-5 text-gw-cyan" />
                    Total Unrestricted Assignment Universe (n!)
                  </h2>
                </div>
                <Badge variant="cyan" size="sm">
                  {matrixSize}! Permutations
                </Badge>
              </div>

              <p className="text-sm text-gw-text-secondary leading-relaxed">
                Before considering restrictions, we determine the total size of the permutation universe $S_0$.
                If no restrictions existed, the number of ways to assign {matrixSize} flights to {matrixSize} gates is exactly {matrixSize} factorial.
              </p>

              {/* Master Factorial Equation */}
              <div className="p-5 rounded-xl bg-gw-bg-tertiary border border-gw-cyan/30 text-center space-y-2">
                <span className="text-xs font-mono text-gw-text-secondary uppercase tracking-wider">
                  Permutation Formula:
                </span>
                <div className="text-xl sm:text-2xl font-mono font-bold text-gw-cyan">
                  S₀ = {matrixSize}! ={' '}
                  {Array.from({ length: matrixSize }, (_, i) => matrixSize - i).join(' × ')} ={' '}
                  <span className="text-gw-success">{calcData.total_possible_assignments.toLocaleString()}</span>
                </div>
                <p className="text-xs text-gw-text-secondary">
                  There are exactly {calcData.total_possible_assignments.toLocaleString()} total possible one-to-one flight-to-gate assignments.
                </p>
              </div>

              {/* Breakdown by flight */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase font-mono tracking-wider text-gw-text">
                  Combinatorial Multiplication Breakdown:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {factorialFactors.map((factor) => (
                    <div
                      key={factor.flightIndex}
                      className="p-3 rounded-lg bg-gw-bg-tertiary border border-[#1e3a5f] text-xs font-mono space-y-1"
                    >
                      <div className="flex justify-between items-center text-gw-cyan font-bold">
                        <span>Flight {factor.flightIndex}</span>
                        <span>{factor.availableGates} choices</span>
                      </div>
                      <p className="text-[11px] text-gw-text-secondary">{factor.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* ================================================================= */}
          {/* STEP 3: ROOK POLYNOMIAL DERIVATION R(B, x)                        */}
          {/* ================================================================= */}
          {currentStep === 3 && (
            <Card className="p-6 border-[#1e3a5f]/80 space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between pb-4 border-b border-[#1e3a5f]/50">
                <div className="space-y-1">
                  <span className="text-xs font-mono uppercase tracking-wider text-gw-cyan font-bold">
                    Step 3 of 5
                  </span>
                  <h2 className="text-lg font-bold text-gw-text flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-gw-cyan" />
                    Exact Rook Polynomial Formulation R(B, x)
                  </h2>
                </div>
                <Badge variant="cyan" size="sm">
                  Row Bitmask DP
                </Badge>
              </div>

              <p className="text-sm text-gw-text-secondary leading-relaxed">
                The Rook Polynomial $R(B, x)$ is a generating function where coefficient{' '}
                <span className="font-mono text-gw-cyan font-bold">rₖ</span> represents the exact number of ways to place{' '}
                <span className="font-semibold text-gw-text">k non-attacking rooks</span> onto forbidden cells of board $B$.
                Two rooks attack each other if they share the same row or column.
              </p>

              {/* Exact Formula Box */}
              <div className="p-5 rounded-xl bg-gw-bg-tertiary border border-gw-cyan/30 space-y-2">
                <span className="text-xs font-mono text-gw-text-secondary uppercase tracking-wider">
                  Evaluated Rook Polynomial:
                </span>
                <div className="text-lg sm:text-xl font-mono font-bold text-gw-cyan overflow-x-auto">
                  R(B, x) = {calcData.polynomial}
                </div>
              </div>

              {/* Coefficients Detail Cards */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase font-mono tracking-wider text-gw-text">
                  Itemized Coefficient Meanings (r₀ through rₖ):
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {calcData.rook_coefficients.map((coeff, k) => (
                    <div
                      key={k}
                      className="p-3.5 rounded-lg bg-gw-bg-tertiary border border-[#1e3a5f] flex items-start gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gw-cyan/10 border border-gw-cyan/30 text-gw-cyan flex items-center justify-center font-mono font-bold shrink-0">
                        r{k}
                      </div>
                      <div className="text-xs font-mono space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gw-text">r{k} = {coeff.toLocaleString()}</span>
                          <span className="text-[10px] text-gw-text-secondary">({k} rooks)</span>
                        </div>
                        <p className="text-[11px] text-gw-text-secondary leading-relaxed">
                          {k === 0
                            ? '1 way to place 0 rooks (the unconstrained board baseline)'
                            : k === 1
                            ? `${coeff} forbidden cells available for placing 1 rook`
                            : `${coeff} distinct ways to place ${k} non-attacking rooks on forbidden cells`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* ================================================================= */}
          {/* STEP 4: INCLUSION-EXCLUSION STEP SUMS                             */}
          {/* ================================================================= */}
          {currentStep === 4 && (
            <Card className="p-6 border-[#1e3a5f]/80 space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between pb-4 border-b border-[#1e3a5f]/50">
                <div className="space-y-1">
                  <span className="text-xs font-mono uppercase tracking-wider text-gw-cyan font-bold">
                    Step 4 of 5
                  </span>
                  <h2 className="text-lg font-bold text-gw-text flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-gw-cyan" />
                    Principle of Inclusion-Exclusion (PIE) Alternation
                  </h2>
                </div>
                <Badge variant="cyan" size="sm">
                  Exact Alternating Sum
                </Badge>
              </div>

              <p className="text-sm text-gw-text-secondary leading-relaxed">
                By combining the Rook Polynomial coefficients $r_k$ with remaining unrestricted permutations $(n-k)!$,
                we apply the Principle of Inclusion-Exclusion. We alternate signs to add unconstrained permutations,
                subtract single violations, add back double-counted two-violation sets, and repeat.
              </p>

              {/* Master Equation */}
              <div className="p-4 rounded-xl bg-gw-bg-tertiary border border-gw-cyan/30 text-center space-y-1">
                <span className="text-xs font-mono text-gw-text-secondary uppercase">
                  Master Equation:
                </span>
                <div className="text-base sm:text-lg font-mono font-bold text-gw-text">
                  N = ∑ₖ₌₀ⁿ (-1)ᵏ · rₖ · (n - k)!
                </div>
              </div>

              {/* PIE Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#1e3a5f] text-gw-text-secondary uppercase text-[10px]">
                      <th className="py-2.5 px-3">k</th>
                      <th className="py-2.5 px-2 text-center">Sign</th>
                      <th className="py-2.5 px-3 text-right">Rook rₖ</th>
                      <th className="py-2.5 px-3 text-right">(n - k)!</th>
                      <th className="py-2.5 px-4 text-right">Term Contribution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e3a5f]/30">
                    {calcData.inclusion_exclusion_terms.map((term) => {
                      const isPositive = term.sign === '+'
                      return (
                        <tr key={term.k} className="hover:bg-gw-bg-tertiary/40 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-gw-text">k = {term.k}</td>
                          <td className="py-2.5 px-2 text-center">
                            <span
                              className={`px-1.5 py-0.5 rounded font-bold ${
                                isPositive
                                  ? 'bg-gw-success/10 text-gw-success'
                                  : 'bg-gw-danger/10 text-gw-danger'
                              }`}
                            >
                              {term.sign}1
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-gw-cyan font-bold">
                            {term.rook_coefficient.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right text-gw-text-secondary">
                            {term.factorial_value?.toLocaleString()}
                          </td>
                          <td
                            className={`py-2.5 px-4 text-right font-bold ${
                              isPositive ? 'text-gw-success' : 'text-gw-danger'
                            }`}
                          >
                            {term.sign}
                            {Math.abs(term.contribution).toLocaleString()}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Arithmetic Summary */}
              <div className="p-4 rounded-xl bg-gw-bg-tertiary border border-[#1e3a5f] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                <span className="text-gw-text-secondary">
                  Sum of Positive Terms (+) minus Negative Terms (−):
                </span>
                <span className="text-base font-bold text-gw-success">
                  N = {calcData.valid_assignments.toLocaleString()} Valid Assignments
                </span>
              </div>
            </Card>
          )}

          {/* ================================================================= */}
          {/* STEP 5: FINAL FEASIBILITY VERDICT & ACTIONS                       */}
          {/* ================================================================= */}
          {currentStep === 5 && (
            <Card className="p-6 border-[#1e3a5f]/80 space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between pb-4 border-b border-[#1e3a5f]/50">
                <div className="space-y-1">
                  <span className="text-xs font-mono uppercase tracking-wider text-gw-cyan font-bold">
                    Step 5 of 5
                  </span>
                  <h2 className="text-lg font-bold text-gw-text flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-gw-success" />
                    Final Allocation Feasibility Verdict
                  </h2>
                </div>
                <Badge
                  variant={calcData.valid_assignments > 0 ? 'emerald' : 'danger'}
                  size="sm"
                >
                  {calcData.valid_assignments > 0 ? 'Feasible Scenario' : 'Infeasible Scenario'}
                </Badge>
              </div>

              {/* Big Result Display */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-5 border-gw-success/40 bg-gw-bg-secondary text-center space-y-1">
                  <span className="text-xs font-mono uppercase tracking-wider text-gw-text-secondary block">
                    Valid Assignments (N)
                  </span>
                  <div className="text-3xl font-mono font-bold text-gw-success">
                    {calcData.valid_assignments.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-gw-success/80 font-mono">
                    Conflict-Free Permutations
                  </span>
                </Card>

                <Card className="p-5 border-gw-cyan/40 bg-gw-bg-secondary text-center space-y-1">
                  <span className="text-xs font-mono uppercase tracking-wider text-gw-text-secondary block">
                    Feasibility Ratio
                  </span>
                  <div className="text-3xl font-mono font-bold text-gw-cyan">
                    {calcData.feasibility_percentage}%
                  </div>
                  <span className="text-[11px] text-gw-cyan/80 font-mono">
                    of {calcData.total_possible_assignments.toLocaleString()} Permutations
                  </span>
                </Card>

                <Card className="p-5 border-gw-warning/40 bg-gw-bg-secondary text-center space-y-1">
                  <span className="text-xs font-mono uppercase tracking-wider text-gw-text-secondary block">
                    Violations Suppressed
                  </span>
                  <div className="text-3xl font-mono font-bold text-gw-warning">
                    {calcData.invalid_assignments.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-gw-warning/80 font-mono">
                    Invalid Combinations
                  </span>
                </Card>
              </div>

              {/* Interpretation Commentary */}
              <div className="p-4 rounded-xl bg-gw-bg-tertiary border border-[#1e3a5f] text-xs leading-relaxed text-gw-text-secondary space-y-2">
                <h4 className="font-semibold text-gw-text font-mono uppercase">
                  Operational Airport Interpretation:
                </h4>
                {calcData.valid_assignments > 0 ? (
                  <p>
                    Scenario <strong className="text-gw-text">{selectedSimId}</strong> has{' '}
                    <strong className="text-gw-success">{calcData.valid_assignments.toLocaleString()} conflict-free flight-to-gate assignment plans</strong>.
                    Controllers have multiple feasible configurations to dispatch flights without violating aircraft restrictions.
                  </p>
                ) : (
                  <p className="text-gw-danger">
                    Scenario <strong className="text-gw-text">{selectedSimId}</strong> has{' '}
                    <strong>zero valid flight-to-gate assignments ($N = 0$)</strong>.
                    The current restrictions create a mathematical bottleneck where at least one flight will be left without a compatible gate.
                  </p>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link to={`/simulator?sim=${selectedSimId}`}>
                  <Button size="md" icon={PlayCircle}>
                    Generate Allocations in Simulator
                  </Button>
                </Link>
                <Button
                  size="md"
                  variant="outline"
                  icon={FileText}
                  onClick={() => exportService.downloadScenarioPdf(selectedSimId)}
                  title="Download publication-grade binary PDF report"
                >
                  Download PDF Report
                </Button>
                <Button
                  size="md"
                  variant="outline"
                  icon={Download}
                  onClick={() => exportService.downloadCalculationCsv(selectedSimId)}
                  title="Download mathematical calculation steps as CSV"
                >
                  Download Math CSV
                </Button>
                <Button
                  size="md"
                  variant="outline"
                  icon={Download}
                  onClick={() => exportService.downloadMatrixCsv(selectedSimId)}
                  title="Download binary restriction matrix as CSV"
                >
                  Matrix CSV
                </Button>
                <Link to="/math-explorer">
                  <Button size="md" variant="outline" icon={BookOpen}>
                    Open Math Explorer
                  </Button>
                </Link>
                <Link to="/analytics?tab=compare">
                  <Button size="md" variant="outline" icon={ArrowRight}>
                    Compare Scenarios
                  </Button>
                </Link>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export default CalculationEngine
