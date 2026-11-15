/**
 * GateWise — Scenario Comparison Service.
 * Client adapter connecting the frontend to the backend's multi-scenario comparison engine.
 */

import api from './api'

export const comparisonService = {
  /**
   * Compare two or more simulation scenarios.
   * @param {Array<string>} simulationIds List of at least 2 simulation IDs
   * @returns {Promise<Object>} ScenarioComparisonResponse
   */
  async compareScenarios(simulationIds) {
    if (!Array.isArray(simulationIds) || simulationIds.length < 2) {
      throw new Error('Please select at least 2 simulation scenarios to compare.')
    }
    const response = await api.post('/comparison', {
      simulation_ids: simulationIds
    })
    return response.data
  }
}

export default comparisonService
