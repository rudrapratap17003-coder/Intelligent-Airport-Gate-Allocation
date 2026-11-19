/**
 * Matrix Validation Engine (Phase 10 — Restriction Matrix Validation)
 * Dedicated service layer validating restriction matrices against:
 * - Category A: Structural Integrity
 * - Category B: Binary Value Integrity
 * - Category C: Flight Reference Integrity
 * - Category D: Gate Reference Integrity
 * - Category E: Operational Compatibility
 * - Category F: Matrix Dimension Consistency
 *
 * Rule: Validation does NOT automatically mutate or modify matrix values.
 */

// Aircraft category normalization helper
export const normalizeAircraftCategory = (typeStr) => {
  if (!typeStr || typeof typeStr !== 'string') return 'Unknown'
  const lower = typeStr.toLowerCase()
  if (lower.includes('wide') || lower.includes('b777') || lower.includes('a350') || lower.includes('b787') || lower.includes('a380')) {
    return 'Wide-Body'
  }
  if (lower.includes('narrow') || lower.includes('a320') || lower.includes('a321') || lower.includes('b737') || lower.includes('atr')) {
    return 'Narrow-Body'
  }
  return typeStr
}

// Gate aircraft compatibility check
export const checkAircraftCompatibility = (flight, gate) => {
  const flightCategory = normalizeAircraftCategory(flight?.aircraftType || flight?.aircraft_type)
  const gateSupported = gate?.supportedAircraftCategories || gate?.supportedAircraft || gate?.supported_aircraft

  if (!gateSupported) return { compatible: true }

  const gateStr = Array.isArray(gateSupported) ? gateSupported.join(' ') : String(gateSupported)
  const lowerGate = gateStr.toLowerCase()

  if (lowerGate.includes('all') || (lowerGate.includes('narrow') && lowerGate.includes('wide'))) {
    return { compatible: true }
  }

  if (flightCategory === 'Wide-Body' && lowerGate.includes('narrow') && !lowerGate.includes('wide')) {
    return {
      compatible: false,
      reason: `Wide-Body aircraft (${flight?.aircraftType || 'Wide-Body'}) cannot dock at Narrow-Body only Gate ${gate?.gateNumber || gate?.id}.`
    }
  }

  if (flightCategory === 'Narrow-Body' && lowerGate.includes('wide') && !lowerGate.includes('narrow')) {
    return {
      compatible: false,
      reason: `Narrow-Body aircraft (${flight?.aircraftType || 'Narrow-Body'}) inefficient/restricted at Wide-Body only Gate ${gate?.gateNumber || gate?.id}.`
    }
  }

  return { compatible: true }
}

// Terminal compatibility check
export const checkTerminalCompatibility = (flight, gate) => {
  const fTerm = (flight?.terminal || '').trim().toUpperCase()
  const gTerm = (gate?.terminal || '').trim().toUpperCase()

  if (!fTerm || !gTerm) return { compatible: true }

  if (fTerm !== gTerm) {
    return {
      compatible: false,
      reason: `Terminal mismatch: Flight scheduled for Terminal ${fTerm}, but Gate ${gate?.gateNumber || gate?.id} is located in Terminal ${gTerm}.`
    }
  }
  return { compatible: true }
}

// Gate type (Domestic / International / Universal) compatibility
export const checkGateTypeCompatibility = (flight, gate) => {
  const gateType = (gate?.gateType || gate?.gate_type || 'Universal').trim().toLowerCase()
  if (gateType === 'universal' || gateType === 'all') return { compatible: true }

  // Check for explicit flight type definition in the flight schema
  const explicitType = (flight?.flightType || flight?.flight_type || '').trim().toLowerCase()
  const hasExplicitBoolean = typeof flight?.isInternational === 'boolean'

  if (!explicitType && !hasExplicitBoolean) {
    return {
      compatible: true,
      status: 'UNAVAILABLE',
      informational: true,
      missingField: 'flightType',
      reason: `Flight classification (Domestic/International) is not explicitly defined in the flight schema for ${flight?.flightNumber || flight?.id}. Check marked as unavailable to avoid speculative assumptions.`
    }
  }

  const isIntl = hasExplicitBoolean ? flight.isInternational : explicitType === 'international'
  const isDom = hasExplicitBoolean ? !flight.isInternational : explicitType === 'domestic'

  if (isIntl && gateType === 'domestic') {
    return {
      compatible: false,
      reason: `International flight (${flight?.flightNumber || flight?.id}) requires customs/immigration cordon; Gate ${gate?.gateNumber || gate?.id} is Domestic-only.`
    }
  }

  if (isDom && gateType === 'international') {
    return {
      compatible: false,
      reason: `Domestic flight (${flight?.flightNumber || flight?.id}) cannot dock at sterile International Gate ${gate?.gateNumber || gate?.id}.`
    }
  }

  return { compatible: true }
}

// Gate maintenance check
export const checkGateMaintenance = (gate) => {
  const status = (gate?.status || 'Available').trim().toLowerCase()
  if (status === 'maintenance') {
    return {
      compatible: false,
      reason: `Gate ${gate?.gateNumber || gate?.id} is currently under Maintenance and physically unavailable.`
    }
  }
  return { compatible: true }
}

// Gate availability check
export const checkGateAvailability = (gate) => {
  const status = (gate?.status || 'Available').trim().toLowerCase()
  if (status === 'occupied') {
    return {
      compatible: false,
      reason: `Gate ${gate?.gateNumber || gate?.id} is marked as Occupied by another active turnaround.`
    }
  }
  return { compatible: true }
}

// Passenger capacity check
export const checkCapacityCompatibility = (flight, gate) => {
  const paxCap = Number(flight?.passengerCapacity ?? flight?.passenger_capacity ?? 0)
  const gateCap = Number(gate?.maxCapacity ?? gate?.max_capacity ?? 0)

  if (paxCap > 0 && gateCap > 0 && paxCap > gateCap) {
    return {
      compatible: false,
      reason: `Capacity overflow: Flight carries up to ${paxCap} passengers, exceeding Gate ${gate?.gateNumber || gate?.id} lounge capacity (${gateCap} pax).`
    }
  }
  return { compatible: true }
}

export const matrixValidationService = {
  /**
   * Performs comprehensive matrix validation across Categories A through F.
   *
   * @param {Object} simulation - Simulation scenario object
   * @param {Array<Array<number>>} matrix - 2D binary restriction matrix
   * @param {Array<Object>} allRegisteredFlights - Registered flight catalog
   * @param {Array<Object>} allRegisteredGates - Registered gate catalog
   * @param {Object} options - Configurable validation check flags
   * @returns {Object} Comprehensive validation report
   */
  validateMatrix: (
    simulation,
    matrix,
    allRegisteredFlights = [],
    allRegisteredGates = [],
    options = {}
  ) => {
    const opts = {
      checkAircraft: true,
      checkTerminal: true,
      checkGateType: true,
      checkMaintenance: true,
      checkAvailability: true,
      checkCapacity: true,
      allowUnbalanced: false,
      ...options
    }

    const errors = []
    const warnings = []
    const incompatibilities = []

    // Category tracking structures
    const categories = {
      structural: { status: 'PASSED', name: 'Structural Integrity', total: 0, passed: 0, errors: [], warnings: [] },
      binary: { status: 'PASSED', name: 'Binary Value Integrity', total: 0, passed: 0, errors: [], warnings: [] },
      flightRefs: { status: 'PASSED', name: 'Flight Reference Integrity', total: 0, passed: 0, errors: [], warnings: [] },
      gateRefs: { status: 'PASSED', name: 'Gate Reference Integrity', total: 0, passed: 0, errors: [], warnings: [] },
      operational: { status: 'PASSED', name: 'Operational Compatibility', total: 0, passed: 0, errors: [], warnings: [], incompatibilities: [] },
      dimensions: { status: 'PASSED', name: 'Matrix Dimension Consistency', total: 0, passed: 0, errors: [], warnings: [] }
    }

    const recordError = (catKey, code, message, extra = {}) => {
      const err = {
        category: categories[catKey]?.name || catKey,
        code,
        severity: 'error',
        message,
        ...extra
      }
      errors.push(err)
      categories[catKey].errors.push(err)
      categories[catKey].status = 'FAILED'
    }

    const recordWarning = (catKey, code, message, extra = {}) => {
      const warn = {
        category: categories[catKey]?.name || catKey,
        code,
        severity: 'warning',
        message,
        ...extra
      }
      warnings.push(warn)
      categories[catKey].warnings.push(warn)
      if (categories[catKey].status !== 'FAILED') {
        categories[catKey].status = 'WARNINGS'
      }
    }

    const recordCheck = (catKey, passed) => {
      categories[catKey].total++
      if (passed) {
        categories[catKey].passed++
      }
    }

    // ----------------------------------------------------
    // Category 0: Simulation Existence Check
    // ----------------------------------------------------
    if (!simulation) {
      recordCheck('structural', false)
      recordError('structural', 'MISSING_SIMULATION', 'No simulation scenario is currently selected or provided.')
      return {
        isValid: false,
        status: 'FAILED',
        totalChecks: 1,
        passedChecks: 0,
        errorCount: 1,
        warningCount: 0,
        incompatibilityCount: 0,
        flightCount: 0,
        gateCount: 0,
        totalCells: 0,
        allowedCells: 0,
        forbiddenCells: 0,
        densityPct: 0,
        isSquare: false,
        categories,
        errors,
        warnings,
        incompatibilities
      }
    }

    const selectedFlightIds = simulation.selectedFlightIds || simulation.selected_flight_ids || []
    const selectedGateIds = simulation.selectedGateIds || simulation.selected_gate_ids || []

    const flightCount = selectedFlightIds.length
    const gateCount = selectedGateIds.length
    const isSquare = flightCount === gateCount && flightCount > 0

    // ----------------------------------------------------
    // Category C: Flight Reference Integrity
    // ----------------------------------------------------
    const flightMap = new Map(allRegisteredFlights.map((f) => [f.id, f]))
    const seenFlightIds = new Set()
    const duplicateFlightIds = new Set()
    const missingFlightIds = []

    for (const fId of selectedFlightIds) {
      if (seenFlightIds.has(fId)) {
        duplicateFlightIds.add(fId)
      }
      seenFlightIds.add(fId)

      if (!flightMap.has(fId)) {
        missingFlightIds.push(fId)
      }
    }

    recordCheck('flightRefs', duplicateFlightIds.size === 0)
    if (duplicateFlightIds.size > 0) {
      recordError(
        'flightRefs',
        'DUPLICATE_FLIGHT_REFERENCES',
        `Scenario contains duplicate flight references: ${Array.from(duplicateFlightIds).join(', ')}.`
      )
    }

    recordCheck('flightRefs', missingFlightIds.length === 0)
    if (missingFlightIds.length > 0) {
      recordError(
        'flightRefs',
        'DELETED_FLIGHT_REFERENCES',
        `Scenario references ${missingFlightIds.length} flight record(s) that no longer exist in the registry: ${missingFlightIds.join(', ')}.`
      )
    }

    // ----------------------------------------------------
    // Category D: Gate Reference Integrity
    // ----------------------------------------------------
    const gateMap = new Map(allRegisteredGates.map((g) => [g.id, g]))
    const seenGateIds = new Set()
    const duplicateGateIds = new Set()
    const missingGateIds = []

    for (const gId of selectedGateIds) {
      if (seenGateIds.has(gId)) {
        duplicateGateIds.add(gId)
      }
      seenGateIds.add(gId)

      if (!gateMap.has(gId)) {
        missingGateIds.push(gId)
      }
    }

    recordCheck('gateRefs', duplicateGateIds.size === 0)
    if (duplicateGateIds.size > 0) {
      recordError(
        'gateRefs',
        'DUPLICATE_GATE_REFERENCES',
        `Scenario contains duplicate gate references: ${Array.from(duplicateGateIds).join(', ')}.`
      )
    }

    recordCheck('gateRefs', missingGateIds.length === 0)
    if (missingGateIds.length > 0) {
      recordError(
        'gateRefs',
        'DELETED_GATE_REFERENCES',
        `Scenario references ${missingGateIds.length} gate record(s) that no longer exist in the registry: ${missingGateIds.join(', ')}.`
      )
    }

    // ----------------------------------------------------
    // Category F: Matrix Dimension Consistency
    // ----------------------------------------------------
    recordCheck('dimensions', flightCount > 0)
    if (flightCount === 0) {
      recordError(
        'dimensions',
        'NO_FLIGHTS_SELECTED',
        'Scenario contains zero selected flights. At least 1 flight is required.'
      )
    }

    recordCheck('dimensions', gateCount > 0)
    if (gateCount === 0) {
      recordError(
        'dimensions',
        'NO_GATES_SELECTED',
        'Scenario contains zero selected gates. At least 1 gate is required.'
      )
    }

    recordCheck('dimensions', isSquare || opts.allowUnbalanced)
    if (flightCount > 0 && gateCount > 0 && !isSquare && !opts.allowUnbalanced) {
      recordError(
        'dimensions',
        'UNEQUAL_DIMENSIONS',
        `Bijective gate allocation requires equal dimensions (|Flights| = |Gates|). Current scenario has ${flightCount} flights and ${gateCount} gates (${flightCount} × ${gateCount}).`
      )
    }

    // ----------------------------------------------------
    // Category A & B: Structural & Binary Value Integrity
    // ----------------------------------------------------
    let totalCells = 0
    let allowedCells = 0
    let forbiddenCells = 0

    const isMatrixArray = matrix && Array.isArray(matrix) && matrix.length > 0
    recordCheck('structural', Boolean(isMatrixArray))

    if (!isMatrixArray) {
      recordError(
        'structural',
        'EMPTY_OR_MALFORMED_MATRIX',
        'The restriction matrix is empty or not formatted as a 2D array.'
      )
    } else {
      // Row count check
      const rowsMatch = matrix.length === flightCount
      recordCheck('structural', rowsMatch)
      if (!rowsMatch) {
        recordError(
          'structural',
          'ROW_COUNT_MISMATCH',
          `Matrix row count (${matrix.length}) does not match the scenario flight count (${flightCount}).`
        )
      }

      // Check each row and cell
      for (let r = 0; r < matrix.length; r++) {
        const row = matrix[r]
        const isRowArray = Array.isArray(row)
        recordCheck('structural', isRowArray)

        if (!isRowArray) {
          recordError('structural', 'INVALID_ROW_STRUCTURE', `Row index ${r} is not an array.`, { row: r })
          continue
        }

        const colsMatch = row.length === gateCount
        recordCheck('structural', colsMatch)
        if (!colsMatch) {
          recordError(
            'structural',
            'COLUMN_COUNT_MISMATCH',
            `Row ${r + 1} has ${row.length} cells, expected ${gateCount} (matching gates count).`,
            { row: r }
          )
        }

        for (let c = 0; c < row.length; c++) {
          const val = row[c]
          totalCells++

          recordCheck('binary', val === 0 || val === 1)

          if (val === 0) {
            allowedCells++
          } else if (val === 1) {
            forbiddenCells++
          } else {
            recordError(
              'binary',
              'INVALID_BINARY_VALUE',
              `Cell at row ${r + 1}, column ${c + 1} contains invalid value "${val}". Only binary 0 (Allowed) or 1 (Forbidden) are permitted.`,
              { row: r, col: c }
            )
          }
        }
      }
    }

    // Structural density edge condition warnings
    if (totalCells > 0 && forbiddenCells === 0) {
      let zeroRestrictionExplanation = ''
      if (flightCount === gateCount) {
        zeroRestrictionExplanation = `The matrix contains zero forbidden cells on a square ${flightCount} × ${gateCount} board. All assignments are unrestricted, yielding n! = ${flightCount}! valid bijective allocations.`
      } else if (flightCount < gateCount) {
        zeroRestrictionExplanation = `The matrix contains zero forbidden cells on a rectangular ${flightCount} × ${gateCount} board (${flightCount} flights, ${gateCount} gates). All pairings are unrestricted, yielding P(${gateCount}, ${flightCount}) = ${gateCount}! / (${gateCount} - ${flightCount})! injective gate assignments.`
      } else {
        zeroRestrictionExplanation = `The matrix contains zero forbidden cells on a rectangular ${flightCount} × ${gateCount} board. As flights (${flightCount}) exceed gates (${gateCount}), no one-to-one simultaneous injection is possible without time-sharing.`
      }

      recordWarning(
        'structural',
        'ZERO_RESTRICTIONS',
        zeroRestrictionExplanation
      )
    }

    if (totalCells > 0 && forbiddenCells === totalCells) {
      recordWarning(
        'structural',
        'ALL_FORBIDDEN',
        'Every assignment in this matrix is marked as forbidden (100% density). No valid flight-to-gate assignment is possible (N = 0).'
      )
    }

    // ----------------------------------------------------
    // Category E: Operational Compatibility Validation
    // ----------------------------------------------------
    // Evaluate operational properties between Flight i and Gate j
    if (isMatrixArray && flightCount > 0 && gateCount > 0) {
      for (let r = 0; r < Math.min(matrix.length, flightCount); r++) {
        const fId = selectedFlightIds[r]
        const flight = flightMap.get(fId)
        if (!flight) continue

        const row = matrix[r] || []

        for (let c = 0; c < Math.min(row.length, gateCount); c++) {
          const gId = selectedGateIds[c]
          const gate = gateMap.get(gId)
          if (!gate) continue

          const cellValue = row[c] // 0 = allowed, 1 = forbidden

          // Operational Check 1: Aircraft Compatibility
          if (opts.checkAircraft) {
            const check = checkAircraftCompatibility(flight, gate)
            recordCheck('operational', check.compatible)
            if (!check.compatible) {
              const incomp = {
                code: 'AIRCRAFT_INCOMPATIBILITY',
                row: r,
                col: c,
                flightId: fId,
                gateId: gId,
                flightNumber: flight.flightNumber || fId,
                gateNumber: gate.gateNumber || gId,
                rule: 'Aircraft Category Matching',
                message: check.reason,
                currentMatrixValue: cellValue
              }
              incompatibilities.push(incomp)
              categories.operational.incompatibilities.push(incomp)

              if (cellValue === 0) {
                recordWarning(
                  'operational',
                  'AIRCRAFT_INCOMPATIBILITY_PERMITTED',
                  `Cell (${r + 1}, ${c + 1}) permits Flight ${flight.flightNumber || fId} at Gate ${gate.gateNumber || gId}, but ${check.reason}`,
                  { row: r, col: c, flightId: fId, gateId: gId }
                )
              }
            }
          }

          // Operational Check 2: Terminal Compatibility
          if (opts.checkTerminal) {
            const check = checkTerminalCompatibility(flight, gate)
            recordCheck('operational', check.compatible)
            if (!check.compatible) {
              const incomp = {
                code: 'TERMINAL_MISMATCH',
                row: r,
                col: c,
                flightId: fId,
                gateId: gId,
                flightNumber: flight.flightNumber || fId,
                gateNumber: gate.gateNumber || gId,
                rule: 'Terminal Routing',
                message: check.reason,
                currentMatrixValue: cellValue
              }
              incompatibilities.push(incomp)
              categories.operational.incompatibilities.push(incomp)

              if (cellValue === 0) {
                recordWarning(
                  'operational',
                  'TERMINAL_MISMATCH_PERMITTED',
                  `Cell (${r + 1}, ${c + 1}) permits cross-terminal dock: Flight ${flight.flightNumber || fId} at Gate ${gate.gateNumber || gId} (${check.reason})`,
                  { row: r, col: c, flightId: fId, gateId: gId }
                )
              }
            }
          }

          // Operational Check 3: Domestic / International Gate Type
          if (opts.checkGateType) {
            const check = checkGateTypeCompatibility(flight, gate)
            recordCheck('operational', check.compatible)
            if (!check.compatible) {
              const incomp = {
                code: 'FLIGHT_TYPE_MISMATCH',
                row: r,
                col: c,
                flightId: fId,
                gateId: gId,
                flightNumber: flight.flightNumber || fId,
                gateNumber: gate.gateNumber || gId,
                rule: 'Domestic/International Customs Cordon',
                message: check.reason,
                currentMatrixValue: cellValue
              }
              incompatibilities.push(incomp)
              categories.operational.incompatibilities.push(incomp)

              if (cellValue === 0) {
                recordWarning(
                  'operational',
                  'FLIGHT_TYPE_MISMATCH_PERMITTED',
                  `Cell (${r + 1}, ${c + 1}): Flight ${flight.flightNumber || fId} at Gate ${gate.gateNumber || gId} violates customs routing: ${check.reason}`,
                  { row: r, col: c, flightId: fId, gateId: gId }
                )
              }
            }
          }

          // Operational Check 4: Gate Maintenance Status
          if (opts.checkMaintenance) {
            const check = checkGateMaintenance(gate)
            recordCheck('operational', check.compatible)
            if (!check.compatible) {
              const incomp = {
                code: 'GATE_UNDER_MAINTENANCE',
                row: r,
                col: c,
                flightId: fId,
                gateId: gId,
                flightNumber: flight.flightNumber || fId,
                gateNumber: gate.gateNumber || gId,
                rule: 'Physical Facility Maintenance',
                message: check.reason,
                currentMatrixValue: cellValue
              }
              incompatibilities.push(incomp)
              categories.operational.incompatibilities.push(incomp)

              if (cellValue === 0) {
                recordWarning(
                  'operational',
                  'MAINTENANCE_GATE_PERMITTED',
                  `Cell (${r + 1}, ${c + 1}): Flight ${flight.flightNumber || fId} is permitted at Gate ${gate.gateNumber || gId}, but gate is currently under Maintenance.`,
                  { row: r, col: c, flightId: fId, gateId: gId }
                )
              }
            }
          }

          // Operational Check 5: Gate Availability Status
          if (opts.checkAvailability) {
            const check = checkGateAvailability(gate)
            recordCheck('operational', check.compatible)
            if (!check.compatible) {
              const incomp = {
                code: 'GATE_OCCUPIED',
                row: r,
                col: c,
                flightId: fId,
                gateId: gId,
                flightNumber: flight.flightNumber || fId,
                gateNumber: gate.gateNumber || gId,
                rule: 'Turnaround Slot Availability',
                message: check.reason,
                currentMatrixValue: cellValue
              }
              incompatibilities.push(incomp)
              categories.operational.incompatibilities.push(incomp)

              if (cellValue === 0) {
                recordWarning(
                  'operational',
                  'OCCUPIED_GATE_PERMITTED',
                  `Cell (${r + 1}, ${c + 1}): Flight ${flight.flightNumber || fId} is assigned to Gate ${gate.gateNumber || gId}, which is marked as Occupied.`,
                  { row: r, col: c, flightId: fId, gateId: gId }
                )
              }
            }
          }

          // Operational Check 6: Passenger Capacity vs Gate Capacity
          if (opts.checkCapacity) {
            const check = checkCapacityCompatibility(flight, gate)
            recordCheck('operational', check.compatible)
            if (!check.compatible) {
              const incomp = {
                code: 'CAPACITY_OVERFLOW',
                row: r,
                col: c,
                flightId: fId,
                gateId: gId,
                flightNumber: flight.flightNumber || fId,
                gateNumber: gate.gateNumber || gId,
                rule: 'Passenger Holding Capacity',
                message: check.reason,
                currentMatrixValue: cellValue
              }
              incompatibilities.push(incomp)
              categories.operational.incompatibilities.push(incomp)

              if (cellValue === 0) {
                recordWarning(
                  'operational',
                  'CAPACITY_OVERFLOW_PERMITTED',
                  `Cell (${r + 1}, ${c + 1}): Flight ${flight.flightNumber || fId} passenger volume exceeds Gate ${gate.gateNumber || gId} capacity.`,
                  { row: r, col: c, flightId: fId, gateId: gId }
                )
              }
            }
          }
        }
      }
    }

    // ----------------------------------------------------
    // Overall Status Computation
    // ----------------------------------------------------
    const totalChecks = Object.values(categories).reduce((acc, cat) => acc + cat.total, 0)
    const passedChecks = Object.values(categories).reduce((acc, cat) => acc + cat.passed, 0)
    const densityPct = totalCells > 0 ? Number(((forbiddenCells / totalCells) * 100).toFixed(1)) : 0
    const isValid = errors.length === 0

    let overallStatus = 'PASSED'
    if (errors.length > 0) {
      overallStatus = 'FAILED'
    } else if (warnings.length > 0) {
      overallStatus = 'WARNINGS'
    }

    return {
      isValid,
      status: overallStatus,
      totalChecks,
      passedChecks,
      errorCount: errors.length,
      warningCount: warnings.length,
      incompatibilityCount: incompatibilities.length,
      flightCount,
      gateCount,
      totalCells,
      allowedCells,
      forbiddenCells,
      densityPct,
      isSquare,
      categories,
      errors,
      warnings,
      incompatibilities
    }
  }
}

export default matrixValidationService
