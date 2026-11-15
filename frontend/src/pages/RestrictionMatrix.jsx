import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Grid3X3,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Ban,
  CheckSquare,
  AlertTriangle,
  Info,
  Layers,
  Plane,
  DoorClosed,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Dropdown from '../components/ui/Dropdown'
import Modal from '../components/ui/Modal'
import Notification from '../components/ui/Notification'
import simulationService from '../lib/simulationService'
import flightService from '../lib/flightService'
import gateService from '../lib/gateService'
import restrictionService from '../lib/restrictionService'
import matrixValidationService from '../lib/matrixValidationService'

export const RestrictionMatrix = () => {
  // Registry data
  const [simulations, setSimulations] = useState([])
  const [selectedSimulationId, setSelectedSimulationId] = useState('')
  const [allFlights, setAllFlights] = useState([])
  const [allGates, setAllGates] = useState([])

  // Active matrix state
  const [matrix, setMatrix] = useState([])

  // Validation details expanded state
  const [isValidationDetailsOpen, setIsValidationDetailsOpen] = useState(false)

  // Confirmation modal states
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    action: null,
    title: '',
    message: ''
  })

  // Notification state
  const [notification, setNotification] = useState(null)

  // Load all foundational data on mount
  useEffect(() => {
    const loadFoundationalData = async () => {
      try {
        const [sims, flights, gates] = await Promise.all([
          simulationService.getSimulations(),
          flightService.getFlights(),
          gateService.getGates()
        ])
        setSimulations(sims)
        setAllFlights(flights)
        setAllGates(gates)
        if (sims.length > 0) {
          setSelectedSimulationId(sims[0].id)
        }
      } catch (e) {
        console.error('Failed to load foundational matrix data:', e)
      }
    }
    loadFoundationalData()
  }, [])

  // Resolve current active simulation
  const currentSimulation = useMemo(() => {
    return simulations.find(s => s.id === selectedSimulationId) || null
  }, [simulations, selectedSimulationId])

  // Resolve active flights and gates for the current simulation
  const resolvedScenario = useMemo(() => {
    if (!currentSimulation) {
      return { flights: [], gates: [], missingFlightIds: [], missingGateIds: [] }
    }

    const flightMap = new Map(allFlights.map(f => [f.id, f]))
    const gateMap = new Map(allGates.map(g => [g.id, g]))

    const flights = []
    const missingFlightIds = []
    for (const fId of currentSimulation.selectedFlightIds) {
      if (flightMap.has(fId)) {
        flights.push(flightMap.get(fId))
      } else {
        missingFlightIds.push(fId)
      }
    }

    const gates = []
    const missingGateIds = []
    for (const gId of currentSimulation.selectedGateIds) {
      if (gateMap.has(gId)) {
        gates.push(gateMap.get(gId))
      } else {
        missingGateIds.push(gId)
      }
    }

    return { flights, gates, missingFlightIds, missingGateIds }
  }, [currentSimulation, allFlights, allGates])

  // Synchronize or load matrix whenever selected simulation changes
  useEffect(() => {
    let isCancelled = false

    const loadMatrix = async () => {
      if (!currentSimulation) {
        setMatrix([])
        return
      }

      const numF = resolvedScenario.flights.length
      const numG = resolvedScenario.gates.length

      if (numF === 0 || numG === 0) {
        setMatrix([])
        return
      }

      try {
        const loaded = await restrictionService.getMatrixForSimulation(currentSimulation.id, numF, numG)
        if (!isCancelled) {
          setMatrix(loaded)
        }
      } catch (err) {
        if (!isCancelled) {
          setNotification({
            type: 'danger',
            title: 'Matrix Load Error',
            message: err.message
          })
        }
      }
    }

    loadMatrix()

    return () => {
      isCancelled = true
    }
  }, [currentSimulation, resolvedScenario.flights.length, resolvedScenario.gates.length])

  // Execute structural & mathematical matrix validation
  const validationResult = useMemo(() => {
    return matrixValidationService.validateMatrix(
      currentSimulation,
      matrix,
      allFlights,
      allGates
    )
  }, [currentSimulation, matrix, allFlights, allGates])

  // Toggle individual matrix cell
  const handleToggleCell = async (rowIdx, colIdx) => {
    if (!currentSimulation) return
    try {
      const updated = await restrictionService.toggleCell(currentSimulation.id, matrix, rowIdx, colIdx)
      setMatrix(updated)
    } catch (err) {
      setNotification({
        type: 'danger',
        title: 'Save Failed',
        message: err.message
      })
    }
  }

  // Bulk actions
  const executeClearAll = async () => {
    if (!currentSimulation) return
    const numF = resolvedScenario.flights.length
    const numG = resolvedScenario.gates.length
    try {
      const updated = await restrictionService.clearAllRestrictions(currentSimulation.id, numF, numG)
      setMatrix(updated)
      setConfirmModal({ isOpen: false, action: null, title: '', message: '' })
      setNotification({
        type: 'info',
        title: 'Restrictions Cleared',
        message: 'All cells set to Allowed (0). Every flight is currently permitted at every gate.'
      })
    } catch (err) {
      setConfirmModal({ isOpen: false, action: null, title: '', message: '' })
      setNotification({
        type: 'danger',
        title: 'Action Failed',
        message: err.message
      })
    }
  }

  const executeMarkAllForbidden = async () => {
    if (!currentSimulation) return
    const numF = resolvedScenario.flights.length
    const numG = resolvedScenario.gates.length
    try {
      const updated = await restrictionService.markAllForbidden(currentSimulation.id, numF, numG)
      setMatrix(updated)
      setConfirmModal({ isOpen: false, action: null, title: '', message: '' })
      setNotification({
        type: 'warning',
        title: 'All Assignments Forbidden',
        message: 'All cells set to Forbidden (1). Zero valid flight assignments exist in this state.'
      })
    } catch (err) {
      setConfirmModal({ isOpen: false, action: null, title: '', message: '' })
      setNotification({
        type: 'danger',
        title: 'Action Failed',
        message: err.message
      })
    }
  }

  // Manual Trigger Toast for "Validate Matrix"
  const handleManualValidate = () => {
    if (validationResult.isValid) {
      setNotification({
        type: 'success',
        title: 'Matrix Validation Passed',
        message: `Board is square (${validationResult.flightCount}×${validationResult.gateCount}) and satisfies all structural constraints.`
      })
    } else {
      setNotification({
        type: 'error',
        title: 'Matrix Validation Failed',
        message: `Found ${validationResult.errors.length} validation error(s). Please review the validation diagnostics panel.`
      })
      setIsValidationDetailsOpen(true)
    }
  }

  // Confirmation modals
  const promptClearAll = () => {
    setConfirmModal({
      isOpen: true,
      action: executeClearAll,
      title: 'Clear All Forbidden Restrictions?',
      message: 'This will reset all cells in the matrix to Allowed (0).'
    })
  }

  const promptMarkAllForbidden = () => {
    setConfirmModal({
      isOpen: true,
      action: executeMarkAllForbidden,
      title: 'Mark All Assignments as Forbidden?',
      message: 'This will set every cell to Forbidden (1).'
    })
  }

  // Simulation dropdown choices
  const simulationOptions = useMemo(() => {
    return simulations.map(s => ({
      label: `${s.name} (${s.selectedFlightIds.length}F × ${s.selectedGateIds.length}G)`,
      value: s.id
    }))
  }, [simulations])

  const numFlights = resolvedScenario.flights.length
  const numGates = resolvedScenario.gates.length

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* -------------------- 1. HEADER -------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#1e3a5f]/50">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="gw-page-heading">Restriction Matrix</h1>
            <Badge variant="cyan" size="sm" className="font-mono">
              Binary Board B
            </Badge>
          </div>
          <p className="text-sm text-gw-text-secondary">
            Define which flights are restricted from using specific airport gates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            icon={RefreshCw}
            onClick={handleManualValidate}
          >
            Validate Matrix
          </Button>

          <Link to="/simulator">
            <Button variant="secondary" size="md" icon={Layers}>
              Simulation Registry
            </Button>
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <Notification
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      {/* -------------------- 2. SIMULATION SELECTOR & METADATA -------------------- */}
      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Selector */}
          <div className="lg:col-span-6">
            <Dropdown
              label="Active Simulation Scenario"
              options={simulationOptions}
              value={selectedSimulationId}
              onChange={setSelectedSimulationId}
              placeholder="Select an allocation scenario..."
            />
          </div>

          {/* Dimension & Health Badges */}
          <div className="lg:col-span-6 flex flex-wrap items-center justify-start lg:justify-end gap-3 pt-2 lg:pt-5">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-gw-cyan font-bold">{numFlights} Flights</span>
              <span className="text-gw-text-secondary">×</span>
              <span className="text-gw-blue font-bold">{numGates} Gates</span>
            </div>

            <Badge
              variant={validationResult.isValid ? 'success' : 'error'}
              size="md"
              dot
            >
              {validationResult.isValid ? 'Structure Valid' : 'Validation Failed'}
            </Badge>

            {currentSimulation && (
              <Badge variant="default" size="md" className="font-mono">
                {currentSimulation.id}
              </Badge>
            )}
          </div>
        </div>

        {/* Missing reference warnings */}
        {(resolvedScenario.missingFlightIds.length > 0 || resolvedScenario.missingGateIds.length > 0) && (
          <div className="p-3 rounded-lg bg-gw-error/15 border border-gw-error/30 text-xs text-gw-error flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong>Missing Reference Warning:</strong> This scenario references{' '}
              {resolvedScenario.missingFlightIds.length} deleted flight(s) and{' '}
              {resolvedScenario.missingGateIds.length} deleted gate(s). Only existing records are displayed in the matrix.
            </div>
          </div>
        )}
      </Card>

      {/* -------------------- 3. VALIDATION STATUS PANEL -------------------- */}
      <Card className={`border-2 transition-all ${
        validationResult.isValid
          ? 'border-gw-success/40 bg-gw-success/[0.02]'
          : 'border-gw-error/50 bg-gw-error/[0.02]'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className={`p-2.5 rounded-xl border shrink-0 ${
              validationResult.isValid
                ? 'bg-gw-success/15 border-gw-success/30 text-gw-success'
                : 'bg-gw-error/15 border-gw-error/30 text-gw-error'
            }`}>
              {validationResult.isValid ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="gw-card-heading">
                  {validationResult.isValid ? 'Matrix Valid for Allocation Modeling' : 'Matrix Incompatible for Allocation Modeling'}
                </h3>
                <Badge variant={validationResult.isValid ? 'success' : 'error'} size="sm">
                  {validationResult.isValid ? 'VALID' : 'INVALID'}
                </Badge>
              </div>

              <p className="text-xs text-gw-text-secondary mt-0.5">
                {validationResult.isValid
                  ? `Square board satisfies all discrete mathematical requirements (${validationResult.flightCount}×${validationResult.gateCount}).`
                  : `Matrix has ${validationResult.errors.length} blocking error(s) preventing mathematical evaluation.`
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className={`px-2 py-1 rounded border ${
                validationResult.errors.length > 0 ? 'bg-gw-error/20 border-gw-error/50 text-gw-error font-bold' : 'bg-gw-card border-[#1e3a5f] text-gw-text-secondary'
              }`}>
                {validationResult.errors.length} Errors
              </span>

              <span className={`px-2 py-1 rounded border ${
                validationResult.warnings.length > 0 ? 'bg-gw-warning/20 border-gw-warning/50 text-gw-warning font-bold' : 'bg-gw-card border-[#1e3a5f] text-gw-text-secondary'
              }`}>
                {validationResult.warnings.length} Warnings
              </span>
            </div>

            {(validationResult.errors.length > 0 || validationResult.warnings.length > 0) && (
              <button
                type="button"
                onClick={() => setIsValidationDetailsOpen(!isValidationDetailsOpen)}
                className="p-1.5 rounded-lg text-gw-text-secondary hover:text-gw-text hover:bg-white/5 border border-[#1e3a5f] transition-colors cursor-pointer"
                title={isValidationDetailsOpen ? 'Collapse Details' : 'Expand Details'}
              >
                {isValidationDetailsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Expandable Validation Diagnostics List */}
        {isValidationDetailsOpen && (validationResult.errors.length > 0 || validationResult.warnings.length > 0) && (
          <div className="mt-4 pt-4 border-t border-[#1e3a5f]/60 space-y-2.5">
            {/* Errors */}
            {validationResult.errors.map((err, idx) => (
              <div
                key={`err-${idx}`}
                className="p-3 rounded-lg bg-gw-error/10 border border-gw-error/30 text-xs flex items-start gap-2.5"
              >
                <XCircle className="w-4 h-4 text-gw-error shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-gw-error">{err.category}</span>
                    <span className="font-mono text-[10px] text-gw-error/80 uppercase">{err.code}</span>
                  </div>
                  <p className="text-gw-text mt-0.5 leading-relaxed">{err.message}</p>
                </div>
              </div>
            ))}

            {/* Warnings */}
            {validationResult.warnings.map((warn, idx) => (
              <div
                key={`warn-${idx}`}
                className="p-3 rounded-lg bg-gw-warning/10 border border-gw-warning/30 text-xs flex items-start gap-2.5"
              >
                <AlertTriangle className="w-4 h-4 text-gw-warning shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-gw-warning">{warn.category}</span>
                    <span className="font-mono text-[10px] text-gw-warning/80 uppercase">{warn.code}</span>
                  </div>
                  <p className="text-gw-text mt-0.5 leading-relaxed">{warn.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* -------------------- 4. INFORMATION PANEL & METRICS -------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 text-center">
          <span className="text-[11px] uppercase tracking-wider text-gw-text-secondary block font-medium">Total Cells</span>
          <span className="text-xl font-extrabold font-mono text-gw-text mt-0.5 block">{validationResult.totalCells}</span>
          <span className="text-[10px] text-gw-text-secondary">{validationResult.flightCount} × {validationResult.gateCount} board</span>
        </Card>

        <Card className="p-3 text-center">
          <span className="text-[11px] uppercase tracking-wider text-gw-success block font-medium">Allowed (0)</span>
          <span className="text-xl font-extrabold font-mono text-gw-success mt-0.5 block">{validationResult.allowedCells}</span>
          <span className="text-[10px] text-gw-text-secondary">Permitted docks</span>
        </Card>

        <Card className="p-3 text-center">
          <span className="text-[11px] uppercase tracking-wider text-gw-error block font-medium">Forbidden (1)</span>
          <span className="text-xl font-extrabold font-mono text-gw-error mt-0.5 block">{validationResult.forbiddenCells}</span>
          <span className="text-[10px] text-gw-text-secondary">Restricted cells</span>
        </Card>

        <Card className="p-3 text-center">
          <span className="text-[11px] uppercase tracking-wider text-gw-warning block font-medium">Restriction Density</span>
          <span className="text-xl font-extrabold font-mono text-gw-warning mt-0.5 block">{validationResult.densityPct}%</span>
          <span className="text-[10px] text-gw-text-secondary">Constraint density</span>
        </Card>
      </div>

      {/* -------------------- 5. MATRIX BOARD WITH CONTROLS -------------------- */}
      <Card className="space-y-4">
        {/* Controls Toolbar & Legend */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#1e3a5f]/50">
          {/* Visual Legend */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded flex items-center justify-center bg-gw-bg-secondary border border-[#1e3a5f] text-gw-text-secondary font-bold text-[11px]">
                0
              </span>
              <span className="text-gw-text-secondary">Allowed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded flex items-center justify-center bg-gw-error/20 border border-gw-error/60 text-gw-error font-bold text-[11px]">
                1
              </span>
              <span className="text-gw-error font-semibold">Forbidden</span>
            </div>
          </div>

          {/* Bulk Matrix Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={RotateCcw}
              onClick={promptClearAll}
              disabled={numFlights === 0 || numGates === 0}
            >
              Reset (Clear All)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={Ban}
              onClick={promptMarkAllForbidden}
              disabled={numFlights === 0 || numGates === 0}
            >
              Mark All Forbidden
            </Button>
          </div>
        </div>

        {/* -------------------- INTERACTIVE MATRIX GRID -------------------- */}
        {numFlights === 0 || numGates === 0 ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm font-semibold text-gw-text">No active flights or gates in this scenario</p>
            <p className="text-xs text-gw-text-secondary max-w-md mx-auto">
              Please edit the selected simulation scenario to include at least one registered flight and gate.
            </p>
            <Link to="/simulator">
              <Button size="sm" icon={Layers}>
                Configure Scenario
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="inline-block min-w-full align-middle">
              <table className="border-collapse select-none">
                <thead>
                  <tr>
                    {/* Top-left corner */}
                    <th className="p-3 text-left font-mono text-[11px] text-gw-text-secondary uppercase tracking-wider bg-gw-bg-secondary/40 border-b border-r border-[#1e3a5f]/60 min-w-36">
                      Flights \ Gates
                    </th>
                    {/* Gate Column Headers */}
                    {resolvedScenario.gates.map((gate) => (
                      <th
                        key={gate.id}
                        className="p-3 text-center font-mono border-b border-[#1e3a5f]/60 bg-gw-bg-secondary/20 min-w-20"
                      >
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-sm text-gw-cyan">{gate.gateNumber}</span>
                          <span className="text-[10px] text-gw-text-secondary font-normal font-sans">
                            {gate.terminal}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {resolvedScenario.flights.map((flight, rowIdx) => (
                    <tr key={flight.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Flight Row Header */}
                      <th className="p-3 text-left font-mono text-xs border-r border-b border-[#1e3a5f]/60 bg-gw-bg-secondary/30">
                        <div className="flex items-center gap-2">
                          <Plane className="w-3.5 h-3.5 text-gw-cyan shrink-0" />
                          <div className="min-w-0">
                            <span className="font-bold text-gw-text block">{flight.flightNumber}</span>
                            <span className="text-[10px] text-gw-text-secondary font-normal font-sans block truncate max-w-28">
                              {flight.airline}
                            </span>
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
                            className="p-1.5 border-b border-[#1e3a5f]/40 text-center"
                          >
                            <button
                              type="button"
                              onClick={() => handleToggleCell(rowIdx, colIdx)}
                              className={`
                                w-14 h-11 rounded-lg font-mono text-xs font-bold transition-all duration-150 cursor-pointer flex flex-col items-center justify-center border mx-auto
                                focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-gw-bg
                                ${isForbidden
                                  ? 'bg-gw-error/20 border-gw-error/60 text-gw-error hover:bg-gw-error/30 shadow-inner shadow-gw-error/10 focus:ring-gw-error'
                                  : 'bg-gw-card border-[#1e3a5f] text-gw-text-secondary hover:border-gw-cyan/50 hover:text-gw-text hover:bg-gw-card-hover focus:ring-gw-cyan'
                                }
                              `}
                              title={`Toggle (Flight ${flight.flightNumber}, Gate ${gate.gateNumber}): Currently ${isForbidden ? 'Forbidden (1)' : 'Allowed (0)'}`}
                            >
                              <span className="text-sm leading-none">{cellVal}</span>
                              <span className="text-[9px] font-sans font-normal opacity-70 leading-none mt-0.5">
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

        <p className="text-[11px] text-gw-text-secondary italic pt-1">
          Click any cell to toggle assignment constraint: <span className="text-gw-error font-mono font-semibold">1 = Forbidden</span>,{' '}
          <span className="text-gw-text-secondary font-mono font-semibold">0 = Allowed</span>. All changes trigger live structural validation.
        </p>
      </Card>

      {/* -------------------- 6. MATHEMATICAL CONTEXT & FORMULA -------------------- */}
      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-gw-cyan shrink-0" />
          <h3 className="gw-card-heading">Mathematical Context & Foundation</h3>
        </div>

        <p className="text-xs text-gw-text-secondary leading-relaxed">
          A restriction matrix represents forbidden flight-to-gate assignments using binary values.
          These forbidden cells will later be used to construct rook polynomials and apply the Inclusion-Exclusion Principle.
        </p>

        <div className="gw-formula-box text-xs">
          B = [bᵢⱼ] where bᵢⱼ = 1 (Forbidden assignment) and bᵢⱼ = 0 (Allowed assignment)
        </div>

        <p className="text-[11px] text-gw-text-secondary leading-relaxed">
          In Phase 13 & 14, the forbidden coordinates where <span className="font-mono text-gw-cyan">bᵢⱼ = 1</span> form the restricted cells on a chessboard.
          The engine computes the rook polynomial <span className="font-mono text-gw-cyan">R(B, x)</span> counting non-attacking rooks on these forbidden squares to determine valid arrangements.
        </p>
      </Card>

      {/* -------------------- 7. CONFIRMATION DIALOG MODAL -------------------- */}
      <Modal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, action: null, title: '', message: '' })}
        title={confirmModal.title}
        maxWidth="max-w-md"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setConfirmModal({ isOpen: false, action: null, title: '', message: '' })}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => confirmModal.action?.()}
            >
              Confirm Action
            </Button>
          </>
        }
      >
        <p className="text-xs text-gw-text-secondary leading-relaxed">
          {confirmModal.message}
        </p>
      </Modal>
    </div>
  )
}

export default RestrictionMatrix
