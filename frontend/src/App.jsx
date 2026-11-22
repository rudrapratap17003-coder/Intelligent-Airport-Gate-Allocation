import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import { PageLoadingFallback } from './components/common/PageLoadingFallback'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { lazyWithRetry } from './lib/lazyWithRetry'

// Route-based code splitting for independent page chunks (Phase 2 Task 1)
const LandingPage = lazyWithRetry(() => import('./pages/LandingPage'))
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'))
const FlightManagement = lazyWithRetry(() => import('./pages/FlightManagement'))
const GateManagement = lazyWithRetry(() => import('./pages/GateManagement'))
const RestrictionMatrix = lazyWithRetry(() => import('./pages/RestrictionMatrix'))
const CalculationEngine = lazyWithRetry(() => import('./pages/CalculationEngine'))
const AllocationSimulator = lazyWithRetry(() => import('./pages/AllocationSimulator'))
const Analytics = lazyWithRetry(() => import('./pages/Analytics'))
const MathExplorer = lazyWithRetry(() => import('./pages/MathExplorer'))
const About = lazyWithRetry(() => import('./pages/About'))
const AllocationWorkspace = lazyWithRetry(() => import('./pages/AllocationWorkspace'))
const ScenarioManagement = lazyWithRetry(() => import('./pages/ScenarioManagement'))
const ReportsHub = lazyWithRetry(() => import('./pages/ReportsHub'))
const SystemSettings = lazyWithRetry(() => import('./pages/SystemSettings'))
const TerminalManagement = lazyWithRetry(() => import('./pages/TerminalManagement'))
const DigitalAirportMap = lazyWithRetry(() => import('./pages/DigitalAirportMap'))
const NotFound = lazyWithRetry(() => import('./pages/NotFound'))

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<PageLoadingFallback fullScreen />}>
          <Routes>
            {/* Public Landing View */}
            <Route path="/" element={<LandingPage />} />

            {/* Protected App Layout */}
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/airport-map" element={<DigitalAirportMap />} />
              <Route path="/terminals" element={<TerminalManagement />} />
              <Route path="/flights" element={<FlightManagement />} />
              <Route path="/gates" element={<GateManagement />} />
              <Route path="/restrictions" element={<RestrictionMatrix />} />
              <Route path="/workspace" element={<AllocationWorkspace />} />
              <Route path="/scenarios" element={<ScenarioManagement />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/reports" element={<ReportsHub />} />
              <Route path="/calculation" element={<CalculationEngine />} />
              <Route path="/simulator" element={<AllocationSimulator />} />
              <Route path="/math-explorer" element={<MathExplorer />} />
              <Route path="/settings" element={<SystemSettings />} />
              <Route path="/about" element={<About />} />
            </Route>

            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
