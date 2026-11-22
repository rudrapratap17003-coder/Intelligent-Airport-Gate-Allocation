import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, ChevronRight, Activity, Plane } from 'lucide-react'
import { allNavItems } from './Sidebar'

const TopNavbarComponent = ({ onOpenMobileMenu }) => {
  const location = useLocation()
  const currentNav = allNavItems.find((n) => n.path === location.pathname) || { name: 'Operations' }

  return (
    <header className="h-16 border-b border-[#222E42] bg-[#080B11]/95 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between gap-4 transition-colors">
      <div className="flex items-center gap-3 shrink-0">
        {/* Mobile Hamburger Menu Toggle */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#121826] border border-[#222E42] cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          title="Open Menu"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Airport Identity & Breadcrumbs */}
        <div>
          <div className="flex items-center gap-1.5 text-xs text-[#94A3B8] font-mono mb-0.5">
            <Link to="/dashboard" className="hover:text-sky-400 transition-colors font-medium flex items-center gap-1">
              <Plane className="w-3 h-3 text-sky-400 inline" />
              <span>GATEWISE BLR</span>
            </Link>
            <ChevronRight className="w-3 h-3 text-[#64748B]" />
            <span className="text-[#F8FAFC] font-medium truncate max-w-[140px] sm:max-w-none">{currentNav.name}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm sm:text-base font-bold text-[#F8FAFC] tracking-tight truncate">
              {currentNav.name}
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#121826] border border-[#222E42] text-sky-400 font-mono font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              BLR / VOBL DEMO
            </span>
          </div>
        </div>
      </div>

      {/* Right: Clean Operational System Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#121826] border border-[#222E42] text-xs">
          <Activity className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-[#94A3B8] hidden sm:inline">System Status:</span>
          <span className="font-mono text-[#F8FAFC] font-medium flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            OPERATIONAL
          </span>
        </div>
      </div>
    </header>
  )
}

export const TopNavbar = React.memo(TopNavbarComponent)
export default TopNavbar
