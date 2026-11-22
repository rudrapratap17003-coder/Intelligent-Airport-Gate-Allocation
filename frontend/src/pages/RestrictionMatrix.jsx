import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  RotateCcw,
  Ban,
  Save,
  AlertTriangle,
  Info,
  Layers,
  Plane,
  DoorOpen,
  Lock,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Calculator,
  PlayCircle
} from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Dropdown from '../components/ui/Dropdown'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import RookPolynomialVisualizer from '../components/matrix/RookPolynomialVisualizer'
import BacktrackingAllocationExplorer from '../components/allocations/BacktrackingAllocationExplorer'
import simulationService from '../lib/simulationService'
import flightService, { INITIAL_SAMPLE_FLIGHTS } from '../lib/flightService'
import gateService, { INITIAL_SAMPLE_GATES } from '../lib/gateService'
import restrictionService, { createZeroMatrix } from '../lib/restrictionService'
import matrixValidationService from '../lib/matrixValidationService'
import { useToast } from '../context/ToastContext'

export const RestrictionMatrix = () => {
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  // Registry data
  const [simulations, setSimulations] = useState([])
  const [selectedSimulationId, setSelectedSimulationId] = useState(searchParams.get('sim') || '')
  const [allFlights, setAllFlights] = useState([])
  const [allGates, setAllGates] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Active matrix state
  const [matrix, setMatrix] = useState([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Validation Engine State (Phase 10)
  const [isDiagnosticsDismissed, setIsDiagnosticsDismissed] = useState(false)
  const [isValidationPanelOpen, setIsValidationPanelOpen] = useState(true)
  const [validationTab, setValidationTab] = useState('all') // 'all' | 'errors' | 'warnings' | 'operational'

  // Modals for Unsaved Changes, Reset Confirmation, and Bulk Action
  const [pendingSimulationId, setPendingSimulationId] = useState(null)
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [isAllForbiddenModalOpen, setIsAllForbiddenModalOpen] = useState(false)

  // Rook Polynomial Engine Section Ref (Phase 11)
  const rookSectionRef = React.useRef(null)

  const handleScrollToRookEngine = useCallback(() => {
    if (rookSectionRef.current) {
      rookSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  // Backtracking Allocation Engine Section Ref (Phase 13)
  const backtrackingSectionRef = React.useRef(null)

  const handleScrollToBacktrackingEngine = useCallback(() => {
    if (backtrackingSectionRef.current) {
      backtrackingSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  // 1. Load simulations, flights, and gates on mount
  const loadFoundationalData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [simsResult, flightsResult, gatesResult] = await Promise.allSettled([
        simulationService.getSimulations(),
        flightService.getFlights(),
        gateService.getGates()
      ])

      const loadedSims = simsResult.status === 'fulfilled' ? simsResult.value : []
      const loadedFlights = flightsResult.status === 'fulfilled' ? flightsResult.value : INITIAL_SAMPLE_FLIGHTS
      const loadedGates = gatesResult.status === 'fulfilled' ? gatesResult.value : INITIAL_SAMPLE_GATES

      setSimulations(loadedSims)
      setAllFlights(loadedFlights)
      setAllGates(loadedGates)

      if (loadedSims.length > 0) {
        const querySimId = searchParams.get('sim')
        const matchedSim = querySimId ? loadedSims.find((s) => s.id === querySimId) : null
        const sim001 = loadedSims.find((s) => s.id === 'SIM-001')
        const readySim = loadedSims.find((s) => s.status === 'Ready')
        const initialSim = matchedSim || sim001 || readySim || loadedSims[0]
        setSelectedSimulationId(initialSim.id)
      }
    } catch (err) {
      console.error('Failed to load foundational matrix data:', err)
      toast.error('Load Error', 'Could not initialize registry data.')
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadFoundationalData()
  }, [loadFoundationalData])

  // Resolve current active simulation
  const currentSimulation = useMemo(() => {
    return simulations.find((s) => s.id === selectedSimulationId) || null
  }, [simulations, selectedSimulationId])

  // Resolve active flights and gates for the current simulation
  const resolvedScenario = useMemo(() => {
    if (!currentSimulation) {
      return { flights: [], gates: [], missingFlightIds: [], missingGateIds: [] }
    }

    const flightMap = new Map(allFlights.map((f) => [f.id, f]))
    const gateMap = new Map(allGates.map((g) => [g.id, g]))

    const selectedFIds = currentSimulation.selectedFlightIds || currentSimulation.selected_flight_ids || []
    const selectedGIds = currentSimulation.selectedGateIds || currentSimulation.selected_gate_ids || []

    const flights = []
    const missingFlightIds = []
    for (const fId of selectedFIds) {
      if (flightMap.has(fId)) {
        flights.push(flightMap.get(fId))
      } else {
        missingFlightIds.push(fId)
        flights.push({
          id: fId,
          flightNumber: fId,
          airline: 'Unknown / Missing',
          terminal: 'T1',
          isMissing: true
        })
      }
    }

    const gates = []
    const missingGateIds = []
    for (const gId of selectedGIds) {
      if (gateMap.has(gId)) {
        gates.push(gateMap.get(gId))
      } else {
        missingGateIds.push(gId)
        gates.push({
          id: gId,
          gateNumber: gId,
          terminal: 'T1',
          gateType: 'Universal',
          isMissing: true
        })
      }
    }

    return { flights, gates, missingFlightIds, missingGateIds }
  }, [currentSimulation, allFlights, allGates])

  // 2. Load or initialize matrix when selected scenario changes
  useEffect(() => {
    let isCancelled = false

    const loadMatrix = async () => {
      if (!currentSimulation) {
        setMatrix([])
        setHasUnsavedChanges(false)
        return
      }

      const numF = resolvedScenario.flights.length
      const numG = resolvedScenario.gates.length

      if (numF === 0 || numG === 0) {
        setMatrix([])
        setHasUnsavedChanges(false)
        return
      }

      try {
        const currentFIds = resolvedScenario.flights.map((f) => f.id)
        const currentGIds = resolvedScenario.gates.map((g) => g.id)
        const loaded = await restrictionService.getMatrixForSimulation(
          currentSimulation.id,
          numF,
          numG,
          currentFIds,
          currentGIds
        )
        if (!isCancelled) {
          setMatrix(loaded)
          setHasUnsavedChanges(false)
        }
      } catch (err) {
        console.error('Failed to load matrix:', err)
        if (!isCancelled) {
          const zero = createZeroMatrix(numF, numG)
          setMatrix(zero)
          setHasUnsavedChanges(false)
        }
      }
    }

    loadMatrix()

    return () => {
      isCancelled = true
    }
  }, [currentSimulation?.id, resolvedScenario.flights.length, resolvedScenario.gates.length])

  // 3. Matrix Validation Engine (Phase 10)
  // Automatically validate when simulation, matrix, or registry changes
  const validationReport = useMemo(() => {
    if (isDiagnosticsDismissed) return null
    if (currentSimulation && matrix && matrix.length > 0) {
      return matrixValidationService.validateMatrix(
        currentSimulation,
        matrix,
        allFlights,
        allGates
      )
    }
    return null
  }, [currentSimulation, matrix, allFlights, allGates, isDiagnosticsDismissed])

  // Manual Revalidate Action
  const handleManualValidate = useCallback(() => {
    setIsDiagnosticsDismissed(false)
    if (!currentSimulation || matrix.length === 0) {
      toast.error('Validation Error', 'No active matrix to validate.')
      return
    }

    const report = matrixValidationService.validateMatrix(
      currentSimulation,
      matrix,
      allFlights,
      allGates
    )
    setIsValidationPanelOpen(true)

    if (report.status === 'PASSED') {
      toast.success(
        'Matrix Validation Passed',
        `Board is structurally sound (${report.passedChecks}/${report.totalChecks} checks passed).`
      )
    } else if (report.status === 'WARNINGS') {
      toast.warning(
        'Validation Warnings',
        `Found ${report.warningCount} operational/structural warning(s) for review.`
      )
    } else {
      toast.error(
        'Validation Failed',
        `Found ${report.errorCount} blocking error(s) preventing mathematical evaluation.`
      )
    }
  }, [currentSimulation, matrix, allFlights, allGates, toast])

  // Matrix Statistics (calculated live from in-memory matrix)
  const numFlights = resolvedScenario.flights.length
  const numGates = resolvedScenario.gates.length
  const totalCells = numFlights * numGates

  const forbiddenCount = useMemo(() => {
    let count = 0
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < (matrix[r]?.length || 0); c++) {
        if (matrix[r][c] === 1) count++
      }
    }
    return count
  }, [matrix])

  const permittedCount = useMemo(() => {
    return Math.max(0, totalCells - forbiddenCount)
  }, [totalCells, forbiddenCount])

  const densityPct = useMemo(() => {
    if (totalCells === 0) return 0
    return ((forbiddenCount / totalCells) * 100).toFixed(1)
  }, [totalCells, forbiddenCount])

  const isCompleted = currentSimulation?.status === 'Completed'

  // 4. Cell Click Toggle: 0 <-> 1
  const handleToggleCell = useCallback((rowIdx, colIdx) => {
    if (isCompleted) {
      toast.info('Read-Only Scenario', 'Completed scenarios are archived and cannot be modified.')
      return
    }

    setMatrix((prev) => {
      const next = prev.map((r) => [...r])
      const currentVal = next[rowIdx]?.[colIdx] ?? 0
      next[rowIdx][colIdx] = currentVal === 1 ? 0 : 1
      return next
    })
    setHasUnsavedChanges(true)
  }, [isCompleted, toast])

  // Keyboard accessibility handler for matrix cells
  const handleCellKeyDown = useCallback((e, rowIdx, colIdx) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleToggleCell(rowIdx, colIdx)
    }
  }, [handleToggleCell])

  // 5. Save Matrix
  const handleSaveMatrix = async () => {
    if (!currentSimulation) return
    if (isCompleted) {
      toast.error('Save Blocked', 'Completed scenarios cannot be updated.')
      return
    }

    try {
      setIsSaving(true)
      const currentFIds = resolvedScenario.flights.map((f) => f.id)
      const currentGIds = resolvedScenario.gates.map((g) => g.id)
      await restrictionService.saveMatrixForSimulation(currentSimulation.id, matrix, currentFIds, currentGIds)
      setHasUnsavedChanges(false)
      toast.success(
        'Matrix Saved',
        `Successfully saved restriction board (${forbiddenCount} forbidden, ${permittedCount} permitted) for "${currentSimulation.name}".`
      )
    } catch (err) {
      toast.error('Save Failed', err.message || 'Could not persist restriction matrix.')
    } finally {
      setIsSaving(false)
    }
  }

  // 6. Reset Matrix (Set all cells to 0)
  const handleConfirmReset = async () => {
    if (!currentSimulation) return
    const zero = createZeroMatrix(numFlights, numGates)
    setMatrix(zero)
    setIsResetModalOpen(false)

    try {
      const currentFIds = resolvedScenario.flights.map((f) => f.id)
      const currentGIds = resolvedScenario.gates.map((g) => g.id)
      await restrictionService.saveMatrixForSimulation(currentSimulation.id, zero, currentFIds, currentGIds)
      setHasUnsavedChanges(false)
      toast.success('Matrix Reset', 'All cells set to Permitted (0). Matrix persisted.')
    } catch {
      setHasUnsavedChanges(true)
      toast.warning('Matrix Reset Locally', 'All cells set to Permitted (0). Click "Save Matrix" to persist.')
    }
  }

  // 7. Mark All Forbidden (Set all cells to 1)
  const handleConfirmMarkAllForbidden = async () => {
    if (!currentSimulation) return
    const forbidden = Array.from({ length: numFlights }, () =>
      Array.from({ length: numGates }, () => 1)
    )
    setMatrix(forbidden)
    setIsAllForbiddenModalOpen(false)

    try {
      const currentFIds = resolvedScenario.flights.map((f) => f.id)
      const currentGIds = resolvedScenario.gates.map((g) => g.id)
      await restrictionService.saveMatrixForSimulation(currentSimulation.id, forbidden, currentFIds, currentGIds)
      setHasUnsavedChanges(false)
      toast.success('All Forbidden', 'All cells set to Forbidden (1). Matrix persisted.')
    } catch {
      setHasUnsavedChanges(true)
      toast.warning('Set Forbidden Locally', 'All cells set to Forbidden (1). Click "Save Matrix" to persist.')
    }
  }

  // 8. Scenario Switching with Unsaved Changes Protection
  const handleSelectScenario = (newId) => {
    if (newId === selectedSimulationId) return

    if (hasUnsavedChanges) {
      setPendingSimulationId(newId)
      setIsDiscardModalOpen(true)
    } else {
      setSelectedSimulationId(newId)
    }
  }

  const handleConfirmDiscard = () => {
    if (pendingSimulationId) {
      setSelectedSimulationId(pendingSimulationId)
      setPendingSimulationId(null)
      setHasUnsavedChanges(false)
    }
    setIsDiscardModalOpen(false)
  }

  // Simulation dropdown choices (Ready scenarios ordered first)
  const simulationOptions = useMemo(() => {
    const sorted = [...simulations].sort((a, b) => {
      if (a.status === 'Ready' && b.status !== 'Ready') return -1
      if (b.status === 'Ready' && a.status !== 'Ready') return 1
      return 0
    })

    return sorted.map((s) => ({
      label: `${s.name} [${s.status}] (${(s.selectedFlightIds || []).length}F × ${(s.selectedGateIds || []).length}G)`,
      value: s.id
    }))
  }, [simulations])

  return (
    <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto pb-12">
      {/* -------------------- 1. HEADER -------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#222E42]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="gw-page-heading">Restriction Matrix</h1>
            <Badge variant="outline" size="sm" className="font-mono">
              Binary Board B
            </Badge>
            {hasUnsavedChanges && (
              <Badge variant="warning" size="sm" className="font-mono">
                Unsaved Changes
              </Badge>
            )}
          </div>
          <p className="text-sm text-gw-text-secondary mt-1">
            Define forbidden flight-to-gate assignments for your simulation scenarios.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <Button
            variant="secondary"
            size="md"
            icon={PlayCircle}
            onClick={handleScrollToBacktrackingEngine}
            disabled={numFlights === 0 || numGates === 0}
            className="border-[#222E42] text-[#FFFFFF] font-mono shadow-sm"
            title="Generate flight-to-gate allocations using Phase 13 Backtracking Engine"
          >
            Generate Allocations
          </Button>

          <Button
            variant="secondary"
            size="md"
            icon={Calculator}
            onClick={handleScrollToRookEngine}
            disabled={numFlights === 0 || numGates === 0}
            className="border-[#222E42] text-[#FFFFFF] font-mono shadow-sm"
            title="Calculate and visualize Rook Polynomial for active matrix"
          >
            Calculate Rook Polynomial
          </Button>

          <Button
            variant="outline"
            size="md"
            icon={RefreshCw}
            onClick={handleManualValidate}
            title="Run validation engine on active matrix"
          >
            Validate Matrix
          </Button>

          <Link to="/workspace">
            <Button size="md" variant="secondary" icon={Sparkles} className="shadow-none">
              Allocation Workspace
            </Button>
          </Link>

          <Button
            variant="outline"
            size="md"
            icon={RotateCcw}
            onClick={() => setIsResetModalOpen(true)}
            disabled={numFlights === 0 || numGates === 0 || isCompleted}
            title="Reset all cells to Permitted (0)"
          >
            Reset Matrix
          </Button>

          <Button
            variant="primary"
            size="md"
            icon={Save}
            onClick={handleSaveMatrix}
            disabled={numFlights === 0 || numGates === 0 || isCompleted || (!hasUnsavedChanges && !isSaving)}
            title={isCompleted ? 'Completed scenario is locked' : 'Persist current matrix'}
          >
            {isSaving ? 'Saving...' : 'Save Matrix'}
          </Button>
        </div>
      </div>

      {/* -------------------- 2. SIMULATION SELECTOR & STATUS BAR -------------------- */}
      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          <div className="lg:col-span-7">
            <Dropdown
              label="Active Simulation Scenario"
              options={simulationOptions}
              value={selectedSimulationId}
              onChange={handleSelectScenario}
              placeholder="Select an allocation scenario..."
            />
          </div>

          <div className="lg:col-span-5 flex flex-wrap items-center justify-start lg:justify-end gap-3 pt-2 lg:pt-5">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-[#FFFFFF] font-bold">{numFlights} Flights</span>
              <span className="text-gw-text-secondary">×</span>
              <span className="text-[#A3A3A3] font-bold">{numGates} Gates</span>
            </div>

            {currentSimulation && (
              <Badge
                variant={
                  currentSimulation.status === 'Ready'
                    ? 'success'
                    : currentSimulation.status === 'Completed'
                    ? 'default'
                    : 'warning'
                }
                size="md"
                dot={currentSimulation.status !== 'Completed'}
                icon={currentSimulation.status === 'Completed' ? Lock : undefined}
              >
                {currentSimulation.status}
              </Badge>
            )}

            {currentSimulation && (
              <Badge variant="default" size="md" className="font-mono">
                {currentSimulation.id}
              </Badge>
            )}
          </div>
        </div>

        {/* Completed Scenario Read-Only Notice */}
        {isCompleted && (
          <div className="p-3 rounded-lg bg-[#1E2638] border border-[#222E42] text-xs text-[#FFFFFF] flex items-center gap-2.5">
            <Lock className="w-4 h-4 shrink-0 text-[#FFFFFF]" />
            <div>
              <strong>Completed Historical Scenario:</strong> This scenario is archived as Completed and locked.
              The restriction matrix is displayed in read-only mode to prevent accidental alteration.
            </div>
          </div>
        )}

        {/* Missing reference warnings */}
        {(resolvedScenario.missingFlightIds.length > 0 || resolvedScenario.missingGateIds.length > 0) && (
          <div className="p-3 rounded-lg bg-[#0D121F] border border-[#222E42] text-xs text-white flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#A3A3A3]" />
            <div>
              <strong>Reference Notice:</strong> Scenario references{' '}
              {resolvedScenario.missingFlightIds.length > 0 && (
                <span>{resolvedScenario.missingFlightIds.length} unavailable flight(s) ({resolvedScenario.missingFlightIds.join(', ')}) </span>
              )}
              {resolvedScenario.missingGateIds.length > 0 && (
                <span>{resolvedScenario.missingGateIds.length} unavailable gate(s) ({resolvedScenario.missingGateIds.join(', ')})</span>
              )}
              . Placeholders are maintained to ensure matrix dimensional integrity.
            </div>
          </div>
        )}
      </Card>

      {/* -------------------- 3. VALIDATION REPORT RESULTS PANEL (PHASE 10) -------------------- */}
      {validationReport && (
        <Card
          className="border-2 border-[#222E42] bg-[#121826] transition-all space-y-4"
        >
          {/* Header Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div
                className="p-2.5 rounded-xl border border-[#222E42] bg-[#0D121F] text-white shrink-0"
              >
                {validationReport.status === 'PASSED' ? (
                  <ShieldCheck className="w-6 h-6" />
                ) : validationReport.status === 'WARNINGS' ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <ShieldAlert className="w-6 h-6" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="gw-card-heading">Matrix Validation Engine</h3>
                  <Badge
                    variant={
                      validationReport.status === 'PASSED'
                        ? 'success'
                        : validationReport.status === 'WARNINGS'
                        ? 'warning'
                        : 'error'
                    }
                    size="sm"
                  >
                    {validationReport.status}
                  </Badge>
                  <span className="text-xs font-mono text-gw-text-secondary">
                    ({validationReport.passedChecks}/{validationReport.totalChecks} Checks Passed)
                  </span>
                </div>

                <p className="text-xs text-gw-text-secondary mt-0.5">
                  {validationReport.status === 'PASSED'
                    ? 'All structural, binary, reference, and dimension checks satisfied. Matrix ready for mathematical allocation.'
                    : validationReport.status === 'WARNINGS'
                    ? `Matrix is structurally valid, but contains ${validationReport.warningCount} operational or constraint warning(s).`
                    : `Matrix contains ${validationReport.errorCount} blocking structural/binary error(s) preventing mathematical evaluation.`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDiagnosticsDismissed(true)}
                className="text-xs text-gw-text-secondary hover:text-gw-text"
              >
                Dismiss Diagnostics
              </Button>
              <button
                type="button"
                onClick={() => setIsValidationPanelOpen(!isValidationPanelOpen)}
                className="p-1.5 rounded-lg text-gw-text-secondary hover:text-gw-text hover:bg-white/5 border border-[#222E42] transition-colors cursor-pointer"
                title={isValidationPanelOpen ? 'Collapse Diagnostics' : 'Expand Diagnostics'}
              >
                {isValidationPanelOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Expandable Categories & Detailed Diagnostics */}
          {isValidationPanelOpen && (
            <div className="space-y-4 pt-3 border-t border-[#222E42]">
              {/* Category Pills (Categories A through F) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs font-mono">
                {Object.entries(validationReport.categories).map(([key, cat]) => (
                  <div
                    key={key}
                    className="p-2 rounded-lg border border-[#222E42] bg-[#1E2638] text-[#FFFFFF] flex flex-col justify-between"
                  >
                    <span className="text-[10px] text-gw-text-secondary font-sans truncate">{cat.name}</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-bold text-[11px]">{cat.status}</span>
                      <span className="text-[10px] opacity-75">{cat.passed}/{cat.total}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-2 border-b border-[#222E42] pb-2 text-xs font-mono">
                <button
                  type="button"
                  className={`px-3 py-1 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                    validationTab === 'all'
                      ? 'bg-sky-500 text-slate-950 font-bold border border-sky-400 shadow-xs'
                      : 'text-gw-text-secondary hover:text-gw-text hover:bg-[#1E2638]'
                  }`}
                  onClick={() => setValidationTab('all')}
                >
                  All Findings ({validationReport.errorCount + validationReport.warningCount})
                </button>
                {validationReport.errorCount > 0 && (
                  <button
                    type="button"
                    className={`px-3 py-1 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                      validationTab === 'errors'
                        ? 'bg-rose-500 text-slate-950 font-bold border border-rose-400 shadow-xs'
                        : 'text-gw-text-secondary hover:text-gw-text hover:bg-[#1E2638]'
                    }`}
                    onClick={() => setValidationTab('errors')}
                  >
                    Errors ({validationReport.errorCount})
                  </button>
                )}
                {validationReport.warningCount > 0 && (
                  <button
                    type="button"
                    className={`px-3 py-1 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                      validationTab === 'warnings'
                        ? 'bg-amber-500 text-slate-950 font-bold border border-amber-400 shadow-xs'
                        : 'text-gw-text-secondary hover:text-gw-text hover:bg-[#1E2638]'
                    }`}
                    onClick={() => setValidationTab('warnings')}
                  >
                    Warnings ({validationReport.warningCount})
                  </button>
                )}
                {validationReport.incompatibilityCount > 0 && (
                  <button
                    type="button"
                    className={`px-3 py-1 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                      validationTab === 'operational'
                        ? 'bg-sky-500 text-slate-950 font-bold border border-sky-400 shadow-xs'
                        : 'text-gw-text-secondary hover:text-gw-text hover:bg-[#1E2638]'
                    }`}
                    onClick={() => setValidationTab('operational')}
                  >
                    Incompatibilities ({validationReport.incompatibilityCount})
                  </button>
                )}
              </div>

              {/* Findings List */}
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {/* Errors */}
                {(validationTab === 'all' || validationTab === 'errors') &&
                  validationReport.errors.map((err, idx) => (
                    <div
                      key={`err-${idx}`}
                      className="p-3 rounded-lg bg-[#1E2638] border border-[#222E42] text-xs flex items-start gap-2.5"
                    >
                      <XCircle className="w-4 h-4 text-[#FFFFFF] shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-[#FFFFFF]">{err.category}</span>
                          <span className="font-mono text-[10px] text-gw-text-secondary uppercase">
                            {err.code}
                            {err.row !== undefined && ` [R${err.row + 1}:C${err.col !== undefined ? err.col + 1 : '?'}]`}
                          </span>
                        </div>
                        <p className="text-gw-text mt-0.5 leading-relaxed">{err.message}</p>
                      </div>
                    </div>
                  ))}

                {/* Warnings */}
                {(validationTab === 'all' || validationTab === 'warnings') &&
                  validationReport.warnings.map((warn, idx) => (
                    <div
                      key={`warn-${idx}`}
                      className="p-3 rounded-lg bg-[#1E2638] border border-[#222E42] text-xs flex items-start gap-2.5"
                    >
                      <AlertTriangle className="w-4 h-4 text-[#FFFFFF] shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-[#FFFFFF]">{warn.category}</span>
                          <span className="font-mono text-[10px] text-gw-text-secondary uppercase">
                            {warn.code}
                            {warn.row !== undefined && ` [R${warn.row + 1}:C${warn.col !== undefined ? warn.col + 1 : '?'}]`}
                          </span>
                        </div>
                        <p className="text-gw-text mt-0.5 leading-relaxed">{warn.message}</p>
                      </div>
                    </div>
                  ))}

                {/* Operational Incompatibilities */}
                {validationTab === 'operational' &&
                  validationReport.incompatibilities.map((incomp, idx) => (
                    <div
                      key={`incomp-${idx}`}
                      className="p-3 rounded-lg bg-[#1E2638] border border-[#222E42] text-xs flex items-start gap-2.5"
                    >
                      <Info className="w-4 h-4 text-[#FFFFFF] shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-[#FFFFFF]">
                            {incomp.rule} ({incomp.flightNumber} ↔ Gate {incomp.gateNumber})
                          </span>
                          <span className="font-mono text-[10px] text-gw-text-secondary uppercase">
                            Cell ({incomp.row + 1}, {incomp.col + 1}) = {incomp.currentMatrixValue === 1 ? 'Forbidden' : 'Permitted'}
                          </span>
                        </div>
                        <p className="text-gw-text mt-0.5 leading-relaxed">{incomp.message}</p>
                      </div>
                    </div>
                  ))}

                {/* Clean State Notice */}
                {validationReport.errors.length === 0 && validationReport.warnings.length === 0 && (
                  <div className="p-3 rounded-lg bg-[#1E2638] border border-[#222E42] text-xs text-[#FFFFFF] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-[#FFFFFF]" />
                    <span>Zero validation defects detected across all 6 validation categories.</span>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-gw-text-secondary italic pt-1 border-t border-[#222E42]">
                Notice: The Matrix Validation Engine inspects structural integrity and operational constraints. Validation does NOT automatically modify binary matrix values.
              </div>
            </div>
          )}
        </Card>
      )}

      {/* -------------------- 4. INFORMATION PANEL & METRICS -------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
        <Card className="p-3.5 text-center bg-[#121826] border-[#222E42]">
          <span className="text-[10px] uppercase tracking-wider text-gw-text-secondary block font-sans font-medium">
            Dimensions
          </span>
          <span className="text-xl font-extrabold text-[#FFFFFF] mt-0.5 block">
            {numFlights} × {numGates}
          </span>
          <span className="text-[10px] text-gw-text-secondary font-sans">
            {numFlights === numGates ? 'Balanced' : 'Unbalanced'}
          </span>
        </Card>

        <Card className="p-3.5 text-center bg-[#121826] border-[#222E42]">
          <span className="text-[10px] uppercase tracking-wider text-gw-text-secondary block font-sans font-medium">
            Total Cells
          </span>
          <span className="text-xl font-extrabold text-[#FFFFFF] mt-0.5 block">
            {totalCells}
          </span>
          <span className="text-[10px] text-gw-text-secondary font-sans">
            m × n matrix
          </span>
        </Card>

        <Card className="p-3.5 text-center bg-[#121826] border-[#222E42]">
          <span className="text-[10px] uppercase tracking-wider text-gw-text-secondary block font-sans font-medium">
            Permitted (0)
          </span>
          <span className="text-xl font-extrabold text-[#FFFFFF] mt-0.5 block">
            {permittedCount}
          </span>
          <span className="text-[10px] text-gw-text-secondary font-sans">
            Valid pairings
          </span>
        </Card>

        <Card className="p-3.5 text-center bg-[#121826] border-[#222E42]">
          <span className="text-[10px] uppercase tracking-wider text-gw-text-secondary block font-sans font-medium">
            Forbidden (1)
          </span>
          <span className="text-xl font-extrabold text-[#FFFFFF] mt-0.5 block">
            {forbiddenCount}
          </span>
          <span className="text-[10px] text-gw-text-secondary font-sans">
            Restricted cells
          </span>
        </Card>

        <Card className="p-3.5 text-center bg-[#121826] border-[#222E42]">
          <span className="text-[10px] uppercase tracking-wider text-gw-text-secondary block font-sans font-medium">
            Density
          </span>
          <span className="text-xl font-extrabold text-[#FFFFFF] mt-0.5 block">
            {densityPct}%
          </span>
          <span className="text-[10px] text-gw-text-secondary font-sans">
            Restricted ratio
          </span>
        </Card>

        <Card className="p-3.5 text-center bg-[#121826] border-[#222E42]">
          <span className="text-[10px] uppercase tracking-wider text-gw-text-secondary block font-sans font-medium">
            Status
          </span>
          <span className="text-base font-bold text-gw-text mt-1 block">
            {hasUnsavedChanges ? (
              <span className="text-[#FFFFFF]">Unsaved</span>
            ) : (
              <span className="text-[#FFFFFF]">Persisted</span>
            )}
          </span>
          <span className="text-[10px] text-gw-text-secondary font-sans">
            {isCompleted ? 'Locked' : 'Editable'}
          </span>
        </Card>
      </div>

      {/* -------------------- 5. MATRIX BOARD WITH CONTROLS & LEGEND -------------------- */}
      <Card className="space-y-4 bg-[#121826] border-[#222E42]">
        {/* Controls Toolbar & Permanent Legend */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#222E42]">
          {/* Permanent Visual Legend */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="text-gw-text-secondary uppercase text-[11px] font-sans font-semibold">
              Legend:
            </span>
            <div className="flex items-center gap-1.5" title="0 = Assignment permitted. Flight can be scheduled to this gate.">
              <span className="w-5 h-5 rounded flex items-center justify-center bg-[#121826] border border-[#222E42] text-slate-400 font-bold text-[11px]">
                0
              </span>
              <span className="text-gw-text-secondary font-medium">0 = Permitted</span>
            </div>
            <div className="flex items-center gap-1.5" title="1 = Assignment forbidden. Flight prohibited from this gate.">
              <span className="w-5 h-5 rounded flex items-center justify-center bg-rose-950/40 border-2 border-rose-500/70 text-rose-200 font-bold text-[11px]">
                1
              </span>
              <span className="text-[#FFFFFF] font-semibold">1 = Forbidden</span>
            </div>
          </div>

          {/* Bulk Matrix Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={RotateCcw}
              onClick={() => setIsResetModalOpen(true)}
              disabled={numFlights === 0 || numGates === 0 || isCompleted}
            >
              Clear (All 0)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={Ban}
              onClick={() => setIsAllForbiddenModalOpen(true)}
              disabled={numFlights === 0 || numGates === 0 || isCompleted}
            >
              Forbid All (All 1)
            </Button>
          </div>
        </div>

        {/* -------------------- INTERACTIVE MATRIX GRID -------------------- */}
        {isLoading ? (
          <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono uppercase tracking-wider text-gw-text-secondary">
              Loading restriction matrix...
            </span>
          </div>
        ) : simulations.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No airport simulations registered"
            description="Create an allocation scenario in Simulation Management to configure its restriction matrix."
            actionLabel="Go to Scenarios"
            onAction={() => (window.location.href = '/scenarios')}
          />
        ) : numFlights === 0 || numGates === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#0D121F] border border-[#222E42] flex items-center justify-center text-white mx-auto">
              <AlertTriangle className="w-6 h-6 text-[#A3A3A3]" />
            </div>
            <h4 className="text-base font-semibold text-gw-text">Incomplete Simulation Scenario</h4>
            <p className="text-xs text-gw-text-secondary max-w-md mx-auto leading-relaxed">
              Scenario <strong>"{currentSimulation?.name}"</strong> does not have both flights and gates selected
              ({numFlights} Flights, {numGates} Gates). Please configure its flight and gate roster.
            </p>
            <Link to="/scenarios">
              <Button size="sm" icon={Layers}>
                Edit Scenario Roster
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto pb-2 rounded-xl border border-[#222E42] bg-[#0D121F] shadow-inner">
            <div className="inline-block min-w-full align-middle">
              <table className="border-collapse select-none w-full">
                {/* Column Headers (Gates) */}
                <thead className="sticky top-0 z-10 bg-[#0D121F] backdrop-blur-md">
                  <tr>
                    {/* Top-left corner */}
                    <th className="p-3 text-left font-mono text-[11px] text-gw-text-secondary uppercase tracking-wider border-b border-r border-[#222E42] min-w-[160px] sticky left-0 z-20 bg-[#0D121F]">
                      <div className="flex items-center gap-1.5">
                        <DoorOpen className="w-3.5 h-3.5 text-[#FFFFFF]" />
                        <span>Flight \ Gate</span>
                      </div>
                    </th>

                    {resolvedScenario.gates.map((gate) => (
                      <th
                        key={gate.id}
                        className="p-3 text-center font-mono border-b border-[#222E42] min-w-[90px]"
                      >
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-sm text-[#FFFFFF] tracking-wide">
                            {gate.gateNumber || gate.id}
                          </span>
                          <span className="text-[10px] text-gw-text-secondary font-normal font-sans mt-0.5">
                            {gate.terminal || 'T1'}
                          </span>
                          {gate.gateType && (
                            <span className="text-[9px] text-gw-text-secondary/70 font-sans mt-0.5 line-clamp-1">
                              {gate.gateType}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Rows (Flights) and Cells */}
                <tbody className="divide-y divide-[#333333] font-mono">
                  {resolvedScenario.flights.map((flight, rowIdx) => (
                    <tr
                      key={flight.id}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      {/* Flight Row Header */}
                      <th className="p-3 text-left font-mono text-xs border-r border-[#222E42] bg-[#121826] sticky left-0 z-10 min-w-[160px] group-hover:bg-[#1E2638] transition-colors">
                        <div className="flex items-center gap-2">
                          <Plane className="w-3.5 h-3.5 text-[#FFFFFF] shrink-0" />
                          <div className="min-w-0">
                            <span className="font-bold text-[#FFFFFF] block">
                              {flight.flightNumber || flight.id}
                            </span>
                            <span className="text-[10px] text-gw-text-secondary font-normal font-sans block truncate max-w-[120px]">
                              {flight.airline || 'Commercial'}
                            </span>
                            {(flight.arrivalTime || flight.departureTime) && (
                              <span className="text-[9px] text-[#A3A3A3] font-mono block mt-0.5">
                                {flight.arrivalTime || '08:00'} - {flight.departureTime || '10:00'}
                              </span>
                            )}
                          </div>
                        </div>
                      </th>

                      {/* Interactive Cells */}
                      {resolvedScenario.gates.map((gate, colIdx) => {
                        const cellVal = matrix[rowIdx]?.[colIdx] ?? 0
                        const isForbidden = cellVal === 1

                        return (
                          <td
                            key={`${flight.id}-${gate.id}`}
                            className="p-1.5 text-center border-r border-[#222E42] last:border-r-0"
                          >
                            <button
                              type="button"
                              disabled={isCompleted}
                              onClick={() => handleToggleCell(rowIdx, colIdx)}
                              onKeyDown={(e) => handleCellKeyDown(e, rowIdx, colIdx)}
                              aria-label={`Flight ${flight.flightNumber || flight.id} to Gate ${gate.gateNumber || gate.id}: ${
                                isForbidden ? 'Forbidden' : 'Permitted'
                              }`}
                              tabIndex={isCompleted ? -1 : 0}
                              className={`
                                w-14 h-12 rounded-lg font-mono text-sm font-bold transition-all duration-150 cursor-pointer flex flex-col items-center justify-center border mx-auto select-none
                                focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none
                                ${isCompleted ? 'cursor-not-allowed opacity-80' : ''}
                                ${
                                  isForbidden
                                    ? 'bg-rose-950/40 border-2 border-rose-500/70 text-rose-200 shadow-xs shadow-rose-950/50 hover:border-rose-400 hover:bg-rose-900/50'
                                    : 'bg-[#121826] border border-[#222E42] text-slate-400 hover:border-sky-400 hover:text-sky-200 hover:bg-[#1E2638]'
                                }
                              `}
                              title={`Flight ${flight.flightNumber || flight.id} at Gate ${gate.gateNumber || gate.id}: Currently ${
                                isForbidden ? 'Forbidden (1)' : 'Permitted (0)'
                              }${isCompleted ? ' (Locked)' : '. Click to toggle.'}`}
                            >
                              <span className="leading-none text-base font-extrabold">{cellVal}</span>
                              <span className="text-[9px] font-sans font-normal opacity-80 leading-none mt-1">
                                {isForbidden ? 'Forbidden' : 'Allowed'}
                              </span>
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gw-text-secondary pt-1 gap-2">
          <span>
            Click or press Enter/Space on any cell to toggle constraint:{' '}
            <strong className="text-white font-mono">1 = Forbidden</strong>,{' '}
            <strong className="text-gw-text font-mono">0 = Permitted</strong>.
          </span>
          {hasUnsavedChanges && (
            <span className="text-white font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-[#A3A3A3]" />
              Unsaved changes present. Remember to click "Save Matrix".
            </span>
          )}
        </div>
      </Card>

      {/* -------------------- 6. ROOK POLYNOMIAL ENGINE (PHASE 11) -------------------- */}
      <div ref={rookSectionRef} className="pt-2">
        <RookPolynomialVisualizer
          scenarioName={currentSimulation?.name || 'Active Simulation'}
          scenarioId={currentSimulation?.id || ''}
          matrix={matrix}
          flights={resolvedScenario.flights}
          gates={resolvedScenario.gates}
        />
      </div>

      {/* -------------------- 7. BACKTRACKING ALLOCATION ENGINE (PHASE 13) -------------------- */}
      <div ref={backtrackingSectionRef} className="pt-2">
        <BacktrackingAllocationExplorer
          scenarioName={currentSimulation?.name || 'Active Simulation'}
          scenarioId={currentSimulation?.id || ''}
          matrix={matrix}
          flightIds={resolvedScenario.flights.map((f) => f.id)}
          gateIds={resolvedScenario.gates.map((g) => g.id)}
          flights={resolvedScenario.flights}
          gates={resolvedScenario.gates}
        />
      </div>

      {/* -------------------- 8. OPERATIONAL CONTEXT PANEL -------------------- */}
      <Card className="space-y-3 bg-[#121826] border-[#222E42]">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-[#FFFFFF] shrink-0" />
          <h3 className="gw-card-heading">Operational Context & Mathematical Convention</h3>
        </div>

        <p className="text-xs text-gw-text-secondary leading-relaxed">
          The binary restriction board <strong className="text-gw-text font-mono">B = [bᵢⱼ]</strong> represents all forbidden flight-to-gate assignments.
          A value of <strong className="text-[#FFFFFF] font-mono">1</strong> models hard physical or operational constraints—such as wingspan limitations, international customs cordons, or ground equipment restrictions.
          A value of <strong className="text-gw-text font-mono">0</strong> indicates an assignment is valid and available for allocation.
        </p>

        <div className="gw-formula-box text-xs font-mono">
          bᵢⱼ = 1 (Forbidden assignment: Flight i cannot dock at Gate j) &nbsp;|&nbsp; bᵢⱼ = 0 (Permitted assignment)
        </div>
      </Card>

      {/* -------------------- MODAL: DISCARD UNSAVED CHANGES -------------------- */}
      <Modal
        isOpen={isDiscardModalOpen}
        onClose={() => setIsDiscardModalOpen(false)}
        title="Discard Unsaved Changes?"
        maxWidth="max-w-md"
        icon={AlertTriangle}
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <Button variant="ghost" size="md" onClick={() => setIsDiscardModalOpen(false)}>
              Keep Editing
            </Button>
            <Button variant="danger" size="md" onClick={handleConfirmDiscard}>
              Discard & Switch
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gw-text-secondary leading-relaxed">
            You have unsaved modifications to the restriction matrix for scenario{' '}
            <strong className="text-gw-text">{currentSimulation?.name}</strong>.
          </p>
          <div className="p-3 rounded-lg bg-[#1E2638] border border-[#222E42] text-xs text-[#FFFFFF] leading-relaxed">
            Switching scenarios will permanently discard your uncommitted cell toggles.
          </div>
        </div>
      </Modal>

      {/* -------------------- MODAL: CONFIRM MATRIX RESET -------------------- */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Confirm Matrix Reset (All Permitted)"
        maxWidth="max-w-md"
        icon={RotateCcw}
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <Button variant="ghost" size="md" onClick={() => setIsResetModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" icon={RotateCcw} onClick={handleConfirmReset}>
              Confirm Reset
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gw-text-secondary leading-relaxed">
            Reset all cells in the restriction matrix for{' '}
            <strong className="text-gw-text">{currentSimulation?.name}</strong> to{' '}
            <strong className="text-[#FFFFFF]">0 (Permitted)</strong>?
          </p>
          <div className="p-3 rounded-lg bg-[#1E2638] border border-[#222E42] text-xs text-gw-text leading-relaxed">
            This clears all forbidden assignments, authorizing every flight to dock at every gate.
          </div>
        </div>
      </Modal>

      {/* -------------------- MODAL: CONFIRM FORBID ALL -------------------- */}
      <Modal
        isOpen={isAllForbiddenModalOpen}
        onClose={() => setIsAllForbiddenModalOpen(false)}
        title="Confirm Forbid All Assignments"
        maxWidth="max-w-md"
        icon={Ban}
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <Button variant="ghost" size="md" onClick={() => setIsAllForbiddenModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="md" icon={Ban} onClick={handleConfirmMarkAllForbidden}>
              Forbid All
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gw-text-secondary leading-relaxed">
            Set every cell in the restriction matrix for{' '}
            <strong className="text-gw-text">{currentSimulation?.name}</strong> to{' '}
            <strong className="text-white">1 (Forbidden)</strong>?
          </p>
          <div className="p-3 rounded-lg bg-[#0D121F] border border-[#222E42] text-xs text-white leading-relaxed">
            This marks every flight-to-gate pairing as forbidden.
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default RestrictionMatrix
