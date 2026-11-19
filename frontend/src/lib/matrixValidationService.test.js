/**
 * matrixValidationService.test.js
 * Comprehensive automated unit test suite verifying Matrix Validation Engine (Phase 10).
 * Covers Categories A through F, operational compatibility checks, and validation immutability.
 */

import {
  matrixValidationService,
  checkAircraftCompatibility,
  checkTerminalCompatibility,
  checkGateTypeCompatibility,
  checkGateMaintenance,
  checkCapacityCompatibility
} from './matrixValidationService.js'

// Mock Registered Flights with rich operational properties
const mockFlights = [
  {
    id: 'FL-001',
    flightNumber: 'AI101',
    airline: 'Air India',
    aircraftType: 'Wide-Body (B777)',
    passengerCapacity: 342,
    terminal: 'T2',
    isInternational: true
  },
  {
    id: 'FL-002',
    flightNumber: 'UK202',
    airline: 'Vistara',
    aircraftType: 'Narrow-Body (A320)',
    passengerCapacity: 164,
    terminal: 'T2',
    isInternational: false
  },
  {
    id: 'FL-003',
    flightNumber: '6E303',
    airline: 'IndiGo',
    aircraftType: 'Narrow-Body (A321)',
    passengerCapacity: 222,
    terminal: 'T1',
    isInternational: false
  },
  {
    id: 'FL-004',
    flightNumber: 'SG404',
    airline: 'SpiceJet',
    aircraftType: 'Narrow-Body (B737)',
    passengerCapacity: 189,
    terminal: 'T1',
    isInternational: false
  },
  {
    id: 'FL-005',
    flightNumber: 'AI505',
    airline: 'Air India',
    aircraftType: 'Wide-Body (A350)',
    passengerCapacity: 316,
    terminal: 'T2',
    isInternational: true
  },
  {
    id: 'FL-006',
    flightNumber: 'UK606',
    airline: 'Vistara',
    aircraftType: 'Narrow-Body (A320)',
    passengerCapacity: 164,
    terminal: 'T2',
    isInternational: false
  }
]

// Mock Registered Gates with rich operational properties
const mockGates = [
  {
    id: 'GT-001',
    gateNumber: 'G1',
    terminal: 'T1',
    gateType: 'Domestic',
    supportedAircraft: 'Narrow-Body Only',
    maxCapacity: 230,
    status: 'Available'
  },
  {
    id: 'GT-002',
    gateNumber: 'G2',
    terminal: 'T1',
    gateType: 'Domestic',
    supportedAircraft: 'Narrow-Body Only',
    maxCapacity: 230,
    status: 'Available'
  },
  {
    id: 'GT-003',
    gateNumber: 'G3',
    terminal: 'T2',
    gateType: 'Universal',
    supportedAircraft: 'All Categories (Narrow & Wide)',
    maxCapacity: 450,
    status: 'Available'
  },
  {
    id: 'GT-004',
    gateNumber: 'G4',
    terminal: 'T2',
    gateType: 'Universal',
    supportedAircraft: 'All Categories (Narrow & Wide)',
    maxCapacity: 450,
    status: 'Available'
  },
  {
    id: 'GT-005',
    gateNumber: 'G5',
    terminal: 'T2',
    gateType: 'International',
    supportedAircraft: 'Wide-Body Only',
    maxCapacity: 500,
    status: 'Occupied'
  },
  {
    id: 'GT-006',
    gateNumber: 'G6',
    terminal: 'T2',
    gateType: 'Universal',
    supportedAircraft: 'All Categories (Narrow & Wide)',
    maxCapacity: 450,
    status: 'Maintenance'
  }
]

export const runMatrixValidationTests = () => {
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

  console.log('--- Running Matrix Validation Engine Unit Tests (Phase 10) ---')

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
    assert(res.categories.structural.status === 'PASSED', 'Structural category should pass')
    assert(res.categories.binary.status === 'PASSED', 'Binary category should pass')
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
    assert(res.errors.some((e) => e.code === 'UNEQUAL_DIMENSIONS'), 'Missing UNEQUAL_DIMENSIONS error')
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
    assert(res.errors.some((e) => e.code === 'UNEQUAL_DIMENSIONS'), 'Missing UNEQUAL_DIMENSIONS error')
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
    assert(res.errors.some((e) => e.code === 'EMPTY_OR_MALFORMED_MATRIX'), 'Missing EMPTY_OR_MALFORMED_MATRIX error')
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
    assert(res.errors.some((e) => e.code === 'ROW_COUNT_MISMATCH'), 'Missing ROW_COUNT_MISMATCH')
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
    assert(res.errors.some((e) => e.code === 'COLUMN_COUNT_MISMATCH'), 'Missing COLUMN_COUNT_MISMATCH')
  })

  // 8. Invalid binary values
  test('Scenario 8: Non-binary cell values rejected with exact row/col coordinates', () => {
    const sim = {
      id: 'SIM-001',
      selectedFlightIds: ['FL-001', 'FL-002'],
      selectedGateIds: ['GT-001', 'GT-002']
    }
    const matrix = [
      [0, 2], // 2 is not 0 or 1 at (0, 1)
      [0, null] // null is invalid at (1, 1)
    ]
    const res = matrixValidationService.validateMatrix(sim, matrix, mockFlights, mockGates)
    assert(res.isValid === false, 'Non-binary values must fail')
    const binErrors = res.errors.filter((e) => e.code === 'INVALID_BINARY_VALUE')
    assert(binErrors.length === 2, 'Expected 2 invalid value errors')
    assert(binErrors[0].row === 0 && binErrors[0].col === 1, 'First error at (0, 1)')
    assert(binErrors[1].row === 1 && binErrors[1].col === 1, 'Second error at (1, 1)')
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
    assert(res.errors.some((e) => e.code === 'DUPLICATE_FLIGHT_REFERENCES'), 'Missing DUPLICATE_FLIGHT_REFERENCES')
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
    assert(res.errors.some((e) => e.code === 'DUPLICATE_GATE_REFERENCES'), 'Missing DUPLICATE_GATE_REFERENCES')
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
    assert(res.errors.some((e) => e.code === 'DELETED_FLIGHT_REFERENCES'), 'Missing DELETED_FLIGHT_REFERENCES')
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
    assert(res.errors.some((e) => e.code === 'DELETED_GATE_REFERENCES'), 'Missing DELETED_GATE_REFERENCES')
  })

  // 13. Missing simulation
  test('Scenario 13: Null simulation scenario rejected', () => {
    const res = matrixValidationService.validateMatrix(null, [[0]], mockFlights, mockGates)
    assert(res.isValid === false, 'Null simulation must fail')
    assert(res.errors.some((e) => e.code === 'MISSING_SIMULATION'), 'Missing MISSING_SIMULATION')
  })

  // 14. Matrix dimensions inconsistent with simulation count
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
    assert(res.errors.some((e) => e.code === 'ROW_COUNT_MISMATCH'), 'Missing ROW_COUNT_MISMATCH')
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
    assert(res.warnings.some((w) => w.code === 'ZERO_RESTRICTIONS'), 'Expected ZERO_RESTRICTIONS warning')
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
    assert(res.warnings.some((w) => w.code === 'ALL_FORBIDDEN'), 'Expected ALL_FORBIDDEN warning')
  })

  // 17. Category E: Aircraft Compatibility Check
  test('Scenario 17: Operational check detects Wide-Body flight at Narrow-Body gate', () => {
    const flight = mockFlights.find((f) => f.id === 'FL-001') // Wide-Body B777
    const gate = mockGates.find((g) => g.id === 'GT-001') // Narrow-Body Only
    const check = checkAircraftCompatibility(flight, gate)
    assert(check.compatible === false, 'Wide-body must be incompatible with narrow-body gate')
    assert(check.reason.includes('Wide-Body'), 'Reason must mention Wide-Body')
  })

  // 18. Category E: Terminal Compatibility Check
  test('Scenario 18: Operational check detects terminal routing mismatch', () => {
    const flight = mockFlights.find((f) => f.id === 'FL-003') // T1
    const gate = mockGates.find((g) => g.id === 'GT-003') // T2
    const check = checkTerminalCompatibility(flight, gate)
    assert(check.compatible === false, 'T1 flight at T2 gate must be incompatible')
    assert(check.reason.includes('Terminal mismatch'), 'Reason must specify terminal mismatch')
  })

  // 19. Category E: Gate Maintenance Status Check
  test('Scenario 19: Operational check detects gate under maintenance', () => {
    const gate = mockGates.find((g) => g.id === 'GT-006') // Status: Maintenance
    const check = checkGateMaintenance(gate)
    assert(check.compatible === false, 'Maintenance gate must be incompatible')
    assert(check.reason.includes('Maintenance'), 'Reason must mention Maintenance')
  })

  // 20. Category E: Capacity Mismatch Check
  test('Scenario 20: Operational check detects passenger capacity overflow', () => {
    const flight = mockFlights.find((f) => f.id === 'FL-001') // 342 pax
    const gate = mockGates.find((g) => g.id === 'GT-001') // maxCapacity: 230 pax
    const check = checkCapacityCompatibility(flight, gate)
    assert(check.compatible === false, '342 pax exceeding 230 capacity must be incompatible')
    assert(check.reason.includes('Capacity overflow'), 'Reason must specify capacity overflow')
  })

  // 21. Category E: Incompatibility Permitted in Matrix triggers Warning
  test('Scenario 21: Incompatibility permitted in matrix (b_ij = 0) flags operational warning', () => {
    const sim = {
      id: 'SIM-TEST-OP',
      selectedFlightIds: ['FL-001', 'FL-002'], // FL-001 is Wide-body
      selectedGateIds: ['GT-001', 'GT-003'] // GT-001 is Narrow-body
    }
    // Cell (0, 0) permits FL-001 at GT-001
    const matrix = [
      [0, 0],
      [0, 0]
    ]
    const res = matrixValidationService.validateMatrix(sim, matrix, mockFlights, mockGates)
    assert(res.incompatibilityCount > 0, 'Must record operational incompatibilities')
    assert(
      res.warnings.some((w) => w.code === 'AIRCRAFT_INCOMPATIBILITY_PERMITTED'),
      'Must warn that aircraft incompatibility is permitted in cell (0, 0)'
    )
  })

  // 22. Immutability: Validation does not mutate input matrix
  test('Scenario 22: Validation service guarantees input matrix immutability', () => {
    const sim = {
      id: 'SIM-IMMUTABLE',
      selectedFlightIds: ['FL-001', 'FL-002'],
      selectedGateIds: ['GT-001', 'GT-002']
    }
    const matrix = [
      [0, 1],
      [1, 0]
    ]
    const cloneBefore = JSON.stringify(matrix)
    matrixValidationService.validateMatrix(sim, matrix, mockFlights, mockGates)
    const cloneAfter = JSON.stringify(matrix)
    assert(cloneBefore === cloneAfter, 'Matrix must remain strictly unchanged after validation')
  })

  // 23. Categories A through F Status Reporting
  test('Scenario 23: All 6 categories report individual status and check counts', () => {
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
    const expectedCategories = ['structural', 'binary', 'flightRefs', 'gateRefs', 'operational', 'dimensions']
    for (const catKey of expectedCategories) {
      assert(res.categories[catKey] !== undefined, `Category ${catKey} must be present in report`)
      assert(typeof res.categories[catKey].status === 'string', `Category ${catKey} must have status`)
      assert(res.categories[catKey].total > 0, `Category ${catKey} must have recorded checks`)
    }
  })

  // 24. Flight Type Classification: Missing explicit field is marked unavailable/informational without false warnings
  test('Scenario 24: Missing explicit flightType is marked unavailable/informational and does not invent classifications', () => {
    const flightWithoutType = {
      id: 'FL-NOTYPE-1',
      flightNumber: 'AI999',
      aircraftType: 'Wide-Body (B777)', // Previous implementation guessed international from B777
      passengerCapacity: 300,
      terminal: 'T1'
      // No flightType or isInternational provided
    }
    const domesticGate = {
      id: 'GT-DOM-1',
      gateNumber: 'G1',
      gateType: 'Domestic',
      terminal: 'T1',
      supportedAircraft: 'All Categories'
    }

    const check = checkGateTypeCompatibility(flightWithoutType, domesticGate)
    assert(check.compatible === true, 'Must not assume incompatible when flightType is missing')
    assert(check.status === 'UNAVAILABLE', 'Must mark check as UNAVAILABLE')
    assert(check.informational === true, 'Must be flagged as informational')
    assert(check.missingField === 'flightType', 'Must identify missingField as flightType')

    // Validate scenario with missing flightType: should NOT trigger FLIGHT_TYPE_MISMATCH warning
    const sim = {
      id: 'SIM-TEST-TYPE',
      selectedFlightIds: ['FL-NOTYPE-1'],
      selectedGateIds: ['GT-DOM-1']
    }
    const res = matrixValidationService.validateMatrix(sim, [[0]], [flightWithoutType], [domesticGate])
    assert(!res.warnings.some((w) => w.code === 'FLIGHT_TYPE_MISMATCH_PERMITTED'), 'Must not generate false operational warning')
  })

  // 25. Flight Type Classification: Explicit flight types are validated accurately
  test('Scenario 25: Explicit flightType/isInternational is strictly validated against gateType', () => {
    const intlFlight = {
      id: 'FL-INTL-1',
      flightNumber: 'AI101',
      flightType: 'International',
      terminal: 'T2'
    }
    const domesticGate = {
      id: 'GT-DOM-1',
      gateNumber: 'G1',
      gateType: 'Domestic',
      terminal: 'T2'
    }
    const intlGate = {
      id: 'GT-INTL-1',
      gateNumber: 'G5',
      gateType: 'International',
      terminal: 'T2'
    }

    // International flight at domestic gate must fail compatibility
    const check1 = checkGateTypeCompatibility(intlFlight, domesticGate)
    assert(check1.compatible === false, 'International flight at Domestic gate must be incompatible')
    assert(check1.reason.includes('customs/immigration'), 'Reason must mention customs')

    // International flight at international gate must pass compatibility
    const check2 = checkGateTypeCompatibility(intlFlight, intlGate)
    assert(check2.compatible === true, 'International flight at International gate must be compatible')

    // Domestic flight at international gate must fail compatibility
    const domFlight = {
      id: 'FL-DOM-1',
      flightNumber: '6E303',
      flightType: 'Domestic',
      terminal: 'T2'
    }
    const check3 = checkGateTypeCompatibility(domFlight, intlGate)
    assert(check3.compatible === false, 'Domestic flight at sterile International gate must be incompatible')
  })

  // 26. Rectangular Matrix Mathematics: ZERO_RESTRICTIONS explains correct formula by dimensions
  test('Scenario 26: ZERO_RESTRICTIONS explains correct mathematics for square vs rectangular boards', () => {
    // 1. Square 2x2 board: reserves n!
    const squareSim = {
      id: 'SIM-SQ',
      selectedFlightIds: ['FL-001', 'FL-002'],
      selectedGateIds: ['GT-001', 'GT-002']
    }
    const squareRes = matrixValidationService.validateMatrix(squareSim, [[0, 0], [0, 0]], mockFlights, mockGates)
    const sqWarn = squareRes.warnings.find((w) => w.code === 'ZERO_RESTRICTIONS')
    assert(sqWarn, 'Square matrix must have ZERO_RESTRICTIONS warning')
    assert(sqWarn.message.includes('n! = 2! valid bijective allocations'), 'Square board message must explain n! = 2! bijective allocations')

    // 2. Rectangular 2x3 board (flights < gates): explains P(n, m) permutations
    const rectFewerFlightsSim = {
      id: 'SIM-RECT-1',
      selectedFlightIds: ['FL-001', 'FL-002'],
      selectedGateIds: ['GT-001', 'GT-002', 'GT-003']
    }
    const rect1Res = matrixValidationService.validateMatrix(
      rectFewerFlightsSim,
      [[0, 0, 0], [0, 0, 0]],
      mockFlights,
      mockGates,
      { allowUnbalanced: true }
    )
    const rect1Warn = rect1Res.warnings.find((w) => w.code === 'ZERO_RESTRICTIONS')
    assert(rect1Warn, 'Rectangular matrix must have ZERO_RESTRICTIONS warning')
    assert(rect1Warn.message.includes('P(3, 2) = 3! / (3 - 2)! injective gate assignments'), 'Rectangular flights < gates message must cite P(n,m)')
    assert(!rect1Warn.message.includes('allocations = n!'), 'Rectangular flights < gates must NOT claim n! allocations')

    // 3. Rectangular 3x2 board (flights > gates): explains injection impossibility
    const rectMoreFlightsSim = {
      id: 'SIM-RECT-2',
      selectedFlightIds: ['FL-001', 'FL-002', 'FL-003'],
      selectedGateIds: ['GT-001', 'GT-002']
    }
    const rect2Res = matrixValidationService.validateMatrix(
      rectMoreFlightsSim,
      [[0, 0], [0, 0], [0, 0]],
      mockFlights,
      mockGates,
      { allowUnbalanced: true }
    )
    const rect2Warn = rect2Res.warnings.find((w) => w.code === 'ZERO_RESTRICTIONS')
    assert(rect2Warn, 'Rectangular matrix must have ZERO_RESTRICTIONS warning')
    assert(rect2Warn.message.includes('no one-to-one simultaneous injection is possible'), 'Rectangular flights > gates must explain pigeonhole principle')
  })

  // 27. Matrix Row/Column Association matches scenario flight/gate order
  test('Scenario 27: Row/Column coordinates map precisely to selected scenario flight and gate IDs', () => {
    const sim = {
      id: 'SIM-ORDER-CHECK',
      selectedFlightIds: ['FL-002', 'FL-001'], // FL-002 is row 0, FL-001 is row 1
      selectedGateIds: ['GT-002', 'GT-001']    // GT-002 is col 0, GT-001 is col 1
    }
    // Set cell (row 1, col 0) to 1: FL-001 at GT-002 is forbidden
    const matrix = [
      [0, 0],
      [1, 0]
    ]
    const res = matrixValidationService.validateMatrix(sim, matrix, mockFlights, mockGates)
    // FL-001 is Wide-Body, GT-002 is Narrow-Body only.
    // Cell (row 1, col 0) has b_ij = 1, so the Wide-Body incompatibility is SATISFIED (forbidden),
    // and therefore should NOT flag AIRCRAFT_INCOMPATIBILITY_PERMITTED for (1, 0).
    const permittedIncomp = res.warnings.filter((w) => w.code === 'AIRCRAFT_INCOMPATIBILITY_PERMITTED')
    assert(!permittedIncomp.some((w) => w.row === 1 && w.col === 0), 'Forbidden cell [1,0] must not be flagged as permitted incompatibility')
  })

  console.log(`\nValidation Test Results: ${results.filter((r) => r.passed).length}/${results.length} passed`)
  return results
}

// Execute immediately if run directly in Node
if (typeof process !== 'undefined' && process.argv[1]?.includes('matrixValidationService.test.js')) {
  runMatrixValidationTests()
}
