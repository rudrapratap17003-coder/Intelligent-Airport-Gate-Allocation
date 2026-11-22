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
      <Card className="p-5 border-[#222E42] bg-[#121826] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-[#222E42]">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono uppercase tracking-wider text-[#FFFFFF] font-bold flex items-center gap-1.5">
                <PlayCircle className="w-4 h-4 text-[#FFFFFF]" />
                Phase 13 Backtracking Allocation Engine
              </span>
              {scenarioId && (
                <Badge variant="outline" size="sm" className="font-mono">
                  {scenarioId}
                </Badge>
              )}
              <Badge variant="default" size="sm" className="font-mono">
                {numFlights} Flights × {numGates} Gates
              </Badge>
            </div>
            <h3 className="text-lg font-bold text-[#FFFFFF]">
              Assignment Generation & Search — {scenarioName}
            </h3>
            <p className="text-xs text-[#A3A3A3]">
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
                className="font-mono"
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
                className="font-mono"
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
            <label className="text-[#A3A3A3] block font-sans font-medium text-[11px] uppercase tracking-wider">
              Search Mode
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMode('first')}
                className={`flex-1 py-1.5 px-2.5 rounded-lg border transition-all text-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                  mode === 'first'
                    ? 'bg-sky-500 text-slate-950 font-bold border-sky-400 shadow-xs'
                    : 'bg-[#1E2638] border-[#222E42] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#22314A]'
                }`}
              >
                First Solution
              </button>
              <button
                type="button"
                onClick={() => setMode('all')}
                className={`flex-1 py-1.5 px-2.5 rounded-lg border transition-all text-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                  mode === 'all'
                    ? 'bg-sky-500 text-slate-950 font-bold border-sky-400 shadow-xs'
                    : 'bg-[#1E2638] border-[#222E42] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#22314A]'
                }`}
              >
                All Solutions
              </button>
              <button
                type="button"
                onClick={() => setMode('limited')}
                className={`flex-1 py-1.5 px-2.5 rounded-lg border transition-all text-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                  mode === 'limited'
                    ? 'bg-sky-500 text-slate-950 font-bold border-sky-400 shadow-xs'
                    : 'bg-[#1E2638] border-[#222E42] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#22314A]'
                }`}
              >
                Limited
              </button>
            </div>
          </div>

          {/* Result Limit Presets (if not first mode) */}
          <div className="md:col-span-5 space-y-1.5">
            <label className="text-[#A3A3A3] block font-sans font-medium text-[11px] uppercase tracking-wider">
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
                  className={`px-2 py-1 rounded-md border text-[11px] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                    maxResults === lim && mode !== 'first'
                      ? 'bg-sky-500 text-slate-950 font-bold border-sky-400 shadow-xs'
                      : 'bg-[#1E2638] text-[#94A3B8] border-[#222E42] hover:text-[#F8FAFC] hover:bg-[#22314A]'
                  } ${mode === 'first' ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {lim}
                </button>
              ))}
            </div>
          </div>

          {/* Trace Logging Toggle */}
          <div className="md:col-span-2 space-y-1.5 pt-2 md:pt-4">
            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-[#FFFFFF]">
              <input
                type="checkbox"
                checked={includeTrace}
                onChange={(e) => setIncludeTrace(e.target.checked)}
                className="rounded border-[#222E42] bg-[#1E2638] text-[#FFFFFF] focus:ring-[#FFFFFF] cursor-pointer"
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
            <Card className="p-3 text-center bg-[#121826] border-[#222E42]">
              <span className="text-[10px] uppercase tracking-wider text-[#A3A3A3] block font-sans font-medium">
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
              <span className="text-[9px] text-[#737373] font-sans truncate block mt-0.5">
                {result.mode.toUpperCase()} MODE
              </span>
            </Card>

            {/* Total Generated */}
            <Card className="p-3 text-center bg-[#121826] border-[#222E42]">
              <span className="text-[10px] uppercase tracking-wider text-[#FFFFFF] block font-sans font-medium">
                Allocations Found
              </span>
              <span className="text-xl font-extrabold text-[#FFFFFF] mt-0.5 block">
                {result.totalGenerated.toLocaleString()}
              </span>
              <span className="text-[10px] text-[#737373] font-sans">
                Valid assignments
              </span>
            </Card>

            {/* Nodes Visited */}
            <Card className="p-3 text-center bg-[#121826] border-[#222E42]">
              <span className="text-[10px] uppercase tracking-wider text-[#A3A3A3] block font-sans font-medium">
                Nodes Visited
              </span>
              <span className="text-lg font-extrabold text-[#FFFFFF] mt-0.5 block">
                {result.searchStatistics.nodesVisited.toLocaleString()}
              </span>
              <span className="text-[10px] text-[#737373] font-sans">
                States evaluated
              </span>
            </Card>

            {/* Rejected Branches */}
            <Card className="p-3 text-center bg-[#121826] border-[#222E42]">
              <span className="text-[10px] uppercase tracking-wider text-[#A3A3A3] block font-sans font-medium">
                Pruned Branches
              </span>
              <span className="text-lg font-extrabold text-[#FFFFFF] mt-0.5 block">
                {result.searchStatistics.rejectedBranches.toLocaleString()}
              </span>
              <span className="text-[10px] text-[#737373] font-sans">
                Forbidden/Occupied
              </span>
            </Card>

            {/* Backtracks */}
            <Card className="p-3 text-center bg-[#121826] border-[#222E42]">
              <span className="text-[10px] uppercase tracking-wider text-[#A3A3A3] block font-sans font-medium">
                Backtracks
              </span>
              <span className="text-lg font-extrabold text-[#FFFFFF] mt-0.5 block">
                {result.searchStatistics.backtrackingOperations.toLocaleString()}
              </span>
              <span className="text-[10px] text-[#737373] font-sans">
                Branch rewinds
              </span>
            </Card>

            {/* Execution Time */}
            <Card className="p-3 text-center bg-[#121826] border-[#222E42]">
              <span className="text-[10px] uppercase tracking-wider text-[#A3A3A3] block font-sans font-medium">
                Compute Time
              </span>
              <span className="text-lg font-extrabold text-[#FFFFFF] mt-0.5 block">
                {result.searchStatistics.computationTimeMs} ms
              </span>
              <span className="text-[10px] text-[#737373] font-sans">
                Client Execution
              </span>
            </Card>
          </div>

          {/* ----------------- 3. PHASE 12 CROSS-VERIFICATION CARD ----------------- */}
          {crossVerification && (
            <Card className="p-4 border border-[#222E42] bg-[#121826] space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl border border-[#222E42] bg-[#1E2638] text-[#FFFFFF] shrink-0">
                    {crossVerification.status === 'VERIFIED' ? (
                      <ShieldCheck className="w-5 h-5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-[#FFFFFF] font-mono">
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
                    <p className="text-xs text-[#A3A3A3] mt-0.5">
                      {crossVerification.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs shrink-0 bg-[#1E2638] px-3 py-1.5 rounded-lg border border-[#222E42]">
                  <div>
                    <span className="text-[#A3A3A3] block text-[10px]">Phase 12 (PIE):</span>
                    <strong className="text-[#FFFFFF] text-sm">{crossVerification.phase12ExactCount}</strong>
                  </div>
                  <span className="text-[#737373] font-bold">vs</span>
                  <div>
                    <span className="text-[#A3A3A3] block text-[10px]">Phase 13 (Gen):</span>
                    <strong className="text-[#FFFFFF] text-sm">{crossVerification.phase13GeneratedCount}</strong>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ----------------- 4. VISUAL ASSIGNMENT BOARD & PAIRINGS ----------------- */}
          {result.allocations.length > 0 && currentAllocation && (
            <Card className="p-5 space-y-4 border-[#222E42] bg-[#121826]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#222E42]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-[#FFFFFF]">
                      Allocation Plan #{selectedAllocationIndex + 1} of {result.totalGenerated}
                    </span>
                    <Badge variant="outline" size="sm" className="font-mono">
                      {currentAllocation.allocationId}
                    </Badge>
                    <Badge variant="success" size="sm">
                      {currentAllocation.assignedFlights} / {numFlights} Assigned
                    </Badge>
                  </div>
                  <p className="text-xs text-[#A3A3A3]">
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
                  <span className="text-xs font-mono text-[#A3A3A3]">
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
                      className="p-3.5 rounded-xl border border-[#222E42] bg-[#1E2638] hover:bg-[#1E2638] transition-all flex items-center justify-between gap-2 shadow-sm"
                    >
                      {/* Flight side */}
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#FFFFFF]">
                          <Plane className="w-3.5 h-3.5 text-[#FFFFFF] shrink-0" />
                          <span>{flightObj?.flightNumber || assignment.flightId}</span>
                        </div>
                        <span className="text-[10px] text-[#A3A3A3] block">
                          {flightObj?.airline || 'Airline'} ({assignment.flightId})
                        </span>
                      </div>

                      {/* Direction Arrow */}
                      <span className="font-mono text-xs text-[#FFFFFF] font-extrabold px-1">
                        →
                      </span>

                      {/* Gate side */}
                      <div className="space-y-0.5 text-right">
                        <div className="flex items-center justify-end gap-1.5 font-mono text-xs font-bold text-[#FFFFFF]">
                          <DoorClosed className="w-3.5 h-3.5 text-[#FFFFFF] shrink-0" />
                          <span>{gateObj?.gateNumber || assignment.gateId}</span>
                        </div>
                        <span className="text-[10px] text-[#A3A3A3] block">
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
            <Card className="p-5 space-y-4 border border-[#222E42] bg-[#121826]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#222E42]">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-[#FFFFFF]" />
                    <h4 className="text-sm font-bold text-[#FFFFFF]">
                      Educational Backtracking Search Step-by-Step Visualization
                    </h4>
                  </div>
                  <p className="text-xs text-[#A3A3A3]">
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
                  <span className="text-xs font-mono text-[#A3A3A3]">
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
              <div className="p-4 rounded-xl bg-[#0D121F] border border-[#222E42] space-y-3 font-mono">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#222E42] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#A3A3A3]">
                      Event #{activeTraceStep.stepNumber}:
                    </span>
                    <Badge
                      variant={
                        activeTraceStep.stepType === 'ACCEPT'
                          ? 'success'
                          : activeTraceStep.stepType === 'SOLUTION'
                          ? 'default'
                          : activeTraceStep.stepType === 'BACKTRACK'
                          ? 'warning'
                          : 'error'
                      }
                      size="sm"
                    >
                      {activeTraceStep.stepType}
                    </Badge>
                  </div>

                  <span className="text-xs text-[#A3A3A3]">
                    {activeTraceStep.flightId && activeTraceStep.gateId && (
                      <span>
                        Flight: <strong className="text-[#FFFFFF]">{activeTraceStep.flightId}</strong> ↔ Candidate Gate:{' '}
                        <strong className="text-[#FFFFFF]">{activeTraceStep.gateId}</strong>
                      </span>
                    )}
                  </span>
                </div>

                <p className="text-xs text-[#FFFFFF] leading-relaxed font-sans">
                  {activeTraceStep.detail}
                </p>

                {/* Explanation of Decision */}
                <div className="text-[11px] text-[#A3A3A3] pt-2 border-t border-[#222E42] flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-[#FFFFFF] shrink-0" />
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
            <div className="p-4 rounded-xl bg-[#121826] border border-[#334155] text-xs text-[#FFFFFF] flex items-start gap-3">
              <XCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#FFFFFF]" />
              <div className="space-y-1">
                <strong className="font-bold text-sm block">No Valid Allocation Possible</strong>
                <p className="leading-relaxed text-[#A3A3A3]">
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
