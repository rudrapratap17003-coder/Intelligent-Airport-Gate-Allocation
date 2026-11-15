import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Layers,
  Plus,
  Search,
  Copy,
  Trash2,
  PlayCircle,
  Calculator,
  Download,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import Dropdown from '../components/ui/Dropdown'
import Notification from '../components/ui/Notification'
import simulationService from '../lib/simulationService'
import flightService from '../lib/flightService'
import gateService from '../lib/gateService'
import exportService from '../lib/exportService'

const STATUS_FILTER_OPTIONS = [
  { label: 'All Statuses', value: 'ALL' },
  { label: 'Balanced (n × n)', value: 'Ready' },
  { label: 'Incomplete / Draft', value: 'Draft' }
]

export const ScenarioManagement = () => {
  const [simulations, setSimulations] = useState([])
  const [availableFlights, setAvailableFlights] = useState([])
  const [availableGates, setAvailableGates] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [notification, setNotification] = useState(null)

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [simulationToDelete, setSimulationToDelete] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    selectedFlightIds: [],
    selectedGateIds: []
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [sims, flights, gates] = await Promise.all([
        simulationService.getSimulations(),
        flightService.getFlights(),
        gateService.getGates()
      ])
      setSimulations(sims)
      setAvailableFlights(flights)
      setAvailableGates(gates)
    } catch (err) {
      console.error('Failed to load scenarios:', err)
      setNotification({
        type: 'danger',
        title: 'Backend Error',
        message: err.message || 'Failed to fetch scenarios from backend.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Filtered scenarios
  const filteredSimulations = useMemo(() => {
    return simulations.filter((sim) => {
      const matchSearch =
        sim.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sim.description && sim.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        sim.id.toLowerCase().includes(searchTerm.toLowerCase())

      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'Ready' && sim.status === 'Ready') ||
        (statusFilter === 'Draft' && sim.status !== 'Ready')

      return matchSearch && matchStatus
    })
  }, [simulations, searchTerm, statusFilter])

  // Handle Create Scenario
  const handleCreateScenario = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    try {
      const created = await simulationService.createSimulation(formData)
      setNotification({
        type: 'success',
        title: 'Scenario Created',
        message: `Successfully created scenario "${created.name}".`
      })
      setIsCreateModalOpen(false)
      setFormData({ name: '', description: '', selectedFlightIds: [], selectedGateIds: [] })
      loadData()
    } catch (err) {
      setNotification({
        type: 'danger',
        title: 'Creation Failed',
        message: err.message || 'Failed to create scenario.'
      })
    }
  }

  // Handle Duplicate
  const handleDuplicate = async (sim) => {
    try {
      const cloned = await simulationService.duplicateSimulation(sim.id)
      setNotification({
        type: 'success',
        title: 'Scenario Duplicated',
        message: `Created duplicate "${cloned.name}".`
      })
      loadData()
    } catch (err) {
      setNotification({
        type: 'danger',
        title: 'Duplication Failed',
        message: err.message || 'Failed to duplicate scenario.'
      })
    }
  }

  // Handle Delete
  const handleDelete = async () => {
    if (!simulationToDelete) return
    try {
      await simulationService.deleteSimulation(simulationToDelete.id)
      setNotification({
        type: 'success',
        title: 'Scenario Deleted',
        message: `Scenario "${simulationToDelete.name}" was removed.`
      })
      setIsDeleteModalOpen(false)
      setSimulationToDelete(null)
      loadData()
    } catch (err) {
      setNotification({
        type: 'danger',
        title: 'Delete Failed',
        message: err.message || 'Failed to delete scenario.'
      })
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto">
      {/* -------------------- HEADER -------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#1e3a5f]/50">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="gw-page-heading">Scenario Management</h1>
            <Badge variant="cyan" size="sm" className="font-mono">
              {simulations.length} Registered
            </Badge>
          </div>
          <p className="text-sm text-gw-text-secondary mt-1">
            Authoritative scenario window catalog: configure, duplicate, balance, and maintain operational allocation models.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <Link to="/workspace">
            <Button size="md" icon={Sparkles} className="shadow-lg shadow-gw-cyan/10">
              Guided Workspace
            </Button>
          </Link>
          <Button
            variant="secondary"
            size="md"
            icon={Plus}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create Blank Scenario
          </Button>
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

      {/* -------------------- FILTER CONTROLS -------------------- */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-8">
            <Input
              icon={Search}
              placeholder="Search scenarios by name, ID, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="sm:col-span-4">
            <Dropdown
              options={STATUS_FILTER_OPTIONS}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="Filter Status"
            />
          </div>
        </div>
      </Card>

      {/* -------------------- SCENARIOS LIST -------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSimulations.map((sim) => {
          const isBalanced = sim.status === 'Ready'
          const flightCount = sim.selected_flight_ids?.length || 0
          const gateCount = sim.selected_gate_ids?.length || 0

          return (
            <Card
              key={sim.id}
              className="p-5 flex flex-col justify-between hover:border-gw-cyan/40 transition-all space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#1e3a5f]/40">
                  <div>
                    <span className="font-mono text-xs font-bold text-gw-cyan block">{sim.id}</span>
                    <h3 className="font-bold text-sm text-gw-text mt-0.5 line-clamp-1">{sim.name}</h3>
                  </div>
                  <Badge variant={isBalanced ? 'success' : 'warning'} size="sm">
                    {isBalanced ? 'Balanced n×n' : 'Incomplete'}
                  </Badge>
                </div>

                {sim.description && (
                  <p className="text-xs text-gw-text-secondary mt-2 line-clamp-2 leading-relaxed">
                    {sim.description}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#1e3a5f]/40 text-xs font-mono">
                  <div className="p-2 rounded-lg bg-gw-bg-secondary/60 border border-[#1e3a5f]/40">
                    <span className="text-[10px] text-gw-text-secondary uppercase block">Dimensions</span>
                    <span className="font-bold text-gw-text">{flightCount}F ↔ {gateCount}G</span>
                  </div>
                  <div className="p-2 rounded-lg bg-gw-bg-secondary/60 border border-[#1e3a5f]/40">
                    <span className="text-[10px] text-gw-text-secondary uppercase block">Matrix</span>
                    <span className="font-bold text-gw-warning">
                      {sim.restriction_matrix ? `${flightCount}×${gateCount}` : 'Not Init'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-2 border-t border-[#1e3a5f]/40 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Link to={`/simulator?sim=${sim.id}`}>
                    <Button size="sm" variant="primary" icon={PlayCircle} className="h-8 text-xs">
                      Simulate
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Copy}
                    className="h-8 text-xs text-gw-text-secondary hover:text-gw-text"
                    onClick={() => handleDuplicate(sim)}
                    title="Duplicate Scenario"
                  >
                    Clone
                  </Button>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Download}
                    className="h-8 text-xs text-gw-text-secondary hover:text-gw-cyan"
                    onClick={() => exportService.downloadScenarioPdf(sim.id)}
                    title="Download Scenario PDF"
                  >
                    PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Trash2}
                    className="h-8 text-xs text-gw-error hover:bg-gw-error/10"
                    onClick={() => {
                      setSimulationToDelete(sim)
                      setIsDeleteModalOpen(true)
                    }}
                    title="Delete Scenario"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Scenario Deletion"
      >
        <div className="space-y-4">
          <p className="text-sm text-gw-text-secondary leading-relaxed">
            Are you sure you want to delete scenario <strong className="text-gw-text">{simulationToDelete?.name}</strong>?
            Associated restriction matrices and saved allocations will be permanently removed.
          </p>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1e3a5f]/50">
            <Button variant="ghost" size="md" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="md" icon={Trash2} onClick={handleDelete}>
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default ScenarioManagement
