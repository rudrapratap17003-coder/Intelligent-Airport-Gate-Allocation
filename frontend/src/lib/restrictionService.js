/**
 * Restriction Service Layer (Phase 9 — Restriction Matrix)
 * Manages binary restriction matrix (Board B) representing forbidden flight-to-gate assignments.
 *
 * Binary Convention:
 * - 0 = Assignment permitted (flight can be scheduled to gate)
 * - 1 = Assignment forbidden (flight prohibited from gate)
 *
 * Persistence Architecture:
 * - Primary: FastAPI backend (/api/v1/simulations/{id}/restrictions)
 * - LocalStorage: Authoritative client persistence fallback via 'gatewise_restrictions_data'
 * - Guarantees offline capability, state preservation across page reloads, and scenario isolation.
 */

import api from './api.js'

export const STORAGE_KEY = 'gatewise_restrictions_data'

export const INITIAL_SAMPLE_RESTRICTIONS = {
  'SIM-001': [
    [0, 1, 0, 0, 0, 0],
    [0, 0, 0, 1, 0, 0],
    [0, 0, 0, 0, 1, 0],
    [1, 0, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 0],
    [0, 0, 0, 0, 0, 0]
  ],
  'SIM-002': [
    [0, 1, 0],
    [0, 0, 1],
    [1, 0, 0]
  ]
}

/**
 * Generate an all-zero (all permitted) matrix of dimensions rows × cols.
 */
export const createZeroMatrix = (rows, cols) => {
  const r = Math.max(0, rows || 0)
  const c = Math.max(0, cols || 0)
  return Array.from({ length: r }, () => Array.from({ length: c }, () => 0))
}

/**
 * Resize existing matrix to target dimensions, preserving overlapping cells.
 */
export const resizeMatrix = (matrix, targetRows, targetCols) => {
  const r = Math.max(0, targetRows || 0)
  const c = Math.max(0, targetCols || 0)
  return Array.from({ length: r }, (_, rowIdx) =>
    Array.from({ length: c }, (_, colIdx) => {
      const val = matrix?.[rowIdx]?.[colIdx]
      return val === 1 ? 1 : 0
    })
  )
}

/**
 * Remap a saved matrix when the ordering of flight IDs or gate IDs has changed.
 *
 * Given the original row identity (storedRowIds) and column identity (storedColIds)
 * and the current ordering (currentRowIds, currentColIds), produce a new matrix where
 * each cell preserves its original (flightId, gateId) restriction value.
 *
 * IDs that exist in the current set but not in the stored set get a row/column of 0.
 * IDs that existed in the stored set but are no longer in the current set are dropped.
 */
export const remapMatrix = (matrix, storedRowIds, storedColIds, currentRowIds, currentColIds) => {
  if (!matrix || !Array.isArray(matrix)) return matrix
  if (!Array.isArray(storedRowIds) || !Array.isArray(storedColIds)) return matrix
  if (!Array.isArray(currentRowIds) || !Array.isArray(currentColIds)) return matrix

  // Check if ordering is already identical
  const rowsIdentical = storedRowIds.length === currentRowIds.length &&
    storedRowIds.every((id, idx) => id === currentRowIds[idx])
  const colsIdentical = storedColIds.length === currentColIds.length &&
    storedColIds.every((id, idx) => id === currentColIds[idx])

  if (rowsIdentical && colsIdentical) return matrix

  // Build lookup: storedId → storedIndex
  const rowLookup = new Map()
  for (let i = 0; i < storedRowIds.length; i++) {
    rowLookup.set(storedRowIds[i], i)
  }
  const colLookup = new Map()
  for (let j = 0; j < storedColIds.length; j++) {
    colLookup.set(storedColIds[j], j)
  }

  return currentRowIds.map((fId) => {
    const oldRow = rowLookup.has(fId) ? rowLookup.get(fId) : null
    return currentColIds.map((gId) => {
      const oldCol = colLookup.has(gId) ? colLookup.get(gId) : null
      if (oldRow !== null && oldCol !== null) {
        const val = matrix?.[oldRow]?.[oldCol]
        return val === 1 ? 1 : 0
      }
      return 0 // New flight-gate pair defaults to permitted
    })
  })
}

/**
 * Validate that every cell in a 2D matrix contains only binary 0 or 1.
 */
export const validateBinaryMatrix = (matrix) => {
  if (!Array.isArray(matrix)) {
    throw new Error('Matrix must be a 2D array.')
  }
  for (let r = 0; r < matrix.length; r++) {
    if (!Array.isArray(matrix[r])) {
      throw new Error(`Row ${r} of matrix is not an array.`)
    }
    for (let c = 0; c < matrix[r].length; c++) {
      const val = matrix[r][c]
      if (val !== 0 && val !== 1) {
        throw new Error(`Matrix cell at (${r}, ${c}) contains invalid value ${val}. Must be 0 or 1.`)
      }
    }
  }
  return true
}

// Helper: Read restrictions dictionary from localStorage
const getAllLocalRestrictions = () => {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (!raw) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SAMPLE_RESTRICTIONS))
      }
      return { ...INITIAL_SAMPLE_RESTRICTIONS }
    }
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? parsed : { ...INITIAL_SAMPLE_RESTRICTIONS }
  } catch {
    return { ...INITIAL_SAMPLE_RESTRICTIONS }
  }
}

// Helper: Read single matrix from localStorage
const getLocalMatrix = (simulationId) => {
  const store = getAllLocalRestrictions()
  const entry = store[simulationId]
  if (!entry) return null
  // Support both legacy bare-array format and new envelope format
  if (Array.isArray(entry)) return { matrix: entry, rowFlightIds: null, columnGateIds: null }
  if (entry && Array.isArray(entry.matrix)) return entry
  return null
}

// Helper: Save single matrix to localStorage with row/column identity metadata
const setLocalMatrix = (simulationId, matrix, rowFlightIds = null, columnGateIds = null) => {
  try {
    if (typeof localStorage !== 'undefined') {
      const store = getAllLocalRestrictions()
      store[simulationId] = {
        matrix,
        rowFlightIds: rowFlightIds || null,
        columnGateIds: columnGateIds || null
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    }
  } catch (err) {
    console.warn('LocalStorage write failed for restrictions:', err)
  }
}

export const restrictionService = {
  /**
   * Fetch restriction matrix for simulationId.
   * Tries backend first; falls back cleanly to localStorage if backend is offline.
   * When currentFlightIds / currentGateIds are provided, remaps the stored matrix
   * so that cell (i,j) always corresponds to the correct (flight, gate) pair,
   * even if the ordering of selectedFlightIds or selectedGateIds has changed.
   */
  getMatrixForSimulation: async (simulationId, rowsCount, colsCount, currentFlightIds = null, currentGateIds = null) => {
    let matrix = null
    let storedRowFlightIds = null
    let storedColumnGateIds = null

    try {
      const res = await api.get(`/simulations/${simulationId}/restrictions`)
      if (res.data && Array.isArray(res.data.matrix)) {
        matrix = res.data.matrix
        storedRowFlightIds = res.data.rowFlightIds || res.data.row_flight_ids || null
        storedColumnGateIds = res.data.columnGateIds || res.data.column_gate_ids || null
        setLocalMatrix(
          simulationId,
          matrix,
          storedRowFlightIds || currentFlightIds,
          storedColumnGateIds || currentGateIds
        )
      }
    } catch {
      // Backend offline or endpoint 404; retrieve from local storage
    }

    if (!matrix) {
      const local = getLocalMatrix(simulationId)
      if (local) {
        matrix = local.matrix
        storedRowFlightIds = local.rowFlightIds
        storedColumnGateIds = local.columnGateIds
      }
    }

    // If still null, create default zero matrix
    if (!matrix) {
      matrix = createZeroMatrix(rowsCount, colsCount)
      setLocalMatrix(simulationId, matrix, currentFlightIds, currentGateIds)
    } else {
      // Remap rows/columns if the stored identity arrays are available and the
      // current ordering differs from the stored ordering
      if (currentFlightIds && currentGateIds && storedRowFlightIds && storedColumnGateIds) {
        matrix = remapMatrix(matrix, storedRowFlightIds, storedColumnGateIds, currentFlightIds, currentGateIds)
      }

      if (rowsCount !== undefined && colsCount !== undefined) {
        // If scenario dimensions changed, adapt gracefully
        if (matrix.length !== rowsCount || (matrix[0] && matrix[0].length !== colsCount)) {
          matrix = resizeMatrix(matrix, rowsCount, colsCount)
        }
      }

      setLocalMatrix(simulationId, matrix, currentFlightIds, currentGateIds)
    }

    return matrix
  },

  /**
   * Save restriction matrix for simulationId.
   * Validates binary integrity, saves to backend and mirrors to LocalStorage.
   * Accepts optional flightIds / gateIds to record row/column identity.
   */
  saveMatrixForSimulation: async (simulationId, matrix, flightIds = null, gateIds = null) => {
    validateBinaryMatrix(matrix)

    // Optimistically update local storage
    setLocalMatrix(simulationId, matrix, flightIds, gateIds)

    try {
      const payload = {
        matrix,
        rowFlightIds: flightIds,
        columnGateIds: gateIds,
        row_flight_ids: flightIds,
        column_gate_ids: gateIds
      }
      const res = await api.put(`/simulations/${simulationId}/restrictions`, payload)
      if (res.data && Array.isArray(res.data.matrix)) {
        const returnedRowIds = res.data.rowFlightIds || res.data.row_flight_ids || flightIds
        const returnedColIds = res.data.columnGateIds || res.data.column_gate_ids || gateIds
        setLocalMatrix(simulationId, res.data.matrix, returnedRowIds, returnedColIds)
        return res.data.matrix
      }
    } catch (err) {
      // Backend may be offline; local storage has already safely captured the matrix
      console.warn(`Backend restriction save for ${simulationId} failed, stored locally:`, err.message)
    }

    return matrix
  },

  /**
   * Update restriction matrix for simulation scenario.
   * Accepts either a 2D matrix array directly or an object containing { matrix: [...] }.
   * Preserves full backward compatibility with existing components and test suites.
   */
  updateMatrix: async (simulationId, payloadOrMatrix, flightIds = null, gateIds = null) => {
    const matrix = Array.isArray(payloadOrMatrix)
      ? payloadOrMatrix
      : payloadOrMatrix?.matrix
    const fIds = flightIds || payloadOrMatrix?.rowFlightIds || payloadOrMatrix?.row_flight_ids || null
    const gIds = gateIds || payloadOrMatrix?.columnGateIds || payloadOrMatrix?.column_gate_ids || null
    if (!Array.isArray(matrix)) {
      throw new Error(`Invalid matrix payload provided to updateMatrix for simulation ${simulationId}.`)
    }
    return await restrictionService.saveMatrixForSimulation(simulationId, matrix, fIds, gIds)
  },

  /**
   * Toggle a single cell in the matrix and persist directly.
   */
  toggleCell: async (simulationId, matrix, row, col) => {
    const nextMatrix = matrix.map((r) => [...r])
    nextMatrix[row][col] = nextMatrix[row][col] === 1 ? 0 : 1
    return await restrictionService.saveMatrixForSimulation(simulationId, nextMatrix)
  },

  /**
   * Clear all restrictions for simulation scenario (set all cells to 0).
   */
  clearAllRestrictions: async (simulationId, numFlights, numGates) => {
    const cleared = createZeroMatrix(numFlights, numGates)
    return await restrictionService.saveMatrixForSimulation(simulationId, cleared)
  },

  /**
   * Mark all assignments as forbidden for simulation scenario (set all cells to 1).
   */
  markAllForbidden: async (simulationId, numFlights, numGates) => {
    const r = Math.max(0, numFlights || 0)
    const c = Math.max(0, numGates || 0)
    const forbidden = Array.from({ length: r }, () => Array.from({ length: c }, () => 1))
    return await restrictionService.saveMatrixForSimulation(simulationId, forbidden)
  },

  /**
   * Reset SIM-001 to canonical 6x6 benchmark matrix, or clear to zero.
   */
  resetToBenchmark: async (simulationId, numFlights, numGates) => {
    if (simulationId === 'SIM-001' && numFlights === 6 && numGates === 6) {
      const benchmark = [
        [0, 1, 0, 0, 0, 0],
        [0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 1, 0],
        [1, 0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 0]
      ]
      return await restrictionService.saveMatrixForSimulation(simulationId, benchmark)
    }
    return await restrictionService.clearAllRestrictions(simulationId, numFlights, numGates)
  },

  /**
   * Explicit migration utility to recover legacy data if needed.
   */
  getLegacyBackup: () => {
    const raw = getAllLocalRestrictions()
    const legacy = {}
    for (const [k, v] of Object.entries(raw)) {
      legacy[k] = Array.isArray(v) ? v : (v?.matrix || v)
    }
    return legacy
  }
}

export default restrictionService
