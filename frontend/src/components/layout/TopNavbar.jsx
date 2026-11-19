import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Terminal, Menu, Sparkles, ChevronRight, Compass } from 'lucide-react'
import { allNavItems } from './Sidebar'
import TerminalSwitcher from './TerminalSwitcher'
import SimulationClockBar from './SimulationClockBar'

export const TopNavbar = ({ onOpenMobileMenu }) => {
  const location = useLocation()
  const currentNav = allNavItems.find((n) => n.path === location.pathname) || { name: 'Operations' }

  return (
    <header className="h-16 border-b border-[#1e3a5f]/60 bg-gw-bg/95 backdrop-blur-md sticky top-0 z-20 px-3 sm:px-6 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Mobile Hamburger Menu Toggle */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-gw-text-secondary hover:text-gw-text hover:bg-white/5 border border-[#1e3a5f]/50 cursor-pointer transition-colors"
          title="Open Menu"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Airport Identity & Breadcrumb */}
        <div>
          <div className="flex items-center gap-1.5 text-xs text-gw-text-secondary font-mono mb-0.5">
            <Link to="/dashboard" className="hover:text-gw-cyan transition-colors font-semibold text-gw-cyan">
              BLR DIGITAL TWIN
            </Link>
            <ChevronRight className="w-3 h-3 text-[#1e3a5f]" />
            <span className="text-gw-text font-medium truncate max-w-[120px] sm:max-w-none">{currentNav.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-gw-text tracking-tight truncate">
              {currentNav.name}
            </h2>
            <span className="hidden md:flex text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono font-medium items-center gap-1">
              VOBL / BLR
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gw-success/10 border border-gw-success/25 text-gw-success font-mono font-medium hidden sm:flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-gw-success animate-pulse" />
              SIMULATED
            </span>
          </div>
        </div>
      </div>

      {/* Center / Right: Terminal Switcher & Simulation Controls */}
      <div className="flex items-center gap-2 sm:gap-3 py-1">
        {/* Terminal Switcher */}
        <div className="hidden sm:block">
          <TerminalSwitcher />
        </div>

        {/* Simulation Clock Controls */}
        <div className="hidden lg:block">
          <SimulationClockBar />
        </div>

        {/* Map Shortcut */}
        <Link
          to="/airport-map"
          className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#1e3a5f] text-xs text-gw-text-secondary hover:text-gw-cyan hover:border-gw-cyan/40 hover:bg-white/5 transition-all"
        >
          <Compass className="w-3.5 h-3.5 text-gw-cyan" />
          <span>Airport Map</span>
        </Link>

        {/* Dominant Primary Action: Guided Allocation Workspace */}
        {location.pathname !== '/workspace' && (
          <Link to="/workspace">
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gw-cyan text-gw-bg font-semibold text-xs shadow-md shadow-gw-cyan/20 hover:bg-[#38d4f5] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-gw-bg" />
              <span className="hidden md:inline">Start</span>
              <span>Allocation</span>
            </motion.button>
          </Link>
        )}

        {/* Mathematical Engine Status Telemetry */}
        <div className="hidden 2xl:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gw-card/80 border border-[#1e3a5f]/60 text-xs text-gw-text-secondary whitespace-nowrap">
          <Terminal className="w-3.5 h-3.5 text-gw-cyan" />
          <span className="font-mono text-gw-cyan font-semibold text-[11px]">ROOK-POLY</span>
          <span className="text-[11px] text-gw-text-secondary">Discrete Math</span>
        </div>
      </div>
    </header>
  )
}

export default TopNavbar
