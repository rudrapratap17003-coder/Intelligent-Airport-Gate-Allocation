import React, { useState, useMemo, useCallback } from 'react'
import {
  PlayCircle,
  RotateCcw,
  StopCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Info,
  Clock,
  Layers,
  Plane,
  DoorClosed,
  Sparkles,
  GitBranch,
  ShieldCheck,
  Search,
  Eye,
  List
} from 'lucide-react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import {
  generateAllocations,
  crossVerifyWithPhase12,
  computeExactValidAssignments
} from '../../lib/backtrackingAllocationService'

const PRESET_LIMITS = [10, 50, 100, 309, 500, 1000]

export const BacktrackingAllocationExplorer = ({
  scenarioName = 'Selected Simulation',
  scenarioId = '',
  matrix = [],
  flightIds = [],
  gateIds = [],
  flights = [],
  gates = [],
  phase12ExactCount,
  onAllocationsGenerated,
  className = ''
}) => {
  // Search configuration state
  const [mode, setMode] = useState('all') // 'first' | 'all' | 'limited'
  const [maxResults, setMaxResults] = useState(100)
  const [customLimit, setCustomLimit] = useState('100')
  const [includeTrace, setIncludeTrace] = useState(true)

  // Execution state
  const [result, setResult] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeCancelToken, setActiveCancelToken] = useState(null)
  const [selectedAllocationIndex, setSelectedAllocationIndex] = useState(0)

  // Step-by-step trace inspection state
  const [traceStepIndex, setTraceStepIndex] = useState(0)

  // Lookup maps
  const flightMap = useMemo(() => new Map(flights.map((f) => [f.id, f])), [flights])
  const gateMap = useMemo(() => new Map(gates.map((g) => [g.id, g])), [gates])

  const numFlights = flightIds.length
  const numGates = gateIds.length

  // Trigger allocation generation
  const handleGenerate = useCallback(() => {
    if (!matrix || matrix.length === 0 || numFlights === 0 || numGates === 0) {
      return
    }

    const cancelToken = { isCancelled: false }
    setActiveCancelToken(cancelToken)
    setIsGenerating(true)

    // Execute with brief timeout to permit UI render
    setTimeout(() => {
      try {
        const effectiveLimit = mode === 'first' ? 1 : mode === 'limited' ? Number(maxResults) || 100 : Number(maxResults) || 1000

        const res = generateAllocations({
          matrix,
          flightIds,
          gateIds,
          mode,
          maxResults: effectiveLimit,
          includeTrace,
          maxTraceSteps: 200,
          cancelToken,
          flights,
          gates
        })

        setResult(res)
        setSelectedAllocationIndex(0)
        setTraceStepIndex(0)

        if (onAllocationsGenerated) {
          onAllocationsGenerated(res)
        }
      } catch (err) {
        console.error('Backtracking allocation generation failed:', err)
      } finally {
        setIsGenerating(false)
        setActiveCancelToken(null)
      }
    }, 20)
  }, [matrix, flightIds, gateIds, mode, maxResults, includeTrace, flights, gates, numFlights, numGates, onAllocationsGenerated])

  // Handle Stop/Cancel
  const handleStop = () => {
    if (activeCancelToken) {
      activeCancelToken.isCancelled = true
    }
  }

  // Active allocation being inspected
  const currentAllocation = useMemo(() => {
    if (!result?.allocations || result.allocations.length === 0) return null
    const idx = Math.min(selectedAllocationIndex, result.allocations.length - 1)
    return result.allocations[idx] || null
  }, [result, selectedAllocationIndex])

  // Phase 12 Cross-Verification Report
  const crossVerification = useMemo(() => {
    if (!result || numFlights === 0 || numGates === 0 || numFlights !== numGates) {
      return null
    }

    // Determine Phase 12 count
    let p12Count = phase12ExactCount
    if (p12Count === undefined || p12Count === null) {
      try {
        p12Count = computeExactValidAssignments(matrix)
      } catch {
        p12Count = null
      }
    }

    if (p12Count === null) return null

    if (result.resultLimitReached) {
      return {
        status: 'INCOMPLETE_SEARCH',
        phase12ExactCount: p12Count,
        phase13GeneratedCount: result.totalGenerated,
        message: `Search reached the limit cap (${result.maxResults}). Cannot declare mathematical total agreement until all branches are explored.`
      }
    }

    if (result.status === 'CANCELLED') {
      return {
        status: 'CANCELLED',
        phase12ExactCount: p12Count,
        phase13GeneratedCount: result.totalGenerated,
        message: 'Search was stopped early by user.'
      }
    }

    const matches = p12Count === result.totalGenerated
    return {
      status: matches ? 'VERIFIED' : 'DISCREPANCY',
      phase12ExactCount: p12Count,
      phase13GeneratedCount: result.totalGenerated,
      matches,
      message: matches
        ? `Exact Agreement: Phase 12 Inclusion-Exclusion formula (${p12Count}) matches Phase 13 Backtracking generator (${result.totalGenerated} allocations).`
        : `Discrepancy: Phase 12 count is ${p12Count}, but Phase 13 generated ${result.totalGenerated}.`
    }
  }, [result, matrix, numFlights, numGates, phase12ExactCount])

  // Active trace step
  const activeTraceStep = useMemo(() => {
    if (!result?.trace || result.trace.length === 0) return null
    const idx = Math.min(traceStepIndex, result.trace.length - 1)
    return result.trace[idx] || null
  }, [result, traceStepIndex])

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ----------------- 1. ENGINE CONTROLS & SCENARIO CARD ----------------- */}
      <Card className="p-5 border-[#1e3a5f]/80 bg-gw-bg-secondary/70 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-[#1e3a5f]/50">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono uppercase tracking-wider text-gw-success font-bold flex items-center gap-1.5">
                <PlayCircle className="w-4 h-4 text-gw-success" />
                Phase 13 Backtracking Allocation Engine
              </span>
              {scenarioId && (
                <Badge variant="cyan" size="sm" className="font-mono">
                  {scenarioId}
                </Badge>
              )}
              <Badge variant="default" size="sm" className="font-mono">
                {numFlights} Flights × {numGates} Gates
              </Badge>
            </div>
            <h3 className="text-lg font-bold text-gw-text">
              Assignment Generation & Search — {scenarioName}
            </h3>
            <p className="text-xs text-gw-text-secondary">
              Generates actual conflict-free flight-to-gate assignments using recursive backtracking on binary restriction board B.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 shrink-0">
            {isGenerating ? (
              <Button
                variant="danger"
                size="md"
                icon={StopCircle}
                onClick={handleStop}
                className="font-mono animate-pulse"
              >
                Stop Search
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                icon={PlayCircle}
                onClick={handleGenerate}
                disabled={numFlights === 0 || numGates === 0}
                className="shadow-lg shadow-gw-success/15 font-mono"
              >
                GENERATE ALLOCATIONS
              </Button>
            )}
          </div>
        </div>

        {/* Search Mode & Limit Controls */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pt-1 text-xs font-mono">
          {/* Mode Selector */}
          <div className="md:col-span-5 space-y-1.5">
            <label className="text-gw-text-secondary block font-sans font-medium text-[11px] uppercase tracking-wider">
              Search Mode
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMode('first')}
                className={`flex-1 py-1.5 px-2.5 rounded-lg border transition-all text-center cursor-pointer ${
                  mode === 'first'
                    ? 'bg-gw-cyan/20 border-gw-cyan text-gw-cyan font-bold shadow-sm'
                    : 'bg-gw-bg-primary/60 border-[#1e3a5f] text-gw-text-secondary hover:text-gw-text'
                }`}
              >
                First Solution
              </button>
              <button
                type="button"
                onClick={() => setMode('all')}
                className={`flex-1 py-1.5 px-2.5 rounded-lg border transition-all text-center cursor-pointer ${
                  mode === 'all'
                    ? 'bg-gw-cyan/20 border-gw-cyan text-gw-cyan font-bold shadow-sm'
                    : 'bg-gw-bg-primary/60 border-[#1e3a5f] text-gw-text-secondary hover:text-gw-text'
                }`}
              >
                All Solutions
              </button>
              <button
                type="button"
                onClick={() => setMode('limited')}
                className={`flex-1 py-1.5 px-2.5 rounded-lg border transition-all text-center cursor-pointer ${
                  mode === 'limited'
                    ? 'bg-gw-cyan/20 border-gw-cyan text-gw-cyan font-bold shadow-sm'
                    : 'bg-gw-bg-primary/60 border-[#1e3a5f] text-gw-text-secondary hover:text-gw-text'
                }`}
              >
                Limited
              </button>
            </div>
          </div>

          {/* Result Limit Presets (if not first mode) */}
          <div className="md:col-span-5 space-y-1.5">
            <label className="text-gw-text-secondary block font-sans font-medium text-[11px] uppercase tracking-wider">
              Maximum Solution Limit
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {PRESET_LIMITS.map((lim) => (
                <button
                  key={lim}
                  type="button"
                  disabled={mode === 'first'}
                  onClick={() => {
                    setMaxResults(lim)
                    setCustomLimit(String(lim))
                  }}
                  className={`px-2 py-1 rounded-md border text-[11px] transition-colors cursor-pointer ${
                    maxResults === lim && mode !== 'first'
                      ? 'bg-gw-cyan text-gw-bg font-bold border-gw-cyan'
                      : 'bg-gw-bg-primary/50 text-gw-text-secondary border-[#1e3a5f] hover:text-gw-text'
                  } ${mode === 'first' ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {lim}
                </button>
              ))}
            </div>
          </div>

          {/* Trace Logging Toggle */}
          <div className="md:col-span-2 space-y-1.5 pt-2 md:pt-4">
            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-gw-text">
              <input
                type="checkbox"
                checked={includeTrace}
                onChange={(e) => setIncludeTrace(e.target.checked)}
                className="rounded border-[#1e3a5f] bg-gw-bg-secondary text-gw-cyan focus:ring-gw-cyan cursor-pointer"
              />
              <span>Trace Steps</span>
            </label>
          </div>
        </div>
      </Card>

      {/* ----------------- 2. SEARCH METRICS & STATUS ----------------- */}
      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
            {/* Status Card */}
            <Card className="p-3 text-center bg-gw-bg-secondary/40 border-[#1e3a5f]/60">
              <span className="text-[10px] uppercase tracking-wider text-gw-text-secondary block font-sans font-medium">
                Search Status
              </span>
              <span className="mt-1 block">
                <Badge
                  variant={
                    result.status === 'COMPLETED'
                      ? 'success'
                      : result.status === 'LIMIT_REACHED'
                      ? 'warning'
                      : result.status === 'NO_SOLUTIONS'
                      ? 'error'
                      : 'default'
                  }
                  size="sm"
                >
                  {result.status}
                </Badge>
              </span>
              <span className="text-[9px] text-gw-text-secondary font-sans truncate block mt-0.5">
                {result.mode.toUpperCase()} MODE
              </span>
            </Card>

            {/* Total Generated */}
            <Card className="p-3 text-center bg-gw-bg-secondary/40 border-[#1e3a5f]/60">
              <span className="text-[10px] uppercase tracking-wider text-gw-success block font-sans font-medium">
                Allocations Found
              </span>
              <span className="text-xl font-extrabold text-gw-success mt-0.5 block">
                {result.totalGenerated.toLocaleString()}
              </span>
              <span className="text-[10px] text-gw-text-secondary font-sans">
                Valid assignments
              </span>
            </Card>

            {/* Nodes Visited */}
            <Card className="p-3 text-center bg-gw-bg-secondary/40 border-[#1e3a5f]/60">
              <span className="text-[10px] uppercase tracking-wider text-gw-cyan block font-sans font-medium">
                Nodes Visited
              </span>
              <span className="text-lg font-extrabold text-gw-cyan mt-0.5 block">
                {result.searchStatistics.nodesVisited.toLocaleString()}
              </span>
              <span className="text-[10px] text-gw-text-secondary font-sans">
                States evaluated
              </span>
            </Card>

            {/* Rejected Branches */}
            <Card className="p-3 text-center bg-gw-bg-secondary/40 border-[#1e3a5f]/60">
              <span className="text-[10px] uppercase tracking-wider text-gw-error block font-sans font-medium">
                Pruned Branches
              </span>
              <span className="text-lg font-extrabold text-gw-error mt-0.5 block">
                {result.searchStatistics.rejectedBranches.toLocaleString()}
              </span>
              <span className="text-[10px] text-gw-text-secondary font-sans">
                Forbidden/Occupied
              </span>
            </Card>

            {/* Backtracks */}
            <Card className="p-3 text-center bg-gw-bg-secondary/40 border-[#1e3a5f]/60">
              <span className="text-[10px] uppercase tracking-wider text-gw-warning block font-sans font-medium">
                Backtracks
              </span>
              <span className="text-lg font-extrabold text-gw-warning mt-0.5 block">
                {result.searchStatistics.backtrackingOperations.toLocaleString()}
              </span>
              <span className="text-[10px] text-gw-text-secondary font-sans">
                Branch rewinds
              </span>
            </Card>

            {/* Execution Time */}
            <Card className="p-3 text-center bg-gw-bg-secondary/40 border-[#1e3a5f]/60">
              <span className="text-[10px] uppercase tracking-wider text-gw-blue block font-sans font-medium">
                Compute Time
              </span>
              <span className="text-lg font-extrabold text-gw-blue mt-0.5 block">
                {result.searchStatistics.computationTimeMs} ms
              </span>
              <span className="text-[10px] text-gw-text-secondary font-sans">
                Client Execution
              </span>
            </Card>
          </div>

          {/* ----------------- 3. PHASE 12 CROSS-VERIFICATION CARD ----------------- */}
          {crossVerification && (
            <Card
              className={`p-4 border-2 transition-all space-y-2 ${
                crossVerification.status === 'VERIFIED'
                  ? 'border-gw-success/50 bg-gw-success/[0.03]'
                  : crossVerification.status === 'INCOMPLETE_SEARCH'
                  ? 'border-gw-warning/50 bg-gw-warning/[0.03]'
                  : 'border-gw-error/50 bg-gw-error/[0.03]'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-xl border shrink-0 ${
                      crossVerification.status === 'VERIFIED'
                        ? 'bg-gw-success/15 border-gw-success/40 text-gw-success'
                        : crossVerification.status === 'INCOMPLETE_SEARCH'
                        ? 'bg-gw-warning/15 border-gw-warning/40 text-gw-warning'
                        : 'bg-gw-error/15 border-gw-error/40 text-gw-error'
                    }`}
                  >
                    {crossVerification.status === 'VERIFIED' ? (
                      <ShieldCheck className="w-5 h-5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-gw-text font-mono">
                        Phase 12 PIE ↔ Phase 13 Backtracking Cross-Verification
                      </h4>
                      <Badge
                        variant={
                          crossVerification.status === 'VERIFIED'
                            ? 'success'
                            : crossVerification.status === 'INCOMPLETE_SEARCH'
                            ? 'warning'
                            : 'error'
                        }
                        size="sm"
                      >
                        {crossVerification.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gw-text-secondary mt-0.5">
                      {crossVerification.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs shrink-0 bg-gw-bg-primary/80 px-3 py-1.5 rounded-lg border border-[#1e3a5f]">
                  <div>
                    <span className="text-gw-text-secondary block text-[10px]">Phase 12 (PIE):</span>
                    <strong className="text-gw-cyan text-sm">{crossVerification.phase12ExactCount}</strong>
                  </div>
                  <span className="text-gw-text-secondary font-bold">vs</span>
                  <div>
                    <span className="text-gw-text-secondary block text-[10px]">Phase 13 (Gen):</span>
                    <strong className="text-gw-success text-sm">{crossVerification.phase13GeneratedCount}</strong>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ----------------- 4. VISUAL ASSIGNMENT BOARD & PAIRINGS ----------------- */}
          {result.allocations.length > 0 && currentAllocation && (
            <Card className="p-5 space-y-4 border-[#1e3a5f]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e3a5f]/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-gw-cyan">
                      Allocation Plan #{selectedAllocationIndex + 1} of {result.totalGenerated}
                    </span>
                    <Badge variant="cyan" size="sm" className="font-mono">
                      {currentAllocation.allocationId}
                    </Badge>
                    <Badge variant="success" size="sm">
                      {currentAllocation.assignedFlights} / {numFlights} Assigned
                    </Badge>
                  </div>
                  <p className="text-xs text-gw-text-secondary">
                    Every flight is assigned exactly one permitted gate. Zero double bookings or restricted pairs.
                  </p>
                </div>

                {/* Plan Navigation Controls */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={ChevronLeft}
                    onClick={() => setSelectedAllocationIndex((prev) => Math.max(0, prev - 1))}
                    disabled={selectedAllocationIndex === 0}
                    title="Previous allocation plan"
                  />
                  <span className="text-xs font-mono text-gw-text-secondary">
                    Plan {selectedAllocationIndex + 1} / {result.totalGenerated}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={ChevronRight}
                    onClick={() =>
                      setSelectedAllocationIndex((prev) => Math.min(result.totalGenerated - 1, prev + 1))
                    }
                    disabled={selectedAllocationIndex >= result.totalGenerated - 1}
                    title="Next allocation plan"
                  />
                </div>
              </div>

              {/* Concrete Mapping Cards: Flight AI101 -> Gate GT-001 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {currentAllocation.assignments.map((assignment, idx) => {
                  const flightObj = flightMap.get(assignment.flightId)
                  const gateObj = gateMap.get(assignment.gateId)

                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-gw-success/30 bg-gw-bg-secondary/50 hover:bg-gw-bg-secondary/80 transition-all flex items-center justify-between gap-2 shadow-sm"
                    >
                      {/* Flight side */}
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-gw-text">
                          <Plane className="w-3.5 h-3.5 text-gw-cyan shrink-0" />
                          <span>{flightObj?.flightNumber || assignment.flightId}</span>
                        </div>
                        <span className="text-[10px] text-gw-text-secondary block">
                          {flightObj?.airline || 'Airline'} ({assignment.flightId})
                        </span>
                      </div>

                      {/* Direction Arrow */}
                      <span className="font-mono text-xs text-gw-success font-extrabold px-1">
                        →
                      </span>

                      {/* Gate side */}
                      <div className="space-y-0.5 text-right">
                        <div className="flex items-center justify-end gap-1.5 font-mono text-xs font-bold text-gw-success">
                          <DoorClosed className="w-3.5 h-3.5 text-gw-success shrink-0" />
                          <span>{gateObj?.gateNumber || assignment.gateId}</span>
                        </div>
                        <span className="text-[10px] text-gw-text-secondary block">
                          {gateObj?.terminal || 'T1'} ({gateObj?.gateType || 'Universal'})
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* ----------------- 5. STEP-BY-STEP SEARCH VISUALIZATION (REQ 8) ----------------- */}
          {includeTrace && result.trace && result.trace.length > 0 && activeTraceStep && (
            <Card className="p-5 space-y-4 border-2 border-gw-blue/40 bg-gw-bg-secondary/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e3a5f]/50">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-gw-blue" />
                    <h4 className="gw-card-heading">
                      Educational Backtracking Search Step-by-Step Visualization
                    </h4>
                  </div>
                  <p className="text-xs text-gw-text-secondary">
                    Inspect the decision tree: restriction checks, gate occupancy pruning, assignments, and recursive backtracks.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={ChevronLeft}
                    onClick={() => setTraceStepIndex((prev) => Math.max(0, prev - 1))}
                    disabled={traceStepIndex === 0}
                    title="Previous search step"
                  />
                  <span className="text-xs font-mono text-gw-text-secondary">
                    Step {traceStepIndex + 1} of {result.trace.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={ChevronRight}
                    onClick={() => setTraceStepIndex((prev) => Math.min(result.trace.length - 1, prev + 1))}
                    disabled={traceStepIndex >= result.trace.length - 1}
                    title="Next search step"
                  />
                </div>
              </div>

              {/* Active Step Detail Card */}
              <div className="p-4 rounded-xl bg-gw-bg-primary/80 border border-[#1e3a5f] space-y-3 font-mono">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e3a5f]/50 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gw-text-secondary">
                      Event #{activeTraceStep.stepNumber}:
                    </span>
                    <Badge
                      variant={
                        activeTraceStep.stepType === 'ACCEPT'
                          ? 'success'
                          : activeTraceStep.stepType === 'SOLUTION'
                          ? 'cyan'
                          : activeTraceStep.stepType === 'BACKTRACK'
                          ? 'warning'
                          : 'error'
                      }
                      size="sm"
                    >
                      {activeTraceStep.stepType}
                    </Badge>
                  </div>

                  <span className="text-xs text-gw-text-secondary">
                    {activeTraceStep.flightId && activeTraceStep.gateId && (
                      <span>
                        Flight: <strong className="text-gw-text">{activeTraceStep.flightId}</strong> ↔ Candidate Gate:{' '}
                        <strong className="text-gw-text">{activeTraceStep.gateId}</strong>
                      </span>
                    )}
                  </span>
                </div>

                <p className="text-xs text-gw-text leading-relaxed font-sans">
                  {activeTraceStep.detail}
                </p>

                {/* Explanation of Decision */}
                <div className="text-[11px] text-gw-text-secondary pt-2 border-t border-[#1e3a5f]/40 flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-gw-cyan shrink-0" />
                  <span>
                    {activeTraceStep.stepType === 'ACCEPT'
                      ? 'Gate is permitted (matrix B[r][c] = 0) and currently free. Engine recursively proceeds to next flight.'
                      : activeTraceStep.stepType === 'REJECT_RESTRICTED'
                      ? 'Rejected immediately because this pairing is restricted in the matrix (B[r][c] = 1). Branch pruned.'
                      : activeTraceStep.stepType === 'REJECT_OCCUPIED'
                      ? 'Rejected because another flight has already claimed this gate. Double-booking prevented.'
                      : activeTraceStep.stepType === 'BACKTRACK'
                      ? 'Exhausted candidate gates or downstream failure. Undoing assignment to try alternative gates.'
                      : 'All flights successfully assigned conflict-free gates. Solution stored in allocation pool.'}
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* Zero Solutions Warning */}
          {result.status === 'NO_SOLUTIONS' && (
            <div className="p-4 rounded-xl bg-gw-error/15 border border-gw-error/30 text-xs text-gw-error flex items-start gap-3">
              <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="font-bold text-sm block">No Valid Allocation Possible</strong>
                <p className="leading-relaxed">
                  The Backtracking Allocation Engine exhausted all search branches without finding a complete assignment.
                  Every flight-to-gate path encountered either a forbidden restriction ($b_{ij}=1$) or a collision with previously claimed gates.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default BacktrackingAllocationExplorer
