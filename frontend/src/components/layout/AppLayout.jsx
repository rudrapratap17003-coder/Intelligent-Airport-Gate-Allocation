import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import Sidebar from './Sidebar'
import TopNavbar from './TopNavbar'
import { pageVariants } from '../../lib/animations'
import { AirportProvider } from '../../context/AirportContext'
import { ToastProvider } from '../../context/ToastContext'

export const AppLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  return (
    <AirportProvider>
      <ToastProvider>
        <div className="min-h-screen bg-gw-bg text-gw-text flex">
          {/* Sidebar with responsive mobile drawer */}
          <Sidebar
            isCollapsed={isCollapsed}
            setIsCollapsed={setIsCollapsed}
            mobileOpen={mobileOpen}
            setMobileOpen={setMobileOpen}
          />

          {/* Main Workspace */}
          <div
            className={`flex-1 flex flex-col min-h-screen transition-all duration-300 w-full ${
              isCollapsed ? 'lg:pl-20' : 'lg:pl-64'
            }`}
          >
            <TopNavbar onOpenMobileMenu={() => setMobileOpen(true)} />
            <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
              <motion.div
                key={location.pathname}
                initial="initial"
                animate="animate"
                variants={pageVariants}
                className="w-full"
              >
                <Outlet />
              </motion.div>
            </main>
          </div>
        </div>
      </ToastProvider>
    </AirportProvider>
  )
}

export default AppLayout
