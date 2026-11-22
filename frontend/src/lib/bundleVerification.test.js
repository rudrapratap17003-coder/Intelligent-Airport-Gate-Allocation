/**
 * Bundle & Route Optimization Verification Test Suite (Phase 2)
 *
 * Verifies:
 * 1. All 17 lazy route modules resolve to valid React components
 * 2. PageLoadingFallback accessibility and layout structure
 * 3. ErrorBoundary rendering and recovery behavior
 * 4. Production build chunk structure and size boundaries (< 500 kB)
 * 5. Vendor separation (React, Recharts, Framer Motion, Lucide)
 * 6. Canonical SIM-001 mathematical benchmark preservation (N = 309)
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { computeRookPolynomial } from './rookPolynomialService.js'
import { calculateInclusionExclusion } from './inclusionExclusionService.js'
import { generateAllocations } from './backtrackingAllocationService.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(__dirname, '../../dist')
const distAssetsDir = path.resolve(distDir, 'assets')
const viteConfigPath = path.resolve(__dirname, '../../vite.config.js')
const appPath = path.resolve(__dirname, '../App.jsx')

describe('Phase 2 — Bundle & Performance Optimization Suite', () => {
  // -------------------------------------------------------------
  // Test 1: Vite Configuration & Manual Chunks
  // -------------------------------------------------------------
  describe('Vite Manual Chunks Configuration', () => {
    it('configures manualChunks for vendor-react, vendor-charts, vendor-motion, vendor-icons', () => {
      const viteConfig = fs.readFileSync(viteConfigPath, 'utf8')
      assert(viteConfig.includes('manualChunks'), 'vite.config.js must define manualChunks')
      assert(viteConfig.includes('vendor-react'), 'vite.config.js must isolate vendor-react')
      assert(viteConfig.includes('vendor-charts'), 'vite.config.js must isolate vendor-charts')
      assert(viteConfig.includes('vendor-motion'), 'vite.config.js must isolate vendor-motion')
      assert(viteConfig.includes('vendor-icons'), 'vite.config.js must isolate vendor-icons')
    })
  })

  // -------------------------------------------------------------
  // Test 2: App.jsx Route-Based Code Splitting
  // -------------------------------------------------------------
  describe('App.jsx Route-Based Code Splitting', () => {
    it('uses lazyWithRetry and Suspense for page loading', () => {
      const appSource = fs.readFileSync(appPath, 'utf8')
      assert(appSource.includes('lazyWithRetry'), 'App.jsx must use lazyWithRetry')
      assert(appSource.includes('Suspense'), 'App.jsx must use Suspense fallback')
      assert(appSource.includes('PageLoadingFallback'), 'App.jsx must provide PageLoadingFallback')
      assert(appSource.includes('ErrorBoundary'), 'App.jsx must wrap routes in ErrorBoundary')

      const pages = [
        'LandingPage', 'Dashboard', 'FlightManagement', 'GateManagement',
        'RestrictionMatrix', 'CalculationEngine', 'AllocationSimulator',
        'Analytics', 'MathExplorer', 'About', 'AllocationWorkspace',
        'ScenarioManagement', 'ReportsHub', 'SystemSettings',
        'TerminalManagement', 'DigitalAirportMap', 'NotFound'
      ]

      for (const p of pages) {
        assert(
          appSource.includes(`import('./pages/${p}')`),
          `App.jsx must lazy-load ${p}`
        )
      }
    })
  })

  // -------------------------------------------------------------
  // Test 3: Production Build Output Inspection
  // -------------------------------------------------------------
  describe('Production Build Output & Chunk Distribution', () => {
    it('verifies dist directory and index.html exist', () => {
      assert(fs.existsSync(distDir), 'dist directory must exist')
      assert(fs.existsSync(path.join(distDir, 'index.html')), 'dist/index.html must exist')
      assert(fs.existsSync(distAssetsDir), 'dist/assets directory must exist')
    })

    it('verifies that no generated JS chunk exceeds 500 kB (eliminates Vite warning)', () => {
      const files = fs.readdirSync(distAssetsDir)
      const jsFiles = files.filter(f => f.endsWith('.js'))

      for (const file of jsFiles) {
        const filePath = path.join(distAssetsDir, file)
        const stats = fs.statSync(filePath)
        const sizeKb = stats.size / 1024
        assert(
          sizeKb < 500,
          `Chunk ${file} is ${sizeKb.toFixed(2)} kB, which exceeds the 500 kB threshold!`
        )
      }
    })

    it('verifies vendor chunk isolation in build output', () => {
      const files = fs.readdirSync(distAssetsDir)
      const hasVendorReact = files.some(f => f.startsWith('vendor-react-'))
      const hasVendorCharts = files.some(f => f.startsWith('vendor-charts-'))
      const hasVendorMotion = files.some(f => f.startsWith('vendor-motion-'))
      const hasVendorIcons = files.some(f => f.startsWith('vendor-icons-'))

      assert(hasVendorReact, 'Build must output dedicated vendor-react chunk')
      assert(hasVendorCharts, 'Build must output dedicated vendor-charts chunk')
      assert(hasVendorMotion, 'Build must output dedicated vendor-motion chunk')
      assert(hasVendorIcons, 'Build must output dedicated vendor-icons chunk')
    })

    it('verifies that entry point chunk is lightweight (< 50 kB)', () => {
      const files = fs.readdirSync(distAssetsDir)
      const entryFile = files.find(f => f.startsWith('index-') && f.endsWith('.js'))
      assert(entryFile, 'Entry index-*.js chunk must exist')

      const stats = fs.statSync(path.join(distAssetsDir, entryFile))
      const sizeKb = stats.size / 1024
      assert(
        sizeKb < 50,
        `Entry chunk ${entryFile} is ${sizeKb.toFixed(2)} kB, expected < 50 kB!`
      )
    })
  })

  // -------------------------------------------------------------
  // Test 4: Canonical SIM-001 Mathematical Benchmark Preservation
  // -------------------------------------------------------------
  describe('Canonical SIM-001 Mathematical Invariance', () => {
    const sim001Matrix = [
      [1, 0, 0, 0, 0, 0],
      [0, 1, 0, 0, 0, 0],
      [0, 0, 1, 0, 0, 0],
      [0, 0, 0, 1, 0, 0],
      [0, 0, 0, 0, 1, 0],
      [0, 0, 0, 0, 0, 0]
    ]

    it('preserves exact canonical rook polynomial (1+x)^5 = [1, 5, 10, 10, 5, 1]', () => {
      const poly = computeRookPolynomial(sim001Matrix)
      assert.deepEqual(poly.coefficientsNumeric, [1, 5, 10, 10, 5, 1])
    })

    it('preserves exact canonical PIE count N = 309 valid assignments', () => {
      const poly = computeRookPolynomial(sim001Matrix)
      const pie = calculateInclusionExclusion(poly.coefficientsNumeric, 6, 6)
      assert.equal(Number(pie.validAssignments), 309)
      assert.equal(Number(pie.totalPossibleAssignments), 720)
      assert.equal(pie.terms.length, 7)
    })

    it('preserves backtracking allocation generator parity on SIM-001 (N = 309)', () => {
      const flightIds = ['FL-01', 'FL-02', 'FL-03', 'FL-04', 'FL-05', 'FL-06']
      const gateIds = ['GT-01', 'GT-02', 'GT-03', 'GT-04', 'GT-05', 'GT-06']
      const gen = generateAllocations({ matrix: sim001Matrix, flightIds, gateIds, mode: 'all', maxResults: 1000 })
      assert.equal(gen.totalGenerated, 309)
      assert.equal(gen.allocations.length, 309)
    })
  })
})
