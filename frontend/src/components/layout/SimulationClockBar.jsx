import React from 'react'
import { Play, Pause, RotateCcw, FastForward, Clock } from 'lucide-react'
import { useAirport } from '../../context/AirportContext'

export const SimulationClockBar = () => {
  const { simClock, controlClock } = useAirport()
  const isRunning = simClock?.is_running
  const timeStr = simClock?.sim_time || '08:30'
  const speed = simClock?.speed_multiplier || 1

  const handleToggle = () => {
    controlClock(isRunning ? 'pause' : 'start')
  }

  const handleStep = () => {
    controlClock('tick', { advance_minutes: 5 })
  }

  const handleReset = () => {
    controlClock('reset')
  }

  const cycleSpeed = () => {
    const speeds = [1, 2, 5, 10]
    const nextIdx = (speeds.indexOf(speed) + 1) % speeds.length
    controlClock('speed', { speed: speeds[nextIdx] })
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 bg-[#091524] px-2.5 py-1 rounded-xl border border-[#1e3a5f]/80 text-xs shadow-inner">
      <div className="flex items-center gap-1.5 text-gw-cyan font-mono font-bold tracking-wider">
        <Clock className="w-3.5 h-3.5 text-gw-cyan" />
        <span>{timeStr}</span>
        <span className="text-[10px] text-gw-text-secondary font-normal font-sans">IST</span>
      </div>

      <div className="h-3.5 w-px bg-[#1e3a5f]" />

      {/* Play/Pause */}
      <button
        type="button"
        onClick={handleToggle}
        className={`p-1 rounded-md transition-colors cursor-pointer ${
          isRunning
            ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
            : 'bg-gw-cyan/20 text-gw-cyan hover:bg-gw-cyan/30'
        }`}
        title={isRunning ? 'Pause Simulation' : 'Start Simulation'}
        aria-label={isRunning ? 'Pause' : 'Start'}
      >
        {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </button>

      {/* Step +5 min */}
      <button
        type="button"
        onClick={handleStep}
        className="px-1.5 py-0.5 rounded text-[11px] font-mono text-gw-text-secondary hover:text-gw-text hover:bg-white/5 transition-colors cursor-pointer"
        title="Advance simulation by 5 minutes"
      >
        +5m
      </button>

      {/* Speed Multiplier */}
      <button
        type="button"
        onClick={cycleSpeed}
        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#122844] text-gw-cyan hover:bg-[#1e3a5f] transition-colors cursor-pointer"
        title="Change simulation speed multiplier (1x, 2x, 5x, 10x)"
      >
        <FastForward className="w-3 h-3" />
        <span>{speed}x</span>
      </button>

      {/* Reset */}
      <button
        type="button"
        onClick={handleReset}
        className="p-1 rounded text-gw-text-secondary hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer"
        title="Reset simulation to 08:30"
        aria-label="Reset simulation clock"
      >
        <RotateCcw className="w-3 h-3" />
      </button>
    </div>
  )
}

export default SimulationClockBar
