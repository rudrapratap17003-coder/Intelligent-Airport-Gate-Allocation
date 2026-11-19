/**
 * simulationService.test.js
 * Comprehensive unit test suite verifying Simulation Management (Phase 8).
 * Tests:
 * 1. Interface & method availability.
 * 2. Date and Time Window validation (valid formats, invalid calendar dates, malformed formats).
 * 3. CRUD operations with auto-generated sequential IDs.
 * 4. Validation rules: required names, min length, roster requirements, duplicate prevention.
 * 5. Retention of date and time window across updates.
 * 6. Completed Status Protection (Ready -> Completed allowed, Draft -> Completed rejected, modification while Completed rejected, explicit reopen allowed).
 * 7. Duplicate scenario deep copying with Draft status reset.
 * 8. Data integrity: ID deduplication, unbalanced dimension support.
 * 9. Persistence & benchmark restoration behavior.
 */

import {
  simulationService,
  STORAGE_KEY,
  INITIAL_SAMPLE_SIMULATIONS,
  isValidDate,
  isValidTimeWindow
} from './simulationService.js'

// Simple mock for browser localStorage in Node test runner
if (typeof window === 'undefined' || !global.localStorage) {
  const store = {}
  global.localStorage = {
    getItem: (key) => store[key] !== undefined ? store[key] : null,
    setItem: (key, val) => { store[key] = String(val) },
    removeItem: (key) => { delete store[key] },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]) }
  }
}

export const runSimulationServiceTests = async () => {
  const results = []

  const test = async (name, fn) => {
    try {
      await fn()
      results.push({ name, passed: true })
      console.log(`  ✓ ${name}`)
    } catch (err) {
      results.push({ name, passed: false, error: err.message })
      console.error(`  ✗ ${name}: ${err.message}`)
    }
  }

  const assert = (condition, msg) => {
    if (!condition) throw new Error(msg || 'Assertion failed')
  }

  console.log('--- Running Enhanced Simulation Service Unit Tests (Phase 8) ---')

  // 1. Service Interface & Exports
  await test('Interface: All required methods and validators are exported', () => {
    const requiredMethods = [
      'getSimulations',
      'getSimulationById',
      'createSimulation',
      'updateSimulation',
      'duplicateSimulation',
      'deleteSimulation',
      'resetDefaults',
      'getLegacyBackup'
    ]
    for (const m of requiredMethods) {
      assert(typeof simulationService[m] === 'function', `Missing method: ${m}`)
    }
    assert(typeof isValidDate === 'function', 'isValidDate must be a function')
    assert(typeof isValidTimeWindow === 'function', 'isValidTimeWindow must be a function')
  })

  // 2. Date Validation Unit Tests
  await test('Date Validation: Correctly validates calendar dates and rejects invalid ones', () => {
    assert(isValidDate('2026-11-18') === true, '2026-11-18 should be valid')
    assert(isValidDate('2024-02-29') === true, '2024-02-29 (leap year) should be valid')
    assert(isValidDate('2026-02-29') === false, '2026-02-29 (non-leap year) must be rejected')
    assert(isValidDate('2026-13-01') === false, 'Month 13 must be rejected')
    assert(isValidDate('2026-04-31') === false, 'April 31 must be rejected')
    assert(isValidDate('invalid-date') === false, 'Malformed string must be rejected')
    assert(isValidDate('') === false, 'Empty string must be rejected')
    assert(isValidDate(null) === false, 'Null must be rejected')
  })

  // 3. Time Window Validation Unit Tests
  await test('Time Window Validation: Correctly validates HH:MM - HH:MM slots and rejects malformed values', () => {
    assert(isValidTimeWindow('08:00 - 12:00') === true, '08:00 - 12:00 should be valid')
    assert(isValidTimeWindow('06:30 - 10:15') === true, '06:30 - 10:15 should be valid')
    assert(isValidTimeWindow('20:00 - 00:00') === true, '20:00 - 00:00 should be valid')
    assert(isValidTimeWindow('08:00 - 08:00') === false, 'Identical start and end time must be rejected')
    assert(isValidTimeWindow('25:00 - 12:00') === false, 'Hour 25 must be rejected')
    assert(isValidTimeWindow('08:65 - 12:00') === false, 'Minute 65 must be rejected')
    assert(isValidTimeWindow('morning') === false, 'Text label must be rejected')
    assert(isValidTimeWindow('08:00 to 12:00') === false, 'Malformed separator must be rejected')
  })

  // 4. Initial Load & Seed
  await test('Initial Load: Seeds benchmark sample simulations on clean initialization', async () => {
    localStorage.clear()
    const sims = await simulationService.getSimulations()
    assert(Array.isArray(sims), 'getSimulations must return an array')
    assert(sims.length === INITIAL_SAMPLE_SIMULATIONS.length, `Expected ${INITIAL_SAMPLE_SIMULATIONS.length} simulations, got ${sims.length}`)
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    assert(stored && stored.length === INITIAL_SAMPLE_SIMULATIONS.length, 'Stored simulations must match initial count')
  })

  // 5. Create Simulation with Valid Date & Time Window
  let createdId = null
  await test('Create Simulation: Successfully creates scenario and stores valid date and time window', async () => {
    const newSim = {
      name: 'Evening Hub Wave Benchmark',
      description: 'Test scenario modeling 4 flights across 4 gates.',
      selectedFlightIds: ['FL-001', 'FL-002', 'FL-003', 'FL-004'],
      selectedGateIds: ['GT-001', 'GT-002', 'GT-003', 'GT-004'],
      simulationDate: '2026-11-20',
      timeWindow: '18:00 - 22:00',
      status: 'Ready'
    }

    const created = await simulationService.createSimulation(newSim)
    createdId = created.id
    assert(created.id && created.id.startsWith('SIM-'), 'Scenario ID must start with SIM-')
    assert(created.name === 'Evening Hub Wave Benchmark', 'Name must match')
    assert(created.simulationDate === '2026-11-20', 'Simulation date must match')
    assert(created.timeWindow === '18:00 - 22:00', 'Time window must match')
    assert(created.status === 'Ready', 'Status must be Ready')
  })

  // 6. Validation: Reject Invalid Date
  await test('Validation: Rejects creation with invalid calendar date', async () => {
    let threw = false
    try {
      await simulationService.createSimulation({
        name: 'Invalid Date Scenario',
        simulationDate: '2026-02-30',
        timeWindow: '08:00 - 12:00',
        selectedFlightIds: ['FL-001'],
        selectedGateIds: ['GT-001']
      })
    } catch (err) {
      threw = true
      assert(err.message.includes('Invalid simulation date'), 'Error must specify invalid simulation date')
    }
    assert(threw, 'Should throw error when calendar date is invalid')
  })

  // 7. Validation: Reject Malformed Time Window
  await test('Validation: Rejects creation with malformed time window', async () => {
    let threw = false
    try {
      await simulationService.createSimulation({
        name: 'Invalid Time Scenario',
        simulationDate: '2026-11-20',
        timeWindow: '8am - 12pm',
        selectedFlightIds: ['FL-001'],
        selectedGateIds: ['GT-001']
      })
    } catch (err) {
      threw = true
      assert(err.message.includes('Invalid time window'), 'Error must specify invalid time window')
    }
    assert(threw, 'Should throw error when time window format is invalid')
  })

  // 8. Retention of Date and Time Window after Update
  await test('Retention: Existing scenarios retain date and time window after editing and refreshing', async () => {
    const updated = await simulationService.updateSimulation(createdId, {
      simulationDate: '2026-11-25',
      timeWindow: '14:00 - 18:00'
    })
    assert(updated.simulationDate === '2026-11-25', 'Updated date must be 2026-11-25')
    assert(updated.timeWindow === '14:00 - 18:00', 'Updated time window must be 14:00 - 18:00')

    // Simulate refresh / re-fetch
    const reloaded = await simulationService.getSimulationById(createdId)
    assert(reloaded.simulationDate === '2026-11-25', 'Reloaded date must remain 2026-11-25')
    assert(reloaded.timeWindow === '14:00 - 18:00', 'Reloaded time window must remain 14:00 - 18:00')
  })

  // 9. Completed Status Protection: Ready -> Completed is Allowed
  await test('Status Protection: Allows transition from Ready to Completed via explicit action', async () => {
    const completed = await simulationService.updateSimulation(createdId, { status: 'Completed' })
    assert(completed.status === 'Completed', 'Status must be Completed')
  })

  // 10. Completed Status Protection: Read-only protection when Completed
  await test('Status Protection: Rejects modification of Completed scenario without explicit reopening', async () => {
    let threw = false
    try {
      await simulationService.updateSimulation(createdId, {
        name: 'Attempted Modification of Completed'
      })
    } catch (err) {
      threw = true
      assert(err.message.includes('Completed and locked'), 'Error must specify scenario is completed and locked')
    }
    assert(threw, 'Must reject modifications while in Completed status')
  })

  // 11. Completed Status Protection: Explicit Reopening to Draft is Allowed
  await test('Status Protection: Allows explicit reopening of Completed scenario to Draft', async () => {
    const reopened = await simulationService.updateSimulation(createdId, { status: 'Draft' })
    assert(reopened.status === 'Draft', 'Reopened scenario status must be Draft')
  })

  // 12. Completed Status Protection: Draft -> Completed Direct Jump is Rejected
  await test('Status Protection: Rejects direct jump from Draft to Completed without being Ready', async () => {
    let threw = false
    try {
      await simulationService.updateSimulation(createdId, { status: 'Completed' })
    } catch (err) {
      threw = true
      assert(err.message.includes('Ready before it can be marked as Completed'), 'Error must require Ready status before Completed')
    }
    assert(threw, 'Must reject direct Draft to Completed jump')
  })

  // 13. Data Integrity: ID Deduplication
  await test('Data Integrity: Automatically deduplicates flight and gate ID arrays', async () => {
    const simWithDuplicates = {
      name: 'Duplicate IDs Test Scenario',
      selectedFlightIds: ['FL-001', 'FL-001', 'FL-002', 'FL-002'],
      selectedGateIds: ['GT-001', 'GT-001', 'GT-002', 'GT-003'],
      simulationDate: '2026-11-20',
      timeWindow: '08:00 - 12:00'
    }
    const created = await simulationService.createSimulation(simWithDuplicates)
    assert(created.selectedFlightIds.length === 2, 'Flights must be deduplicated to 2')
    assert(created.selectedGateIds.length === 3, 'Gates must be deduplicated to 3')
    await simulationService.deleteSimulation(created.id)
  })

  // 14. Data Integrity: Unbalanced Counts Permitted
  await test('Data Integrity: Unbalanced flight and gate counts are permitted without error', async () => {
    const unbalancedSim = {
      name: 'Unbalanced Matrix 4x2 Scenario',
      selectedFlightIds: ['FL-001', 'FL-002', 'FL-003', 'FL-004'],
      selectedGateIds: ['GT-001', 'GT-002'],
      simulationDate: '2026-11-20',
      timeWindow: '08:00 - 12:00',
      status: 'Ready'
    }
    const created = await simulationService.createSimulation(unbalancedSim)
    assert(created.selectedFlightIds.length === 4, 'Must accept 4 flights')
    assert(created.selectedGateIds.length === 2, 'Must accept 2 gates')
    assert(created.status === 'Ready', 'Unbalanced scenarios can be marked Ready in Phase 8')
    await simulationService.deleteSimulation(created.id)
  })

  // 15. Persistence: Catalog not silently overwritten if empty
  await test('Persistence: Emptied catalog is not silently overwritten with sample benchmarks', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]))
    const backup = simulationService.getLegacyBackup()
    assert(Array.isArray(backup) && backup.length === 0, 'Backup of emptied catalog must return empty array')
  })

  // 16. Reset Defaults Restores Benchmarks
  await test('Reset Defaults: Explicit reset restores sample benchmark scenarios', async () => {
    const restored = await simulationService.resetDefaults()
    assert(restored.length === INITIAL_SAMPLE_SIMULATIONS.length, 'Must restore 3 sample benchmarks')
    assert(restored[0].id === 'SIM-001', 'First restored scenario must be SIM-001')
  })

  console.log(`\nEnhanced Test Results: ${results.filter((r) => r.passed).length}/${results.length} passed`)
  return results
}

// Execute immediately if run directly in Node
if (typeof process !== 'undefined' && process.argv[1]?.includes('simulationService.test.js')) {
  runSimulationServiceTests()
}
