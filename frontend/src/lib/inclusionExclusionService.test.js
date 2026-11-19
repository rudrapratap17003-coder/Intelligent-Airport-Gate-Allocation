/**
 * Unit Tests for Inclusion-Exclusion Engine (Phase 12 — GateWise BLR)
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  permutationBigInt,
  calculateInclusionExclusion,
  computeInclusionExclusionFromMatrix
} from './inclusionExclusionService.js'

describe('Inclusion-Exclusion Service', () => {
  describe('permutationBigInt', () => {
    it('computes P(n, r) correctly', () => {
      assert.equal(permutationBigInt(4, 0), 1n)
      assert.equal(permutationBigInt(4, 1), 4n)
      assert.equal(permutationBigInt(4, 2), 12n)
      assert.equal(permutationBigInt(4, 3), 24n)
      assert.equal(permutationBigInt(4, 4), 24n)
      assert.equal(permutationBigInt(4, 5), 0n)
      assert.equal(permutationBigInt(3, 2), 6n)
      assert.equal(permutationBigInt(5, 3), 60n)
    })
  })

  describe('Standard Combinatorial Test Cases', () => {
    it('Case 1: 3x3 None forbidden -> 6 valid assignments', () => {
      const matrix = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
      ]
      const result = computeInclusionExclusionFromMatrix(matrix)
      assert.equal(result.validAssignments, 6n)
      assert.equal(result.totalPossibleAssignments, 6n)
      assert.equal(result.feasibilityPercentage, 100)
    })

    it('Case 2: 4x4 None forbidden -> 24 valid assignments', () => {
      const matrix = [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ]
      const result = computeInclusionExclusionFromMatrix(matrix)
      assert.equal(result.validAssignments, 24n)
      assert.equal(result.totalPossibleAssignments, 24n)
      assert.equal(result.feasibilityPercentage, 100)
    })

    it('Case 3: 3x3 One forbidden cell -> 4 valid assignments', () => {
      const matrix = [
        [1, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
      ]
      const result = computeInclusionExclusionFromMatrix(matrix)
      assert.equal(result.validAssignments, 4n)
      assert.equal(result.totalPossibleAssignments, 6n)
    })

    it('Case 4: 3x3 All diagonal cells forbidden (derangements D_3) -> 2 valid assignments', () => {
      const matrix = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
      ]
      const result = computeInclusionExclusionFromMatrix(matrix)
      assert.equal(result.validAssignments, 2n)
      assert.equal(result.terms.length, 4)
    })

    it('Case 5: 3x3 All cells forbidden -> 0 valid assignments', () => {
      const matrix = [
        [1, 1, 1],
        [1, 1, 1],
        [1, 1, 1]
      ]
      const result = computeInclusionExclusionFromMatrix(matrix)
      assert.equal(result.validAssignments, 0n)
      assert.equal(result.feasibilityPercentage, 0)
    })

    it('Case 6: 2x2 One forbidden cell -> 1 valid assignment', () => {
      const matrix = [
        [1, 0],
        [0, 0]
      ]
      const result = computeInclusionExclusionFromMatrix(matrix)
      assert.equal(result.validAssignments, 1n)
      assert.equal(result.totalPossibleAssignments, 2n)
      assert.equal(result.feasibilityPercentage, 50)
    })
  })

  describe('Rectangular and Edge Cases', () => {
    it('Rectangular 2 flights x 3 gates without restrictions -> P(3, 2) = 6', () => {
      const matrix = [
        [0, 0, 0],
        [0, 0, 0]
      ]
      const result = computeInclusionExclusionFromMatrix(matrix)
      assert.equal(result.isSquare, false)
      assert.equal(result.validAssignments, 6n)
      assert.equal(result.totalPossibleAssignments, 6n)
      assert.equal(result.feasibilityPercentage, 100)
    })

    it('Rectangular 2 flights x 3 gates with restrictions', () => {
      // Flight 0 forbidden at Gate 0
      // Flight 1 forbidden at Gate 1
      const matrix = [
        [1, 0, 0],
        [0, 1, 0]
      ]
      const result = computeInclusionExclusionFromMatrix(matrix)
      // Total unrestricted: P(3, 2) = 6
      // r_0 = 1, r_1 = 2, r_2 = 1 (at (0,0) and (1,1))
      // Term 0: + 1 * P(3, 2) = +6
      // Term 1: - 2 * P(2, 1) = -4
      // Term 2: + 1 * P(1, 0) = +1
      // N = 6 - 4 + 1 = 3
      assert.equal(result.validAssignments, 3n)
    })

    it('Over-constrained: 3 flights x 2 gates -> N = 0', () => {
      const result = calculateInclusionExclusion([1n, 0n], 3, 2)
      assert.equal(result.isOverConstrained, true)
      assert.equal(result.validAssignments, 0n)
    })
  })
})
