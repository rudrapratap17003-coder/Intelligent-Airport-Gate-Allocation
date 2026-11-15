import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Bell, Terminal, Menu, Shield } from 'lucide-react'
import { navItems } from './Sidebar'

export const TopNavbar = ({ onOpenMobileMenu }) => {
  const location = useLocation()
  const currentNav = navItems.find((n) => n.path === location.pathname) || { name: 'Overview' }

  return (
    <header className="h-16 border-b border-[#1e3a5f]/60 bg-gw-bg/85 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between">
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

        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gw-text tracking-tight">
              {currentNav.name}
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gw-cyan/10 border border-gw-cyan/25 text-gw-cyan font-mono font-medium">
              READY
            </span>
          </div>
          <p className="text-xs text-gw-text-secondary hidden sm:block">
            Discrete Mathematics Gate Assignment Engine
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Mathematical Engine Status Telemetry */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gw-card border border-[#1e3a5f]/60 text-xs text-gw-text-secondary">
          <Terminal className="w-3.5 h-3.5 text-gw-cyan" />
          <span className="font-mono text-gw-cyan font-semibold">ROOK-POLY</span>
          <span className="hidden md:inline text-gw-text-secondary">Deterministic</span>
        </div>

        {/* Public Landing Link */}
        <Link
          to="/"
          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gw-cyan/30 text-gw-cyan hover:bg-gw-cyan/10 transition-colors"
        >
          Landing Page
        </Link>
      </div>
    </header>
  )
}

export default TopNavbar
