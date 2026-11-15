import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Plane,
  DoorClosed,
  Grid3X3,
  Calculator,
  PlayCircle,
  BarChart3,
  BookOpen,
  Info,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react'

export const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Flight Management', path: '/flights', icon: Plane },
  { name: 'Gate Management', path: '/gates', icon: DoorClosed },
  { name: 'Restriction Matrix', path: '/restrictions', icon: Grid3X3 },
  { name: 'Calculation Engine', path: '/calculation', icon: Calculator },
  { name: 'Allocation Simulator', path: '/simulator', icon: PlayCircle },
  { name: 'Analytics & Compare', path: '/analytics', icon: BarChart3 },
  { name: 'Math Explorer', path: '/math-explorer', icon: BookOpen },
  { name: 'Project Info', path: '/about', icon: Info },
]

export const Sidebar = ({ isCollapsed, setIsCollapsed, mobileOpen, setMobileOpen }) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => setMobileOpen?.(false)}
        />
      )}

      {/* Main Sidebar Element */}
      <aside
        className={`
          fixed top-0 bottom-0 left-0 z-50 h-screen bg-gw-bg-secondary border-r border-[#1e3a5f]/60
          transition-all duration-300 flex flex-col justify-between
          ${/* Desktop width rules */ ''}
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
          ${/* Mobile slide-in rules */ ''}
          ${mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand Header */}
        <div>
          <div className="h-16 flex items-center px-4 border-b border-[#1e3a5f]/60 justify-between">
            <NavLink
              to="/"
              onClick={() => setMobileOpen?.(false)}
              className="flex items-center gap-3 overflow-hidden group"
            >
              <div className="w-10 h-10 rounded-xl bg-gw-cyan/10 border border-gw-cyan/30 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                <Plane className="w-6 h-6 text-gw-cyan rotate-[-45deg]" />
              </div>
              {(!isCollapsed || mobileOpen) && (
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-lg text-gw-text tracking-tight font-sans truncate">
                    Gate<span className="text-gw-cyan">Wise</span>
                  </span>
                  <span className="text-[10px] text-gw-text-secondary uppercase tracking-widest font-mono">
                    Discrete Math
                  </span>
                </div>
              )}
            </NavLink>

            {/* Desktop collapse toggle */}
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex p-1.5 rounded-lg text-gw-text-secondary hover:text-gw-text hover:bg-white/5 border border-transparent hover:border-[#1e3a5f] transition-colors cursor-pointer"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={() => setMobileOpen?.(false)}
              className="lg:hidden p-1.5 rounded-lg text-gw-text-secondary hover:text-gw-text hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1.5 overflow-y-auto max-h-[calc(100vh-140px)]">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen?.(false)}
                  className={({ isActive }) => `
                    flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative
                    ${isActive
                      ? 'bg-gw-cyan/15 text-gw-cyan border border-gw-cyan/35 font-semibold shadow-inner shadow-gw-cyan/5'
                      : 'text-gw-text-secondary hover:text-gw-text hover:bg-white/[0.04]'
                    }
                    ${isCollapsed && !mobileOpen ? 'justify-center' : ''}
                  `}
                  title={isCollapsed && !mobileOpen ? item.name : undefined}
                >
                  <Icon className="w-5 h-5 shrink-0 transition-transform group-hover:scale-105" />
                  {(!isCollapsed || mobileOpen) && <span className="truncate">{item.name}</span>}

                  {/* Desktop Hover Tooltip (when collapsed) */}
                  {isCollapsed && !mobileOpen && (
                    <div className="absolute left-full ml-3 px-2.5 py-1 bg-gw-card border border-[#1e3a5f] rounded-md text-xs font-medium text-gw-text whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl">
                      {item.name}
                    </div>
                  )}
                </NavLink>
              )
            })}
          </nav>
        </div>

        {/* Ops Footer Telemetry */}
        <div className="p-3 border-t border-[#1e3a5f]/60 bg-gw-bg/40">
          <div className={`flex items-center ${isCollapsed && !mobileOpen ? 'justify-center' : 'gap-3 px-2'} py-1.5`}>
            <div className="w-2.5 h-2.5 rounded-full bg-gw-success animate-pulse shrink-0" />
            {(!isCollapsed || mobileOpen) && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium text-gw-text truncate">Aviation Ops Core</span>
                <span className="text-[10px] text-gw-text-secondary font-mono">v1.0 • Standby</span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
