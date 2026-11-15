import React, { useState, useEffect } from 'react'
import {
  FileText,
  Download,
  Plane,
  DoorClosed,
  Grid3X3,
  Calculator,
  Layers,
  Scale,
  CheckCircle2,
  Info,
  ExternalLink
} from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Dropdown from '../components/ui/Dropdown'
import Notification from '../components/ui/Notification'
import simulationService from '../lib/simulationService'
import exportService from '../lib/exportService'

export const ReportsHub = () => {
  const [simulations, setSimulations] = useState([])
  const [selectedSimId, setSelectedSimId] = useState('')
  const [compareSimIds, setCompareSimIds] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [notification, setNotification] = useState(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  useEffect(() => {
    loadSimulations()
  }, [])

  const loadSimulations = async () => {
    try {
      setIsLoading(true)
      const data = await simulationService.getSimulations()
      setSimulations(data)
      if (data.length > 0) {
        setSelectedSimId(data[0].id)
        if (data.length >= 2) {
          setCompareSimIds([data[0].id, data[1].id])
        }
      }
    } catch (err) {
      console.error('Failed to load simulations for reports hub:', err)
      setNotification({
        type: 'danger',
        title: 'Backend Error',
        message: 'Failed to fetch scenario registry.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const selectedSim = simulations.find((s) => s.id === selectedSimId)

  const handleDownloadScenarioPdf = async () => {
    if (!selectedSimId) return
    setIsGeneratingPdf(true)
    try {
      await exportService.downloadScenarioPdf(selectedSimId)
      setNotification({
        type: 'success',
        title: 'Report Downloaded',
        message: `Scenario PDF report generated for ${selectedSim?.name || selectedSimId}.`
      })
    } catch (err) {
      setNotification({
        type: 'danger',
        title: 'Export Failed',
        message: err.message || 'Failed to generate PDF report.'
      })
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const handleDownloadComparisonPdf = async () => {
    if (compareSimIds.length < 2) {
      setNotification({
        type: 'warning',
        title: 'Selection Required',
        message: 'Select at least 2 scenarios for comparative PDF export.'
      })
      return
    }
    setIsGeneratingPdf(true)
    try {
      await exportService.downloadComparisonPdf(compareSimIds)
      setNotification({
        type: 'success',
        title: 'Comparison Report Downloaded',
        message: `Comparative analysis PDF generated for ${compareSimIds.length} scenarios.`
      })
    } catch (err) {
      setNotification({
        type: 'danger',
        title: 'Export Failed',
        message: err.message || 'Failed to generate comparison PDF.'
      })
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto">
      {/* -------------------- HEADER -------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#1e3a5f]/50">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="gw-page-heading">Reports & Exports Central</h1>
            <Badge variant="cyan" size="sm" dot>
              Authoritative Generation
            </Badge>
          </div>
          <p className="text-sm text-gw-text-secondary mt-1">
            Generate ReportLab executive PDF reports and tabular CSV exports derived from active database records.
          </p>
        </div>
      </div>

      {notification && (
        <Notification
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      {/* -------------------- SECTION 1: GLOBAL REGISTRY EXPORTS -------------------- */}
      <div className="space-y-3">
        <h2 className="gw-section-heading flex items-center gap-2">
          <Download className="w-5 h-5 text-gw-cyan" />
          <span>Operational Master Data Exports</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4 flex items-center justify-between border-[#1e3a5f]/80 hover:border-gw-cyan/40 transition-all">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gw-cyan/10 border border-gw-cyan/30 text-gw-cyan">
                <Plane className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gw-text">Flight Fleet Registry CSV</h3>
                <p className="text-xs text-gw-text-secondary">All registered flights, carrier schedules, and aircraft classifications.</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              onClick={() => exportService.downloadFlightsCsv()}
            >
              Export CSV
            </Button>
          </Card>

          <Card className="p-4 flex items-center justify-between border-[#1e3a5f]/80 hover:border-gw-blue/40 transition-all">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gw-blue/10 border border-gw-blue/30 text-gw-blue">
                <DoorClosed className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gw-text">Terminal Gate Facilities CSV</h3>
                <p className="text-xs text-gw-text-secondary">Terminal gates, boarding bridge types, and passenger capacity limits.</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              onClick={() => exportService.downloadGatesCsv()}
            >
              Export CSV
            </Button>
          </Card>
        </div>
      </div>

      {/* -------------------- SECTION 2: SCENARIO-SPECIFIC REPORTS -------------------- */}
      <Card className="p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e3a5f]/40">
          <div>
            <h2 className="gw-section-heading flex items-center gap-2">
              <FileText className="w-5 h-5 text-gw-cyan" />
              <span>Scenario Allocation Reports</span>
            </h2>
            <p className="text-xs text-gw-text-secondary mt-0.5">
              Select any operational scenario to download executive PDFs, allocation matrices, and math derivations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gw-text-secondary">Scenario:</span>
            <select
              value={selectedSimId}
              onChange={(e) => setSelectedSimId(e.target.value)}
              className="bg-gw-bg-secondary border border-[#1e3a5f] rounded-lg px-3 py-1.5 text-xs text-gw-text font-mono focus:border-gw-cyan focus:outline-none cursor-pointer max-w-xs truncate"
            >
              {simulations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.id})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-gw-bg-secondary/70 border border-[#1e3a5f]/60 flex flex-col justify-between space-y-3">
            <div>
              <FileText className="w-6 h-6 text-gw-cyan mb-2" />
              <h4 className="text-xs font-bold text-gw-text">Executive PDF Report</h4>
              <p className="text-[11px] text-gw-text-secondary mt-1">
                Branded PDF with parameters, rook polynomials, PIE terms, and schedule.
              </p>
            </div>
            <Button
              size="sm"
              variant="primary"
              icon={Download}
              disabled={isGeneratingPdf || !selectedSimId}
              onClick={handleDownloadScenarioPdf}
            >
              {isGeneratingPdf ? 'Rendering PDF...' : 'Download PDF'}
            </Button>
          </div>

          <div className="p-4 rounded-xl bg-gw-bg-secondary/70 border border-[#1e3a5f]/60 flex flex-col justify-between space-y-3">
            <div>
              <CheckCircle2 className="w-6 h-6 text-gw-success mb-2" />
              <h4 className="text-xs font-bold text-gw-text">Allocations CSV</h4>
              <p className="text-[11px] text-gw-text-secondary mt-1">
                Materialized flight-to-gate assignment pairings.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              icon={Download}
              disabled={!selectedSimId}
              onClick={() => exportService.downloadAllocationsCsv(selectedSimId)}
            >
              Export CSV
            </Button>
          </div>

          <div className="p-4 rounded-xl bg-gw-bg-secondary/70 border border-[#1e3a5f]/60 flex flex-col justify-between space-y-3">
            <div>
              <Calculator className="w-6 h-6 text-gw-warning mb-2" />
              <h4 className="text-xs font-bold text-gw-text">Mathematical CSV</h4>
              <p className="text-[11px] text-gw-text-secondary mt-1">
                Itemized rook coefficients and alternating PIE formula terms.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              icon={Download}
              disabled={!selectedSimId}
              onClick={() => exportService.downloadMathCsv(selectedSimId)}
            >
              Export Math
            </Button>
          </div>

          <div className="p-4 rounded-xl bg-gw-bg-secondary/70 border border-[#1e3a5f]/60 flex flex-col justify-between space-y-3">
            <div>
              <Grid3X3 className="w-6 h-6 text-purple-400 mb-2" />
              <h4 className="text-xs font-bold text-gw-text">Restriction Matrix CSV</h4>
              <p className="text-[11px] text-gw-text-secondary mt-1">
                Binary restriction board B matrix cells for this scenario.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              icon={Download}
              disabled={!selectedSimId}
              onClick={() => exportService.downloadMatrixCsv(selectedSimId)}
            >
              Export Matrix
            </Button>
          </div>
        </div>
      </Card>

      {/* -------------------- SECTION 3: MULTI-SCENARIO COMPARISON PDF -------------------- */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e3a5f]/40">
          <div>
            <h2 className="gw-section-heading flex items-center gap-2">
              <Scale className="w-5 h-5 text-gw-warning" />
              <span>Multi-Scenario Comparative Report</span>
            </h2>
            <p className="text-xs text-gw-text-secondary mt-0.5">
              Generate side-by-side comparative PDF reports contrasting restriction densities and feasibility ratios.
            </p>
          </div>

          <Button
            size="md"
            icon={Download}
            disabled={compareSimIds.length < 2 || isGeneratingPdf}
            onClick={handleDownloadComparisonPdf}
          >
            {isGeneratingPdf ? 'Generating...' : `Export Comparison PDF (${compareSimIds.length} Selected)`}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {simulations.map((sim) => {
            const isSelected = compareSimIds.includes(sim.id)
            return (
              <div
                key={sim.id}
                onClick={() => {
                  setCompareSimIds((prev) =>
                    prev.includes(sim.id) ? prev.filter((id) => id !== sim.id) : [...prev, sim.id]
                  )
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-gw-cyan/10 border-gw-cyan/40 text-gw-text'
                    : 'bg-gw-bg-secondary/60 border-[#1e3a5f]/50 text-gw-text-secondary hover:border-[#1e3a5f]'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <span className="font-mono text-xs font-bold text-gw-cyan">{sim.id}</span>
                  <div className="text-xs font-medium truncate text-gw-text">{sim.name}</div>
                </div>
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-gw-cyan border-gw-cyan text-gw-bg' : 'border-[#1e3a5f]'
                  }`}
                >
                  {isSelected && <span className="text-[10px] font-bold">✓</span>}
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

export default ReportsHub
