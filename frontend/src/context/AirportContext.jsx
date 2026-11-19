import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import blrService from '../lib/blrService.js'

const AirportContext = createContext(null)

export const AirportProvider = ({ children }) => {
  const [selectedTerminal, setSelectedTerminalState] = useState(() => {
    return localStorage.getItem('gw_blr_terminal') || 'ALL'
  })

  const [airportConfig, setAirportConfig] = useState(null)
  const [terminalsSummary, setTerminalsSummary] = useState([])
  const [simClock, setSimClock] = useState({
    is_running: false,
    sim_time: '08:30',
    sim_time_minutes: 510,
    speed_multiplier: 1,
    events_count: 5,
    events: [],
    data_tier: 'SIMULATED_OPERATIONAL_DATA'
  })
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  const setSelectedTerminal = (term) => {
    setSelectedTerminalState(term)
    localStorage.setItem('gw_blr_terminal', term)
  }

  const loadData = useCallback(async () => {
    try {
      const [cfg, terms, clk, alt] = await Promise.all([
        blrService.getConfig().catch(() => null),
        blrService.getTerminals().catch(() => []),
        blrService.getClock().catch(() => null),
        blrService.getAlerts(selectedTerminal).catch(() => [])
      ])
      if (cfg) setAirportConfig(cfg)
      if (terms) setTerminalsSummary(terms)
      if (clk) setSimClock(clk)
      if (alt) setAlerts(alt)
    } catch (err) {
      console.error('Failed to load BLR context data:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedTerminal])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Periodic clock sync if running
  useEffect(() => {
    let interval = null
    if (simClock?.is_running) {
      interval = setInterval(async () => {
        try {
          const res = await blrService.controlClock('tick', { advance_minutes: 2 })
          setSimClock(res)
        } catch (err) {
          console.error('Clock tick error:', err)
        }
      }, 3000 / (simClock.speed_multiplier || 1))
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [simClock?.is_running, simClock?.speed_multiplier])

  const controlClock = async (action, params = {}) => {
    try {
      const updated = await blrService.controlClock(action, params)
      setSimClock(updated)
      return updated
    } catch (err) {
      console.error(`Clock control '${action}' failed:`, err)
      throw err
    }
  }

  const refreshAlerts = async () => {
    try {
      const alt = await blrService.getAlerts(selectedTerminal)
      setAlerts(alt)
    } catch (err) {
      console.error('Failed to refresh alerts:', err)
    }
  }

  return (
    <AirportContext.Provider
      value={{
        selectedTerminal,
        setSelectedTerminal,
        airportConfig,
        terminalsSummary,
        simClock,
        controlClock,
        alerts,
        refreshAlerts,
        loading
      }}
    >
      {children}
    </AirportContext.Provider>
  )
}

export const useAirport = () => {
  const ctx = useContext(AirportContext)
  if (!ctx) {
    throw new Error('useAirport must be used within an AirportProvider')
  }
  return ctx
}

export default AirportContext
