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

export const operationsNavItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Flight Management', path: '/flights', icon: Plane },
  { name: 'Gate Management', path: '/gates', icon: DoorClosed },
  { name: 'Airport Layout', path: '/airport-map', icon: Compass },
  { name: 'Gate Restrictions', path: '/restrictions', icon: Grid3X3 },
]

export const allocationNavItems = [
  { name: 'Allocation Workspace', path: '/workspace', icon: Sparkles },
  { name: 'Simulation Scenarios', path: '/scenarios', icon: Layers },
  { name: 'Analytics & Reports', path: '/analytics', icon: BarChart3 },
]

export const systemNavItems = [
  { name: 'Mathematical Engine', path: '/calculation', icon: Calculator },
  { name: 'Documentation', path: '/about', icon: Info },
  { name: 'Settings', path: '/settings', icon: Settings },
]

export const navGroups = [
  { title: 'AIRPORT OPERATIONS', items: operationsNavItems },
  { title: 'ALLOCATION & ANALYSIS', items: allocationNavItems },
  { title: 'SYSTEM', items: systemNavItems },
]

// Compatibility exports
export const primaryNavItems = operationsNavItems
export const secondaryNavItems = [...allocationNavItems, ...systemNavItems]
export const legacyNavItems = [
  { name: 'Terminals', path: '/terminals', icon: Building2 },
  { name: 'Reports', path: '/reports', icon: FileText },
  { name: 'Mathematics Explorer', path: '/math-explorer', icon: BookOpen },
  { name: 'Allocation Simulator', path: '/simulator', icon: Sparkles },
]
export const allNavItems = [
  ...operationsNavItems,
  ...allocationNavItems,
  ...systemNavItems,
  ...legacyNavItems
]
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
            className="fixed inset-0 bg-black/80 z-40 lg:hidden"
            onClick={() => setMobileOpen?.(false)}
          />
        )}
      </AnimatePresence>

      {/* Main Sidebar Element */}
      <aside
        className={`
          fixed top-0 bottom-0 left-0 z-50 h-screen bg-[#111111] border-r border-[#333333]
          transition-all duration-300 ease-in-out flex flex-col justify-between
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
          ${mobileOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand Header */}
        <div className="flex-1 overflow-y-auto">
          <div className="h-16 flex items-center px-4 border-b border-[#333333] justify-between sticky top-0 bg-[#111111] z-10">
            <NavLink
              to="/"
              onClick={() => setMobileOpen?.(false)}
              className="flex items-center gap-3 overflow-hidden group"
            >
              <div className="w-8 h-8 rounded-lg bg-[#222222] border border-[#333333] flex items-center justify-center shrink-0">
                <Plane className="w-4 h-4 text-[#FFFFFF] rotate-[-45deg]" />
              </div>
              {(!isCollapsed || mobileOpen) && (
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-sm text-[#FFFFFF] tracking-tight font-sans truncate">
                    GATEWISE BLR
                  </span>
                  <span className="text-[10px] text-[#A3A3A3] truncate">
                    Airport Decision Support System
                  </span>
                </div>
              )}
            </NavLink>

            {/* Desktop collapse toggle */}
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex p-1.5 rounded-lg text-[#A3A3A3] hover:text-[#FFFFFF] hover:bg-[#222222] border border-transparent hover:border-[#333333] transition-all cursor-pointer"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={() => setMobileOpen?.(false)}
              className="lg:hidden p-1.5 rounded-lg text-[#A3A3A3] hover:text-[#FFFFFF] hover:bg-[#222222] transition-colors cursor-pointer"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Grouped Navigation */}
          <nav className="p-3 space-y-4" aria-label="Main Navigation">
            {navGroups.map((group, groupIndex) => (
              <div key={group.title} className={groupIndex > 0 ? 'pt-2 border-t border-[#333333]/50' : ''}>
                {(!isCollapsed || mobileOpen) && (
                  <div className="px-3 pb-1.5 text-[10px] uppercase font-mono tracking-wider text-[#737373]">
                    {group.title}
                  </div>
                )}
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.path
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileOpen?.(false)}
                        className={`
                          flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-150 group relative
                          ${isActive
                            ? 'text-[#FFFFFF] font-semibold bg-[#383838] border border-[#555555]'
                            : 'text-[#A3A3A3] hover:text-[#FFFFFF] hover:bg-[#2A2A2A]'
                          }
                          ${isCollapsed && !mobileOpen ? 'justify-center' : ''}
                        `}
                        title={isCollapsed && !mobileOpen ? item.name : undefined}
                      >
                        <Icon className="w-4 h-4 shrink-0 z-10 relative" />
                        {(!isCollapsed || mobileOpen) && (
                          <div className="flex items-center justify-between flex-1 min-w-0 z-10 relative">
                            <span className="truncate">{item.name}</span>
                          </div>
                        )}

                        {/* Desktop Hover Tooltip (when collapsed) */}
                        {isCollapsed && !mobileOpen && (
                          <div className="absolute left-full ml-3 px-2.5 py-1 bg-[#181818] border border-[#333333] rounded-md text-xs font-medium text-[#FFFFFF] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl">
                            {item.name}
                          </div>
                        )}
                      </NavLink>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Institutional Footer Status */}
        <div className="p-3 border-t border-[#333333] bg-[#0c0c0c] shrink-0">
          <div className={`flex items-center ${isCollapsed && !mobileOpen ? 'justify-center' : 'gap-2.5 px-2'} py-1.5`}>
            <div className="w-2 h-2 rounded-full bg-[#FFFFFF] shrink-0" />
            {(!isCollapsed || mobileOpen) && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium text-[#FFFFFF] truncate">Discrete Math Core</span>
                <span className="text-[10px] text-[#A3A3A3] font-mono">Decision Engine Active</span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}

export const MemoizedSidebar = React.memo(Sidebar)
export default MemoizedSidebar
