/**
 * Unit Test Suite for Backtracking Allocation Engine (Phase 13)
 *
 * Covers:
 * 1. No restrictions (square 2x2 -> 2!, 3x3 -> 3!).
 * 2. One forbidden cell.
 * 3. Multiple forbidden cells.
 * 4. Fully forbidden matrix.
 * 5. No valid allocation (bottlenecked row or column).
 * 6. Multiple valid allocations.
 * 7. Rectangular matrices: More gates than flights (2 flights, 3 gates -> 6).
 * 8. Rectangular matrices: More flights than gates (3 flights, 2 gates -> 0).
 * 9. Duplicate gate prevention (injective gate matching verified).
 * 10. Unique flight assignment (surjective on flights verified).
 * 11. Search result limits (maxResults cap).
 * 12. First-solution mode (mode='first').
 * 13. Cancellation (cancelToken/signal).
 * 14. Input validation (null, jagged, non-binary, duplicate IDs, dimension mismatches).
 * 15. Phase 12 cross-verification on canonical SIM-001 (6x6 -> 309 valid allocations).
 */

import assert from 'node:assert'
import {
  generateAllocations,
  validateAllocationInput,
  crossVerifyWithPhase12,
  computeExactValidAssignments
} from './backtrackingAllocationService.js'

function runTests() {
  console.log('--- Running Backtracking Allocation Engine Unit Tests (Phase 13) ---')
  let passed = 0
  let total = 0

  function test(name, fn) {
    total++
    try {
      fn()
      console.log(`  ✓ ${name}`)
      passed++
    } catch (err) {
      console.error(`  ✗ ${name}`)
      console.error(err)
      process.exitCode = 1
    }
  }

  // 1. No restrictions: 2x2 and 3x3
  test('No restrictions: 2x2 board generates exactly 2! = 2 valid allocations', () => {
    const matrix = [
      [0, 0],
      [0, 0]
    ]
    const flightIds = ['AI101', 'UK202']
    const gateIds = ['G1', 'G2']

    const res = generateAllocations({ matrix, flightIds, gateIds, mode: 'all' })
    assert.strictEqual(res.success, true)
    assert.strictEqual(res.totalGenerated, 2)
    assert.strictEqual(res.allocations.length, 2)
    assert.strictEqual(res.status, 'COMPLETED')
    assert.strictEqual(res.resultLimitReached, false)

    // Expected permutations: [G1, G2] and [G2, G1]
    const perm1 = res.allocations[0].assignments.map((a) => a.gateId)
    const perm2 = res.allocations[1].assignments.map((a) => a.gateId)
    assert.deepStrictEqual(perm1, ['G1', 'G2'])
    assert.deepStrictEqual(perm2, ['G2', 'G1'])
  })

  test('No restrictions: 3x3 board generates exactly 3! = 6 valid allocations', () => {
    const matrix = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0]
    ]
    const flightIds = ['F1', 'F2', 'F3']
    const gateIds = ['G1', 'G2', 'G3']

    const res = generateAllocations({ matrix, flightIds, gateIds, mode: 'all' })
    assert.strictEqual(res.totalGenerated, 6)
    assert.strictEqual(res.allocations.length, 6)
  })

  // 2. One forbidden cell
  test('One forbidden cell: [0, 0] = 1 on 2x2 leaves exactly 1 valid allocation', () => {
    const matrix = [
      [1, 0],
      [0, 0]
    ]
    const flightIds = ['F1', 'F2']
    const gateIds = ['G1', 'G2']

    const res = generateAllocations({ matrix, flightIds, gateIds, mode: 'all' })
    assert.strictEqual(res.totalGenerated, 1)
    // F1 cannot dock at G1, so F1 must dock at G2, forcing F2 to G1
    const alloc = res.allocations[0].assignments
    assert.strictEqual(alloc[0].flightId, 'F1')
    assert.strictEqual(alloc[0].gateId, 'G2')
    assert.strictEqual(alloc[1].flightId, 'F2')
    assert.strictEqual(alloc[1].gateId, 'G1')
    assert.strictEqual(res.searchStatistics.rejectedBranches >= 1, true)
  })

  // 3. Multiple forbidden cells
  test('Multiple forbidden cells: Diagonal restrictions on 2x2 leaves exactly 1 valid allocation', () => {
    const matrix = [
      [1, 0],
      [0, 1]
    ]
    const flightIds = ['F1', 'F2']
    const gateIds = ['G1', 'G2']

    const res = generateAllocations({ matrix, flightIds, gateIds, mode: 'all' })
    assert.strictEqual(res.totalGenerated, 1)
    assert.deepStrictEqual(
      res.allocations[0].assignments.map((a) => a.gateId),
      ['G2', 'G1']
    )
  })

  // 4. Fully forbidden matrix
  test('Fully forbidden matrix: 2x2 with all 1s yields 0 allocations', () => {
    const matrix = [
      [1, 1],
      [1, 1]
    ]
    const flightIds = ['F1', 'F2']
    const gateIds = ['G1', 'G2']

    const res = generateAllocations({ matrix, flightIds, gateIds, mode: 'all' })
    assert.strictEqual(res.totalGenerated, 0)
    assert.strictEqual(res.allocations.length, 0)
    assert.strictEqual(res.status, 'NO_SOLUTIONS')
    assert.strictEqual(res.searchStatistics.rejectedBranches, 2) // Both gates rejected on first flight
  })

  // 5. No valid allocation (bottlenecked row or column)
  test('No valid allocation: Entire row forbidden yields 0 allocations', () => {
    const matrix = [
      [0, 0, 0],
      [1, 1, 1], // F2 cannot dock at any gate
      [0, 0, 0]
    ]
    const flightIds = ['F1', 'F2', 'F3']
    const gateIds = ['G1', 'G2', 'G3']

    const res = generateAllocations({ matrix, flightIds, gateIds, mode: 'all' })
    assert.strictEqual(res.totalGenerated, 0)
    assert.strictEqual(res.status, 'NO_SOLUTIONS')
  })

  test('No valid allocation: Mutually exclusive collision yields 0 allocations', () => {
    const matrix = [
      [0, 1], // F1 can only take G1
      [0, 1]  // F2 can only take G1 -> double booking conflict
    ]
    const flightIds = ['F1', 'F2']
    const gateIds = ['G1', 'G2']

    const res = generateAllocations({ matrix, flightIds, gateIds, mode: 'all' })
    assert.strictEqual(res.totalGenerated, 0)
    assert.strictEqual(res.status, 'NO_SOLUTIONS')
  })

  // 6. Multiple valid allocations on 3x3
  test('Multiple valid allocations: 3x3 with 2 restrictions yields expected permutations', () => {
    const matrix = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 0]
    ]
    const flightIds = ['F1', 'F2', 'F3']
    const gateIds = ['G1', 'G2', 'G3']

    // Total = 3! - 2*(2!) + 1*(1!) = 6 - 4 + 1 = 3 valid allocations
    const res = generateAllocations({ matrix, flightIds, gateIds, mode: 'all' })
    assert.strictEqual(res.totalGenerated, 3)
    assert.strictEqual(res.allocations.length, 3)
  })

  // 7. Rectangular matrices: More gates than flights (2 flights, 3 gates)
  test('Rectangular matrix: 2 flights and 3 gates yields 3 * 2 = 6 valid allocations', () => {
    const matrix = [
      [0, 0, 0],
      [0, 0, 0]
    ]
    const flightIds = ['F1', 'F2']
    const gateIds = ['G1', 'G2', 'G3']

    const res = generateAllocations({ matrix, flightIds, gateIds, mode: 'all' })
    assert.strictEqual(res.totalGenerated, 6)
    assert.strictEqual(res.allocations.length, 6)

    // Verify all 6 pairings are unique
    const distinctSignatures = new Set(
      res.allocations.map((a) => a.assignments.map((x) => `${x.flightId}->${x.gateId}`).join('|'))
    )
    assert.strictEqual(distinctSignatures.size, 6)
  })

  // 8. Rectangular matrices: More flights than gates (3 flights, 2 gates)
  test('Rectangular matrix: 3 flights and 2 gates returns 0 allocations via Pigeonhole Principle', () => {
    const matrix = [
      [0, 0],
      [0, 0],
      [0, 0]
    ]
    const flightIds = ['F1', 'F2', 'F3']
    const gateIds = ['G1', 'G2']

    const res = generateAllocations({ matrix, flightIds, gateIds, mode: 'all' })
    assert.strictEqual(res.totalGenerated, 0)
    assert.strictEqual(res.status, 'NO_SOLUTIONS')
    assert.strictEqual(res.explanation.includes('Pigeonhole') || res.explanation.includes('flights exceed gates'), true)
  })

  // 9. Duplicate gate prevention
  test('Injective gate matching: Every generated allocation assigns mutually distinct gates', () => {
    const matrix = [
      [0, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 0]
    ]
    const flightIds = ['F1', 'F2', 'F3', 'F4']
    const gateIds = ['G1', 'G2', 'G3', 'G4']

    const res = generateAllocations({ matrix, flightIds, gateIds, mode: 'all' })
    assert.strictEqual(res.totalGenerated > 0, true)

    for (const alloc of res.allocations) {
      const assignedGates = alloc.assignments.map((a) => a.gateId)
      const uniqueGates = new Set(assignedGates)
      assert.strictEqual(uniqueGates.size, assignedGates.length, 'No gate can be assigned more than once')
    }
  })

  // 10. Unique flight assignment
  test('Surjective flight matching: Every generated allocation assigns every flight exactly once', () => {
    const matrix = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0]
    ]
    const flightIds = ['AI101', 'UK202', '6E303']
    const gateIds = ['G1', 'G2', 'G3']

    const res = generateAllocations({ matrix, flightIds, gateIds, mode: 'all' })
    for (const alloc of res.allocations) {
      assert.strictEqual(alloc.complete, true)
      assert.strictEqual(alloc.valid, true)
      assert.strictEqual(alloc.assignedFlights, 3)
      assert.deepStrictEqual(
        alloc.assignments.map((a) => a.flightId),
        flightIds
      )
    }
  })

  // 11. Search result limits (maxResults cap)
  test('Result limits: Capping at maxResults = 3 stops search and flags resultLimitReached', () => {
    const matrix = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0]
    ]
    const flightIds = ['F1', 'F2', 'F3']
    const gateIds = ['G1', 'G2', 'G3']

    // Unrestricted 3x3 has 6 solutions; cap at 3
    const res = generateAllocations({ matrix, flightIds, gateIds, mode: 'limited', maxResults: 3 })
    assert.strictEqual(res.totalGenerated, 3)
    assert.strictEqual(res.allocations.length, 3)
    assert.strictEqual(res.resultLimitReached, true)
    assert.strictEqual(res.status, 'LIMIT_REACHED')
  })

  // 12. First-solution mode
  test('First-solution mode: mode="first" terminates immediately after 1 allocation', () => {
    const matrix = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ]
    const flightIds = ['F1', 'F2', 'F3', 'F4']
    const gateIds = ['G1', 'G2', 'G3', 'G4']

    const res = generateAllocations({ matrix, flightIds, gateIds, mode: 'first' })
    assert.strictEqual(res.totalGenerated, 1)
    assert.strictEqual(res.allocations.length, 1)
    assert.strictEqual(res.status, 'COMPLETED')
    assert.strictEqual(res.resultLimitReached, false)
  })

  // 13. Cancellation
  test('Cancellation: cancelToken halts execution gracefully', () => {
    const matrix = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0]
    ]
    const flightIds = ['F1', 'F2', 'F3', 'F4', 'F5']
    const gateIds = ['G1', 'G2', 'G3', 'G4', 'G5']
    const cancelToken = { isCancelled: true }

    const res = generateAllocations({ matrix, flightIds, gateIds, mode: 'all', cancelToken })
    assert.strictEqual(res.status, 'CANCELLED')
    assert.strictEqual(res.totalGenerated, 0)
  })

  // 14. Input validation
  test('Validation: Rejects missing matrix or non-array inputs', () => {
    assert.strictEqual(validateAllocationInput({ matrix: null, flightIds: ['F1'], gateIds: ['G1'] }).valid, false)
    assert.strictEqual(validateAllocationInput({ matrix: [], flightIds: ['F1'], gateIds: ['G1'] }).valid, false)
    assert.strictEqual(validateAllocationInput({ matrix: [[0]], flightIds: [], gateIds: ['G1'] }).valid, false)
    assert.strictEqual(validateAllocationInput({ matrix: [[0]], flightIds: ['F1'], gateIds: [] }).valid, false)
  })

  test('Validation: Rejects duplicate flight IDs and duplicate gate IDs', () => {
    const matrix = [
      [0, 0],
      [0, 0]
    ]
    const dupFlights = validateAllocationInput({ matrix, flightIds: ['F1', 'F1'], gateIds: ['G1', 'G2'] })
    assert.strictEqual(dupFlights.valid, false)
    assert.strictEqual(dupFlights.error.includes('Duplicate flight IDs'), true)

    const dupGates = validateAllocationInput({ matrix, flightIds: ['F1', 'F2'], gateIds: ['G1', 'G1'] })
    assert.strictEqual(dupGates.valid, false)
    assert.strictEqual(dupGates.error.includes('Duplicate gate IDs'), true)
  })

  test('Validation: Rejects jagged rows and non-binary cell values', () => {
    const jagged = [
      [0, 1],
      [0]
    ]
    assert.strictEqual(validateAllocationInput({ matrix: jagged, flightIds: ['F1', 'F2'], gateIds: ['G1', 'G2'] }).valid, false)

    const nonBinary = [
      [0, 2],
      [1, 0]
    ]
    const nonBinRes = validateAllocationInput({ matrix: nonBinary, flightIds: ['F1', 'F2'], gateIds: ['G1', 'G2'] })
    assert.strictEqual(nonBinRes.valid, false)
    assert.strictEqual(nonBinRes.error.includes('Non-binary matrix cell'), true)
  })

  // 15. Phase 12 Cross-Verification on Canonical SIM-001 (6x6 -> 309 valid allocations)
  test('Cross-Verification: Phase 12 Inclusion-Exclusion formula matches Phase 13 generator on SIM-001 (309 valid)', () => {
    // Canonical benchmark matrix SIM-001
    const sim001Matrix = [
      [1, 0, 0, 0, 0, 0], // AI-101 restricted at Gate 1
      [0, 1, 0, 0, 0, 0], // 6E-202 restricted at Gate 2
      [0, 0, 1, 0, 0, 0], // QP-303 restricted at Gate 3
      [0, 0, 0, 1, 0, 0], // SG-404 restricted at Gate 4
      [0, 0, 0, 0, 1, 0], // IX-505 restricted at Gate 5
      [0, 0, 0, 0, 0, 0]  // EK-606 unconstrained
    ]
    const flightIds = ['AI-101', '6E-202', 'QP-303', 'SG-404', 'IX-505', 'EK-606']
    const gateIds = ['GATE-01', 'GATE-02', 'GATE-03', 'GATE-04', 'GATE-05', 'GATE-06']

    // Phase 12 Exact Count calculation:
    // R(B, x) = 1 + 5x + 10x^2 + 10x^3 + 5x^4 + x^5
    // N = 6! - 5(5!) + 10(4!) - 10(3!) + 5(2!) - 1(1!)
    //   = 720 - 600 + 240 - 60 + 10 - 1 = 309
    const phase12Exact = computeExactValidAssignments(sim001Matrix)
    assert.strictEqual(phase12Exact, 309, 'Phase 12 exact calculation must equal 309')

    // Run Phase 13 Backtracking Allocation Engine
    const verification = crossVerifyWithPhase12({
      matrix: sim001Matrix,
      flightIds,
      gateIds,
      phase12ExactCount: 309,
      maxResults: 500
    })

    assert.strictEqual(verification.compatible, true)
    assert.strictEqual(verification.verified, true)
    assert.strictEqual(verification.status, 'VERIFIED')
    assert.strictEqual(verification.phase12ExactCount, 309)
    assert.strictEqual(verification.phase13GeneratedCount, 309)
    assert.strictEqual(verification.discrepancy, 0)
    assert.strictEqual(verification.searchStatistics.nodesVisited > 309, true)
  })

  // 16. Cross-Verification with result limit reports INCOMPLETE_SEARCH rather than mismatch
  test('Cross-Verification: Truncated search reports INCOMPLETE_SEARCH rather than discrepancy', () => {
    const sim001Matrix = [
      [1, 0, 0, 0, 0, 0],
      [0, 1, 0, 0, 0, 0],
      [0, 0, 1, 0, 0, 0],
      [0, 0, 0, 1, 0, 0],
      [0, 0, 0, 0, 1, 0],
      [0, 0, 0, 0, 0, 0]
    ]
    const flightIds = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6']
    const gateIds = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6']

    const verification = crossVerifyWithPhase12({
      matrix: sim001Matrix,
      flightIds,
      gateIds,
      phase12ExactCount: 309,
      maxResults: 50 // cap at 50
    })

    assert.strictEqual(verification.status, 'INCOMPLETE_SEARCH')
    assert.strictEqual(verification.verified, null)
    assert.strictEqual(verification.phase13GeneratedCount, 50)
  })

  console.log(`\nBacktracking Allocation Engine Test Results: ${passed}/${total} passed`)
}

runTests()
