import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, ChevronRight, Activity } from 'lucide-react'
import { allNavItems } from './Sidebar'

export const TopNavbar = ({ onOpenMobileMenu }) => {
  const location = useLocation()
  const currentNav = allNavItems.find((n) => n.path === location.pathname) || { name: 'Operations' }

  return (
    <header className="h-16 border-b border-[#333333] bg-[#090909] sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 shrink-0">
        {/* Mobile Hamburger Menu Toggle */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-[#A3A3A3] hover:text-[#FFFFFF] hover:bg-[#222222] border border-[#333333] cursor-pointer transition-colors"
          title="Open Menu"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Airport Identity & Breadcrumbs */}
        <div>
          <div className="flex items-center gap-1.5 text-xs text-[#A3A3A3] font-mono mb-0.5">
            <Link to="/dashboard" className="hover:text-[#FFFFFF] transition-colors font-medium">
              GATEWISE BLR
            </Link>
            <ChevronRight className="w-3 h-3 text-[#555555]" />
            <span className="text-[#FFFFFF] font-medium truncate max-w-[140px] sm:max-w-none">{currentNav.name}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm sm:text-base font-bold text-[#FFFFFF] tracking-tight truncate">
              {currentNav.name}
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#222222] border border-[#333333] text-[#E5E5E5] font-mono font-medium flex items-center">
              DEMONSTRATION ENVIRONMENT
            </span>
          </div>
        </div>
      </div>

      {/* Right: Clean System Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#181818] border border-[#333333] text-xs">
          <Activity className="w-3.5 h-3.5 text-[#FFFFFF]" />
          <span className="text-[#A3A3A3] hidden sm:inline">System Status:</span>
          <span className="font-mono text-[#FFFFFF] font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFFFFF]" />
            OPERATIONAL
          </span>
        </div>
      </div>
    </header>
  )
}

export default TopNavbar
