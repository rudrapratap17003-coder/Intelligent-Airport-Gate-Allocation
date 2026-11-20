import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Building2,
  Plane,
  DoorClosed,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ExternalLink,
  Info,
  Maximize2,
  Layers,
  ArrowRight,
  RefreshCw
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import Counter from '../components/ui/Counter'
import { useAirport } from '../context/AirportContext'
import blrService from '../lib/blrService'

export const TerminalManagement = () => {
  const { selectedTerminal, setSelectedTerminal } = useAirport()
  const [activeTab, setActiveTab] = useState(selectedTerminal === 'ALL' ? 'T1' : selectedTerminal)
  const [terminalData, setTerminalData] = useState(null)
  const [stands, setStands] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (selectedTerminal !== 'ALL' && selectedTerminal !== activeTab) {
      setActiveTab(selectedTerminal)
    }
  }, [selectedTerminal])

  const fetchTerminalData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [termDetail, standsList] = await Promise.all([
        blrService.getTerminalDetail(activeTab),
        blrService.getStands(activeTab)
      ])
      setTerminalData(termDetail)
      setStands(standsList)
    } catch (err) {
      console.error('Failed to fetch terminal data:', err)
      setError(err.message || 'Failed to load terminal details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTerminalData()
  }, [activeTab])

  const handleTabChange = (tId) => {
    setActiveTab(tId)
    setSelectedTerminal(tId)
  }

  return (
    <div className="space-y-6">
      {/* Header and Terminal Switcher Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#333333]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-[#A3A3A3] font-bold tracking-wider uppercase">
              Bengaluru Airport Digital Twin
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#222222] border border-[#333333] text-[#FFFFFF] font-mono">
              VOBL / BLR
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gw-text tracking-tight">
            Terminal Operations Management
          </h1>
          <p className="text-xs text-gw-text-secondary mt-1">
            Operational boundaries, aircraft compatibility envelopes, and apron stand distribution for Kempegowda International Airport.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 bg-[#181818] p-1.5 rounded-xl border border-[#333333]">
          <button
            type="button"
            onClick={() => handleTabChange('T1')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'T1'
                ? 'bg-[#FFFFFF] text-[#090909]'
                : 'text-[#A3A3A3] hover:text-[#FFFFFF] hover:bg-[#222222]'
            }`}
          >
            <Plane className="w-3.5 h-3.5" />
            <span>Terminal 1 (Domestic)</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('T2')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'T2'
                ? 'bg-[#FFFFFF] text-[#090909]'
                : 'text-[#A3A3A3] hover:text-[#FFFFFF] hover:bg-[#222222]'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Terminal 2 (Int'l / Premium)</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-[#222222] text-[#FFFFFF] font-mono border border-[#333333]">Code F</span>
          </button>
        </div>
      </div>

      {/* Academic Simulation Notice */}
      <div className="p-3.5 rounded-xl bg-[#181818] border border-[#333333] text-xs flex items-start gap-3">
        <Info className="w-4 h-4 text-[#FFFFFF] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-[#FFFFFF]">
            Data Classification Notice — Academic Digital Twin Prototype
          </p>
          <p className="text-gw-text-secondary text-[11px] leading-relaxed">
            Terminal roles and airline assignments are derived from official published BIAL specifications (<span className="text-[#FFFFFF]">Verified Public Data</span>). Stand configurations and physical capacities are configured for demonstration (<span className="text-[#A3A3A3]">Configurable Demonstration Data</span>). Flight schedules and real-time allocations are generated for academic analysis (<span className="text-[#E5E5E5]">Simulated Operational Data</span>).
          </p>
        </div>
      </div>

      {loading && !terminalData ? (
        <div className="h-64 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-[#FFFFFF] animate-spin" />
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-[#181818] border border-[#333333] text-[#A3A3A3] text-sm">
          {error}
        </div>
      ) : (
        terminalData && (
          <div className="space-y-6">
            {/* Terminal High-Level Specs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between text-xs text-gw-text-secondary mb-1">
                    <span>Terminal Role</span>
                    <Building2 className="w-4 h-4 text-[#FFFFFF]" />
                  </div>
                  <div className="text-base font-bold text-gw-text">
                    {activeTab === 'T1' ? 'Dedicated Domestic' : 'International & Full-Service'}
                  </div>
                  <div className="text-[11px] text-gw-text-secondary mt-1">
                    {terminalData.area_sq_m.toLocaleString()} sq m • Opened {terminalData.opened_year}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between text-xs text-gw-text-secondary mb-1">
                    <span>Aircraft Envelope</span>
                    <Maximize2 className="w-4 h-4 text-[#FFFFFF]" />
                  </div>
                  <div className="text-base font-bold text-gw-text">
                    Up to {terminalData.max_wingspan_m}m Wingspan
                  </div>
                  <div className="text-[11px] text-gw-text-secondary mt-1">
                    Categories: {terminalData.supported_aircraft_categories.join(', ')}
                  </div>
                </CardContent>
              </Card>

              <Card interactive>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between text-xs text-gw-text-secondary mb-1">
                    <span>Apron Stands</span>
                    <DoorClosed className="w-4 h-4 text-[#FFFFFF]" />
                  </div>
                  <div className="text-base font-bold text-gw-text flex items-center gap-1.5">
                    <Counter value={terminalData.statistics.total_stands} className="text-xl font-bold text-gw-text" />
                    <span>Registered Stands</span>
                  </div>
                  <div className="text-[11px] text-gw-text-secondary mt-1">
                    {terminalData.statistics.contact_stands} Contact Aerobridge • {terminalData.statistics.remote_stands} Remote
                  </div>
                </CardContent>
              </Card>

              <Card interactive>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between text-xs text-gw-text-secondary mb-1">
                    <span>Stand Utilization</span>
                    <Layers className="w-4 h-4 text-[#FFFFFF]" />
                  </div>
                  <div className="text-base font-bold text-gw-text flex items-center gap-1">
                    <Counter value={terminalData.statistics.stand_utilization_pct} suffix="%" className="text-xl font-bold text-gw-text" />
                    <span>Active</span>
                  </div>
                  <div className="text-[11px] text-gw-text-secondary mt-1">
                    {terminalData.statistics.occupied_stands} Occupied • {terminalData.statistics.available_stands} Available
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Airlines & Aircraft Compatibility Rules */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Primary Airlines */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Plane className="w-4 h-4 text-[#FFFFFF]" />
                    <span>Primary Operating Airlines</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-gw-text-secondary">
                    Official carrier terminal allocations under BIAL operational protocols:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {terminalData.primary_airlines.map((airline) => (
                      <div
                        key={airline.code}
                        className="p-2.5 rounded-lg bg-[#181818] border border-[#333333] flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-md bg-[#222222] text-[#FFFFFF] font-mono font-bold text-xs flex items-center justify-center border border-[#333333]">
                            {airline.code}
                          </span>
                          <div>
                            <div className="text-xs font-semibold text-gw-text">{airline.name}</div>
                            <div className="text-[10px] text-gw-text-secondary">{airline.type}</div>
                          </div>
                        </div>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#FFFFFF]" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Compatibility Rules */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#FFFFFF]" />
                    <span>Terminal Compatibility & Restriction Rules</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="p-3 rounded-lg bg-[#181818] border border-[#333333] space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-gw-text">
                      <span className="w-2 h-2 rounded-full bg-[#FFFFFF]" />
                      <span>Flight Eligibility Boundary</span>
                    </div>
                    <p className="text-gw-text-secondary text-[11px]">
                      {activeTab === 'T1'
                        ? 'Terminal 1 exclusively handles Domestic flights. Any International flight assigned to a T1 stand is strictly rejected by the compatibility engine.'
                        : 'Terminal 2 handles all scheduled International operations as well as full-service Domestic flights (Air India, Vistara). Narrow and wide-body aircraft permitted.'}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-[#181818] border border-[#333333] space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-gw-text">
                      <span className="w-2 h-2 rounded-full bg-[#FFFFFF]" />
                      <span>Wingspan & Jetway Capabilities</span>
                    </div>
                    <p className="text-gw-text-secondary text-[11px]">
                      {activeTab === 'T1'
                        ? 'Stands G1 through G2 support Code C narrow-body aircraft (wingspan up to 36m, e.g. A320neo, B737 MAX). Wide-body aircraft (Code E/F) are physically incompatible.'
                        : 'Stands G3 through G6 support Code E wide-body aircraft (wingspan up to 65m, e.g. B777, A350). Stand G6 / Stand 210 features dual aerobridges for Code F (A380) operations.'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Stands & Gates Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DoorClosed className="w-4 h-4 text-[#FFFFFF]" />
                  <span>{activeTab === 'T1' ? 'Terminal 1' : 'Terminal 2'} Apron Stands & Docking Positions</span>
                </CardTitle>
                <div className="text-xs text-gw-text-secondary font-mono">
                  {stands.length} Stands Defined
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#181818] text-gw-text-secondary border-b border-[#333333] font-mono uppercase text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Gate / Stand</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Max Aircraft Code</th>
                        <th className="py-2.5 px-3">Max Wingspan</th>
                        <th className="py-2.5 px-3">Jetway</th>
                        <th className="py-2.5 px-3">Capacity</th>
                        <th className="py-2.5 px-3">Operational Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#333333] font-mono">
                      {stands.map((s) => (
                        <tr key={s.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-gw-text flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-[#222222] text-[#FFFFFF] text-xs flex items-center justify-center border border-[#333333]">
                              {s.gate_number}
                            </span>
                            <span>{s.stand_number}</span>
                          </td>
                          <td className="py-2.5 px-3 text-gw-text-secondary">{s.stand_type}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#222222] text-[#FFFFFF] border border-[#333333]">
                              {s.aircraft_category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-gw-text">{s.max_wingspan_m} m</td>
                          <td className="py-2.5 px-3">
                            {s.has_jetway ? (
                              <span className="text-[#FFFFFF] font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Aerobridge
                              </span>
                            ) : (
                              <span className="text-[#A3A3A3] font-semibold flex items-center gap-1">
                                Bus Gate
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-gw-text-secondary">{s.max_capacity} pax</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#222222] text-[#FFFFFF] border border-[#333333]">
                              {s.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      )}
    </div>
  )
}

export default TerminalManagement
