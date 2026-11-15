/**
 * matrixValidationService.test.js
 * Automated unit test suite verifying all 16 specified validation scenarios.
 */

import { matrixValidationService } from './matrixValidationService.js'

// Mock Registered Flights
const mockFlights = [
  { id: 'FL-001', flightNumber: 'AI101' },
  { id: 'FL-002', flightNumber: 'UK202' },
  { id: 'FL-003', flightNumber: '6E303' },
  { id: 'FL-004', flightNumber: 'SG404' },
  { id: 'FL-005', flightNumber: 'AI505' },
  { id: 'FL-006', flightNumber: 'UK606' }
]

// Mock Registered Gates
const mockGates = [
  { id: 'GT-001', gateNumber: 'G1' },
  { id: 'GT-002', gateNumber: 'G2' },
  { id: 'GT-003', gateNumber: 'G3' },
  { id: 'GT-004', gateNumber: 'G4' },
  { id: 'GT-005', gateNumber: 'G5' },
  { id: 'GT-006', gateNumber: 'G6' }
]

export const runMatrixValidationTests = () => {
  const results = []

  const test = (name, fn) => {
    try {
      fn()
      results.push({ name, passed: true })
    } catch (err) {
      results.push({ name, passed: false, error: err.message })
    }
  }

  const assert = (condition, msg) => {
    if (!condition) throw new Error(msg || 'Assertion failed')
  }

  // 1. Valid 6x6 matrix
  test('Scenario 1: Valid 6x6 matrix passes validation', () => {
    const sim = {
      id: 'SIM-001',
      selectedFlightIds: ['FL-001', 'FL-002', 'FL-003', 'FL-004', 'FL-005', 'FL-006'],
      selectedGateIds: ['GT-001', 'GT-002', 'GT-003', 'GT-004', 'GT-005', 'GT-006']
    }
    const matrix = [
      [0, 1, 0, 0, 0, 0],
      [0, 0, 0, 1, 0, 0],
      [0, 0, 0, 0, 1, 0],
      [1, 0, 0, 0, 0, 0],
      [0, 0, 1, 0, 0, 0],
      [0, 0, 0, 0, 0, 0]
    ]
    const res = matrixValidationService.validateMatrix(sim, matrix, mockFlights, mockGates)
    assert(res.isValid === true, 'Expected valid 6x6 matrix to pass')
    assert(res.isSquare === true, 'Expected isSquare to be true')
    assert(res.flightCount === 6 && res.gateCount === 6, 'Expected 6x6 count')
    assert(res.forbiddenCells === 5, 'Expected 5 forbidden cells')
    assert(res.errors.length === 0, 'Expected 0 errors')
  })

  // 2. Valid 3x3 matrix
  test('Scenario 2: Valid 3x3 matrix passes validation', () => {
    const sim = {
      id: 'SIM-002',
      selectedFlightIds: ['FL-001', 'FL-002', 'FL-003'],
      selectedGateIds: ['GT-001', 'GT-002', 'GT-003']
    }
    const matrix = [
      [0, 1, 0],
      [0, 0, 1],
      [1, 0, 0]
    ]
    const res = matrixValidationService.validateMatrix(sim, matrix, mockFlights, mockGates)
    assert(res.isValid === true, 'Expected valid 3x3 to pass')
    assert(res.isSquare === true, 'Expected isSquare true')
    assert(res.totalCells === 9, 'Expected 9 cells')
  })

  // 3. Unequal 6x4 matrix
  test('Scenario 3: Unequal 6x4 matrix flagged as invalid dimensions', () => {
    const sim = {
      id: 'SIM-UNEQUAL-1',
      selectedFlightIds: ['FL-001', 'FL-002', 'FL-003', 'FL-004', 'FL-005', 'FL-006'],
      selectedGateIds: ['GT-001', 'GT-002', 'GT-003', 'GT-004']
    }
    const matrix = Array.from({ length: 6 }, () => [0, 0, 0, 0])
    const res = matrixValidationService.validateMatrix(sim, matrix, mockFlights, mockGates)
    assert(res.isValid === false, 'Expected 6x4 matrix to be invalid')
    assert(res.isSquare === false, 'Expected isSquare false')
    assert(res.errors.some(e => e.code === 'UNEQUAL_DIMENSIONS'), 'Missing UNEQUAL_DIMENSIONS error')
  })

  // 4. Unequal 4x6 matrix
  test('Scenario 4: Unequal 4x6 matrix flagged as invalid dimensions', () => {
    const sim = {
      id: 'SIM-UNEQUAL-2',
      selectedFlightIds: ['FL-001', 'FL-002', 'FL-003', 'FL-004'],
      selectedGateIds: ['GT-001', 'GT-002', 'GT-003', 'GT-004', 'GT-005', 'GT-006']
    }
    const matrix = Array.from({ length: 4 }, () => [0, 0, 0, 0, 0, 0])
    const res = matrixValidationService.validateMatrix(sim, matrix, mockFlights, mockGates)
    assert(res.isValid === false, 'Expected 4x6 matrix to be invalid')
    assert(res.isSquare === false, 'Expected isSquare false')
    assert(res.errors.some(e => e.code === 'UNEQUAL_DIMENSIONS'), 'Missing UNEQUAL_DIMENSIONS error')
  })

  // 5. Empty matrix
  test('Scenario 5: Empty matrix rejected', () => {
    const sim = {
      id: 'SIM-001',
      selectedFlightIds: ['FL-001'],
      selectedGateIds: ['GT-001']
    }
    const res = matrixValidationService.validateMatrix(sim, [], mockFlights, mockGates)
    assert(res.isValid === false, 'Empty matrix must fail')
    assert(res.errors.some(e => e.code === 'EMPTY_OR_MALFORMED_MATRIX'), 'Missing EMPTY_OR_MALFORMED_MATRIX error')
  })

  // 6. Missing matrix rows
  test('Scenario 6: Missing matrix rows detected', () => {
    const sim = {
      id: 'SIM-001',
      selectedFlightIds: ['FL-001', 'FL-002', 'FL-003'],
      selectedGateIds: ['GT-001', 'GT-002', 'GT-003']
    }
    const matrix = [
      [0, 0, 0],
      [0, 0, 0] // 2 rows instead of 3
    ]
    const res = matrixValidationService.validateMatrix(sim, matrix, mockFlights, mockGates)
    assert(res.isValid === false, 'Row mismatch must fail')
    assert(res.errors.some(e => e.code === 'ROW_COUNT_MISMATCH'), 'Missing ROW_COUNT_MISMATCH')
  })

  // 7. Missing matrix cells in row
  test('Scenario 7: Row with missing cells detected', () => {
    const sim = {
      id: 'SIM-001',
      selectedFlightIds: ['FL-001', 'FL-002'],
      selectedGateIds: ['GT-001', 'GT-002']
    }
    const matrix = [
      [0, 0],
      [0] // Only 1 cell instead of 2
    ]
    const res = matrixValidationService.validateMatrix(sim, matrix, mockFlights, mockGates)
    assert(res.isValid === false, 'Cell length mismatch must fail')
    assert(res.errors.some(e => e.code === 'COLUMN_COUNT_MISMATCH'), 'Missing COLUMN_COUNT_MISMATCH')
  })

  // 8. Invalid binary values
  test('Scenario 8: Non-binary cell values rejected', () => {
    const sim = {
      id: 'SIM-001',
      selectedFlightIds: ['FL-001', 'FL-002'],
      selectedGateIds: ['GT-001', 'GT-002']
    }
    const matrix = [
      [0, 2], // 2 is not 0 or 1
      [0, null] // null is invalid
    ]
    const res = matrixValidationService.validateMatrix(sim, matrix, mockFlights, mockGates)
    assert(res.isValid === false, 'Non-binary values must fail')
    assert(res.errors.filter(e => e.code === 'INVALID_BINARY_VALUE').length === 2, 'Expected 2 invalid value errors')
  })

  // 9. Duplicate flight references
  test('Scenario 9: Duplicate flight references detected', () => {
    const sim = {
      id: 'SIM-001',
      selectedFlightIds: ['FL-001', 'FL-001', 'FL-002'],
      selectedGateIds: ['GT-001', 'GT-002', 'GT-003']
    }
    const matrix = Array.from({ length: 3 }, () => [0, 0, 0])
    const res = matrixValidationService.validateMatrix(sim, matrix, mockFlights, mockGates)
    assert(res.isValid === false, 'Duplicate flights must fail')
    assert(res.errors.some(e => e.code === 'DUPLICATE_FLIGHT_REFERENCES'), 'Missing DUPLICATE_FLIGHT_REFERENCES')
  })

  // 10. Duplicate gate references
  test('Scenario 10: Duplicate gate references detected', () => {
    const sim = {
      id: 'SIM-001',
      selectedFlightIds: ['FL-001', 'FL-002', 'FL-003'],
      selectedGateIds: ['GT-001', 'GT-001', 'GT-002']
    }
    const matrix = Array.from({ length: 3 }, () => [0, 0, 0])
    const res = matrixValidationService.validateMatrix(sim, matrix, mockFlights, mockGates)
    assert(res.isValid === false, 'Duplicate gates must fail')
    assert(res.errors.some(e => e.code === 'DUPLICATE_GATE_REFERENCES'), 'Missing DUPLICATE_GATE_REFERENCES')
  })

  // 11. Deleted flight reference
  test('Scenario 11: Deleted/unregistered flight reference detected', () => {
    const sim = {
      id: 'SIM-001',
      selectedFlightIds: ['FL-001', 'FL-GHOST-999'],
      selectedGateIds: ['GT-001', 'GT-002']
    }
    const matrix = [
      [0, 0],
      [0, 0]
    ]
    const res = matrixValidationService.validateMatrix(sim, matrix, mockFlights, mockGates)
    assert(res.isValid === false, 'Deleted flight reference must fail')
    assert(res.errors.some(e => e.code === 'DELETED_FLIGHT_REFERENCES'), 'Missing DELETED_FLIGHT_REFERENCES')
  })

  // 12. Deleted gate reference
  test('Scenario 12: Deleted/unregistered gate reference detected', () => {
    const sim = {
      id: 'SIM-001',
      selectedFlightIds: ['FL-001', 'FL-002'],
      selectedGateIds: ['GT-001', 'GT-GHOST-999']
    }
    const matrix = [
      [0, 0],
      [0, 0]
    ]
    const res = matrixValidationService.validateMatrix(sim, matrix, mockFlights, mockGates)
    assert(res.isValid === false, 'Deleted gate reference must fail')
    assert(res.errors.some(e => e.code === 'DELETED_GATE_REFERENCES'), 'Missing DELETED_GATE_REFERENCES')
  })

  // 13. Missing simulation
  test('Scenario 13: Null simulation scenario rejected', () => {
    const res = matrixValidationService.validateMatrix(null, [[0]], mockFlights, mockGates)
    assert(res.isValid === false, 'Null simulation must fail')
    assert(res.errors.some(e => e.code === 'MISSING_SIMULATION'), 'Missing MISSING_SIMULATION')
  })

  // 14. Matrix dimensions inconsistent with simulation references
  test('Scenario 14: Matrix dimensions inconsistent with simulation count', () => {
    const sim = {
      id: 'SIM-001',
      selectedFlightIds: ['FL-001', 'FL-002', 'FL-003'],
      selectedGateIds: ['GT-001', 'GT-002', 'GT-003']
    }
    const matrix = [
      [0, 0] // 1 row, 2 cols instead of 3x3
    ]
    const res = matrixValidationService.validateMatrix(sim, matrix, mockFlights, mockGates)
    assert(res.isValid === false, 'Inconsistent matrix must fail')
    assert(res.errors.some(e => e.code === 'ROW_COUNT_MISMATCH'), 'Missing ROW_COUNT_MISMATCH')
  })

  // 15. Matrix containing zero forbidden cells (all allowed)
  test('Scenario 15: Matrix with zero restrictions is structurally VALID with warning', () => {
    const sim = {
      id: 'SIM-001',
      selectedFlightIds: ['FL-001', 'FL-002'],
      selectedGateIds: ['GT-001', 'GT-002']
    }
    const matrix = [
      [0, 0],
      [0, 0]
    ]
    const res = matrixValidationService.validateMatrix(sim, matrix, mockFlights, mockGates)
    assert(res.isValid === true, 'Zero restrictions should be structurally valid')
    assert(res.forbiddenCells === 0, '0 forbidden cells')
    assert(res.warnings.some(w => w.code === 'ZERO_RESTRICTIONS'), 'Expected ZERO_RESTRICTIONS warning')
  })

  // 16. Matrix containing all forbidden cells (all 1s)
  test('Scenario 16: Matrix with all forbidden cells is structurally VALID with warning', () => {
    const sim = {
      id: 'SIM-001',
      selectedFlightIds: ['FL-001', 'FL-002'],
      selectedGateIds: ['GT-001', 'GT-002']
    }
    const matrix = [
      [1, 1],
      [1, 1]
    ]
    const res = matrixValidationService.validateMatrix(sim, matrix, mockFlights, mockGates)
    assert(res.isValid === true, 'All forbidden cells should be structurally valid')
    assert(res.forbiddenCells === 4, '4 forbidden cells')
    assert(res.warnings.some(w => w.code === 'ALL_FORBIDDEN'), 'Expected ALL_FORBIDDEN warning')
  })

  return results
}

export default runMatrixValidationTests
