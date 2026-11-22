import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  PlayCircle,
  Plus,
  Search,
  Copy,
  Edit2,
  Trash2,
  Eye,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Plane,
  DoorClosed,
  Clock,
  Layers,
  ArrowRight,
  Info,
  Calendar,
  Grid3X3,
  HelpCircle,
  X
} from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import Table from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import Dropdown from '../components/ui/Dropdown'
import Notification from '../components/ui/Notification'
import simulationService from '../lib/simulationService'
import flightService from '../lib/flightService'
import gateService from '../lib/gateService'
import AllocationResultsView from '../components/allocations/AllocationResultsView'
import SimulationClockBar from '../components/layout/SimulationClockBar'

const STATUS_FILTER_OPTIONS = [
  { label: 'All Statuses', value: 'ALL' },
  { label: 'Ready (Balanced)', value: 'Ready' },
  { label: 'Draft (Incomplete)', value: 'Draft' },
  { label: 'Completed', value: 'Completed' }
]

export const AllocationSimulator = () => {
  const [searchParams] = useSearchParams()

  // Navigation tabs
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = searchParams.get('tab')
    return tabParam === 'scenarios' ? 'scenarios' : 'simulator'
  })
  const [selectedSimulationId, setSelectedSimulationId] = useState(() => {
    return searchParams.get('sim') || ''
  })

  // Watch URL params for external navigation
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    const simParam = searchParams.get('sim')
    if (tabParam === 'scenarios' || tabParam === 'simulator') {
      setActiveTab(tabParam)
    }
    if (simParam) {
      setSelectedSimulationId(simParam)
    }
  }, [searchParams])

  // Registry data states
  const [simulations, setSimulations] = useState([])
  const [availableFlights, setAvailableFlights] = useState([])
  const [availableGates, setAvailableGates] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [backendError, setBackendError] = useState(null)

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Notification state
  const [notification, setNotification] = useState(null)

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  // Active target records
  const [editingSimulation, setEditingSimulation] = useState(null)
  const [viewingSimulation, setViewingSimulation] = useState(null)
  const [simulationToDelete, setSimulationToDelete] = useState(null)

  // Form input state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    selectedFlightIds: [],
    selectedGateIds: [],
    status: 'Ready'
  })
  const [formErrors, setFormErrors] = useState({})

  // Load all data on mount
  useEffect(() => {
    refreshAllData()
  }, [])

  const refreshAllData = async () => {
    try {
      setIsLoading(true)
      setBackendError(null)
      const [sims, flights, gates] = await Promise.all([
        simulationService.getSimulations(),
        flightService.getFlights(),
        gateService.getGates()
      ])
      setSimulations(sims)
      setAvailableFlights(flights)
      setAvailableGates(gates)
      if (sims.length > 0) {
        setSelectedSimulationId(prev => prev || sims[0].id)
      }
    } catch (e) {
      console.error('Failed to load simulation registry data:', e)
      setBackendError(e.message)
      setNotification({
        type: 'danger',
        title: 'Backend Error',
        message: e.message
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Filtered simulations
  const filteredSimulations = useMemo(() => {
    return simulations.filter(sim => {
      const matchSearch =
        sim.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sim.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        sim.id.toLowerCase().includes(searchTerm.toLowerCase())

      const matchStatus = statusFilter === 'ALL' || sim.status === statusFilter

      return matchSearch && matchStatus
    })
  }, [simulations, searchTerm, statusFilter])

  // Open Create Simulation Modal
  const handleOpenCreateModal = () => {
    setEditingSimulation(null)
    // Pre-select all available flights and gates by default if balanced
    const defaultFlightIds = availableFlights.slice(0, 6).map(f => f.id)
    const defaultGateIds = availableGates.slice(0, 6).map(g => g.id)

    setFormData({
      name: '',
      description: '',
      selectedFlightIds: defaultFlightIds,
      selectedGateIds: defaultGateIds,
      status: defaultFlightIds.length === defaultGateIds.length ? 'Ready' : 'Draft'
    })
    setFormErrors({})
    setIsFormModalOpen(true)
  }

  // Open Edit Simulation Modal
  const handleOpenEditModal = (sim) => {
    setEditingSimulation(sim)
    setFormData({
      name: sim.name,
      description: sim.description || '',
      selectedFlightIds: [...sim.selectedFlightIds],
      selectedGateIds: [...sim.selectedGateIds],
      status: sim.status
    })
    setFormErrors({})
    setIsFormModalOpen(true)
  }

  // Open Details Modal
  const handleOpenDetailModal = (sim) => {
    setViewingSimulation(sim)
    setIsDetailModalOpen(true)
  }

  // Open Delete Modal
  const handleOpenDeleteModal = (sim) => {
    setSimulationToDelete(sim)
    setIsDeleteModalOpen(true)
  }

  // Toggle flight selection in form
  const toggleFlightSelection = (flightId) => {
    setFormData(prev => {
      const exists = prev.selectedFlightIds.includes(flightId)
      const updated = exists
        ? prev.selectedFlightIds.filter(id => id !== flightId)
        : [...prev.selectedFlightIds, flightId]
      return { ...prev, selectedFlightIds: updated }
    })
  }

  // Toggle gate selection in form
  const toggleGateSelection = (gateId) => {
    setFormData(prev => {
      const exists = prev.selectedGateIds.includes(gateId)
      const updated = exists
        ? prev.selectedGateIds.filter(id => id !== gateId)
        : [...prev.selectedGateIds, gateId]
      return { ...prev, selectedGateIds: updated }
    })
  }

  // Select all or clear selection
  const selectAllFlights = () => setFormData(p => ({ ...p, selectedFlightIds: availableFlights.map(f => f.id) }))
  const clearAllFlights = () => setFormData(p => ({ ...p, selectedFlightIds: [] }))
  const selectAllGates = () => setFormData(p => ({ ...p, selectedGateIds: availableGates.map(g => g.id) }))
  const clearAllGates = () => setFormData(p => ({ ...p, selectedGateIds: [] }))

  // Validate form
  const validateForm = () => {
    const errors = {}
    if (!formData.name.trim()) {
      errors.name = 'Simulation scenario name is required'
    } else if (formData.name.trim().length < 3) {
      errors.name = 'Scenario name must be at least 3 characters'
    }

    if (!formData.selectedFlightIds || formData.selectedFlightIds.length === 0) {
      errors.flights = 'You must select at least one flight for this scenario'
    }

    if (!formData.selectedGateIds || formData.selectedGateIds.length === 0) {
      errors.gates = 'You must select at least one gate for this scenario'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Save Add / Edit
  const handleSaveSimulation = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      if (editingSimulation) {
        await simulationService.updateSimulation(editingSimulation.id, formData)
        setNotification({
          type: 'success',
          title: 'Scenario Updated',
          message: `Simulation "${formData.name}" successfully updated.`
        })
      } else {
        await simulationService.createSimulation(formData)
        setNotification({
          type: 'success',
          title: 'Scenario Created',
          message: `Simulation "${formData.name}" added to scenario registry.`
        })
      }
      setIsFormModalOpen(false)
      await refreshAllData()
    } catch (err) {
      setNotification({
        type: 'danger',
        title: 'Operation Failed',
        message: err.message
      })
      setFormErrors(prev => ({ ...prev, name: err.message }))
    }
  }

  // Duplicate scenario
  const handleDuplicateSimulation = async (sim) => {
    try {
      const copy = await simulationService.duplicateSimulation(sim.id)
      setNotification({
        type: 'info',
        title: 'Scenario Duplicated',
        message: `Created duplicate "${copy.name}".`
      })
      await refreshAllData()
    } catch (err) {
      setNotification({
        type: 'danger',
        title: 'Duplication Failed',
        message: err.message
      })
    }
  }

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!simulationToDelete) return
    try {
      await simulationService.deleteSimulation(simulationToDelete.id)
      setNotification({
        type: 'warning',
        title: 'Scenario Removed',
        message: `Simulation "${simulationToDelete.name}" was deleted.`
      })
      setIsDeleteModalOpen(false)
      setSimulationToDelete(null)
      await refreshAllData()
    } catch (err) {
      setNotification({
        type: 'danger',
        title: 'Delete Failed',
        message: err.message
      })
    }
  }

  // Refresh from backend database
  const handleResetDefaults = async () => {
    await refreshAllData()
    setNotification({
      type: 'info',
      title: 'Database Synchronized',
      message: 'Active scenarios refreshed from SQLite database.'
    })
  }

  // Helper: check missing references in a simulation
  const getReferenceHealth = (sim) => {
    const flightMap = new Set(availableFlights.map(f => f.id))
    const gateMap = new Set(availableGates.map(g => g.id))

    const missingFlights = sim.selectedFlightIds.filter(id => !flightMap.has(id))
    const missingGates = sim.selectedGateIds.filter(id => !gateMap.has(id))

    return {
      hasMissing: missingFlights.length > 0 || missingGates.length > 0,
      missingFlights,
      missingGates
    }
  }

  // Table columns definition
  const columns = [
    {
      header: 'Scenario ID',
      key: 'id',
      render: (row) => <span className="font-mono text-xs text-[#FFFFFF]">{row.id}</span>
    },
    {
      header: 'Simulation Name',
      key: 'name',
      render: (row) => {
        const refHealth = getReferenceHealth(row)
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-gw-text">{row.name}</span>
              {refHealth.hasMissing && (
                <span title={`Missing ${refHealth.missingFlights.length} flight(s) or ${refHealth.missingGates.length} gate(s)`}>
                  <AlertTriangle className="w-4 h-4 text-[#A3A3A3]" />
                </span>
              )}
            </div>
            {row.description && (
              <p className="text-xs text-gw-text-secondary line-clamp-1">{row.description}</p>
            )}
          </div>
        )
      }
    },
    {
      header: 'Dimensions (n × n)',
      key: 'dimension',
      render: (row) => {
        const fCount = row.selectedFlightIds.length
        const gCount = row.selectedGateIds.length
        const isBalanced = fCount === gCount
        return (
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="text-[#FFFFFF] font-bold">{fCount} Flights</span>
            <span className="text-gw-text-secondary">↔</span>
            <span className="text-[#A3A3A3] font-bold">{gCount} Gates</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-sans ml-1 ${
              isBalanced ? 'bg-[#1E2638] text-[#FFFFFF]' : 'bg-[#121826] text-[#737373]'
            }`}>
              {isBalanced ? `${fCount}×${fCount}` : 'Unbalanced'}
            </span>
          </div>
        )
      }
    },
    {
      header: 'Last Modified',
      key: 'updatedAt',
      render: (row) => (
        <span className="font-mono text-xs text-gw-text-secondary">
          {new Date(row.updatedAt).toLocaleDateString()}
        </span>
      )
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => {
        const variant =
          row.status === 'Ready'
            ? 'success'
            : row.status === 'Completed'
            ? 'default'
            : 'warning'
        return (
          <Badge variant={variant} size="sm" dot>
            {row.status}
          </Badge>
        )
      }
    },
    {
      header: 'Actions',
      key: 'actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => {
              setSelectedSimulationId(row.id)
              setActiveTab('simulator')
            }}
            className="p-1.5 rounded-lg text-gw-text-secondary hover:text-[#FFFFFF] hover:bg-[#1E2638] transition-colors cursor-pointer"
            title="Run Allocation Simulator"
          >
            <PlayCircle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleOpenDetailModal(row)}
            className="p-1.5 rounded-lg text-gw-text-secondary hover:text-[#FFFFFF] hover:bg-[#1E2638] transition-colors cursor-pointer"
            title="Inspect Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleDuplicateSimulation(row)}
            className="p-1.5 rounded-lg text-gw-text-secondary hover:text-[#FFFFFF] hover:bg-[#1E2638] transition-colors cursor-pointer"
            title="Duplicate Scenario"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleOpenEditModal(row)}
            className="p-1.5 rounded-lg text-gw-text-secondary hover:text-[#FFFFFF] hover:bg-[#1E2638] transition-colors cursor-pointer"
            title="Edit Scenario"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleOpenDeleteModal(row)}
            className="p-1.5 rounded-lg text-gw-text-secondary hover:text-[#FFFFFF] hover:bg-[#1E2638] transition-colors cursor-pointer"
            title="Delete Scenario"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* -------------------- 1. HEADER & TAB NAVIGATION -------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#222E42]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="gw-page-heading">Allocation Simulator</h1>
            <Badge variant="outline" size="sm" className="font-mono">
              Phase 18 UI
            </Badge>
          </div>
          <p className="text-sm text-gw-text-secondary">
            {activeTab === 'simulator'
              ? 'Generate, inspect, and independently audit valid flight-to-gate allocations using backtracking and discrete mathematics.'
              : 'Create, configure, and manage airport gate allocation scenarios for mathematical optimization.'}
          </p>
        </div>

        {activeTab === 'scenarios' && (
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="md"
              icon={RotateCcw}
              onClick={handleResetDefaults}
              title="Restore baseline scenarios"
            >
              Reset Sample Scenarios
            </Button>

            <Button
              size="md"
              icon={Plus}
              onClick={handleOpenCreateModal}
              className="shadow-none"
            >
              Create New Simulation
            </Button>
          </div>
        )}
      </div>

      {/* Mode Navigation Tabs & Simulation Clock */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222E42] pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
              activeTab === 'simulator'
                ? 'bg-sky-500 text-slate-950 font-bold shadow-xs'
                : 'text-gw-text-secondary hover:text-gw-text hover:bg-[#1E2638]'
            }`}
          >
            <PlayCircle className="w-4 h-4" />
            <span>Allocation Results</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('scenarios')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
              activeTab === 'scenarios'
                ? 'bg-sky-500 text-slate-950 font-bold shadow-xs'
                : 'text-gw-text-secondary hover:text-gw-text hover:bg-[#1E2638]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Scenario Management</span>
            <span className="font-mono text-xs opacity-70">({simulations.length})</span>
          </button>
        </div>

        <div className="hidden sm:block">
          <SimulationClockBar />
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

      {/* -------------------- 2. ACTIVE VIEW CONTAINER -------------------- */}
      {activeTab === 'simulator' ? (
        <AllocationResultsView
          simulations={simulations}
          selectedSimulationId={selectedSimulationId}
          onSelectSimulation={setSelectedSimulationId}
          availableFlights={availableFlights}
          availableGates={availableGates}
        />
      ) : (
        <div className="space-y-6">
          {/* SEARCH & FILTER CONTROLS */}
          <Card className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-8">
                <Input
                  icon={Search}
                  placeholder="Search by simulation name, description, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="sm:col-span-4">
                <Dropdown
                  options={STATUS_FILTER_OPTIONS}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  placeholder="Status Filter"
                />
              </div>
            </div>
          </Card>

          {/* SIMULATIONS TABLE */}
          <Table
            columns={columns}
            data={filteredSimulations}
            keyExtractor={(item) => item.id}
            emptyMessage={
              searchTerm || statusFilter !== 'ALL' ? (
                <div className="py-8 text-center space-y-2">
                  <p className="text-sm font-semibold text-gw-text">No matching simulations found</p>
                  <p className="text-xs text-gw-text-secondary">Try adjusting your search criteria or status filter.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('')
                      setStatusFilter('ALL')
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <div className="py-8 text-center space-y-2">
                  <p className="text-sm font-semibold text-gw-text">No simulation scenarios registered</p>
                  <p className="text-xs text-gw-text-secondary">Create a simulation scenario to define a flight-gate allocation window.</p>
                  <Button size="sm" icon={Plus} onClick={handleOpenCreateModal}>
                    Create First Simulation
                  </Button>
                </div>
              )
            }
          />

          {/* Architecture Notice */}
          <div className="p-3.5 rounded-xl bg-[#121826] border border-[#222E42] flex items-center justify-between text-xs text-gw-text-secondary">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[#FFFFFF] shrink-0" />
              <span>
                Scenarios reference registered flight and gate IDs. Select any scenario above and click 'Run Allocation Simulator' to generate conflict-free matchings.
              </span>
            </div>
            <span className="font-mono text-[11px] text-[#FFFFFF] hidden md:inline">
              Balanced Constraint: |Flights| = |Gates|
            </span>
          </div>
        </div>
      )}

      {/* -------------------- 4. CREATE / EDIT MODAL -------------------- */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingSimulation ? `Edit Simulation: ${editingSimulation.id}` : 'Create New Simulation Scenario'}
        subtitle="Define scenario metadata and select flights and gates participating in this allocation window."
        maxWidth="max-w-3xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-xs font-mono">
              <span className={formData.selectedFlightIds.length === formData.selectedGateIds.length ? 'text-white' : 'text-[#A3A3A3]'}>
                {formData.selectedFlightIds.length} Flights ↔ {formData.selectedGateIds.length} Gates
              </span>
              {formData.selectedFlightIds.length !== formData.selectedGateIds.length && (
                <span className="text-[#A3A3A3] ml-2 font-sans">(Unbalanced: Discrete math model expects n=n)</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => setIsFormModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveSimulation}>
                {editingSimulation ? 'Save Changes' : 'Create Scenario'}
              </Button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSaveSimulation} className="space-y-5">
          <Input
            label="Simulation Scenario Name *"
            placeholder="e.g. Morning Peak Allocation Window (6x6)"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={formErrors.name}
          />

          <Input
            label="Description (Optional)"
            placeholder="e.g. Testing wide-body aircraft docking limits during high-traffic bank."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          {/* Flights Selection Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-gw-text-secondary uppercase tracking-wider">
                Select Flights ({formData.selectedFlightIds.length} Selected) *
              </label>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={selectAllFlights}
                  className="text-[#FFFFFF] hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-gw-text-secondary">•</span>
                <button
                  type="button"
                  onClick={clearAllFlights}
                  className="text-gw-text-secondary hover:underline cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {formErrors.flights && (
              <p className="text-xs text-white">{formErrors.flights}</p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-44 overflow-y-auto p-2 bg-[#0D121F] rounded-xl border border-[#222E42]">
              {availableFlights.map(flight => {
                const isSelected = formData.selectedFlightIds.includes(flight.id)
                return (
                  <div
                    key={flight.id}
                    onClick={() => toggleFlightSelection(flight.id)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#FFFFFF] border-[#FFFFFF] text-[#090909] font-semibold'
                        : 'bg-[#121826] border-[#222E42] text-gw-text-secondary hover:border-[#334155]'
                    }`}
                  >
                    <div className="truncate">
                      <div className="font-mono text-gw-text">{flight.flightNumber}</div>
                      <div className="text-[10px] text-gw-text-secondary truncate">{flight.airline}</div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 shrink-0 text-[#090909] ml-1.5" />}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Gates Selection Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-gw-text-secondary uppercase tracking-wider">
                Select Gates ({formData.selectedGateIds.length} Selected) *
              </label>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={selectAllGates}
                  className="text-[#FFFFFF] hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-gw-text-secondary">•</span>
                <button
                  type="button"
                  onClick={clearAllGates}
                  className="text-gw-text-secondary hover:underline cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {formErrors.gates && (
              <p className="text-xs text-white">{formErrors.gates}</p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-44 overflow-y-auto p-2 bg-[#0D121F] rounded-xl border border-[#222E42]">
              {availableGates.map(gate => {
                const isSelected = formData.selectedGateIds.includes(gate.id)
                return (
                  <div
                    key={gate.id}
                    onClick={() => toggleGateSelection(gate.id)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#FFFFFF] border-[#FFFFFF] text-[#090909] font-semibold'
                        : 'bg-[#121826] border-[#222E42] text-gw-text-secondary hover:border-[#334155]'
                    }`}
                  >
                    <div className="truncate">
                      <div className="font-mono text-gw-text">{gate.gateNumber}</div>
                      <div className="text-[10px] text-gw-text-secondary truncate">{gate.terminal} • {gate.gateType}</div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 shrink-0 text-[#090909] ml-1.5" />}
                  </div>
                )
              })}
            </div>
          </div>
        </form>
      </Modal>

      {/* -------------------- 5. INSPECT DETAILS MODAL -------------------- */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={viewingSimulation?.name}
        subtitle={`Scenario ID: ${viewingSimulation?.id}`}
        maxWidth="max-w-2xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-gw-text-secondary font-mono">
              Dimension: {viewingSimulation?.selectedFlightIds.length} × {viewingSimulation?.selectedGateIds.length}
            </span>
            <Button onClick={() => setIsDetailModalOpen(false)}>
              Close
            </Button>
          </div>
        }
      >
        {viewingSimulation && (
          <div className="space-y-5">
            {/* Metadata Card */}
            <div className="bg-[#121826] p-4 rounded-xl border border-[#222E42] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gw-text-secondary">Scenario Status:</span>
                <Badge variant={viewingSimulation.status === 'Ready' ? 'success' : 'warning'} size="sm" dot>
                  {viewingSimulation.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gw-text-secondary">Created:</span>
                <span className="font-mono text-gw-text">{new Date(viewingSimulation.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gw-text-secondary">Last Modified:</span>
                <span className="font-mono text-gw-text">{new Date(viewingSimulation.updatedAt).toLocaleString()}</span>
              </div>
              {viewingSimulation.description && (
                <div className="pt-2 border-t border-[#222E42] text-gw-text leading-relaxed">
                  {viewingSimulation.description}
                </div>
              )}
            </div>

            {/* Selected Flights Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gw-text uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Plane className="w-4 h-4 text-[#FFFFFF]" />
                  <span>Configured Flights ({viewingSimulation.selectedFlightIds.length})</span>
                </span>
              </h4>
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 bg-[#0D121F] rounded-lg border border-[#222E42]">
                {viewingSimulation.selectedFlightIds.map(fId => {
                  const flight = availableFlights.find(f => f.id === fId)
                  return (
                    <span
                      key={fId}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border ${
                        flight
                          ? 'bg-[#1E2638] border-[#222E42] text-[#FFFFFF]'
                          : 'bg-[#121826] border-[#334155] text-[#A3A3A3]'
                      }`}
                    >
                      <span>{flight ? `${flight.flightNumber} (${flight.airline})` : `${fId} (Deleted)`}</span>
                    </span>
                  )
                })}
              </div>
            </div>

            {/* Selected Gates Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gw-text uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <DoorClosed className="w-4 h-4 text-[#FFFFFF]" />
                  <span>Configured Gates ({viewingSimulation.selectedGateIds.length})</span>
                </span>
              </h4>
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 bg-[#0D121F] rounded-lg border border-[#222E42]">
                {viewingSimulation.selectedGateIds.map(gId => {
                  const gate = availableGates.find(g => g.id === gId)
                  return (
                    <span
                      key={gId}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border ${
                        gate
                          ? 'bg-[#1E2638] border-[#222E42] text-[#FFFFFF]'
                          : 'bg-[#121826] border-[#334155] text-[#A3A3A3]'
                      }`}
                    >
                      <span>{gate ? `${gate.gateNumber} (${gate.terminal})` : `${gId} (Deleted)`}</span>
                    </span>
                  )
                })}
              </div>
            </div>

            {/* Placeholder for Next Phases (Restriction Configuration) */}
            <div className="p-3.5 rounded-xl bg-[#121826] border border-dashed border-[#222E42] text-xs text-gw-text-secondary flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Grid3X3 className="w-4 h-4 text-[#FFFFFF] shrink-0" />
                <span>Restriction Board will configure {viewingSimulation.selectedFlightIds.length}×{viewingSimulation.selectedGateIds.length} forbidden cells in Phase 9.</span>
              </div>
              <Badge variant="default" size="sm">Phase 9 Scheduled</Badge>
            </div>
          </div>
        )}
      </Modal>

      {/* -------------------- 6. DELETE CONFIRMATION MODAL -------------------- */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Scenario Deletion"
        subtitle="This action will remove the allocation simulation configuration."
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete}>
              Confirm Delete
            </Button>
          </>
        }
      >
        {simulationToDelete && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-[#0D121F] border border-[#222E42] text-xs text-white flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#A3A3A3]" />
              <div>
                Are you sure you want to delete scenario{' '}
                <strong className="font-mono text-gw-text">{simulationToDelete.name}</strong> ({simulationToDelete.id})?
              </div>
            </div>
            <p className="text-xs text-gw-text-secondary leading-relaxed">
              This will not delete the underlying flight or gate records, only the scenario definition.
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default AllocationSimulator
