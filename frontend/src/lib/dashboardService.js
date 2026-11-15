/**
 * GateWise — Dashboard Service.
 * Client adapter connecting the frontend to the backend's live dashboard telemetry,
 * statistics, mathematical summaries, and genuine operational activity history.
 */

import api from './api'

export const dashboardService = {
  /**
   * Fetch consolidated live dashboard summary.
   * @param {string|null} simulationId Optional target simulation for mathematical evaluation
   * @returns {Promise<Object>} DashboardSummaryResponse
   */
  async getSummary(simulationId = null) {
    const params = {}
    if (simulationId) {
      params.simulation_id = simulationId
    }
    const response = await api.get('/dashboard/summary', { params })
    return response.data
  },

  /**
   * Fetch chronological operational activity history.
   * @param {number} limit Maximum records to return (1-100)
   * @returns {Promise<Array>} List of ActivityLogItem
   */
  async getActivities(limit = 20) {
    const response = await api.get('/dashboard/activities', {
      params: { limit }
    })
    return response.data
  }
}

export default dashboardService
