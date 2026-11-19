/**
 * gateService.test.js
 * Unit test suite verifying Gate Management service layer (Phase 7).
 * Tests CRUD operations, validation, duplicate prevention, and localStorage persistence.
 */

import { gateService, STORAGE_KEY, INITIAL_SAMPLE_GATES } from './gateService.js'

// Simple mock for browser localStorage in Node test runner if needed
if (typeof window === 'undefined' || !global.localStorage) {
  const store = {}
  global.localStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, val) => { store[key] = String(val) },
    removeItem: (key) => { delete store[key] },
    clear: () => { Object.keys(store).forEach(k => delete store[k]) }
  }
}

export const runGateServiceTests = async () => {
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

  console.log('--- Running Gate Service Unit Tests ---')

  // 1. Service Interface & Exports
  await test('Interface: All required methods exist on gateService', () => {
    const required = ['getGates', 'addGate', 'updateGate', 'deleteGate', 'resetDefaults', 'getLegacyBackup']
    for (const m of required) {
      assert(typeof gateService[m] === 'function', `Missing method: ${m}`)
    }
  })

  // 2. Initial Sample Gates
  await test('Initial Load: Returns sample gates and persists to localStorage', async () => {
    localStorage.clear()
    const gates = await gateService.getGates()
    assert(Array.isArray(gates), 'getGates must return an array')
    assert(gates.length === INITIAL_SAMPLE_GATES.length, `Expected ${INITIAL_SAMPLE_GATES.length} gates, got ${gates.length}`)
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    assert(stored && stored.length === INITIAL_SAMPLE_GATES.length, 'Stored gates must match sample count')
  })

  // 3. Add Gate
  await test('Add Gate: Successfully adds a new valid gate with auto-generated ID', async () => {
    const newGateData = {
      gateNumber: 'G99',
      terminal: 'T1',
      gateType: 'Domestic',
      supportedAircraft: 'Narrow-Body Only',
      maxCapacity: 240,
      status: 'Available'
    }
    const created = await gateService.addGate(newGateData)
    assert(created.id && created.id.startsWith('GT-'), 'Gate must have generated GT- ID')
    assert(created.gateNumber === 'G99', 'Gate number must match')
    assert(created.maxCapacity === 240, 'Max capacity must match')

    const all = await gateService.getGates()
    assert(all.some(g => g.id === created.id), 'New gate must exist in retrieved list')
  })

  // 4. Duplicate Prevention (Gate Number)
  await test('Validation: Rejects duplicate gate numbers', async () => {
    let threw = false
    try {
      await gateService.addGate({
        gateNumber: 'G99', // Already exists from test 3
        terminal: 'T2',
        gateType: 'Universal',
        supportedAircraft: 'All Categories (Narrow & Wide)',
        maxCapacity: 300,
        status: 'Available'
      })
    } catch (err) {
      threw = true
      assert(err.message.includes('already exists'), 'Error message must state gate number already exists')
    }
    assert(threw, 'Should throw an error when adding duplicate gate number')
  })

  // 5. Update Gate
  await test('Edit Gate: Updates gate properties while preserving original ID', async () => {
    const all = await gateService.getGates()
    const target = all.find(g => g.gateNumber === 'G99')
    assert(target, 'Target gate G99 must exist')

    const updated = await gateService.updateGate(target.id, {
      gateNumber: 'G99A',
      terminal: 'T3',
      gateType: 'Universal',
      supportedAircraft: 'Wide-Body Only',
      maxCapacity: 480,
      status: 'Maintenance'
    })

    assert(updated.id === target.id, 'Gate ID must be preserved during update')
    assert(updated.gateNumber === 'G99A', 'Gate number must be updated')
    assert(updated.terminal === 'T3', 'Terminal must be updated')
    assert(updated.maxCapacity === 480, 'Capacity must be updated')
    assert(updated.status === 'Maintenance', 'Status must be updated')
  })

  // 6. Delete Gate
  await test('Delete Gate: Removes gate and persists updated list', async () => {
    const allBefore = await gateService.getGates()
    const target = allBefore.find(g => g.gateNumber === 'G99A')
    assert(target, 'Target gate G99A must exist')

    const success = await gateService.deleteGate(target.id)
    assert(success === true, 'deleteGate must return true')

    const allAfter = await gateService.getGates()
    assert(!allAfter.some(g => g.id === target.id), 'Deleted gate must not exist in list')
    assert(allAfter.length === allBefore.length - 1, 'List length must decrease by 1')
  })

  // 7. Reset to Defaults
  await test('Reset: Restores initial sample gates', async () => {
    const restored = await gateService.resetDefaults()
    assert(restored.length === INITIAL_SAMPLE_GATES.length, 'Must restore exact sample gate count')
    assert(restored[0].gateNumber === 'G1', 'First gate must be G1')
  })

  // 8. Structured Array Support for supportedAircraft
  await test('Structured Array: Accepts supportedAircraft as an array and normalizes correctly', async () => {
    const createdWithArray = await gateService.addGate({
      gateNumber: 'G88',
      terminal: 'T2',
      gateType: 'Universal',
      supportedAircraft: ['Narrow-Body', 'Wide-Body'],
      maxCapacity: 450,
      status: 'Available'
    })

    assert(Array.isArray(createdWithArray.supportedAircraftCategories), 'Must have supportedAircraftCategories array')
    assert(createdWithArray.supportedAircraftCategories.includes('Narrow-Body'), 'Must include Narrow-Body')
    assert(createdWithArray.supportedAircraftCategories.includes('Wide-Body'), 'Must include Wide-Body')
    assert(typeof createdWithArray.supportedAircraft === 'string', 'Display supportedAircraft must remain a string for UI')
  })

  // 9. Backward Compatibility & Migration
  await test('Migration: Legacy string records automatically receive structured categories array', async () => {
    // Manually inject legacy string record
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY))
    current.push({
      id: 'GT-LEGACY',
      gateNumber: 'G77',
      terminal: 'T1',
      gateType: 'Domestic',
      supportedAircraft: 'Narrow-Body Only',
      maxCapacity: 200,
      status: 'Available'
    })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))

    const all = await gateService.getGates()
    const legacyGate = all.find(g => g.id === 'GT-LEGACY')
    assert(legacyGate, 'Legacy gate must be found')
    assert(Array.isArray(legacyGate.supportedAircraftCategories), 'Legacy gate must have parsed categories array')
    assert(legacyGate.supportedAircraftCategories[0] === 'Narrow-Body', 'Category must be Narrow-Body')
  })

  console.log(`\nResults: ${results.filter(r => r.passed).length}/${results.length} passed`)
  return results
}

// Execute immediately if run directly in Node
if (typeof process !== 'undefined' && process.argv[1]?.includes('gateService.test.js')) {
  runGateServiceTests()
}
