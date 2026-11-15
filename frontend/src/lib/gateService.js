/**
 * Gate Service Layer
 * Authoritative persistence via FastAPI Backend (/api/v1/gates).
 * Silent LocalStorage fallback is strictly removed to prevent inconsistent data state.
 */

import api from './api'

const LEGACY_STORAGE_KEY = 'gatewise_gates_data'

export const INITIAL_SAMPLE_GATES = [
  {
    id: 'GT-001',
    gateNumber: 'G1',
    terminal: 'T1',
    gateType: 'Domestic',
    supportedAircraft: 'Narrow-Body Only',
    maxCapacity: 230,
    status: 'Available'
  },
  {
    id: 'GT-002',
    gateNumber: 'G2',
    terminal: 'T1',
    gateType: 'Domestic',
    supportedAircraft: 'Narrow-Body Only',
    maxCapacity: 230,
    status: 'Available'
  },
  {
    id: 'GT-003',
    gateNumber: 'G3',
    terminal: 'T2',
    gateType: 'Universal',
    supportedAircraft: 'All Categories (Narrow & Wide)',
    maxCapacity: 450,
    status: 'Available'
  },
  {
    id: 'GT-004',
    gateNumber: 'G4',
    terminal: 'T2',
    gateType: 'Universal',
    supportedAircraft: 'All Categories (Narrow & Wide)',
    maxCapacity: 450,
    status: 'Available'
  },
  {
    id: 'GT-005',
    gateNumber: 'G5',
    terminal: 'T2',
    gateType: 'International',
    supportedAircraft: 'Wide-Body Only',
    maxCapacity: 500,
    status: 'Occupied'
  },
  {
    id: 'GT-006',
    gateNumber: 'G6',
    terminal: 'T2',
    gateType: 'International',
    supportedAircraft: 'All Categories (Narrow & Wide)',
    maxCapacity: 450,
    status: 'Available'
  }
]

// Wire-format adapters between API (snake_case) and UI (camelCase)
export const mapGateFromApi = (g) => ({
  id: g.id,
  gateNumber: g.gate_number || g.gateNumber,
  terminal: g.terminal,
  gateType: g.gate_type || g.gateType,
  supportedAircraft: g.supported_aircraft || g.supportedAircraft,
  maxCapacity: g.max_capacity !== undefined ? g.max_capacity : g.maxCapacity,
  status: g.status,
  createdAt: g.created_at || g.createdAt,
  updatedAt: g.updated_at || g.updatedAt
})

export const mapGateToApi = (g) => ({
  id: g.id,
  gate_number: g.gateNumber ? g.gateNumber.trim().toUpperCase() : '',
  terminal: g.terminal,
  gate_type: g.gateType,
  supported_aircraft: g.supportedAircraft,
  max_capacity: Number(g.maxCapacity),
  status: g.status
})

export const gateService = {
  /**
   * Fetch all gates from FastAPI backend.
   * Throws an error if backend is unavailable.
   */
  getGates: async () => {
    try {
      const res = await api.get('/gates')
      const mapped = res.data.map(mapGateFromApi)
      try {
        localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(mapped))
      } catch {
        // Ignore localStorage write failures
      }
      return mapped
    } catch (e) {
      throw new Error(e.message || 'Failed to retrieve gates from backend database.')
    }
  },

  /**
   * Create a new gate in backend database.
   * Throws error on connection failure or validation/duplicate error.
   */
  addGate: async (gateData) => {
    const payload = mapGateToApi(gateData)
    try {
      const res = await api.post('/gates', payload)
      return mapGateFromApi(res.data)
    } catch (e) {
      throw new Error(e.message || 'Failed to create gate in backend database.')
    }
  },

  /**
   * Update existing gate properties in backend database.
   * Throws error on connection failure or validation error.
   */
  updateGate: async (id, gateData) => {
    const payload = mapGateToApi(gateData)
    try {
      const res = await api.put(`/gates/${id}`, payload)
      return mapGateFromApi(res.data)
    } catch (e) {
      throw new Error(e.message || `Failed to update gate ${id} in backend database.`)
    }
  },

  /**
   * Delete gate from backend database.
   * Throws error on conflict (referential integrity) or connection failure.
   */
  deleteGate: async (id) => {
    try {
      await api.delete(`/gates/${id}`)
      return true
    } catch (e) {
      throw new Error(e.message || `Failed to delete gate ${id} from backend database.`)
    }
  },

  /**
   * Explicit migration utility to recover legacy data if needed
   */
  getLegacyBackup: () => {
    try {
      const data = localStorage.getItem(LEGACY_STORAGE_KEY)
      return data ? JSON.parse(data) : INITIAL_SAMPLE_GATES
    } catch {
      return INITIAL_SAMPLE_GATES
    }
  }
}

export default gateService
