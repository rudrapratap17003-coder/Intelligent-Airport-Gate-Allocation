/**
 * Gate Service Layer (Phase 7 — Gate Management)
 * Dedicated service layer managing airport gate records.
 * 
 * Data Architecture:
 * - Primary: Synchronized with backend API when online (/api/v1/gates).
 * - LocalStorage: Authoritative client persistence via 'gatewise_gates_data'.
 * - Guarantees offline capability, duplicate prevention, and persistent state across page reloads.
 */

import api from './api.js'

export const STORAGE_KEY = 'gatewise_gates_data'

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

// Helper: Normalize aircraft categories into a structured array
export const normalizeAircraftCategories = (val) => {
  if (Array.isArray(val)) {
    return val.filter(Boolean)
  }
  if (!val || typeof val !== 'string') {
    return ['Narrow-Body']
  }
  const str = val.trim()
  if (str === 'All Categories (Narrow & Wide)') {
    return ['Narrow-Body', 'Wide-Body', 'Regional Jets']
  }
  if (str === 'Narrow-Body Only') {
    return ['Narrow-Body']
  }
  if (str === 'Wide-Body Only') {
    return ['Wide-Body']
  }
  if (str === 'Regional Jets Only') {
    return ['Regional Jets']
  }
  return str.split(',').map((s) => s.trim()).filter(Boolean)
}

// Helper: Format aircraft categories to canonical display string
export const formatAircraftCategories = (val) => {
  if (Array.isArray(val)) {
    if (val.length === 0) return 'Narrow-Body Only'
    if (val.includes('Narrow-Body') && val.includes('Wide-Body')) {
      return 'All Categories (Narrow & Wide)'
    }
    if (val.includes('Narrow-Body') && val.length === 1) return 'Narrow-Body Only'
    if (val.includes('Wide-Body') && val.length === 1) return 'Wide-Body Only'
    if (val.includes('Regional Jets') && val.length === 1) return 'Regional Jets Only'
    return val.join(', ')
  }
  return typeof val === 'string' && val.trim() ? val.trim() : 'Narrow-Body Only'
}

// Wire-format adapters between API (snake_case) and UI (camelCase)
export const mapGateFromApi = (g) => {
  const rawAircraft = g.supported_aircraft || g.supportedAircraft
  const categories = normalizeAircraftCategories(rawAircraft)
  const displayAircraft = typeof rawAircraft === 'string' ? rawAircraft : formatAircraftCategories(rawAircraft)

  return {
    id: g.id,
    gateNumber: g.gate_number || g.gateNumber,
    terminal: g.terminal,
    gateType: g.gate_type || g.gateType,
    supportedAircraft: displayAircraft,
    supportedAircraftCategories: categories,
    maxCapacity: g.max_capacity !== undefined ? g.max_capacity : g.maxCapacity,
    status: g.status,
    createdAt: g.created_at || g.createdAt,
    updatedAt: g.updated_at || g.updatedAt
  }
}

export const mapGateToApi = (g) => {
  const rawAircraft = g.supportedAircraft || g.supported_aircraft || g.supportedAircraftCategories
  const displayAircraft = formatAircraftCategories(rawAircraft)

  return {
    id: g.id,
    gate_number: g.gateNumber ? g.gateNumber.trim().toUpperCase() : '',
    terminal: g.terminal,
    gate_type: g.gateType,
    supported_aircraft: displayAircraft,
    max_capacity: Number(g.maxCapacity),
    status: g.status
  }
}

// Helper: Read raw gates from localStorage
const getLocalGates = () => {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (!raw) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SAMPLE_GATES))
      }
      return INITIAL_SAMPLE_GATES.map(mapGateFromApi)
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(mapGateFromApi) : INITIAL_SAMPLE_GATES.map(mapGateFromApi)
  } catch {
    return INITIAL_SAMPLE_GATES.map(mapGateFromApi)
  }
}

// Helper: Save raw gates to localStorage
const setLocalGates = (gates) => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gates))
    }
  } catch (err) {
    console.warn('LocalStorage write failed:', err)
  }
}

// Helper: Generate next unique Gate ID (GT-001, GT-002, ...)
const generateNextId = (existingGates) => {
  const maxNum = existingGates.reduce((max, g) => {
    const match = g.id && g.id.match(/^GT-(\d+)$/)
    if (match) {
      const num = parseInt(match[1], 10)
      return num > max ? num : max
    }
    return max
  }, 0)
  const nextNum = maxNum + 1
  return `GT-${String(nextNum).padStart(3, '0')}`
}

export const gateService = {
  /**
   * Fetch all gates.
   * Tries backend first; falls back cleanly to localStorage if backend is offline.
   */
  getGates: async () => {
    try {
      const res = await api.get('/gates')
      const mapped = res.data.map(mapGateFromApi)
      setLocalGates(mapped)
      return mapped
    } catch {
      // Offline / standalone fallback: read directly from localStorage
      return getLocalGates()
    }
  },

  /**
   * Create a new gate.
   * Enforces unique gate number & unique ID.
   */
  addGate: async (gateData) => {
    const gateNum = gateData.gateNumber ? gateData.gateNumber.trim().toUpperCase() : ''
    if (!gateNum) {
      throw new Error('Gate number is required.')
    }

    // Try backend API first
    const payload = mapGateToApi(gateData)
    try {
      const res = await api.post('/gates', payload)
      const created = mapGateFromApi(res.data)
      const current = getLocalGates()
      setLocalGates([...current, created])
      return created
    } catch (err) {
      // If error is duplicate gate error from backend, rethrow
      if (err.response?.status === 409 || err.message?.toLowerCase().includes('already exists')) {
        throw new Error(err.response?.data?.detail || err.message || `Gate ${gateNum} already exists.`)
      }

      // Standalone localStorage creation
      const current = getLocalGates()
      if (current.some(g => g.gateNumber.toUpperCase() === gateNum)) {
        throw new Error(`Gate number "${gateNum}" already exists. Please choose a unique gate number.`)
      }

      const newId = gateData.id || generateNextId(current)
      if (current.some(g => g.id === newId)) {
        throw new Error(`Gate ID "${newId}" already exists.`)
      }

      const rawAircraft = gateData.supportedAircraft || gateData.supportedAircraftCategories || 'Narrow-Body Only'
      const displayAircraft = formatAircraftCategories(rawAircraft)
      const categories = normalizeAircraftCategories(rawAircraft)

      const newGate = {
        id: newId,
        gateNumber: gateNum,
        terminal: gateData.terminal || 'T1',
        gateType: gateData.gateType || 'Domestic',
        supportedAircraft: displayAircraft,
        supportedAircraftCategories: categories,
        maxCapacity: Number(gateData.maxCapacity) || 230,
        status: gateData.status || 'Available',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      setLocalGates([...current, newGate])
      return newGate
    }
  },

  /**
   * Update existing gate properties.
   * Preserves gate ID and enforces unique gate number.
   */
  updateGate: async (id, gateData) => {
    const gateNum = gateData.gateNumber ? gateData.gateNumber.trim().toUpperCase() : ''
    const payload = mapGateToApi(gateData)

    try {
      const res = await api.put(`/gates/${id}`, payload)
      const updated = mapGateFromApi(res.data)
      const current = getLocalGates()
      setLocalGates(current.map(g => g.id === id ? updated : g))
      return updated
    } catch (err) {
      if (err.response?.status === 409 || err.message?.toLowerCase().includes('already exists')) {
        throw new Error(err.response?.data?.detail || err.message || `Gate ${gateNum} already exists.`)
      }

      // Standalone localStorage update
      const current = getLocalGates()
      if (current.some(g => g.id !== id && g.gateNumber.toUpperCase() === gateNum)) {
        throw new Error(`Gate number "${gateNum}" is already used by another gate.`)
      }

      const existingIndex = current.findIndex(g => g.id === id)
      if (existingIndex === -1) {
        throw new Error(`Gate with ID "${id}" was not found.`)
      }

      const rawAircraft = gateData.supportedAircraft || gateData.supportedAircraftCategories || current[existingIndex].supportedAircraft
      const displayAircraft = formatAircraftCategories(rawAircraft)
      const categories = normalizeAircraftCategories(rawAircraft)

      const updated = {
        ...current[existingIndex],
        gateNumber: gateNum || current[existingIndex].gateNumber,
        terminal: gateData.terminal || current[existingIndex].terminal,
        gateType: gateData.gateType || current[existingIndex].gateType,
        supportedAircraft: displayAircraft,
        supportedAircraftCategories: categories,
        maxCapacity: Number(gateData.maxCapacity) || current[existingIndex].maxCapacity,
        status: gateData.status || current[existingIndex].status,
        updatedAt: new Date().toISOString()
      }

      const updatedList = [...current]
      updatedList[existingIndex] = updated
      setLocalGates(updatedList)
      return updated
    }
  },

  /**
   * Delete gate by ID.
   */
  deleteGate: async (id) => {
    try {
      await api.delete(`/gates/${id}`)
    } catch {
      // Backend may be offline; proceed with local deletion
    }

    const current = getLocalGates()
    const filtered = current.filter(g => g.id !== id)
    setLocalGates(filtered)
    return true
  },

  /**
   * Reset to initial sample benchmark gates.
   */
  resetDefaults: async () => {
    setLocalGates(INITIAL_SAMPLE_GATES)
    return [...INITIAL_SAMPLE_GATES]
  },

  /**
   * Explicit migration utility to recover legacy data if needed
   */
  getLegacyBackup: () => {
    return getLocalGates()
  }
}

export default gateService
