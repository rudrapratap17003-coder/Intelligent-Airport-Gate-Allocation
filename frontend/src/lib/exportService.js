/**
 * GateWise Client Service — Report & Data Export System.
 * Connects frontend to /api/v1/export endpoints for CSV datasets and publication-grade PDF reports.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

export const exportService = {
  getFlightsCsvUrl() {
    return `${BASE_URL}/export/flights/csv`
  },

  getGatesCsvUrl() {
    return `${BASE_URL}/export/gates/csv`
  },

  getMatrixCsvUrl(simulationId) {
    return `${BASE_URL}/export/simulations/${simulationId}/matrix/csv`
  },

  getAllocationsCsvUrl(simulationId, maxResults = 500) {
    return `${BASE_URL}/export/simulations/${simulationId}/allocations/csv?max_results=${maxResults}`
  },

  getCalculationCsvUrl(simulationId) {
    return `${BASE_URL}/export/simulations/${simulationId}/calculation/csv`
  },

  getScenarioPdfUrl(simulationId) {
    return `${BASE_URL}/export/simulations/${simulationId}/report/pdf`
  },

  getAcademicReportHtmlUrl(simulationId) {
    return `${BASE_URL}/export/simulations/${simulationId}/report/html`
  },

  getComparisonCsvUrl(simulationIds = []) {
    const idsParam = Array.isArray(simulationIds) ? simulationIds.join(',') : simulationIds
    return `${BASE_URL}/export/comparison/csv?ids=${encodeURIComponent(idsParam)}`
  },

  getComparisonPdfUrl(simulationIds = []) {
    const idsParam = Array.isArray(simulationIds) ? simulationIds.join(',') : simulationIds
    return `${BASE_URL}/export/comparison/pdf?ids=${encodeURIComponent(idsParam)}`
  },

  // --------------------------------------------------------------------------
  // Trigger Direct Browser Downloads
  // --------------------------------------------------------------------------
  downloadFlightsCsv() {
    window.open(this.getFlightsCsvUrl(), '_blank')
  },

  downloadGatesCsv() {
    window.open(this.getGatesCsvUrl(), '_blank')
  },

  downloadMatrixCsv(simulationId) {
    if (!simulationId) return
    window.open(this.getMatrixCsvUrl(simulationId), '_blank')
  },

  downloadAllocationsCsv(simulationId, maxResults = 500) {
    if (!simulationId) return
    window.open(this.getAllocationsCsvUrl(simulationId, maxResults), '_blank')
  },

  downloadCalculationCsv(simulationId) {
    if (!simulationId) return
    window.open(this.getCalculationCsvUrl(simulationId), '_blank')
  },

  downloadScenarioPdf(simulationId) {
    if (!simulationId) return
    window.open(this.getScenarioPdfUrl(simulationId), '_blank')
  },

  openAcademicReportHtml(simulationId) {
    if (!simulationId) return
    window.open(this.getAcademicReportHtmlUrl(simulationId), '_blank')
  },

  downloadComparisonCsv(simulationIds = []) {
    if (!simulationIds || simulationIds.length < 2) return
    window.open(this.getComparisonCsvUrl(simulationIds), '_blank')
  },

  downloadComparisonPdf(simulationIds = []) {
    if (!simulationIds || simulationIds.length < 2) return
    window.open(this.getComparisonPdfUrl(simulationIds), '_blank')
  }
}

export default exportService
