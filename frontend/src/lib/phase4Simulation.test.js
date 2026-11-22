/**
 * phase4Simulation.test.js
 * Comprehensive unit test suite for Phase 4:
 * Advanced Simulation Intelligence, Scenario Management & Operational Decision Support.
 *
 * Verifies:
 * 1. Category taxonomy and filtering support (9 categories)
 * 2. Traffic Generator profiles (low, normal, peak, maintenance, terminal_restricted, emergency)
 * 3. What-If Analysis Engine (non-destructive isolated simulation, delta calculation, impact classification)
 * 4. Bottleneck Analysis Engine (critical flights, gate contention, Hall's condition deadlock detection)
 * 5. Simulation Pipeline Execution & Run Snapshots
 * 6. Mathematical Invariance on Canonical SIM-001 Benchmark (N = 309)
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  simulationService,
  SCENARIO_CATEGORIES
} from './simulationService.js'
import { computeRookPolynomial } from './rookPolynomialService.js'
import { calculateInclusionExclusion } from './inclusionExclusionService.js'

describe('Phase 4 — Advanced Simulation Intelligence & Decision Support Suite', () => {
  // -------------------------------------------------------------
  // Test 1: Category Taxonomy
  // -------------------------------------------------------------
  describe('Module 1: Scenario Categories & Taxonomy', () => {
    it('defines all 9 standard scenario categories including All filter', () => {
      assert(Array.isArray(SCENARIO_CATEGORIES), 'SCENARIO_CATEGORIES must be an array')
      assert.equal(SCENARIO_CATEGORIES.length, 9, 'Must have exactly 9 categories')
      assert.equal(SCENARIO_CATEGORIES[0], 'All', 'First category must be All for filtering')

      const expectedCategories = [
        'All',
        'Normal Operations',
        'Peak-Hour Traffic',
        'Low-Traffic',
        'Gate Maintenance',
        'Restricted Gate',
        'Terminal Overload',
        'Emergency Restriction',
        'Custom'
      ]

      for (const expected of expectedCategories) {
        assert(SCENARIO_CATEGORIES.includes(expected), `Missing category: ${expected}`)
      }
    })
  })

  // -------------------------------------------------------------
  // Test 2: Traffic Scenario Generator
  // -------------------------------------------------------------
  describe('Module 3: Traffic Scenario Generator Service', () => {
    it('generates low-traffic scenario (4 flights x 6 gates)', async () => {
      const generated = await simulationService.generateTrafficScenario({
        profile: 'low',
        name: 'Test Low Traffic Profile',
        target_terminal: 'T1'
      })

      assert(generated, 'Must return generated scenario object')
      assert.equal(generated.category, 'Low-Traffic')
      assert.equal(generated.selectedFlightIds.length, 4, 'Low traffic should have 4 flights')
      assert.equal(generated.selectedGateIds.length, 6, 'Low traffic should have 6 gates')
      assert.equal(generated.matrix.length, 4, 'Matrix rows should match flights count')
      assert.equal(generated.matrix[0].length, 6, 'Matrix columns should match gates count')

      // Verify binary values
      for (const row of generated.matrix) {
        for (const cell of row) {
          assert(cell === 0 || cell === 1, 'Matrix cells must be binary 0 or 1')
        }
      }
    })

    it('generates normal-traffic scenario (6 flights x 6 gates)', async () => {
      const generated = await simulationService.generateTrafficScenario({
        profile: 'normal',
        name: 'Test Normal Profile'
      })

      assert.equal(generated.category, 'Normal Operations')
      assert.equal(generated.selectedFlightIds.length, 6)
      assert.equal(generated.selectedGateIds.length, 6)
      assert.equal(generated.matrix.length, 6)
      assert.equal(generated.matrix[0].length, 6)
    })

    it('generates peak-traffic scenario (8 flights x 8 gates)', async () => {
      const generated = await simulationService.generateTrafficScenario({
        profile: 'peak',
        name: 'Test Peak Profile'
      })

      assert.equal(generated.category, 'Peak-Hour Traffic')
      assert.equal(generated.selectedFlightIds.length, 8)
      assert.equal(generated.selectedGateIds.length, 8)
    })

    it('generates gate-maintenance scenario with high gate restrictions', async () => {
      const generated = await simulationService.generateTrafficScenario({
        profile: 'maintenance',
        name: 'Test Maintenance Profile'
      })

      assert.equal(generated.category, 'Gate Maintenance')
      // Column 0 should have high restrictions (e.g. at least 3 forbidden)
      const col0Restricted = generated.matrix.reduce((acc, row) => acc + row[0], 0)
      assert(col0Restricted >= 3, 'Maintenance gate should have heavy restrictions')
    })

    it('generates emergency restriction scenario', async () => {
      const generated = await simulationService.generateTrafficScenario({
        profile: 'emergency',
        name: 'Test Emergency Profile'
      })

      assert.equal(generated.category, 'Emergency Restriction')
      assert.equal(generated.selectedFlightIds.length, 5)
      assert.equal(generated.selectedGateIds.length, 5)
    })
  })

  // -------------------------------------------------------------
  // Test 3: What-If Analysis Engine
  // -------------------------------------------------------------
  describe('Module 5: What-If Analysis Engine', () => {
    it('evaluates hypothetical gate closure non-destructively', async () => {
      const sim = {
        id: 'SIM-WHATIF-TEST',
        name: 'What-If Test Scenario',
        selectedFlightIds: ['FL-01', 'FL-02', 'FL-03'],
        selectedGateIds: ['GATE-01', 'GATE-02', 'GATE-03'],
        matrix: [
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0]
        ]
      }

      // Baseline: 3x3 zero matrix -> 3! = 6 allocations
      const result = await simulationService.evaluateWhatIf('SIM-WHATIF-TEST', {
        closed_gate_ids: ['GATE-03'],
        simulation_override: sim
      })

      assert(result, 'Must return what-if result')
      assert.equal(result.baseline_allocations, 6, 'Baseline allocations must be 6 (3!)')
      // With GATE-03 closed: 3 flights, 2 gates -> Pigeonhole principle -> 0 valid allocations!
      assert.equal(result.hypothetical_allocations, 0, 'Hypothetical with 3 flights and 2 gates must be 0')
      assert.equal(result.delta_allocations, -6, 'Delta allocations must be -6')
      assert.equal(result.impact_level, 'CRITICAL', 'Dropping to 0 must be flagged as CRITICAL')
      assert.equal(result.is_feasible_hypothetically, false, 'Hypothetical must be marked infeasible')
    })

    it('evaluates non-critical constraint addition correctly', async () => {
      const sim = {
        id: 'SIM-WHATIF-TEST-2',
        name: 'What-If Moderate Test',
        selectedFlightIds: ['FL-01', 'FL-02', 'FL-03'],
        selectedGateIds: ['GATE-01', 'GATE-02', 'GATE-03', 'GATE-04'],
        matrix: [
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ]
      }

      // Baseline: 3 flights, 4 gates -> 4*3*2 = 24 allocations
      const result = await simulationService.evaluateWhatIf('SIM-WHATIF-TEST-2', {
        closed_gate_ids: ['GATE-04'],
        simulation_override: sim
      })

      assert.equal(result.baseline_allocations, 24)
      // Closing 1 gate leaves 3 gates: 3 flights, 3 gates -> 3! = 6 allocations
      assert.equal(result.hypothetical_allocations, 6)
      assert.equal(result.delta_allocations, -18)
      assert.equal(result.is_feasible_hypothetically, true, 'Feasible since 6 > 0')
    })
  })

  // -------------------------------------------------------------
  // Test 4: Bottleneck Analysis Engine
  // -------------------------------------------------------------
  describe('Module 7: Allocation Bottleneck Analysis Service', () => {
    it('detects critical flights and gate contention correctly', async () => {
      const sim = {
        id: 'SIM-BOTTLENECK-TEST',
        name: 'Bottleneck Test Scenario',
        selectedFlightIds: ['FL-CRIT', 'FL-FLEX1', 'FL-FLEX2'],
        selectedGateIds: ['GATE-01', 'GATE-02', 'GATE-03'],
        matrix: [
          [0, 1, 1], // FL-CRIT can only use GATE-01 (1 available gate -> CRITICAL)
          [0, 0, 0], // FL-FLEX1 can use 3 gates
          [0, 0, 0]  // FL-FLEX2 can use 3 gates
        ]
      }

      const result = await simulationService.getBottlenecks('SIM-BOTTLENECK-TEST', sim)

      assert(result, 'Must return bottleneck analysis')
      assert.equal(result.is_feasible, true)
      assert(Array.isArray(result.critical_flights), 'critical_flights must be an array')
      assert.equal(result.critical_flights.length, 1, 'Must detect exactly 1 critical flight')
      assert.equal(result.critical_flights[0].flight_id, 'FL-CRIT')
      assert.equal(result.critical_flights[0].available_gates, 1)

      // GATE-01 contention check
      const gate1Stat = result.gate_stats.find((g) => g.gate_id === 'GATE-01')
      assert(gate1Stat, 'GATE-01 stat must exist')
      assert.equal(gate1Stat.compatible_flights, 3, 'All 3 flights can use GATE-01')
    })

    it('identifies Hall Marriage condition deadlock cause when infeasible', async () => {
      const sim = {
        id: 'SIM-DEADLOCK-TEST',
        name: 'Deadlock Test Scenario',
        selectedFlightIds: ['FL-01', 'FL-02', 'FL-03'],
        selectedGateIds: ['GATE-01', 'GATE-02', 'GATE-03'],
        matrix: [
          [0, 1, 1], // FL-01 can only use GATE-01
          [0, 1, 1], // FL-02 can only use GATE-01 -> Hall's violation: 2 flights share 1 gate!
          [0, 0, 0]
        ]
      }

      const result = await simulationService.getBottlenecks('SIM-DEADLOCK-TEST', sim)

      assert.equal(result.is_feasible, false, 'Must detect infeasibility')
      assert(result.deadlock_cause !== null, 'Must provide deadlock cause')
      assert(
        result.deadlock_cause.includes('Hall') || result.deadlock_cause.includes('exceeds available gates'),
        'Deadlock explanation must reference Hall condition or gate contention'
      )
    })
  })

  // -------------------------------------------------------------
  // Test 5: Simulation Pipeline Execution & Persistence
  // -------------------------------------------------------------
  describe('Module 4 & 8: Simulation Pipeline & History', () => {
    it('executes simulation pipeline and returns verified allocation', async () => {
      const sim = {
        id: 'SIM-RUN-TEST',
        name: 'Pipeline Run Test',
        selectedFlightIds: ['FL-A', 'FL-B'],
        selectedGateIds: ['GATE-1', 'GATE-2'],
        matrix: [
          [0, 1],
          [0, 0]
        ]
      }

      const runResult = await simulationService.runSimulation('SIM-RUN-TEST', sim)

      assert(runResult, 'Must return run result')
      assert(runResult.run_id, 'Must return run_id')
      assert.equal(runResult.status, 'Completed')
      assert.equal(runResult.verification_status, 'VERIFIED')
      assert.equal(runResult.conflicts_count, 0)
      assert.equal(runResult.generated_assignments.length, 1, 'Only 1 valid permutation for [[0,1],[0,0]]')
      assert.equal(runResult.generated_assignments[0].assignments.length, 2, 'Must assign both flights')
    })
  })

  // -------------------------------------------------------------
  // Test 6: Mathematical Invariance on Canonical SIM-001 Benchmark
  // -------------------------------------------------------------
  describe('Mathematical Invariance: Canonical SIM-001 Benchmark', () => {
    it('preserves exact canonical rook polynomial (1+x)^5 = [1, 5, 10, 10, 5, 1]', () => {
      const canonicalMatrix = [
        [1, 0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0, 0],
        [0, 0, 1, 0, 0, 0],
        [0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 1, 0],
        [0, 0, 0, 0, 0, 0]
      ]

      const poly = computeRookPolynomial(canonicalMatrix)
      assert.deepEqual(poly.coefficientsNumeric, [1, 5, 10, 10, 5, 1])
    })

    it('preserves exact canonical PIE count N = 309 valid assignments', () => {
      const canonicalMatrix = [
        [1, 0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0, 0],
        [0, 0, 1, 0, 0, 0],
        [0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 1, 0],
        [0, 0, 0, 0, 0, 0]
      ]

      const poly = computeRookPolynomial(canonicalMatrix)
      const pie = calculateInclusionExclusion(poly.coefficientsNumeric, 6, 6)
      assert.equal(Number(pie.validAssignments), 309)
      assert.equal(Number(pie.totalPossibleAssignments), 720)
      assert.equal(Number(pie.feasibilityPercentage).toFixed(2) + '%', '42.92%')
    })
  })
})
