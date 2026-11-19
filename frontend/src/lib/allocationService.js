/**
 * GateWise — Allocation Service.
 * Client adapter connecting the frontend to the backend's mathematical engines:
 * Rook Polynomial & PIE Calculation (Phase 13/14), Backtracking Generator (Phase 16),
 * and Independent Conflict Detection (Phase 17).
 */

import api from './api'

export const allocationService = {
  /**
   * Fetch exact mathematical calculations (Rook Polynomial & Inclusion-Exclusion) for a simulation.
   * @param {string} simulationId 
   * @returns {Promise<Object>} InclusionExclusionResponse
   */
  async getCalculation(simulationId) {
    if (!simulationId) throw new Error('Simulation ID is required.')
    const response = await api.get(`/simulations/${simulationId}/calculate`)
    const data = response.data
    return {
      ...data,
      rook_polynomial: data.polynomial,
      exact_valid_assignments: data.valid_assignments,
      itemized_terms: (data.inclusion_exclusion_terms || []).map((t) => ({
        ...t,
        coefficient: t.rook_coefficient !== undefined ? t.rook_coefficient : (t.coefficient ?? 0),
        factorial_remaining: t.factorial_value !== undefined ? t.factorial_value : (t.factorial_remaining ?? 0),
        signed_contribution: t.contribution !== undefined ? t.contribution : (t.signed_contribution ?? 0),
        sign: t.sign === 1 || t.sign === '+' ? 1 : -1
      }))
    }
  },

  /**
   * Alias for getCalculation with normalized field naming.
   */
  async getMathEngine(simulationId) {
    return this.getCalculation(simulationId)
  },

  /**
   * Generate valid flight-to-gate allocations with independent conflict validation.
   * @param {string} simulationId 
   * @param {number|Object} options Max number of allocations or options object
   * @returns {Promise<Object>} AllocationGenerationResponse
   */
  async generateAllocations(simulationId, options = 100) {
    if (!simulationId) throw new Error('Simulation ID is required.')
    const maxResults = typeof options === 'number' ? options : (options.max_results || options.maxResults || 100)
    const response = await api.get(`/simulations/${simulationId}/allocations`, {
      params: { max_results: maxResults }
    })
    return response.data
  },

  /**
   * Validate an allocation against the selected simulation scenario.
   * @param {string} simulationId 
   * @param {Array|Object} allocation 
   * @returns {Promise<Object>} ConflictDetectionResponse
   */
  async validateSimulationAllocation(simulationId, allocation) {
    if (!simulationId) throw new Error('Simulation ID is required.')
    const response = await api.post(`/simulations/${simulationId}/validate-allocation`, allocation)
    return response.data
  },

  /**
   * Independently audit an arbitrary allocation against a custom restriction matrix and identifier sets.
   * @param {Array<Array<number>>} matrix 
   * @param {Array<string>} flightIds 
   * @param {Array<string>} gateIds 
   * @param {Array|Object} allocation 
   * @returns {Promise<Object>} ConflictDetectionResponse
   */
  async validateArbitraryAllocation(matrix, flightIds, gateIds, allocation) {
    const response = await api.post('/allocations/validate', {
      matrix,
      flight_ids: flightIds,
      gate_ids: gateIds,
      allocation
    })
    return response.data
  }
}

export default allocationService
