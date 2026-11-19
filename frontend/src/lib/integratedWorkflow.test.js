/**
 * End-to-End Integration Tests for Phase 14 Workflow (GateWise BLR)
 *
 * Verifies the complete 6-step mathematical workflow:
 * 1. Simulation selection & entity mapping
 * 2. Matrix Validation (Phase 10)
 * 3. Rook Polynomial Calculation (Phase 11)
 * 4. Inclusion-Exclusion Calculation (Phase 12)
 * 5. Backtracking Allocation Generation (Phase 13)
 * 6. Cross-Verification & Mathematical Equality
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { matrixValidationService } from './matrixValidationService.js'
import { computeRookPolynomial } from './rookPolynomialService.js'
import { computeInclusionExclusionFromMatrix } from './inclusionExclusionService.js'
import { generateAllocations, crossVerifyWithPhase12 } from './backtrackingAllocationService.js'

describe('Phase 14 — Integrated Mathematical Workflow', () => {
  it('Complete 6-step workflow: 3x3 Scenario with 1 restriction', () => {
    // Step 1: Load simulation context
    const sim = {
      id: 'SIM-TEST-1',
      name: 'Morning Rush 3x3',
      selectedFlightIds: ['AI101', 'UK202', '6E303'],
      selectedGateIds: ['G1', 'G2', 'G3']
    }
    const flights = [
      { id: 'AI101', flightNumber: 'AI101', aircraftType: 'Narrow-Body' },
      { id: 'UK202', flightNumber: 'UK202', aircraftType: 'Narrow-Body' },
      { id: '6E303', flightNumber: '6E303', aircraftType: 'Narrow-Body' }
    ]
    const gates = [
      { id: 'G1', gateNumber: 'G1', terminal: 'T1' },
      { id: 'G2', gateNumber: 'G2', terminal: 'T1' },
      { id: 'G3', gateNumber: 'G3', terminal: 'T1' }
    ]
    const matrix = [
      [1, 0, 0],
      [0, 0, 0],
      [0, 0, 0]
    ]

    // Step 2: Matrix Validation (Phase 10)
    const valReport = matrixValidationService.validateMatrix(sim, matrix, flights, gates)
    assert.equal(valReport.isValid, true, 'Matrix must pass validation')
    assert.equal(valReport.errors.length, 0)

    // Step 3: Rook Polynomial Calculation (Phase 11)
    const rook = computeRookPolynomial(matrix)
    assert.equal(rook.forbiddenCellCount, 1)
    assert.equal(rook.degree, 1)
    assert.equal(BigInt(rook.coefficients[0]), 1n)
    assert.equal(BigInt(rook.coefficients[1]), 1n)

    // Step 4: Inclusion-Exclusion Calculation (Phase 12)
    const pie = computeInclusionExclusionFromMatrix(matrix)
    assert.equal(pie.validAssignments, 4n, '3x3 with 1 restriction has 4 valid assignments')
    assert.equal(pie.totalPossibleAssignments, 6n)

    // Step 5: Backtracking Allocation Generation (Phase 13)
    const flightIds = flights.map(f => f.id)
    const gateIds = gates.map(g => g.id)
    const btResult = generateAllocations({
      matrix,
      flightIds,
      gateIds,
      mode: 'all',
      maxResults: 100
    })
    assert.equal(btResult.status, 'COMPLETED')
    assert.equal(btResult.allocations.length, 4)

    // Verify concrete mappings are conflict-free
    for (const alloc of btResult.allocations) {
      assert.equal(alloc.assignments.length, 3)
      for (const pair of alloc.assignments) {
        // AI101 is row 0, G1 is col 0 => forbidden!
        if (pair.flightId === 'AI101') {
          assert.notEqual(pair.gateId, 'G1', 'AI101 must not be assigned to forbidden gate G1')
        }
      }
    }

    // Step 6: Cross-Verification
    const crossCheck = crossVerifyWithPhase12({
      matrix,
      flightIds,
      gateIds,
      phase12ExactCount: Number(pie.validAssignments)
    })
    assert.equal(crossCheck.verified, true)
    assert.equal(crossCheck.status, 'VERIFIED')
    assert.equal(crossCheck.phase12ExactCount, 4)
    assert.equal(crossCheck.phase13GeneratedCount, 4)
  })

  it('Complete 6-step workflow: 3x3 Diagonal Derangements (D_3)', () => {
    const sim = {
      id: 'SIM-DERANGE',
      name: 'Derangement Test',
      selectedFlightIds: ['F1', 'F2', 'F3'],
      selectedGateIds: ['G1', 'G2', 'G3']
    }
    const flights = [{ id: 'F1' }, { id: 'F2' }, { id: 'F3' }]
    const gates = [{ id: 'G1' }, { id: 'G2' }, { id: 'G3' }]
    const matrix = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1]
    ]

    const val = matrixValidationService.validateMatrix(sim, matrix, flights, gates)
    assert.equal(val.isValid, true)

    const rook = computeRookPolynomial(matrix)
    assert.equal(rook.forbiddenCellCount, 3)
    // R(x) = 1 + 3x + 3x^2 + 1x^3

    const pie = computeInclusionExclusionFromMatrix(matrix)
    assert.equal(pie.validAssignments, 2n)

    const flightIds = ['F1', 'F2', 'F3']
    const gateIds = ['G1', 'G2', 'G3']
    const bt = generateAllocations({
      matrix,
      flightIds,
      gateIds,
      mode: 'all'
    })
    assert.equal(bt.allocations.length, 2)

    const cross = crossVerifyWithPhase12({
      matrix,
      flightIds,
      gateIds,
      phase12ExactCount: Number(pie.validAssignments)
    })
    assert.equal(cross.verified, true)
    assert.equal(cross.status, 'VERIFIED')
  })

  it('Complete 6-step workflow: Fully Restricted Infeasible Scenario', () => {
    const sim = {
      id: 'SIM-BLOCKED',
      name: 'All Blocked',
      selectedFlightIds: ['F1', 'F2'],
      selectedGateIds: ['G1', 'G2']
    }
    const flights = [{ id: 'F1' }, { id: 'F2' }]
    const gates = [{ id: 'G1' }, { id: 'G2' }]
    const matrix = [
      [1, 1],
      [1, 1]
    ]

    const val = matrixValidationService.validateMatrix(sim, matrix, flights, gates)
    assert.equal(val.isValid, true)

    const pie = computeInclusionExclusionFromMatrix(matrix)
    assert.equal(pie.validAssignments, 0n)

    const flightIds = ['F1', 'F2']
    const gateIds = ['G1', 'G2']
    const bt = generateAllocations({
      matrix,
      flightIds,
      gateIds,
      mode: 'all'
    })
    assert.equal(bt.allocations.length, 0)
    assert.equal(bt.status, 'NO_SOLUTIONS')

    const cross = crossVerifyWithPhase12({
      matrix,
      flightIds,
      gateIds,
      phase12ExactCount: Number(pie.validAssignments)
    })
    assert.equal(cross.verified, true)
    assert.equal(cross.status, 'VERIFIED')
    assert.equal(cross.phase12ExactCount, 0)
    assert.equal(cross.phase13GeneratedCount, 0)
  })

  it('Halts mathematical calculation when matrix has blocking structural errors', () => {
    const sim = {
      id: 'SIM-BAD',
      name: 'Corrupt Matrix',
      selectedFlightIds: ['F1', 'F2'],
      selectedGateIds: ['G1', 'G2']
    }
    const flights = [{ id: 'F1' }, { id: 'F2' }]
    const gates = [{ id: 'G1' }, { id: 'G2' }]
    // Malformed: non-binary value 9 and missing column in row 1
    const badMatrix = [
      [1, 9],
      [0]
    ]

    const val = matrixValidationService.validateMatrix(sim, badMatrix, flights, gates)
    assert.equal(val.isValid, false, 'Validation must fail')
    assert.ok(val.errors.length > 0, 'Error count must be positive')
  })
})
