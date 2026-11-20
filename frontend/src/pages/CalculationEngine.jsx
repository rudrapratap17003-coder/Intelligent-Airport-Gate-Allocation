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
  AlertTriangle,
  PlayCircle,
  ArrowRight,
  Play,
  Pause,
  BookOpen,
  FileText,
  Download,
  ShieldCheck,
  Cpu,
  Search,
  ExternalLink,
  HelpCircle,
  Info
} from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import allocationService from '../lib/allocationService'
import analyticsService from '../lib/analyticsService'
import simulationService from '../lib/simulationService'
import restrictionService from '../lib/restrictionService'
import exportService from '../lib/exportService'
import matrixValidationService from '../lib/matrixValidationService'
import { computeRookPolynomial } from '../lib/rookPolynomialService'
import { computeInclusionExclusionFromMatrix } from '../lib/inclusionExclusionService'
import { generateAllocations, crossVerifyWithPhase12 } from '../lib/backtrackingAllocationService'
import RookPolynomialVisualizer from '../components/matrix/RookPolynomialVisualizer'
import BacktrackingAllocationExplorer from '../components/allocations/BacktrackingAllocationExplorer'

const STEPS = [
  { id: 1, title: 'Simulation Selection & Identity', short: '1. Select Simulation' },
  { id: 2, title: 'Restriction Matrix Validation', short: '2. Validate Matrix' },
  { id: 3, title: 'Rook Polynomial Calculation', short: '3. Rook Polynomial' },
  { id: 4, title: 'Inclusion–Exclusion Counting', short: '4. Calculate Valid (PIE)' },
  { id: 5, title: 'Backtracking Allocation Engine', short: '5. Generate Allocations' },
  { id: 6, title: 'Cross-Verification & Synthesis', short: '6. Cross-Verification' }
]

export const CalculationEngine = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [allSimulations, setAllSimulations] = useState([])
  const [selectedSimId, setSelectedSimId] = useState(searchParams.get('sim') || '')
  const [currentStep, setCurrentStep] = useState(1)
  const [isAutoPlaying, setIsAutoPlaying] = useState(false)

  // Data states
  const [simDetails, setSimDetails] = useState(null)
  const [calcData, setCalcData] = useState(null)
  const [matrixData, setMatrixData] = useState(null)
  const [validationReport, setValidationReport] = useState(null)
  const [rookResult, setRookResult] = useState(null)
  const [pieResult, setPieResult] = useState(null)
  const [backtrackingResult, setBacktrackingResult] = useState(null)
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

  // 2. Load simulation details, matrix, validation, and math steps
  const loadCompleteWorkflow = useCallback(async (simId) => {
    if (!simId) return
    try {
      setIsLoading(true)
      setError(null)

      // Fetch simulation details & backend calculation
      const [details, calculation] = await Promise.all([
        analyticsService.getSimulationDetails(simId, false).catch(() => null),
        allocationService.getCalculation(simId).catch(() => null)
      ])

      const simMeta = await simulationService.getSimulationById(simId).catch(() => null)
      const matrixRecord = await restrictionService.getMatrixForSimulation(
        simId,
        details?.flight_count || 4,
        details?.gate_count || 4,
        details?.flight_ids || [],
        details?.gate_ids || []
      ).catch(() => null)

      const activeMatrix = matrixRecord?.matrix || details?.matrix || []
      const activeFlights = details?.flights || []
      const activeGates = details?.gates || []

      setSimDetails(details || simMeta)
      setCalcData(calculation)
      setMatrixData(matrixRecord)

      // STEP 2: Run Phase 10 Validation
      const simForValidation = {
        id: simId,
        name: details?.name || simMeta?.name || simId,
        selectedFlightIds: details?.flight_ids || (details?.flights || []).map(f => f.id),
        selectedGateIds: details?.gate_ids || (details?.gates || []).map(g => g.id),
        status: details?.status || simMeta?.status || 'Ready'
      }

      const valReport = matrixValidationService.validateMatrix(
        simForValidation,
        activeMatrix,
        activeFlights,
        activeGates
      )
      setValidationReport(valReport)

      // If matrix passes validation, run Phase 11 & Phase 12
      if (valReport.isValid && activeMatrix.length > 0 && activeMatrix[0]?.length > 0) {
        const rook = computeRookPolynomial(activeMatrix)
        setRookResult(rook)

        const pie = computeInclusionExclusionFromMatrix(activeMatrix)
        setPieResult(pie)

        // Run baseline backtracking generation (all or up to limit)
        try {
          const bt = generateAllocations({
            matrix: activeMatrix,
            flightIds: details?.flight_ids || activeFlights.map(f => f.id),
            gateIds: details?.gate_ids || activeGates.map(g => g.id),
            mode: activeMatrix.length <= 6 ? 'all' : 'limited',
            maxResults: 100
          })
          setBacktrackingResult(bt)
        } catch (btErr) {
          console.warn('Backtracking pre-computation deferred:', btErr)
        }
      } else {
        setRookResult(null)
        setPieResult(null)
        setBacktrackingResult(null)
      }
    } catch (err) {
      console.error(`Failed to load workflow for ${simId}:`, err)
      setError(err.message || 'Failed to retrieve simulation data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedSimId) {
      loadCompleteWorkflow(selectedSimId)
      setSearchParams({ sim: selectedSimId })
    }
  }, [selectedSimId, loadCompleteWorkflow, setSearchParams])

  // Auto-play stepper timer
  useEffect(() => {
    let timer
    if (isAutoPlaying) {
      timer = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= 6) {
            setIsAutoPlaying(false)
            return 6
          }
          // Don't auto-advance past step 2 if validation fails
          if (prev === 2 && validationReport && !validationReport.isValid) {
            setIsAutoPlaying(false)
            return 2
          }
          return prev + 1
        })
      }, 5000)
    }
    return () => clearInterval(timer)
  }, [isAutoPlaying, validationReport])

  const matrix = matrixData?.matrix || simDetails?.matrix || []
  const rowsCount = matrix.length
  const colsCount = matrix[0]?.length || 0
  const isSquare = rowsCount > 0 && rowsCount === colsCount
  const isValidationBlocking = validationReport && !validationReport.isValid

  // Cross-verification evaluation for Step 6
  const crossVerificationReport = useMemo(() => {
    if (!pieResult || !backtrackingResult || !validationReport?.isValid) {
      return null
    }

    const exactCount = pieResult.validAssignments
    const generatedCount = backtrackingResult.totalFound
    const isExhaustive = backtrackingResult.isExhaustive
    const isComplete = backtrackingResult.status === 'COMPLETED' || backtrackingResult.status === 'NO_SOLUTIONS'

    if (!isExhaustive || !isComplete) {
      return {
        status: 'INCOMPLETE_SEARCH',
        verified: false,
        exactCount,
        generatedCount,
        message: 'Allocation enumeration incomplete. Exact mathematical count remains available from the Inclusion–Exclusion calculation.'
      }
    }

    const matches = BigInt(generatedCount) === exactCount
    return {
      status: matches ? 'VERIFIED' : 'DISCREPANCY',
      verified: matches,
      exactCount,
      generatedCount,
      message: matches
        ? `Exhaustive mathematical equality confirmed: Inclusion–Exclusion count (${exactCount.toString()}) exactly matches Backtracking enumeration (${generatedCount}).`
        : `Discrepancy detected: Inclusion–Exclusion calculates ${exactCount.toString()} valid assignments, but Backtracking enumerated ${generatedCount}.`
    }
  }, [pieResult, backtrackingResult, validationReport])

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ----------------- 1. HEADER & SIMULATION SELECTOR ----------------- */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-[#333333]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="gw-page-heading">Step-by-Step Integrated Mathematical Workflow</h1>
            <Badge variant="outline" size="sm" dot>
              Phase 14 End-to-End
            </Badge>
          </div>
          <p className="text-sm text-gw-text-secondary leading-relaxed">
            Rigorous mathematical journey connecting Simulation Identity, Matrix Validation, Rook Polynomials, Principle of Inclusion–Exclusion, Backtracking Generation, and Algorithmic Cross-Verification.
          </p>
        </div>

        {/* Scenario Switcher */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 bg-[#222222] p-1.5 rounded-xl border border-[#333333]">
            <span className="text-xs font-mono text-gw-text-secondary pl-2">Scenario:</span>
            <select
              value={selectedSimId}
              onChange={(e) => {
                setSelectedSimId(e.target.value)
                setCurrentStep(1)
              }}
              className="bg-[#181818] text-[#FFFFFF] font-mono text-xs px-3 py-1.5 rounded-lg border border-[#333333] focus:outline-none focus:border-[#FFFFFF]"
            >
              {allSimulations.map((sim) => (
                <option key={sim.id} value={sim.id}>
                  {sim.name} ({sim.id})
                </option>
              ))}
            </select>
          </div>

          <Link to={`/simulator?sim=${selectedSimId}`}>
            <Button size="md" icon={PlayCircle} className="shadow-none">
              Run Simulator
            </Button>
          </Link>
        </div>
      </div>

      {/* ----------------- 2. INTERACTIVE STEP PROGRESS BAR (6 STEPS) ----------------- */}
      <Card className="p-4 border-[#333333] bg-[#181818]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Stepper Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {STEPS.map((step) => {
              const isActive = currentStep === step.id
              const isCompleted = currentStep > step.id
              const isStepBlocked = step.id > 2 && isValidationBlocking

              return (
                <button
                  key={step.id}
                  onClick={() => {
                    if (isStepBlocked) return
                    setCurrentStep(step.id)
                  }}
                  disabled={isStepBlocked}
                  title={isStepBlocked ? 'Blocked: Fix validation errors in Step 2 first' : step.title}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                    isActive
                      ? 'bg-[#FFFFFF] text-[#090909] font-bold border border-[#FFFFFF] shadow-none'
                      : isCompleted
                      ? 'bg-[#222222] text-[#FFFFFF] border border-[#333333]'
                      : isStepBlocked
                      ? 'bg-[#181818] text-[#737373] border border-[#333333] cursor-not-allowed'
                      : 'bg-[#222222] text-gw-text-secondary border border-[#333333] hover:text-[#FFFFFF] hover:bg-[#2A2A2A]'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                      isActive
                        ? 'bg-[#090909] text-[#FFFFFF] font-bold'
                        : isCompleted
                        ? 'bg-[#383838] text-[#FFFFFF]'
                        : isStepBlocked
                        ? 'bg-[#333333] text-[#737373]'
                        : 'bg-[#181818] text-[#737373]'
                    }`}
                  >
                    {isStepBlocked ? '!' : isCompleted ? '✓' : step.id}
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
              className={isAutoPlaying ? 'border-[#FFFFFF] text-[#FFFFFF]' : ''}
              disabled={isValidationBlocking && currentStep >= 2}
            >
              {isAutoPlaying ? 'Pause' : 'Auto-Play'}
            </Button>
            <Button
              size="sm"
              icon={ChevronRight}
              onClick={() => setCurrentStep((prev) => Math.min(6, prev + 1))}
              disabled={currentStep === 6 || (currentStep === 2 && isValidationBlocking)}
            >
              Next Step
            </Button>
          </div>
        </div>
      </Card>

      {/* ----------------- 3. ERROR & LOADING STATES ----------------- */}
      {isLoading && (
        <div className="p-12 text-center space-y-4">
          <div className="w-12 h-12 border-2 border-[#FFFFFF] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-mono text-[#FFFFFF]">Evaluating Discrete Mathematics Pipeline...</p>
        </div>
      )}

      {error && (
        <Card className="p-6 border-[#333333] bg-[#181818] text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-[#A3A3A3] mx-auto" />
          <h3 className="text-base font-bold text-gw-text">Calculation Engine Error</h3>
          <p className="text-xs text-[#A3A3A3] font-mono">{error}</p>
          <Button size="sm" icon={RotateCcw} onClick={() => loadCompleteWorkflow(selectedSimId)}>
            Retry Workflow
          </Button>
        </Card>
      )}

      {/* ----------------- 4. STEP WALKTHROUGH CONTENT ----------------- */}
      {!isLoading && !error && (
        <div className="space-y-6">
          {/* ================================================================= */}
          {/* STEP 1: SELECT SIMULATION & MATRIX IDENTITY                       */}
          {/* ================================================================= */}
          {currentStep === 1 && (
            <Card className="p-6 border-[#333333] bg-[#181818] space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#333333]">
                <div className="space-y-1">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#FFFFFF] font-bold">
                    STEP 1 OF 6 — SIMULATION MANAGEMENT & IDENTITY
                  </span>
                  <h2 className="text-lg font-bold text-gw-text flex items-center gap-2">
                    <Grid3X3 className="w-5 h-5 text-[#FFFFFF]" />
                    Simulation Overview & Restriction Matrix Board B
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" size="sm" className="font-mono">
                    {rowsCount} Flights × {colsCount} Gates
                  </Badge>
                  <Badge variant={isSquare ? 'default' : 'warning'} size="sm">
                    {isSquare ? 'Square Board (n × n)' : 'Rectangular Board (m × n)'}
                  </Badge>
                </div>
              </div>

              {/* Simulation Metadata Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 rounded-lg bg-[#222222] border border-[#333333] space-y-1">
                  <span className="text-gw-text-secondary text-[10px] uppercase">Scenario Name</span>
                  <div className="font-bold text-gw-text truncate">{simDetails?.name || selectedSimId}</div>
                  <span className="text-[10px] text-[#FFFFFF]">{selectedSimId}</span>
                </div>
                <div className="p-3 rounded-lg bg-[#222222] border border-[#333333] space-y-1">
                  <span className="text-gw-text-secondary text-[10px] uppercase">Selected Flights</span>
                  <div className="font-bold text-gw-text">{rowsCount} Flights Active</div>
                  <span className="text-[10px] text-gw-text-secondary">Rows 1 to {rowsCount}</span>
                </div>
                <div className="p-3 rounded-lg bg-[#222222] border border-[#333333] space-y-1">
                  <span className="text-gw-text-secondary text-[10px] uppercase">Selected Gates</span>
                  <div className="font-bold text-gw-text">{colsCount} Gates Available</div>
                  <span className="text-[10px] text-gw-text-secondary">Columns 1 to {colsCount}</span>
                </div>
                <div className="p-3 rounded-lg bg-[#222222] border border-[#333333] space-y-1">
                  <span className="text-gw-text-secondary text-[10px] uppercase">Matrix Identity Preservation</span>
                  <div className="font-bold text-[#FFFFFF] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Metadata Active</span>
                  </div>
                  <span className="text-[10px] text-gw-text-secondary">rowFlightIds & columnGateIds</span>
                </div>
              </div>

              {/* Matrix Board Display */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 overflow-x-auto p-4 rounded-xl bg-[#222222] border border-[#333333]">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-semibold uppercase font-mono tracking-wider text-gw-text">
                      Binary Restriction Board B:
                    </h4>
                    <span className="text-[11px] font-mono text-gw-text-secondary">
                      {rowsCount * colsCount} total cells
                    </span>
                  </div>

                  <div className="inline-block min-w-full">
                    {/* Gate Column Headers */}
                    <div className="flex items-center gap-1 mb-1 pl-16">
                      {Array.from({ length: colsCount }).map((_, c) => {
                        const gateId = matrixData?.columnGateIds?.[c] || simDetails?.gate_ids?.[c] || `G${c + 1}`
                        return (
                          <div key={c} className="w-12 text-center font-mono text-[10px] text-[#FFFFFF] font-bold truncate" title={gateId}>
                            {gateId}
                          </div>
                        )
                      })}
                    </div>

                    {/* Flight Rows */}
                    <div className="space-y-1">
                      {matrix.map((row, r) => {
                        const flightId = matrixData?.rowFlightIds?.[r] || simDetails?.flight_ids?.[r] || `F${r + 1}`
                        return (
                          <div key={r} className="flex items-center gap-1">
                            <div className="w-14 font-mono text-[10px] text-gw-text-secondary text-right pr-2 truncate font-bold" title={flightId}>
                              {flightId}
                            </div>
                            {row.map((val, c) => (
                              <div
                                key={c}
                                className={`w-12 h-10 rounded flex items-center justify-center font-mono text-xs font-bold border transition-colors ${
                                  val === 1
                                    ? 'bg-[#111111] border-2 border-[#555555] text-[#FFFFFF]'
                                    : 'bg-[#181818] border border-[#333333] text-[#737373]'
                                }`}
                              >
                                {val}
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Key Principles Callout */}
                <div className="lg:col-span-5 space-y-4">
                  <Card className="p-4 border-[#333333] bg-[#222222] space-y-3">
                    <span className="text-xs font-mono uppercase text-[#FFFFFF] font-bold flex items-center gap-1.5">
                      <Info className="w-4 h-4" />
                      Binary Matrix Semantics
                    </span>
                    <ul className="space-y-2 text-xs text-gw-text-secondary leading-relaxed">
                      <li className="flex items-start gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#FFFFFF] mt-1 shrink-0" />
                        <span>
                          <strong className="text-[#FFFFFF] font-mono">B[i][j] = 0 (Permitted):</strong> Flight $i$ is allowed to park at Gate $j$.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#A3A3A3] mt-1 shrink-0" />
                        <span>
                          <strong className="text-[#A3A3A3] font-mono">B[i][j] = 1 (Forbidden):</strong> Flight $i$ cannot park at Gate $j$ (aircraft dimension, curfew, or international gate restriction).
                        </span>
                      </li>
                    </ul>
                  </Card>

                  <div className="p-4 rounded-xl bg-[#222222] border border-[#333333] flex items-center justify-between text-xs font-mono">
                    <span className="text-gw-text-secondary">Manage matrix or toggle forbidden cells:</span>
                    <Link to={`/restrictions?sim=${selectedSimId}`}>
                      <Button size="sm" variant="outline" icon={ExternalLink}>
                        Edit Restrictions
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ================================================================= */}
          {/* STEP 2: RESTRICTION MATRIX VALIDATION                             */}
          {/* ================================================================= */}
          {currentStep === 2 && (
            <Card className="p-6 border-[#333333] bg-[#181818] space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#333333]">
                <div className="space-y-1">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#FFFFFF] font-bold">
                    STEP 2 OF 6 — MATRIX VALIDATION ENGINE
                  </span>
                  <h2 className="text-lg font-bold text-gw-text flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#FFFFFF]" />
                    Structural, Binary & Reference Integrity Audit
                  </h2>
                </div>
                <Badge
                  variant={validationReport?.isValid ? 'success' : 'danger'}
                  size="sm"
                  className="font-mono"
                >
                  {validationReport?.isValid ? 'Validation Passed' : 'Structural Errors Detected'}
                </Badge>
              </div>

              {/* Blocking Error Alert */}
              {isValidationBlocking && (
                <div className="p-4 rounded-xl bg-[#222222] border border-[#555555] space-y-2">
                  <div className="flex items-center gap-2 text-[#FFFFFF] font-bold text-sm">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span>MATHEMATICAL CALCULATIONS BLOCKED</span>
                  </div>
                  <p className="text-xs text-gw-text-secondary leading-relaxed">
                    The restriction matrix contains blocking structural or binary errors. Combinatorial counting (Steps 3–6) requires a valid binary matrix. Please resolve these errors before proceeding.
                  </p>
                </div>
              )}

              {/* Validation Categories Checklist */}
              {validationReport && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-[#222222] border border-[#333333] space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-gw-text-secondary uppercase">Structural & Dimensions</span>
                      {validationReport.errors.some(e => e.category === 'STRUCTURAL') ? (
                        <span className="text-[#FFFFFF] font-bold">Failed</span>
                      ) : (
                        <span className="text-[#FFFFFF] font-bold">Passed</span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-gw-text">
                      {rowsCount} Flights × {colsCount} Gates
                    </div>
                    <p className="text-[11px] text-gw-text-secondary">
                      {isSquare ? 'Perfect square dimension n × n' : 'Rectangular dimension m × n'}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#222222] border border-[#333333] space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-gw-text-secondary uppercase">Binary Value Integrity</span>
                      {validationReport.errors.some(e => e.category === 'VALUE') ? (
                        <span className="text-[#FFFFFF] font-bold">Failed</span>
                      ) : (
                        <span className="text-[#FFFFFF] font-bold">Passed</span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-gw-text">
                      100% Binary (0 or 1)
                    </div>
                    <p className="text-[11px] text-gw-text-secondary">
                      No null, undefined, or non-binary values detected.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#222222] border border-[#333333] space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-gw-text-secondary uppercase">Reference Mapping</span>
                      {validationReport.errors.some(e => e.category === 'REFERENCE') ? (
                        <span className="text-[#FFFFFF] font-bold">Failed</span>
                      ) : (
                        <span className="text-[#FFFFFF] font-bold">Passed</span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-gw-text">
                      Row & Column Identity
                    </div>
                    <p className="text-[11px] text-gw-text-secondary">
                      Every matrix row and column mapped to valid flight/gate IDs.
                    </p>
                  </div>
                </div>
              )}

              {/* Detailed Validation Checks Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase font-mono tracking-wider text-gw-text">
                  Validation Engine Checklist:
                </h4>
                <div className="space-y-2">
                  {validationReport?.errors?.map((err, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg bg-[#111111] border border-[#333333] flex items-start gap-3 text-xs"
                    >
                      <AlertCircle className="w-4 h-4 text-white shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold text-white font-mono">
                          [{err.rule}] {err.message}
                        </span>
                        {err.details && <p className="text-[11px] text-gw-text-secondary">{err.details}</p>}
                      </div>
                    </div>
                  ))}

                  {validationReport?.warnings?.map((warn, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg bg-[#181818] border border-[#333333] flex items-start gap-3 text-xs"
                    >
                      <AlertTriangle className="w-4 h-4 text-[#A3A3A3] shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold text-[#FFFFFF] font-mono">
                          [{warn.rule}] {warn.message}
                        </span>
                        {warn.details && <p className="text-[11px] text-gw-text-secondary">{warn.details}</p>}
                      </div>
                    </div>
                  ))}

                  {validationReport?.errors?.length === 0 && (
                    <div className="p-3 rounded-lg bg-[#181818] border border-[#333333] flex items-center gap-3 text-xs text-[#FFFFFF]">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>All matrix structural integrity and reference checks passed. Matrix is ready for algebraic rook polynomial evaluation.</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* ================================================================= */}
          {/* STEP 3: CALCULATE ROOK POLYNOMIAL                                 */}
          {/* ================================================================= */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fadeIn">
              {isValidationBlocking ? (
                <Card className="p-8 text-center space-y-3 border-[#333333] bg-[#181818]">
                  <AlertTriangle className="w-8 h-8 text-[#A3A3A3] mx-auto" />
                  <h3 className="text-base font-bold text-gw-text">Step 3 Blocked</h3>
                  <p className="text-xs text-gw-text-secondary">Please resolve validation errors in Step 2 to compute the Rook Polynomial.</p>
                  <Button size="sm" onClick={() => setCurrentStep(2)}>Go to Step 2</Button>
                </Card>
              ) : (
                <RookPolynomialVisualizer
                  scenarioName={simDetails?.name || selectedSimId}
                  scenarioId={selectedSimId}
                  matrix={matrix}
                  flights={simDetails?.flights || []}
                  gates={simDetails?.gates || []}
                />
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 4: INCLUSION-EXCLUSION EXACT COUNTING                        */}
          {/* ================================================================= */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-fadeIn">
              {isValidationBlocking ? (
                <Card className="p-8 text-center space-y-3 border-[#333333] bg-[#181818]">
                  <AlertTriangle className="w-8 h-8 text-[#A3A3A3] mx-auto" />
                  <h3 className="text-base font-bold text-gw-text">Step 4 Blocked</h3>
                  <p className="text-xs text-gw-text-secondary">Please resolve validation errors in Step 2 to evaluate Inclusion–Exclusion.</p>
                  <Button size="sm" onClick={() => setCurrentStep(2)}>Go to Step 2</Button>
                </Card>
              ) : pieResult ? (
                <Card className="p-6 border-[#333333] bg-[#181818] space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#333333]">
                    <div className="space-y-1">
                      <span className="text-xs font-mono uppercase tracking-wider text-[#FFFFFF] font-bold">
                        STEP 4 OF 6 — INCLUSION–EXCLUSION COUNTING ENGINE
                      </span>
                      <h2 className="text-lg font-bold text-gw-text flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-[#FFFFFF]" />
                        Exact Conflict-Free Valid Assignment Derivation
                      </h2>
                    </div>
                    <Badge variant={pieResult.validAssignments > 0n ? 'success' : 'danger'} size="sm" className="font-mono">
                      N = {pieResult.validAssignments.toString()} Valid Assignments
                    </Badge>
                  </div>

                  {/* Mathematical Formula Banner */}
                  <div className="p-4 rounded-xl bg-[#222222] border border-[#333333] text-center space-y-1.5">
                    <span className="text-xs font-mono text-gw-text-secondary uppercase">
                      Authoritative Discrete Mathematics Formula:
                    </span>
                    <div className="text-base sm:text-lg font-mono font-bold text-[#FFFFFF]">
                      {pieResult.formula}
                    </div>
                    <p className="text-[11px] text-gw-text-secondary">
                      {pieResult.isSquare
                        ? 'Square Bijection Model: Remaining (n - k) unconstrained flights can be assigned in (n - k)! ways.'
                        : 'Rectangular Injection Model: Remaining (m - k) unconstrained flights choose from (n - k) gates in P(n - k, m - k) ways.'}
                    </p>
                  </div>

                  {/* Itemized Alternating Terms Table */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold uppercase font-mono tracking-wider text-gw-text">
                        Itemized Alternating Inclusion–Exclusion Terms:
                      </h4>
                      <span className="text-[11px] font-mono text-gw-text-secondary">
                        Rook polynomial degree k = {pieResult.degree}
                      </span>
                    </div>

                    <div className="overflow-x-auto border border-[#333333] rounded-xl">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-[#111111] text-gw-text-secondary uppercase text-[10px] border-b border-[#333333]">
                          <tr>
                            <th className="py-2.5 px-3">k</th>
                            <th className="py-2.5 px-2 text-center">Sign</th>
                            <th className="py-2.5 px-3 text-right">Rook rₖ</th>
                            <th className="py-2.5 px-3 text-right">
                              {pieResult.isSquare ? '(n - k)!' : 'P(n - k, m - k)'}
                            </th>
                            <th className="py-2.5 px-4 text-right">Term Contribution</th>
                            <th className="py-2.5 px-4 text-right">Cumulative Sum</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#333333]">
                          {pieResult.terms.map((term) => (
                            <tr key={term.k} className="hover:bg-[#222222]/40 transition-colors">
                              <td className="py-2.5 px-3 font-bold text-gw-text">k = {term.k}</td>
                              <td className="py-2.5 px-2 text-center">
                                <span className="px-1.5 py-0.5 rounded font-bold bg-[#222222] text-[#FFFFFF]">
                                  {term.signSymbol}1
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right text-[#FFFFFF] font-bold">
                                {term.rookCoefficient.toString()}
                              </td>
                              <td className="py-2.5 px-3 text-right text-gw-text-secondary">
                                {term.remainingPermutations.toString()}
                              </td>
                              <td className="py-2.5 px-4 text-right font-bold text-[#FFFFFF]">
                                {term.signSymbol}{term.magnitude.toString()}
                              </td>
                              <td className="py-2.5 px-4 text-right text-gw-text font-bold">
                                {term.cumulativeSum.toString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div className="p-3 rounded-lg bg-[#222222] border border-[#333333]">
                      <span className="text-gw-text-secondary block mb-0.5 text-[10px] uppercase">Unrestricted Total</span>
                      <span className="text-base font-bold text-gw-text">{pieResult.totalPossibleAssignments.toString()}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-[#222222] border border-[#333333]">
                      <span className="text-gw-text-secondary block mb-0.5 text-[10px] uppercase">Positive Sum (+)</span>
                      <span className="text-base font-bold text-[#FFFFFF]">+{pieResult.positiveTermsSum.toString()}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-[#222222] border border-[#333333]">
                      <span className="text-gw-text-secondary block mb-0.5 text-[10px] uppercase">Negative Sum (−)</span>
                      <span className="text-base font-bold text-[#A3A3A3]">-{pieResult.negativeTermsSum.toString()}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-[#222222] border border-[#333333]">
                      <span className="text-gw-text-secondary block mb-0.5 text-[10px] uppercase">Feasibility Ratio</span>
                      <span className="text-base font-bold text-[#FFFFFF]">{pieResult.feasibilityPercentage.toFixed(2)}%</span>
                    </div>
                  </div>
                </Card>
              ) : null}
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 5: BACKTRACKING ALLOCATION ENGINE                            */}
          {/* ================================================================= */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-fadeIn">
              {isValidationBlocking ? (
                <Card className="p-8 text-center space-y-3 border-[#333333] bg-[#181818]">
                  <AlertTriangle className="w-8 h-8 text-[#A3A3A3] mx-auto" />
                  <h3 className="text-base font-bold text-gw-text">Step 5 Blocked</h3>
                  <p className="text-xs text-gw-text-secondary">Please resolve validation errors in Step 2 to generate flight-to-gate allocations.</p>
                  <Button size="sm" onClick={() => setCurrentStep(2)}>Go to Step 2</Button>
                </Card>
              ) : (
                <BacktrackingAllocationExplorer
                  scenarioName={simDetails?.name || selectedSimId}
                  scenarioId={selectedSimId}
                  matrix={matrix}
                  flights={simDetails?.flights || []}
                  gates={simDetails?.gates || []}
                  exactValidCount={pieResult?.validAssignments != null ? Number(pieResult.validAssignments) : calcData?.valid_assignments}
                />
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 6: CROSS-VERIFICATION & FINAL SYNTHESIS                      */}
          {/* ================================================================= */}
          {currentStep === 6 && (
            <Card className="p-6 border-[#333333] space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#333333]">
                <div className="space-y-1">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#A3A3A3] font-bold">
                    STEP 6 OF 6 — ALGORITHMIC CROSS-VERIFICATION & SYNTHESIS
                  </span>
                  <h2 className="text-lg font-bold text-gw-text flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[#FFFFFF]" />
                    Cross-Verification: Algebraic PIE vs. Backtracking Enumeration
                  </h2>
                </div>
                {crossVerificationReport && (
                  <Badge
                    variant="outline"
                    size="sm"
                    className="font-mono text-[#FFFFFF] border-[#333333]"
                  >
                    {crossVerificationReport.status}
                  </Badge>
                )}
              </div>

              {/* Side-by-Side Comparison Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-5 border-[#333333] bg-[#181818] text-center space-y-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-gw-text-secondary block">
                    Principle of Inclusion–Exclusion (Phase 12)
                  </span>
                  <div className="text-3xl font-mono font-bold text-[#FFFFFF]">
                    {pieResult?.validAssignments?.toString() ?? '—'}
                  </div>
                  <span className="text-[11px] text-[#A3A3A3] font-mono">
                    Exact Combinatorial Ground Truth ($N$)
                  </span>
                </Card>

                <Card className="p-5 border-[#333333] bg-[#181818] text-center space-y-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-gw-text-secondary block">
                    Exhaustive Backtracking Enumeration (Phase 13)
                  </span>
                  <div className="text-3xl font-mono font-bold text-[#FFFFFF]">
                    {backtrackingResult?.totalFound?.toString() ?? '—'}
                  </div>
                  <span className="text-[11px] text-[#A3A3A3] font-mono">
                    Materialized Conflict-Free Plans
                  </span>
                </Card>
              </div>

              {/* Cross-Verification Verdict Banner */}
              {crossVerificationReport && (
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 text-xs leading-relaxed ${
                    crossVerificationReport.verified
                      ? 'bg-[#181818] border-[#333333] text-[#FFFFFF]'
                      : crossVerificationReport.status === 'INCOMPLETE_SEARCH'
                      ? 'bg-[#181818] border-[#333333] text-[#A3A3A3]'
                      : 'bg-[#181818] border-[#333333] text-[#FFFFFF]'
                  }`}
                >
                  {crossVerificationReport.verified ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-[#FFFFFF]" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-[#A3A3A3]" />
                  )}
                  <div className="space-y-1">
                    <span className="font-bold text-sm">
                      {crossVerificationReport.verified
                        ? 'Mathematical Equality Confirmed'
                        : 'Algorithmic Verification Notice'}
                    </span>
                    <p>{crossVerificationReport.message}</p>
                  </div>
                </div>
              )}

              {/* Educational Experience: The 3 Core Algorithms */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-semibold uppercase font-mono tracking-wider text-gw-text flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#FFFFFF]" />
                  Educational Architecture: Comparing the Three Core Paradigms
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <Card className="p-4 border-[#333333] bg-[#181818] space-y-2">
                    <div className="flex items-center gap-2 font-mono font-bold text-[#FFFFFF]">
                      <Grid3X3 className="w-4 h-4" />
                      <span>1. Rook Polynomial</span>
                    </div>
                    <p className="text-gw-text-secondary leading-relaxed">
                      Counts the number of ways to place $k$ non-attacking rooks on forbidden cells. Runs in polynomial-time bitmask dynamic programming without generating flight schedules.
                    </p>
                  </Card>

                  <Card className="p-4 border-[#333333] bg-[#181818] space-y-2">
                    <div className="flex items-center gap-2 font-mono font-bold text-[#FFFFFF]">
                      <Calculator className="w-4 h-4" />
                      <span>2. Inclusion–Exclusion</span>
                    </div>
                    <p className="text-gw-text-secondary leading-relaxed">
                      Computes the exact number of conflict-free valid assignments $N$ using alternating signs and factorial products. Yields the ground truth count instantly.
                    </p>
                  </Card>

                  <Card className="p-4 border-[#333333] bg-[#181818] space-y-2">
                    <div className="flex items-center gap-2 font-mono font-bold text-[#FFFFFF]">
                      <Cpu className="w-4 h-4" />
                      <span>3. Backtracking Engine</span>
                    </div>
                    <p className="text-gw-text-secondary leading-relaxed">
                      Searches the discrete assignment tree, prunes forbidden branches, and materializes individual concrete flight-to-gate pairings for air traffic controllers.
                    </p>
                  </Card>
                </div>
              </div>

              {/* Action Buttons & Report Export */}
              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[#333333]">
                <Button
                  size="md"
                  variant="primary"
                  icon={FileText}
                  onClick={() => exportService.downloadScenarioPdf(selectedSimId)}
                  title="Download publication-grade binary PDF report covering all 7 sections"
                >
                  Download Simulation PDF Report
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
                <Link to="/reports">
                  <Button size="md" variant="outline" icon={ExternalLink}>
                    Reports Central
                  </Button>
                </Link>
                <Link to="/analytics">
                  <Button size="md" variant="outline" icon={ArrowRight}>
                    Open Analytics Dashboard
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
