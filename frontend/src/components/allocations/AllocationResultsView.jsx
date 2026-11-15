import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  PlayCircle,
  Calculator,
  ShieldCheck,
  ShieldAlert,
  Search,
  Eye,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plane,
  DoorClosed,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Info,
  Layers,
  X,
  Columns,
  List,
  Share2,
  Download,
  FileText
} from 'lucide-react'
import Button from '../ui/Button'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Modal from '../ui/Modal'
import allocationService from '../../lib/allocationService'
import restrictionService from '../../lib/restrictionService'
import exportService from '../../lib/exportService'
import BipartiteDiagram from './BipartiteDiagram'
import AllocationMatrixOverlay from './AllocationMatrixOverlay'

const RESULT_LIMIT_PRESETS = [10, 50, 100, 309, 500, 1000]

export const AllocationResultsView = ({
  simulations = [],
  selectedSimulationId,
  onSelectSimulation,
  availableFlights = [],
  availableGates = []
}) => {
  // Generation & Math states
  const [maxResults, setMaxResults] = useState(100)
  const [customMaxResults, setCustomMaxResults] = useState('100')
  const [calculationData, setCalculationData] = useState(null)
  const [allocationData, setAllocationData] = useState(null)
  const [restrictionMatrix, setRestrictionMatrix] = useState([])
  const [isLoadingMath, setIsLoadingMath] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [apiError, setApiError] = useState(null)

  // View Mode: 'visualizer' | 'table' | 'split'
  const [viewMode, setViewMode] = useState('visualizer')

  // Selected Allocation for Visualization
  const [selectedAllocationIndex, setSelectedAllocationIndex] = useState(0)

  // Interactive Hover and Selection state for Bipartite & Matrix
  const [hoveredPair, setHoveredPair] = useState(null)
  const [selectedPair, setSelectedPair] = useState(null)

  // Table controls (Search, Sort, Pagination)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('number_asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Modal inspection state
  const [inspectedAllocation, setInspectedAllocation] = useState(null)
  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false)

  // Resolve current active simulation object
  const currentSimulation = useMemo(() => {
    return simulations.find(s => s.id === selectedSimulationId) || simulations[0] || null
  }, [simulations, selectedSimulationId])

  // Lookup maps for enriched flight and gate information
  const flightMap = useMemo(() => {
    return new Map(availableFlights.map(f => [f.id, f]))
  }, [availableFlights])

  const gateMap = useMemo(() => {
    return new Map(availableGates.map(g => [g.id, g]))
  }, [availableGates])

  // Resolve ordered scenario entities
  const scenarioFlights = useMemo(() => {
    if (!currentSimulation) return []
    return currentSimulation.selectedFlightIds.map(fid => flightMap.get(fid) || { id: fid, airline: 'Flight' })
  }, [currentSimulation, flightMap])

  const scenarioGates = useMemo(() => {
    if (!currentSimulation) return []
    return currentSimulation.selectedGateIds.map(gid => gateMap.get(gid) || { id: gid, terminal: 'Gate' })
  }, [currentSimulation, gateMap])

  // Check if simulation is balanced (square matrix requirement)
  const isBalanced = useMemo(() => {
    if (!currentSimulation) return false
    const fCount = currentSimulation.selectedFlightIds?.length || 0
    const gCount = currentSimulation.selectedGateIds?.length || 0
    return fCount > 0 && fCount === gCount
  }, [currentSimulation])

  // Active allocation being visualized
  const activeAllocation = useMemo(() => {
    if (!allocationData?.allocations || allocationData.allocations.length === 0) return null
    return allocationData.allocations[selectedAllocationIndex] || allocationData.allocations[0]
  }, [allocationData, selectedAllocationIndex])

  // Fetch mathematical counts and matrix when simulation changes
  const fetchSimulationData = useCallback(async (simId) => {
    if (!simId) return
    try {
      setIsLoadingMath(true)
      setApiError(null)
      const [calc, matrix] = await Promise.all([
        allocationService.getCalculation(simId),
        restrictionService.getMatrixForSimulation(simId)
      ])
      setCalculationData(calc)
      setRestrictionMatrix(matrix)
    } catch (err) {
      console.error('Failed to fetch simulation data:', err)
      setApiError(err.message)
      setCalculationData(null)
      setRestrictionMatrix([])
    } finally {
      setIsLoadingMath(false)
    }
  }, [])

  // Generate allocations
  const handleGenerateAllocations = useCallback(async (limitToUse) => {
    if (!currentSimulation) return
    const limit = limitToUse !== undefined ? limitToUse : maxResults
    try {
      setIsGenerating(true)
      setApiError(null)
      const res = await allocationService.generateAllocations(currentSimulation.id, limit)
      setAllocationData(res)
      setSelectedAllocationIndex(0)
      setSelectedPair(null)
      setHoveredPair(null)
      setCurrentPage(1)
    } catch (err) {
      console.error('Failed to generate allocations:', err)
      setApiError(err.message)
    } finally {
      setIsGenerating(false)
    }
  }, [currentSimulation, maxResults])

  // Reload calculation and matrix when simulation changes
  useEffect(() => {
    if (currentSimulation?.id && isBalanced) {
      fetchSimulationData(currentSimulation.id)
      setAllocationData(null)
      setSelectedAllocationIndex(0)
      setSelectedPair(null)
      setHoveredPair(null)
    } else {
      setCalculationData(null)
      setRestrictionMatrix([])
      setAllocationData(null)
    }
  }, [currentSimulation?.id, isBalanced, fetchSimulationData])

  // Handle preset result limit change
  const handleSelectPresetLimit = (val) => {
    setMaxResults(val)
    setCustomMaxResults(String(val))
  }

  // Handle custom result limit blur
  const handleCustomLimitBlur = () => {
    const parsed = parseInt(customMaxResults, 10)
    if (isNaN(parsed) || parsed < 1) {
      setMaxResults(100)
      setCustomMaxResults('100')
    } else if (parsed > 10000) {
      setMaxResults(10000)
      setCustomMaxResults('10000')
    } else {
      setMaxResults(parsed)
      setCustomMaxResults(String(parsed))
    }
  }

  // Filter & sort allocations for table view
  const filteredAllocations = useMemo(() => {
    if (!allocationData?.allocations) return []
    let list = [...allocationData.allocations]

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter(alloc => {
        if (`#${alloc.allocation_number}`.includes(q) || String(alloc.allocation_number).includes(q)) {
          return true
        }
        return alloc.assignments.some(a =>
          a.flight_id.toLowerCase().includes(q) || a.gate_id.toLowerCase().includes(q)
        )
      })
    }

    // Sort order
    if (sortBy === 'number_desc') {
      list.sort((a, b) => b.allocation_number - a.allocation_number)
    } else if (sortBy === 'status') {
      list.sort((a, b) => {
        const aValid = a.validation?.is_valid ? 1 : 0
        const bValid = b.validation?.is_valid ? 1 : 0
        return bValid - aValid
      })
    } else {
      list.sort((a, b) => a.allocation_number - b.allocation_number)
    }

    return list
  }, [allocationData, searchQuery, sortBy])

  // Pagination calculations
  const totalPages = Math.ceil(filteredAllocations.length / itemsPerPage) || 1
  const paginatedAllocations = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredAllocations.slice(start, start + itemsPerPage)
  }, [filteredAllocations, currentPage, itemsPerPage])

  // Open inspector modal for a specific allocation
  const handleInspectAllocation = (alloc) => {
    setInspectedAllocation(alloc)
    setIsInspectionModalOpen(true)
  }

  // Active pair details resolution for inspector card
  const activePairDetails = useMemo(() => {
    const pair = selectedPair || hoveredPair
    if (!pair) return null
    const flightObj = flightMap.get(pair.flight_id)
    const gateObj = gateMap.get(pair.gate_id)

    // Check restriction matrix
    const fIdx = scenarioFlights.findIndex(f => f.id === pair.flight_id)
    const gIdx = scenarioGates.findIndex(g => g.id === pair.gate_id)
    const isCellForbidden =
      fIdx >= 0 && gIdx >= 0 && restrictionMatrix[fIdx]
        ? restrictionMatrix[fIdx][gIdx] === 1
        : false

    // Check if in current allocation
    const isAssigned = activeAllocation?.assignments.some(
      a => a.flight_id === pair.flight_id && a.gate_id === pair.gate_id
    )

    // Check conflicts
    const conflict = activeAllocation?.validation?.conflicts?.find(
      c => c.flight_id === pair.flight_id && c.gate_id === pair.gate_id
    )

    return {
      flight: flightObj || { id: pair.flight_id },
      gate: gateObj || { id: pair.gate_id },
      isForbidden: isCellForbidden,
      isAssigned,
      conflict,
      fIdx,
      gIdx
    }
  }, [selectedPair, hoveredPair, flightMap, gateMap, scenarioFlights, scenarioGates, restrictionMatrix, activeAllocation])

  return (
    <div className="space-y-6">
      {/* Simulation Selector & Generator Controls Header */}
      <Card className="p-5 border-[#1e3a5f]/60 bg-gw-card/80 backdrop-blur-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Simulation dropdown */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gw-text-secondary block mb-1">
                Active Simulation Scenario
              </label>
              <div className="relative min-w-[260px]">
                <select
                  value={currentSimulation?.id || ''}
                  onChange={(e) => onSelectSimulation(e.target.value)}
                  className="w-full bg-gw-bg-secondary border border-[#1e3a5f] rounded-xl px-3 py-2 text-sm text-gw-text font-medium focus:outline-none focus:border-gw-cyan transition-colors cursor-pointer appearance-none pr-9"
                >
                  {simulations.map((sim) => (
                    <option key={sim.id} value={sim.id}>
                      {sim.name} ({sim.selectedFlightIds?.length || 0}F / {sim.selectedGateIds?.length || 0}G)
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gw-text-secondary">
                  ▼
                </div>
              </div>
            </div>

            {/* Balanced dimension badge */}
            <div className="sm:self-end mb-1">
              {isBalanced ? (
                <Badge variant="success" dot icon={CheckCircle2}>
                  Square Problem: {currentSimulation.selectedFlightIds.length} × {currentSimulation.selectedGateIds.length}
                </Badge>
              ) : (
                <Badge variant="warning" dot icon={AlertTriangle}>
                  Unbalanced: {currentSimulation?.selectedFlightIds?.length || 0} Flights ≠ {currentSimulation?.selectedGateIds?.length || 0} Gates
                </Badge>
              )}
            </div>
          </div>

          {/* Generator Limit Config & Run Button */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-gw-bg-secondary/70 border border-[#1e3a5f]/60 rounded-xl p-1.5">
              <span className="text-xs text-gw-text-secondary font-mono px-2">Limit:</span>
              <div className="flex items-center gap-1">
                {RESULT_LIMIT_PRESETS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleSelectPresetLimit(val)}
                    className={`px-2 py-1 text-xs font-mono rounded-lg transition-colors cursor-pointer ${
                      maxResults === val
                        ? 'bg-gw-cyan text-gw-bg font-bold shadow-xs shadow-gw-cyan/30'
                        : 'text-gw-text-secondary hover:text-gw-text hover:bg-white/5'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="1"
                max="10000"
                value={customMaxResults}
                onChange={(e) => setCustomMaxResults(e.target.value)}
                onBlur={handleCustomLimitBlur}
                className="w-16 bg-gw-bg border border-[#1e3a5f] rounded-lg px-2 py-0.5 text-xs font-mono text-gw-text text-center focus:outline-none focus:border-gw-cyan"
                title="Custom maximum results (1 to 10000)"
              />
            </div>

            <Button
              variant="primary"
              size="md"
              icon={PlayCircle}
              disabled={!isBalanced || isGenerating}
              onClick={() => handleGenerateAllocations()}
              className="shadow-md shadow-gw-cyan/10"
            >
              {isGenerating ? 'Generating Allocations...' : 'Generate Valid Allocations'}
            </Button>

            <Button
              variant="outline"
              size="md"
              icon={Download}
              disabled={!currentSimulation || !allocationData}
              onClick={() => exportService.downloadAllocationsCsv(currentSimulation.id, maxResults)}
              title="Download Allocations as CSV"
            >
              Export CSV
            </Button>

            <Button
              variant="outline"
              size="md"
              icon={FileText}
              disabled={!currentSimulation}
              onClick={() => exportService.openAcademicReport(currentSimulation.id)}
              title="Open Printable Academic PDF Report"
            >
              Academic PDF
            </Button>
          </div>
        </div>

        {/* Warning if unbalanced */}
        {!isBalanced && (
          <div className="mt-4 p-3 bg-gw-warning/10 border border-gw-warning/30 rounded-xl flex items-center gap-2.5 text-xs text-gw-warning">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              The GateWise allocation engine requires an exact 1-to-1 square problem ($n \times n$). Please ensure the simulation has equal flights and gates in the Scenario Management tab.
            </span>
          </div>
        )}
      </Card>

      {/* API Error Notification */}
      {apiError && (
        <div className="p-4 bg-gw-error/10 border border-gw-error/40 rounded-xl flex items-start gap-3 text-gw-error text-sm">
          <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block">Allocation Generation Failed</span>
            <span className="text-xs text-gw-error/90 mt-0.5 block">{apiError}</span>
          </div>
          <button
            type="button"
            onClick={() => handleGenerateAllocations()}
            className="text-xs underline font-medium hover:text-white cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Authoritative Results Summary Bar (Section 3) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Possible Assignments */}
        <Card className="p-4 border-[#1e3a5f]/60 bg-gw-card/60">
          <div className="flex items-center justify-between text-xs text-gw-text-secondary uppercase tracking-wider font-semibold">
            <span>Total Permutations</span>
            <Layers className="w-4 h-4 text-gw-blue" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-gw-text">
              {calculationData?.total_possible_assignments !== undefined
                ? calculationData.total_possible_assignments.toLocaleString()
                : isBalanced
                ? `${currentSimulation.selectedFlightIds.length}!`
                : '—'}
            </span>
            <span className="text-xs text-gw-text-secondary font-mono">
              ({currentSimulation?.selectedFlightIds?.length || 0}!)
            </span>
          </div>
          <p className="mt-1 text-[11px] text-gw-text-secondary">
            Unconstrained one-to-one flight-to-gate matchings
          </p>
        </Card>

        {/* Metric 2: Exact Mathematically Valid Total (Authoritative PIE) */}
        <Card className="p-4 border-[#1e3a5f]/60 bg-gw-card/60 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-gw-cyan uppercase tracking-wider font-semibold">
            <span>Exact Valid Total (N)</span>
            <Calculator className="w-4 h-4 text-gw-cyan" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-gw-cyan">
              {isLoadingMath ? (
                <span className="animate-pulse">Calculating...</span>
              ) : calculationData?.valid_assignments !== undefined ? (
                calculationData.valid_assignments.toLocaleString()
              ) : (
                '—'
              )}
            </span>
            {calculationData?.feasibility_percentage !== undefined && (
              <span className="text-xs font-mono text-gw-cyan/80">
                ({calculationData.feasibility_percentage.toFixed(1)}% feasible)
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-gw-text-secondary">
            Authoritative discrete math total from PIE (Phase 14)
          </p>
        </Card>

        {/* Metric 3: Generated Count & Generation Status */}
        <Card className="p-4 border-[#1e3a5f]/60 bg-gw-card/60">
          <div className="flex items-center justify-between text-xs text-gw-text-secondary uppercase tracking-wider font-semibold">
            <span>Generated Allocations</span>
            <PlayCircle className="w-4 h-4 text-gw-success" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-gw-text">
              {allocationData ? allocationData.generated_count.toLocaleString() : '0'}
            </span>
            {allocationData && (
              <span className="text-xs text-gw-text-secondary font-mono">
                / {allocationData.total_valid_assignments.toLocaleString()}
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            {allocationData ? (
              allocationData.generation_complete ? (
                <Badge variant="success" size="sm" dot>
                  Complete (All {allocationData.generated_count} Generated)
                </Badge>
              ) : (
                <Badge variant="warning" size="sm" dot>
                  Limit Reached ({allocationData.generated_count} / {allocationData.total_valid_assignments})
                </Badge>
              )
            ) : (
              <span className="text-[11px] text-gw-text-secondary italic">
                Awaiting generator execution
              </span>
            )}
          </div>
        </Card>

        {/* Metric 4: Independent Conflict Audit Status (Phase 17) */}
        <Card className="p-4 border-[#1e3a5f]/60 bg-gw-card/60">
          <div className="flex items-center justify-between text-xs text-gw-text-secondary uppercase tracking-wider font-semibold">
            <span>Conflict Audit (Phase 17)</span>
            <ShieldCheck className="w-4 h-4 text-gw-success" />
          </div>
          <div className="mt-2">
            {allocationData ? (
              allocationData.allocations.every(a => a.validation?.is_valid) ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-gw-success shrink-0" />
                  <span className="font-mono text-sm font-semibold text-gw-success">
                    100% Conflict-Free
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-gw-error shrink-0" />
                  <span className="font-mono text-sm font-semibold text-gw-error">
                    Conflicts Detected
                  </span>
                </div>
              )
            ) : (
              <span className="text-sm font-mono text-gw-text-secondary">
                Not Audited
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-gw-text-secondary">
            Zero-trust verification by Phase 17 engine
          </p>
        </Card>
      </div>

      {/* Clarification Callout: Mathematical Total vs Generated Subset */}
      {allocationData && allocationData.has_more && (
        <div className="p-3.5 bg-gw-blue/10 border border-gw-blue/30 rounded-xl flex items-start gap-3 text-xs text-gw-text">
          <Info className="w-4 h-4 text-gw-cyan shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-gw-cyan block">
              Partial Allocation View Notice
            </span>
            <p className="text-gw-text-secondary leading-relaxed">
              Displaying <strong className="text-gw-text">{allocationData.generated_count}</strong> generated allocations out of the exact discrete mathematical total of <strong className="text-gw-text">{allocationData.total_valid_assignments.toLocaleString()}</strong> valid solutions. Additional valid allocations exist in the combinatorial solution space. Increase the result limit above to retrieve more allocations.
            </p>
          </div>
        </div>
      )}

      {/* Zero Valid Allocations State */}
      {calculationData && calculationData.valid_assignments === 0 && (
        <Card className="p-8 text-center border-gw-warning/40 bg-gw-warning/5">
          <div className="w-12 h-12 rounded-2xl bg-gw-warning/10 border border-gw-warning/30 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-6 h-6 text-gw-warning" />
          </div>
          <h4 className="text-base font-bold text-gw-text">
            Zero Valid Allocations Exist ($N = 0$)
          </h4>
          <p className="text-xs text-gw-text-secondary max-w-lg mx-auto mt-1 leading-relaxed">
            The configured restriction matrix completely forbids all possible bijective flight-to-gate assignments. Mathematically, every single one of the {calculationData.total_possible_assignments} permutations violates at least one restriction.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              icon={RotateCcw}
              onClick={() => fetchSimulationData(currentSimulation.id)}
            >
              Recompute Calculations
            </Button>
          </div>
        </Card>
      )}

      {/* Interactive Visualizer & Results Section */}
      {allocationData && allocationData.generated_count > 0 && (
        <div className="space-y-5">
          {/* View Mode Switcher & Active Allocation Stepper */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-gw-card/60 border border-[#1e3a5f]/60">
            {/* View Mode Toggle Buttons */}
            <div className="flex items-center gap-1.5 bg-gw-bg-secondary p-1 rounded-xl border border-[#1e3a5f]/60">
              <button
                type="button"
                onClick={() => setViewMode('visualizer')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'visualizer'
                    ? 'bg-gw-cyan text-gw-bg font-bold shadow-xs'
                    : 'text-gw-text-secondary hover:text-gw-text'
                }`}
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Interactive Diagram</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-gw-cyan text-gw-bg font-bold shadow-xs'
                    : 'text-gw-text-secondary hover:text-gw-text'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Plans Table</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'split'
                    ? 'bg-gw-cyan text-gw-bg font-bold shadow-xs'
                    : 'text-gw-text-secondary hover:text-gw-text'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Dual View</span>
              </button>
            </div>

            {/* Allocation Selector / Stepper */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  icon={ChevronLeft}
                  disabled={selectedAllocationIndex === 0}
                  onClick={() => setSelectedAllocationIndex(prev => Math.max(prev - 1, 0))}
                  className="py-1 px-2 text-xs"
                  title="Previous allocation"
                />

                <select
                  value={selectedAllocationIndex}
                  onChange={(e) => setSelectedAllocationIndex(Number(e.target.value))}
                  className="bg-gw-bg border border-[#1e3a5f] rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-gw-cyan focus:outline-none focus:border-gw-cyan cursor-pointer"
                >
                  {allocationData.allocations.map((alloc, idx) => (
                    <option key={idx} value={idx}>
                      Plan #{String(alloc.allocation_number).padStart(3, '0')} {alloc.validation?.is_valid ? '(Valid)' : '(Conflict)'}
                    </option>
                  ))}
                </select>

                <Button
                  variant="outline"
                  size="sm"
                  icon={ChevronRight}
                  disabled={selectedAllocationIndex >= allocationData.allocations.length - 1}
                  onClick={() => setSelectedAllocationIndex(prev => Math.min(prev + 1, allocationData.allocations.length - 1))}
                  className="py-1 px-2 text-xs"
                  title="Next allocation"
                />
              </div>

              {/* Status Badge of Active Allocation */}
              <div>
                {activeAllocation?.validation?.is_valid ? (
                  <Badge variant="success" size="sm" icon={ShieldCheck}>
                    PLAN #{String(activeAllocation.allocation_number).padStart(3, '0')} VALID
                  </Badge>
                ) : (
                  <Badge variant="error" size="sm" icon={ShieldAlert}>
                    CONFLICTS ({activeAllocation?.validation?.total_conflicts || 0})
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* ACTIVE ALLOCATION VISUALIZER (Phase 19) */}
          {(viewMode === 'visualizer' || viewMode === 'split') && (
            <div className="space-y-6">
              {/* Top: Bipartite Assignment Diagram */}
              <BipartiteDiagram
                flights={scenarioFlights}
                gates={scenarioGates}
                allocation={activeAllocation}
                matrix={restrictionMatrix}
                hoveredPair={hoveredPair}
                onHoverPair={setHoveredPair}
                selectedPair={selectedPair}
                onSelectPair={setSelectedPair}
              />

              {/* Middle: Restriction Matrix with Active Allocation Overlay */}
              <AllocationMatrixOverlay
                matrix={restrictionMatrix}
                flights={scenarioFlights}
                gates={scenarioGates}
                allocation={activeAllocation}
                hoveredPair={hoveredPair}
                onHoverPair={setHoveredPair}
                selectedPair={selectedPair}
                onSelectPair={setSelectedPair}
              />

              {/* Bottom: Pair Inspector Card (When flight, gate, or cell is hovered or clicked) */}
              {activePairDetails ? (
                <Card className="p-4 border-gw-cyan/40 bg-gw-card/90 shadow-md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e3a5f]/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gw-cyan/15 border border-gw-cyan/30 flex items-center justify-center text-gw-cyan">
                        <Plane className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs uppercase tracking-wider text-gw-text-secondary font-semibold font-mono">
                          Inspected Linkage
                        </span>
                        <div className="flex items-center gap-2 font-mono text-sm font-bold text-gw-text">
                          <span className="text-gw-cyan">{activePairDetails.flight.id}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-gw-text-secondary" />
                          <span className="text-gw-text">{activePairDetails.gate.id}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {activePairDetails.isAssigned ? (
                        activePairDetails.isForbidden ? (
                          <Badge variant="error" size="sm" icon={AlertTriangle}>
                            Assigned Forbidden (Violation)
                          </Badge>
                        ) : (
                          <Badge variant="success" size="sm" icon={CheckCircle2}>
                            Assigned in Plan #{activeAllocation.allocation_number}
                          </Badge>
                        )
                      ) : activePairDetails.isForbidden ? (
                        <Badge variant="error" size="sm">
                          Restricted Cell (1)
                        </Badge>
                      ) : (
                        <Badge variant="cyan" size="sm">
                          Allowed Cell (0) - Unassigned
                        </Badge>
                      )}

                      {selectedPair && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPair(null)}
                          className="text-xs py-1 px-2"
                        >
                          Clear Pin
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Pair Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-gw-bg-secondary/40 border border-[#1e3a5f]/40">
                      <span className="text-[10px] text-gw-text-secondary uppercase block mb-0.5">Flight Info</span>
                      <span className="font-semibold text-gw-text block">{activePairDetails.flight.airline || 'Aviation'}</span>
                      <span className="text-[11px] text-gw-text-secondary font-mono">
                        {activePairDetails.flight.flightNumber || activePairDetails.flight.callsign || 'N/A'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-gw-bg-secondary/40 border border-[#1e3a5f]/40">
                      <span className="text-[10px] text-gw-text-secondary uppercase block mb-0.5">Gate Info</span>
                      <span className="font-semibold text-gw-text block">{activePairDetails.gate.terminal || 'Main Terminal'}</span>
                      <span className="text-[11px] text-gw-text-secondary font-mono">
                        Type: {activePairDetails.gate.gateType || 'Standard'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-gw-bg-secondary/40 border border-[#1e3a5f]/40">
                      <span className="text-[10px] text-gw-text-secondary uppercase block mb-0.5">Matrix Coordinate</span>
                      <span className="font-mono text-gw-cyan block">
                        Cell [{activePairDetails.fIdx}, {activePairDetails.gIdx}] = {activePairDetails.isForbidden ? '1 (Restricted)' : '0 (Allowed)'}
                      </span>
                      <span className="text-[11px] text-gw-text-secondary">
                        {activePairDetails.conflict ? activePairDetails.conflict.message : 'No constraint conflict.'}
                      </span>
                    </div>
                  </div>
                </Card>
              ) : (
                <div className="p-3 rounded-xl bg-gw-bg-secondary/30 border border-[#1e3a5f]/40 text-center text-xs text-gw-text-secondary">
                  Hover or click any flight node, gate node, connection line, or matrix cell to inspect discrete relationship details.
                </div>
              )}
            </div>
          )}

          {/* TABLE VIEW (Phase 18 Table preserved) */}
          {(viewMode === 'table' || viewMode === 'split') && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gw-text-secondary pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by allocation #, flight ID, or gate ID..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-full bg-gw-bg-secondary border border-[#1e3a5f] rounded-xl pl-9 pr-3 py-2 text-xs text-gw-text placeholder:text-gw-text-secondary/60 focus:outline-none focus:border-gw-cyan transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gw-text-secondary hover:text-gw-text"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Sort & Page Size Controls */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-gw-text-secondary">
                    <span className="font-mono">Sort:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="bg-gw-bg-secondary border border-[#1e3a5f] rounded-lg px-2 py-1.5 text-xs text-gw-text focus:outline-none focus:border-gw-cyan"
                    >
                      <option value="number_asc">Allocation # (Ascending)</option>
                      <option value="number_desc">Allocation # (Descending)</option>
                      <option value="status">Validation Status</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-gw-text-secondary">
                    <span className="font-mono">Rows:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value))
                        setCurrentPage(1)
                      }}
                      className="bg-gw-bg-secondary border border-[#1e3a5f] rounded-lg px-2 py-1.5 text-xs text-gw-text focus:outline-none focus:border-gw-cyan"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Table Container */}
              <div className="w-full overflow-x-auto rounded-xl border border-[#1e3a5f]/60 bg-gw-card/50 shadow-md">
                <table className="w-full text-left text-sm text-gw-text">
                  <thead className="bg-gw-bg-secondary/70 text-xs uppercase tracking-wider text-gw-text-secondary border-b border-[#1e3a5f]/60">
                    <tr>
                      <th className="px-4 py-3.5 font-semibold text-center w-24">Allocation #</th>
                      <th className="px-4 py-3.5 font-semibold">Flight-to-Gate Assignment Plan</th>
                      <th className="px-4 py-3.5 font-semibold text-center w-24">Pairs</th>
                      <th className="px-4 py-3.5 font-semibold text-center w-36">Independent Audit</th>
                      <th className="px-4 py-3.5 font-semibold text-center w-36">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e3a5f]/40 font-mono text-xs">
                    {paginatedAllocations.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gw-text-secondary font-sans text-sm">
                          No allocations match the search filter.
                        </td>
                      </tr>
                    ) : (
                      paginatedAllocations.map((alloc) => {
                        const isValid = alloc.validation?.is_valid
                        const totalConflicts = alloc.validation?.total_conflicts || 0
                        const isCurrentActive = activeAllocation?.allocation_number === alloc.allocation_number

                        return (
                          <tr
                            key={alloc.allocation_number}
                            className={`transition-colors ${
                              isCurrentActive ? 'bg-gw-cyan/10' : 'hover:bg-white/[0.02]'
                            }`}
                          >
                            <td className="px-4 py-3 text-center font-bold text-gw-cyan">
                              #{String(alloc.allocation_number).padStart(3, '0')}
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {alloc.assignments.map((a, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gw-bg-secondary border border-[#1e3a5f]/60 text-[11px] text-gw-text"
                                  >
                                    <span className="font-semibold text-gw-cyan">{a.flight_id}</span>
                                    <ArrowRight className="w-2.5 h-2.5 text-gw-text-secondary" />
                                    <span className="font-semibold text-gw-text">{a.gate_id}</span>
                                  </span>
                                ))}
                              </div>
                            </td>

                            <td className="px-4 py-3 text-center text-gw-text-secondary">
                              {alloc.assignments.length} / {allocationData.matrix_size}
                            </td>

                            <td className="px-4 py-3 text-center">
                              {isValid ? (
                                <Badge variant="success" size="sm" icon={ShieldCheck}>
                                  VALID (0)
                                </Badge>
                              ) : (
                                <Badge variant="error" size="sm" icon={ShieldAlert}>
                                  INVALID ({totalConflicts})
                                </Badge>
                              )}
                            </td>

                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <Button
                                  variant={isCurrentActive ? 'primary' : 'outline'}
                                  size="sm"
                                  icon={Share2}
                                  onClick={() => {
                                    const idx = allocationData.allocations.findIndex(
                                      a => a.allocation_number === alloc.allocation_number
                                    )
                                    if (idx >= 0) setSelectedAllocationIndex(idx)
                                    if (viewMode === 'table') setViewMode('visualizer')
                                  }}
                                  className="text-xs py-1 px-2"
                                  title="View bipartite diagram for this allocation"
                                >
                                  {isCurrentActive ? 'Active' : 'Graph'}
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  icon={Eye}
                                  onClick={() => handleInspectAllocation(alloc)}
                                  className="text-xs py-1 px-2"
                                  title="Inspect allocation pairings"
                                >
                                  Details
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gw-text-secondary pt-2">
                  <div>
                    Showing{' '}
                    <span className="font-semibold text-gw-text">
                      {(currentPage - 1) * itemsPerPage + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-semibold text-gw-text">
                      {Math.min(currentPage * itemsPerPage, filteredAllocations.length)}
                    </span>{' '}
                    of{' '}
                    <span className="font-semibold text-gw-text">
                      {filteredAllocations.length}
                    </span>{' '}
                    matching allocations
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={ChevronLeft}
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      className="py-1 px-2.5"
                    >
                      Prev
                    </Button>
                    <span className="font-mono text-gw-text px-2">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={ChevronRight}
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      className="py-1 px-2.5"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Allocation Inspector Modal */}
      <Modal
        isOpen={isInspectionModalOpen}
        onClose={() => setIsInspectionModalOpen(false)}
        title={inspectedAllocation ? `Allocation Plan #${String(inspectedAllocation.allocation_number).padStart(3, '0')}` : 'Allocation Inspection'}
        subtitle={`Scenario: ${currentSimulation?.name || ''} (${allocationData?.matrix_size || 0} Flights × ${allocationData?.matrix_size || 0} Gates)`}
        maxWidth="max-w-2xl"
      >
        {inspectedAllocation && (
          <div className="space-y-5">
            {inspectedAllocation.validation?.is_valid ? (
              <div className="p-3.5 bg-gw-success/10 border border-gw-success/30 rounded-xl flex items-start gap-3 text-xs text-gw-success">
                <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Independently Audited & Conflict-Free</span>
                  <span className="text-gw-success/90 mt-0.5 block leading-relaxed">
                    Verified by Phase 17 Conflict Detection Engine: 0 conflicts detected. All flights assigned to exactly one distinct gate without violating restriction matrix constraints.
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-gw-error/10 border border-gw-error/40 rounded-xl flex items-start gap-3 text-xs text-gw-error">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">
                    {inspectedAllocation.validation?.total_conflicts || 0} Assignment Conflicts Detected
                  </span>
                  <div className="mt-2 space-y-1">
                    {inspectedAllocation.validation?.conflicts.map((c, i) => (
                      <div key={i} className="text-gw-error/90 font-mono text-[11px]">
                        • [{c.conflict_type}] {c.message}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div>
              <h5 className="text-xs font-semibold uppercase tracking-wider text-gw-text-secondary mb-2.5 flex items-center justify-between">
                <span>Flight-to-Gate Linkage Breakdown</span>
                <span className="font-mono text-gw-cyan">{inspectedAllocation.assignments.length} Pairs</span>
              </h5>
              <div className="rounded-xl border border-[#1e3a5f]/60 bg-gw-bg-secondary/40 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gw-bg-secondary text-gw-text-secondary font-semibold uppercase border-b border-[#1e3a5f]/60">
                    <tr>
                      <th className="px-4 py-2.5">Flight</th>
                      <th className="px-4 py-2.5 text-center">Direction</th>
                      <th className="px-4 py-2.5">Assigned Gate</th>
                      <th className="px-4 py-2.5 text-center">Restriction Cell</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e3a5f]/40 font-mono">
                    {inspectedAllocation.assignments.map((pair, idx) => {
                      const flightObj = flightMap.get(pair.flight_id)
                      const gateObj = gateMap.get(pair.gate_id)

                      return (
                        <tr key={idx} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Plane className="w-3.5 h-3.5 text-gw-cyan shrink-0" />
                              <div>
                                <span className="font-bold text-gw-cyan block">{pair.flight_id}</span>
                                {flightObj && (
                                  <span className="text-[10px] text-gw-text-secondary block font-sans">
                                    {flightObj.airline} • {flightObj.flightNumber || flightObj.callsign || ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-center">
                            <ArrowRight className="w-3.5 h-3.5 text-gw-text-secondary inline" />
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <DoorClosed className="w-3.5 h-3.5 text-gw-text shrink-0" />
                              <div>
                                <span className="font-bold text-gw-text block">{pair.gate_id}</span>
                                {gateObj && (
                                  <span className="text-[10px] text-gw-text-secondary block font-sans">
                                    {gateObj.terminal || 'Main'} • {gateObj.gateType || 'Standard'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-center">
                            <Badge variant="success" size="sm">
                              Allowed (0)
                            </Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsInspectionModalOpen(false)}
              >
                Close Inspector
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default AllocationResultsView
