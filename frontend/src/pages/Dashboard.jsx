import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Plane,
  DoorClosed,
  Grid3X3,
  Calculator,
  PlayCircle,
  BarChart3,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ChevronRight,
  RefreshCw,
  Info,
  Activity,
  Cpu,
  Database,
  ExternalLink
} from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import dashboardService from '../lib/dashboardService'
import allocationService from '../lib/allocationService'

/**
 * Format timestamp into relative or clean human-readable date.
 */
function formatTime(timestamp) {
  if (!timestamp) return 'Unknown'
  try {
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return String(timestamp)
    const now = new Date()
    const diffSec = Math.floor((now - date) / 1000)
    if (diffSec < 60) return 'Just now'
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return String(timestamp)
  }
}

export const Dashboard = () => {
  // Primary data states
  const [summary, setSummary] = useState(null)
  const [selectedSimId, setSelectedSimId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null)

  // Allocation sample generation state (Phase 16–18 integration)
  const [allocationSample, setAllocationSample] = useState(null)
  const [isGeneratingSample, setIsGeneratingSample] = useState(false)
  const [allocationError, setAllocationError] = useState(null)

  // Quick Access Modules definition (All 8 modules required by specification)
  const quickModules = [
    {
      title: 'Flight Management',
      description: 'Configure active flight schedules, aircraft classes, carrier callsigns, and arrival windows.',
      path: '/flights',
      icon: Plane,
      color: 'cyan',
      tag: 'Fleet Ops'
    },
    {
      title: 'Gate Management',
      description: 'Manage terminal gates, jetway boarding bridges, and supported aircraft dimensions.',
      path: '/gates',
      icon: DoorClosed,
      color: 'blue',
      tag: 'Facility Hub'
    },
    {
      title: 'Simulation Management',
      description: 'Create, configure, duplicate, and balance n × n flight-gate assignment scenarios.',
      path: '/simulator?tab=scenarios',
      icon: Layers,
      color: 'warning',
      tag: 'Scenarios'
    },
    {
      title: 'Restriction Matrix',
      description: 'Inspect and configure the n × n binary matrix of forbidden flight-to-gate assignments.',
      path: '/restrictions',
      icon: Grid3X3,
      color: 'warning',
      tag: 'Binary Board'
    },
    {
      title: 'Allocation Simulator',
      description: 'Generate conflict-free flight-to-gate schedules via backtracking search and interactive bipartite graph.',
      path: '/simulator',
      icon: PlayCircle,
      color: 'success',
      tag: 'Backtracking'
    },
    {
      title: 'Mathematical Engine',
      description: 'Step-by-step evaluation of Rook Polynomial coefficients and Inclusion-Exclusion exact sums.',
      path: '/calculation',
      icon: Calculator,
      color: 'cyan',
      tag: 'PIE Engine'
    },
    {
      title: 'Analytics & Compare',
      description: 'Analyze restriction densities, combinatorial state reductions, and feasibility ratios.',
      path: '/analytics',
      icon: BarChart3,
      color: 'blue',
      tag: 'Telemetry'
    },
    {
      title: 'Mathematical Explorer',
      description: 'Interactive educational walkthrough of Rook Polynomials and combinatorial allocation theory.',
      path: '/math-explorer',
      icon: BookOpen,
      color: 'cyan',
      tag: 'Discrete Math'
    }
  ]

  // Fetch summary from backend
  const loadDashboardData = useCallback(async (targetSimId = null, isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)

      const simToQuery = targetSimId || selectedSimId || null
      const data = await dashboardService.getSummary(simToQuery)
      setSummary(data)
      setLastRefreshedAt(new Date())

      // If a math summary is returned, ensure selectedSimId aligns with it
      if (data.mathematical_summary?.simulation_id) {
        setSelectedSimId(data.mathematical_summary.simulation_id)
      } else if (!selectedSimId && data.simulations.simulations.length > 0) {
        setSelectedSimId(data.simulations.simulations[0].id)
      }
    } catch (err) {
      console.error('Failed to load live dashboard summary:', err)
      setError(err.message || 'Failed to connect to backend service')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [selectedSimId])

  // Initial mount
  useEffect(() => {
    loadDashboardData()
  }, [])

  // Handle switching target simulation in dropdown
  const handleSimulationChange = async (newSimId) => {
    if (!newSimId || newSimId === selectedSimId) return
    setSelectedSimId(newSimId)
    setAllocationSample(null)
    setAllocationError(null)
    await loadDashboardData(newSimId, true)
  }

  // Handle generating a sample of allocations on demand (Phase 16–18)
  const handleGenerateSample = async () => {
    const simId = selectedSimId || summary?.mathematical_summary?.simulation_id
    if (!simId) return

    try {
      setIsGeneratingSample(true)
      setAllocationError(null)
      const res = await allocationService.generateAllocations(simId, 50)
      setAllocationSample(res)
    } catch (err) {
      console.error('Failed to generate sample allocations:', err)
      setAllocationError(err.message || 'Failed to generate allocations')
    } finally {
      setIsGeneratingSample(false)
    }
  }

  // Simulation Dropdown Options
  const simulationOptions = useMemo(() => {
    if (!summary?.simulations?.simulations) return []
    return summary.simulations.simulations.map((s) => ({
      value: s.id,
      label: `${s.name} (${s.id}) ${s.is_valid ? '— Balanced' : '— Incomplete'}`
    }))
  }, [summary])

  // Feasibility Chart Data
  const feasibilityChartData = useMemo(() => {
    if (!summary?.mathematical_summary) return []
    const math = summary.mathematical_summary
    const valid = math.exact_valid_assignments
    const invalid = Math.max(0, math.total_possible_assignments - valid)
    return [
      { name: 'Valid Assignments', value: valid, color: '#00f0ff' },
      { name: 'Infeasible / Forbidden', value: invalid, color: '#1e3a5f' }
    ]
  }, [summary])

  // =========================================================================
  // RENDER: LOADING SKELETON
  // =========================================================================
  if (isLoading && !summary) {
    return (
      <div className="space-y-8 animate-fadeIn">
        <div className="flex items-center justify-between pb-4 border-b border-[#1e3a5f]/50">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-gw-bg-secondary rounded-lg animate-pulse" />
            <div className="h-4 w-96 bg-gw-bg-secondary/60 rounded animate-pulse" />
          </div>
          <div className="h-10 w-36 bg-gw-bg-secondary rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="h-32 bg-gw-bg-secondary/40 animate-pulse border-[#1e3a5f]/40" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 h-80 bg-gw-bg-secondary/40 rounded-xl animate-pulse" />
          <div className="lg:col-span-4 h-80 bg-gw-bg-secondary/40 rounded-xl animate-pulse" />
        </div>
      </div>
    )
  }

  // =========================================================================
  // RENDER: ERROR STATE
  // =========================================================================
  if (error && !summary) {
    return (
      <div className="p-8 max-w-2xl mx-auto my-12 text-center space-y-6 bg-gw-bg-secondary border border-gw-danger/30 rounded-2xl shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-gw-danger/10 text-gw-danger border border-gw-danger/20 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-gw-text">Backend Connection Offline</h2>
          <p className="text-sm text-gw-text-secondary leading-relaxed">
            Unable to communicate with the FastAPI persistence and discrete math engine.
            Please ensure the backend server is active at{' '}
            <code className="text-gw-cyan font-mono text-xs bg-black/40 px-2 py-0.5 rounded">
              http://127.0.0.1:8000
            </code>.
          </p>
          <p className="text-xs text-gw-danger font-mono bg-gw-danger/5 p-2 rounded-lg border border-gw-danger/20">
            {error}
          </p>
        </div>
        <div className="pt-2">
          <Button
            size="md"
            icon={RefreshCw}
            onClick={() => loadDashboardData(null, false)}
            className="shadow-lg shadow-gw-cyan/10"
          >
            Retry Connection
          </Button>
        </div>
      </div>
    )
  }

  const flights = summary?.flights || { total: 0, by_status: {}, scheduled: 0, boarding: 0, delayed: 0, arrived: 0 }
  const gates = summary?.gates || { total: 0, by_status: {}, available: 0, occupied: 0, maintenance: 0 }
  const simulations = summary?.simulations || { total: 0, valid_count: 0, invalid_count: 0, simulations: [] }
  const math = summary?.mathematical_summary

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ----------------- 1. WELCOME HEADER & ACTIONS ----------------- */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-[#1e3a5f]/50">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="gw-page-heading">Airport Operations Overview</h1>
            <Badge variant="cyan" size="sm" dot>
              System Online
            </Badge>
            {lastRefreshedAt && (
              <span className="text-[11px] text-gw-text-secondary font-mono hidden sm:inline">
                Synced {formatTime(lastRefreshedAt)}
              </span>
            )}
          </div>
          <p className="text-sm text-gw-text-secondary leading-relaxed">
            Authoritative operational dashboard consolidating live flights, terminal gates, balanced scenarios, and discrete mathematical allocation engines.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
          <Button
            variant="outline"
            size="md"
            icon={RefreshCw}
            className={`transition-all ${isRefreshing ? 'opacity-70' : ''}`}
            onClick={() => loadDashboardData(selectedSimId, true)}
            disabled={isRefreshing}
          >
            <span className={isRefreshing ? 'animate-spin inline-block' : ''}>
              <RefreshCw className="w-4 h-4 mr-1.5 inline" />
            </span>
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Telemetry'}</span>
          </Button>
          <Link to="/workspace">
            <Button size="md" icon={PlayCircle} className="shadow-lg shadow-gw-cyan/20 font-bold">
              START NEW ALLOCATION
            </Button>
          </Link>
          <Link to="/scenarios">
            <Button size="md" variant="secondary" icon={Layers}>
              Scenarios
            </Button>
          </Link>
        </div>
      </div>

      {/* ----------------- 2. DOMINANT NEXT-ACTION GUIDANCE BANNER ----------------- */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-gw-cyan/15 via-gw-bg-secondary to-gw-blue/10 border border-gw-cyan/35 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-gw-cyan/5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-gw-cyan font-bold text-sm">
            <Cpu className="w-4 h-4" />
            <span>Ready for Allocation Synthesis</span>
          </div>
          <p className="text-xs text-gw-text-secondary leading-relaxed max-w-2xl">
            Execute the 7-step guided workflow: select flights & gates, review restriction density, compute exact Rook Polynomials and Inclusion-Exclusion sums, and export verified schedules.
          </p>
        </div>
        <Link to="/workspace" className="shrink-0">
          <Button size="md" icon={ArrowRight} className="w-full sm:w-auto shadow-md shadow-gw-cyan/20 font-semibold">
            START NEW ALLOCATION
          </Button>
        </Link>
      </div>

      {/* ----------------- 3. DATABASE PERSISTENCE STATUS BANNER ----------------- */}
      <div className="p-3.5 rounded-xl bg-gw-bg-secondary/70 border border-[#1e3a5f]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start sm:items-center gap-2.5 text-gw-text-secondary leading-relaxed">
          <Database className="w-4 h-4 shrink-0 text-gw-cyan mt-0.5 sm:mt-0" />
          <span>
            <strong className="text-gw-text">Authoritative Storage Layer:</strong> SQLite / SQLAlchemy database synchronized with FastAPI backend (
            <span className="text-gw-cyan font-mono font-medium">{flights.total}</span> flights,{' '}
            <span className="text-gw-blue font-mono font-medium">{gates.total}</span> gates,{' '}
            <span className="text-gw-warning font-mono font-medium">{simulations.total}</span> scenarios registered).
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <Badge variant="cyan" size="sm" className="inline-flex">
            Database Synchronized
          </Badge>
          <Badge variant="default" size="sm" className="font-mono text-[10px]">
            FastAPI v1
          </Badge>
        </div>
      </div>

      {/* ----------------- 3. CORE TELEMETRY STATISTIC CARDS ----------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Flights Telemetry */}
        <Card className="hover:border-gw-cyan/40 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase font-medium tracking-wider text-gw-text-secondary">
              Fleet Operations
            </span>
            <div className="p-2 rounded-lg bg-gw-cyan/10 text-gw-cyan border border-gw-cyan/20">
              <Plane className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-gw-text">{flights.total}</span>
            <span className="text-xs text-gw-text-secondary">flights registered</span>
          </div>

          {/* Status Breakdown Pills */}
          <div className="mt-3 pt-3 border-t border-[#1e3a5f]/40 flex flex-wrap gap-1.5 text-[11px]">
            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gw-text">
              <strong className="text-gw-cyan">{flights.scheduled}</strong> Sched
            </span>
            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gw-text">
              <strong className="text-gw-success">{flights.boarding}</strong> Board
            </span>
            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gw-text">
              <strong className="text-gw-warning">{flights.delayed}</strong> Delay
            </span>
            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gw-text">
              <strong className="text-gw-text-secondary">{flights.arrived}</strong> Arr
            </span>
          </div>

          <div className="mt-3 pt-2 flex items-center justify-between text-[11px] text-gw-text-secondary">
            <span>Fleet Registry</span>
            <Link to="/flights" className="text-gw-cyan hover:underline flex items-center gap-0.5 font-medium">
              <span>Manage</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>

        {/* Card 2: Gates Telemetry */}
        <Card className="hover:border-gw-blue/40 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase font-medium tracking-wider text-gw-text-secondary">
              Facility Docking
            </span>
            <div className="p-2 rounded-lg bg-gw-blue/10 text-gw-blue border border-gw-blue/20">
              <DoorClosed className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-gw-text">{gates.total}</span>
            <span className="text-xs text-gw-text-secondary">gates available</span>
          </div>

          {/* Status Breakdown Pills */}
          <div className="mt-3 pt-3 border-t border-[#1e3a5f]/40 flex flex-wrap gap-1.5 text-[11px]">
            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gw-text">
              <strong className="text-gw-success">{gates.available}</strong> Open
            </span>
            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gw-text">
              <strong className="text-gw-warning">{gates.occupied}</strong> In-Use
            </span>
            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gw-text">
              <strong className="text-gw-text-secondary">{gates.maintenance}</strong> Maint
            </span>
          </div>

          <div className="mt-3 pt-2 flex items-center justify-between text-[11px] text-gw-text-secondary">
            <span>Terminal 1 & 2</span>
            <Link to="/gates" className="text-gw-blue hover:underline flex items-center gap-0.5 font-medium">
              <span>Manage</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>

        {/* Card 3: Simulation Scenarios */}
        <Card className="hover:border-gw-warning/40 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase font-medium tracking-wider text-gw-text-secondary">
              Simulation Windows
            </span>
            <div className="p-2 rounded-lg bg-gw-warning/10 text-gw-warning border border-gw-warning/20">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-gw-warning">{simulations.total}</span>
            <span className="text-xs text-gw-text-secondary">total scenarios</span>
          </div>

          {/* Validity status breakdown */}
          <div className="mt-3 pt-3 border-t border-[#1e3a5f]/40 flex flex-wrap gap-1.5 text-[11px]">
            <span className="px-2 py-0.5 rounded bg-gw-success/10 border border-gw-success/20 text-gw-success font-medium">
              {simulations.valid_count} Balanced (n × n)
            </span>
            {simulations.invalid_count > 0 && (
              <span className="px-2 py-0.5 rounded bg-gw-danger/10 border border-gw-danger/20 text-gw-danger font-medium">
                {simulations.invalid_count} Incomplete
              </span>
            )}
          </div>

          <div className="mt-3 pt-2 flex items-center justify-between text-[11px] text-gw-text-secondary">
            <span className="truncate max-w-[130px]" title={simulations.most_recent_name || 'None'}>
              Latest: {simulations.most_recent_name || 'None'}
            </span>
            <Link to="/simulator?tab=scenarios" className="text-gw-warning hover:underline flex items-center gap-0.5 font-medium">
              <span>Scenarios</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>

        {/* Card 4: Selected Scenario Feasibility & Math */}
        <Card className="hover:border-gw-success/40 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase font-medium tracking-wider text-gw-text-secondary">
              Feasibility Ratio
            </span>
            <div className="p-2 rounded-lg bg-gw-success/10 text-gw-success border border-gw-success/20">
              <Calculator className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-gw-success">
              {math ? `${math.feasibility_percentage.toFixed(1)}%` : '—'}
            </span>
            <span className="text-xs text-gw-text-secondary font-mono">
              {math ? `(${math.exact_valid_assignments.toLocaleString()} / ${math.total_possible_assignments.toLocaleString()})` : 'No scenario'}
            </span>
          </div>

          {/* Density & Forbidden stats */}
          <div className="mt-3 pt-3 border-t border-[#1e3a5f]/40 flex flex-wrap gap-1.5 text-[11px]">
            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gw-text font-mono">
              <strong className="text-gw-warning">{math ? math.forbidden_assignment_count : 0}</strong> forbidden
            </span>
            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gw-text font-mono">
              <strong className="text-gw-cyan">{math ? `${math.restriction_density}%` : '0%'}</strong> density
            </span>
          </div>

          <div className="mt-3 pt-2 flex items-center justify-between text-[11px] text-gw-text-secondary">
            <span className="font-mono text-gw-cyan truncate max-w-[120px]">{math ? math.simulation_id : 'Select Sim'}</span>
            <Link to="/calculation" className="text-gw-success hover:underline flex items-center gap-0.5 font-medium">
              <span>Derivation</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>
      </div>

      {/* ----------------- 4. MATHEMATICAL ENGINE & ALLOCATION VALIDATION SECTION ----------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Combinatorial Engine & Theory Evaluation (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="gw-section-heading flex items-center gap-2">
              <Cpu className="w-5 h-5 text-gw-cyan" />
              <span>Discrete Mathematical Engine</span>
            </h2>

            {/* Target Scenario Selector */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              <span className="text-xs text-gw-text-secondary font-mono shrink-0">Target Scenario:</span>
              <select
                value={selectedSimId}
                onChange={(e) => handleSimulationChange(e.target.value)}
                className="bg-gw-bg-secondary border border-[#1e3a5f] rounded-lg px-2.5 py-1 text-xs text-gw-text font-mono focus:border-gw-cyan focus:outline-none cursor-pointer max-w-[240px] truncate"
              >
                {simulationOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-gw-bg-secondary text-gw-text">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Card className="space-y-5">
            {math ? (
              <>
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#1e3a5f]/40">
                  <div>
                    <h3 className="text-base font-bold text-gw-text flex items-center gap-2">
                      <span>{math.simulation_name}</span>
                      <Badge variant="cyan" size="sm" className="font-mono">
                        {math.matrix_size} × {math.matrix_size} Board
                      </Badge>
                    </h3>
                    <p className="text-xs text-gw-text-secondary mt-1">
                      Exact combinatorial calculation derived via Rook Polynomial dynamic programming and Principle of Inclusion-Exclusion.
                    </p>
                  </div>
                  <Link to="/calculation">
                    <Button variant="outline" size="sm" icon={ExternalLink}>
                      Full Steps
                    </Button>
                  </Link>
                </div>

                {/* Mathematical Formulations Display */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Formula Box 1: Rook Polynomial */}
                  <div className="p-3.5 rounded-xl bg-gw-bg-secondary/70 border border-[#1e3a5f]/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-gw-text-secondary">
                        1. Rook Polynomial R(B, x)
                      </span>
                      <Badge variant="warning" size="sm" className="font-mono text-[10px]">
                        Deg {math.rook_coefficients.length - 1}
                      </Badge>
                    </div>
                    <div className="gw-formula-box text-xs break-all font-mono py-2 text-gw-warning">
                      {math.rook_polynomial}
                    </div>
                    <p className="text-[11px] text-gw-text-secondary leading-relaxed">
                      Coefficients <span className="font-mono text-gw-text">rₖ</span> represent non-attacking rooks on forbidden cells.
                    </p>
                  </div>

                  {/* Formula Box 2: PIE Exact Sum */}
                  <div className="p-3.5 rounded-xl bg-gw-bg-secondary/70 border border-[#1e3a5f]/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-gw-text-secondary">
                        2. Inclusion-Exclusion (PIE)
                      </span>
                      <Badge variant="success" size="sm" className="font-mono text-[10px]">
                        Exact Integer
                      </Badge>
                    </div>
                    <div className="gw-formula-box text-xs break-all font-mono py-2 text-gw-success">
                      N = Σ [(-1)ᵏ · rₖ · (n - k)!] = {math.exact_valid_assignments.toLocaleString()}
                    </div>
                    <p className="text-[11px] text-gw-text-secondary leading-relaxed">
                      Exact number of bijective assignments violating zero restriction constraints out of{' '}
                      <span className="font-mono text-gw-text">{math.total_possible_assignments.toLocaleString()}</span>.
                    </p>
                  </div>
                </div>

                {/* Combinatorial Breakdown Visualization */}
                <div className="pt-2 border-t border-[#1e3a5f]/40 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="w-full sm:w-48 h-36 relative shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={feasibilityChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={36}
                          outerRadius={56}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {feasibilityChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload
                              return (
                                <div className="p-2 rounded bg-gw-bg-secondary border border-[#1e3a5f] text-xs font-mono shadow-lg">
                                  <div className="font-bold text-gw-text">{data.name}</div>
                                  <div className="text-gw-cyan">{data.value.toLocaleString()} assignments</div>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xs font-bold font-mono text-gw-cyan">
                        {math.feasibility_percentage.toFixed(0)}%
                      </span>
                      <span className="text-[9px] uppercase tracking-wider text-gw-text-secondary">Valid</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2.5 text-xs text-gw-text-secondary w-full">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-gw-bg-secondary/50 border border-[#1e3a5f]/40">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-gw-cyan" />
                        <span>Valid Assignments (N)</span>
                      </span>
                      <span className="font-mono font-bold text-gw-cyan">
                        {math.exact_valid_assignments.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-gw-bg-secondary/50 border border-[#1e3a5f]/40">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#1e3a5f]" />
                        <span>Infeasible Permutations</span>
                      </span>
                      <span className="font-mono text-gw-text-secondary">
                        {(math.total_possible_assignments - math.exact_valid_assignments).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-gw-bg-secondary/50 border border-[#1e3a5f]/40">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-gw-warning" />
                        <span>Forbidden Matrix Cells</span>
                      </span>
                      <span className="font-mono text-gw-warning">
                        {math.forbidden_assignment_count} / {math.matrix_size * math.matrix_size} ({math.restriction_density}%)
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center space-y-3">
                <AlertTriangle className="w-10 h-10 text-gw-warning mx-auto" />
                <h3 className="text-sm font-bold text-gw-text">No Balanced Scenario Selected</h3>
                <p className="text-xs text-gw-text-secondary max-w-md mx-auto">
                  The selected scenario has an unbalanced flight/gate configuration or an uninitialized restriction matrix.
                  Select a valid n × n scenario to view exact mathematical derivations.
                </p>
                <Link to="/simulator?tab=scenarios">
                  <Button variant="outline" size="sm" icon={Layers}>
                    Manage Scenarios
                  </Button>
                </Link>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Live Allocation Generator & Conflict Audit (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="gw-section-heading flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-gw-success" />
              <span>Allocation Generation & Audit</span>
            </h2>
            <Link to="/simulator" className="text-xs text-gw-cyan hover:underline flex items-center gap-0.5">
              <span>Simulator</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <Card className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gw-text">On-Demand Generation Engine</span>
                <Badge variant={allocationSample ? 'success' : 'default'} size="sm" className="font-mono text-[10px]">
                  {allocationSample ? 'Sample Loaded' : 'Ready'}
                </Badge>
              </div>
              <p className="text-xs text-gw-text-secondary leading-relaxed">
                Backtracking engine with independent Phase 17 conflict detection. Distinguishes exact theoretical counts from materialized plans.
              </p>
            </div>

            {/* Clear Callout Distinguishing Exact Theoretical vs Materialized Plans */}
            <div className="p-3 rounded-lg bg-gw-bg-secondary/80 border border-[#1e3a5f]/80 text-[11px] text-gw-text-secondary space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-gw-cyan">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>Exact Total vs. Generated Sample</span>
              </div>
              <p className="leading-relaxed">
                The PIE engine proves there are{' '}
                <strong className="text-gw-text">{math ? math.exact_valid_assignments.toLocaleString() : 'N'}</strong>{' '}
                valid assignments. The allocation generator produces materialized plans on demand with zero conflict tolerance.
              </p>
            </div>

            {/* Allocation Results Panel */}
            {allocationSample ? (
              <div className="space-y-3 pt-2 border-t border-[#1e3a5f]/40">
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-0.5">
                    <span className="text-[10px] text-gw-text-secondary uppercase block">Generated Plans</span>
                    <span className="text-lg font-bold text-gw-text">
                      {allocationSample.generated_count}{' '}
                      <span className="text-xs font-normal text-gw-text-secondary">/ {allocationSample.total_valid_assignments}</span>
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-0.5">
                    <span className="text-[10px] text-gw-text-secondary uppercase block">Conflict Status</span>
                    <span className="text-lg font-bold text-gw-success flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>100% Valid</span>
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-gw-bg-secondary border border-[#1e3a5f]/60 text-xs space-y-1">
                  <div className="flex items-center justify-between text-gw-text-secondary">
                    <span>Algorithm:</span>
                    <span className="font-mono text-gw-cyan">{allocationSample.algorithm}</span>
                  </div>
                  <div className="flex items-center justify-between text-gw-text-secondary">
                    <span>Validation Engine:</span>
                    <span className="font-mono text-gw-success">Phase 17 Independent Auditor</span>
                  </div>
                  <div className="flex items-center justify-between text-gw-text-secondary">
                    <span>Completion Status:</span>
                    <span className="font-mono text-gw-text">
                      {allocationSample.generation_complete ? 'Complete (All Generated)' : 'Sample Window (More Exist)'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Link to={`/simulator?sim=${selectedSimId}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full justify-center" icon={PlayCircle}>
                      Open in Simulator
                    </Button>
                  </Link>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleGenerateSample}
                    disabled={isGeneratingSample}
                  >
                    {isGeneratingSample ? 'Regenerating...' : 'Refresh'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-2 border-t border-[#1e3a5f]/40">
                <p className="text-xs text-gw-text-secondary leading-relaxed">
                  Generate and independently audit a batch of 50 conflict-free flight-to-gate assignments for scenario{' '}
                  <strong className="text-gw-text font-mono">{selectedSimId}</strong>.
                </p>

                {allocationError && (
                  <div className="p-2.5 rounded-lg bg-gw-danger/10 border border-gw-danger/30 text-xs text-gw-danger flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{allocationError}</span>
                  </div>
                )}

                <Button
                  size="sm"
                  icon={PlayCircle}
                  onClick={handleGenerateSample}
                  disabled={isGeneratingSample || !math}
                  className="w-full justify-center shadow-lg shadow-gw-cyan/10"
                >
                  {isGeneratingSample ? 'Executing Backtracking Search...' : 'Generate 50 Sample Allocations'}
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ----------------- 5. SIMULATION OVERVIEW SECTION ----------------- */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="gw-section-heading flex items-center gap-2">
              <Layers className="w-5 h-5 text-gw-cyan" />
              <span>Available Simulation Scenarios</span>
            </h2>
            <p className="text-xs text-gw-text-secondary mt-0.5">
              Live repository of allocation scenario windows configured in the database layer.
            </p>
          </div>
          <Link to="/simulator?tab=scenarios">
            <Button size="sm" variant="secondary" icon={Layers}>
              Scenario Manager
            </Button>
          </Link>
        </div>

        {simulations.simulations.length > 0 ? (
          <Card className="p-0 overflow-hidden border-[#1e3a5f]/60">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-[#1e3a5f]/40">
                <thead className="bg-gw-bg-secondary/70 text-gw-text-secondary uppercase font-mono text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Scenario</th>
                    <th className="py-3 px-4">Dimensions</th>
                    <th className="py-3 px-4">Restriction Matrix</th>
                    <th className="py-3 px-4">Configuration</th>
                    <th className="py-3 px-4">Last Updated</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e3a5f]/30">
                  {simulations.simulations.map((sim) => {
                    const isSelected = sim.id === selectedSimId
                    return (
                      <tr
                        key={sim.id}
                        className={`transition-colors ${
                          isSelected ? 'bg-gw-cyan/5' : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-gw-cyan font-bold text-xs">{sim.id}</span>
                            <div>
                              <div className="font-semibold text-gw-text text-xs">{sim.name}</div>
                              {sim.description && (
                                <div className="text-[11px] text-gw-text-secondary truncate max-w-xs">
                                  {sim.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono">
                          <span className="text-gw-text font-medium">{sim.flight_count} flights</span>
                          <span className="text-gw-text-secondary"> × </span>
                          <span className="text-gw-text font-medium">{sim.gate_count} gates</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-mono text-gw-warning text-[11px] bg-gw-warning/5 px-2 py-0.5 rounded border border-gw-warning/20">
                            {sim.matrix_status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {sim.is_valid ? (
                            <Badge variant="success" size="sm" className="font-mono text-[10px]">
                              Balanced (n × n)
                            </Badge>
                          ) : (
                            <Badge variant="danger" size="sm" className="font-mono text-[10px]">
                              Incomplete
                            </Badge>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px] text-gw-text-secondary">
                          {formatTime(sim.updated_at)}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant={isSelected ? 'secondary' : 'ghost'}
                              className="text-xs h-7 px-2.5"
                              onClick={() => handleSimulationChange(sim.id)}
                            >
                              {isSelected ? 'Active' : 'Inspect'}
                            </Button>
                            <Link to={`/simulator?sim=${sim.id}`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 px-2.5"
                                icon={PlayCircle}
                              >
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
        ) : (
          <Card className="p-8 text-center space-y-3">
            <Layers className="w-8 h-8 text-gw-text-secondary mx-auto" />
            <p className="text-sm text-gw-text-secondary">No simulation scenarios found in the registry.</p>
            <Link to="/simulator?tab=scenarios">
              <Button size="sm" icon={PlayCircle}>
                Create Initial Scenario
              </Button>
            </Link>
          </Card>
        )}
      </div>

      {/* ----------------- 6. OPERATIONAL RECENT ACTIVITY LOG ----------------- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="gw-section-heading flex items-center gap-2">
              <Activity className="w-5 h-5 text-gw-cyan" />
              <span>Operational Activity History</span>
            </h2>
            <p className="text-xs text-gw-text-secondary mt-0.5">
              Chronological log of genuine database mutations and calculation events.
            </p>
          </div>
          <Badge variant="cyan" size="sm">
            Live Audit Stream
          </Badge>
        </div>

        {summary?.recent_activities?.length > 0 ? (
          <Card className="p-0 overflow-hidden divide-y divide-[#1e3a5f]/40">
            {summary.recent_activities.map((act) => {
              // Determine icon
              let Icon = Activity
              if (act.entity_type === 'Flight') Icon = Plane
              else if (act.entity_type === 'Gate') Icon = DoorClosed
              else if (act.entity_type === 'Simulation') Icon = Layers
              else if (act.entity_type === 'RestrictionMatrix') Icon = Grid3X3
              else if (act.entity_type === 'Allocation') Icon = Calculator

              // Determine color badge
              const isSuccess = act.status === 'success'
              const isWarning = act.status === 'warning'
              const isDanger = act.status === 'danger'

              return (
                <div key={act.id} className="p-3.5 hover:bg-white/[0.02] transition-colors flex items-start gap-3.5">
                  <div
                    className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                      isSuccess
                        ? 'bg-gw-success/10 text-gw-success border border-gw-success/20'
                        : isWarning
                        ? 'bg-gw-warning/10 text-gw-warning border border-gw-warning/20'
                        : isDanger
                        ? 'bg-gw-danger/10 text-gw-danger border border-gw-danger/20'
                        : 'bg-gw-cyan/10 text-gw-cyan border border-gw-cyan/20'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-gw-text truncate">{act.title}</h4>
                      <span className="text-[11px] text-gw-text-secondary font-mono shrink-0">
                        {formatTime(act.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-gw-text-secondary mt-0.5 leading-relaxed">{act.detail}</p>
                  </div>
                </div>
              )
            })}
          </Card>
        ) : (
          <Card className="p-6 text-center text-xs text-gw-text-secondary">
            No activity events recorded yet. Perform operational actions to populate the live audit log.
          </Card>
        )}
      </div>

      {/* ----------------- 7. QUICK ACCESS OPERATIONAL MODULES ----------------- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="gw-section-heading flex items-center gap-2">
              <Layers className="w-5 h-5 text-gw-cyan" />
              <span>Operational Modules</span>
            </h2>
            <p className="text-xs text-gw-text-secondary mt-0.5">
              Direct navigation to all GateWise functional facilities and mathematical tools.
            </p>
          </div>
          <span className="text-xs text-gw-text-secondary font-mono">8 Subsystems</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickModules.map((mod) => {
            const Icon = mod.icon
            return (
              <Link
                key={mod.path}
                to={mod.path}
                className="group block rounded-xl transition-all duration-200"
              >
                <Card className="h-full group-hover:border-gw-cyan/50 group-hover:bg-gw-card-hover transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="p-2.5 rounded-xl bg-gw-cyan/10 border border-gw-cyan/25 text-gw-cyan group-hover:scale-105 transition-transform">
                        <Icon className="w-5 h-5" />
                      </div>
                      <Badge variant="default" size="sm" className="font-mono text-[10px]">
                        {mod.tag}
                      </Badge>
                    </div>

                    <h3 className="gw-card-heading group-hover:text-gw-cyan transition-colors flex items-center justify-between">
                      <span>{mod.title}</span>
                      <ChevronRight className="w-4 h-4 text-gw-text-secondary group-hover:text-gw-cyan group-hover:translate-x-1 transition-all shrink-0" />
                    </h3>

                    <p className="text-xs text-gw-text-secondary mt-1.5 leading-relaxed">
                      {mod.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#1e3a5f]/40 flex items-center justify-between text-[11px] text-gw-text-secondary group-hover:text-gw-cyan">
                    <span>Access Facility</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
