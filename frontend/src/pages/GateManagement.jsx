import React, { useState, useEffect, useMemo } from 'react'
import {
  DoorClosed,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Building2,
  Plane,
  ShieldCheck,
  Info,
  Wrench,
  CheckCircle,
  Download
} from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import Table from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import Dropdown from '../components/ui/Dropdown'
import Notification from '../components/ui/Notification'
import gateService from '../lib/gateService'
import exportService from '../lib/exportService'

const GATE_TYPES = [
  { label: 'Domestic', value: 'Domestic' },
  { label: 'International', value: 'International' },
  { label: 'Universal', value: 'Universal' }
]

const AIRCRAFT_CATEGORIES = [
  { label: 'All Categories (Narrow & Wide)', value: 'All Categories (Narrow & Wide)' },
  { label: 'Narrow-Body Only', value: 'Narrow-Body Only' },
  { label: 'Wide-Body Only', value: 'Wide-Body Only' },
  { label: 'Regional Jets Only', value: 'Regional Jets Only' }
]

const TERMINAL_OPTIONS = [
  { label: 'Terminal 1 (T1)', value: 'T1' },
  { label: 'Terminal 2 (T2)', value: 'T2' },
  { label: 'Terminal 3 (T3)', value: 'T3' }
]

const STATUS_OPTIONS = [
  { label: 'Available', value: 'Available' },
  { label: 'Occupied', value: 'Occupied' },
  { label: 'Maintenance', value: 'Maintenance' }
]

export const GateManagement = () => {
  const [gates, setGates] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [terminalFilter, setTerminalFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [isLoading, setIsLoading] = useState(false)
  const [backendError, setBackendError] = useState(null)

  // Notification state
  const [notification, setNotification] = useState(null)

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingGate, setEditingGate] = useState(null)
  const [gateToDelete, setGateToDelete] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    gateNumber: '',
    terminal: 'T1',
    gateType: 'Domestic',
    supportedAircraft: 'Narrow-Body Only',
    maxCapacity: 230,
    status: 'Available'
  })
  const [formErrors, setFormErrors] = useState({})

  // Load gates on mount
  useEffect(() => {
    loadGates()
  }, [])

  const loadGates = async () => {
    try {
      setIsLoading(true)
      setBackendError(null)
      const data = await gateService.getGates()
      setGates(data)
    } catch (e) {
      console.error('Failed to load gates:', e)
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

  // Filtered gates
  const filteredGates = useMemo(() => {
    return gates.filter(g => {
      const matchSearch =
        g.gateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.terminal.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.supportedAircraft.toLowerCase().includes(searchTerm.toLowerCase())

      const matchType = typeFilter === 'ALL' || g.gateType === typeFilter
      const matchTerminal = terminalFilter === 'ALL' || g.terminal === terminalFilter
      const matchStatus = statusFilter === 'ALL' || g.status === statusFilter

      return matchSearch && matchType && matchTerminal && matchStatus
    })
  }, [gates, searchTerm, typeFilter, terminalFilter, statusFilter])

  // Open modal for adding
  const handleOpenAddModal = () => {
    setEditingGate(null)
    setFormData({
      gateNumber: '',
      terminal: 'T1',
      gateType: 'Domestic',
      supportedAircraft: 'Narrow-Body Only',
      maxCapacity: 230,
      status: 'Available'
    })
    setFormErrors({})
    setIsFormModalOpen(true)
  }

  // Open modal for editing
  const handleOpenEditModal = (gate) => {
    setEditingGate(gate)
    setFormData({
      gateNumber: gate.gateNumber,
      terminal: gate.terminal,
      gateType: gate.gateType,
      supportedAircraft: gate.supportedAircraft,
      maxCapacity: gate.maxCapacity,
      status: gate.status
    })
    setFormErrors({})
    setIsFormModalOpen(true)
  }

  // Open delete confirm
  const handleOpenDeleteModal = (gate) => {
    setGateToDelete(gate)
    setIsDeleteModalOpen(true)
  }

  // Form validation
  const validateForm = () => {
    const errors = {}
    if (!formData.gateNumber.trim()) {
      errors.gateNumber = 'Gate number is required (e.g. G1, A01)'
    } else if (!/^[A-Z0-9]{1,6}$/i.test(formData.gateNumber.trim())) {
      errors.gateNumber = 'Gate number must be 1-6 alphanumeric characters'
    }

    const cap = Number(formData.maxCapacity)
    if (!cap || cap <= 0 || cap > 900) {
      errors.maxCapacity = 'Capacity must be a positive integer between 1 and 900'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Submit Add / Edit
  const handleSaveGate = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      if (editingGate) {
        await gateService.updateGate(editingGate.id, formData)
        setNotification({
          type: 'success',
          title: 'Gate Updated',
          message: `Gate ${formData.gateNumber.toUpperCase()} properties updated.`
        })
      } else {
        await gateService.addGate(formData)
        setNotification({
          type: 'success',
          title: 'Gate Created',
          message: `Gate ${formData.gateNumber.toUpperCase()} added to airport registry.`
        })
      }
      setIsFormModalOpen(false)
      await loadGates()
    } catch (err) {
      setNotification({
        type: 'danger',
        title: 'Operation Failed',
        message: err.message
      })
      setFormErrors(prev => ({ ...prev, gateNumber: err.message }))
    }
  }

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!gateToDelete) return
    try {
      await gateService.deleteGate(gateToDelete.id)
      setNotification({
        type: 'warning',
        title: 'Gate Removed',
        message: `Gate ${gateToDelete.gateNumber} was deleted from airport registry.`
      })
      setIsDeleteModalOpen(false)
      setGateToDelete(null)
      await loadGates()
    } catch (err) {
      setNotification({
        type: 'danger',
        title: 'Delete Failed',
        message: err.message || 'Cannot delete gate assigned to active simulations.'
      })
      setIsDeleteModalOpen(false)
      setGateToDelete(null)
    }
  }

  // Refresh from backend database
  const handleResetDefaults = async () => {
    await loadGates()
    setNotification({
      type: 'info',
      title: 'Database Synchronized',
      message: 'Active gate inventory refreshed from SQLite database.'
    })
  }

  // Table columns definition
  const columns = [
    {
      header: 'Gate ID',
      key: 'id',
      render: (row) => <span className="font-mono text-xs text-gw-cyan">{row.id}</span>
    },
    {
      header: 'Gate No.',
      key: 'gateNumber',
      render: (row) => (
        <div className="flex items-center gap-2">
          <DoorClosed className="w-4 h-4 text-gw-cyan" />
          <span className="font-bold text-sm font-mono text-gw-text">{row.gateNumber}</span>
        </div>
      )
    },
    {
      header: 'Terminal',
      key: 'terminal',
      render: (row) => (
        <span className="font-mono text-xs text-gw-text px-2 py-0.5 rounded bg-gw-bg-secondary border border-[#1e3a5f]">
          {row.terminal}
        </span>
      )
    },
    {
      header: 'Gate Type',
      key: 'gateType',
      render: (row) => {
        const variant =
          row.gateType === 'International'
            ? 'cyan'
            : row.gateType === 'Universal'
            ? 'blue'
            : 'default'
        return (
          <Badge variant={variant} size="sm">
            {row.gateType}
          </Badge>
        )
      }
    },
    {
      header: 'Supported Aircraft',
      key: 'supportedAircraft',
      render: (row) => (
        <span className="text-xs text-gw-text-secondary">
          {row.supportedAircraft}
        </span>
      )
    },
    {
      header: 'Max Capacity',
      key: 'maxCapacity',
      render: (row) => (
        <span className="font-mono text-xs text-gw-text-secondary">
          {row.maxCapacity} pax
        </span>
      )
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => {
        const variant =
          row.status === 'Available'
            ? 'success'
            : row.status === 'Occupied'
            ? 'warning'
            : 'error'
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
            onClick={() => handleOpenEditModal(row)}
            className="p-1.5 rounded-lg text-gw-text-secondary hover:text-gw-cyan hover:bg-gw-cyan/10 transition-colors cursor-pointer"
            title="Edit Gate"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleOpenDeleteModal(row)}
            className="p-1.5 rounded-lg text-gw-text-secondary hover:text-gw-error hover:bg-gw-error/10 transition-colors cursor-pointer"
            title="Delete Gate"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* -------------------- 1. HEADER -------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#1e3a5f]/50">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="gw-page-heading">Gate Management</h1>
            <Badge variant="cyan" size="sm" className="font-mono">
              {gates.length} Registered
            </Badge>
          </div>
          <p className="text-sm text-gw-text-secondary">
            Manage airport gates and their allocation properties.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <Button
            variant="outline"
            size="md"
            icon={Download}
            onClick={() => exportService.downloadGatesCsv()}
            title="Export all gates to CSV"
          >
            Export CSV
          </Button>

          <Button
            variant="secondary"
            size="md"
            icon={RotateCcw}
            onClick={handleResetDefaults}
            title="Reset to benchmark 6 gates (G1 through G6)"
          >
            Reset Sample Gates
          </Button>

          <Button
            size="md"
            icon={Plus}
            onClick={handleOpenAddModal}
            className="shadow-lg shadow-gw-cyan/10"
          >
            Add New Gate
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

      {/* -------------------- 2. SEARCH & MULTI-FILTER CONTROLS -------------------- */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="sm:col-span-5">
            <Input
              icon={Search}
              placeholder="Search by gate number, terminal, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Terminal Filter */}
          <div className="sm:col-span-2">
            <Dropdown
              options={[
                { label: 'All Terminals', value: 'ALL' },
                ...TERMINAL_OPTIONS
              ]}
              value={terminalFilter}
              onChange={setTerminalFilter}
              placeholder="Terminal"
            />
          </div>

          {/* Gate Type Filter */}
          <div className="sm:col-span-2">
            <Dropdown
              options={[
                { label: 'All Types', value: 'ALL' },
                ...GATE_TYPES
              ]}
              value={typeFilter}
              onChange={setTypeFilter}
              placeholder="Gate Type"
            />
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-3">
            <Dropdown
              options={[
                { label: 'All Statuses', value: 'ALL' },
                ...STATUS_OPTIONS
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="Gate Status"
            />
          </div>
        </div>
      </Card>

      {/* -------------------- 3. GATES TABLE -------------------- */}
      <Table
        columns={columns}
        data={filteredGates}
        keyExtractor={(item) => item.id}
        emptyMessage={
          searchTerm || typeFilter !== 'ALL' || terminalFilter !== 'ALL' || statusFilter !== 'ALL' ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-sm font-semibold text-gw-text">No matching gates found</p>
              <p className="text-xs text-gw-text-secondary">Try adjusting your search criteria or active filters.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('')
                  setTypeFilter('ALL')
                  setTerminalFilter('ALL')
                  setStatusFilter('ALL')
                }}
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="py-8 text-center space-y-2">
              <p className="text-sm font-semibold text-gw-text">No airport gates registered</p>
              <p className="text-xs text-gw-text-secondary">Click "Add New Gate" to register terminal docking slots.</p>
              <Button size="sm" icon={Plus} onClick={handleOpenAddModal}>
                Add First Gate
              </Button>
            </div>
          )
        }
      />

      {/* Architecture Notice */}
      <div className="p-3.5 rounded-xl bg-gw-bg-secondary/40 border border-[#1e3a5f]/50 flex items-center justify-between text-xs text-gw-text-secondary">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-gw-cyan shrink-0" />
          <span>
            Airport gates are stored locally (<code className="font-mono text-gw-cyan">localStorage: gatewise_gates_data</code>) ready for multi-gate simulation scenarios.
          </span>
        </div>
        <span className="font-mono text-[11px] text-gw-text-secondary hidden md:inline">
          Registered: n={gates.length}
        </span>
      </div>

      {/* -------------------- 4. ADD / EDIT MODAL -------------------- */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingGate ? `Edit Gate: ${editingGate.gateNumber}` : 'Add New Airport Gate'}
        subtitle={
          editingGate
            ? `Update gate allocation parameters for ID ${editingGate.id}`
            : 'Configure physical gate slot properties for airport operations.'
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsFormModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveGate}>
              {editingGate ? 'Save Changes' : 'Create Gate'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveGate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Gate Number *"
              placeholder="e.g. G1, A01, B02"
              value={formData.gateNumber}
              onChange={(e) => setFormData({ ...formData, gateNumber: e.target.value.toUpperCase() })}
              error={formErrors.gateNumber}
            />

            <div>
              <label className="block text-xs font-medium text-gw-text-secondary uppercase tracking-wider mb-1.5">
                Terminal Location *
              </label>
              <Dropdown
                options={TERMINAL_OPTIONS}
                value={formData.terminal}
                onChange={(val) => setFormData({ ...formData, terminal: val })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gw-text-secondary uppercase tracking-wider mb-1.5">
                Gate Operational Type *
              </label>
              <Dropdown
                options={GATE_TYPES}
                value={formData.gateType}
                onChange={(val) => setFormData({ ...formData, gateType: val })}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gw-text-secondary uppercase tracking-wider mb-1.5">
                Current Gate Status
              </label>
              <Dropdown
                options={STATUS_OPTIONS}
                value={formData.status}
                onChange={(val) => setFormData({ ...formData, status: val })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gw-text-secondary uppercase tracking-wider mb-1.5">
                Supported Aircraft Categories *
              </label>
              <Dropdown
                options={AIRCRAFT_CATEGORIES}
                value={formData.supportedAircraft}
                onChange={(val) => setFormData({ ...formData, supportedAircraft: val })}
              />
            </div>

            <Input
              label="Max Aircraft Capacity (Pax) *"
              type="number"
              placeholder="e.g. 450"
              value={formData.maxCapacity}
              onChange={(e) => setFormData({ ...formData, maxCapacity: e.target.value })}
              error={formErrors.maxCapacity}
            />
          </div>
        </form>
      </Modal>

      {/* -------------------- 5. DELETE CONFIRMATION MODAL -------------------- */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Gate Deletion"
        subtitle="This action will remove the gate slot from airport capacity."
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
        {gateToDelete && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-gw-error/10 border border-gw-error/30 text-xs text-gw-error flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                Are you sure you want to remove gate{' '}
                <strong className="font-mono text-gw-text">{gateToDelete.gateNumber}</strong> ({gateToDelete.terminal} - {gateToDelete.gateType})?
              </div>
            </div>
            <p className="text-xs text-gw-text-secondary leading-relaxed">
              Deleting this gate will affect the gate count when constructing n × n allocation scenarios.
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default GateManagement
