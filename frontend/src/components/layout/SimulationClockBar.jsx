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
    <div className="flex items-center gap-1.5 sm:gap-2 bg-[#121826] px-3 py-1.5 rounded-xl border border-[#222E42] text-xs shadow-sm">
      <div className="flex items-center gap-1.5 text-[#F8FAFC] font-mono font-bold tracking-wider">
        <Clock className="w-3.5 h-3.5 text-sky-400" />
        <span>{timeStr}</span>
        <span className="text-[10px] text-[#94A3B8] font-normal font-sans">IST</span>
      </div>

      <div className="h-3.5 w-px bg-[#222E42]" />

      {/* Play/Pause */}
      <button
        type="button"
        onClick={handleToggle}
        className={`p-1.5 rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
          isRunning
            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
            : 'bg-[#1E2638] text-[#F8FAFC] border border-[#222E42] hover:bg-[#2A344A]'
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
        className="px-2 py-1 rounded text-[11px] font-mono text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E2638] transition-colors cursor-pointer border border-transparent hover:border-[#222E42] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        title="Advance simulation by 5 minutes"
      >
        +5m
      </button>

      {/* Cycle Speed */}
      <button
        type="button"
        onClick={cycleSpeed}
        className="flex items-center gap-0.5 px-2 py-1 rounded text-[11px] font-mono text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E2638] transition-colors cursor-pointer border border-transparent hover:border-[#222E42] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        title="Cycle playback speed"
      >
        <FastForward className="w-3 h-3 text-sky-400" />
        <span>{speed}x</span>
      </button>

      {/* Reset */}
      <button
        type="button"
        onClick={handleReset}
        className="p-1.5 rounded text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E2638] transition-colors cursor-pointer border border-transparent hover:border-[#222E42] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        title="Reset clock to 08:30"
        aria-label="Reset simulation clock"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export default SimulationClockBar
