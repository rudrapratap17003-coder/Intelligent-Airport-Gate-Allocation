/**
 * Simulation Service Layer
 * Authoritative persistence via FastAPI Backend (/api/v1/simulations).
 * Silent LocalStorage fallback is strictly removed to prevent inconsistent data state.
 */

import api from './api'

const LEGACY_STORAGE_KEY = 'gatewise_simulations_data'

export const INITIAL_SAMPLE_SIMULATIONS = [
  {
    id: 'SIM-001',
    name: 'Morning Peak Allocation (6x6 Benchmark)',
    description: 'Baseline morning allocation window comparing 6 international & domestic flights across 6 terminal gates.',
    selectedFlightIds: ['FL-001', 'FL-002', 'FL-003', 'FL-004', 'FL-005', 'FL-006'],
    selectedGateIds: ['GT-001', 'GT-002', 'GT-003', 'GT-004', 'GT-005', 'GT-006'],
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
    createdAt: '2026-11-15T11:15:00.000Z',
    updatedAt: '2026-11-15T11:15:00.000Z',
    status: 'Draft'
  }
]

// Wire-format adapters between API (snake_case) and UI (camelCase)
export const mapSimulationFromApi = (s) => ({
  id: s.id,
  name: s.name,
  description: s.description || '',
  selectedFlightIds: s.selected_flight_ids || s.selectedFlightIds || [],
  selectedGateIds: s.selected_gate_ids || s.selectedGateIds || [],
  createdAt: s.created_at || s.createdAt,
  updatedAt: s.updated_at || s.updatedAt,
  status: s.status || 'Ready'
})

export const mapSimulationToApi = (s) => ({
  id: s.id,
  name: s.name ? s.name.trim() : '',
  description: s.description ? s.description.trim() : '',
  selected_flight_ids: s.selectedFlightIds || [],
  selected_gate_ids: s.selectedGateIds || [],
  status: s.status || 'Ready'
})

export const simulationService = {
  /**
   * Fetch all simulation scenarios from FastAPI backend.
   * Throws error if backend is unavailable.
   */
  getSimulations: async () => {
    try {
      const res = await api.get('/simulations')
      const mapped = res.data.map(mapSimulationFromApi)
      try {
        localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(mapped))
      } catch {
        // Ignore localStorage write failures
      }
      return mapped
    } catch (e) {
      throw new Error(e.message || 'Failed to retrieve simulation scenarios from backend database.')
    }
  },

  /**
   * Fetch single simulation scenario by ID from FastAPI backend.
   */
  getSimulationById: async (id) => {
    try {
      const res = await api.get(`/simulations/${id}`)
      return mapSimulationFromApi(res.data)
    } catch (e) {
      throw new Error(e.message || `Simulation scenario ${id} not found in database.`)
    }
  },

  /**
   * Create new simulation scenario in backend database.
   * Throws error on connection failure or validation/duplicate error.
   */
  createSimulation: async (simData) => {
    const payload = mapSimulationToApi(simData)
    try {
      const res = await api.post('/simulations', payload)
      return mapSimulationFromApi(res.data)
    } catch (e) {
      throw new Error(e.message || 'Failed to create simulation scenario in backend database.')
    }
  },

  /**
   * Update existing simulation scenario in backend database.
   * Throws error on connection failure or validation error.
   */
  updateSimulation: async (id, simData) => {
    const payload = mapSimulationToApi(simData)
    try {
      const res = await api.put(`/simulations/${id}`, payload)
      return mapSimulationFromApi(res.data)
    } catch (e) {
      throw new Error(e.message || `Failed to update simulation ${id} in backend database.`)
    }
  },

  /**
   * Deep duplicate simulation scenario via backend endpoint.
   * Throws error on connection failure or backend error.
   */
  duplicateSimulation: async (id) => {
    try {
      const res = await api.post(`/simulations/${id}/duplicate`)
      return mapSimulationFromApi(res.data)
    } catch (e) {
      throw new Error(e.message || `Failed to duplicate simulation scenario ${id}.`)
    }
  },

  /**
   * Delete simulation scenario from backend database.
   * Automatically cascades deletion to associations and restriction matrix.
   */
  deleteSimulation: async (id) => {
    try {
      await api.delete(`/simulations/${id}`)
      return true
    } catch (e) {
      throw new Error(e.message || `Failed to delete simulation ${id} from backend database.`)
    }
  },

  /**
   * Explicit migration utility to recover legacy data if needed
   */
  getLegacyBackup: () => {
    try {
      const data = localStorage.getItem(LEGACY_STORAGE_KEY)
      return data ? JSON.parse(data) : INITIAL_SAMPLE_SIMULATIONS
    } catch {
      return INITIAL_SAMPLE_SIMULATIONS
    }
  }
}

export default simulationService
