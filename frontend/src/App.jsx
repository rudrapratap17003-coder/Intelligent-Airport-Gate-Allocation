import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import FlightManagement from './pages/FlightManagement'
import GateManagement from './pages/GateManagement'
import RestrictionMatrix from './pages/RestrictionMatrix'
import CalculationEngine from './pages/CalculationEngine'
import AllocationSimulator from './pages/AllocationSimulator'
import Analytics from './pages/Analytics'
import MathExplorer from './pages/MathExplorer'
import About from './pages/About'
import AllocationWorkspace from './pages/AllocationWorkspace'
import ScenarioManagement from './pages/ScenarioManagement'
import ReportsHub from './pages/ReportsHub'
import SystemSettings from './pages/SystemSettings'
import TerminalManagement from './pages/TerminalManagement'
import DigitalAirportMap from './pages/DigitalAirportMap'
import NotFound from './pages/NotFound'

function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  )
}

export default App
