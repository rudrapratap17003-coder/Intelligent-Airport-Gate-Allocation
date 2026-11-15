import React, { useState, useEffect, useMemo } from 'react'
import {
  Plane,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  X,
  Users,
  Clock,
  Building2,
  Info,
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
import flightService from '../lib/flightService'
import exportService from '../lib/exportService'

const AIRCRAFT_TYPES = [
  { label: 'Narrow-Body (A320)', value: 'Narrow-Body (A320)' },
  { label: 'Narrow-Body (A321)', value: 'Narrow-Body (A321)' },
  { label: 'Narrow-Body (B737)', value: 'Narrow-Body (B737)' },
  { label: 'Wide-Body (B777)', value: 'Wide-Body (B777)' },
  { label: 'Wide-Body (A350)', value: 'Wide-Body (A350)' },
  { label: 'Wide-Body (B787)', value: 'Wide-Body (B787)' },
  { label: 'Regional (ATR-72)', value: 'Regional (ATR-72)' }
]

const STATUS_OPTIONS = [
  { label: 'Scheduled', value: 'Scheduled' },
  { label: 'Boarding', value: 'Boarding' },
  { label: 'Delayed', value: 'Delayed' },
  { label: 'Arrived', value: 'Arrived' }
]

const TERMINAL_OPTIONS = [
  { label: 'Terminal 1 (T1)', value: 'T1' },
  { label: 'Terminal 2 (T2)', value: 'T2' },
  { label: 'Terminal 3 (T3)', value: 'T3' }
]

export const FlightManagement = () => {
  const [flights, setFlights] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [terminalFilter, setTerminalFilter] = useState('ALL')
  const [isLoading, setIsLoading] = useState(false)
  const [backendError, setBackendError] = useState(null)

  // Notification state
  const [notification, setNotification] = useState(null)

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingFlight, setEditingFlight] = useState(null)
  const [flightToDelete, setFlightToDelete] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    flightNumber: '',
    airline: '',
    aircraftType: 'Narrow-Body (A320)',
    arrivalTime: '08:00',
    departureTime: '09:30',
    passengerCapacity: 180,
    terminal: 'T1',
    status: 'Scheduled'
  })
  const [formErrors, setFormErrors] = useState({})

  // Load flights from service on mount
  useEffect(() => {
    loadFlights()
  }, [])

  const loadFlights = async () => {
    try {
      setIsLoading(true)
      setBackendError(null)
      const data = await flightService.getFlights()
      setFlights(data)
    } catch (e) {
      console.error('Failed to load flights:', e)
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

  // Filtered flights
  const filteredFlights = useMemo(() => {
    return flights.filter(f => {
      const matchSearch =
        f.flightNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.airline.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.aircraftType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.id.toLowerCase().includes(searchTerm.toLowerCase())

      const matchStatus = statusFilter === 'ALL' || f.status === statusFilter
      const matchTerminal = terminalFilter === 'ALL' || f.terminal === terminalFilter

      return matchSearch && matchStatus && matchTerminal
    })
  }, [flights, searchTerm, statusFilter, terminalFilter])

  // Open modal for adding
  const handleOpenAddModal = () => {
    setEditingFlight(null)
    setFormData({
      flightNumber: '',
      airline: '',
      aircraftType: 'Narrow-Body (A320)',
      arrivalTime: '08:00',
      departureTime: '09:30',
      passengerCapacity: 180,
      terminal: 'T1',
      status: 'Scheduled'
    })
    setFormErrors({})
    setIsFormModalOpen(true)
  }

  // Open modal for editing
  const handleOpenEditModal = (flight) => {
    setEditingFlight(flight)
    setFormData({
      flightNumber: flight.flightNumber,
      airline: flight.airline,
      aircraftType: flight.aircraftType,
      arrivalTime: flight.arrivalTime,
      departureTime: flight.departureTime,
      passengerCapacity: flight.passengerCapacity,
      terminal: flight.terminal || 'T1',
      status: flight.status || 'Scheduled'
    })
    setFormErrors({})
    setIsFormModalOpen(true)
  }

  // Open delete confirm
  const handleOpenDeleteModal = (flight) => {
    setFlightToDelete(flight)
    setIsDeleteModalOpen(true)
  }

  // Form validation
  const validateForm = () => {
    const errors = {}
    if (!formData.flightNumber.trim()) {
      errors.flightNumber = 'Flight number is required (e.g. AI101)'
    } else if (!/^[A-Z0-9]{2,8}$/i.test(formData.flightNumber.trim())) {
      errors.flightNumber = 'Flight number must be 2-8 alphanumeric characters'
    }

    if (!formData.airline.trim()) {
      errors.airline = 'Airline name is required'
    }

    if (!formData.arrivalTime) {
      errors.arrivalTime = 'Arrival time is required'
    }

    if (!formData.departureTime) {
      errors.departureTime = 'Departure time is required'
    }

    const cap = Number(formData.passengerCapacity)
    if (!cap || cap <= 0 || cap > 900) {
      errors.passengerCapacity = 'Capacity must be a number between 1 and 900'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Submit Add / Edit
  const handleSaveFlight = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      if (editingFlight) {
        await flightService.updateFlight(editingFlight.id, formData)
        setNotification({
          type: 'success',
          title: 'Flight Updated',
          message: `Flight ${formData.flightNumber.toUpperCase()} was successfully updated.`
        })
      } else {
        await flightService.addFlight(formData)
        setNotification({
          type: 'success',
          title: 'Flight Created',
          message: `Flight ${formData.flightNumber.toUpperCase()} added to allocation registry.`
        })
      }
      setIsFormModalOpen(false)
      await loadFlights()
    } catch (err) {
      setNotification({
        type: 'danger',
        title: 'Operation Failed',
        message: err.message
      })
      setFormErrors(prev => ({ ...prev, flightNumber: err.message }))
    }
  }

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!flightToDelete) return
    try {
      await flightService.deleteFlight(flightToDelete.id)
      setNotification({
        type: 'warning',
        title: 'Flight Removed',
        message: `Flight ${flightToDelete.flightNumber} was deleted from registry.`
      })
      setIsDeleteModalOpen(false)
      setFlightToDelete(null)
      await loadFlights()
    } catch (err) {
      setNotification({
        type: 'danger',
        title: 'Delete Failed',
        message: err.message || 'Cannot delete flight assigned to active simulations.'
      })
      setIsDeleteModalOpen(false)
      setFlightToDelete(null)
    }
  }

  // Refresh from backend database
  const handleResetDefaults = async () => {
    await loadFlights()
    setNotification({
      type: 'info',
      title: 'Database Synchronized',
      message: 'Active fleet records refreshed from SQLite database.'
    })
  }

  // Table columns definition
  const columns = [
    {
      header: 'Flight ID',
      key: 'id',
      render: (row) => <span className="font-mono text-xs text-gw-cyan">{row.id}</span>
    },
    {
      header: 'Flight No.',
      key: 'flightNumber',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Plane className="w-3.5 h-3.5 text-gw-cyan" />
          <span className="font-bold text-sm font-mono text-gw-text">{row.flightNumber}</span>
        </div>
      )
    },
    {
      header: 'Airline',
      key: 'airline',
      render: (row) => <span className="font-medium text-gw-text">{row.airline}</span>
    },
    {
      header: 'Aircraft Class',
      key: 'aircraftType',
      render: (row) => {
        const isWide = row.aircraftType.includes('Wide-Body')
        return (
          <Badge variant={isWide ? 'blue' : 'default'} size="sm">
            {row.aircraftType}
          </Badge>
        )
      }
    },
    {
      header: 'Window (Arr / Dep)',
      key: 'schedule',
      render: (row) => (
        <div className="font-mono text-xs text-gw-text-secondary flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-gw-text-secondary" />
          <span>{row.arrivalTime}</span>
          <span>→</span>
          <span>{row.departureTime}</span>
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
      header: 'Capacity',
      key: 'passengerCapacity',
      render: (row) => (
        <span className="font-mono text-xs text-gw-text-secondary">
          {row.passengerCapacity} pax
        </span>
      )
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => {
        const variant =
          row.status === 'Boarding'
            ? 'cyan'
            : row.status === 'Delayed'
            ? 'error'
            : row.status === 'Arrived'
            ? 'success'
            : 'default'
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
            title="Edit Flight"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleOpenDeleteModal(row)}
            className="p-1.5 rounded-lg text-gw-text-secondary hover:text-gw-error hover:bg-gw-error/10 transition-colors cursor-pointer"
            title="Delete Flight"
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
            <h1 className="gw-page-heading">Flight Management</h1>
            <Badge variant="cyan" size="sm" className="font-mono">
              {flights.length} Registered
            </Badge>
          </div>
          <p className="text-sm text-gw-text-secondary">
            Manage flight schedules, fleet classifications, and operational constraints for gate allocations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <Button
            variant="outline"
            size="md"
            icon={Download}
            onClick={() => exportService.downloadFlightsCsv()}
            title="Export all flights to CSV"
          >
            Export CSV
          </Button>

          <Button
            variant="secondary"
            size="md"
            icon={RotateCcw}
            onClick={handleResetDefaults}
            title="Reset to default 6 flights"
          >
            Reset Sample Data
          </Button>

          <Button
            size="md"
            icon={Plus}
            onClick={handleOpenAddModal}
            className="shadow-lg shadow-gw-cyan/10"
          >
            Add New Flight
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

      {/* -------------------- 2. FILTER & SEARCH CONTROLS -------------------- */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="sm:col-span-6">
            <Input
              icon={Search}
              placeholder="Search by flight number, airline, or aircraft..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
              placeholder="Filter Status"
            />
          </div>

          {/* Terminal Filter */}
          <div className="sm:col-span-3">
            <Dropdown
              options={[
                { label: 'All Terminals', value: 'ALL' },
                ...TERMINAL_OPTIONS
              ]}
              value={terminalFilter}
              onChange={setTerminalFilter}
              placeholder="Filter Terminal"
            />
          </div>
        </div>
      </Card>

      {/* -------------------- 3. FLIGHTS TABLE (DESKTOP/TABLET) & CARDS (MOBILE) -------------------- */}
      <div className="hidden sm:block">
        <Table
          columns={columns}
          data={filteredFlights}
          keyExtractor={(item) => item.id}
          emptyMessage={
            searchTerm || statusFilter !== 'ALL' || terminalFilter !== 'ALL' ? (
              <div className="py-8 text-center space-y-2">
                <p className="text-sm font-semibold text-gw-text">No matching flights found</p>
                <p className="text-xs text-gw-text-secondary">Try adjusting your search criteria or filters.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('ALL')
                    setTerminalFilter('ALL')
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <p className="text-sm font-semibold text-gw-text">No flights registered</p>
                <p className="text-xs text-gw-text-secondary">Click "Add New Flight" to register flights for the simulation.</p>
                <Button size="sm" icon={Plus} onClick={handleOpenAddModal}>
                  Add First Flight
                </Button>
              </div>
            )
          }
        />
      </div>

      {/* Mobile Flight Cards (sm:hidden) */}
      <div className="block sm:hidden space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-gw-text-secondary bg-gw-card/50 rounded-xl border border-[#1e3a5f]/60">
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-gw-cyan border-t-transparent rounded-full animate-spin" />
              <span>Loading flights...</span>
            </div>
          </div>
        ) : filteredFlights.length === 0 ? (
          <div className="p-6 text-center space-y-3 bg-gw-card/50 rounded-xl border border-[#1e3a5f]/60">
            <p className="text-sm font-semibold text-gw-text">No matching flights found</p>
            <p className="text-xs text-gw-text-secondary">Try adjusting your search criteria or filters.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('ALL')
                setTerminalFilter('ALL')
              }}
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          filteredFlights.map((flight) => {
            const statusVariant =
              flight.status === 'Boarding'
                ? 'cyan'
                : flight.status === 'Delayed'
                ? 'error'
                : flight.status === 'Arrived'
                ? 'success'
                : 'default'

            return (
              <Card key={flight.id} className="p-4 space-y-3 border-[#1e3a5f]/80">
                {/* Header: Flight number, Airline, Status */}
                <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#1e3a5f]/40">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-gw-cyan/10 text-gw-cyan border border-gw-cyan/20">
                      <Plane className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-gw-cyan">{flight.flightNumber}</span>
                        <span className="font-mono text-[11px] text-gw-text-secondary">({flight.id})</span>
                      </div>
                      <div className="text-xs font-medium text-gw-text">{flight.airline}</div>
                    </div>
                  </div>
                  <Badge variant={statusVariant} size="sm" dot>
                    {flight.status}
                  </Badge>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-gw-bg-secondary/60 border border-[#1e3a5f]/40 space-y-0.5">
                    <span className="text-[10px] text-gw-text-secondary uppercase">Schedule</span>
                    <div className="font-mono font-medium text-gw-text flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gw-cyan shrink-0" />
                      <span>{flight.arrivalTime} → {flight.departureTime}</span>
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-gw-bg-secondary/60 border border-[#1e3a5f]/40 space-y-0.5">
                    <span className="text-[10px] text-gw-text-secondary uppercase">Terminal & Pax</span>
                    <div className="font-mono font-medium text-gw-text flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-gw-bg-tertiary border border-[#1e3a5f] text-[11px]">
                        {flight.terminal}
                      </span>
                      <span className="text-gw-text-secondary">{flight.passengerCapacity} pax</span>
                    </div>
                  </div>
                </div>

                {/* Aircraft Type info */}
                <div className="text-xs text-gw-text-secondary flex items-center justify-between px-1">
                  <span>Aircraft:</span>
                  <span className="font-medium text-gw-text">{flight.aircraftType}</span>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-[#1e3a5f]/40">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Edit2}
                    className="flex-1 justify-center text-xs h-9"
                    onClick={() => handleOpenEditModal(flight)}
                  >
                    Edit Flight
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Trash2}
                    className="flex-1 justify-center text-xs h-9 text-gw-error hover:bg-gw-error/10 hover:text-gw-error"
                    onClick={() => handleOpenDeleteModal(flight)}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            )
          })
        )}
      </div>

      {/* Storage & Architecture Notice */}
      <div className="p-3.5 rounded-xl bg-gw-bg-secondary/40 border border-[#1e3a5f]/50 flex items-center justify-between text-xs text-gw-text-secondary">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-gw-cyan shrink-0" />
          <span>
            Flights are stored locally in the browser registry (<code className="font-mono text-gw-cyan">localStorage</code>) and will seamlessly integrate with SQLite / FastAPI in Phase 12.
          </span>
        </div>
        <span className="font-mono text-[11px] text-gw-text-secondary hidden md:inline">
          Model: n={flights.length}
        </span>
      </div>

      {/* -------------------- 4. ADD / EDIT MODAL -------------------- */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingFlight ? `Edit Flight: ${editingFlight.flightNumber}` : 'Add New Flight'}
        subtitle={
          editingFlight
            ? `Update flight properties for ID ${editingFlight.id}`
            : 'Enter flight details for the gate allocation simulation window.'
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsFormModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveFlight}>
              {editingFlight ? 'Save Changes' : 'Create Flight'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveFlight} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Flight Number *"
              placeholder="e.g. AI101, 6E303"
              value={formData.flightNumber}
              onChange={(e) => setFormData({ ...formData, flightNumber: e.target.value.toUpperCase() })}
              error={formErrors.flightNumber}
            />

            <Input
              label="Airline Name *"
              placeholder="e.g. Air India, IndiGo"
              value={formData.airline}
              onChange={(e) => setFormData({ ...formData, airline: e.target.value })}
              error={formErrors.airline}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gw-text-secondary uppercase tracking-wider mb-1.5">
                Aircraft Type *
              </label>
              <Dropdown
                options={AIRCRAFT_TYPES}
                value={formData.aircraftType}
                onChange={(val) => setFormData({ ...formData, aircraftType: val })}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gw-text-secondary uppercase tracking-wider mb-1.5">
                Terminal Location
              </label>
              <Dropdown
                options={TERMINAL_OPTIONS}
                value={formData.terminal}
                onChange={(val) => setFormData({ ...formData, terminal: val })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Arrival Time *"
              type="time"
              value={formData.arrivalTime}
              onChange={(e) => setFormData({ ...formData, arrivalTime: e.target.value })}
              error={formErrors.arrivalTime}
            />

            <Input
              label="Departure Time *"
              type="time"
              value={formData.departureTime}
              onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
              error={formErrors.departureTime}
            />

            <Input
              label="Pax Capacity *"
              type="number"
              placeholder="e.g. 180"
              value={formData.passengerCapacity}
              onChange={(e) => setFormData({ ...formData, passengerCapacity: e.target.value })}
              error={formErrors.passengerCapacity}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gw-text-secondary uppercase tracking-wider mb-1.5">
              Flight Status
            </label>
            <Dropdown
              options={STATUS_OPTIONS}
              value={formData.status}
              onChange={(val) => setFormData({ ...formData, status: val })}
            />
          </div>
        </form>
      </Modal>

      {/* -------------------- 5. DELETE CONFIRMATION MODAL -------------------- */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Flight Deletion"
        subtitle="This action will remove the flight from future gate allocation scenarios."
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
        {flightToDelete && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-gw-error/10 border border-gw-error/30 text-xs text-gw-error flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                Are you sure you want to remove flight{' '}
                <strong className="font-mono text-gw-text">{flightToDelete.flightNumber}</strong> ({flightToDelete.airline})?
              </div>
            </div>
            <p className="text-xs text-gw-text-secondary leading-relaxed">
              Removing this flight will alter the matrix dimension n when building the next allocation scenario.
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default FlightManagement
