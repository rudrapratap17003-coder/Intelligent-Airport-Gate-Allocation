import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Layers,
  Plus,
  Search,
  Copy,
  Trash2,
  PlayCircle,
  Download,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Clock,
  Sparkles,
  Edit2,
  Eye,
  Calendar,
  CheckSquare,
  Square,
  Plane,
  DoorOpen,
  Lock,
  Unlock,
  Sliders,
  Zap,
  History,
  TrendingDown,
  TrendingUp,
  Activity
} from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import Dropdown from '../components/ui/Dropdown'
import EmptyState from '../components/ui/EmptyState'
import simulationService, {
  SCENARIO_CATEGORIES,
  isValidDate,
  isValidTimeWindow
} from '../lib/simulationService'
import flightService, { INITIAL_SAMPLE_FLIGHTS } from '../lib/flightService'
import gateService, { INITIAL_SAMPLE_GATES } from '../lib/gateService'
import exportService from '../lib/exportService'
import { useToast } from '../context/ToastContext'

const STATUS_FILTER_OPTIONS = [
  { label: 'All Statuses', value: 'ALL' },
  { label: 'Ready (Simulation Ready)', value: 'Ready' },
  { label: 'Draft (In Progress)', value: 'Draft' },
  { label: 'Completed (Locked Archive)', value: 'Completed' }
]

const TIME_WINDOW_PRESETS = [
  '06:00 - 10:00',
  '08:00 - 12:00',
  '12:00 - 16:00',
  '16:00 - 20:00',
  '20:00 - 00:00'
]

export const ScenarioManagement = () => {
  const toast = useToast()
  const [simulations, setSimulations] = useState([])
  const [availableFlights, setAvailableFlights] = useState([])
  const [availableGates, setAvailableGates] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedCategory, setSelectedCategory] = useState('All')

  // Double-click debounce maps
  const [duplicatingMap, setDuplicatingMap] = useState({})
  const [runningMap, setRunningMap] = useState({})

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentEditId, setCurrentEditId] = useState(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [simulationToDelete, setSimulationToDelete] = useState(null)
  const [inspectingSim, setInspectingSim] = useState(null)

  // Traffic Generator Modal
  const [isTrafficModalOpen, setIsTrafficModalOpen] = useState(false)
  const [trafficForm, setTrafficForm] = useState({
    name: 'Morning Peak Operations (BLR)',
    category: 'Normal Operations',
    profile: 'normal',
    targetTerminal: 'ALL',
    density: 'moderate',
    flightCount: 6,
    gateCount: 6
  })
  const [isGeneratingTraffic, setIsGeneratingTraffic] = useState(false)

  // What-If Analysis Studio Modal
  const [whatIfSim, setWhatIfSim] = useState(null)
  const [isWhatIfModalOpen, setIsWhatIfModalOpen] = useState(false)
  const [whatIfDisabledGates, setWhatIfDisabledGates] = useState([])
  const [whatIfResult, setWhatIfResult] = useState(null)
  const [isEvaluatingWhatIf, setIsEvaluatingWhatIf] = useState(false)

  // Simulation Run History Modal
  const [historySim, setHistorySim] = useState(null)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [historyRuns, setHistoryRuns] = useState([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // Explicit Reopen & Complete Modals (Completed Status Protection)
  const [simToReopen, setSimToReopen] = useState(null)
  const [simToComplete, setSimToComplete] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Normal Operations',
    simulationDate: new Date().toISOString().slice(0, 10),
    timeWindow: '08:00 - 12:00',
    status: 'Ready',
    selectedFlightIds: [],
    selectedGateIds: []
  })
  const [formErrors, setFormErrors] = useState({})
  const [flightSearchInModal, setFlightSearchInModal] = useState('')
  const [gateSearchInModal, setGateSearchInModal] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [simsResult, flightsResult, gatesResult] = await Promise.allSettled([
        simulationService.getSimulations(),
        flightService.getFlights(),
        gateService.getGates()
      ])

      // Fallback safely to genuine local backup if service call fails — never silent sample overwrite
      const loadedSims = simsResult.status === 'fulfilled'
        ? simsResult.value
        : simulationService.getLegacyBackup()

      const loadedFlights = flightsResult.status === 'fulfilled'
        ? flightsResult.value
        : INITIAL_SAMPLE_FLIGHTS

      const loadedGates = gatesResult.status === 'fulfilled'
        ? gatesResult.value
        : INITIAL_SAMPLE_GATES

      setSimulations(loadedSims)
      setAvailableFlights(loadedFlights)
      setAvailableGates(loadedGates)
    } catch (err) {
      console.error('Failed to load scenarios:', err)
      toast.error('Data Load Error', 'Could not retrieve simulation catalog.')
    } finally {
      setIsLoading(false)
    }
  }

  // Filtered simulations
  const filteredSimulations = useMemo(() => {
    return simulations.filter((sim) => {
      const matchSearch =
        sim.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sim.description && sim.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        sim.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sim.category && sim.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (sim.simulationDate && sim.simulationDate.includes(searchTerm)) ||
        (sim.timeWindow && sim.timeWindow.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchStatus =
        statusFilter === 'ALL' ||
        sim.status === statusFilter

      const matchCategory =
        selectedCategory === 'All' ||
        sim.category === selectedCategory

      return matchSearch && matchStatus && matchCategory
    })
  }, [simulations, searchTerm, statusFilter, selectedCategory])

  // Count summaries
  const readyCount = useMemo(() => simulations.filter((s) => s.status === 'Ready').length, [simulations])
  const draftCount = useMemo(() => simulations.filter((s) => s.status === 'Draft').length, [simulations])
  const completedCount = useMemo(() => simulations.filter((s) => s.status === 'Completed').length, [simulations])

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setIsEditing(false)
    setCurrentEditId(null)
    setFormData({
      name: '',
      description: '',
      category: selectedCategory !== 'All' ? selectedCategory : 'Normal Operations',
      simulationDate: new Date().toISOString().slice(0, 10),
      timeWindow: '08:00 - 12:00',
      status: 'Ready',
      selectedFlightIds: availableFlights.slice(0, 6).map((f) => f.id),
      selectedGateIds: availableGates.slice(0, 6).map((g) => g.id)
    })
    setFormErrors({})
    setFlightSearchInModal('')
    setGateSearchInModal('')
    setIsFormModalOpen(true)
  }

  // Open Edit Modal with Completed Protection
  const handleOpenEditModal = (sim) => {
    if (sim.status === 'Completed') {
      // Completed scenarios are locked read-only by default. Must reopen first.
      setSimToReopen(sim)
      return
    }

    setIsEditing(true)
    setCurrentEditId(sim.id)
    setFormData({
      name: sim.name,
      description: sim.description || '',
      category: sim.category || 'Normal Operations',
      simulationDate: sim.simulationDate || new Date().toISOString().slice(0, 10),
      timeWindow: sim.timeWindow || '08:00 - 12:00',
      status: sim.status || 'Draft',
      selectedFlightIds: sim.selectedFlightIds || sim.selected_flight_ids || [],
      selectedGateIds: sim.selectedGateIds || sim.selected_gate_ids || []
    })
    setFormErrors({})
    setFlightSearchInModal('')
    setGateSearchInModal('')
    setIsFormModalOpen(true)
  }

  // Toggle Flight Selection
  const toggleFlightSelection = (flightId) => {
    setFormData((prev) => {
      const exists = prev.selectedFlightIds.includes(flightId)
      return {
        ...prev,
        selectedFlightIds: exists
          ? prev.selectedFlightIds.filter((id) => id !== flightId)
          : [...new Set([...prev.selectedFlightIds, flightId])]
      }
    })
  }

  // Select All Flights
  const handleSelectAllFlights = () => {
    setFormData((prev) => ({
      ...prev,
      selectedFlightIds: [...new Set(availableFlights.map((f) => f.id))]
    }))
  }

  // Deselect All Flights
  const handleDeselectAllFlights = () => {
    setFormData((prev) => ({
      ...prev,
      selectedFlightIds: []
    }))
  }

  // Toggle Gate Selection
  const toggleGateSelection = (gateId) => {
    setFormData((prev) => {
      const exists = prev.selectedGateIds.includes(gateId)
      return {
        ...prev,
        selectedGateIds: exists
          ? prev.selectedGateIds.filter((id) => id !== gateId)
          : [...new Set([...prev.selectedGateIds, gateId])]
      }
    })
  }

  // Select All Gates
  const handleSelectAllGates = () => {
    setFormData((prev) => ({
      ...prev,
      selectedGateIds: [...new Set(availableGates.map((g) => g.id))]
    }))
  }

  // Deselect All Gates
  const handleDeselectAllGates = () => {
    setFormData((prev) => ({
      ...prev,
      selectedGateIds: []
    }))
  }

  // Comprehensive Form Validation
  const validateForm = () => {
    const errors = {}
    const trimmedName = formData.name.trim()

    if (!trimmedName) {
      errors.name = 'Simulation name is required.'
    } else if (trimmedName.length < 3) {
      errors.name = 'Simulation name must be at least 3 characters.'
    } else {
      const duplicate = simulations.some(
        (s) => s.name.toLowerCase() === trimmedName.toLowerCase() && (!isEditing || s.id !== currentEditId)
      )
      if (duplicate) {
        errors.name = 'A simulation with this name already exists.'
      }
    }

    // Date Validation
    if (!formData.simulationDate || !isValidDate(formData.simulationDate)) {
      errors.simulationDate = 'Please select a valid calendar date in YYYY-MM-DD format.'
    }

    // Time Window Validation
    if (!formData.timeWindow || !isValidTimeWindow(formData.timeWindow)) {
      errors.timeWindow = 'Please provide a valid time window formatted as "HH:MM - HH:MM".'
    }

    // Roster Validation
    if (formData.selectedFlightIds.length === 0) {
      errors.flights = 'At least one flight must be selected.'
    }

    if (formData.selectedGateIds.length === 0) {
      errors.gates = 'At least one gate must be selected.'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle Form Submit
  const handleSaveSimulation = async (targetStatus) => {
    if (!validateForm()) {
      toast.error('Validation Error', 'Please correct the highlighted fields.')
      return
    }

    const payload = {
      ...formData,
      status: targetStatus || formData.status
    }

    try {
      if (isEditing) {
        const updated = await simulationService.updateSimulation(currentEditId, payload)
        toast.success('Simulation Updated', `Successfully updated "${updated.name}".`)
      } else {
        const created = await simulationService.createSimulation(payload)
        toast.success('Simulation Created', `Successfully created "${created.name}".`)
      }
      setIsFormModalOpen(false)
      loadData()
    } catch (err) {
      toast.error('Operation Failed', err.message || 'Could not save simulation scenario.')
    }
  }

  // Handle Run Simulation Pipeline
  const handleRunSimulation = async (sim) => {
    if (runningMap[sim.id]) return
    setRunningMap((prev) => ({ ...prev, [sim.id]: true }))
    try {
      const result = await simulationService.runSimulation(sim.id, 100)
      toast.success(
        'Pipeline Run Complete',
        `N = ${result.pie_valid_allocations.toLocaleString()} valid allocations (${result.feasibility_percentage}% feasible) in ${result.duration_ms}ms.`
      )
      loadData()
    } catch (err) {
      toast.error('Simulation Failed', err.response?.data?.detail || err.message || 'Execution error.')
    } finally {
      setRunningMap((prev) => ({ ...prev, [sim.id]: false }))
    }
  }

  // Handle Duplicate with double-click debounce
  const handleDuplicate = async (sim) => {
    if (duplicatingMap[sim.id]) return
    setDuplicatingMap((prev) => ({ ...prev, [sim.id]: true }))
    try {
      const cloned = await simulationService.duplicateSimulation(sim.id)
      toast.success('Simulation Duplicated', `Created deep copy "${cloned.name}".`)
      loadData()
    } catch (err) {
      toast.error('Duplication Failed', err.message || 'Failed to duplicate simulation.')
    } finally {
      setDuplicatingMap((prev) => ({ ...prev, [sim.id]: false }))
    }
  }

  // Handle Open What-If Modal
  const handleOpenWhatIf = async (sim) => {
    setWhatIfSim(sim)
    setWhatIfDisabledGates([])
    setWhatIfResult(null)
    setIsWhatIfModalOpen(true)
    setIsEvaluatingWhatIf(true)
    try {
      const initial = await simulationService.evaluateWhatIf(sim.id, { disabledGateIds: [] })
      setWhatIfResult(initial)
    } catch (err) {
      toast.error('What-If Initialization Error', err.response?.data?.detail || err.message)
    } finally {
      setIsEvaluatingWhatIf(false)
    }
  }

  // Handle Toggle Gate in What-If
  const handleToggleWhatIfGate = async (gateId) => {
    if (!whatIfSim) return
    const nextDisabled = whatIfDisabledGates.includes(gateId)
      ? whatIfDisabledGates.filter((g) => g !== gateId)
      : [...whatIfDisabledGates, gateId]
    setWhatIfDisabledGates(nextDisabled)
    setIsEvaluatingWhatIf(true)
    try {
      const res = await simulationService.evaluateWhatIf(whatIfSim.id, { disabledGateIds: nextDisabled })
      setWhatIfResult(res)
    } catch (err) {
      toast.error('What-If Re-evaluation Error', err.response?.data?.detail || err.message)
    } finally {
      setIsEvaluatingWhatIf(false)
    }
  }

  // Handle Open History Modal
  const handleOpenHistory = async (sim) => {
    setHistorySim(sim)
    setIsHistoryModalOpen(true)
    setIsLoadingHistory(true)
    try {
      const runs = await simulationService.getSimulationRuns(sim.id)
      setHistoryRuns(runs)
    } catch (err) {
      toast.error('History Load Error', err.message || 'Could not load execution history.')
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // Handle Generate Traffic Scenario
  const handleGenerateTraffic = async () => {
    if (isGeneratingTraffic) return
    setIsGeneratingTraffic(true)
    try {
      const created = await simulationService.generateTrafficScenario(trafficForm)
      toast.success('Traffic Scenario Generated', `Created "${created.name}" (${created.category}).`)
      setIsTrafficModalOpen(false)
      loadData()
    } catch (err) {
      toast.error('Traffic Generation Failed', err.response?.data?.detail || err.message)
    } finally {
      setIsGeneratingTraffic(false)
    }
  }

  // Safe Status Toggle: Draft <-> Ready ONLY. Completed is protected!
  const handleToggleStatus = async (sim) => {
    if (sim.status === 'Completed') {
      toast.info('Completed Scenario Locked', 'This scenario is archived as Completed and cannot be toggled directly. Use "Reopen" to transition back to Draft.')
      return
    }

    const nextStatus = sim.status === 'Ready' ? 'Draft' : 'Ready'
    try {
      await simulationService.updateSimulation(sim.id, { status: nextStatus })
      toast.success('Status Updated', `Scenario "${sim.id}" marked as ${nextStatus}.`)
      loadData()
    } catch (err) {
      toast.error('Status Update Failed', err.message || 'Could not update status.')
    }
  }

  // Explicit Action: Mark as Completed
  const handleConfirmComplete = async () => {
    if (!simToComplete) return
    try {
      await simulationService.updateSimulation(simToComplete.id, { status: 'Completed' })
      toast.success('Scenario Completed', `Scenario "${simToComplete.name}" is now marked as Completed and locked.`)
      setSimToComplete(null)
      loadData()
    } catch (err) {
      toast.error('Completion Failed', err.message || 'Could not mark scenario as Completed.')
    }
  }

  // Explicit Action: Reopen Completed Scenario to Draft
  const handleConfirmReopen = async () => {
    if (!simToReopen) return
    try {
      await simulationService.updateSimulation(simToReopen.id, { status: 'Draft' })
      toast.success('Scenario Reopened', `Scenario "${simToReopen.name}" transitioned back to Draft status.`)
      const targetSim = simToReopen
      setSimToReopen(null)
      loadData()
      // Open edit modal directly for convenience
      handleOpenEditModal({ ...targetSim, status: 'Draft' })
    } catch (err) {
      toast.error('Reopen Failed', err.message || 'Could not reopen scenario.')
    }
  }

  // Handle Delete
  const handleDelete = async () => {
    if (!simulationToDelete) return
    try {
      await simulationService.deleteSimulation(simulationToDelete.id)
      toast.warning('Simulation Deleted', `Simulation "${simulationToDelete.name}" was removed.`)
      setIsDeleteModalOpen(false)
      setSimulationToDelete(null)
      loadData()
    } catch (err) {
      toast.error('Delete Failed', err.message || 'Failed to delete scenario.')
    }
  }

  // Filtered flights & gates inside modal
  const filteredModalFlights = useMemo(() => {
    if (!flightSearchInModal) return availableFlights
    const q = flightSearchInModal.toLowerCase()
    return availableFlights.filter(
      (f) =>
        f.id.toLowerCase().includes(q) ||
        (f.flightNumber && f.flightNumber.toLowerCase().includes(q)) ||
        (f.airline && f.airline.toLowerCase().includes(q)) ||
        (f.aircraftType && f.aircraftType.toLowerCase().includes(q)) ||
        (f.terminal && f.terminal.toLowerCase().includes(q))
    )
  }, [availableFlights, flightSearchInModal])

  const filteredModalGates = useMemo(() => {
    if (!gateSearchInModal) return availableGates
    const q = gateSearchInModal.toLowerCase()
    return availableGates.filter(
      (g) =>
        g.id.toLowerCase().includes(q) ||
        (g.gateNumber && g.gateNumber.toLowerCase().includes(q)) ||
        (g.terminal && g.terminal.toLowerCase().includes(q)) ||
        (g.gateType && g.gateType.toLowerCase().includes(q)) ||
        (g.supportedAircraft && String(g.supportedAircraft).toLowerCase().includes(q))
    )
  }, [availableGates, gateSearchInModal])

  return (
    <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto pb-12">
      {/* -------------------- HEADER -------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#222E42]">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="gw-page-heading">Simulation Management</h1>
            <Badge variant="outline" size="sm" className="font-mono">
              {simulations.length} Total
            </Badge>
            <Badge variant="outline" size="sm" className="font-mono">
              {readyCount} Ready
            </Badge>
            {draftCount > 0 && (
              <Badge variant="outline" size="sm" className="font-mono">
                {draftCount} Draft
              </Badge>
            )}
            {completedCount > 0 && (
              <Badge variant="outline" size="sm" className="font-mono" icon={Lock}>
                {completedCount} Completed
              </Badge>
            )}
          </div>
          <p className="text-sm text-gw-text-secondary mt-1">
            Create and manage airport gate allocation scenarios.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <Link to="/workspace">
            <Button size="md" variant="secondary" icon={Sparkles}>
              Allocation Workspace
            </Button>
          </Link>
          <Button
            variant="secondary"
            size="md"
            icon={Zap}
            onClick={() => setIsTrafficModalOpen(true)}
            className="border-sky-500/40 text-sky-400 hover:bg-sky-500/10"
          >
            Generate Traffic
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={Plus}
            onClick={handleOpenCreateModal}
          >
            Create New Simulation
          </Button>
        </div>
      </div>

      {/* -------------------- SEARCH & FILTER CONTROLS -------------------- */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-8">
            <Input
              icon={Search}
              placeholder="Search simulations by name, ID, category, or time window..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="sm:col-span-4 flex items-center gap-2">
            <div className="flex-1">
              <Dropdown
                options={STATUS_FILTER_OPTIONS}
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="Filter Status"
              />
            </div>
            {(searchTerm || statusFilter !== 'ALL' || selectedCategory !== 'All') && (
              <Button
                variant="ghost"
                size="md"
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('ALL')
                  setSelectedCategory('All')
                }}
                className="text-xs text-gw-text-secondary hover:text-gw-text"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* -------------------- CATEGORY FILTER CHIPS -------------------- */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {SCENARIO_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat
          const count = cat === 'All' ? simulations.length : simulations.filter((s) => s.category === cat).length
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-mono whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                isSelected
                  ? 'bg-[#1E2638] text-[#FFFFFF] font-bold border-[#38BDF8]'
                  : 'bg-[#121826] text-gw-text-secondary border-[#222E42] hover:text-gw-text hover:bg-[#1E2638]'
              }`}
            >
              {cat} <span className="text-[10px] opacity-70">({count})</span>
            </button>
          )
        })}
      </div>

      {/* -------------------- SIMULATION LIST / EMPTY STATES -------------------- */}
      {isLoading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono uppercase tracking-wider text-gw-text-secondary">
            Loading simulation registry...
          </span>
        </div>
      ) : simulations.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No airport simulations registered"
          description="Create your first airport gate allocation simulation scenario or restore standard benchmark scenarios."
          actionLabel="Create New Simulation"
          onAction={handleOpenCreateModal}
        />
      ) : filteredSimulations.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching simulations found"
          description={`No scenarios match your query "${searchTerm}" with status "${statusFilter}".`}
          actionLabel="Clear Filters"
          onAction={() => {
            setSearchTerm('')
            setStatusFilter('ALL')
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSimulations.map((sim) => {
            const flightIds = sim.selectedFlightIds || sim.selected_flight_ids || []
            const gateIds = sim.selectedGateIds || sim.selected_gate_ids || []
            const flightCount = flightIds.length
            const gateCount = gateIds.length
            const isBalanced = flightCount === gateCount && flightCount > 0
            const isReady = sim.status === 'Ready'
            const isCompleted = sim.status === 'Completed'

            return (
              <Card
                key={sim.id}
                className="p-5 flex flex-col justify-between transition-all duration-200 space-y-4 group border border-[#222E42] hover:border-[#334155] bg-[#121826]"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#222E42]">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-[#A3A3A3] block tracking-wider">
                          {sim.id}
                        </span>
                        {sim.category && (
                          <Badge variant="outline" size="sm" className="text-[10px] py-0 px-1.5 border-[#38BDF8]/40 text-[#38BDF8]">
                            {sim.category}
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-bold text-base text-gw-text mt-0.5 line-clamp-1 group-hover:text-[#FFFFFF] transition-colors">
                        {sim.name}
                      </h3>
                    </div>

                    {/* Status Badge with Click Protection */}
                    <Badge
                      variant="outline"
                      size="sm"
                      icon={isCompleted ? Lock : undefined}
                      className={isCompleted ? 'select-none font-semibold' : 'cursor-pointer select-none'}
                      onClick={() => handleToggleStatus(sim)}
                      title={
                        isCompleted
                          ? 'Completed scenario: Locked historical record. Click "Reopen" to transition back to Draft.'
                          : 'Click to toggle status between Ready and Draft'
                      }
                    >
                      {sim.status}
                    </Badge>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-gw-text-secondary mt-2.5 line-clamp-2 leading-relaxed min-h-[34px]">
                    {sim.description || 'No detailed operational description provided.'}
                  </p>

                  {/* Operational Details Grid */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#222E42] text-xs font-mono">
                    <div className="p-2 rounded-lg bg-[#121826] border border-[#222E42]">
                      <span className="text-[10px] text-gw-text-secondary uppercase block">Roster</span>
                      <span className="font-bold text-gw-text">
                        {flightCount} Flights × {gateCount} Gates
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-[#121826] border border-[#222E42]">
                      <span className="text-[10px] text-gw-text-secondary uppercase block">Dimension</span>
                      <span className={`font-bold ${isBalanced ? 'text-[#FFFFFF]' : 'text-[#A3A3A3]'}`}>
                        {isBalanced ? 'Balanced n×n' : 'Unbalanced'}
                      </span>
                    </div>
                  </div>

                  {/* Schedule Slot Info */}
                  <div className="mt-2 text-[11px] text-gw-text-secondary flex items-center justify-between font-mono">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#A3A3A3]" />
                      {sim.simulationDate || '2026-11-18'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#A3A3A3]" />
                      {sim.timeWindow || '08:00 - 12:00'}
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-[#222E42] flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Run Simulation Button */}
                      <Button
                        size="sm"
                        variant="primary"
                        icon={PlayCircle}
                        className="h-8 text-xs px-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold"
                        onClick={() => handleRunSimulation(sim)}
                        disabled={runningMap[sim.id]}
                        title="Execute 10-step mathematical simulation pipeline and record snapshot"
                      >
                        {runningMap[sim.id] ? 'Running...' : 'Run'}
                      </Button>

                      {/* What-If Studio Button */}
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={Sliders}
                        className="h-8 text-xs px-2 border-[#222E42] text-gw-text hover:bg-[#1E2638]"
                        onClick={() => handleOpenWhatIf(sim)}
                        title="Open non-destructive What-If Analysis Studio"
                      >
                        What-If
                      </Button>

                      {/* Run History Button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={History}
                        className="h-8 text-xs px-2 text-gw-text-secondary hover:text-gw-text hover:bg-[#1E2638]"
                        onClick={() => handleOpenHistory(sim)}
                        title="View immutable execution run history"
                      >
                        History
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Eye}
                        className="h-8 text-xs px-2 text-gw-text-secondary hover:text-gw-text"
                        onClick={() => setInspectingSim(sim)}
                        title="Inspect scenario details"
                      >
                        Inspect
                      </Button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Edit or Reopen Button */}
                      {isCompleted ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={RotateCcw}
                          className="h-8 text-xs px-2 text-[#FFFFFF] border-[#222E42] hover:bg-[#1E2638]"
                          onClick={() => setSimToReopen(sim)}
                          title="Reopen completed scenario to Draft"
                        >
                          Reopen
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Edit2}
                          className="h-8 text-xs px-2 text-gw-text-secondary hover:text-gw-text"
                          onClick={() => handleOpenEditModal(sim)}
                          title="Edit scenario parameters"
                        >
                          Edit
                        </Button>
                      )}

                      {/* Complete Button (Only for Ready Scenarios) */}
                      {isReady && (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={CheckCircle2}
                          className="h-8 text-xs px-2 text-[#FFFFFF] hover:bg-[#1E2638]"
                          onClick={() => setSimToComplete(sim)}
                          title="Mark scenario as Completed (Lock)"
                        >
                          Complete
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Copy}
                        className="h-8 text-xs px-2 text-gw-text-secondary hover:text-gw-text"
                        onClick={() => handleDuplicate(sim)}
                        disabled={duplicatingMap[sim.id]}
                        title="Duplicate scenario"
                      >
                        {duplicatingMap[sim.id] ? 'Cloning...' : 'Clone'}
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Download}
                        className="h-8 text-xs px-2 text-gw-text-secondary hover:text-[#FFFFFF]"
                        onClick={() => exportService.downloadScenarioPdf(sim.id)}
                        title="Export scenario PDF report"
                      >
                        PDF
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Trash2}
                        className="h-8 text-xs px-2 text-[#A3A3A3] hover:text-white hover:bg-[#1E2638]"
                        onClick={() => {
                          setSimulationToDelete(sim)
                          setIsDeleteModalOpen(true)
                        }}
                        title="Delete scenario"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* -------------------- CREATE / EDIT SIMULATION MODAL -------------------- */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={isEditing ? `Edit Simulation: ${currentEditId}` : 'Create New Simulation'}
        subtitle={isEditing ? 'Modify scenario metadata, flight roster, and gate selections.' : 'Configure flight and gate rosters for an allocation scenario.'}
        maxWidth="max-w-3xl"
        icon={Layers}
        footer={
          <div className="flex items-center justify-between w-full gap-3">
            <div className="text-xs font-mono text-gw-text-secondary">
              Selected: <strong className="text-[#FFFFFF]">{formData.selectedFlightIds.length}</strong> Flights ↔{' '}
              <strong className="text-[#FFFFFF]">{formData.selectedGateIds.length}</strong> Gates
            </div>
            <div className="flex items-center gap-2.5">
              <Button variant="ghost" size="md" onClick={() => setIsFormModalOpen(false)}>
                Cancel
              </Button>
              {!isEditing && (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => handleSaveSimulation('Draft')}
                >
                  Save as Draft
                </Button>
              )}
              <Button
                variant="primary"
                size="md"
                onClick={() => handleSaveSimulation('Ready')}
              >
                {isEditing ? 'Update Simulation' : 'Save & Mark Ready'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-5">
          {/* Simulation Name */}
          <div>
            <Input
              label="Simulation Name *"
              placeholder="e.g. Morning Peak Allocation (6x6 Benchmark)"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              error={formErrors.name}
            />
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-xs font-semibold text-gw-text-secondary uppercase tracking-wider mb-1.5">
              Scenario Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SCENARIO_CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`text-xs px-2.5 py-1 rounded-md border font-mono transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                    formData.category === cat
                      ? 'bg-sky-500 text-slate-950 font-bold border-sky-400'
                      : 'bg-[#121826] border-[#222E42] text-gw-text-secondary hover:text-gw-text hover:bg-[#1E2638]'
                  }`}
                  onClick={() => setFormData((prev) => ({ ...prev, category: cat }))}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gw-text-secondary uppercase tracking-wider mb-1.5">
              Operational Description
            </label>
            <textarea
              rows={2}
              className="w-full bg-[#121826] text-gw-text text-sm rounded-lg border border-[#222E42] p-3 focus:border-[#FFFFFF] outline-none transition-all placeholder:text-gw-text-secondary/50"
              placeholder="Operational objectives, expected constraints, weather assumptions..."
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>

          {/* Date, Time Window, Status */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-4">
              <Input
                label="Simulation Date (YYYY-MM-DD) *"
                type="date"
                value={formData.simulationDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, simulationDate: e.target.value }))}
                error={formErrors.simulationDate}
              />
            </div>

            <div className="sm:col-span-5">
              <label className="block text-xs font-semibold text-gw-text-secondary uppercase tracking-wider mb-1.5">
                Time Window (HH:MM - HH:MM) *
              </label>
              <Input
                placeholder="e.g. 08:00 - 12:00"
                value={formData.timeWindow}
                onChange={(e) => setFormData((prev) => ({ ...prev, timeWindow: e.target.value }))}
                error={formErrors.timeWindow}
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {TIME_WINDOW_PRESETS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                      formData.timeWindow === slot
                        ? 'bg-sky-500 text-slate-950 font-bold border-sky-400'
                        : 'bg-[#121826] border-[#222E42] text-gw-text-secondary hover:text-gw-text hover:bg-[#1E2638]'
                    }`}
                    onClick={() => setFormData((prev) => ({ ...prev, timeWindow: slot }))}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-gw-text-secondary uppercase tracking-wider mb-1.5">
                Target Status
              </label>
              <div className="flex rounded-lg overflow-hidden border border-[#222E42] bg-[#121826] p-0.5">
                <button
                  type="button"
                  className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                    formData.status === 'Ready'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                      : 'text-gw-text-secondary hover:text-gw-text hover:bg-[#1E2638]'
                  }`}
                  onClick={() => setFormData((prev) => ({ ...prev, status: 'Ready' }))}
                >
                  Ready
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                    formData.status === 'Draft'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                      : 'text-gw-text-secondary hover:text-gw-text hover:bg-[#1E2638]'
                  }`}
                  onClick={() => setFormData((prev) => ({ ...prev, status: 'Draft' }))}
                >
                  Draft
                </button>
              </div>
            </div>
          </div>

          {/* Flight Selection Section */}
          <div className="p-3.5 rounded-xl bg-[#121826] border border-[#222E42] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <Plane className="w-4 h-4 text-[#FFFFFF]" />
                <span className="text-xs font-bold uppercase tracking-wider text-gw-text">
                  Flight Selection ({formData.selectedFlightIds.length} of {availableFlights.length} selected)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Filter flights..."
                  value={flightSearchInModal}
                  onChange={(e) => setFlightSearchInModal(e.target.value)}
                  className="text-xs bg-[#0D121F] border border-[#222E42] rounded px-2 py-1 text-gw-text placeholder:text-gw-text-secondary/50 outline-none focus:border-[#FFFFFF]"
                />
                <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2" onClick={handleSelectAllFlights}>
                  Select All
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2" onClick={handleDeselectAllFlights}>
                  Clear
                </Button>
              </div>
            </div>

            {formErrors.flights && (
              <p className="text-xs text-white font-medium">{formErrors.flights}</p>
            )}

            <div className="max-h-48 overflow-y-auto divide-y divide-[#333333] border border-[#222E42] rounded-lg bg-[#0D121F]">
              {filteredModalFlights.map((flight) => {
                const isSelected = formData.selectedFlightIds.includes(flight.id)
                return (
                  <div
                    key={flight.id}
                    onClick={() => toggleFlightSelection(flight.id)}
                    className={`flex items-center justify-between p-2.5 text-xs cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#1E2638]' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#FFFFFF] shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-[#737373] shrink-0" />
                      )}
                      <div>
                        <span className="font-mono font-bold text-gw-text mr-2">
                          {flight.flightNumber || flight.flight_number || flight.id}
                        </span>
                        <span className="text-gw-text-secondary">{flight.airline}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[11px] text-gw-text-secondary">
                      <span>{flight.terminal}</span>
                      <span>•</span>
                      <span>{flight.aircraftType || flight.aircraft_type || 'Commercial'}</span>
                      <span>•</span>
                      <span className="text-[#FFFFFF]">
                        {flight.arrivalTime || flight.arrival_time} - {flight.departureTime || flight.departure_time}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Gate Selection Section */}
          <div className="p-3.5 rounded-xl bg-[#121826] border border-[#222E42] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <DoorOpen className="w-4 h-4 text-[#FFFFFF]" />
                <span className="text-xs font-bold uppercase tracking-wider text-gw-text">
                  Gate Selection ({formData.selectedGateIds.length} of {availableGates.length} selected)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Filter gates..."
                  value={gateSearchInModal}
                  onChange={(e) => setGateSearchInModal(e.target.value)}
                  className="text-xs bg-[#0D121F] border border-[#222E42] rounded px-2 py-1 text-gw-text placeholder:text-gw-text-secondary/50 outline-none focus:border-[#FFFFFF]"
                />
                <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2" onClick={handleSelectAllGates}>
                  Select All
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2" onClick={handleDeselectAllGates}>
                  Clear
                </Button>
              </div>
            </div>

            {formErrors.gates && (
              <p className="text-xs text-white font-medium">{formErrors.gates}</p>
            )}

            <div className="max-h-48 overflow-y-auto divide-y divide-[#333333] border border-[#222E42] rounded-lg bg-[#0D121F]">
              {filteredModalGates.map((gate) => {
                const isSelected = formData.selectedGateIds.includes(gate.id)
                return (
                  <div
                    key={gate.id}
                    onClick={() => toggleGateSelection(gate.id)}
                    className={`flex items-center justify-between p-2.5 text-xs cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#1E2638]' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#FFFFFF] shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-[#737373] shrink-0" />
                      )}
                      <div>
                        <span className="font-mono font-bold text-gw-text mr-2">
                          Gate {gate.gateNumber || gate.gate_number || gate.id}
                        </span>
                        <span className="text-gw-text-secondary">{gate.terminal}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[11px] text-gw-text-secondary">
                      <Badge variant="default" size="sm">
                        {gate.gateType || gate.gate_type || 'Universal'}
                      </Badge>
                      <span className="hidden sm:inline">
                        {Array.isArray(gate.supportedAircraft) ? gate.supportedAircraft.join(', ') : gate.supportedAircraft}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Dimension preview note */}
          <div className="p-3 rounded-lg bg-[#121826] border border-[#222E42] flex items-center justify-between text-xs">
            <span className="text-gw-text-secondary">
              Dimension Status:{' '}
              <strong className="text-gw-text">
                {formData.selectedFlightIds.length} Flights ↔ {formData.selectedGateIds.length} Gates
              </strong>
            </span>
            <Badge
              variant={formData.selectedFlightIds.length === formData.selectedGateIds.length ? 'success' : 'warning'}
              size="sm"
            >
              {formData.selectedFlightIds.length === formData.selectedGateIds.length
                ? 'Balanced n×n Matrix'
                : 'Unbalanced (Flexible)'}
            </Badge>
          </div>
        </div>
      </Modal>

      {/* -------------------- INSPECTION / VIEW MODAL -------------------- */}
      <Modal
        isOpen={!!inspectingSim}
        onClose={() => setInspectingSim(null)}
        title={inspectingSim ? inspectingSim.name : 'Simulation Details'}
        subtitle={inspectingSim ? `${inspectingSim.id} • ${inspectingSim.simulationDate || '2026-11-18'} • ${inspectingSim.timeWindow || '08:00 - 12:00'}` : ''}
        maxWidth="max-w-3xl"
        icon={Eye}
        footer={
          <div className="flex items-center justify-between w-full">
            <Button variant="ghost" size="md" onClick={() => setInspectingSim(null)}>
              Close
            </Button>
            <div className="flex items-center gap-2">
              {inspectingSim?.status === 'Completed' ? (
                <Button
                  variant="secondary"
                  size="md"
                  icon={RotateCcw}
                  onClick={() => {
                    const target = inspectingSim
                    setInspectingSim(null)
                    setSimToReopen(target)
                  }}
                >
                  Reopen Scenario
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="md"
                  icon={Edit2}
                  onClick={() => {
                    const target = inspectingSim
                    setInspectingSim(null)
                    handleOpenEditModal(target)
                  }}
                >
                  Edit Scenario
                </Button>
              )}
              <Link to="/workspace">
                <Button variant="primary" size="md" icon={Sparkles}>
                  Open in Workspace
                </Button>
              </Link>
            </div>
          </div>
        }
      >
        {inspectingSim && (
          <div className="space-y-5">
            {/* Metadata Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
              <div className="p-2.5 rounded-lg bg-[#121826] border border-[#222E42]">
                <span className="text-[10px] text-gw-text-secondary uppercase block">Status</span>
                <Badge
                  variant="outline"
                  size="sm"
                  icon={inspectingSim.status === 'Completed' ? Lock : undefined}
                  className="mt-0.5"
                >
                  {inspectingSim.status}
                </Badge>
              </div>
              <div className="p-2.5 rounded-lg bg-[#121826] border border-[#222E42]">
                <span className="text-[10px] text-gw-text-secondary uppercase block">Dimensions</span>
                <span className="font-bold text-gw-text mt-0.5 block">
                  {(inspectingSim.selectedFlightIds || inspectingSim.selected_flight_ids || []).length}F ↔{' '}
                  {(inspectingSim.selectedGateIds || inspectingSim.selected_gate_ids || []).length}G
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#121826] border border-[#222E42]">
                <span className="text-[10px] text-gw-text-secondary uppercase block">Schedule Slot</span>
                <span className="font-bold text-[#FFFFFF] mt-0.5 block">
                  {inspectingSim.timeWindow || '08:00 - 12:00'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#121826] border border-[#222E42]">
                <span className="text-[10px] text-gw-text-secondary uppercase block">Created</span>
                <span className="font-bold text-gw-text-secondary mt-0.5 block truncate">
                  {inspectingSim.createdAt ? new Date(inspectingSim.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>

            {/* Description */}
            {inspectingSim.description && (
              <div className="p-3.5 rounded-lg bg-[#121826] border border-[#222E42] text-xs text-gw-text-secondary leading-relaxed">
                <strong className="text-gw-text block mb-1">Operational Description:</strong>
                {inspectingSim.description}
              </div>
            )}

            {/* Flight Roster Table */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gw-text mb-2 flex items-center gap-1.5">
                <Plane className="w-4 h-4 text-[#FFFFFF]" />
                Selected Flight Roster (
                {(inspectingSim.selectedFlightIds || inspectingSim.selected_flight_ids || []).length})
              </h4>
              <div className="max-h-44 overflow-y-auto rounded-lg border border-[#222E42] divide-y divide-[#333333]">
                {(inspectingSim.selectedFlightIds || inspectingSim.selected_flight_ids || []).map((fid) => {
                  const flight = availableFlights.find((f) => f.id === fid)
                  return (
                    <div key={fid} className="p-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#FFFFFF]">{fid}</span>
                        <span className="text-gw-text font-semibold">
                          {flight?.flightNumber || flight?.flight_number || fid}
                        </span>
                        <span className="text-gw-text-secondary">({flight?.airline || 'Commercial Roster'})</span>
                      </div>
                      <div className="flex items-center gap-2 text-gw-text-secondary font-mono text-[11px]">
                        <span>{flight?.terminal || 'T1'}</span>
                        <span>•</span>
                        <span>{flight?.aircraftType || flight?.aircraft_type || 'Standard'}</span>
                        <span>•</span>
                        <span className="text-[#FFFFFF]">
                          {flight?.arrivalTime || flight?.arrival_time || '08:00'} - {flight?.departureTime || flight?.departure_time || '10:00'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Gate Roster Table */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gw-text mb-2 flex items-center gap-1.5">
                <DoorOpen className="w-4 h-4 text-[#FFFFFF]" />
                Selected Gate Roster (
                {(inspectingSim.selectedGateIds || inspectingSim.selected_gate_ids || []).length})
              </h4>
              <div className="max-h-44 overflow-y-auto rounded-lg border border-[#222E42] divide-y divide-[#333333]">
                {(inspectingSim.selectedGateIds || inspectingSim.selected_gate_ids || []).map((gid) => {
                  const gate = availableGates.find((g) => g.id === gid)
                  return (
                    <div key={gid} className="p-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#FFFFFF]">{gid}</span>
                        <span className="text-gw-text font-semibold">
                          Gate {gate?.gateNumber || gate?.gate_number || gid}
                        </span>
                        <span className="text-gw-text-secondary">({gate?.terminal || 'T1'})</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[11px] text-gw-text-secondary">
                        <Badge variant="default" size="sm">
                          {gate?.gateType || gate?.gate_type || 'Universal'}
                        </Badge>
                        <span>
                          Cap: {gate?.maxCapacity || gate?.max_capacity || 250} pax
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* -------------------- REOPEN COMPLETED SCENARIO MODAL -------------------- */}
      <Modal
        isOpen={!!simToReopen}
        onClose={() => setSimToReopen(null)}
        title="Reopen Completed Scenario"
        subtitle={`Scenario ${simToReopen?.id} is currently locked as Completed.`}
        maxWidth="max-w-md"
        icon={Unlock}
      >
        <div className="space-y-4">
          <p className="text-sm text-gw-text-secondary leading-relaxed">
            Are you sure you want to reopen completed scenario{' '}
            <strong className="text-gw-text">{simToReopen?.name}</strong>?
          </p>
          <div className="p-3 rounded-lg bg-[#121826] border border-[#222E42] text-xs text-gw-text leading-relaxed">
            Reopening transitions the scenario to <strong>Draft</strong> status, unlocking parameters, flight rosters, and gate allocations for modification.
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#222E42]">
            <Button variant="ghost" size="md" onClick={() => setSimToReopen(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" icon={RotateCcw} onClick={handleConfirmReopen}>
              Confirm Reopen
            </Button>
          </div>
        </div>
      </Modal>

      {/* -------------------- COMPLETE SCENARIO MODAL -------------------- */}
      <Modal
        isOpen={!!simToComplete}
        onClose={() => setSimToComplete(null)}
        title="Mark Scenario as Completed"
        subtitle="Archive scenario as a read-only historical record."
        maxWidth="max-w-md"
        icon={Lock}
      >
        <div className="space-y-4">
          <p className="text-sm text-gw-text-secondary leading-relaxed">
            Mark scenario <strong className="text-gw-text">{simToComplete?.name}</strong> ({simToComplete?.id}) as Completed?
          </p>
          <div className="p-3 rounded-lg bg-[#121826] border border-[#222E42] text-xs text-gw-text leading-relaxed">
            Completed scenarios represent finished allocations and are protected against accidental modifications. You can reopen the scenario at any time.
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#222E42]">
            <Button variant="ghost" size="md" onClick={() => setSimToComplete(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" icon={CheckCircle2} onClick={handleConfirmComplete}>
              Confirm Complete
            </Button>
          </div>
        </div>
      </Modal>

      {/* -------------------- DELETE CONFIRMATION MODAL -------------------- */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Scenario Deletion"
        maxWidth="max-w-md"
        icon={AlertTriangle}
      >
        <div className="space-y-4">
          <p className="text-sm text-gw-text-secondary leading-relaxed">
            Are you sure you want to permanently delete simulation scenario{' '}
            <strong className="text-gw-text">{simulationToDelete?.name}</strong> ({simulationToDelete?.id})?
          </p>
          <div className="p-3 rounded-lg bg-[#121826] border border-[#222E42] text-xs text-[#A3A3A3] leading-relaxed">
            Associated restriction matrices and saved allocations configured for this scenario will be purged.
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#222E42]">
            <Button variant="ghost" size="md" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="outline" size="md" icon={Trash2} onClick={handleDelete}>
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* -------------------- TRAFFIC SCENARIO GENERATOR MODAL -------------------- */}
      <Modal
        isOpen={isTrafficModalOpen}
        onClose={() => setIsTrafficModalOpen(false)}
        title="Generate Operational Traffic Scenario"
        subtitle="Create realistic simulated flight & gate scenarios with physical BLR airport constraints."
        maxWidth="max-w-2xl"
        icon={Zap}
        footer={
          <div className="flex items-center justify-between w-full gap-3">
            <span className="text-xs font-mono text-gw-text-secondary">
              Profile: <strong className="text-sky-400 capitalize">{trafficForm.profile}</strong> ({trafficForm.flightCount}F × {trafficForm.gateCount}G)
            </span>
            <div className="flex items-center gap-2.5">
              <Button variant="ghost" size="md" onClick={() => setIsTrafficModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                icon={Zap}
                onClick={handleGenerateTraffic}
                disabled={isGeneratingTraffic}
              >
                {isGeneratingTraffic ? 'Generating...' : 'Generate Scenario'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Operational Profile Select */}
          <div>
            <label className="block text-xs font-semibold text-gw-text-secondary uppercase tracking-wider mb-1.5">
              Operational Profile
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'low', name: 'Low-Traffic', desc: '4F × 6G, High flexibility', cat: 'Low-Traffic', f: 4, g: 6 },
                { id: 'normal', name: 'Normal Operations', desc: '6F × 6G, Standard BLR mix', cat: 'Normal Operations', f: 6, g: 6 },
                { id: 'peak', name: 'Peak-Hour Traffic', desc: '8F × 8G, High capacity', cat: 'Peak-Hour Traffic', f: 8, g: 8 },
                { id: 'maintenance', name: 'Gate Maintenance', desc: '6F × 6G, G3 & G4 restricted', cat: 'Gate Maintenance', f: 6, g: 6 },
                { id: 'terminal_restricted', name: 'Terminal Restricted', desc: '6F × 6G, T1/T2 separation', cat: 'Terminal Overload', f: 6, g: 6 },
                { id: 'emergency', name: 'Emergency Restriction', desc: '5F × 5G, Remote stands closed', cat: 'Emergency Restriction', f: 5, g: 5 }
              ].map((p) => {
                const isSelected = trafficForm.profile === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setTrafficForm((prev) => ({
                        ...prev,
                        profile: p.id,
                        category: p.cat,
                        flightCount: p.f,
                        gateCount: p.g,
                        name: `${p.name} Scenario (${int(Date.now() / 1000) % 1000})`
                      }))
                    }}
                    className={`p-2.5 rounded-lg border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                      isSelected
                        ? 'bg-[#1E2638] border-[#38BDF8] text-white shadow-xs'
                        : 'bg-[#121826] border-[#222E42] text-gw-text-secondary hover:text-white hover:bg-[#1E2638]'
                    }`}
                  >
                    <span className="font-bold text-xs block text-gw-text">{p.name}</span>
                    <span className="text-[10px] text-gw-text-secondary block mt-0.5">{p.desc}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Scenario Name */}
          <div>
            <Input
              label="Generated Scenario Name *"
              value={trafficForm.name}
              onChange={(e) => setTrafficForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Target Terminal */}
            <div>
              <label className="block text-xs font-semibold text-gw-text-secondary uppercase tracking-wider mb-1.5">
                Target Terminal
              </label>
              <div className="flex rounded-lg overflow-hidden border border-[#222E42] bg-[#121826] p-0.5">
                {['ALL', 'T1', 'T2'].map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setTrafficForm((prev) => ({ ...prev, targetTerminal: term }))}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      trafficForm.targetTerminal === term
                        ? 'bg-sky-500 text-slate-950 font-bold'
                        : 'text-gw-text-secondary hover:text-white hover:bg-[#1E2638]'
                    }`}
                  >
                    {term === 'ALL' ? 'Dual (T1 & T2)' : `Terminal ${term.slice(1)}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Restriction Density */}
            <div>
              <label className="block text-xs font-semibold text-gw-text-secondary uppercase tracking-wider mb-1.5">
                Restriction Density
              </label>
              <div className="flex rounded-lg overflow-hidden border border-[#222E42] bg-[#121826] p-0.5">
                {['sparse', 'moderate', 'dense'].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setTrafficForm((prev) => ({ ...prev, density: d }))}
                    className={`flex-1 py-1.5 text-xs font-semibold capitalize rounded-md transition-all ${
                      trafficForm.density === d
                        ? 'bg-sky-500 text-slate-950 font-bold'
                        : 'text-gw-text-secondary hover:text-white hover:bg-[#1E2638]'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* -------------------- WHAT-IF ANALYSIS STUDIO MODAL -------------------- */}
      <Modal
        isOpen={isWhatIfModalOpen}
        onClose={() => setIsWhatIfModalOpen(false)}
        title={whatIfSim ? `What-If Analysis Studio: ${whatIfSim.name}` : 'What-If Analysis Studio'}
        subtitle="Simulate hypothetical gate closures and constraints in complete isolation without mutating the persistent database state."
        maxWidth="max-w-3xl"
        icon={Sliders}
      >
        <div className="space-y-5">
          {/* Isolation Notice Banner */}
          <div className="p-3 rounded-lg bg-sky-950/40 border border-sky-500/30 text-xs text-sky-300 flex items-start gap-2">
            <Activity className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <strong>Non-Destructive Simulation Environment:</strong> Toggle gate availability below to test operational what-if hypotheses.
              Your baseline database scenario remains 100% untouched.
            </div>
          </div>

          {/* Gate Availability Grid */}
          <div>
            <label className="block text-xs font-semibold text-gw-text-secondary uppercase tracking-wider mb-2">
              Toggle Gate Availability (Click gate to mark as offline / unavailable)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              {(whatIfSim?.selectedGateIds || whatIfSim?.selected_gate_ids || []).map((gid) => {
                const isDisabled = whatIfDisabledGates.includes(gid)
                const gateObj = availableGates.find((g) => g.id === gid)
                return (
                  <button
                    key={gid}
                    type="button"
                    onClick={() => handleToggleWhatIfGate(gid)}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      isDisabled
                        ? 'bg-red-950/40 border-red-500/50 text-red-400 line-through'
                        : 'bg-[#121826] border-[#222E42] text-white hover:border-sky-400'
                    }`}
                  >
                    <span className="font-mono text-xs font-bold block">{gateObj?.gateNumber || gid}</span>
                    <span className="text-[10px] block opacity-75">{isDisabled ? 'OFFLINE' : 'AVAILABLE'}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Results Comparison Grid */}
          {isEvaluatingWhatIf ? (
            <div className="py-8 text-center text-xs font-mono text-gw-text-secondary animate-pulse">
              Computing combinatorial impact via Inclusion-Exclusion engine...
            </div>
          ) : whatIfResult ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                {/* Baseline Card */}
                <div className="p-3 rounded-xl bg-[#121826] border border-[#222E42]">
                  <span className="text-[10px] text-gw-text-secondary uppercase block mb-1">Baseline Config</span>
                  <div className="text-xl font-bold text-white">
                    {whatIfResult.baseline.valid_assignments.toLocaleString()}
                  </div>
                  <span className="text-xs text-gw-text-secondary block mt-0.5">
                    Valid Allocations ({whatIfResult.baseline.feasibility_percentage}%)
                  </span>
                  <span className="text-[10px] text-gw-text-secondary block mt-2">
                    Forbidden Cells: {whatIfResult.baseline.forbidden_cell_count}
                  </span>
                </div>

                {/* Hypothetical Card */}
                <div className="p-3 rounded-xl bg-[#121826] border border-[#222E42]">
                  <span className="text-[10px] text-gw-text-secondary uppercase block mb-1">Hypothetical Result</span>
                  <div className="text-xl font-bold text-white">
                    {whatIfResult.hypothetical.valid_assignments.toLocaleString()}
                  </div>
                  <span className="text-xs text-gw-text-secondary block mt-0.5">
                    Valid Allocations ({whatIfResult.hypothetical.feasibility_percentage}%)
                  </span>
                  <span className="text-[10px] text-gw-text-secondary block mt-2">
                    Forbidden Cells: {whatIfResult.hypothetical.forbidden_cell_count}
                  </span>
                </div>

                {/* Delta Card */}
                <div className="p-3 rounded-xl bg-[#121826] border border-[#222E42] flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-gw-text-secondary uppercase block mb-1">Impact Delta</span>
                    <div className="flex items-center gap-1.5">
                      {whatIfResult.delta_valid_allocations < 0 ? (
                        <TrendingDown className="w-5 h-5 text-red-400" />
                      ) : whatIfResult.delta_valid_allocations > 0 ? (
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                      ) : null}
                      <span className={`text-xl font-bold ${
                        whatIfResult.delta_valid_allocations < 0 ? 'text-red-400' : whatIfResult.delta_valid_allocations > 0 ? 'text-emerald-400' : 'text-white'
                      }`}>
                        {whatIfResult.delta_valid_allocations > 0 ? '+' : ''}{whatIfResult.delta_valid_allocations.toLocaleString()}
                      </span>
                    </div>
                    <span className="text-xs text-gw-text-secondary block mt-0.5">
                      ({whatIfResult.percentage_change > 0 ? '+' : ''}{whatIfResult.percentage_change}% shift)
                    </span>
                  </div>
                  <div className="mt-2">
                    <Badge
                      variant="outline"
                      size="sm"
                      className={`font-bold uppercase tracking-wider text-[10px] ${
                        whatIfResult.impact_level === 'CRITICAL'
                          ? 'border-red-500/50 text-red-400 bg-red-950/30'
                          : whatIfResult.impact_level === 'MODERATE'
                          ? 'border-amber-500/50 text-amber-400 bg-amber-950/30'
                          : whatIfResult.impact_level === 'ENHANCED'
                          ? 'border-emerald-500/50 text-emerald-400 bg-emerald-950/30'
                          : 'border-sky-500/50 text-sky-400 bg-sky-950/30'
                      }`}
                    >
                      {whatIfResult.impact_level} IMPACT
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Explanations List */}
              <div className="p-3 rounded-xl bg-[#121826] border border-[#222E42] text-xs space-y-1.5">
                <span className="font-bold text-gw-text block uppercase tracking-wider text-[10px]">
                  Combinatorial Analysis & Operational Diagnostics:
                </span>
                {whatIfResult.explanations.map((exp, idx) => (
                  <p key={idx} className="text-gw-text-secondary leading-relaxed flex items-start gap-1.5">
                    <span className="text-sky-400 shrink-0">■</span>
                    <span>{exp}</span>
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Modal>

      {/* -------------------- SIMULATION RUN HISTORY MODAL -------------------- */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={historySim ? `Execution History: ${historySim.name}` : 'Simulation Run History'}
        subtitle="Immutable point-in-time calculation snapshots recorded for this scenario."
        maxWidth="max-w-3xl"
        icon={History}
      >
        <div className="space-y-4">
          {isLoadingHistory ? (
            <div className="py-12 text-center text-xs font-mono text-gw-text-secondary animate-pulse">
              Retrieving execution snapshots from database...
            </div>
          ) : historyRuns.length === 0 ? (
            <div className="py-10 text-center text-xs text-gw-text-secondary font-mono">
              No historical execution runs recorded for this scenario yet. Click "Run" to record an execution snapshot.
            </div>
          ) : (
            <div className="divide-y divide-[#222E42] border border-[#222E42] rounded-xl overflow-hidden bg-[#121826]">
              {historyRuns.map((run) => (
                <div key={run.id} className="p-3.5 flex items-center justify-between gap-3 text-xs font-mono">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">Run #{run.run_number}</span>
                      <span className="text-gw-text-secondary">({run.id})</span>
                      <Badge variant="outline" size="sm" className="text-[10px] py-0 border-emerald-500/40 text-emerald-400">
                        {run.verification_status}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-gw-text-secondary block mt-1">
                      {new Date(run.created_at).toLocaleString()} • Execution Time: {run.duration_ms}ms
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold text-white block">
                      {run.pie_valid_allocations.toLocaleString()} Valid (N)
                    </span>
                    <span className="text-[11px] text-gw-text-secondary block">
                      {run.feasibility_percentage}% Feasible ({run.matrix_rows}F × {run.matrix_cols}G)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

export default ScenarioManagement
