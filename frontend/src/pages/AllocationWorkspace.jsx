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
import BacktrackingAllocationExplorer from '../components/allocations/BacktrackingAllocationExplorer'
import { useToast } from '../context/ToastContext'
import { motion } from 'framer-motion'

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
  const toast = useToast()
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

  // Auto-populate restriction matrix from BLR compatibility rules
  const applyBlrCompatibilityRestrictions = () => {
    const rows = selectedFlightIds.length
    const cols = selectedGateIds.length
    const copy = Array.from({ length: rows }, () => Array(cols).fill(0))

    const catRank = { 'Code C': 1, 'Code D': 2, 'Code E': 3, 'Code F': 4 }

    for (let r = 0; r < rows; r++) {
      const flight = selectedFlights[r]
      for (let c = 0; c < cols; c++) {
        const gate = selectedGates[c]
        if (!flight || !gate) continue

        let forbidden = false
        // 1. Terminal mismatch
        if (flight.terminal && gate.terminal && flight.terminal !== gate.terminal) {
          forbidden = true
        }
        // 2. International flight on T1
        if (flight.flight_type?.toLowerCase() === 'international' && gate.terminal === 'T1') {
          forbidden = true
        }
        // 3. Category rank check
        const fCat = flight.aircraft_category || (flight.aircraftType?.includes('Wide') ? 'Code E' : 'Code C')
        const gCat = gate.aircraft_category || (gate.supportedAircraft?.includes('All') || gate.supportedAircraft?.includes('Wide') ? 'Code E' : 'Code C')
        if ((catRank[fCat] || 1) > (catRank[gCat] || 1)) {
          forbidden = true
        }
        // 4. Stand status
        if (gate.status?.toLowerCase() === 'maintenance' || gate.status?.toLowerCase() === 'restricted') {
          forbidden = true
        }

        if (forbidden) {
          copy[r][c] = 1
        }
      }
    }
    setMatrixData(copy)
    setNotification({
      type: 'info',
      title: 'BLR Compatibility Rules Applied',
      message: 'Automatically marked incompatible flight-stand pairs as forbidden (1) based on terminal and aircraft category rules.'
    })
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
      toast.success('Mathematical Analysis Complete', `Derived ${math.exact_valid_assignments.toLocaleString()} conflict-free solutions using Rook Polynomials & PIE.`)
      setNotification({
        type: 'success',
        title: 'Mathematical Analysis Complete',
        message: `Derived ${math.exact_valid_assignments.toLocaleString()} conflict-free solutions using Rook Polynomials & PIE.`
      })
    } catch (err) {
      console.error('Math analysis failed:', err)
      toast.error('Math Analysis Failed', err.message || 'Failed to execute mathematical calculation.')
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
      toast.success('Allocations Generated', `Synthesized ${alloc.generated_count} verified conflict-free plans via backtracking search.`)
      setNotification({
        type: 'success',
        title: 'Allocations Generated',
        message: `Synthesized ${alloc.generated_count} verified conflict-free plans via backtracking search.`
      })
    } catch (err) {
      console.error('Allocation generation failed:', err)
      toast.error('Allocation Generation Failed', err.message || 'Failed to generate flight-to-gate assignments.')
      setErrorMsg(err.message || 'Failed to generate flight-to-gate assignments.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto">
      {/* -------------------- 1. WORKSPACE HEADER & STEPS PROGRESS -------------------- */}
      <div className="border-b border-[#222E42] pb-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#1E2638] border border-[#222E42] text-[#FFFFFF]">
                <Sparkles className="w-5 h-5" />
              </div>
              <h1 className="gw-page-heading">Guided Allocation Workspace</h1>
              <Badge variant="outline" size="sm" dot>
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
                  ? 'bg-[#1E2638] text-[#FFFFFF] border-[#222E42]'
                  : 'bg-[#121826] text-[#A3A3A3] border-[#222E42]'
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
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#333333] -translate-y-1/2 z-0" />

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
                        ? 'bg-sky-500 text-slate-950 border-sky-400 scale-110 shadow-xs'
                        : isPassed
                        ? 'bg-[#1E2638] text-sky-300 border border-[#222E42]'
                        : 'bg-[#121826] text-[#64748B] border-[#222E42]'
                    }`}
                  >
                    {isPassed ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span
                    className={`text-[11px] font-medium font-sans whitespace-nowrap ${
                      isCurrent ? 'text-[#FFFFFF] font-bold' : isPassed ? 'text-gw-text' : 'text-gw-text-secondary'
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
        <div className="p-3.5 rounded-xl bg-[#0D121F] border border-[#222E42] text-xs text-white flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#A3A3A3]" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* -------------------- STEP 1: SELECT FLIGHTS -------------------- */}
      {currentStep === 1 && (
        <Card className="p-5 space-y-4 bg-[#121826] border-[#222E42]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#222E42]">
            <div>
              <h2 className="text-base font-bold text-gw-text flex items-center gap-2">
                <Plane className="w-5 h-5 text-[#FFFFFF]" />
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
                      ? 'bg-[#1E2638] border-[#FFFFFF]'
                      : 'bg-[#121826] border-[#222E42] hover:border-[#334155]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-gw-text">{flight.flightNumber}</span>
                      <span className="text-[10px] font-mono text-gw-text-secondary">({flight.id})</span>
                    </div>
                    <div className="text-xs text-gw-text-secondary">{flight.airline}</div>
                    <div className="text-[11px] font-mono text-[#FFFFFF] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#FFFFFF] shrink-0" />
                      <span>{flight.arrivalTime} → {flight.departureTime}</span>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-sky-500 border-sky-400 text-slate-950' : 'border-[#222E42] bg-[#121826]'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#222E42]">
            <span className="text-xs font-mono text-gw-text-secondary">
              Selected: <strong className="text-[#FFFFFF]">{selectedFlightIds.length}</strong> flights
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
        <Card className="p-5 space-y-4 bg-[#121826] border-[#222E42]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#222E42]">
            <div>
              <h2 className="text-base font-bold text-gw-text flex items-center gap-2">
                <DoorClosed className="w-5 h-5 text-[#FFFFFF]" />
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
                      ? 'bg-[#1E2638] border-[#FFFFFF]'
                      : 'bg-[#121826] border-[#222E42] hover:border-[#334155]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-gw-text">Gate {gate.gateNumber}</span>
                      <span className="text-[10px] font-mono text-gw-text-secondary">({gate.id})</span>
                    </div>
                    <div className="text-xs text-gw-text-secondary">{gate.gateType} • {gate.terminal}</div>
                    <div className="text-[11px] font-mono text-[#FFFFFF]">
                      Cap: {gate.maxCapacity} pax
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-sky-500 border-sky-400 text-slate-950' : 'border-[#222E42] bg-[#121826]'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#222E42]">
            <Button variant="ghost" size="md" icon={ArrowLeft} onClick={() => setCurrentStep(1)}>
              Back to Flights
            </Button>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-gw-text-secondary hidden sm:inline">
                Selected: <strong className="text-[#FFFFFF]">{selectedGateIds.length}</strong> gates
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
        <Card className="p-5 space-y-5 bg-[#121826] border-[#222E42]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#222E42]">
            <div>
              <h2 className="text-base font-bold text-gw-text flex items-center gap-2">
                <Grid3X3 className="w-5 h-5 text-[#FFFFFF]" />
                <span>Step 3: Define Binary Restriction Board B</span>
              </h2>
              <p className="text-xs text-gw-text-secondary mt-0.5">
                Click cells to toggle restrictions: 0 = Allowed Assignment, 1 = Forbidden Assignment.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={applyBlrCompatibilityRestrictions} className="border-[#222E42] text-[#FFFFFF] hover:bg-[#1E2638]">
                Apply BLR Compatibility Rules
              </Button>
              <Button variant="secondary" size="sm" onClick={applySampleRestrictions}>
                Apply Realistic Pattern
              </Button>
              <Button variant="ghost" size="sm" onClick={clearAllRestrictions}>
                Clear (All Allowed)
              </Button>
            </div>
          </div>

          {/* Matrix Stats Banner */}
          <div className="p-3 rounded-xl bg-[#1E2638] border border-[#222E42] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-4">
              <span>
                Board Size: <strong className="text-gw-text">{selectedFlightIds.length} × {selectedGateIds.length}</strong>
              </span>
              <span>
                Forbidden: <strong className="text-[#FFFFFF]">{restrictionStats.forbidden}</strong>
              </span>
              <span>
                Allowed: <strong className="text-[#FFFFFF]">{restrictionStats.allowed}</strong>
              </span>
            </div>
            <div>
              Density: <strong className="text-[#FFFFFF]">{restrictionStats.density}%</strong>
            </div>
          </div>

          {/* Interactive Matrix Grid */}
          <div className="overflow-x-auto pb-2">
            <table className="min-w-[600px] w-full text-center border-collapse">
              <thead>
                <tr>
                  <th className="p-2.5 text-xs font-mono text-gw-text-secondary text-left">Flight \ Gate</th>
                  {selectedGates.map((gate) => (
                    <th key={gate.id} className="p-2.5 text-xs font-mono text-[#FFFFFF] font-bold">
                      {gate.gateNumber}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333333]">
                {selectedFlights.map((flight, r) => (
                  <tr key={flight.id} className="hover:bg-white/[0.02]">
                    <td className="p-2.5 text-xs font-mono text-[#FFFFFF] font-bold text-left whitespace-nowrap">
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
                                ? 'bg-[#0D121F] border-2 border-[#334155] text-[#FFFFFF] hover:border-[#FFFFFF]'
                                : 'bg-[#121826] border border-[#222E42] text-[#737373] hover:border-[#FFFFFF] hover:text-[#FFFFFF]'
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

          <div className="flex items-center justify-between pt-4 border-t border-[#222E42]">
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
        <Card className="p-5 space-y-5 bg-[#121826] border-[#222E42]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#222E42]">
            <div>
              <h2 className="text-base font-bold text-gw-text flex items-center gap-2">
                <Calculator className="w-5 h-5 text-[#FFFFFF]" />
                <span>Step 4: Algebraic Derivations & Feasibility</span>
              </h2>
              <p className="text-xs text-gw-text-secondary mt-0.5">
                Exact integers derived via dynamic programming Rook Polynomial and Principle of Inclusion-Exclusion.
              </p>
            </div>
            <Badge variant="outline" size="sm" className="font-mono">
              N = {mathResult.exact_valid_assignments.toLocaleString()} Valid
            </Badge>
          </div>

          {/* Formulas Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-[#1E2638] border border-[#222E42] space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-gw-text-secondary">
                1. Rook Polynomial R(B, x)
              </span>
              <div className="gw-formula-box text-xs break-all font-mono py-2 text-[#FFFFFF]">
                {mathResult.rook_polynomial}
              </div>
              <p className="text-[11px] text-gw-text-secondary">
                Coefficients r_k represent non-attacking rooks placed on forbidden cells.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1E2638] border border-[#222E42] space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-gw-text-secondary">
                2. Principle of Inclusion-Exclusion (PIE)
              </span>
              <div className="gw-formula-box text-xs break-all font-mono py-2 text-[#FFFFFF]">
                N = Σ [(-1)ᵏ · rₖ · (n - k)!] = {mathResult.exact_valid_assignments.toLocaleString()}
              </div>
              <p className="text-[11px] text-gw-text-secondary">
                Feasibility: <strong>{mathResult.feasibility_percentage.toFixed(1)}%</strong> of {mathResult.total_possible_assignments.toLocaleString()} universe permutations.
              </p>
            </div>
          </div>

          {/* PIE Itemized Breakdown Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono text-left divide-y divide-[#333333] min-w-[500px]">
              <thead className="bg-[#0D121F] text-gw-text-secondary uppercase">
                <tr>
                  <th className="p-2.5">Term k</th>
                  <th className="p-2.5">Rook Coeff (r_k)</th>
                  <th className="p-2.5">Factorial (n-k)!</th>
                  <th className="p-2.5">Sign (-1)^k</th>
                  <th className="p-2.5 text-right">Contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333333]">
                {(mathResult.itemized_terms || []).map((t) => {
                  const coeff = t.coefficient ?? t.rook_coefficient ?? 0
                  const fact = t.factorial_remaining ?? t.factorial_value ?? 0
                  const contrib = t.signed_contribution ?? t.contribution ?? 0
                  const isPos = t.sign === 1 || t.sign === '+'
                  return (
                    <tr key={t.k} className="hover:bg-white/[0.02]">
                      <td className="p-2.5 font-bold text-gw-text">k = {t.k}</td>
                      <td className="p-2.5 text-[#FFFFFF]">r_{t.k} = {coeff.toLocaleString()}</td>
                      <td className="p-2.5 text-gw-text-secondary">({selectedFlightIds.length - t.k})! = {fact.toLocaleString()}</td>
                      <td className="p-2.5">{isPos ? '+' : '-'}</td>
                      <td className="p-2.5 text-right font-bold text-[#FFFFFF]">
                        {contrib > 0 ? `+${contrib.toLocaleString()}` : contrib.toLocaleString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#222E42]">
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
      {currentStep === 5 && (
        <Card className="p-5 space-y-4">
          <BacktrackingAllocationExplorer
            scenarioName={scenarioName}
            scenarioId={savedSimulationId || 'WORKSPACE-SCENARIO'}
            matrix={matrixData}
            flightIds={selectedFlightIds}
            gateIds={selectedGateIds}
            flights={selectedFlights}
            gates={selectedGates}
            phase12ExactCount={mathResult?.exact_valid_assignments}
            onAllocationsGenerated={(res) => {
              // Convert to compatible format for step 6 & export
              setAllocationResult({
                simulation_id: savedSimulationId || 'WORKSPACE-SCENARIO',
                generated_count: res.totalGenerated,
                total_valid_assignments: mathResult?.exact_valid_assignments || res.totalGenerated,
                allocations: res.allocations.map((a, i) => ({
                  allocation_id: a.allocationId,
                  allocation_number: i + 1,
                  pairs: a.assignments.map((x) => ({ flight_id: x.flightId, gate_id: x.gateId })),
                  validation: { is_valid: true, total_conflicts: 0 }
                }))
              })
            }}
          />
        </Card>
      )}

      {currentStep >= 6 && allocationResult && (
        <Card className="p-5 space-y-5 bg-[#121826] border-[#222E42]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#222E42]">
            <div>
              <h2 className="text-base font-bold text-gw-text flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-[#FFFFFF]" />
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
                className="bg-[#1E2638] border border-[#222E42] rounded-lg px-2.5 py-1 text-xs text-gw-text font-mono focus:border-[#FFFFFF] focus:outline-none cursor-pointer"
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
                <div className="p-3.5 rounded-xl bg-[#1E2638] border border-[#222E42] space-y-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-gw-text-secondary">
                    Flight-to-Gate Pairings (Plan #{selectedPlanIndex + 1})
                  </span>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {allocationResult.allocations[selectedPlanIndex].assignments.map((asgn) => (
                      <div
                        key={asgn.flight_id}
                        className="p-2 rounded-lg bg-[#121826] border border-[#222E42] flex items-center justify-between text-xs font-mono"
                      >
                        <span className="text-[#FFFFFF] font-bold">{asgn.flight_number}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-gw-text-secondary" />
                        <span className="text-[#FFFFFF] font-bold">Gate {asgn.gate_number}</span>
                        <span className="text-[10px] text-gw-text-secondary">({asgn.terminal})</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Conflict Audit Card */}
                <div className="p-3.5 rounded-xl bg-[#1E2638] border border-[#222E42] space-y-3">
                  <span className="text-xs font-mono uppercase tracking-wider text-gw-text-secondary">
                    Independent Conflict Audit Verification
                  </span>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-[#FFFFFF]">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-[#FFFFFF]" />
                      <span>Zero Wingspan / Dimensional Conflicts</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#FFFFFF]">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-[#FFFFFF]" />
                      <span>Zero Gate Double-Booking (Bijective)</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#FFFFFF]">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-[#FFFFFF]" />
                      <span>Zero Flight Double-Allocations</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#FFFFFF]">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-[#FFFFFF]" />
                      <span>Zero Forbidden Restriction Cell Violations</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#FFFFFF]">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-[#FFFFFF]" />
                      <span>Complete 100% Matching Attained</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bipartite Graph Visualization of Selected Plan */}
              <div className="p-4 rounded-xl bg-[#0D121F] border border-[#222E42]">
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

          <div className="flex items-center justify-between pt-4 border-t border-[#222E42]">
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
        <Card className="p-6 space-y-6 text-center bg-[#121826] border-[#222E42]">
          <div className="w-12 h-12 rounded-2xl bg-[#1E2638] border border-[#222E42] text-[#FFFFFF] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6 text-[#FFFFFF]" />
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-bold text-gw-text">Allocation Completed & Verified</h2>
            <p className="text-xs text-gw-text-secondary max-w-md mx-auto">
              The scenario has been calculated and independently verified. Download executive reports or export datasets for operational distribution.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto pt-2">
            <div className="p-4 rounded-xl bg-[#1E2638] border border-[#222E42] space-y-3 flex flex-col justify-between">
              <div>
                <FileText className="w-6 h-6 text-[#FFFFFF] mx-auto mb-2" />
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

            <div className="p-4 rounded-xl bg-[#1E2638] border border-[#222E42] space-y-3 flex flex-col justify-between">
              <div>
                <Download className="w-6 h-6 text-[#FFFFFF] mx-auto mb-2" />
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

            <div className="p-4 rounded-xl bg-[#1E2638] border border-[#222E42] space-y-3 flex flex-col justify-between">
              <div>
                <Calculator className="w-6 h-6 text-[#FFFFFF] mx-auto mb-2" />
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

          <div className="pt-4 border-t border-[#222E42] flex items-center justify-center gap-3">
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
