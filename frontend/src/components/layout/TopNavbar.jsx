import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Terminal, Menu, Sparkles, ChevronRight, CheckCircle2 } from 'lucide-react'
import { allNavItems } from './Sidebar'

export const TopNavbar = ({ onOpenMobileMenu }) => {
  const location = useLocation()
  const currentNav = allNavItems.find((n) => n.path === location.pathname) || { name: 'Operations' }

  return (
    <header className="h-16 border-b border-[#1e3a5f]/60 bg-gw-bg/90 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Menu Toggle */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-gw-text-secondary hover:text-gw-text hover:bg-white/5 border border-[#1e3a5f]/50 cursor-pointer"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb & Title */}
        <div>
          <div className="flex items-center gap-1.5 text-xs text-gw-text-secondary font-mono mb-0.5">
            <Link to="/dashboard" className="hover:text-gw-cyan transition-colors">
              GateWise
            </Link>
            <ChevronRight className="w-3 h-3 text-[#1e3a5f]" />
            <span className="text-gw-text font-medium">{currentNav.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gw-text tracking-tight">
              {currentNav.name}
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gw-success/10 border border-gw-success/25 text-gw-success font-mono font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-gw-success animate-pulse" />
              OPERATIONAL
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Dominant Primary Action: Guided Allocation Workspace */}
        {location.pathname !== '/workspace' && (
          <Link to="/workspace">
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gw-cyan/15 hover:bg-gw-cyan/25 text-gw-cyan border border-gw-cyan/35 text-xs font-semibold shadow-sm shadow-gw-cyan/10 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-gw-cyan" />
              <span className="hidden sm:inline">Start</span>
              <span>Allocation</span>
            </button>
          </Link>
        )}

        {/* Mathematical Engine Status Telemetry */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gw-card border border-[#1e3a5f]/60 text-xs text-gw-text-secondary">
          <Terminal className="w-3.5 h-3.5 text-gw-cyan" />
          <span className="font-mono text-gw-cyan font-semibold text-[11px]">ROOK-POLY</span>
          <span className="text-[11px] text-gw-text-secondary">Deterministic</span>
        </div>

        {/* Public Landing Link */}
        <Link
          to="/"
          className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-[#1e3a5f] text-gw-text-secondary hover:text-gw-text hover:bg-white/5 transition-colors hidden sm:inline-block"
        >
          Landing Page
        </Link>
      </div>
    </header>
  )
}

export default TopNavbar
