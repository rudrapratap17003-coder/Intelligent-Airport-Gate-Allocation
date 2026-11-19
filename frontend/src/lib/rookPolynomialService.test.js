/**
 * rookPolynomialService.test.js
 * Comprehensive automated unit test suite verifying the Rook Polynomial Engine (Phase 11).
 * Tests all required cases, rectangular boards, edge cases, immutability, and brute-force equivalence.
 */

import {
  rookPolynomialService,
  computeRookPolynomial,
  bruteForceRookPolynomial,
  validateInputMatrix,
  formatPolynomial,
  findForbiddenCells,
  generateRookPlacements
} from './rookPolynomialService.js'

export const runRookPolynomialTests = () => {
  const results = []

  const test = (name, fn) => {
    try {
      fn()
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

  const assertArraysEqual = (actual, expected, msg) => {
    const actStr = JSON.stringify(actual)
    const expStr = JSON.stringify(expected)
    if (actStr !== expStr) {
      throw new Error(`${msg || 'Arrays not equal'}: expected ${expStr}, got ${actStr}`)
    }
  }

  console.log('--- Running Rook Polynomial Engine Unit Tests (Phase 11) ---')

  // 1. Required Case 1: No restrictions [[0,0],[0,0]] -> Coefficients: [1]
  test('Required 1: No restrictions on 2x2 board yields [1]', () => {
    const matrix = [
      [0, 0],
      [0, 0]
    ]
    const res = computeRookPolynomial(matrix)
    assert(res.success === true, 'Calculation must succeed')
    assertArraysEqual(res.coefficientsNumeric, [1], 'Coefficients must be [1]')
    assert(res.degree === 0, 'Degree must be 0')
    assert(res.forbiddenCellCount === 0, 'Forbidden count must be 0')
    assert(res.polynomial === 'R(x) = 1', 'Polynomial must be R(x) = 1')
  })

  // 2. Required Case 2: One forbidden cell [[1,0],[0,0]] -> Coefficients: [1, 1]
  test('Required 2: One forbidden cell yields [1, 1]', () => {
    const matrix = [
      [1, 0],
      [0, 0]
    ]
    const res = computeRookPolynomial(matrix)
    assert(res.success === true, 'Calculation must succeed')
    assertArraysEqual(res.coefficientsNumeric, [1, 1], 'Coefficients must be [1, 1]')
    assert(res.degree === 1, 'Degree must be 1')
    assert(res.forbiddenCellCount === 1, 'Forbidden count must be 1')
    assert(res.polynomial === 'R(x) = 1 + x', 'Polynomial must be R(x) = 1 + x')
  })

  // 3. Required Case 3: Two forbidden cells in one row [[1,1],[0,0]] -> Coefficients: [1, 2]
  test('Required 3: Two forbidden cells in same row yields [1, 2]', () => {
    const matrix = [
      [1, 1],
      [0, 0]
    ]
    const res = computeRookPolynomial(matrix)
    assert(res.success === true, 'Calculation must succeed')
    assertArraysEqual(res.coefficientsNumeric, [1, 2], 'Coefficients must be [1, 2]')
    assert(res.degree === 1, 'Degree must be 1 (2 rooks cannot be placed in same row)')
    assert(res.forbiddenCellCount === 2, 'Forbidden count must be 2')
    assert(res.polynomial === 'R(x) = 1 + 2x', 'Polynomial must be R(x) = 1 + 2x')
  })

  // 4. Required Case 4: Two forbidden cells in one column [[1,0],[1,0]] -> Coefficients: [1, 2]
  test('Required 4: Two forbidden cells in same column yields [1, 2]', () => {
    const matrix = [
      [1, 0],
      [1, 0]
    ]
    const res = computeRookPolynomial(matrix)
    assert(res.success === true, 'Calculation must succeed')
    assertArraysEqual(res.coefficientsNumeric, [1, 2], 'Coefficients must be [1, 2]')
    assert(res.degree === 1, 'Degree must be 1 (2 rooks cannot be placed in same column)')
    assert(res.forbiddenCellCount === 2, 'Forbidden count must be 2')
    assert(res.polynomial === 'R(x) = 1 + 2x', 'Polynomial must be R(x) = 1 + 2x')
  })

  // 5. Required Case 5: Two non-attacking forbidden cells [[1,0],[0,1]] -> Coefficients: [1, 2, 1]
  test('Required 5: Two non-attacking forbidden cells yields [1, 2, 1]', () => {
    const matrix = [
      [1, 0],
      [0, 1]
    ]
    const res = computeRookPolynomial(matrix)
    assert(res.success === true, 'Calculation must succeed')
    assertArraysEqual(res.coefficientsNumeric, [1, 2, 1], 'Coefficients must be [1, 2, 1]')
    assert(res.degree === 2, 'Degree must be 2')
    assert(res.forbiddenCellCount === 2, 'Forbidden count must be 2')
    assert(res.polynomial === 'R(x) = 1 + 2x + x²', 'Polynomial must be R(x) = 1 + 2x + x²')
  })

  // 6. Required Case 6: Fully forbidden 2x2 [[1,1],[1,1]] -> Coefficients: [1, 4, 2]
  test('Required 6: Fully forbidden 2x2 board yields [1, 4, 2]', () => {
    const matrix = [
      [1, 1],
      [1, 1]
    ]
    const res = computeRookPolynomial(matrix)
    assert(res.success === true, 'Calculation must succeed')
    assertArraysEqual(res.coefficientsNumeric, [1, 4, 2], 'Coefficients must be [1, 4, 2]')
    assert(res.degree === 2, 'Degree must be 2')
    assert(res.forbiddenCellCount === 4, 'Forbidden count must be 4')
    assert(res.polynomial === 'R(x) = 1 + 4x + 2x²', 'Polynomial must be R(x) = 1 + 4x + 2x²')
  })

  // 7. Required Case 7: Fully forbidden 3x3 -> Coefficients: [1, 9, 18, 6]
  test('Required 7: Fully forbidden 3x3 board yields [1, 9, 18, 6]', () => {
    const matrix = [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1]
    ]
    const res = computeRookPolynomial(matrix)
    assert(res.success === true, 'Calculation must succeed')
    assertArraysEqual(res.coefficientsNumeric, [1, 9, 18, 6], 'Coefficients must be [1, 9, 18, 6]')
    assert(res.degree === 3, 'Degree must be 3')
    assert(res.forbiddenCellCount === 9, 'Forbidden count must be 9')
    assert(res.polynomial === 'R(x) = 1 + 9x + 18x² + 6x³', 'Polynomial must be R(x) = 1 + 9x + 18x² + 6x³')
  })

  // 8. Rectangular Matrix: 2 flights x 3 gates
  test('Rectangular: 2x3 board coefficients match brute-force', () => {
    const matrix = [
      [1, 1, 0],
      [0, 1, 1]
    ]
    const res = computeRookPolynomial(matrix)
    const bf = bruteForceRookPolynomial(matrix)
    assert(res.success === true, 'Must succeed')
    assertArraysEqual(res.coefficientsNumeric, bf, 'DP must match brute force')
    // 4 cells with 1 -> r_1 = 4.
    // 2 non-attacking: (0,0)+(1,1), (0,0)+(1,2), (0,1)+(1,2) -> r_2 = 3.
    assertArraysEqual(res.coefficientsNumeric, [1, 4, 3], 'Expected [1, 4, 3]')
    assert(res.degree === 2, 'Degree <= min(2, 3) = 2')
  })

  // 9. Rectangular Matrix: 3 flights x 2 gates
  test('Rectangular: 3x2 board coefficients match brute-force', () => {
    const matrix = [
      [1, 0],
      [1, 1],
      [0, 1]
    ]
    const res = computeRookPolynomial(matrix)
    const bf = bruteForceRookPolynomial(matrix)
    assert(res.success === true, 'Must succeed')
    assertArraysEqual(res.coefficientsNumeric, bf, 'DP must match brute force')
    // Transposed version of 2x3 board above -> must have identical polynomial [1, 4, 3]!
    assertArraysEqual(res.coefficientsNumeric, [1, 4, 3], 'Transposed board must have identical polynomial [1, 4, 3]')
  })

  // 10. Rectangular Matrix: 2 flights x 4 gates
  test('Rectangular: 2x4 board coefficients correctly bounded by min(rows, cols)', () => {
    const matrix = [
      [1, 1, 1, 1],
      [1, 0, 1, 0]
    ]
    const res = computeRookPolynomial(matrix)
    const bf = bruteForceRookPolynomial(matrix)
    assert(res.success === true, 'Must succeed')
    assertArraysEqual(res.coefficientsNumeric, bf, 'Must match brute force')
    assert(res.degree <= 2, 'Degree cannot exceed 2 for a 2-row board')
  })

  // 11. Sparse Matrix: Canonical Benchmark 6x6 Scenario SIM-001
  test('Sparse Benchmark: Canonical 6x6 SIM-001 matrix computes correctly', () => {
    const sim001Matrix = [
      [0, 1, 0, 0, 0, 0],
      [0, 0, 0, 1, 0, 0],
      [0, 0, 0, 0, 1, 0],
      [1, 0, 0, 0, 0, 0],
      [0, 0, 1, 0, 0, 0],
      [0, 0, 0, 0, 0, 0]
    ]
    const res = computeRookPolynomial(sim001Matrix)
    assert(res.success === true, 'SIM-001 calculation must succeed')
    assert(res.forbiddenCellCount === 5, 'Forbidden count must be exactly 5')

    // Since every 1 is in a distinct row AND a distinct column:
    // (0,1), (1,3), (2,4), (3,0), (4,2)
    // Any pair, triple, etc. of these 5 rooks are completely non-attacking!
    // r_k = C(5, k)
    // r_0 = 1, r_1 = 5, r_2 = 10, r_3 = 10, r_4 = 5, r_5 = 1
    assertArraysEqual(res.coefficientsNumeric, [1, 5, 10, 10, 5, 1], 'SIM-001 must yield [1, 5, 10, 10, 5, 1]')
    assert(res.degree === 5, 'Degree must be 5')
    assert(res.polynomial.includes('5x + 10x² + 10x³ + 5x⁴ + x⁵'), 'Polynomial text matches')
  })

  // 12. Cross-Verification of Arbitrary 4x4 with Brute Force
  test('Cross-Verification: Arbitrary 4x4 matrix matches brute-force', () => {
    const matrix = [
      [1, 0, 1, 0],
      [0, 1, 0, 1],
      [1, 1, 0, 0],
      [0, 0, 1, 1]
    ]
    const res = computeRookPolynomial(matrix)
    const bf = bruteForceRookPolynomial(matrix)
    assertArraysEqual(res.coefficientsNumeric, bf, 'DP output must match brute-force exactly')
  })

  // 13. Input Immutability
  test('Input Immutability: computeRookPolynomial does NOT mutate original matrix', () => {
    const original = [
      [1, 0, 1],
      [0, 1, 0],
      [1, 1, 0]
    ]
    const snapshot = JSON.stringify(original)
    computeRookPolynomial(original)
    assert(JSON.stringify(original) === snapshot, 'Original matrix must remain strictly unchanged')
  })

  // 14. Error Handling: Missing / null / empty matrix
  test('Validation: Rejects missing, null, or non-array matrix', () => {
    const resNull = computeRookPolynomial(null)
    assert(resNull.success === false, 'Null matrix must return success: false')
    assert(resNull.error.includes('valid non-empty array'), 'Expected error message')

    const resEmpty = computeRookPolynomial([])
    assert(resEmpty.success === false, 'Empty matrix must return success: false')

    const resEmptyRow = computeRookPolynomial([[]])
    assert(resEmptyRow.success === false, 'Empty row matrix must return success: false')
  })

  // 15. Error Handling: Unequal row lengths
  test('Validation: Rejects matrix with unequal row lengths', () => {
    const jagged = [
      [1, 0, 1],
      [0, 1] // row 1 has 2 elements instead of 3
    ]
    const res = computeRookPolynomial(jagged)
    assert(res.success === false, 'Jagged matrix must fail')
    assert(res.error.includes('Unequal row lengths'), 'Expected unequal row lengths error')
  })

  // 16. Error Handling: Non-binary cell values
  test('Validation: Rejects non-binary cell values', () => {
    const nonBinary = [
      [1, 0],
      [0, 2] // 2 is not 0 or 1
    ]
    const res = computeRookPolynomial(nonBinary)
    assert(res.success === false, 'Value 2 must fail')
    assert(res.error.includes('strictly 0 or 1'), 'Expected strictly 0 or 1 error')

    const stringCell = [
      [1, '1'],
      [0, 0]
    ]
    const resStr = computeRookPolynomial(stringCell)
    assert(resStr.success === false, 'String cell must fail')
  })

  // 17. Placements Generator: Verifies generated rook placements are non-attacking
  test('Placements: Generated visual rook placements satisfy non-attacking constraints', () => {
    const matrix = [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1]
    ]
    const placements = generateRookPlacements(matrix, 3, 10)
    assert(Array.isArray(placements[2]), 'Must have degree 2 placements')
    assert(placements[2].length > 0, 'Must have at least one degree 2 placement')

    // Verify each 2-rook placement is valid
    for (const config of placements[2]) {
      assert(config.length === 2, 'Config must have 2 rooks')
      const [r1, r2] = config
      assert(r1.row !== r2.row, `Rooks share row: (${r1.row}, ${r1.col}) and (${r2.row}, ${r2.col})`)
      assert(r1.col !== r2.col, `Rooks share column: (${r1.row}, ${r1.col}) and (${r2.row}, ${r2.col})`)
      assert(matrix[r1.row][r1.col] === 1, 'Rook must be placed on a forbidden cell')
      assert(matrix[r2.row][r2.col] === 1, 'Rook must be placed on a forbidden cell')
    }
  })

  // 18. BigInt Precision: Validates 4x4 fully forbidden board
  test('Combinatorics: Fully forbidden 4x4 yields [1, 16, 72, 96, 24]', () => {
    // For n x n fully forbidden board: r_k = C(n, k)^2 * k!
    // r_0 = 1
    // r_1 = 4^2 * 1 = 16
    // r_2 = 6^2 * 2 = 72
    // r_3 = 4^2 * 6 = 96
    // r_4 = 1^2 * 24 = 24
    const fullyForbidden4x4 = Array.from({ length: 4 }, () => Array(4).fill(1))
    const res = computeRookPolynomial(fullyForbidden4x4)
    assertArraysEqual(res.coefficientsNumeric, [1, 16, 72, 96, 24], '4x4 fully forbidden board must match combinatorics')
    assert(res.degree === 4, 'Degree must be 4')
  })

  console.log(`\nRook Polynomial Test Results: ${results.filter((r) => r.passed).length}/${results.length} passed`)
  return results
}

// Execute immediately if run directly in Node
if (typeof process !== 'undefined' && process.argv[1]?.includes('rookPolynomialService.test.js')) {
  runRookPolynomialTests()
}
