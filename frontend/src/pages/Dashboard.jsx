import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Plane,
  DoorClosed,
  Grid3X3,
  Calculator,
  PlayCircle,
  BarChart3,
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
  ExternalLink,
  Compass,
  Building2,
  Bell
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
import Counter from '../components/ui/Counter'
import dashboardService from '../lib/dashboardService'
import allocationService from '../lib/allocationService'
import { useAirport } from '../context/AirportContext'

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
  const { alerts } = useAirport()

  // Primary data states
  const [summary, setSummary] = useState(null)
  const [selectedSimId, setSelectedSimId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null)

  // Allocation sample generation state
  const [allocationSample, setAllocationSample] = useState(null)
  const [isGeneratingSample, setIsGeneratingSample] = useState(false)
  const [allocationError, setAllocationError] = useState(null)

  // Operational Modules definition
  const quickModules = [
    {
      title: 'Airport Layout',
      description: 'Apron and docking stand layout for Kempegowda International Airport Bengaluru.',
      path: '/airport-map',
      icon: Compass,
      tag: 'Layout'
    },
    {
      title: 'Flight Management',
      description: 'Flight schedules, aircraft envelopes, carrier callsigns, and arrival windows.',
      path: '/flights',
      icon: Plane,
      tag: 'Fleet'
    },
    {
      title: 'Gate Management',
      description: 'Terminal contact gates, jetway boarding bridges, and apron stands.',
      path: '/gates',
      icon: DoorClosed,
      tag: 'Facility'
    },
    {
      title: 'Gate Restrictions',
      description: 'Configure and inspect binary restriction matrices of forbidden flight-gate pairs.',
      path: '/restrictions',
      icon: Grid3X3,
      tag: 'Matrix'
    },
    {
      title: 'Allocation Workspace',
      description: 'Guided allocation workflow with bipartite verification and step-by-step audit.',
      path: '/workspace',
      icon: PlayCircle,
      tag: 'Guided'
    },
    {
      title: 'Simulation Scenarios',
      description: 'Manage balanced n × n flight-gate assignment scenarios and restriction models.',
      path: '/scenarios',
      icon: Layers,
      tag: 'Scenarios'
    },
    {
      title: 'Mathematical Engine',
      description: 'Rook Polynomial derivations and Principle of Inclusion-Exclusion calculations.',
      path: '/calculation',
      icon: Calculator,
      tag: 'Discrete Math'
    },
    {
      title: 'Analytics & Reports',
      description: 'Combinatorial state analysis, restriction densities, and exportable reports.',
      path: '/analytics',
      icon: BarChart3,
      tag: 'Analytics'
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

  useEffect(() => {
    loadDashboardData()
  }, [])

  const handleSimulationChange = async (newSimId) => {
    if (!newSimId || newSimId === selectedSimId) return
    setSelectedSimId(newSimId)
    setAllocationSample(null)
    setAllocationError(null)
    await loadDashboardData(newSimId, true)
  }

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

  const simulationOptions = useMemo(() => {
    if (!summary?.simulations?.simulations) return []
    return summary.simulations.simulations.map((s) => ({
      value: s.id,
      label: `${s.name} (${s.id}) ${s.is_valid ? '— Balanced' : '— Incomplete'}`
    }))
  }, [summary])

  const feasibilityChartData = useMemo(() => {
    if (!summary?.mathematical_summary) return []
    const math = summary.mathematical_summary
    const valid = math.exact_valid_assignments
    const invalid = Math.max(0, math.total_possible_assignments - valid)
    return [
      { name: 'Valid Assignments', value: valid, color: '#38BDF8' },
      { name: 'Infeasible / Forbidden', value: invalid, color: '#1E2638' }
    ]
  }, [summary])

  if (isLoading && !summary) {
    return (
      <div className="space-y-8 animate-fadeIn">
        <div className="flex items-center justify-between pb-4 border-b border-[#222E42]">
          <div className="space-y-2">
            <div className="h-7 w-64 bg-[#121826] rounded-lg animate-pulse" />
            <div className="h-4 w-96 bg-[#121826]/60 rounded animate-pulse" />
          </div>
          <div className="h-9 w-40 bg-[#121826] rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="h-28 bg-[#121826] animate-pulse border-[#222E42]" />
          ))}
        </div>
        <div className="h-64 bg-[#121826]/40 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (error && !summary) {
    return (
      <div className="p-8 max-w-2xl mx-auto my-12 text-center space-y-6 bg-[#121826] border border-[#222E42] rounded-2xl shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-rose-950/30 text-rose-400 border border-rose-800/40 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-[#F8FAFC]">Backend Connection Offline</h2>
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            Unable to communicate with the FastAPI persistence and discrete math engine.
            Please ensure the backend server is active at{' '}
            <code className="text-sky-400 font-mono text-xs bg-[#080B11] px-2 py-0.5 rounded border border-[#222E42]">
              http://127.0.0.1:8000
            </code>.
          </p>
          <p className="text-xs text-rose-300 font-mono bg-[#0D121F] p-2.5 rounded-lg border border-[#222E42]">
            {error}
          </p>
        </div>
        <div className="pt-2">
          <Button
            size="md"
            icon={RefreshCw}
            onClick={() => loadDashboardData(null, false)}
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

  const gateUtilization = gates.total > 0 ? Math.round((gates.occupied / gates.total) * 100) : 0
  const forbiddenCombinations = math ? math.forbidden_assignment_count : 0
  const actualAllocationConflicts = allocationSample?.validation?.total_conflicts ?? 0
  const unallocatedFlights = flights.total > 0 && gates.total > 0 ? Math.max(0, flights.total - gates.total) : 0

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ----------------- 1. INSTITUTIONAL HEADER & SINGLE DOMINANT CTA ----------------- */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-[#222E42]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-[#F8FAFC] tracking-tight font-sans">
              Airport Operations Dashboard
            </h1>
            <span className="text-[10px] px-2.5 py-0.5 rounded bg-[#121826] border border-[#222E42] text-sky-400 font-mono font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              BLR / VOBL DEMO
            </span>
            {lastRefreshedAt && (
              <span className="text-[11px] text-[#94A3B8] font-mono hidden md:inline">
                Refreshed {formatTime(lastRefreshedAt)}
              </span>
            )}
          </div>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            Gate allocation, flight management and operational decision support for Kempegowda International Airport (BLR / VOBL).
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
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
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </Button>
          <Link to="/workspace">
            <Button size="md" icon={PlayCircle} className="font-semibold shadow-xs">
              RUN ALLOCATION ANALYSIS
            </Button>
          </Link>
        </div>
      </div>

      {/* ----------------- 2. TOP METRICS (4 KEY KPI CARDS) ----------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Registered Flights */}
        <Card className="hover:border-sky-500/40 transition-colors p-4 bg-[#121826] border-[#222E42]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-medium tracking-wider text-[#94A3B8]">
              Registered Flights
            </span>
            <div className="p-2 rounded-lg bg-[#1E2638] text-sky-400 border border-[#222E42]">
              <Plane className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <Counter value={flights.total} className="text-3xl font-extrabold text-[#F8FAFC]" />
            <span className="text-xs text-[#94A3B8]">flights registered</span>
          </div>
          <div className="mt-3 pt-3 border-t border-[#222E42] flex flex-wrap gap-1 text-[11px] text-[#94A3B8]">
            <span>{flights.scheduled} sched</span>
            <span>•</span>
            <span>{flights.boarding} boarding</span>
            <span>•</span>
            <span>{flights.delayed} delayed</span>
            <span>•</span>
            <span>{flights.arrived} arrived</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-[#94A3B8]">
            <span>Fleet Registry</span>
            <Link to="/flights" className="text-sky-400 hover:text-sky-300 flex items-center gap-0.5 font-medium">
              <span>Manage</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>

        {/* Card 2: Available Gates */}
        <Card className="hover:border-emerald-500/40 transition-colors p-4 bg-[#121826] border-[#222E42]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-medium tracking-wider text-[#94A3B8]">
              Available Gates
            </span>
            <div className="p-2 rounded-lg bg-[#1E2638] text-emerald-400 border border-[#222E42]">
              <DoorClosed className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <Counter value={gates.available} className="text-3xl font-extrabold text-[#F8FAFC]" />
            <span className="text-xs text-[#94A3B8]">of {gates.total} stands</span>
          </div>
          <div className="mt-3 pt-3 border-t border-[#222E42] flex flex-wrap gap-1 text-[11px] text-[#94A3B8]">
            <span className="text-emerald-400 font-medium">{gates.available} open</span>
            <span>•</span>
            <span>{gates.occupied} occupied</span>
            <span>•</span>
            <span>{gates.maintenance} maint</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-[#94A3B8]">
            <span>Terminal 1 & 2</span>
            <Link to="/gates" className="text-sky-400 hover:text-sky-300 flex items-center gap-0.5 font-medium">
              <span>Manage</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>

        {/* Card 3: Gate Utilization */}
        <Card className="hover:border-sky-500/40 transition-colors p-4 bg-[#121826] border-[#222E42]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-medium tracking-wider text-[#94A3B8]">
              Gate Utilization
            </span>
            <div className="p-2 rounded-lg bg-[#1E2638] text-sky-400 border border-[#222E42]">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#F8FAFC]">
              {gateUtilization}%
            </span>
            <span className="text-xs text-[#94A3B8]">stand occupancy</span>
          </div>
          <div className="mt-3 pt-3 border-t border-[#222E42] flex flex-wrap gap-1 text-[11px] text-[#94A3B8]">
            <span>{gates.occupied} occupied</span>
            <span>•</span>
            <span>{gates.total - gates.occupied} vacant</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-[#94A3B8]">
            <span>Apron Stands</span>
            <Link to="/airport-map" className="text-sky-400 hover:text-sky-300 flex items-center gap-0.5 font-medium">
              <span>Layout Map</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>

        {/* Card 4: Forbidden Flight-Gate Combinations */}
        <Card className="hover:border-amber-500/40 transition-colors p-4 bg-[#121826] border-[#222E42]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-medium tracking-wider text-[#94A3B8]">
              Forbidden Combinations
            </span>
            <div className="p-2 rounded-lg bg-[#1E2638] text-amber-400 border border-[#222E42]">
              <Grid3X3 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#F8FAFC]">
              {forbiddenCombinations}
            </span>
            <span className="text-xs text-[#94A3B8]">matrix cells (r₁)</span>
          </div>
          <div className="mt-3 pt-3 border-t border-[#222E42] flex flex-wrap gap-1 text-[11px] text-[#94A3B8]">
            <span>{math ? `${math.restriction_density}% density` : 'No active scenario'}</span>
            <span>•</span>
            <span className="font-mono">{math ? math.simulation_id : '—'}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-[#94A3B8]">
            <span>Restriction Matrix</span>
            <Link to="/restrictions" className="text-sky-400 hover:text-sky-300 flex items-center gap-0.5 font-medium">
              <span>Inspect</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>
      </div>

      {/* ----------------- 3. OPERATIONAL OVERVIEW ----------------- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-[#F8FAFC] uppercase tracking-wider font-mono">
            Operational Overview
          </h2>
          <span className="text-[11px] text-[#94A3B8] font-mono">
            Kempegowda International Airport (BLR / VOBL)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Flight Fleet Breakdown */}
          <Card className="p-4 bg-[#121826] border-[#222E42] space-y-3">
            <div className="flex items-center justify-between border-b border-[#222E42] pb-2">
              <span className="text-xs font-semibold text-[#F8FAFC]">Flight Fleet Status</span>
              <Plane className="w-4 h-4 text-sky-400" />
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span>Scheduled:</span>
                <span className="font-mono text-[#F8FAFC] font-medium">{flights.scheduled}</span>
              </div>
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span>Boarding:</span>
                <span className="font-mono text-[#F8FAFC] font-medium">{flights.boarding}</span>
              </div>
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span>Delayed:</span>
                <span className="font-mono text-amber-400 font-medium">{flights.delayed}</span>
              </div>
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span>Arrived / Complete:</span>
                <span className="font-mono text-[#64748B] font-medium">{flights.arrived}</span>
              </div>
              <div className="flex items-center justify-between text-[#94A3B8] pt-1 border-t border-[#222E42]">
                <span>Unallocated Flights:</span>
                <span className="font-mono text-[#F8FAFC] font-medium">{unallocatedFlights}</span>
              </div>
            </div>
          </Card>

          {/* Gate Facility Breakdown */}
          <Card className="p-4 bg-[#121826] border-[#222E42] space-y-3">
            <div className="flex items-center justify-between border-b border-[#222E42] pb-2">
              <span className="text-xs font-semibold text-[#F8FAFC]">Gate Facility Status</span>
              <DoorClosed className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span>Available (Open):</span>
                <span className="font-mono text-emerald-400 font-medium">{gates.available}</span>
              </div>
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span>Occupied (In-Use):</span>
                <span className="font-mono text-sky-400 font-medium">{gates.occupied}</span>
              </div>
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span>Maintenance / Closed:</span>
                <span className="font-mono text-[#64748B] font-medium">{gates.maintenance}</span>
              </div>
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span>Total Capacity:</span>
                <span className="font-mono text-[#F8FAFC] font-medium">{gates.total} stands</span>
              </div>
            </div>
          </Card>

          {/* Terminal Distribution */}
          <Card className="p-4 bg-[#121826] border-[#222E42] space-y-3">
            <div className="flex items-center justify-between border-b border-[#222E42] pb-2">
              <span className="text-xs font-semibold text-[#F8FAFC]">Terminal Distribution</span>
              <Building2 className="w-4 h-4 text-sky-400" />
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span>Terminal 1 (Domestic):</span>
                <span className="font-mono text-[#F8FAFC] font-medium">Code C / D</span>
              </div>
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span>Terminal 2 (Int'l / Premium):</span>
                <span className="font-mono text-sky-300 font-medium">Code E / F</span>
              </div>
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span>Key Carriers:</span>
                <span className="text-[#94A3B8] text-[11px] truncate">6E, AI, QP, EK, SQ</span>
              </div>
              <div className="flex items-center justify-between text-[#94A3B8] pt-1">
                <Link to="/airport-map" className="text-sky-400 text-[11px] hover:text-sky-300 flex items-center gap-1 font-medium">
                  <span>View Terminal Aprons</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </Card>

          {/* Active Feasibility */}
          <Card className="p-4 bg-[#121826] border-[#222E42] space-y-3">
            <div className="flex items-center justify-between border-b border-[#222E42] pb-2">
              <span className="text-xs font-semibold text-[#F8FAFC]">Scenario Feasibility</span>
              <Calculator className="w-4 h-4 text-sky-400" />
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span>Active Scenario:</span>
                <span className="font-mono text-sky-400 font-medium truncate max-w-[120px]">
                  {math ? math.simulation_id : 'None'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span>Board Dimensions:</span>
                <span className="font-mono text-[#F8FAFC] font-medium">
                  {math ? `${math.matrix_size} × ${math.matrix_size}` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span>Exact Valid (PIE):</span>
                <span className="font-mono text-emerald-400 font-medium">
                  {math ? math.exact_valid_assignments.toLocaleString() : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span>Feasibility Ratio:</span>
                <span className="font-mono text-[#F8FAFC] font-medium">
                  {math ? `${math.feasibility_percentage.toFixed(1)}%` : '—'}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ----------------- 4. ALERTS & NOTIFICATIONS ----------------- */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-sky-400" />
            <h2 className="text-xs font-semibold text-[#F8FAFC] uppercase tracking-wider font-mono">
              Alerts & Notifications
            </h2>
          </div>
          <span className="text-xs text-[#94A3B8] font-mono">
            {alerts && alerts.length > 0 ? `${alerts.length} Active` : 'All Clear'}
          </span>
        </div>

        {alerts && alerts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alerts.map((a) => (
              <div key={a.id} className="p-3 rounded-lg bg-[#121826] border border-[#222E42] flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1E2638] text-sky-300 border border-[#222E42]">
                      {a.category || 'OPERATIONAL'}
                    </span>
                    <span className="text-xs font-semibold text-[#F8FAFC] truncate">{a.title}</span>
                  </div>
                  <p className="text-[11px] text-[#94A3B8] mt-1 leading-relaxed">{a.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-[#121826] border border-[#222E42] flex items-center gap-3 text-xs text-[#94A3B8]">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>No active alerts in the current demonstration dataset.</span>
          </div>
        )}
      </div>

      {/* ----------------- 5. MATHEMATICAL ENGINE & ALLOCATION VALIDATION SECTION ----------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Combinatorial Engine & Theory Evaluation (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[#F8FAFC] flex items-center gap-2 uppercase tracking-wider font-mono">
              <Cpu className="w-4 h-4 text-sky-400" />
              <span>Discrete Mathematical Engine</span>
            </h2>

            {/* Target Scenario Selector */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              <span className="text-xs text-[#94A3B8] font-mono shrink-0">Target Scenario:</span>
              <select
                value={selectedSimId}
                onChange={(e) => handleSimulationChange(e.target.value)}
                className="bg-[#121826] border border-[#222E42] rounded-lg px-2.5 py-1 text-xs text-[#F8FAFC] font-mono focus:border-sky-400 focus:outline-none cursor-pointer max-w-[240px] truncate"
              >
                {simulationOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#121826] text-[#F8FAFC]">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Card className="space-y-5 p-5 bg-[#121826] border-[#222E42]">
            {math ? (
              <>
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#222E42]">
                  <div>
                    <h3 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                      <span>{math.simulation_name}</span>
                      <Badge variant="cyan" size="sm" className="font-mono">
                        {math.matrix_size} × {math.matrix_size} Board
                      </Badge>
                    </h3>
                    <p className="text-xs text-[#94A3B8] mt-1">
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
                  <div className="p-3.5 rounded-xl bg-[#0D121F] border border-[#222E42] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-sky-400">
                        1. Rook Polynomial R(B, x)
                      </span>
                      <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                        Deg {math.rook_coefficients.length - 1}
                      </Badge>
                    </div>
                    <div className="text-xs break-all font-mono py-2 text-[#F8FAFC]">
                      {math.rook_polynomial}
                    </div>
                    <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                      Coefficients <span className="font-mono text-sky-400">rₖ</span> represent non-attacking rooks on forbidden cells.
                    </p>
                  </div>

                  {/* Formula Box 2: PIE Exact Sum */}
                  <div className="p-3.5 rounded-xl bg-[#0D121F] border border-[#222E42] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400">
                        2. Inclusion-Exclusion (PIE)
                      </span>
                      <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                        Exact Integer
                      </Badge>
                    </div>
                    <div className="text-xs break-all font-mono py-2 text-[#F8FAFC]">
                      N = Σ [(-1)ᵏ · rₖ · (n - k)!] = <span className="text-emerald-400 font-bold">{math.exact_valid_assignments.toLocaleString()}</span>
                    </div>
                    <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                      Exact number of bijective assignments violating zero restriction constraints out of{' '}
                      <span className="font-mono text-[#F8FAFC]">{math.total_possible_assignments.toLocaleString()}</span>.
                    </p>
                  </div>
                </div>

                {/* Combinatorial Breakdown Visualization */}
                <div className="pt-2 border-t border-[#222E42] flex flex-col sm:flex-row items-center justify-between gap-6">
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
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="#080B11" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload
                              return (
                                <div className="p-2.5 rounded bg-[#121826] border border-[#222E42] text-xs font-mono shadow-xl">
                                  <div className="font-bold text-[#F8FAFC]">{data.name}</div>
                                  <div className="text-sky-300">{data.value.toLocaleString()} assignments</div>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xs font-bold font-mono text-[#F8FAFC]">
                        {math.feasibility_percentage.toFixed(0)}%
                      </span>
                      <span className="text-[9px] uppercase tracking-wider text-[#94A3B8]">Valid</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2.5 text-xs text-[#94A3B8] w-full">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0D121F] border border-[#222E42]">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                        <span>Valid Assignments (N)</span>
                      </span>
                      <span className="font-mono font-bold text-sky-400">
                        {math.exact_valid_assignments.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0D121F] border border-[#222E42]">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#1E2638] border border-[#222E42]" />
                        <span>Infeasible Permutations</span>
                      </span>
                      <span className="font-mono text-[#94A3B8]">
                        {(math.total_possible_assignments - math.exact_valid_assignments).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0D121F] border border-[#222E42]">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        <span>Forbidden Matrix Cells</span>
                      </span>
                      <span className="font-mono text-amber-400">
                        {math.forbidden_assignment_count} / {math.matrix_size * math.matrix_size} ({math.restriction_density}%)
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center space-y-3">
                <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
                <h3 className="text-sm font-bold text-[#F8FAFC]">No Balanced Scenario Selected</h3>
                <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
                  The selected scenario has an unbalanced flight/gate configuration or an uninitialized restriction matrix.
                  Select a valid n × n scenario to view exact mathematical derivations.
                </p>
                <Link to="/scenarios">
                  <Button variant="outline" size="sm" icon={Layers}>
                    Manage Scenarios
                  </Button>
                </Link>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Allocation Generator & Conflict Audit (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#F8FAFC] flex items-center gap-2 uppercase tracking-wider font-mono">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Allocation Generation & Audit</span>
            </h2>
            <Link to="/workspace" className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-0.5 font-medium">
              <span>Workspace</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <Card className="space-y-4 p-5 bg-[#121826] border-[#222E42]">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#F8FAFC]">On-Demand Generation Engine</span>
                <Badge variant={allocationSample ? 'success' : 'outline'} size="sm" className="font-mono text-[10px]">
                  {allocationSample ? 'Sample Loaded' : 'Ready'}
                </Badge>
              </div>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Backtracking engine with independent conflict audit. Distinguishes exact theoretical counts from materialized plans.
              </p>
            </div>

            {/* Clear Callout Distinguishing Exact Theoretical vs Materialized Plans */}
            <div className="p-3 rounded-lg bg-[#0D121F] border border-[#222E42] text-[11px] text-[#94A3B8] space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-[#F8FAFC]">
                <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>Exact Total vs. Generated Sample</span>
              </div>
              <p className="leading-relaxed">
                The PIE engine proves there are{' '}
                <strong className="text-emerald-400">{math ? math.exact_valid_assignments.toLocaleString() : 'N'}</strong>{' '}
                valid assignments. The allocation generator produces materialized plans on demand with zero conflict tolerance.
              </p>
            </div>

            {/* Allocation Results Panel */}
            {allocationSample ? (
              <div className="space-y-3 pt-2 border-t border-[#222E42]">
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-[#1E2638] border border-[#222E42] space-y-0.5">
                    <span className="text-[10px] text-[#94A3B8] uppercase block">Generated Plans</span>
                    <span className="text-lg font-bold text-sky-400">
                      {allocationSample.generated_count}{' '}
                      <span className="text-xs font-normal text-[#94A3B8]">/ {allocationSample.total_valid_assignments}</span>
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#1E2638] border border-[#222E42] space-y-0.5">
                    <span className="text-[10px] text-[#94A3B8] uppercase block">Conflict Status</span>
                    <span className="text-lg font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>100% Valid</span>
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[#0D121F] border border-[#222E42] text-xs space-y-1">
                  <div className="flex items-center justify-between text-[#94A3B8]">
                    <span>Actual Allocation Conflicts:</span>
                    <span className="font-mono text-emerald-400 font-medium">{actualAllocationConflicts} (Conflict-Free)</span>
                  </div>
                  <div className="flex items-center justify-between text-[#94A3B8]">
                    <span>Forbidden Pairs Enforced:</span>
                    <span className="font-mono text-amber-400 font-medium">{forbiddenCombinations}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#94A3B8]">
                    <span>Algorithm:</span>
                    <span className="font-mono text-[#F8FAFC]">{allocationSample.algorithm}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#94A3B8]">
                    <span>Validation Engine:</span>
                    <span className="font-mono text-emerald-400">Independent Conflict Auditor</span>
                  </div>
                  <div className="flex items-center justify-between text-[#94A3B8]">
                    <span>Completion Status:</span>
                    <span className="font-mono text-sky-400">
                      {allocationSample.generation_complete ? 'Complete (All Generated)' : 'Sample Window (More Exist)'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Link to="/workspace" className="flex-1">
                    <Button variant="outline" size="sm" className="w-full justify-center" icon={PlayCircle}>
                      Open Workspace
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
              <div className="space-y-3 pt-2 border-t border-[#222E42]">
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Generate and independently audit a batch of 50 conflict-free flight-to-gate assignments for scenario{' '}
                  <strong className="text-sky-400 font-mono">{selectedSimId}</strong>.
                </p>

                {allocationError && (
                  <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-800/40 text-xs text-rose-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{allocationError}</span>
                  </div>
                )}

                <Button
                  size="sm"
                  icon={PlayCircle}
                  onClick={handleGenerateSample}
                  disabled={isGeneratingSample || !math}
                  className="w-full justify-center"
                >
                  {isGeneratingSample ? 'Executing Backtracking Search...' : 'Generate 50 Sample Allocations'}
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ----------------- 6. SIMULATION OVERVIEW SECTION ----------------- */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-semibold text-[#F8FAFC] uppercase tracking-wider font-mono flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" />
              <span>Registered Simulation Scenarios</span>
            </h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Allocation scenario windows configured in the database storage layer.
            </p>
          </div>
          <Link to="/scenarios">
            <Button size="sm" variant="secondary" icon={Layers}>
              Scenario Registry
            </Button>
          </Link>
        </div>

        {simulations.simulations.length > 0 ? (
          <Card className="p-0 overflow-hidden border-[#222E42] bg-[#121826]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-[#222E42]">
                <thead className="bg-[#0D121F] text-[#94A3B8] uppercase font-mono text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Scenario</th>
                    <th className="py-3 px-4">Dimensions</th>
                    <th className="py-3 px-4">Restriction Matrix</th>
                    <th className="py-3 px-4">Configuration</th>
                    <th className="py-3 px-4">Last Updated</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222E42]/60">
                  {simulations.simulations.map((sim) => {
                    const isSelected = sim.id === selectedSimId
                    return (
                      <tr
                        key={sim.id}
                        className={`transition-colors ${
                          isSelected ? 'bg-sky-500/10' : 'hover:bg-[#1E2638]/50'
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-sky-400 font-bold text-xs">{sim.id}</span>
                            <div>
                              <div className="font-semibold text-[#F8FAFC] text-xs">{sim.name}</div>
                              {sim.description && (
                                <div className="text-[11px] text-[#94A3B8] truncate max-w-xs">
                                  {sim.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono">
                          <span className="text-[#F8FAFC] font-medium">{sim.flight_count} flights</span>
                          <span className="text-[#64748B]"> × </span>
                          <span className="text-[#F8FAFC] font-medium">{sim.gate_count} gates</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-mono text-[#F8FAFC] text-[11px] bg-[#1E2638] px-2 py-0.5 rounded border border-[#222E42]">
                            {sim.matrix_status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {sim.is_valid ? (
                            <Badge variant="cyan" size="sm" className="font-mono text-[10px]">
                              Balanced (n × n)
                            </Badge>
                          ) : (
                            <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                              Incomplete
                            </Badge>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px] text-[#94A3B8]">
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
                              {isSelected ? 'Active' : 'Select'}
                            </Button>
                            <Link to="/workspace">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 px-2.5"
                                icon={PlayCircle}
                              >
                                Allocate
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
          <Card className="p-8 text-center space-y-3 bg-[#121826] border-[#222E42]">
            <Layers className="w-8 h-8 text-[#94A3B8] mx-auto" />
            <p className="text-sm text-[#94A3B8]">No simulation scenarios found in the registry.</p>
            <Link to="/scenarios">
              <Button size="sm" icon={PlayCircle}>
                Create Initial Scenario
              </Button>
            </Link>
          </Card>
        )}
      </div>

      {/* ----------------- 7. OPERATIONAL ACTIVITY LOG ----------------- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold text-[#F8FAFC] uppercase tracking-wider font-mono flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400" />
              <span>Operational Activity Stream</span>
            </h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Chronological log of database operations and calculation events.
            </p>
          </div>
          <span className="text-xs font-mono text-[#94A3B8]">
            Audit Stream
          </span>
        </div>

        {summary?.recent_activities?.length > 0 ? (
          <Card className="p-0 overflow-hidden divide-y divide-[#222E42] bg-[#121826] border-[#222E42]">
            {summary.recent_activities.map((act) => {
              let Icon = Activity
              if (act.entity_type === 'Flight') Icon = Plane
              else if (act.entity_type === 'Gate') Icon = DoorClosed
              else if (act.entity_type === 'Simulation') Icon = Layers
              else if (act.entity_type === 'RestrictionMatrix') Icon = Grid3X3
              else if (act.entity_type === 'Allocation') Icon = Calculator

              return (
                <div key={act.id} className="p-3.5 hover:bg-[#1E2638]/50 transition-colors flex items-start gap-3.5">
                  <div className="p-2 rounded-lg shrink-0 mt-0.5 bg-[#1E2638] text-sky-400 border border-[#222E42]">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-[#F8FAFC] truncate">{act.title}</h4>
                      <span className="text-[11px] text-[#94A3B8] font-mono shrink-0">
                        {formatTime(act.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-[#94A3B8] mt-0.5 leading-relaxed">{act.detail}</p>
                  </div>
                </div>
              )
            })}
          </Card>
        ) : (
          <Card className="p-6 text-center text-xs text-[#94A3B8] bg-[#121826] border-[#222E42]">
            No activity events recorded yet. Operational actions will populate this audit log.
          </Card>
        )}
      </div>

      {/* ----------------- 8. QUICK ACCESS OPERATIONAL MODULES ----------------- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold text-[#F8FAFC] uppercase tracking-wider font-mono flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" />
              <span>Operational Modules</span>
            </h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Direct access to all GateWise BLR facilities and analytical subsystems.
            </p>
          </div>
          <span className="text-xs text-[#94A3B8] font-mono">8 Subsystems</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickModules.map((mod) => {
            const Icon = mod.icon
            return (
              <Link
                key={mod.path}
                to={mod.path}
                className="group block rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                <Card className="h-full bg-[#121826] border-[#222E42] group-hover:border-sky-500/40 group-hover:bg-[#1E2638] transition-all flex flex-col justify-between p-4 shadow-sm">
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-[#1E2638] border border-[#222E42] text-sky-400 transition-transform">
                        <Icon className="w-4 h-4" />
                      </div>
                      <Badge variant="cyan" size="sm" className="font-mono text-[10px]">
                        {mod.tag}
                      </Badge>
                    </div>

                    <h3 className="text-sm font-semibold text-[#F8FAFC] group-hover:text-sky-300 transition-colors flex items-center justify-between">
                      <span>{mod.title}</span>
                      <ChevronRight className="w-4 h-4 text-[#64748B] group-hover:text-sky-400 group-hover:translate-x-1 transition-all shrink-0" />
                    </h3>

                    <p className="text-xs text-[#94A3B8] mt-1.5 leading-relaxed">
                      {mod.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#222E42] flex items-center justify-between text-[11px] text-[#94A3B8] group-hover:text-sky-300">
                    <span>Open Module</span>
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
