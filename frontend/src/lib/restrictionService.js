/**
 * Restriction Service Layer
 * Authoritative persistence via FastAPI Backend (/api/v1/simulations/{id}/restrictions).
 * Silent LocalStorage fallback is strictly removed to prevent inconsistent data state.
 * 0 = Allowed Assignment
 * 1 = Forbidden Assignment
 */

import api from './api'

const LEGACY_STORAGE_KEY = 'gatewise_restrictions_data'

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

export const restrictionService = {
  /**
   * Fetch matrix from FastAPI backend for simulationId.
   * Throws error if backend is unreachable or scenario is not found.
   */
  getMatrixForSimulation: async (simulationId) => {
    try {
      const res = await api.get(`/simulations/${simulationId}/restrictions`)
      if (res.data && Array.isArray(res.data.matrix)) {
        return res.data.matrix
      }
      throw new Error(`Invalid matrix payload received for simulation ${simulationId}`)
    } catch (e) {
      throw new Error(e.message || `Failed to fetch restriction matrix for simulation ${simulationId}.`)
    }
  },

  /**
   * Save matrix directly to FastAPI backend for simulationId.
   * Throws error if backend is unreachable or validation fails.
   */
  saveMatrixForSimulation: async (simulationId, matrix) => {
    try {
      const res = await api.put(`/simulations/${simulationId}/restrictions`, { matrix })
      if (res.data && Array.isArray(res.data.matrix)) {
        return res.data.matrix
      }
      return matrix
    } catch (e) {
      throw new Error(e.message || `Failed to save restriction matrix for simulation ${simulationId}.`)
    }
  },

  /**
   * Toggle a single cell in the matrix and persist directly to backend.
   */
  toggleCell: async (simulationId, matrix, row, col) => {
    const nextMatrix = matrix.map(r => [...r])
    nextMatrix[row][col] = nextMatrix[row][col] === 1 ? 0 : 1
    const saved = await restrictionService.saveMatrixForSimulation(simulationId, nextMatrix)
    return saved
  },

  /**
   * Clear all restrictions for simulation scenario.
   */
  clearAllRestrictions: async (simulationId, numFlights, numGates) => {
    const cleared = Array.from({ length: numFlights }, () =>
      Array.from({ length: numGates }, () => 0)
    )
    return await restrictionService.saveMatrixForSimulation(simulationId, cleared)
  },

  /**
   * Mark all assignments as forbidden for simulation scenario.
   */
  markAllForbidden: async (simulationId, numFlights, numGates) => {
    const forbidden = Array.from({ length: numFlights }, () =>
      Array.from({ length: numGates }, () => 1)
    )
    return await restrictionService.saveMatrixForSimulation(simulationId, forbidden)
  },

  /**
   * Reset SIM-001 to canonical 6x6 benchmark matrix.
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
   * Explicit migration utility to recover legacy data if needed
   */
  getLegacyBackup: () => {
    try {
      const data = localStorage.getItem(LEGACY_STORAGE_KEY)
      return data ? JSON.parse(data) : INITIAL_SAMPLE_RESTRICTIONS
    } catch {
      return INITIAL_SAMPLE_RESTRICTIONS
    }
  }
}

export default restrictionService
