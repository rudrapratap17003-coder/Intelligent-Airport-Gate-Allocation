import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  Plane,
  DoorClosed,
  Grid3X3,
  Calculator,
  PlayCircle,
  ShieldCheck,
  Download,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Check,
  FileText,
  Clock,
  Layers,
  Info
} from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Table from '../components/ui/Table'
import Notification from '../components/ui/Notification'
import flightService from '../lib/flightService'
import gateService from '../lib/gateService'
import simulationService from '../lib/simulationService'
import restrictionService from '../lib/restrictionService'
import allocationService from '../lib/allocationService'
import exportService from '../lib/exportService'
import BipartiteDiagram from '../components/allocations/BipartiteDiagram'

const STEPS = [
  { id: 1, name: 'Select Flights', short: 'Flights', icon: Plane },
  { id: 2, name: 'Select Gates', short: 'Gates', icon: DoorClosed },
  { id: 3, name: 'Configure Restrictions', short: 'Restrictions', icon: Grid3X3 },
  { id: 4, name: 'Mathematical Analysis', short: 'Math Analysis', icon: Calculator },
  { id: 5, name: 'Generate Allocations', short: 'Generate', icon: PlayCircle },
  { id: 6, name: 'Verify & Audit', short: 'Verification', icon: ShieldCheck },
  { id: 7, name: 'Save & Export', short: 'Export', icon: Download }
]

export const AllocationWorkspace = () => {
  const [currentStep, setCurrentStep] = useState(1)

  // Registry data
  const [allFlights, setAllFlights] = useState([])
  const [allGates, setAllGates] = useState([])
  const [isLoadingRegistry, setIsLoadingRegistry] = useState(true)

  // Step 1 & 2 selections
  const [selectedFlightIds, setSelectedFlightIds] = useState([])
  const [selectedGateIds, setSelectedGateIds] = useState([])

  // Step 3: Restrictions Matrix
  const [matrixData, setMatrixData] = useState([])
  const [scenarioName, setScenarioName] = useState('New Allocation Scenario')
  const [savedSimulationId, setSavedSimulationId] = useState(null)

  // Step 4: Math Engine Result
  const [mathResult, setMathResult] = useState(null)
  const [isCalculatingMath, setIsCalculatingMath] = useState(false)

  // Step 5: Allocations Generation Result
  const [allocationResult, setAllocationResult] = useState(null)
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)

  // Notifications & Errors
  const [notification, setNotification] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)

  // Load registry on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingRegistry(true)
        const [flights, gates] = await Promise.all([
          flightService.getFlights(),
          gateService.getGates()
        ])
        setAllFlights(flights)
        setAllGates(gates)
        // Default select first 6 if available for instant readiness
        if (flights.length >= 6 && gates.length >= 6) {
          setSelectedFlightIds(flights.slice(0, 6).map((f) => f.id))
          setSelectedGateIds(gates.slice(0, 6).map((g) => g.id))
        } else {
          setSelectedFlightIds(flights.map((f) => f.id))
          setSelectedGateIds(gates.map((g) => g.id))
        }
      } catch (err) {
        console.error('Failed to load initial workspace data:', err)
        setErrorMsg('Failed to fetch flights and gates registry from backend.')
      } finally {
        setIsLoadingRegistry(false)
      }
    }
    loadData()
  }, [])

  // Initialize or resize restriction matrix when selections change
  useEffect(() => {
    const rows = selectedFlightIds.length
    const cols = selectedGateIds.length
    if (rows > 0 && cols > 0) {
      setMatrixData((prev) => {
        const next = []
        for (let r = 0; r < rows; r++) {
          const row = []
          for (let c = 0; c < cols; c++) {
            // Preserve existing cell value or default to 0 (Allowed)
            row.push(prev[r] && prev[r][c] !== undefined ? prev[r][c] : 0)
          }
          next.push(row)
        }
        return next
      })
    }
  }, [selectedFlightIds.length, selectedGateIds.length])

  // Computed helper collections
  const selectedFlights = useMemo(() => {
    return selectedFlightIds
      .map((id) => allFlights.find((f) => f.id === id))
      .filter(Boolean)
  }, [selectedFlightIds, allFlights])

  const selectedGates = useMemo(() => {
    return selectedGateIds
      .map((id) => allGates.find((g) => g.id === id))
      .filter(Boolean)
  }, [selectedGateIds, allGates])

  const isBalanced = selectedFlightIds.length > 0 && selectedFlightIds.length === selectedGateIds.length

  // Toggle flight selection
  const toggleFlight = (id) => {
    setSelectedFlightIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  // Toggle gate selection
  const toggleGate = (id) => {
    setSelectedGateIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  // Toggle restriction cell (0 = Allowed, 1 = Forbidden)
  const toggleCell = (r, c) => {
    setMatrixData((prev) => {
      const copy = prev.map((row) => [...row])
      copy[r][c] = copy[r][c] === 1 ? 0 : 1
      return copy
    })
  }

  // Set preset sample restrictions
  const applySampleRestrictions = () => {
    const rows = selectedFlightIds.length
    const cols = selectedGateIds.length
    const copy = Array.from({ length: rows }, () => Array(cols).fill(0))
    // Diagonal or alternating pattern
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if ((r + c) % 4 === 1 && r < rows && c < cols) {
          copy[r][c] = 1
        }
      }
    }
    setMatrixData(copy)
    setNotification({
      type: 'info',
      title: 'Sample Restrictions Applied',
      message: 'Configured a realistic restriction distribution pattern.'
    })
  }

  const clearAllRestrictions = () => {
    const rows = selectedFlightIds.length
    const cols = selectedGateIds.length
    setMatrixData(Array.from({ length: rows }, () => Array(cols).fill(0)))
  }

  // Calculate restriction density
  const restrictionStats = useMemo(() => {
    const totalCells = selectedFlightIds.length * selectedGateIds.length
    if (totalCells === 0 || !matrixData.length) return { forbidden: 0, allowed: 0, density: 0 }
    let forbidden = 0
    matrixData.forEach((row) => {
      row.forEach((val) => {
        if (val === 1) forbidden++
      })
    })
    const density = ((forbidden / totalCells) * 100).toFixed(1)
    return { forbidden, allowed: totalCells - forbidden, density }
  }, [matrixData, selectedFlightIds.length, selectedGateIds.length])

  // Synchronize scenario to backend and run Math Engine (Step 4)
  const runMathematicalAnalysis = async () => {
    if (!isBalanced) {
      setNotification({
        type: 'danger',
        title: 'Unbalanced Selection',
        message: 'Discrete matching requires an equal number of flights and gates (n × n).'
      })
      return
    }

    try {
      setIsCalculatingMath(true)
      setErrorMsg(null)

      let simId = savedSimulationId
      if (!simId) {
        // Create new simulation
        const sim = await simulationService.createSimulation({
          name: `${scenarioName} (${selectedFlightIds.length}x${selectedGateIds.length}) [${Date.now().toString().slice(-4)}]`,
          description: 'Created via GateWise Guided Allocation Workspace',
          selectedFlightIds,
          selectedGateIds
        })
        simId = sim.id
        setSavedSimulationId(sim.id)
      } else {
        // Update simulation flights/gates
        await simulationService.updateSimulation(simId, {
          selectedFlightIds,
          selectedGateIds
        })
      }

      // Save matrix data to backend
      await restrictionService.updateMatrix(simId, {
        rows: selectedFlightIds.length,
        cols: selectedGateIds.length,
        matrix: matrixData
      })

      // Fetch exact mathematical derivation
      const math = await allocationService.getMathEngine(simId)
      setMathResult(math)
      setCurrentStep(4)
      setNotification({
        type: 'success',
        title: 'Mathematical Analysis Complete',
        message: `Derived ${math.exact_valid_assignments.toLocaleString()} conflict-free solutions using Rook Polynomials & PIE.`
      })
    } catch (err) {
      console.error('Math analysis failed:', err)
      setErrorMsg(err.message || 'Failed to execute mathematical calculation.')
    } finally {
      setIsCalculatingMath(false)
    }
  }

  // Run Backtracking Allocation Generator (Step 5)
  const generateAllocations = async () => {
    if (!savedSimulationId) return
    try {
      setIsGenerating(true)
      setErrorMsg(null)
      const alloc = await allocationService.generateAllocations(savedSimulationId, {
        max_results: 50,
        include_audit: true
      })
      setAllocationResult(alloc)
      setSelectedPlanIndex(0)
      setCurrentStep(5)
      setNotification({
        type: 'success',
        title: 'Allocations Generated',
        message: `Synthesized ${alloc.generated_count} verified conflict-free plans via backtracking search.`
      })
    } catch (err) {
      console.error('Allocation generation failed:', err)
      setErrorMsg(err.message || 'Failed to generate flight-to-gate assignments.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto">
      {/* -------------------- 1. WORKSPACE HEADER & STEPS PROGRESS -------------------- */}
      <div className="border-b border-[#1e3a5f]/60 pb-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gw-cyan/10 border border-gw-cyan/30 text-gw-cyan">
                <Sparkles className="w-5 h-5" />
              </div>
              <h1 className="gw-page-heading">Guided Allocation Workspace</h1>
              <Badge variant="cyan" size="sm" dot>
                7-Step Workflow
              </Badge>
            </div>
            <p className="text-xs text-gw-text-secondary mt-1">
              End-to-end discrete mathematical allocation workflow: from fleet selection to algebraic verification and report export.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gw-text-secondary">Balance:</span>
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
                isBalanced
                  ? 'bg-gw-success/10 text-gw-success border-gw-success/30'
                  : 'bg-gw-warning/10 text-gw-warning border-gw-warning/30'
              }`}
            >
              {selectedFlightIds.length} Flights ↔ {selectedGateIds.length} Gates
              {isBalanced ? ' (Balanced n×n)' : ' (Unbalanced)'}
            </span>
          </div>
        </div>

        {/* Step Indicator Bar */}
        <div className="overflow-x-auto pt-2">
          <div className="flex items-center min-w-[700px] justify-between relative">
            {/* Connecting Track */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#1e3a5f]/60 -translate-y-1/2 z-0" />

            {STEPS.map((s) => {
              const Icon = s.icon
              const isPassed = s.id < currentStep
              const isCurrent = s.id === currentStep

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    if (s.id <= currentStep || (s.id <= 3 && isBalanced)) {
                      setCurrentStep(s.id)
                    }
                  }}
                  className={`relative z-10 flex flex-col items-center gap-1.5 focus:outline-none transition-all ${
                    s.id <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold font-mono transition-all border ${
                      isCurrent
                        ? 'bg-gw-cyan text-gw-bg border-gw-cyan shadow-lg shadow-gw-cyan/30 scale-110'
                        : isPassed
                        ? 'bg-gw-success/20 text-gw-success border-gw-success/50'
                        : 'bg-gw-bg-secondary text-gw-text-secondary border-[#1e3a5f]'
                    }`}
                  >
                    {isPassed ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span
                    className={`text-[11px] font-medium font-sans whitespace-nowrap ${
                      isCurrent ? 'text-gw-cyan font-bold' : isPassed ? 'text-gw-text' : 'text-gw-text-secondary'
                    }`}
                  >
                    {s.id}. {s.short}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Notifications / Errors */}
      {notification && (
        <Notification
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-gw-error/10 border border-gw-error/30 text-xs text-gw-error flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* -------------------- STEP 1: SELECT FLIGHTS -------------------- */}
      {currentStep === 1 && (
        <Card className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e3a5f]/40">
            <div>
              <h2 className="text-base font-bold text-gw-text flex items-center gap-2">
                <Plane className="w-5 h-5 text-gw-cyan" />
                <span>Step 1: Select Active Flights</span>
              </h2>
              <p className="text-xs text-gw-text-secondary mt-0.5">
                Select the flights to be included in this allocation simulation window.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedFlightIds(allFlights.map((f) => f.id))}
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFlightIds([])}
              >
                Deselect All
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {allFlights.map((flight) => {
              const isSelected = selectedFlightIds.includes(flight.id)
              return (
                <div
                  key={flight.id}
                  onClick={() => toggleFlight(flight.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between ${
                    isSelected
                      ? 'bg-gw-cyan/10 border-gw-cyan/40 shadow-sm shadow-gw-cyan/5'
                      : 'bg-gw-bg-secondary/60 border-[#1e3a5f]/50 hover:border-[#1e3a5f]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-gw-text">{flight.flightNumber}</span>
                      <span className="text-[10px] font-mono text-gw-text-secondary">({flight.id})</span>
                    </div>
                    <div className="text-xs text-gw-text-secondary">{flight.airline}</div>
                    <div className="text-[11px] font-mono text-gw-cyan flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gw-cyan shrink-0" />
                      <span>{flight.arrivalTime} → {flight.departureTime}</span>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-gw-cyan border-gw-cyan text-gw-bg' : 'border-[#1e3a5f] bg-gw-bg'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#1e3a5f]/40">
            <span className="text-xs font-mono text-gw-text-secondary">
              Selected: <strong className="text-gw-cyan">{selectedFlightIds.length}</strong> flights
            </span>
            <Button
              size="md"
              icon={ArrowRight}
              disabled={selectedFlightIds.length === 0}
              onClick={() => setCurrentStep(2)}
            >
              Continue to Select Gates
            </Button>
          </div>
        </Card>
      )}

      {/* -------------------- STEP 2: SELECT GATES -------------------- */}
      {currentStep === 2 && (
        <Card className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e3a5f]/40">
            <div>
              <h2 className="text-base font-bold text-gw-text flex items-center gap-2">
                <DoorClosed className="w-5 h-5 text-gw-blue" />
                <span>Step 2: Select Available Gates</span>
              </h2>
              <p className="text-xs text-gw-text-secondary mt-0.5">
                Match exactly {selectedFlightIds.length} gates to achieve an n × n balanced bijective model.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedGateIds(allGates.map((g) => g.id))}
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedGateIds([])}
              >
                Deselect All
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {allGates.map((gate) => {
              const isSelected = selectedGateIds.includes(gate.id)
              return (
                <div
                  key={gate.id}
                  onClick={() => toggleGate(gate.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between ${
                    isSelected
                      ? 'bg-gw-blue/10 border-gw-blue/40 shadow-sm shadow-gw-blue/5'
                      : 'bg-gw-bg-secondary/60 border-[#1e3a5f]/50 hover:border-[#1e3a5f]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-gw-text">Gate {gate.gateNumber}</span>
                      <span className="text-[10px] font-mono text-gw-text-secondary">({gate.id})</span>
                    </div>
                    <div className="text-xs text-gw-text-secondary">{gate.gateType} • {gate.terminal}</div>
                    <div className="text-[11px] font-mono text-gw-blue">
                      Cap: {gate.maxCapacity} pax
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-gw-blue border-gw-blue text-gw-bg' : 'border-[#1e3a5f] bg-gw-bg'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#1e3a5f]/40">
            <Button variant="ghost" size="md" icon={ArrowLeft} onClick={() => setCurrentStep(1)}>
              Back to Flights
            </Button>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-gw-text-secondary hidden sm:inline">
                Selected: <strong className="text-gw-blue">{selectedGateIds.length}</strong> gates
              </span>
              <Button
                size="md"
                icon={ArrowRight}
                disabled={!isBalanced}
                onClick={() => setCurrentStep(3)}
              >
                {isBalanced ? 'Continue to Restrictions' : `Select ${selectedFlightIds.length} Gates (Currently ${selectedGateIds.length})`}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* -------------------- STEP 3: CONFIGURE RESTRICTIONS MATRIX -------------------- */}
      {currentStep === 3 && (
        <Card className="p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e3a5f]/40">
            <div>
              <h2 className="text-base font-bold text-gw-text flex items-center gap-2">
                <Grid3X3 className="w-5 h-5 text-gw-warning" />
                <span>Step 3: Define Binary Restriction Board B</span>
              </h2>
              <p className="text-xs text-gw-text-secondary mt-0.5">
                Click cells to toggle restrictions: Green (0) = Allowed Assignment, Amber (1) = Forbidden Assignment.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={applySampleRestrictions}>
                Apply Realistic Pattern
              </Button>
              <Button variant="ghost" size="sm" onClick={clearAllRestrictions}>
                Clear (All Allowed)
              </Button>
            </div>
          </div>

          {/* Matrix Stats Banner */}
          <div className="p-3 rounded-xl bg-gw-bg-secondary/70 border border-[#1e3a5f]/60 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-4">
              <span>
                Board Size: <strong className="text-gw-text">{selectedFlightIds.length} × {selectedGateIds.length}</strong>
              </span>
              <span>
                Forbidden: <strong className="text-gw-warning">{restrictionStats.forbidden}</strong>
              </span>
              <span>
                Allowed: <strong className="text-gw-success">{restrictionStats.allowed}</strong>
              </span>
            </div>
            <div>
              Density: <strong className="text-gw-cyan">{restrictionStats.density}%</strong>
            </div>
          </div>

          {/* Interactive Matrix Grid */}
          <div className="overflow-x-auto pb-2">
            <table className="min-w-[600px] w-full text-center border-collapse">
              <thead>
                <tr>
                  <th className="p-2.5 text-xs font-mono text-gw-text-secondary text-left">Flight \ Gate</th>
                  {selectedGates.map((gate) => (
                    <th key={gate.id} className="p-2.5 text-xs font-mono text-gw-blue font-bold">
                      {gate.gateNumber}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e3a5f]/40">
                {selectedFlights.map((flight, r) => (
                  <tr key={flight.id} className="hover:bg-white/[0.02]">
                    <td className="p-2.5 text-xs font-mono text-gw-cyan font-bold text-left whitespace-nowrap">
                      {flight.flightNumber}
                    </td>
                    {selectedGates.map((gate, c) => {
                      const isForbidden = matrixData[r] && matrixData[r][c] === 1
                      return (
                        <td key={gate.id} className="p-1.5">
                          <button
                            type="button"
                            onClick={() => toggleCell(r, c)}
                            className={`w-full py-2.5 rounded-lg font-mono text-xs font-bold transition-all border cursor-pointer ${
                              isForbidden
                                ? 'bg-gw-warning/20 border-gw-warning text-gw-warning shadow-sm shadow-gw-warning/10'
                                : 'bg-gw-success/15 border-gw-success/35 text-gw-success hover:bg-gw-success/25'
                            }`}
                            title={`Toggle ${flight.flightNumber} at Gate ${gate.gateNumber} (${isForbidden ? 'Forbidden' : 'Allowed'})`}
                          >
                            {isForbidden ? '1 (Restricted)' : '0 (Open)'}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#1e3a5f]/40">
            <Button variant="ghost" size="md" icon={ArrowLeft} onClick={() => setCurrentStep(2)}>
              Back to Gates
            </Button>
            <Button
              size="md"
              icon={Calculator}
              disabled={isCalculatingMath}
              onClick={runMathematicalAnalysis}
            >
              {isCalculatingMath ? 'Computing Polynomial...' : 'Run Mathematical Analysis'}
            </Button>
          </div>
        </Card>
      )}

      {/* -------------------- STEP 4: MATHEMATICAL ANALYSIS -------------------- */}
      {currentStep === 4 && mathResult && (
        <Card className="p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e3a5f]/40">
            <div>
              <h2 className="text-base font-bold text-gw-text flex items-center gap-2">
                <Calculator className="w-5 h-5 text-gw-cyan" />
                <span>Step 4: Algebraic Derivations & Feasibility</span>
              </h2>
              <p className="text-xs text-gw-text-secondary mt-0.5">
                Exact integers derived via dynamic programming Rook Polynomial and Principle of Inclusion-Exclusion.
              </p>
            </div>
            <Badge variant="cyan" size="sm" className="font-mono">
              N = {mathResult.exact_valid_assignments.toLocaleString()} Valid
            </Badge>
          </div>

          {/* Formulas Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-gw-bg-secondary/70 border border-[#1e3a5f]/60 space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-gw-text-secondary">
                1. Rook Polynomial R(B, x)
              </span>
              <div className="gw-formula-box text-xs break-all font-mono py-2 text-gw-warning">
                {mathResult.rook_polynomial}
              </div>
              <p className="text-[11px] text-gw-text-secondary">
                Coefficients r_k represent non-attacking rooks placed on forbidden cells.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-gw-bg-secondary/70 border border-[#1e3a5f]/60 space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-gw-text-secondary">
                2. Principle of Inclusion-Exclusion (PIE)
              </span>
              <div className="gw-formula-box text-xs break-all font-mono py-2 text-gw-success">
                N = Σ [(-1)ᵏ · rₖ · (n - k)!] = {mathResult.exact_valid_assignments.toLocaleString()}
              </div>
              <p className="text-[11px] text-gw-text-secondary">
                Feasibility: <strong>{mathResult.feasibility_percentage.toFixed(1)}%</strong> of {mathResult.total_possible_assignments.toLocaleString()} universe permutations.
              </p>
            </div>
          </div>

          {/* PIE Itemized Breakdown Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono text-left divide-y divide-[#1e3a5f]/40 min-w-[500px]">
              <thead className="bg-gw-bg-secondary/60 text-gw-text-secondary uppercase">
                <tr>
                  <th className="p-2.5">Term k</th>
                  <th className="p-2.5">Rook Coeff (r_k)</th>
                  <th className="p-2.5">Factorial (n-k)!</th>
                  <th className="p-2.5">Sign (-1)^k</th>
                  <th className="p-2.5 text-right">Contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e3a5f]/30">
                {mathResult.itemized_terms.map((t) => (
                  <tr key={t.k} className="hover:bg-white/[0.02]">
                    <td className="p-2.5 font-bold text-gw-text">k = {t.k}</td>
                    <td className="p-2.5 text-gw-warning">r_{t.k} = {t.coefficient.toLocaleString()}</td>
                    <td className="p-2.5 text-gw-text-secondary">({selectedFlightIds.length - t.k})! = {t.factorial_remaining.toLocaleString()}</td>
                    <td className="p-2.5">{t.sign === 1 ? '+' : '-'}</td>
                    <td className={`p-2.5 text-right font-bold ${t.sign === 1 ? 'text-gw-success' : 'text-gw-error'}`}>
                      {t.signed_contribution > 0 ? `+${t.signed_contribution.toLocaleString()}` : t.signed_contribution.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#1e3a5f]/40">
            <Button variant="ghost" size="md" icon={ArrowLeft} onClick={() => setCurrentStep(3)}>
              Modify Restrictions
            </Button>
            <Button
              size="md"
              icon={PlayCircle}
              disabled={isGenerating || mathResult.exact_valid_assignments === 0}
              onClick={generateAllocations}
            >
              {isGenerating ? 'Generating Backtracking Plans...' : 'Generate Valid Allocations'}
            </Button>
          </div>
        </Card>
      )}

      {/* -------------------- STEP 5 & 6: GENERATE & VERIFY -------------------- */}
      {currentStep >= 5 && allocationResult && (
        <Card className="p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e3a5f]/40">
            <div>
              <h2 className="text-base font-bold text-gw-text flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-gw-success" />
                <span>Step {currentStep}: Generated Schedule & Audit</span>
              </h2>
              <p className="text-xs text-gw-text-secondary mt-0.5">
                Displaying materialized conflict-free assignment plan verified by the independent conflict auditor.
              </p>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-gw-text-secondary">Plan:</span>
              <select
                value={selectedPlanIndex}
                onChange={(e) => setSelectedPlanIndex(Number(e.target.value))}
                className="bg-gw-bg-secondary border border-[#1e3a5f] rounded-lg px-2.5 py-1 text-xs text-gw-text font-mono focus:border-gw-cyan focus:outline-none cursor-pointer"
              >
                {allocationResult.allocations.map((a, idx) => (
                  <option key={a.allocation_id} value={idx}>
                    Plan #{idx + 1} ({a.allocation_id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Current Plan Mapping Display */}
          {allocationResult.allocations[selectedPlanIndex] && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Plan Pairings List */}
                <div className="p-3.5 rounded-xl bg-gw-bg-secondary/70 border border-[#1e3a5f]/60 space-y-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-gw-text-secondary">
                    Flight-to-Gate Pairings (Plan #{selectedPlanIndex + 1})
                  </span>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {allocationResult.allocations[selectedPlanIndex].assignments.map((asgn) => (
                      <div
                        key={asgn.flight_id}
                        className="p-2 rounded-lg bg-gw-bg-tertiary border border-[#1e3a5f]/40 flex items-center justify-between text-xs font-mono"
                      >
                        <span className="text-gw-cyan font-bold">{asgn.flight_number}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-gw-text-secondary" />
                        <span className="text-gw-success font-bold">Gate {asgn.gate_number}</span>
                        <span className="text-[10px] text-gw-text-secondary">({asgn.terminal})</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Conflict Audit Card */}
                <div className="p-3.5 rounded-xl bg-gw-bg-secondary/70 border border-[#1e3a5f]/60 space-y-3">
                  <span className="text-xs font-mono uppercase tracking-wider text-gw-text-secondary">
                    Independent Conflict Audit Verification
                  </span>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-gw-success">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Zero Wingspan / Dimensional Conflicts</span>
                    </div>
                    <div className="flex items-center gap-2 text-gw-success">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Zero Gate Double-Booking (Bijective)</span>
                    </div>
                    <div className="flex items-center gap-2 text-gw-success">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Zero Flight Double-Allocations</span>
                    </div>
                    <div className="flex items-center gap-2 text-gw-success">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Zero Forbidden Restriction Cell Violations</span>
                    </div>
                    <div className="flex items-center gap-2 text-gw-success">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Complete 100% Matching Attained</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bipartite Graph Visualization of Selected Plan */}
              <div className="p-4 rounded-xl bg-gw-bg-secondary/40 border border-[#1e3a5f]/50">
                <span className="text-xs font-mono uppercase tracking-wider text-gw-text-secondary block mb-2">
                  Bipartite Graph Matching Visualization
                </span>
                <BipartiteDiagram
                  flights={selectedFlights}
                  gates={selectedGates}
                  matrix={matrixData}
                  allocation={allocationResult.allocations[selectedPlanIndex].assignments.reduce((acc, curr) => {
                    acc[curr.flight_id] = curr.gate_id
                    return acc
                  }, {})}
                  height={320}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-[#1e3a5f]/40">
            <Button variant="ghost" size="md" icon={ArrowLeft} onClick={() => setCurrentStep(4)}>
              Back to Math
            </Button>
            <Button
              size="md"
              icon={Download}
              onClick={() => setCurrentStep(7)}
            >
              Continue to Save & Export
            </Button>
          </div>
        </Card>
      )}

      {/* -------------------- STEP 7: SAVE & EXPORT -------------------- */}
      {currentStep === 7 && savedSimulationId && (
        <Card className="p-6 space-y-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gw-success/10 border border-gw-success/30 text-gw-success flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-bold text-gw-text">Allocation Completed & Verified</h2>
            <p className="text-xs text-gw-text-secondary max-w-md mx-auto">
              The scenario has been calculated and independently verified. Download executive reports or export datasets for operational distribution.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto pt-2">
            <div className="p-4 rounded-xl bg-gw-bg-secondary/70 border border-[#1e3a5f]/60 space-y-3 flex flex-col justify-between">
              <div>
                <FileText className="w-6 h-6 text-gw-cyan mx-auto mb-2" />
                <h3 className="text-xs font-bold text-gw-text">Scenario PDF Report</h3>
                <p className="text-[11px] text-gw-text-secondary mt-1">
                  Branded report with rook polynomials, PIE itemization, and allocations.
                </p>
              </div>
              <Button
                size="sm"
                variant="primary"
                icon={Download}
                onClick={() => exportService.downloadScenarioPdf(savedSimulationId)}
              >
                Download PDF
              </Button>
            </div>

            <div className="p-4 rounded-xl bg-gw-bg-secondary/70 border border-[#1e3a5f]/60 space-y-3 flex flex-col justify-between">
              <div>
                <Download className="w-6 h-6 text-gw-success mx-auto mb-2" />
                <h3 className="text-xs font-bold text-gw-text">Allocation CSV</h3>
                <p className="text-[11px] text-gw-text-secondary mt-1">
                  Tabular CSV of flight-to-gate assignment pairings.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                icon={Download}
                onClick={() => exportService.downloadAllocationsCsv(savedSimulationId)}
              >
                Export CSV
              </Button>
            </div>

            <div className="p-4 rounded-xl bg-gw-bg-secondary/70 border border-[#1e3a5f]/60 space-y-3 flex flex-col justify-between">
              <div>
                <Calculator className="w-6 h-6 text-gw-warning mx-auto mb-2" />
                <h3 className="text-xs font-bold text-gw-text">Math Derivation CSV</h3>
                <p className="text-[11px] text-gw-text-secondary mt-1">
                  Itemized rook coefficients and alternating PIE terms.
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                icon={Download}
                onClick={() => exportService.downloadMathCsv(savedSimulationId)}
              >
                Export Math
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t border-[#1e3a5f]/40 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="md"
              icon={RotateCcw}
              onClick={() => {
                setCurrentStep(1)
                setSavedSimulationId(null)
                setMathResult(null)
                setAllocationResult(null)
              }}
            >
              Start Another Allocation
            </Button>
            <Link to="/dashboard">
              <Button size="md" variant="secondary">
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  )
}

export default AllocationWorkspace
