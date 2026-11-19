/**
 * Backtracking Allocation Engine (Phase 13 — GateWise BLR)
 *
 * Generates exact, conflict-free, valid flight-to-gate allocations using recursive backtracking.
 * Enforces the exact binary restriction matrix B (where 0 = permitted, 1 = forbidden).
 *
 * Core Rules:
 * 1. Every flight must receive exactly one gate (surjective on flights).
 * 2. A gate can be assigned to only one flight (injective on gates / no double booking).
 * 3. A flight cannot be assigned to a forbidden gate (B[flight][gate] === 1).
 * 4. Actual simulation flight IDs and gate IDs are mapped directly.
 * 5. Distinct allocations only: no duplicate assignments.
 *
 * Cross-Verification:
 * For small square matrices where all solutions are generated (mode='all'),
 * the total number of valid assignments generated strictly equals the exact
 * count calculated by Phase 12 (Principle of Inclusion-Exclusion).
 */

import rookPolynomialService from './rookPolynomialService.js'

/**
 * Validate input structure for allocation generation.
 */
export const validateAllocationInput = ({ matrix, flightIds, gateIds }) => {
  if (!matrix || !Array.isArray(matrix) || matrix.length === 0) {
    return { valid: false, error: 'Restriction matrix must be a non-empty 2D array.' }
  }

  if (!flightIds || !Array.isArray(flightIds) || flightIds.length === 0) {
    return { valid: false, error: 'flightIds must be a non-empty array of flight identifiers.' }
  }

  if (!gateIds || !Array.isArray(gateIds) || gateIds.length === 0) {
    return { valid: false, error: 'gateIds must be a non-empty array of gate identifiers.' }
  }

  const numFlights = flightIds.length
  const numGates = gateIds.length

  if (matrix.length !== numFlights) {
    return {
      valid: false,
      error: `Matrix row count (${matrix.length}) does not match flightIds count (${numFlights}).`
    }
  }

  // Check unique flight IDs
  const uniqueFlights = new Set(flightIds)
  if (uniqueFlights.size !== numFlights) {
    return { valid: false, error: 'Duplicate flight IDs detected in flightIds array.' }
  }

  // Check unique gate IDs
  const uniqueGates = new Set(gateIds)
  if (uniqueGates.size !== numGates) {
    return { valid: false, error: 'Duplicate gate IDs detected in gateIds array.' }
  }

  // Validate matrix row lengths and binary values
  for (let r = 0; r < numFlights; r++) {
    const row = matrix[r]
    if (!Array.isArray(row) || row.length !== numGates) {
      return {
        valid: false,
        error: `Matrix row ${r + 1} column count (${row?.length}) does not match gateIds count (${numGates}).`
      }
    }

    for (let c = 0; c < numGates; c++) {
      const val = row[c]
      if (val !== 0 && val !== 1) {
        return {
          valid: false,
          error: `Non-binary matrix cell at row ${r + 1}, column ${c + 1} (value: ${val}). Only 0 and 1 allowed.`
        }
      }
    }
  }

  return { valid: true, numFlights, numGates }
}

/**
 * Recursive Backtracking Allocation Engine.
 *
 * @param {Object} params
 * @param {Array<Array<number>>} params.matrix - 2D binary restriction matrix (0=permitted, 1=forbidden)
 * @param {Array<string>} params.flightIds - Ordered array of flight IDs corresponding to rows
 * @param {Array<string>} params.gateIds - Ordered array of gate IDs corresponding to columns
 * @param {string} [params.mode='all'] - 'first' | 'all' | 'limited'
 * @param {number} [params.maxResults=100] - Cap on returned allocations (for limited mode or safety)
 * @param {number} [params.maxNodes=500000] - Hard node limit to prevent infinite loops / freezes
 * @param {number} [params.timeLimitMs=10000] - Hard execution timeout in milliseconds
 * @param {Object} [params.cancelToken] - Optional cancellation token { isCancelled: boolean }
 * @param {AbortSignal} [params.signal] - Optional standard AbortSignal
 * @param {boolean} [params.includeTrace=false] - Whether to capture step-by-step search trace
 * @param {number} [params.maxTraceSteps=150] - Cap on recorded educational trace events
 * @param {Array<Object>} [params.flights] - Optional enriched flight objects
 * @param {Array<Object>} [params.gates] - Optional enriched gate objects
 * @returns {Object} AllocationGenerationResult
 */
export const generateAllocations = ({
  matrix,
  flightIds,
  gateIds,
  mode = 'all',
  maxResults = 100,
  maxNodes = 500000,
  timeLimitMs = 10000,
  cancelToken,
  signal,
  includeTrace = false,
  maxTraceSteps = 150,
  flights = [],
  gates = []
}) => {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now()

  // 1. Validate inputs
  const validation = validateAllocationInput({ matrix, flightIds, gateIds })
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
      allocations: [],
      totalGenerated: 0,
      searchStatistics: {
        nodesVisited: 0,
        rejectedBranches: 0,
        backtrackingOperations: 0,
        computationTimeMs: 0
      },
      resultLimitReached: false,
      status: 'VALIDATION_FAILED'
    }
  }

  const { numFlights, numGates } = validation

  // 2. Early dimensional feasibility check (Pigeonhole Principle)
  // If more flights than gates, injective matching is mathematically impossible
  if (numFlights > numGates) {
    const elapsed = typeof performance !== 'undefined' ? performance.now() - startTime : 0
    return {
      success: true,
      allocations: [],
      totalGenerated: 0,
      searchStatistics: {
        nodesVisited: 1,
        rejectedBranches: 1,
        backtrackingOperations: 0,
        computationTimeMs: Number(elapsed.toFixed(3))
      },
      resultLimitReached: false,
      status: 'NO_SOLUTIONS',
      explanation: `Impossible to assign ${numFlights} flights to ${numGates} gates without double-booking (flights exceed gates).`
    }
  }

  // 3. Determine target solution limit
  let targetLimit = Infinity
  if (mode === 'first') {
    targetLimit = 1
  } else if (mode === 'limited') {
    targetLimit = Math.max(1, Number(maxResults) || 100)
  } else if (maxResults && maxResults > 0) {
    // Mode 'all' with optional safety cap
    targetLimit = Number(maxResults)
  }

  // Enriched metadata lookup maps
  const flightObjMap = new Map()
  flights.forEach((f) => flightObjMap.set(f.id, f))

  const gateObjMap = new Map()
  gates.forEach((g) => gateObjMap.set(g.id, g))

  // Search state variables
  const allocations = []
  let nodesVisited = 0
  let rejectedBranches = 0
  let backtrackingOperations = 0
  let limitReached = false
  let isCancelled = false
  let timeoutReached = false

  // Educational step-by-step trace accumulator
  const trace = []
  const addTrace = (stepType, flightIdx, gateIdx, detail) => {
    if (!includeTrace || trace.length >= maxTraceSteps) return
    trace.push({
      stepNumber: trace.length + 1,
      stepType,
      flightIndex: flightIdx,
      flightId: flightIdx !== null ? flightIds[flightIdx] : null,
      gateIndex: gateIdx,
      gateId: gateIdx !== null ? gateIds[gateIdx] : null,
      detail
    })
  }

  // Array of gate assignment indices: assignment[flightIdx] = gateIdx
  const currentAssignment = new Array(numFlights).fill(-1)
  // Set/array of boolean gate occupancy: isGateAssigned[gateIdx] = boolean
  const isGateAssigned = new Array(numGates).fill(false)

  // 4. Recursive Backtracking Routine
  const backtrack = (flightIdx) => {
    // Check cancellation
    if (signal?.aborted || cancelToken?.isCancelled) {
      isCancelled = true
      return
    }

    // Safety limits check
    if (nodesVisited >= maxNodes) {
      limitReached = true
      return
    }

    const currentElapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime
    if (currentElapsed > timeLimitMs) {
      timeoutReached = true
      return
    }

    // Base Case: All flights have been assigned a gate
    if (flightIdx === numFlights) {
      allocations.push(buildAllocationRecord(allocations.length + 1, currentAssignment, flightIds, gateIds, flightObjMap, gateObjMap))
      addTrace('SOLUTION', null, null, `Found complete valid allocation ALLOC-${String(allocations.length).padStart(3, '0')}`)

      if (allocations.length >= targetLimit) {
        limitReached = true
      }
      return
    }

    nodesVisited++

    // Try candidate gates for flightIdx
    const currentFlightId = flightIds[flightIdx]
    const rowRestrictions = matrix[flightIdx]

    for (let gateIdx = 0; gateIdx < numGates; gateIdx++) {
      if (allocations.length >= targetLimit || isCancelled || limitReached || timeoutReached) {
        break
      }

      const currentGateId = gateIds[gateIdx]

      // Constraint 1: Check binary restriction matrix (0 = permitted, 1 = forbidden)
      if (rowRestrictions[gateIdx] === 1) {
        rejectedBranches++
        addTrace('REJECT_RESTRICTED', flightIdx, gateIdx, `${currentFlightId} restricted from ${currentGateId} (B[${flightIdx + 1}][${gateIdx + 1}] = 1)`)
        continue
      }

      // Constraint 2: Check gate availability (injective / no double-booking)
      if (isGateAssigned[gateIdx]) {
        rejectedBranches++
        addTrace('REJECT_OCCUPIED', flightIdx, gateIdx, `${currentGateId} is already occupied by a preceding flight`)
        continue
      }

      // Action: Assign permitted gate to current flight
      currentAssignment[flightIdx] = gateIdx
      isGateAssigned[gateIdx] = true
      addTrace('ACCEPT', flightIdx, gateIdx, `Assigned ${currentFlightId} → ${currentGateId}`)

      // Recurse to assign subsequent flight
      backtrack(flightIdx + 1)

      // Backtrack: Undo assignment
      currentAssignment[flightIdx] = -1
      isGateAssigned[gateIdx] = false
      backtrackingOperations++
      addTrace('BACKTRACK', flightIdx, gateIdx, `Backtracked from ${currentFlightId} → ${currentGateId}`)
    }
  }

  // Execute search starting from flight 0
  backtrack(0)

  const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const computationTimeMs = Math.max(0, Number((endTime - startTime).toFixed(3)))

  // Determine final engine status
  let status = 'COMPLETED'
  if (isCancelled) {
    status = 'CANCELLED'
  } else if (timeoutReached) {
    status = 'TIMEOUT'
  } else if (limitReached && allocations.length >= targetLimit) {
    status = mode === 'first' ? 'COMPLETED' : 'LIMIT_REACHED'
  } else if (allocations.length === 0) {
    status = 'NO_SOLUTIONS'
  }

  return {
    success: true,
    allocations,
    totalGenerated: allocations.length,
    searchStatistics: {
      nodesVisited,
      rejectedBranches,
      backtrackingOperations,
      computationTimeMs
    },
    resultLimitReached: limitReached && allocations.length >= targetLimit && mode !== 'first',
    status,
    mode,
    maxResults: targetLimit === Infinity ? null : targetLimit,
    trace: includeTrace ? trace : undefined
  }
}

/**
 * Format a completed assignment vector into the canonical structured allocation object.
 */
function buildAllocationRecord(index, assignmentArray, flightIds, gateIds, flightObjMap, gateObjMap) {
  const allocationId = `ALLOC-${String(index).padStart(3, '0')}`
  const assignments = []

  for (let fIdx = 0; fIdx < assignmentArray.length; fIdx++) {
    const gIdx = assignmentArray[fIdx]
    const flightId = flightIds[fIdx]
    const gateId = gateIds[gIdx]
    const flightObj = flightObjMap.get(flightId)
    const gateObj = gateObjMap.get(gateId)

    assignments.push({
      flightId,
      gateId,
      flightIndex: fIdx,
      gateIndex: gIdx,
      flightNumber: flightObj?.flightNumber || flightId,
      airline: flightObj?.airline || 'Aviation',
      gateNumber: gateObj?.gateNumber || gateId,
      terminal: gateObj?.terminal || 'T1'
    })
  }

  return {
    allocationId,
    assignments,
    assignedFlights: assignments.length,
    complete: true,
    valid: true
  }
}

/**
 * Cross-verify Phase 13 generated allocation count against Phase 12 Inclusion-Exclusion exact count.
 *
 * For a small square matrix (n x n):
 * Phase 12 calculates: N = sum_{k=0}^n (-1)^k * r_k * (n - k)!
 * Phase 13 generates: concrete allocations.
 *
 * If mode='all' and search was not stopped/capped, Phase 13 generated count must
 * strictly equal Phase 12 exact valid assignments count.
 *
 * @param {Object} params
 * @param {Array<Array<number>>} params.matrix - Square binary matrix
 * @param {Array<string>} params.flightIds - Flight IDs
 * @param {Array<string>} params.gateIds - Gate IDs
 * @param {number} [params.phase12ExactCount] - Precomputed Phase 12 count (or auto-computed if omitted)
 * @param {number} [params.maxResults=2000] - Safe cap for generation
 * @returns {Object} CrossVerificationReport
 */
export const crossVerifyWithPhase12 = ({
  matrix,
  flightIds,
  gateIds,
  phase12ExactCount,
  maxResults = 2000
}) => {
  const rows = matrix?.length || 0
  const cols = matrix?.[0]?.length || 0

  if (rows === 0 || cols === 0 || rows !== cols) {
    return {
      compatible: false,
      reason: 'Phase 12 exact count formula strictly applies to square (n x n) matrices.'
    }
  }

  // 1. Calculate Phase 12 exact count using Phase 11 rook coefficients if not supplied
  let exactCount = phase12ExactCount
  if (exactCount === undefined || exactCount === null) {
    exactCount = computeExactValidAssignments(matrix)
  }

  // 2. Run Phase 13 Backtracking Allocation Engine in 'all' mode (capped safely)
  const result = generateAllocations({
    matrix,
    flightIds,
    gateIds,
    mode: 'all',
    maxResults
  })

  // 3. Evaluate Cross-Verification
  if (result.resultLimitReached) {
    return {
      compatible: true,
      verified: null,
      status: 'INCOMPLETE_SEARCH',
      phase12ExactCount: exactCount,
      phase13GeneratedCount: result.totalGenerated,
      searchStatistics: result.searchStatistics,
      message: `Search reached the safety cap of ${maxResults} allocations before completing all branches. Cannot declare exact count agreement while search is truncated.`
    }
  }

  const isExactMatch = exactCount === result.totalGenerated

  return {
    compatible: true,
    verified: isExactMatch,
    status: isExactMatch ? 'VERIFIED' : 'DISCREPANCY',
    phase12ExactCount: exactCount,
    phase13GeneratedCount: result.totalGenerated,
    discrepancy: isExactMatch ? 0 : Math.abs(exactCount - result.totalGenerated),
    searchStatistics: result.searchStatistics,
    message: isExactMatch
      ? `Exact Agreement: Phase 12 Inclusion-Exclusion formula (${exactCount}) matches Phase 13 Backtracking generator (${result.totalGenerated} allocations).`
      : `Discrepancy: Phase 12 count is ${exactCount}, but Phase 13 generated ${result.totalGenerated}.`
  }
}

/**
 * Helper to compute Phase 12 exact valid assignments from Phase 11 Rook Polynomial coefficients.
 * Formula: N = sum_{k=0}^n (-1)^k * r_k * (n - k)!
 *
 * @param {Array<Array<number>>} matrix
 * @returns {number} Exact integer count of valid conflict-free assignments
 */
export const computeExactValidAssignments = (matrix) => {
  const n = matrix.length
  if (!matrix[0] || matrix[0].length !== n) {
    return 0
  }

  const rookRes = rookPolynomialService.computeRookPolynomial(matrix)
  const rBigInt = rookRes.coefficients.map((c) => BigInt(c))

  const factorial = (num) => {
    let res = 1n
    for (let i = 2n; i <= BigInt(num); i++) {
      res *= i
    }
    return res
  }

  let totalValid = 0n
  for (let k = 0; k <= n; k++) {
    const r_k = k < rBigInt.length ? rBigInt[k] : 0n
    if (r_k === 0n) continue

    const sign = k % 2 === 0 ? 1n : -1n
    const fact = factorial(n - k)
    totalValid += sign * r_k * fact
  }

  return Number(totalValid)
}

export const backtrackingAllocationService = {
  generateAllocations,
  validateAllocationInput,
  crossVerifyWithPhase12,
  computeExactValidAssignments
}

export default backtrackingAllocationService
