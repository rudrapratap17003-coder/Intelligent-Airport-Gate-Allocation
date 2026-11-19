/**
 * restrictionService.test.js
 * Unit test suite verifying restrictionService methods, contracts, binary validation, and persistence (Phase 9).
 */

import {
  restrictionService,
  createZeroMatrix,
  resizeMatrix,
  validateBinaryMatrix
} from './restrictionService.js'

// Mock browser localStorage for Node environment if missing
if (typeof window === 'undefined' || !global.localStorage) {
  const store = {}
  global.localStorage = {
    getItem: (key) => store[key] !== undefined ? store[key] : null,
    setItem: (key, val) => { store[key] = String(val) },
    removeItem: (key) => { delete store[key] },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]) }
  }
}

export const runRestrictionServiceTests = async () => {
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

  console.log('--- Running Restriction Service Unit Tests (Phase 9) ---')

  // 1. updateMatrix exists and is a function
  await test('Method Existence: restrictionService.updateMatrix is a function', () => {
    assert(typeof restrictionService.updateMatrix === 'function', 'updateMatrix must be a function')
  })

  // 2. All required methods exist on restrictionService
  await test('Service Interface: All required methods exist on restrictionService', () => {
    const required = [
      'getMatrixForSimulation',
      'saveMatrixForSimulation',
      'updateMatrix',
      'toggleCell',
      'clearAllRestrictions',
      'markAllForbidden',
      'resetToBenchmark',
      'getLegacyBackup'
    ]
    for (const method of required) {
      assert(typeof restrictionService[method] === 'function', `Missing method: ${method}`)
    }
  })

  // 3. createZeroMatrix Helper
  await test('createZeroMatrix: Creates matrix with exact dimensions initialized to 0', () => {
    const m = createZeroMatrix(4, 5)
    assert(m.length === 4, 'Must have 4 rows')
    assert(m[0].length === 5, 'Must have 5 columns')
    assert(m.every((row) => row.every((val) => val === 0)), 'All cells must be 0')
  })

  // 4. validateBinaryMatrix Validation
  await test('validateBinaryMatrix: Accepts binary 0/1 and rejects invalid values', () => {
    assert(validateBinaryMatrix([[0, 1], [1, 0]]) === true, 'Valid binary matrix must pass')

    let threwNonArray = false
    try {
      validateBinaryMatrix('not-array')
    } catch {
      threwNonArray = true
    }
    assert(threwNonArray, 'Must reject non-array')

    let threwInvalidValue = false
    try {
      validateBinaryMatrix([[0, 2], [1, 0]])
    } catch {
      threwInvalidValue = true
    }
    assert(threwInvalidValue, 'Must reject cell with value 2')
  })

  // 5. resizeMatrix Adaptation
  await test('resizeMatrix: Gracefully resizes matrix while preserving overlapping cells', () => {
    const original = [
      [1, 0],
      [0, 1]
    ]
    const resized = resizeMatrix(original, 3, 3)
    assert(resized.length === 3, 'Resized must have 3 rows')
    assert(resized[0].length === 3, 'Resized must have 3 columns')
    assert(resized[0][0] === 1, 'Preserved cell (0,0)')
    assert(resized[1][1] === 1, 'Preserved cell (1,1)')
    assert(resized[2][2] === 0, 'New cell (2,2) initialized to 0')
  })

  // 6. updateMatrix input validation: Rejects null/undefined payload
  await test('Input Validation: updateMatrix rejects null or undefined payload', async () => {
    let threw = false
    try {
      await restrictionService.updateMatrix('SIM-001', null)
    } catch (e) {
      threw = true
      assert(e.message.includes('Invalid matrix payload'), `Unexpected error message: ${e.message}`)
    }
    assert(threw, 'Expected updateMatrix to throw on null payload')
  })

  // 7. updateMatrix input validation: Rejects non-array matrix object
  await test('Input Validation: updateMatrix rejects non-array matrix property', async () => {
    let threw = false
    try {
      await restrictionService.updateMatrix('SIM-001', { matrix: 'not-an-array' })
    } catch (e) {
      threw = true
      assert(e.message.includes('Invalid matrix payload'), `Unexpected error message: ${e.message}`)
    }
    assert(threw, 'Expected updateMatrix to throw on non-array matrix')
  })

  // 8. updateMatrix input validation: Rejects number or string
  await test('Input Validation: updateMatrix rejects primitive value payload', async () => {
    let threw = false
    try {
      await restrictionService.updateMatrix('SIM-001', 42)
    } catch (e) {
      threw = true
    }
    assert(threw, 'Expected updateMatrix to throw on number payload')
  })

  // 9. Save and Fetch Matrix
  await test('Save & Fetch: Successfully saves and retrieves matrix for a scenario', async () => {
    const testMatrix = [
      [0, 1, 0],
      [1, 0, 0],
      [0, 0, 1]
    ]
    await restrictionService.saveMatrixForSimulation('SIM-TEST-99', testMatrix)
    const fetched = await restrictionService.getMatrixForSimulation('SIM-TEST-99', 3, 3)
    assert(fetched.length === 3, 'Fetched must have 3 rows')
    assert(fetched[0][1] === 1, 'Cell (0,1) must be 1')
    assert(fetched[0][0] === 0, 'Cell (0,0) must be 0')
  })

  // 10. Clear All Restrictions
  await test('Clear All: Resets all cells to 0', async () => {
    const cleared = await restrictionService.clearAllRestrictions('SIM-TEST-99', 3, 3)
    assert(cleared.every((row) => row.every((c) => c === 0)), 'All cells must be 0')
  })

  // 11. Mark All Forbidden
  await test('Mark All Forbidden: Sets all cells to 1', async () => {
    const forbidden = await restrictionService.markAllForbidden('SIM-TEST-99', 2, 2)
    assert(forbidden.every((row) => row.every((c) => c === 1)), 'All cells must be 1')
  })

  // 12. Reset to Benchmark
  await test('Reset to Benchmark: Restores canonical 6x6 benchmark for SIM-001', async () => {
    const bench = await restrictionService.resetToBenchmark('SIM-001', 6, 6)
    assert(bench.length === 6, 'Benchmark must have 6 rows')
    assert(bench[0][1] === 1, 'Cell (0,1) must be 1')
    assert(bench[3][0] === 1, 'Cell (3,0) must be 1')
  })

  // 13. Legacy backup utility
  await test('Legacy Utility: getLegacyBackup returns sample or stored data', () => {
    const backup = restrictionService.getLegacyBackup()
    assert(backup && typeof backup === 'object', 'Expected backup object')
    assert(Array.isArray(backup['SIM-001']), 'Expected SIM-001 sample array in backup')
  })

  // 14. Matrix Row/Column Identity & Reordering Invariant
  await test('Matrix Row/Column Identity: Preserves restrictions across flight/gate reordering', async () => {
    const simId = 'SIM-REORDER-TEST'
    const initialFlights = ['AI101', 'UK202', '6E303']
    const initialGates = ['G1', 'G2', 'G3']

    // Forbid AI101 (row 0) at G2 (col 1), and 6E303 (row 2) at G3 (col 2)
    const initialMatrix = [
      [0, 1, 0], // AI101: G1 allowed, G2 forbidden, G3 allowed
      [0, 0, 0], // UK202: all allowed
      [0, 0, 1]  // 6E303: G1 allowed, G2 allowed, G3 forbidden
    ]

    // Save with initial identity metadata
    await restrictionService.saveMatrixForSimulation(simId, initialMatrix, initialFlights, initialGates)

    // Reorder: flights -> [UK202, AI101, 6E303], gates -> [G2, G1, G3]
    const reorderedFlights = ['UK202', 'AI101', '6E303']
    const reorderedGates = ['G2', 'G1', 'G3']

    // Reload matrix passing the new flight and gate ordering
    const reloaded = await restrictionService.getMatrixForSimulation(simId, 3, 3, reorderedFlights, reorderedGates)

    // Expected reloaded matrix mapping:
    // Row 0 (UK202): [Col 0 (G2): 0, Col 1 (G1): 0, Col 2 (G3): 0]
    // Row 1 (AI101): [Col 0 (G2): 1, Col 1 (G1): 0, Col 2 (G3): 0] -> AI101 at G2 remains 1!
    // Row 2 (6E303): [Col 0 (G2): 0, Col 1 (G1): 0, Col 2 (G3): 1] -> 6E303 at G3 remains 1!
    assert(reloaded.length === 3, 'Reloaded matrix must have 3 rows')
    assert(reloaded[0].length === 3, 'Reloaded matrix must have 3 cols')

    // AI101 is now row 1, G2 is now col 0
    assert(reloaded[1][0] === 1, 'AI101 at G2 must remain forbidden (1) at new coordinates [1, 0]')
    assert(reloaded[1][1] === 0, 'AI101 at G1 must remain permitted (0) at new coordinates [1, 1]')
    assert(reloaded[1][2] === 0, 'AI101 at G3 must remain permitted (0) at new coordinates [1, 2]')

    // UK202 is now row 0, all allowed
    assert(reloaded[0][0] === 0, 'UK202 at G2 must be 0')
    assert(reloaded[0][1] === 0, 'UK202 at G1 must be 0')
    assert(reloaded[0][2] === 0, 'UK202 at G3 must be 0')

    // 6E303 is now row 2, G3 is col 2
    assert(reloaded[2][2] === 1, '6E303 at G3 must remain forbidden (1) at new coordinates [2, 2]')
    assert(reloaded[2][0] === 0, '6E303 at G2 must be 0')
    assert(reloaded[2][1] === 0, '6E303 at G1 must be 0')
  })

  console.log(`\nRestriction Test Results: ${results.filter((r) => r.passed).length}/${results.length} passed`)
  return results
}

// Execute immediately if run directly in Node
if (typeof process !== 'undefined' && process.argv[1]?.includes('restrictionService.test.js')) {
  runRestrictionServiceTests()
}
