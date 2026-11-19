/**
 * Simulation Service Layer (Phase 8 — Simulation Management)
 * Dedicated service layer managing airport gate allocation simulation scenarios.
 *
 * Data Architecture:
 * - Primary: Synchronized with backend API when online (/api/v1/simulations).
 * - LocalStorage: Authoritative client persistence via 'gatewise_simulations_data'.
 * - Guarantees offline capability, duplicate prevention, and persistent state across page reloads.
 */

import api from './api.js'

export const STORAGE_KEY = 'gatewise_simulations_data'

export const INITIAL_SAMPLE_SIMULATIONS = [
  {
    id: 'SIM-001',
    name: 'Morning Peak Allocation (6x6 Benchmark)',
    description: 'Baseline morning allocation window comparing 6 international & domestic flights across 6 terminal gates.',
    selectedFlightIds: ['FL-001', 'FL-002', 'FL-003', 'FL-004', 'FL-005', 'FL-006'],
    selectedGateIds: ['GT-001', 'GT-002', 'GT-003', 'GT-004', 'GT-005', 'GT-006'],
    simulationDate: '2026-11-18',
    timeWindow: '08:00 - 12:00',
    createdAt: '2026-11-15T08:00:00.000Z',
    updatedAt: '2026-11-15T08:00:00.000Z',
    status: 'Ready'
  },
  {
    id: 'SIM-002',
    name: 'Regional Shuttle Window (3x3 Sample)',
    description: 'Compact 3-flight sub-schedule testing narrow-body terminal turnaround constraints.',
    selectedFlightIds: ['FL-002', 'FL-003', 'FL-004'],
    selectedGateIds: ['GT-001', 'GT-002', 'GT-003'],
    simulationDate: '2026-11-18',
    timeWindow: '09:30 - 13:30',
    createdAt: '2026-11-15T09:30:00.000Z',
    updatedAt: '2026-11-15T09:30:00.000Z',
    status: 'Ready'
  },
  {
    id: 'SIM-003',
    name: 'Evening International Hub (Draft)',
    description: 'Preliminary planning scenario for heavy wide-body overnight departures.',
    selectedFlightIds: ['FL-001', 'FL-005'],
    selectedGateIds: ['GT-005', 'GT-006'],
    simulationDate: '2026-11-18',
    timeWindow: '18:00 - 22:00',
    createdAt: '2026-11-15T11:15:00.000Z',
    updatedAt: '2026-11-15T11:15:00.000Z',
    status: 'Draft'
  }
]

/**
 * Validate calendar date in YYYY-MM-DD format with genuine calendar days.
 */
export const isValidDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false
  const [yearStr, monthStr, dayStr] = dateStr.split('-')
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10)
  const day = parseInt(dayStr, 10)
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return false
  const d = new Date(year, month - 1, day)
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  )
}

/**
 * Validate time window in "HH:MM - HH:MM" format.
 */
export const isValidTimeWindow = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return false
  const trimmed = timeStr.trim()
  const match = trimmed.match(/^([01]\d|2[0-3]):([0-5]\d)\s*-\s*([01]\d|2[0-3]):([0-5]\d)$/)
  if (!match) return false
  const startMins = parseInt(match[1], 10) * 60 + parseInt(match[2], 10)
  const endMins = parseInt(match[3], 10) * 60 + parseInt(match[4], 10)
  return startMins !== endMins
}

// Wire-format adapters between API (snake_case) and UI (camelCase)
export const mapSimulationFromApi = (s) => ({
  id: s.id,
  name: s.name,
  description: s.description || '',
  selectedFlightIds: Array.isArray(s.selected_flight_ids || s.selectedFlightIds)
    ? [...new Set((s.selected_flight_ids || s.selectedFlightIds).filter(Boolean))]
    : [],
  selectedGateIds: Array.isArray(s.selected_gate_ids || s.selectedGateIds)
    ? [...new Set((s.selected_gate_ids || s.selectedGateIds).filter(Boolean))]
    : [],
  simulationDate: s.simulation_date || s.simulationDate || (s.created_at ? s.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)),
  timeWindow: s.time_window || s.timeWindow || '08:00 - 12:00',
  createdAt: s.created_at || s.createdAt || new Date().toISOString(),
  updatedAt: s.updated_at || s.updatedAt || new Date().toISOString(),
  status: s.status || 'Draft'
})

export const mapSimulationToApi = (s) => ({
  id: s.id,
  name: s.name ? s.name.trim() : '',
  description: s.description ? s.description.trim() : '',
  selected_flight_ids: Array.isArray(s.selectedFlightIds) ? [...new Set(s.selectedFlightIds.filter(Boolean))] : [],
  selected_gate_ids: Array.isArray(s.selectedGateIds) ? [...new Set(s.selectedGateIds.filter(Boolean))] : [],
  status: s.status || 'Draft'
})

// Helper: Read raw simulations from localStorage
// Strictly seeds default benchmarks on first load (null), but returns [] if user cleared them.
const getLocalSimulations = () => {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (raw === null) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SAMPLE_SIMULATIONS))
      }
      return INITIAL_SAMPLE_SIMULATIONS.map(mapSimulationFromApi)
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(mapSimulationFromApi) : []
  } catch {
    return []
  }
}

// Helper: Save raw simulations to localStorage
const setLocalSimulations = (sims) => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sims))
    }
  } catch (err) {
    console.warn('LocalStorage write failed:', err)
  }
}

// Helper: Generate next unique Simulation ID (SIM-001, SIM-002, ...)
const generateNextId = (existingSims) => {
  const maxNum = existingSims.reduce((max, s) => {
    const match = s.id && s.id.match(/^SIM-(\d+)$/)
    if (match) {
      const num = parseInt(match[1], 10)
      return num > max ? num : max
    }
    return max
  }, 0)
  const nextNum = maxNum + 1
  return `SIM-${String(nextNum).padStart(3, '0')}`
}

export const simulationService = {
  /**
   * Fetch all simulation scenarios.
   * Tries backend first; preserves client-side metadata (date, time window, offline records).
   * Falls back cleanly to localStorage if backend is offline.
   */
  getSimulations: async () => {
    try {
      const res = await api.get('/simulations')
      const currentLocal = getLocalSimulations()
      const localMap = new Map(currentLocal.map((s) => [s.id, s]))

      // Merge backend items with local metadata (date, time window, status)
      const mapped = res.data.map((item) => {
        const local = localMap.get(item.id)
        return {
          ...mapSimulationFromApi(item),
          simulationDate: local?.simulationDate || item.simulation_date || (item.created_at ? item.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)),
          timeWindow: local?.timeWindow || item.time_window || '08:00 - 12:00',
          status: (local?.status === 'Completed' && item.status !== 'Completed') ? 'Completed' : (item.status || local?.status || 'Draft')
        }
      })

      // Retain offline-created scenarios that are not yet synchronized to backend
      const backendIds = new Set(res.data.map((item) => item.id))
      const offlineOnly = currentLocal.filter((s) => !backendIds.has(s.id))
      const reconciled = [...mapped, ...offlineOnly]

      setLocalSimulations(reconciled)
      return reconciled
    } catch {
      return getLocalSimulations()
    }
  },

  /**
   * Fetch single simulation scenario by ID.
   */
  getSimulationById: async (id) => {
    try {
      const res = await api.get(`/simulations/${id}`)
      const current = getLocalSimulations()
      const local = current.find((s) => s.id === id)
      return {
        ...mapSimulationFromApi(res.data),
        simulationDate: local?.simulationDate || (res.data.created_at ? res.data.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)),
        timeWindow: local?.timeWindow || '08:00 - 12:00',
        status: local?.status === 'Completed' ? 'Completed' : (res.data.status || 'Draft')
      }
    } catch {
      const current = getLocalSimulations()
      const found = current.find((s) => s.id === id)
      if (!found) {
        throw new Error(`Simulation scenario ${id} was not found.`)
      }
      return found
    }
  },

  /**
   * Create a new simulation scenario.
   * Enforces name validation, date/time validation, flight/gate selection, and duplicate checks.
   */
  createSimulation: async (simData) => {
    const name = simData.name ? simData.name.trim() : ''
    if (!name) {
      throw new Error('Simulation name is required.')
    }
    if (name.length < 3) {
      throw new Error('Simulation name must be at least 3 characters.')
    }

    const simDate = simData.simulationDate || new Date().toISOString().slice(0, 10)
    if (!isValidDate(simDate)) {
      throw new Error('Invalid simulation date: Date must be a valid calendar date in YYYY-MM-DD format.')
    }

    const timeWin = simData.timeWindow || '08:00 - 12:00'
    if (!isValidTimeWindow(timeWin)) {
      throw new Error('Invalid time window: Must be formatted as "HH:MM - HH:MM" with valid hours (00-23) and minutes (00-59).')
    }

    const flightIds = Array.isArray(simData.selectedFlightIds)
      ? [...new Set(simData.selectedFlightIds.filter(Boolean))]
      : []
    const gateIds = Array.isArray(simData.selectedGateIds)
      ? [...new Set(simData.selectedGateIds.filter(Boolean))]
      : []

    if (flightIds.length === 0) {
      throw new Error('At least one flight must be selected.')
    }
    if (gateIds.length === 0) {
      throw new Error('At least one gate must be selected.')
    }

    // Try backend API first
    const payload = mapSimulationToApi({
      ...simData,
      name,
      selectedFlightIds: flightIds,
      selectedGateIds: gateIds
    })

    try {
      const res = await api.post('/simulations', payload)
      const created = mapSimulationFromApi(res.data)
      const mergedCreated = {
        ...created,
        simulationDate: simDate,
        timeWindow: timeWin,
        status: simData.status || created.status
      }
      const current = getLocalSimulations()
      setLocalSimulations([...current, mergedCreated])
      return mergedCreated
    } catch (err) {
      if (err.response?.status === 409 || err.message?.toLowerCase().includes('already exists')) {
        throw new Error(err.response?.data?.detail || err.message || `Scenario "${name}" already exists.`)
      }

      // Standalone localStorage creation
      const current = getLocalSimulations()
      if (current.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
        throw new Error(`Scenario name "${name}" already exists. Please choose a unique name.`)
      }

      const newId = simData.id || generateNextId(current)
      if (current.some((s) => s.id === newId)) {
        throw new Error(`Simulation ID "${newId}" already exists.`)
      }

      const newSim = {
        id: newId,
        name,
        description: simData.description ? simData.description.trim() : '',
        selectedFlightIds: flightIds,
        selectedGateIds: gateIds,
        simulationDate: simDate,
        timeWindow: timeWin,
        status: simData.status || 'Draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      setLocalSimulations([...current, newSim])
      return newSim
    }
  },

  /**
   * Update an existing simulation scenario.
   * Protects Completed status, preserves simulation ID and validates parameters.
   */
  updateSimulation: async (id, simData) => {
    const current = getLocalSimulations()
    const existingIndex = current.findIndex((s) => s.id === id)
    if (existingIndex === -1) {
      throw new Error(`Simulation scenario with ID "${id}" was not found.`)
    }
    const existing = current[existingIndex]

    // Status Protection Rules:
    // 1. Completed scenarios are read-only historical states by default.
    // 2. Modifying a Completed scenario is forbidden unless performing an explicit reopen action (status: 'Draft').
    if (existing.status === 'Completed') {
      const isExplicitReopen = simData.status === 'Draft'
      if (!isExplicitReopen) {
        throw new Error('Scenario is Completed and locked. You must explicitly reopen this scenario to Draft status before editing.')
      }
    }

    // 3. Draft cannot jump directly to Completed; must be Ready first.
    if (existing.status === 'Draft' && simData.status === 'Completed') {
      throw new Error('A scenario must be marked as Ready before it can be marked as Completed.')
    }

    const name = simData.name !== undefined ? simData.name.trim() : undefined
    if (name !== undefined && name.length < 3) {
      throw new Error('Simulation name must be at least 3 characters.')
    }

    if (simData.simulationDate !== undefined && !isValidDate(simData.simulationDate)) {
      throw new Error('Invalid simulation date: Date must be a valid calendar date in YYYY-MM-DD format.')
    }

    if (simData.timeWindow !== undefined && !isValidTimeWindow(simData.timeWindow)) {
      throw new Error('Invalid time window: Must be formatted as "HH:MM - HH:MM" with valid hours (00-23) and minutes (00-59).')
    }

    const flightIds = simData.selectedFlightIds !== undefined
      ? [...new Set(simData.selectedFlightIds.filter(Boolean))]
      : existing.selectedFlightIds
    const gateIds = simData.selectedGateIds !== undefined
      ? [...new Set(simData.selectedGateIds.filter(Boolean))]
      : existing.selectedGateIds

    if (simData.selectedFlightIds !== undefined && flightIds.length === 0) {
      throw new Error('At least one flight must be selected.')
    }
    if (simData.selectedGateIds !== undefined && gateIds.length === 0) {
      throw new Error('At least one gate must be selected.')
    }

    const payload = mapSimulationToApi({
      ...simData,
      selectedFlightIds: flightIds,
      selectedGateIds: gateIds
    })

    try {
      const res = await api.put(`/simulations/${id}`, payload)
      const updated = mapSimulationFromApi(res.data)
      const mergedUpdated = {
        ...updated,
        simulationDate: simData.simulationDate || existing.simulationDate || updated.simulationDate,
        timeWindow: simData.timeWindow || existing.timeWindow || updated.timeWindow,
        status: simData.status || updated.status
      }
      setLocalSimulations(current.map((s) => (s.id === id ? mergedUpdated : s)))
      return mergedUpdated
    } catch (err) {
      if (err.response?.status === 409 || err.message?.toLowerCase().includes('already exists')) {
        throw new Error(err.response?.data?.detail || err.message || `Scenario "${name}" already exists.`)
      }

      // Standalone localStorage update
      if (name && current.some((s) => s.id !== id && s.name.toLowerCase() === name.toLowerCase())) {
        throw new Error(`Scenario name "${name}" is already used by another scenario.`)
      }

      const updated = {
        ...existing,
        name: name || existing.name,
        description: simData.description !== undefined ? simData.description.trim() : existing.description,
        selectedFlightIds: flightIds,
        selectedGateIds: gateIds,
        simulationDate: simData.simulationDate || existing.simulationDate || new Date().toISOString().slice(0, 10),
        timeWindow: simData.timeWindow || existing.timeWindow || '08:00 - 12:00',
        status: simData.status || existing.status,
        updatedAt: new Date().toISOString()
      }

      const updatedList = [...current]
      updatedList[existingIndex] = updated
      setLocalSimulations(updatedList)
      return updated
    }
  },

  /**
   * Deep duplicate an existing scenario.
   * Clones configuration with new ID, resets status to 'Draft'.
   */
  duplicateSimulation: async (id) => {
    const current = getLocalSimulations()
    const original = current.find((s) => s.id === id)

    try {
      const res = await api.post(`/simulations/${id}/duplicate`)
      const cloned = mapSimulationFromApi(res.data)
      const mergedCloned = {
        ...cloned,
        name: cloned.name.startsWith('Copy of') ? cloned.name : `Copy of ${original?.name || cloned.name}`,
        status: 'Draft',
        simulationDate: original?.simulationDate || cloned.simulationDate,
        timeWindow: original?.timeWindow || cloned.timeWindow
      }
      setLocalSimulations([...current, mergedCloned])
      return mergedCloned
    } catch {
      if (!original) {
        throw new Error(`Simulation scenario ${id} to duplicate was not found.`)
      }

      const newId = generateNextId(current)
      const newName = `Copy of ${original.name}`

      const cloned = {
        ...original,
        id: newId,
        name: newName,
        status: 'Draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      setLocalSimulations([...current, cloned])
      return cloned
    }
  },

  /**
   * Delete simulation scenario by ID.
   */
  deleteSimulation: async (id) => {
    try {
      await api.delete(`/simulations/${id}`)
    } catch {
      // Backend may be offline; proceed with local deletion
    }

    const current = getLocalSimulations()
    const filtered = current.filter((s) => s.id !== id)
    setLocalSimulations(filtered)
    return true
  },

  /**
   * Reset simulation registry to initial sample benchmark scenarios.
   * Explicit user-triggered action only.
   */
  resetDefaults: async () => {
    setLocalSimulations(INITIAL_SAMPLE_SIMULATIONS)
    return INITIAL_SAMPLE_SIMULATIONS.map(mapSimulationFromApi)
  },

  /**
   * Explicit backup utility to read local storage without altering state.
   */
  getLegacyBackup: () => {
    return getLocalSimulations()
  }
}

export default simulationService
