/**
 * GateWise — Analytics Service.
 * Client adapter connecting the frontend to the backend's mathematical insights,
 * restriction density analytics, Rook polynomial coefficient distributions,
 * and Inclusion-Exclusion exact sums.
 */

import api from './api'

export const analyticsService = {
  /**
   * Fetch aggregated database-driven mathematical analytics across all simulations.
   * @returns {Promise<Object>} AnalyticsOverviewResponse
   */
  async getOverview() {
    const response = await api.get('/analytics/overview')
    return response.data
  },

  /**
   * Fetch detailed mathematical and allocation analytics for a specific simulation scenario.
   * @param {string} simulationId Simulation ID
   * @param {boolean} includeSample Whether to generate and audit a sample allocation batch
   * @param {number} sampleLimit Max allocations for sample audit
   * @returns {Promise<Object>} SimulationDetailedAnalyticsResponse
   */
  async getSimulationDetails(simulationId, includeSample = false, sampleLimit = 50) {
    if (!simulationId) throw new Error('Simulation ID is required.')
    const response = await api.get(`/analytics/simulations/${simulationId}`, {
      params: {
        include_sample: includeSample,
        sample_limit: sampleLimit
      }
    })
    return response.data
  }
}

export default analyticsService
