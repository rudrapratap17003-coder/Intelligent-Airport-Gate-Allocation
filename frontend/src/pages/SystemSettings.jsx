import React, { useState, useEffect } from 'react'
import {
  Settings,
  Database,
  Terminal,
  ShieldCheck,
  RefreshCw,
  Cpu,
  Server,
  Activity,
  Layers,
  Info,
  CheckCircle2
} from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Notification from '../components/ui/Notification'
import dashboardService from '../lib/dashboardService'
import flightService from '../lib/flightService'
import gateService from '../lib/gateService'

export const SystemSettings = () => {
  const [summary, setSummary] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [notification, setNotification] = useState(null)

  useEffect(() => {
    loadHealth()
  }, [])

  const loadHealth = async () => {
    try {
      setIsLoading(true)
      const data = await dashboardService.getSummary()
      setSummary(data)
    } catch (err) {
      console.error('Failed to load system health:', err)
      setNotification({
        type: 'danger',
        title: 'Backend Disconnected',
        message: 'Unable to query backend health telemetry.'
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleResetSampleData = async () => {
    try {
      await Promise.all([
        flightService.resetDefaults(),
        gateService.resetDefaults()
      ])
      setNotification({
        type: 'success',
        title: 'Benchmark Restored',
        message: 'Successfully re-synchronized sample benchmark flights and gates.'
      })
      loadHealth()
    } catch (err) {
      setNotification({
        type: 'danger',
        title: 'Reset Failed',
        message: err.message || 'Failed to restore default sample entities.'
      })
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto">
      {/* -------------------- HEADER -------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#333333]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="gw-page-heading">System Settings & Health</h1>
            <Badge variant="default" size="sm" dot>
              System Online
            </Badge>
          </div>
          <p className="text-sm text-gw-text-secondary mt-1">
            Authoritative runtime telemetry, database persistence diagnostics, and discrete mathematical configuration.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="md"
            icon={RefreshCw}
            className={isRefreshing ? 'opacity-70' : ''}
            onClick={() => {
              setIsRefreshing(true)
              loadHealth()
            }}
          >
            Refresh Telemetry
          </Button>
          <Button
            variant="secondary"
            size="md"
            icon={RefreshCw}
            onClick={handleResetSampleData}
          >
            Reset Sample Benchmark
          </Button>
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

      {/* -------------------- RUNTIME INFRASTRUCTURE STATUS -------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 space-y-3 border-[#333333] bg-[#181818]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-gw-text-secondary">
              Backend Server
            </span>
            <div className="p-1.5 rounded-lg bg-[#111111] text-white border border-[#333333]">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xl font-bold font-mono text-gw-text">FastAPI v0.115+</div>
            <div className="text-xs text-white flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              REST API Online • 127.0.0.1:8000
            </div>
          </div>
          <p className="text-[11px] text-gw-text-secondary pt-1 border-t border-[#333333] font-mono">
            Python 3.14 Core Engine
          </p>
        </Card>

        <Card className="p-4 space-y-3 border-[#333333] bg-[#181818]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-gw-text-secondary">
              Authoritative Storage Layer
            </span>
            <div className="p-1.5 rounded-lg bg-[#111111] text-white border border-[#333333]">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xl font-bold font-mono text-gw-text">SQLite / SQLAlchemy 2.x</div>
            <div className="text-xs text-white flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-white" />
              Synchronized & Persistent
            </div>
          </div>
          <p className="text-[11px] text-gw-text-secondary pt-1 border-t border-[#333333] font-mono">
            Tables: flights, gates, simulations, restrictions
          </p>
        </Card>

        <Card className="p-4 space-y-3 border-[#333333] bg-[#181818]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-gw-text-secondary">
              Discrete Math Engine
            </span>
            <div className="p-1.5 rounded-lg bg-[#111111] text-white border border-[#333333]">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xl font-bold font-mono text-white">Rook-Poly & PIE</div>
            <div className="text-xs text-gw-text-secondary flex items-center gap-1.5 font-mono">
              Arbitrary-Precision Integer Arithmetic
            </div>
          </div>
          <p className="text-[11px] text-gw-text-secondary pt-1 border-t border-[#333333] font-mono">
            Zero Mocking • Pure Combinatorics
          </p>
        </Card>
      </div>

      {/* -------------------- PRODUCT POSITIONING STATEMENT -------------------- */}
      <Card className="p-5 border-[#333333] bg-[#181818] space-y-3">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-white" />
          <h3 className="font-bold text-sm text-gw-text">System Purpose & Architectural Boundaries</h3>
        </div>
        <p className="text-xs text-gw-text-secondary leading-relaxed">
          <strong>GateWise</strong> is currently engineered as a mathematical decision-support system executing discrete combinatorial bijections between $n$ flights and $n$ gates in a static assignment window.
        </p>
        <p className="text-xs text-gw-text-secondary leading-relaxed">
          Full physical airport operational deployment additionally requires continuous-time occupancy windows, dynamic flight delays, and multi-terminal baggage networks. The GateWise architecture is designed to support these dimensional extensions in future development stages without misrepresenting them as currently active.
        </p>
      </Card>
    </div>
  )
}

export default SystemSettings
