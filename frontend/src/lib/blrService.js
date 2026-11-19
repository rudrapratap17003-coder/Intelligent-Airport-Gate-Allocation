/**
 * GateWise BLR — Frontend API Service for Bengaluru Airport Digital Twin.
 * Interfaces with /api/v1/blr endpoints.
 */

import api from './api.js'

export const blrService = {
  /**
   * Fetch verified public BLR airport configuration and metadata.
   */
  async getConfig() {
    const res = await api.get('/blr/config')
    return res.data
  },

  /**
   * Fetch summary of Terminal 1 and Terminal 2.
   */
  async getTerminals() {
    const res = await api.get('/blr/terminals')
    return res.data
  },

  /**
   * Fetch specific terminal operational details.
   * @param {string} terminalId - 'T1' or 'T2'
   */
  async getTerminalDetail(terminalId) {
    const res = await api.get(`/blr/terminals/${terminalId}`)
    return res.data
  },

  /**
   * Fetch airport apron stands with compatibility metadata.
   * @param {string} [terminal] - Optional terminal filter ('T1' or 'T2')
   */
  async getStands(terminal) {
    const params = terminal && terminal !== 'ALL' ? { terminal } : {}
    const res = await api.get('/blr/stands', { params })
    return res.data
  },

  /**
   * Check physical and operational compatibility between a flight and a stand.
   * @param {string} flightId
   * @param {string} gateId
   */
  async checkCompatibility(flightId, gateId) {
    const res = await api.post('/blr/compatibility/check', {
      flight_id: flightId,
      gate_id: gateId
    })
    return res.data
  },

  /**
   * Fetch turnaround occupancy timeline windows.
   * @param {string} [terminal]
   */
  async getTurnaroundTimeline(terminal) {
    const params = terminal && terminal !== 'ALL' ? { terminal } : {}
    const res = await api.get('/blr/turnaround/timeline', { params })
    return res.data
  },

  /**
   * Verify an allocation against physical stand turnaround overlap.
   * @param {Array<{flight_id: string, gate_id: string}>} allocations
   */
  async verifyAllocationTurnaround(allocations) {
    const res = await api.post('/blr/turnaround/verify-allocation', { allocations })
    return res.data
  },

  /**
   * Fetch active operational alerts.
   * @param {string} [terminal]
   */
  async getAlerts(terminal) {
    const params = terminal && terminal !== 'ALL' ? { terminal } : {}
    const res = await api.get('/blr/alerts', { params })
    return res.data
  },

  /**
   * Get current simulation clock state.
   */
  async getClock() {
    const res = await api.get('/blr/simulation/clock')
    return res.data
  },

  /**
   * Control the simulation clock (start, pause, resume, reset, tick, speed, set_time).
   * @param {string} action
   * @param {Object} [params]
   */
  async controlClock(action, params = {}) {
    const payload = { action, ...params }
    const res = await api.post('/blr/simulation/clock/control', payload)
    return res.data
  }
}

export default blrService
