/**
 * Matrix Validation Service
 * Validates restriction matrices against structural, dimensional, binary,
 * and simulation reference constraints needed for Rook Polynomial and Inclusion-Exclusion evaluation.
 */

export const matrixValidationService = {
  /**
   * Performs comprehensive validation on a restriction matrix for a given simulation.
   *
   * @param {Object} simulation - The simulation object containing selectedFlightIds, selectedGateIds, etc.
   * @param {Array<Array<number>>} matrix - The 2D restriction matrix
   * @param {Array<Object>} allRegisteredFlights - List of all registered flight objects in the system
   * @param {Array<Object>} allRegisteredGates - List of all registered gate objects in the system
   * @returns {Object} Structured validation result
   */
  validateMatrix: (simulation, matrix, allRegisteredFlights = [], allRegisteredGates = []) => {
    const errors = []
    const warnings = []

    // 1. Simulation Validation
    if (!simulation) {
      errors.push({
        category: 'Simulation Validation',
        code: 'MISSING_SIMULATION',
        message: 'No simulation scenario is currently selected or provided.'
      })
      return {
        isValid: false,
        isSquare: false,
        flightCount: 0,
        gateCount: 0,
        totalCells: 0,
        allowedCells: 0,
        forbiddenCells: 0,
        densityPct: 0,
        errors,
        warnings
      }
    }

    const selectedFlightIds = simulation.selectedFlightIds || []
    const selectedGateIds = simulation.selectedGateIds || []

    // 2. Flight Reference Validation
    const flightMap = new Map(allRegisteredFlights.map(f => [f.id, f]))
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

    if (duplicateFlightIds.size > 0) {
      errors.push({
        category: 'Flight Reference Validation',
        code: 'DUPLICATE_FLIGHT_REFERENCES',
        message: `Scenario contains duplicate flight references: ${Array.from(duplicateFlightIds).join(', ')}.`
      })
    }

    if (missingFlightIds.length > 0) {
      errors.push({
        category: 'Flight Reference Validation',
        code: 'DELETED_FLIGHT_REFERENCES',
        message: `Scenario references ${missingFlightIds.length} flight record(s) that no longer exist in the registry: ${missingFlightIds.join(', ')}.`
      })
    }

    // 3. Gate Reference Validation
    const gateMap = new Map(allRegisteredGates.map(g => [g.id, g]))
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

    if (duplicateGateIds.size > 0) {
      errors.push({
        category: 'Gate Reference Validation',
        code: 'DUPLICATE_GATE_REFERENCES',
        message: `Scenario contains duplicate gate references: ${Array.from(duplicateGateIds).join(', ')}.`
      })
    }

    if (missingGateIds.length > 0) {
      errors.push({
        category: 'Gate Reference Validation',
        code: 'DELETED_GATE_REFERENCES',
        message: `Scenario references ${missingGateIds.length} gate record(s) that no longer exist in the registry: ${missingGateIds.join(', ')}.`
      })
    }

    // 4. Dimension Validation
    const flightCount = selectedFlightIds.length
    const gateCount = selectedGateIds.length
    const isSquare = flightCount === gateCount && flightCount > 0

    if (flightCount === 0) {
      errors.push({
        category: 'Dimension Validation',
        code: 'NO_FLIGHTS_SELECTED',
        message: 'Scenario contains zero selected flights. At least 1 flight is required.'
      })
    }

    if (gateCount === 0) {
      errors.push({
        category: 'Dimension Validation',
        code: 'NO_GATES_SELECTED',
        message: 'Scenario contains zero selected gates. At least 1 gate is required.'
      })
    }

    if (flightCount > 0 && gateCount > 0 && !isSquare) {
      errors.push({
        category: 'Dimension Validation',
        code: 'UNEQUAL_DIMENSIONS',
        message: `Bijective gate allocation requires equal dimensions (|Flights| = |Gates|). Current scenario has ${flightCount} flights and ${gateCount} gates (${flightCount} × ${gateCount}).`
      })
    }

    // 5. Matrix Structure & Binary Value Validation
    let totalCells = 0
    let allowedCells = 0
    let forbiddenCells = 0

    if (!matrix || !Array.isArray(matrix) || matrix.length === 0) {
      errors.push({
        category: 'Matrix Structure Validation',
        code: 'EMPTY_OR_MALFORMED_MATRIX',
        message: 'The restriction matrix is empty or not formatted as a 2D array.'
      })
    } else {
      // Row count mismatch with scenario flights
      if (matrix.length !== flightCount) {
        errors.push({
          category: 'Matrix Structure Validation',
          code: 'ROW_COUNT_MISMATCH',
          message: `Matrix row count (${matrix.length}) does not match the scenario flight count (${flightCount}).`
        })
      }

      // Check each row and cell
      for (let r = 0; r < matrix.length; r++) {
        const row = matrix[r]
        if (!Array.isArray(row)) {
          errors.push({
            category: 'Matrix Structure Validation',
            code: 'INVALID_ROW_STRUCTURE',
            message: `Row index ${r} is not an array.`,
            row: r
          })
          continue
        }

        if (row.length !== gateCount) {
          errors.push({
            category: 'Matrix Structure Validation',
            code: 'COLUMN_COUNT_MISMATCH',
            message: `Row ${r + 1} has ${row.length} cells, expected ${gateCount} (matching gates count).`,
            row: r
          })
        }

        for (let c = 0; c < row.length; c++) {
          const val = row[c]
          totalCells++

          if (val === 0) {
            allowedCells++
          } else if (val === 1) {
            forbiddenCells++
          } else {
            errors.push({
              category: 'Binary Value Validation',
              code: 'INVALID_BINARY_VALUE',
              message: `Cell at row ${r + 1}, column ${c + 1} contains invalid value "${val}". Only binary 0 (Allowed) or 1 (Forbidden) are permitted.`,
              row: r,
              col: c
            })
          }
        }
      }
    }

    // 6. Operational Warnings (Valid structure, but noteworthy edge conditions)
    if (totalCells > 0 && forbiddenCells === 0) {
      warnings.push({
        category: 'Matrix Structure Validation',
        code: 'ZERO_RESTRICTIONS',
        message: 'The matrix contains zero forbidden cells. All assignments are unrestricted, which yields total valid allocations = n!.'
      })
    }

    if (totalCells > 0 && forbiddenCells === totalCells) {
      warnings.push({
        category: 'Matrix Structure Validation',
        code: 'ALL_FORBIDDEN',
        message: 'Every assignment in this matrix is marked as forbidden (100% density). No valid flight-to-gate assignment is possible (N = 0).'
      })
    }

    const densityPct = totalCells > 0 ? Number(((forbiddenCells / totalCells) * 100).toFixed(1)) : 0
    const isValid = errors.length === 0

    return {
      isValid,
      isSquare,
      flightCount,
      gateCount,
      totalCells,
      allowedCells,
      forbiddenCells,
      densityPct,
      errors,
      warnings
    }
  }
}

export default matrixValidationService
