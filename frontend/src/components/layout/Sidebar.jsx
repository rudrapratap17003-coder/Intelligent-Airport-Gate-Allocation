import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Plane,
  DoorClosed,
  Grid3X3,
  Sparkles,
  Layers,
  BarChart3,
  FileText,
  BookOpen,
  Calculator,
  Settings,
  Info,
  ChevronLeft,
  ChevronRight,
  Compass,
  Building2,
  X
} from 'lucide-react'

export const primaryNavItems = [
  { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Airport Map', path: '/airport-map', icon: Compass, badge: 'BLR' },
  { name: 'Terminals', path: '/terminals', icon: Building2 },
  { name: 'Flights', path: '/flights', icon: Plane },
  { name: 'Gates & Stands', path: '/gates', icon: DoorClosed },
  { name: 'Restrictions', path: '/restrictions', icon: Grid3X3 },
  { name: 'Allocation Workspace', path: '/workspace', icon: Sparkles, badge: 'Guided' },
  { name: 'Scenarios', path: '/scenarios', icon: Layers },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  { name: 'Reports', path: '/reports', icon: FileText },
]

export const secondaryNavItems = [
  { name: 'Mathematics Explorer', path: '/math-explorer', icon: BookOpen },
  { name: 'Mathematical Engine', path: '/calculation', icon: Calculator },
  { name: 'System Settings', path: '/settings', icon: Settings },
  { name: 'Help & Documentation', path: '/about', icon: Info },
]

export const allNavItems = [...primaryNavItems, ...secondaryNavItems]
// Backward compatibility
export const navItems = allNavItems

export const Sidebar = ({ isCollapsed, setIsCollapsed, mobileOpen, setMobileOpen }) => {
  const location = useLocation()

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-xs z-40 lg:hidden"
            onClick={() => setMobileOpen?.(false)}
          />
        )}
      </AnimatePresence>

      {/* Main Sidebar Element */}
      <aside
        className={`
          fixed top-0 bottom-0 left-0 z-50 h-screen bg-gw-bg-secondary/95 backdrop-blur-md border-r border-[#1e3a5f]/60
          transition-all duration-300 ease-in-out flex flex-col justify-between
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
          ${mobileOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand Header */}
        <div className="flex-1 overflow-y-auto">
          <div className="h-16 flex items-center px-4 border-b border-[#1e3a5f]/60 justify-between sticky top-0 bg-gw-bg-secondary/95 backdrop-blur-md z-10">
            <NavLink
              to="/"
              onClick={() => setMobileOpen?.(false)}
              className="flex items-center gap-3 overflow-hidden group"
            >
              <div className="w-10 h-10 rounded-xl bg-gw-cyan/10 border border-gw-cyan/30 flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 group-hover:border-gw-cyan/60 group-hover:shadow-[0_0_12px_rgba(36,200,232,0.3)]">
                <Plane className="w-5 h-5 text-gw-cyan rotate-[-45deg]" />
              </div>
              {(!isCollapsed || mobileOpen) && (
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-base text-gw-text tracking-tight font-sans truncate">
                    Gate<span className="text-gw-cyan">Wise</span> <span className="text-[10px] px-1 py-0.5 rounded bg-cyan-500/15 text-cyan-400 font-mono font-bold">BLR</span>
                  </span>
                  <span className="text-[10px] text-gw-text-secondary uppercase tracking-wider font-mono">
                    Digital Twin Prototype
                  </span>
                </div>
              )}
            </NavLink>

            {/* Desktop collapse toggle */}
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex p-1.5 rounded-lg text-gw-text-secondary hover:text-gw-text hover:bg-white/5 border border-transparent hover:border-[#1e3a5f] transition-all cursor-pointer"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={() => setMobileOpen?.(false)}
              className="lg:hidden p-1.5 rounded-lg text-gw-text-secondary hover:text-gw-text hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Primary Navigation */}
          <nav className="p-3 space-y-1 relative" aria-label="Main Navigation">
            {(!isCollapsed || mobileOpen) && (
              <div className="px-3 pt-2 pb-1 text-[10px] uppercase font-mono tracking-wider text-gw-text-secondary/70">
                Core Operations
              </div>
            )}
            {primaryNavItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen?.(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors duration-150 group relative
                    ${isActive
                      ? 'text-gw-cyan font-semibold'
                      : 'text-gw-text-secondary hover:text-gw-text hover:bg-white/[0.04]'
                    }
                    ${isCollapsed && !mobileOpen ? 'justify-center' : ''}
                  `}
                  title={isCollapsed && !mobileOpen ? item.name : undefined}
                >
                  {/* Sliding Active Pill Animation */}
                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute inset-0 bg-gw-cyan/15 border border-gw-cyan/35 rounded-xl shadow-inner shadow-gw-cyan/10"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}

                  <Icon className="w-4 h-4 shrink-0 transition-transform duration-150 group-hover:scale-110 z-10 relative" />
                  {(!isCollapsed || mobileOpen) && (
                    <div className="flex items-center justify-between flex-1 min-w-0 z-10 relative">
                      <span className="truncate">{item.name}</span>
                      {item.badge && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-gw-cyan/20 text-gw-cyan border border-gw-cyan/30">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Desktop Hover Tooltip (when collapsed) */}
                  {isCollapsed && !mobileOpen && (
                    <div className="absolute left-full ml-3 px-2.5 py-1 bg-gw-card/95 backdrop-blur-md border border-[#1e3a5f] rounded-md text-xs font-medium text-gw-text whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl">
                      {item.name}
                    </div>
                  )}
                </NavLink>
              )
            })}

            {/* Secondary Navigation Section */}
            {(!isCollapsed || mobileOpen) && (
              <div className="px-3 pt-4 pb-1 text-[10px] uppercase font-mono tracking-wider text-gw-text-secondary/70 border-t border-[#1e3a5f]/40 mt-3">
                Resources & Engines
              </div>
            )}
            {secondaryNavItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen?.(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors duration-150 group relative
                    ${isActive
                      ? 'text-gw-cyan font-semibold'
                      : 'text-gw-text-secondary hover:text-gw-text hover:bg-white/[0.04]'
                    }
                    ${isCollapsed && !mobileOpen ? 'justify-center' : ''}
                  `}
                  title={isCollapsed && !mobileOpen ? item.name : undefined}
                >
                  {/* Sliding Active Pill Animation */}
                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute inset-0 bg-gw-cyan/15 border border-gw-cyan/35 rounded-xl shadow-inner shadow-gw-cyan/10"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}

                  <Icon className="w-4 h-4 shrink-0 transition-transform duration-150 group-hover:scale-110 z-10 relative" />
                  {(!isCollapsed || mobileOpen) && <span className="truncate z-10 relative">{item.name}</span>}

                  {isCollapsed && !mobileOpen && (
                    <div className="absolute left-full ml-3 px-2.5 py-1 bg-gw-card/95 backdrop-blur-md border border-[#1e3a5f] rounded-md text-xs font-medium text-gw-text whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl">
                      {item.name}
                    </div>
                  )}
                </NavLink>
              )
            })}
          </nav>
        </div>

        {/* Ops Footer Telemetry */}
        <div className="p-3 border-t border-[#1e3a5f]/60 bg-gw-bg/60 shrink-0">
          <div className={`flex items-center ${isCollapsed && !mobileOpen ? 'justify-center' : 'gap-2.5 px-2'} py-1.5`}>
            <div className="w-2 h-2 rounded-full bg-gw-success animate-pulse shrink-0" />
            {(!isCollapsed || mobileOpen) && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium text-gw-text truncate">Discrete Math Core</span>
                <span className="text-[10px] text-gw-text-secondary font-mono">SQLite • Synchronized</span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
