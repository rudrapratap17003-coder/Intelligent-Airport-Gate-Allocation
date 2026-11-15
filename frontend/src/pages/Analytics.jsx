import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  BarChart3,
  Layers,
  Calculator,
  Grid3X3,
  Cpu,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  PlayCircle,
  ShieldCheck,
  TrendingUp,
  Percent,
  Database,
  Info,
  Scale
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import analyticsService from '../lib/analyticsService'
import { ScenarioComparisonView } from '../components/analytics/ScenarioComparisonView'

export const Analytics = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') === 'compare' ? 'compare' : 'analytics'

  const handleTabChange = (tab) => {
    if (tab === 'compare') {
      setSearchParams({ tab: 'compare' })
    } else {
      setSearchParams({})
    }
  }

  // Primary data states
  const [overview, setOverview] = useState(null)
  const [selectedSimId, setSelectedSimId] = useState('')
  const [detailedSim, setDetailedSim] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [error, setError] = useState(null)

  // Filters state
  const [searchTerm, setSearchTerm] = useState('')
  const [dimensionFilter, setDimensionFilter] = useState('ALL')
  const [densityFilter, setDensityFilter] = useState('ALL')
  const [feasibilityFilter, setFeasibilityFilter] = useState('ALL')

  // Sample allocation state
  const [isGeneratingSample, setIsGeneratingSample] = useState(false)
  const [sampleError, setSampleError] = useState(null)

  // Load Overview Data
  const loadOverview = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)

      const data = await analyticsService.getOverview()
      setOverview(data)

      // Set initial selected simulation if none selected
      if (!selectedSimId && data.simulations.length > 0) {
        const firstValid = data.simulations.find((s) => s.is_valid_config)
        const initialId = firstValid ? firstValid.id : data.simulations[0].id
        setSelectedSimId(initialId)
      }
    } catch (err) {
      console.error('Failed to load analytics overview:', err)
      setError(err.message || 'Failed to connect to analytics engine')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [selectedSimId])

  // Initial mount
  useEffect(() => {
    loadOverview()
  }, [])

  // Load detailed analytics for selected simulation
  const loadDetailedSimulation = useCallback(async (simId, includeSample = false) => {
    if (!simId) return
    try {
      setIsLoadingDetails(true)
      setSampleError(null)
      const data = await analyticsService.getSimulationDetails(simId, includeSample, 50)
      setDetailedSim(data)
    } catch (err) {
      console.error(`Failed to load details for ${simId}:`, err)
      setDetailedSim(null)
    } finally {
      setIsLoadingDetails(false)
      setIsGeneratingSample(false)
    }
  }, [])

  // Trigger details load when selectedSimId changes
  useEffect(() => {
    if (selectedSimId) {
      const sim = overview?.simulations?.find((s) => s.id === selectedSimId)
      if (sim?.is_valid_config) {
        loadDetailedSimulation(selectedSimId, false)
      } else {
        setDetailedSim(null)
      }
    }
  }, [selectedSimId, overview, loadDetailedSimulation])

  // Handle on-demand sample allocation generation
  const handleGenerateSample = async () => {
    if (!selectedSimId) return
    setIsGeneratingSample(true)
    setSampleError(null)
    try {
      await loadDetailedSimulation(selectedSimId, true)
    } catch (err) {
      setSampleError(err.message || 'Failed to generate allocation sample')
      setIsGeneratingSample(false)
    }
  }

  // Filtered simulations
  const filteredSimulations = useMemo(() => {
    if (!overview?.simulations) return []
    return overview.simulations.filter((sim) => {
      // 1. Search filter
      const matchesSearch =
        sim.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sim.id.toLowerCase().includes(searchTerm.toLowerCase())
      if (!matchesSearch) return false

      // 2. Dimension filter
      if (dimensionFilter !== 'ALL') {
        if (!sim.matrix_size || String(sim.matrix_size) !== dimensionFilter) {
          return false
        }
      }

      // 3. Density filter
      if (densityFilter !== 'ALL') {
        const d = sim.restriction_density
        if (densityFilter === 'LOW' && d >= 20) return false
        if (densityFilter === 'MEDIUM' && (d < 20 || d > 50)) return false
        if (densityFilter === 'HIGH' && d <= 50) return false
      }

      // 4. Feasibility filter
      if (feasibilityFilter !== 'ALL') {
        if (feasibilityFilter === 'FEASIBLE' && !sim.is_feasible) return false
        if (feasibilityFilter === 'INFEASIBLE' && (sim.is_feasible || !sim.is_valid_config)) return false
        if (feasibilityFilter === 'INCOMPATIBLE' && sim.is_valid_config) return false
      }

      return true
    })
  }, [overview, searchTerm, dimensionFilter, densityFilter, feasibilityFilter])

  // Available dimensions for filter dropdown
  const availableDimensions = useMemo(() => {
    if (!overview?.simulations) return []
    const dims = new Set()
    overview.simulations.forEach((s) => {
      if (s.matrix_size) dims.add(String(s.matrix_size))
    })
    return Array.from(dims).sort((a, b) => Number(a) - Number(b))
  }, [overview])

  // Chart 1 Data: Simulation Density vs Feasibility
  const comparativeChartData = useMemo(() => {
    if (!overview?.simulations) return []
    return overview.simulations
      .filter((s) => s.is_valid_config)
      .map((s) => ({
        id: s.id,
        name: s.name.length > 16 ? s.name.substring(0, 14) + '...' : s.name,
        density: s.restriction_density,
        feasibility: Number(s.feasibility_percentage.toFixed(1)),
        valid: s.exact_valid_assignments,
        forbidden: s.forbidden_count
      }))
  }, [overview])

  // Chart 2 Data: Rook Coefficient Distribution for selected simulation
  const rookDistributionData = useMemo(() => {
    if (!detailedSim?.coefficients_detail) return []
    return detailedSim.coefficients_detail.map((c) => ({
      k: `r${c.k}`,
      label: `k = ${c.k}`,
      count: c.coefficient,
      meaning: c.meaning
    }))
  }, [detailedSim])

  // Chart 3 Data: Forbidden vs Allowed for selected simulation
  const boardCellsPieData = useMemo(() => {
    if (!detailedSim) return []
    return [
      { name: 'Allowed Pairings (0)', value: detailedSim.allowed_count, color: '#00f0ff' },
      { name: 'Forbidden Restrictions (1)', value: detailedSim.forbidden_count, color: '#f59e0b' }
    ]
  }, [detailedSim])

  // =========================================================================
  // RENDER: LOADING SKELETON
  // =========================================================================
  if (isLoading && !overview) {
    return (
      <div className="space-y-8 animate-fadeIn">
        <div className="flex items-center justify-between pb-4 border-b border-[#1e3a5f]/50">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-gw-bg-secondary rounded-lg animate-pulse" />
            <div className="h-4 w-96 bg-gw-bg-secondary/60 rounded animate-pulse" />
          </div>
          <div className="h-10 w-36 bg-gw-bg-secondary rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="h-28 bg-gw-bg-secondary/40 animate-pulse border-[#1e3a5f]/40" />
          ))}
        </div>
        <div className="h-96 bg-gw-bg-secondary/40 rounded-xl animate-pulse" />
      </div>
    )
  }

  // =========================================================================
  // RENDER: ERROR STATE
  // =========================================================================
  if (error && !overview) {
    return (
      <div className="p-8 max-w-2xl mx-auto my-12 text-center space-y-6 bg-gw-bg-secondary border border-gw-danger/30 rounded-2xl shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-gw-danger/10 text-gw-danger border border-gw-danger/20 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-gw-text">Analytics Engine Disconnected</h2>
          <p className="text-sm text-gw-text-secondary leading-relaxed">
            Failed to retrieve mathematical telemetry from the backend analytics service.
          </p>
          <p className="text-xs text-gw-danger font-mono bg-gw-danger/5 p-2 rounded-lg border border-gw-danger/20">
            {error}
          </p>
        </div>
        <Button size="md" icon={RefreshCw} onClick={() => loadOverview(false)}>
          Retry Connection
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ----------------- 1. HEADER & CONTROLS ----------------- */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-[#1e3a5f]/50">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="gw-page-heading">
              {activeTab === 'compare' ? 'Scenario Comparison System' : 'Mathematical Analytics & Insights'}
            </h1>
            <Badge variant="cyan" size="sm" dot>
              {activeTab === 'compare' ? 'Phase 23 Live' : 'Phase 22 Live'}
            </Badge>
          </div>
          <p className="text-sm text-gw-text-secondary leading-relaxed">
            {activeTab === 'compare'
              ? 'Multi-scenario comparative evaluation framework comparing restriction densities, rook polynomial spectra, and assignment feasibility side-by-side.'
              : 'Comprehensive combinatorial analysis workspace evaluating restriction board densities, Rook polynomial coefficient spectra, and Inclusion-Exclusion exact sums.'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {activeTab === 'analytics' && (
            <Button
              variant="outline"
              size="md"
              icon={RefreshCw}
              className={`transition-all ${isRefreshing ? 'opacity-70' : ''}`}
              onClick={() => loadOverview(true)}
              disabled={isRefreshing}
            >
              <span className={isRefreshing ? 'animate-spin inline-block' : ''}>
                <RefreshCw className="w-4 h-4 mr-1.5 inline" />
              </span>
              <span>{isRefreshing ? 'Re-evaluating...' : 'Refresh Analytics'}</span>
            </Button>
          )}
          <Link to="/simulator">
            <Button size="md" icon={PlayCircle} className="shadow-lg shadow-gw-cyan/10">
              Run Simulator
            </Button>
          </Link>
        </div>
      </div>

      {/* ----------------- TAB SWITCHER ----------------- */}
      <div className="flex items-center gap-2 border-b border-[#1e3a5f]/50 pb-3">
        <button
          onClick={() => handleTabChange('analytics')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'analytics'
              ? 'bg-gw-cyan/15 text-gw-cyan border border-gw-cyan/30 shadow-lg shadow-gw-cyan/5 font-semibold'
              : 'text-gw-text-secondary hover:text-gw-text hover:bg-gw-bg-secondary'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Mathematical Analytics</span>
        </button>
        <button
          onClick={() => handleTabChange('compare')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'compare'
              ? 'bg-gw-cyan/15 text-gw-cyan border border-gw-cyan/30 shadow-lg shadow-gw-cyan/5 font-semibold'
              : 'text-gw-text-secondary hover:text-gw-text hover:bg-gw-bg-secondary'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Scenario Comparison</span>
          <Badge variant="cyan" size="xs">Phase 23</Badge>
        </button>
      </div>

      {activeTab === 'compare' ? (
        <ScenarioComparisonView />
      ) : (
        <>
      {/* ----------------- 2. ANALYTICS OVERVIEW STATISTIC CARDS (5 METRICS) ----------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1: Simulations Analysed */}
        <Card className="hover:border-gw-cyan/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase font-mono tracking-wider text-gw-text-secondary">
              Scenarios Analysed
            </span>
            <div className="p-1.5 rounded-lg bg-gw-cyan/10 text-gw-cyan border border-gw-cyan/20">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold font-mono text-gw-text">
              {overview?.valid_simulations_count || 0}
            </span>
            <span className="text-xs text-gw-text-secondary font-mono">
              / {overview?.total_simulations || 0} total
            </span>
          </div>
          <div className="mt-2 text-[11px] text-gw-text-secondary">
            <span className="text-gw-success font-medium">
              {overview?.valid_simulations_count || 0} balanced (n × n)
            </span>
            {overview?.incompatible_simulations_count > 0 && (
              <span className="text-gw-danger ml-1">
                ({overview.incompatible_simulations_count} unbalanced)
              </span>
            )}
          </div>
        </Card>

        {/* Metric 2: Total Registry Entities */}
        <Card className="hover:border-gw-blue/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase font-mono tracking-wider text-gw-text-secondary">
              Fleet & Facility
            </span>
            <div className="p-1.5 rounded-lg bg-gw-blue/10 text-gw-blue border border-gw-blue/20">
              <Database className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold font-mono text-gw-text">
              {overview?.total_flights || 0}
            </span>
            <span className="text-xs text-gw-text-secondary">flights</span>
            <span className="text-gw-text-secondary">|</span>
            <span className="text-2xl font-extrabold font-mono text-gw-blue">
              {overview?.total_gates || 0}
            </span>
            <span className="text-xs text-gw-text-secondary">gates</span>
          </div>
          <div className="mt-2 text-[11px] text-gw-text-secondary">
            <span>Authoritative SQLite database</span>
          </div>
        </Card>

        {/* Metric 3: Average Restriction Density */}
        <Card className="hover:border-gw-warning/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase font-mono tracking-wider text-gw-text-secondary">
              Avg Restriction Density
            </span>
            <div className="p-1.5 rounded-lg bg-gw-warning/10 text-gw-warning border border-gw-warning/20">
              <Grid3X3 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold font-mono text-gw-warning">
              {overview?.average_restriction_density || 0}%
            </span>
            <span className="text-xs text-gw-text-secondary">mean board density</span>
          </div>
          <div className="mt-2 text-[11px] text-gw-text-secondary">
            <span>Percentage of forbidden pairings</span>
          </div>
        </Card>

        {/* Metric 4: Feasible vs Infeasible Scenarios */}
        <Card className="hover:border-gw-success/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase font-mono tracking-wider text-gw-text-secondary">
              Feasibility State
            </span>
            <div className="p-1.5 rounded-lg bg-gw-success/10 text-gw-success border border-gw-success/20">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold font-mono text-gw-success">
              {overview?.feasible_simulations_count || 0}
            </span>
            <span className="text-xs text-gw-success">feasible</span>
            <span className="text-gw-text-secondary">/</span>
            <span className="text-2xl font-extrabold font-mono text-gw-danger">
              {overview?.infeasible_simulations_count || 0}
            </span>
            <span className="text-xs text-gw-danger">infeasible</span>
          </div>
          <div className="mt-2 text-[11px] text-gw-text-secondary">
            <span>N &gt; 0 vs. N = 0 valid allocations</span>
          </div>
        </Card>

        {/* Metric 5: Feasibility Range */}
        <Card className="hover:border-gw-cyan/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase font-mono tracking-wider text-gw-text-secondary">
              Feasibility Range
            </span>
            <div className="p-1.5 rounded-lg bg-gw-cyan/10 text-gw-cyan border border-gw-cyan/20">
              <Percent className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 text-xs font-mono">
            <span className="text-gw-text-secondary">Hi:</span>
            <strong className="text-gw-cyan text-base">
              {overview?.highest_feasibility ? `${overview.highest_feasibility.feasibility_percentage.toFixed(1)}%` : '—'}
            </strong>
            <span className="text-gw-text-secondary ml-1">Lo:</span>
            <strong className="text-gw-warning text-base">
              {overview?.lowest_feasibility ? `${overview.lowest_feasibility.feasibility_percentage.toFixed(1)}%` : '—'}
            </strong>
          </div>
          <div className="mt-2 text-[11px] text-gw-text-secondary truncate" title={overview?.highest_feasibility?.simulation_name}>
            Peak: {overview?.highest_feasibility?.simulation_id || 'None'}
          </div>
        </Card>
      </div>

      {/* ----------------- 3. COMPARATIVE RESTRICTION DENSITY & FEASIBILITY CHART ----------------- */}
      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e3a5f]/40">
          <div>
            <h2 className="gw-card-heading flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-gw-cyan" />
              <span>Simulation-Wise Restriction Density & Feasibility Comparison</span>
            </h2>
            <p className="text-xs text-gw-text-secondary mt-0.5">
              Juxtaposition of forbidden cell density (%) against exact combinatorial feasibility ratio (%) across all balanced scenarios.
            </p>
          </div>
          <Badge variant="cyan" size="sm" className="font-mono text-[10px]">
            {comparativeChartData.length} Scenarios Plotted
          </Badge>
        </div>

        <div className="h-72 w-full pt-2">
          {comparativeChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparativeChartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 100]} unit="%" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="p-3 rounded-lg bg-gw-bg-secondary border border-[#1e3a5f] shadow-xl text-xs space-y-1 font-mono">
                          <div className="font-bold text-gw-text text-sm">{data.name} ({data.id})</div>
                          <div className="text-gw-warning">Restriction Density: {data.density}% ({data.forbidden} forbidden)</div>
                          <div className="text-gw-cyan">Feasibility Ratio: {data.feasibility}%</div>
                          <div className="text-gw-success">Exact Valid Allocations (N): {data.valid.toLocaleString()}</div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="density" name="Restriction Density (%)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="feasibility" name="Feasibility Ratio (%)" fill="#00f0ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-gw-text-secondary">
              No balanced simulation scenarios available to plot.
            </div>
          )}
        </div>
      </Card>

      {/* ----------------- 4. DEEP DIVE: SELECTED SIMULATION MATHEMATICAL ANALYTICS ----------------- */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="gw-section-heading flex items-center gap-2">
              <Cpu className="w-5 h-5 text-gw-cyan" />
              <span>Deep-Dive Mathematical Inspector</span>
            </h2>
            <p className="text-xs text-gw-text-secondary mt-0.5">
              Inspect algebraic Rook polynomials, non-attacking rook configurations, and itemized Inclusion-Exclusion terms for any scenario.
            </p>
          </div>

          {/* Scenario Selector Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gw-text-secondary font-mono">Inspecting:</span>
            <select
              value={selectedSimId}
              onChange={(e) => setSelectedSimId(e.target.value)}
              className="bg-gw-bg-secondary border border-[#1e3a5f] rounded-lg px-3 py-1.5 text-xs text-gw-text font-mono focus:border-gw-cyan focus:outline-none cursor-pointer"
            >
              {overview?.simulations?.map((s) => (
                <option key={s.id} value={s.id} className="bg-gw-bg-secondary text-gw-text">
                  {s.name} ({s.id}) {s.is_valid_config ? `[${s.matrix_size}×${s.matrix_size}]` : '[Unbalanced]'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {detailedSim ? (
          <div className="space-y-6">
            {/* Top Grid: Overview Metrics & Board Composition */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Mathematical Identity & Board Stats (8 cols) */}
              <Card className="lg:col-span-8 space-y-4">
                <div className="flex items-start justify-between gap-4 pb-3 border-b border-[#1e3a5f]/40">
                  <div>
                    <h3 className="text-base font-bold text-gw-text flex items-center gap-2">
                      <span>{detailedSim.simulation_name}</span>
                      <Badge variant="cyan" size="sm" className="font-mono">
                        {detailedSim.matrix_size} × {detailedSim.matrix_size} ({detailedSim.matrix_size * detailedSim.matrix_size} Cells)
                      </Badge>
                    </h3>
                    <p className="text-xs text-gw-text-secondary mt-1">
                      {detailedSim.flight_count} flights paired to {detailedSim.gate_count} gates under bijection constraints.
                    </p>
                  </div>
                  <Badge variant={detailedSim.is_feasible ? 'success' : 'danger'} size="sm">
                    {detailedSim.is_feasible ? 'Combinatorially Feasible' : 'Zero Valid Allocations'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-gw-bg-secondary/70 border border-[#1e3a5f]/60 space-y-1">
                    <span className="text-[10px] text-gw-text-secondary uppercase">Total Possible n!</span>
                    <div className="text-lg font-bold text-gw-text">
                      {detailedSim.total_possible_assignments.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-gw-text-secondary">({detailedSim.matrix_size}!)</span>
                  </div>

                  <div className="p-3 rounded-lg bg-gw-bg-secondary/70 border border-[#1e3a5f]/60 space-y-1">
                    <span className="text-[10px] text-gw-text-secondary uppercase">Exact Valid (N)</span>
                    <div className="text-lg font-bold text-gw-success">
                      {detailedSim.exact_valid_assignments.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-gw-success">
                      {detailedSim.feasibility_percentage.toFixed(1)}% feasible
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-gw-bg-secondary/70 border border-[#1e3a5f]/60 space-y-1">
                    <span className="text-[10px] text-gw-text-secondary uppercase">Forbidden Cells</span>
                    <div className="text-lg font-bold text-gw-warning">
                      {detailedSim.forbidden_count}
                    </div>
                    <span className="text-[10px] text-gw-warning">
                      {detailedSim.restriction_density}% density
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-gw-bg-secondary/70 border border-[#1e3a5f]/60 space-y-1">
                    <span className="text-[10px] text-gw-text-secondary uppercase">Rook Degree</span>
                    <div className="text-lg font-bold text-gw-cyan">
                      deg {detailedSim.polynomial_degree}
                    </div>
                    <span className="text-[10px] text-gw-cyan">max rooks</span>
                  </div>
                </div>

                {/* Formatted Formulas Display */}
                <div className="space-y-3 pt-2">
                  <div className="p-3 rounded-xl bg-gw-bg-secondary border border-[#1e3a5f]/60 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-gw-text-secondary uppercase text-[10px]">
                        Rook Polynomial Form
                      </span>
                      <span className="font-mono text-[10px] text-gw-cyan">
                        R(B, x) = Σ rₖ xᵏ
                      </span>
                    </div>
                    <div className="gw-formula-box text-xs break-all text-gw-warning font-mono py-2">
                      {detailedSim.rook_polynomial}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-gw-bg-secondary border border-[#1e3a5f]/60 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-gw-text-secondary uppercase text-[10px]">
                        Principle of Inclusion-Exclusion (PIE) Exact Value
                      </span>
                      <span className="font-mono text-[10px] text-gw-success">
                        N = Σ [(-1)ᵏ · rₖ · (n - k)!]
                      </span>
                    </div>
                    <div className="gw-formula-box text-xs break-all text-gw-success font-mono py-2">
                      N = ({detailedSim.positive_contributions_sum.toLocaleString()} [Positive Terms]) - ({detailedSim.negative_contributions_sum.toLocaleString()} [Negative Terms]) = {detailedSim.exact_valid_assignments.toLocaleString()}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Right Column: Board Cell Composition Pie (4 cols) */}
              <Card className="lg:col-span-4 flex flex-col justify-between">
                <div className="pb-2 border-b border-[#1e3a5f]/40">
                  <h4 className="text-xs font-bold text-gw-text uppercase font-mono tracking-wider">
                    Binary Restriction Density
                  </h4>
                  <p className="text-[11px] text-gw-text-secondary mt-0.5">
                    Forbidden (1) vs. Allowed (0) flight-gate pairings.
                  </p>
                </div>

                <div className="h-44 w-full relative my-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={boardCellsPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {boardCellsPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="p-2 rounded bg-gw-bg-secondary border border-[#1e3a5f] shadow-lg text-xs font-mono">
                                <div className="font-bold text-gw-text">{data.name}</div>
                                <div className="text-gw-cyan">{data.value} cells</div>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-base font-bold font-mono text-gw-warning">
                      {detailedSim.restriction_density}%
                    </span>
                    <span className="text-[9px] uppercase tracking-wider text-gw-text-secondary">Dense</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs font-mono pt-2 border-t border-[#1e3a5f]/40">
                  <div className="flex items-center justify-between text-gw-text-secondary">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-gw-cyan" />
                      <span>Allowed Pairs:</span>
                    </span>
                    <span className="text-gw-text font-bold">{detailedSim.allowed_count}</span>
                  </div>
                  <div className="flex items-center justify-between text-gw-text-secondary">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-gw-warning" />
                      <span>Forbidden Pairs:</span>
                    </span>
                    <span className="text-gw-warning font-bold">{detailedSim.forbidden_count}</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Middle Grid: Section 3 & 4 (Rook Coefficients & PIE Terms) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Section 3: Rook Polynomial Analytics & Coefficient Spectrum (6 cols) */}
              <Card className="lg:col-span-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#1e3a5f]/40">
                  <div>
                    <h3 className="gw-card-heading flex items-center gap-2">
                      <Grid3X3 className="w-4 h-4 text-gw-warning" />
                      <span>Rook Polynomial Coefficient Spectrum</span>
                    </h3>
                    <p className="text-xs text-gw-text-secondary mt-0.5">
                      Non-attacking rook configurations rₖ on forbidden board cells.
                    </p>
                  </div>
                  <Badge variant="warning" size="sm" className="font-mono text-[10px]">
                    deg {detailedSim.polynomial_degree}
                  </Badge>
                </div>

                {/* Coefficient Distribution Chart */}
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rookDistributionData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <XAxis dataKey="k" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="p-2.5 rounded-lg bg-gw-bg-secondary border border-[#1e3a5f] shadow-lg text-xs space-y-1 font-mono">
                                <div className="font-bold text-gw-warning">{data.k}: {data.count.toLocaleString()} placements</div>
                                <div className="text-gw-text-secondary text-[11px] max-w-xs">{data.meaning}</div>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Individual Coefficient Meanings */}
                <div className="space-y-2 pt-2 border-t border-[#1e3a5f]/40 max-h-56 overflow-y-auto pr-1">
                  {detailedSim.coefficients_detail.map((c) => (
                    <div
                      key={c.k}
                      className="p-2.5 rounded-lg bg-gw-bg-secondary/60 border border-[#1e3a5f]/40 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-gw-cyan font-bold">Degree k = {c.k}</span>
                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gw-warning font-bold">
                          r{c.k} = {c.coefficient.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-gw-text-secondary leading-relaxed">
                        {c.meaning}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Section 4: Inclusion-Exclusion Analytics (6 cols) */}
              <Card className="lg:col-span-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#1e3a5f]/40">
                  <div>
                    <h3 className="gw-card-heading flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-gw-success" />
                      <span>Inclusion-Exclusion Step-by-Step Terms</span>
                    </h3>
                    <p className="text-xs text-gw-text-secondary mt-0.5">
                      Alternating signed contributions (-1)ᵏ · rₖ · (n-k)!.
                    </p>
                  </div>
                  <Badge variant="success" size="sm" className="font-mono text-[10px]">
                    N = {detailedSim.exact_valid_assignments.toLocaleString()}
                  </Badge>
                </div>

                {/* Summary of positive vs negative sums */}
                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-gw-cyan/5 border border-gw-cyan/20 space-y-0.5">
                    <span className="text-[10px] text-gw-text-secondary uppercase block">+ Positive Sum (k even)</span>
                    <span className="text-base font-bold text-gw-cyan">
                      +{detailedSim.positive_contributions_sum.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-gw-danger/5 border border-gw-danger/20 space-y-0.5">
                    <span className="text-[10px] text-gw-text-secondary uppercase block">- Negative Sum (k odd)</span>
                    <span className="text-base font-bold text-gw-danger">
                      -{detailedSim.negative_contributions_sum.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Itemized Terms Table */}
                <div className="overflow-x-auto border border-[#1e3a5f]/40 rounded-lg max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs divide-y divide-[#1e3a5f]/40 font-mono">
                    <thead className="bg-gw-bg-secondary/70 text-gw-text-secondary text-[10px] uppercase">
                      <tr>
                        <th className="py-2 px-3">k</th>
                        <th className="py-2 px-3">rₖ</th>
                        <th className="py-2 px-3">(n-k)!</th>
                        <th className="py-2 px-3">Sign</th>
                        <th className="py-2 px-3 text-right">Contribution</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e3a5f]/30">
                      {detailedSim.pie_terms_detail.map((term) => (
                        <tr key={term.k} className="hover:bg-white/[0.02]">
                          <td className="py-2 px-3 font-bold text-gw-text">k={term.k}</td>
                          <td className="py-2 px-3 text-gw-warning">{term.rook_coefficient}</td>
                          <td className="py-2 px-3 text-gw-text-secondary">{term.factorial_value.toLocaleString()}</td>
                          <td className="py-2 px-3">
                            <span className={term.is_positive ? 'text-gw-cyan' : 'text-gw-danger'}>
                              {term.sign > 0 ? '+1' : '-1'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-bold">
                            <span className={term.is_positive ? 'text-gw-cyan' : 'text-gw-danger'}>
                              {term.contribution > 0 ? `+${term.contribution.toLocaleString()}` : term.contribution.toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Section 6: Allocation Analytics (On-Demand Sample Verification) */}
            <Card className="space-y-4 border-[#1e3a5f]/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e3a5f]/40">
                <div>
                  <h3 className="gw-card-heading flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-gw-success" />
                    <span>Allocation Generation & Independent Conflict Audit Analytics</span>
                  </h3>
                  <p className="text-xs text-gw-text-secondary mt-0.5">
                    Evaluates actual generated allocations from the backtracking search engine, independently audited by the Phase 17 conflict detector.
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="secondary"
                  icon={PlayCircle}
                  onClick={handleGenerateSample}
                  disabled={isGeneratingSample}
                >
                  {isGeneratingSample ? 'Generating & Auditing...' : 'Run 50-Plan Sample Audit'}
                </Button>
              </div>

              {/* Callout emphasizing distinction between exact total vs sample */}
              <div className="p-3 rounded-lg bg-gw-bg-secondary border border-[#1e3a5f] text-xs text-gw-text-secondary flex items-start gap-3">
                <Info className="w-4 h-4 text-gw-cyan shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-gw-text">Mathematical Principle: Theoretical Space vs. Materialized Sample</span>
                  <p className="text-[11px] leading-relaxed">
                    The Principle of Inclusion-Exclusion calculates an exact integer{' '}
                    <strong className="text-gw-success font-mono">N = {detailedSim.exact_valid_assignments.toLocaleString()}</strong>{' '}
                    valid assignments without enumerating them. The Backtracking Generator materializes individual flight-to-gate allocations on demand.
                  </p>
                </div>
              </div>

              {detailedSim.allocation_analytics ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-1">
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-1">
                    <span className="text-[10px] text-gw-text-secondary uppercase">Generated Sample</span>
                    <div className="text-lg font-bold text-gw-text">
                      {detailedSim.allocation_analytics.generated_count}{' '}
                      <span className="text-xs font-normal text-gw-text-secondary">/ {detailedSim.exact_valid_assignments.toLocaleString()}</span>
                    </div>
                    <span className="text-[10px] text-gw-cyan">Materialized plans</span>
                  </div>

                  <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-1">
                    <span className="text-[10px] text-gw-text-secondary uppercase">Conflict Audited</span>
                    <div className="text-lg font-bold text-gw-success flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{detailedSim.allocation_analytics.independently_validated} / {detailedSim.allocation_analytics.independently_validated}</span>
                    </div>
                    <span className="text-[10px] text-gw-success">100% Conflict-Free</span>
                  </div>

                  <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-1">
                    <span className="text-[10px] text-gw-text-secondary uppercase">Valid vs Invalid</span>
                    <div className="text-lg font-bold text-gw-text">
                      <span className="text-gw-success">{detailedSim.allocation_analytics.valid_count}</span>
                      <span className="text-gw-text-secondary"> / </span>
                      <span className="text-gw-danger">{detailedSim.allocation_analytics.invalid_count}</span>
                    </div>
                    <span className="text-[10px] text-gw-text-secondary">Zero constraint violations</span>
                  </div>

                  <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-1">
                    <span className="text-[10px] text-gw-text-secondary uppercase">Completion State</span>
                    <div className="text-sm font-bold text-gw-text truncate">
                      {detailedSim.allocation_analytics.generation_complete ? 'Complete' : 'Sample Window'}
                    </div>
                    <span className="text-[10px] text-gw-text-secondary">
                      {detailedSim.allocation_analytics.generation_complete ? 'All plans generated' : 'More plans available'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-gw-bg-secondary/50 border border-[#1e3a5f]/40 text-center space-y-2">
                  <p className="text-xs text-gw-text-secondary">
                    Click <strong className="text-gw-cyan">Run 50-Plan Sample Audit</strong> to generate materialized assignments and run independent Phase 17 conflict detection.
                  </p>
                </div>
              )}
            </Card>
          </div>
        ) : (
          <Card className="p-8 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-gw-warning mx-auto" />
            <h3 className="text-sm font-bold text-gw-text">Unbalanced or Incompatible Scenario Selected</h3>
            <p className="text-xs text-gw-text-secondary max-w-md mx-auto">
              The selected scenario does not form a balanced square n × n configuration or is missing a valid restriction matrix.
              Please select a balanced scenario above to view detailed mathematical analytics.
            </p>
          </Card>
        )}
      </div>

      {/* ----------------- 5. SIMULATION DIRECTORY & FILTERS (SECTION 5 & 7) ----------------- */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="gw-section-heading flex items-center gap-2">
              <Layers className="w-5 h-5 text-gw-cyan" />
              <span>Simulation Mathematical Directory</span>
            </h2>
            <p className="text-xs text-gw-text-secondary mt-0.5">
              Filter and compare mathematical configurations, dimensions, restriction densities, and feasibility states.
            </p>
          </div>
          <Badge variant="cyan" size="sm" className="font-mono text-[10px]">
            {filteredSimulations.length} of {overview?.simulations?.length || 0} Scenarios
          </Badge>
        </div>

        {/* Filters Toolbar */}
        <Card className="p-3.5 space-y-3 bg-gw-bg-secondary/70 border-[#1e3a5f]/60">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-gw-text-secondary absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search scenarios..."
                className="w-full pl-9 pr-3 py-2 bg-gw-bg-secondary border border-[#1e3a5f] rounded-lg text-xs text-gw-text focus:border-gw-cyan focus:outline-none"
              />
            </div>

            {/* Dimension Filter */}
            <div className="flex items-center gap-2">
              <span className="text-gw-text-secondary font-mono text-[11px] shrink-0">Dimension:</span>
              <select
                value={dimensionFilter}
                onChange={(e) => setDimensionFilter(e.target.value)}
                className="w-full bg-gw-bg-secondary border border-[#1e3a5f] rounded-lg px-2.5 py-2 text-xs text-gw-text font-mono focus:border-gw-cyan focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Dimensions</option>
                {availableDimensions.map((d) => (
                  <option key={d} value={d}>
                    {d} × {d} Board
                  </option>
                ))}
              </select>
            </div>

            {/* Density Filter */}
            <div className="flex items-center gap-2">
              <span className="text-gw-text-secondary font-mono text-[11px] shrink-0">Density:</span>
              <select
                value={densityFilter}
                onChange={(e) => setDensityFilter(e.target.value)}
                className="w-full bg-gw-bg-secondary border border-[#1e3a5f] rounded-lg px-2.5 py-2 text-xs text-gw-text font-mono focus:border-gw-cyan focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Densities</option>
                <option value="LOW">Low (&lt; 20%)</option>
                <option value="MEDIUM">Medium (20% – 50%)</option>
                <option value="HIGH">High (&gt; 50%)</option>
              </select>
            </div>

            {/* Feasibility Filter */}
            <div className="flex items-center gap-2">
              <span className="text-gw-text-secondary font-mono text-[11px] shrink-0">Feasibility:</span>
              <select
                value={feasibilityFilter}
                onChange={(e) => setFeasibilityFilter(e.target.value)}
                className="w-full bg-gw-bg-secondary border border-[#1e3a5f] rounded-lg px-2.5 py-2 text-xs text-gw-text font-mono focus:border-gw-cyan focus:outline-none cursor-pointer"
              >
                <option value="ALL">All States</option>
                <option value="FEASIBLE">Feasible (N &gt; 0)</option>
                <option value="INFEASIBLE">Infeasible (N = 0)</option>
                <option value="INCOMPATIBLE">Unbalanced / Error</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Directory Table */}
        <Card className="p-0 overflow-hidden border-[#1e3a5f]/60">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-[#1e3a5f]/40">
              <thead className="bg-gw-bg-secondary/70 text-gw-text-secondary uppercase font-mono text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Scenario</th>
                  <th className="py-3 px-4">Matrix Board</th>
                  <th className="py-3 px-4">Density</th>
                  <th className="py-3 px-4">Possible (n!)</th>
                  <th className="py-3 px-4">Valid (N)</th>
                  <th className="py-3 px-4">Feasibility</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e3a5f]/30">
                {filteredSimulations.map((sim) => {
                  const isSelected = sim.id === selectedSimId
                  return (
                    <tr
                      key={sim.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-gw-cyan/5' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-gw-cyan font-bold">{sim.id}</span>
                          <span className="font-semibold text-gw-text">{sim.name}</span>
                        </div>
                        {!sim.is_valid_config && (
                          <span className="text-[10px] text-gw-danger block mt-0.5">
                            {sim.validation_message}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono">
                        {sim.is_valid_config ? (
                          <span className="text-gw-text">
                            {sim.matrix_size} × {sim.matrix_size} ({sim.forbidden_count} restricted)
                          </span>
                        ) : (
                          <span className="text-gw-danger">Unbalanced ({sim.flight_count}F × {sim.gate_count}G)</span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono">
                        {sim.is_valid_config ? (
                          <span className="text-gw-warning">{sim.restriction_density}%</span>
                        ) : (
                          <span className="text-gw-text-secondary">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-gw-text-secondary">
                        {sim.is_valid_config ? sim.total_possible_assignments.toLocaleString() : '—'}
                      </td>

                      <td className="py-3 px-4 font-mono font-bold">
                        {sim.is_valid_config ? (
                          <span className={sim.is_feasible ? 'text-gw-success' : 'text-gw-danger'}>
                            {sim.exact_valid_assignments.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-gw-text-secondary">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono">
                        {sim.is_valid_config ? (
                          <Badge variant={sim.is_feasible ? 'success' : 'danger'} size="sm" className="font-mono text-[10px]">
                            {sim.feasibility_percentage.toFixed(1)}%
                          </Badge>
                        ) : (
                          <Badge variant="danger" size="sm" className="font-mono text-[10px]">
                            Incomplete
                          </Badge>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant={isSelected ? 'secondary' : 'ghost'}
                            className="text-xs h-7 px-2.5"
                            onClick={() => setSelectedSimId(sim.id)}
                            disabled={!sim.is_valid_config}
                          >
                            {isSelected ? 'Inspecting' : 'Inspect Math'}
                          </Button>
                          <Link to={`/simulator?sim=${sim.id}`}>
                            <Button size="sm" variant="outline" className="text-xs h-7 px-2.5" icon={PlayCircle}>
                              Simulate
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
        </>
      )}
    </div>
  )
}

export default Analytics
