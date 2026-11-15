import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Layers,
  Scale,
  PlayCircle,
  Grid3X3,
  Calculator,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  TrendingUp,
  Percent,
  Plus,
  X,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Download,
  FileText
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell
} from 'recharts'
import Button from '../ui/Button'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import comparisonService from '../../lib/comparisonService'
import simulationService from '../../lib/simulationService'
import exportService from '../../lib/exportService'

const SCENARIO_PALETTE = ['#00f0ff', '#f59e0b', '#10b981', '#a855f7', '#ec4899', '#3b82f6']

export const ScenarioComparisonView = () => {
  const [allSimulations, setAllSimulations] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [comparisonData, setComparisonData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isComparing, setIsComparing] = useState(false)
  const [error, setError] = useState(null)

  // 1. Fetch available simulation scenarios on mount
  useEffect(() => {
    const fetchSims = async () => {
      try {
        setIsLoading(true)
        const sims = await simulationService.getSimulations()
        setAllSimulations(sims)
        // Default to first two scenarios if available
        if (sims.length >= 2) {
          const defaults = [sims[0].id, sims[1].id]
          setSelectedIds(defaults)
          executeComparison(defaults)
        }
      } catch (err) {
        console.error('Failed to load simulations for comparison:', err)
        setError(err.message || 'Failed to load simulations')
      } finally {
        setIsLoading(false)
      }
    }
    fetchSims()
  }, [])

  // 2. Execute Comparison API
  const executeComparison = async (idsToCompare) => {
    if (!idsToCompare || idsToCompare.length < 2) {
      setComparisonData(null)
      return
    }
    try {
      setIsComparing(true)
      setError(null)
      const data = await comparisonService.compareScenarios(idsToCompare)
      setComparisonData(data)
    } catch (err) {
      console.error('Failed to compare scenarios:', err)
      setError(err.message || 'Comparison failed')
    } finally {
      setIsComparing(false)
    }
  }

  // 3. Toggle selection
  const handleToggleSelect = (simId) => {
    let nextIds
    if (selectedIds.includes(simId)) {
      nextIds = selectedIds.filter((id) => id !== simId)
    } else {
      nextIds = [...selectedIds, simId]
    }
    setSelectedIds(nextIds)
    if (nextIds.length >= 2) {
      executeComparison(nextIds)
    } else {
      setComparisonData(null)
    }
  }

  // 4. Reset selection
  const handleReset = () => {
    setSelectedIds([])
    setComparisonData(null)
    setError(null)
  }

  // Recharts Data 1: Comparative Density & Feasibility
  const comparativeMetricsChartData = useMemo(() => {
    if (!comparisonData?.scenarios) return []
    return comparisonData.scenarios
      .filter((s) => s.is_valid_config)
      .map((s, idx) => ({
        id: s.id,
        name: s.name.length > 14 ? s.name.substring(0, 12) + '...' : s.name,
        density: s.restriction_density,
        feasibility: Number(s.feasibility_percentage.toFixed(1)),
        fillColor: SCENARIO_PALETTE[idx % SCENARIO_PALETTE.length]
      }))
  }, [comparisonData])

  // Recharts Data 2: Valid Allocations vs Infeasible States
  const allocationPartitionChartData = useMemo(() => {
    if (!comparisonData?.scenarios) return []
    return comparisonData.scenarios
      .filter((s) => s.is_valid_config)
      .map((s) => ({
        id: s.id,
        name: s.name.length > 14 ? s.name.substring(0, 12) + '...' : s.name,
        valid: s.exact_valid_assignments,
        invalid: s.invalid_assignments,
        total: s.total_possible_assignments
      }))
  }, [comparisonData])

  // Recharts Data 3: Rook Coefficients Spectrum when dimensions match
  const rookComparisonChartData = useMemo(() => {
    if (!comparisonData?.scenarios || !comparisonData.are_dimensions_compatible) return []
    const valid = comparisonData.scenarios.filter((s) => s.is_valid_config)
    if (valid.length < 2) return []

    const maxDegree = Math.max(...valid.map((s) => s.polynomial_degree))
    const rows = []
    for (let k = 0; k <= maxDegree; k++) {
      const row = { k: `r${k}` }
      valid.forEach((s) => {
        row[s.id] = s.rook_coefficients[k] || 0
      })
      rows.push(row)
    }
    return rows
  }, [comparisonData])

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ----------------- 1. SCENARIO SELECTION TOOLBAR ----------------- */}
      <Card className="p-4 space-y-4 bg-gw-bg-secondary/70 border-[#1e3a5f]/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e3a5f]/40">
          <div>
            <h3 className="gw-card-heading flex items-center gap-2">
              <Scale className="w-4 h-4 text-gw-cyan" />
              <span>Multi-Scenario Selection Hub</span>
            </h3>
            <p className="text-xs text-gw-text-secondary mt-0.5">
              Select two or more scenarios to compare mathematical properties, restriction matrices, and allocation feasibility side-by-side.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              icon={RotateCcw}
              onClick={handleReset}
              disabled={selectedIds.length === 0}
            >
              Reset
            </Button>
            <Button
              size="sm"
              icon={Scale}
              onClick={() => executeComparison(selectedIds)}
              disabled={selectedIds.length < 2 || isComparing}
            >
              {isComparing ? 'Comparing...' : `Compare (${selectedIds.length})`}
            </Button>
            <Button
              size="sm"
              variant="outline"
              icon={Download}
              onClick={() => exportService.downloadComparisonCsv(selectedIds)}
              disabled={selectedIds.length < 2}
              title="Export scenario comparison metrics as CSV"
            >
              CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              icon={FileText}
              onClick={() => exportService.downloadComparisonPdf(selectedIds)}
              disabled={selectedIds.length < 2}
              title="Export publication-grade comparison report as PDF"
            >
              PDF Report
            </Button>
          </div>
        </div>

        {/* Available Scenarios Selector Pills */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gw-text-secondary font-mono">
            <span>Available Scenarios:</span>
            <span>{selectedIds.length} of {allSimulations.length} selected (min 2)</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {allSimulations.map((sim) => {
              const isSelected = selectedIds.includes(sim.id)
              const fCount = sim.selected_flights?.length || 0
              const gCount = sim.selected_gates?.length || 0
              const isSquare = fCount > 0 && fCount === gCount

              return (
                <button
                  key={sim.id}
                  type="button"
                  onClick={() => handleToggleSelect(sim.id)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-gw-cyan/15 border-gw-cyan text-gw-cyan font-bold shadow-sm shadow-gw-cyan/20'
                      : 'bg-gw-bg-secondary border-[#1e3a5f]/70 text-gw-text-secondary hover:text-gw-text hover:border-white/20'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: isSelected ? '#00f0ff' : '#64748b' }} />
                  <span>{sim.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/30 border border-white/5">
                    {sim.id} [{fCount}×{gCount}]
                  </span>
                  {isSelected && <X className="w-3 h-3 ml-0.5" />}
                </button>
              )
            })}
          </div>
        </div>

        {selectedIds.length < 2 && (
          <div className="p-2.5 rounded-lg bg-gw-cyan/5 border border-gw-cyan/20 text-xs text-gw-cyan flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>Select at least 2 simulation scenarios to generate comparative analytics.</span>
          </div>
        )}
      </Card>

      {/* Error state */}
      {error && (
        <div className="p-3.5 rounded-xl bg-gw-danger/10 border border-gw-danger/30 text-xs text-gw-danger flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold">Comparison Error:</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* ----------------- 2. COMPARISON SUMMARY CARDS ----------------- */}
      {comparisonData?.scenarios && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="gw-section-heading flex items-center gap-2">
                <Layers className="w-4 h-4 text-gw-cyan" />
                <span>Comparative Scenario Cards</span>
              </h3>
              <span className="text-xs text-gw-text-secondary font-mono">
                {comparisonData.scenarios.length} Scenarios Evaluated
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                icon={Download}
                onClick={() => exportService.downloadComparisonCsv(selectedIds)}
                title="Download comparative metrics dataset as CSV"
              >
                Export CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                icon={FileText}
                onClick={() => exportService.downloadComparisonPdf(selectedIds)}
                title="Download publication-grade multi-scenario comparison report as PDF"
              >
                Export PDF Report
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {comparisonData.scenarios.map((sim, idx) => {
              const color = SCENARIO_PALETTE[idx % SCENARIO_PALETTE.length]
              return (
                <Card
                  key={sim.id}
                  className="space-y-4 hover:border-white/30 transition-all flex flex-col justify-between"
                  style={{ borderTop: `3px solid ${color}` }}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold" style={{ color }}>
                            {sim.id}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-gw-text-secondary">
                            {sim.is_valid_config ? `${sim.matrix_size}×${sim.matrix_size}` : 'Unbalanced'}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-gw-text mt-0.5">{sim.name}</h4>
                      </div>
                      <Badge variant={sim.is_feasible ? 'success' : sim.is_valid_config ? 'warning' : 'danger'} size="sm">
                        {sim.is_feasible ? 'Feasible' : sim.is_valid_config ? '0 Valid' : 'Incomplete'}
                      </Badge>
                    </div>

                    {sim.is_valid_config ? (
                      <div className="space-y-2 pt-2 text-xs font-mono">
                        <div className="flex items-center justify-between text-gw-text-secondary pb-1 border-b border-[#1e3a5f]/40">
                          <span>Feasibility Ratio:</span>
                          <strong className="text-sm font-bold" style={{ color }}>
                            {sim.feasibility_percentage.toFixed(1)}%
                          </strong>
                        </div>

                        <div className="flex items-center justify-between text-gw-text-secondary">
                          <span>Exact Valid (N):</span>
                          <span className="text-gw-success font-bold">
                            {sim.exact_valid_assignments.toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-gw-text-secondary">
                          <span>Permutations (n!):</span>
                          <span className="text-gw-text">
                            {sim.total_possible_assignments.toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-gw-text-secondary">
                          <span>Forbidden Cells:</span>
                          <span className="text-gw-warning">
                            {sim.forbidden_count} ({sim.restriction_density}%)
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-gw-text-secondary">
                          <span>Rook Degree:</span>
                          <span className="text-gw-cyan">deg {sim.polynomial_degree}</span>
                        </div>

                        <div className="pt-2 text-[11px] text-gw-text-secondary border-t border-[#1e3a5f]/40 break-all font-mono">
                          <span className="text-gw-warning">{sim.rook_polynomial}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-gw-danger/10 border border-gw-danger/20 text-xs text-gw-danger">
                        {sim.validation_message}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#1e3a5f]/40 flex items-center justify-between text-xs">
                    <Link to={`/simulator?sim=${sim.id}`} className="text-gw-cyan hover:underline flex items-center gap-1">
                      <span>Simulate</span>
                      <PlayCircle className="w-3.5 h-3.5" />
                    </Link>
                    <Link to={`/restrictions?sim=${sim.id}`} className="text-gw-text-secondary hover:text-gw-text flex items-center gap-1">
                      <span>Matrix</span>
                      <Grid3X3 className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* ----------------- 3. DETERMINISTIC RULE-BASED INSIGHTS ----------------- */}
          {comparisonData.insights?.length > 0 && (
            <Card className="space-y-3 bg-gw-bg-secondary/70 border-[#1e3a5f]/60">
              <div className="flex items-center justify-between pb-2 border-b border-[#1e3a5f]/40">
                <h3 className="gw-card-heading flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-gw-cyan" />
                  <span>Deterministic Mathematical Insights</span>
                </h3>
                <Badge variant="cyan" size="sm" className="font-mono text-[10px]">
                  Rule-Based Derivations
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {comparisonData.insights.map((ins, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border space-y-1 ${
                      ins.severity === 'success'
                        ? 'bg-gw-success/5 border-gw-success/20 text-gw-text'
                        : ins.severity === 'warning'
                        ? 'bg-gw-warning/5 border-gw-warning/20 text-gw-text'
                        : 'bg-gw-cyan/5 border-gw-cyan/20 text-gw-text'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold font-mono text-[11px]">
                      <span
                        className={
                          ins.severity === 'success'
                            ? 'text-gw-success'
                            : ins.severity === 'warning'
                            ? 'text-gw-warning'
                            : 'text-gw-cyan'
                        }
                      >
                        ● {ins.title}
                      </span>
                    </div>
                    <p className="text-xs text-gw-text-secondary leading-relaxed">{ins.message}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ----------------- 4. VISUAL COMPARISON CHARTS ----------------- */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Chart 1: Restriction Density vs Feasibility (7 cols) */}
            <Card className="lg:col-span-7 space-y-3">
              <div className="pb-2 border-b border-[#1e3a5f]/40">
                <h4 className="text-xs font-bold text-gw-text uppercase font-mono tracking-wider">
                  Restriction Density vs. Feasibility Ratio
                </h4>
                <p className="text-[11px] text-gw-text-secondary mt-0.5">
                  Direct percentage comparison between board constraint severity and resulting valid assignment ratio.
                </p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparativeMetricsChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 100]} unit="%" />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="p-2.5 rounded-lg bg-gw-bg-secondary border border-[#1e3a5f] shadow-lg text-xs space-y-1 font-mono">
                              <div className="font-bold text-gw-text">{data.name} ({data.id})</div>
                              <div className="text-gw-warning">Density: {data.density}%</div>
                              <div className="text-gw-cyan">Feasibility: {data.feasibility}%</div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar dataKey="density" name="Restriction Density (%)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="feasibility" name="Feasibility Ratio (%)" fill="#00f0ff" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Chart 2: Rook Polynomial Spectra Comparison when dimensions match (5 cols) */}
            <Card className="lg:col-span-5 space-y-3">
              <div className="pb-2 border-b border-[#1e3a5f]/40">
                <h4 className="text-xs font-bold text-gw-text uppercase font-mono tracking-wider">
                  Rook Coefficient Spectrum Comparison
                </h4>
                <p className="text-[11px] text-gw-text-secondary mt-0.5">
                  {comparisonData.are_dimensions_compatible
                    ? 'Comparing rₖ placements across matching board dimensions.'
                    : 'Differing dimensions — polynomial spectra evaluated separately.'}
                </p>
              </div>

              {comparisonData.are_dimensions_compatible && rookComparisonChartData.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rookComparisonChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <XAxis dataKey="k" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="p-2.5 rounded-lg bg-gw-bg-secondary border border-[#1e3a5f] shadow-lg text-xs space-y-1 font-mono">
                                <div className="font-bold text-gw-warning">{payload[0].payload.k}</div>
                                {payload.map((p) => (
                                  <div key={p.dataKey} style={{ color: p.color }}>
                                    {p.dataKey}: {p.value.toLocaleString()} placements
                                  </div>
                                ))}
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      {comparisonData.scenarios.map((s, idx) => (
                        <Bar
                          key={s.id}
                          dataKey={s.id}
                          name={s.name.length > 12 ? `${s.id}` : s.name}
                          fill={SCENARIO_PALETTE[idx % SCENARIO_PALETTE.length]}
                          radius={[3, 3, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center p-4 text-center space-y-2 text-xs text-gw-text-secondary">
                  <AlertTriangle className="w-8 h-8 text-gw-warning" />
                  <p className="max-w-xs leading-relaxed">
                    Scenarios have different board dimensions (e.g. 6×6 vs 3×3). Direct Rook coefficient superposition is only defined for equal matrix dimensions.
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* ----------------- 5. CELL-BY-CELL RESTRICTION MATRIX DIFFERENCE ----------------- */}
          <Card className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e3a5f]/40">
              <div>
                <h3 className="gw-card-heading flex items-center gap-2">
                  <Grid3X3 className="w-4 h-4 text-gw-warning" />
                  <span>Restriction Matrix Difference Inspector</span>
                </h3>
                <p className="text-xs text-gw-text-secondary mt-0.5">
                  {comparisonData.matrix_comparison?.explanation}
                </p>
              </div>

              {comparisonData.matrix_comparison?.is_compatible && (
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-gw-success">
                    {comparisonData.matrix_comparison.identical_cells_count} Identical Cells
                  </span>
                  <span className="text-gw-warning">
                    {comparisonData.matrix_comparison.different_cells_count} Differing Cells
                  </span>
                </div>
              )}
            </div>

            {comparisonData.matrix_comparison?.is_compatible && comparisonData.matrix_comparison.difference_matrix ? (
              <div className="space-y-3">
                <div className="overflow-x-auto pb-2 flex justify-center">
                  <div className="inline-block p-4 rounded-xl bg-gw-bg-secondary border border-[#1e3a5f]/70">
                    <div
                      className="grid gap-1.5"
                      style={{
                        gridTemplateColumns: `repeat(${comparisonData.matrix_comparison.dimension}, minmax(36px, 1fr))`
                      }}
                    >
                      {comparisonData.matrix_comparison.difference_matrix.map((row, r) =>
                        row.map((cell, c) => {
                          let bgColor = 'bg-white/5 border-white/10 text-gw-text-secondary'
                          let label = '0'
                          if (cell > 0) {
                            bgColor = 'bg-gw-warning/20 border-gw-warning text-gw-warning font-bold'
                            label = '+1'
                          } else if (cell < 0) {
                            bgColor = 'bg-gw-cyan/20 border-gw-cyan text-gw-cyan font-bold'
                            label = '-1'
                          }

                          return (
                            <div
                              key={`${r}-${c}`}
                              className={`w-9 h-9 rounded flex items-center justify-center border font-mono text-xs ${bgColor}`}
                              title={`Row ${r}, Col ${c}: difference = ${cell}`}
                            >
                              {label}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-4 text-xs font-mono pt-1 text-gw-text-secondary">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-white/5 border border-white/10" />
                    <span>0: Identical Cell Constraint</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-gw-warning/20 border border-gw-warning" />
                    <span>+1: Restricted in Scenario A, Allowed in B</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-gw-cyan/20 border border-gw-cyan" />
                    <span>-1: Allowed in Scenario A, Restricted in B</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-lg bg-gw-bg-secondary/50 border border-[#1e3a5f]/40 text-center text-xs text-gw-text-secondary">
                {comparisonData.matrix_comparison?.explanation}
              </div>
            )}
          </Card>

          {/* ----------------- 6. COMPARATIVE MATHEMATICAL TABLE ----------------- */}
          <Card className="p-0 overflow-hidden border-[#1e3a5f]/60">
            <div className="p-3.5 bg-gw-bg-secondary/70 border-b border-[#1e3a5f]/40">
              <h3 className="gw-card-heading text-xs uppercase font-mono tracking-wider">
                Comprehensive Mathematical Metrics Side-by-Side
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-[#1e3a5f]/40 font-mono">
                <thead className="bg-gw-bg-secondary/40 text-gw-text-secondary text-[10px] uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Metric</th>
                    {comparisonData.scenarios.map((s, idx) => (
                      <th key={s.id} className="py-2.5 px-3" style={{ color: SCENARIO_PALETTE[idx % SCENARIO_PALETTE.length] }}>
                        {s.name} ({s.id})
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e3a5f]/30">
                  <tr>
                    <td className="py-2 px-3 text-gw-text-secondary">Problem Size (n × n)</td>
                    {comparisonData.scenarios.map((s) => (
                      <td key={s.id} className="py-2 px-3 text-gw-text">
                        {s.is_valid_config ? `${s.matrix_size} × ${s.matrix_size}` : 'Unbalanced'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-gw-text-secondary">Restriction Density</td>
                    {comparisonData.scenarios.map((s) => (
                      <td key={s.id} className="py-2 px-3 text-gw-warning">
                        {s.is_valid_config ? `${s.restriction_density}% (${s.forbidden_count} forbidden)` : '—'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-gw-text-secondary">Unrestricted Permutations (n!)</td>
                    {comparisonData.scenarios.map((s) => (
                      <td key={s.id} className="py-2 px-3 text-gw-text">
                        {s.is_valid_config ? s.total_possible_assignments.toLocaleString() : '—'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-gw-text-secondary">Exact Valid Assignments (N)</td>
                    {comparisonData.scenarios.map((s) => (
                      <td key={s.id} className="py-2 px-3 font-bold text-gw-success">
                        {s.is_valid_config ? s.exact_valid_assignments.toLocaleString() : '—'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-gw-text-secondary">Infeasible States (n! - N)</td>
                    {comparisonData.scenarios.map((s) => (
                      <td key={s.id} className="py-2 px-3 text-gw-text-secondary">
                        {s.is_valid_config ? s.invalid_assignments.toLocaleString() : '—'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-gw-text-secondary">Feasibility Percentage</td>
                    {comparisonData.scenarios.map((s) => (
                      <td key={s.id} className="py-2 px-3 font-bold text-gw-cyan">
                        {s.is_valid_config ? `${s.feasibility_percentage.toFixed(1)}%` : '—'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-gw-text-secondary">Rook Polynomial Degree</td>
                    {comparisonData.scenarios.map((s) => (
                      <td key={s.id} className="py-2 px-3 text-gw-text">
                        {s.is_valid_config ? `deg ${s.polynomial_degree}` : '—'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-gw-text-secondary">Rook Polynomial R(B, x)</td>
                    {comparisonData.scenarios.map((s) => (
                      <td key={s.id} className="py-2 px-3 text-gw-warning text-[11px] max-w-xs truncate" title={s.rook_polynomial}>
                        {s.is_valid_config ? s.rook_polynomial : '—'}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

export default ScenarioComparisonView
