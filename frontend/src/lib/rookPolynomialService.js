/**
 * Rook Polynomial Engine (Phase 11 — GateWise BLR)
 *
 * Computes the exact Rook Polynomial R(B, x) for an arbitrary binary restriction matrix B (m × n).
 *
 * Mathematical Foundations:
 * - Rows represent flights F = {f_1, f_2, ..., f_m}.
 * - Columns represent gates G = {g_1, g_2, ..., g_n}.
 * - Binary convention:
 *     0 = Assignment permitted (unrestricted)
 *     1 = Assignment forbidden (restricted)
 * - A rook may ONLY be placed on a forbidden cell (where B[i][j] = 1).
 * - Non-attacking constraint: No two rooks can share the same row or column.
 * - The Rook Polynomial is defined as:
 *     R(B, x) = r_0 + r_1 x + r_2 x^2 + ... + r_k x^k
 *   where:
 *     r_0 = 1 (by definition: exactly 1 way to place 0 rooks)
 *     r_1 = total count of forbidden cells in B
 *     r_2 = count of ways to place 2 non-attacking rooks on forbidden cells
 *     r_k = count of ways to place k non-attacking rooks on forbidden cells
 *     k <= min(m, n) (maximum possible degree)
 *
 * Algorithm:
 * - Dynamic Programming with Column Bitmask (O(m · 2^min(m, n))).
 * - Employs matrix transposition when n > m so bitmask size is strictly bounded by min(m, n).
 * - Internal state uses BigInt to prevent integer overflow for dense/large boards.
 * - Input matrix is treated as strictly immutable.
 */

// Unicode superscript digits for formatted polynomial display
const SUPERSCRIPTS = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹'
}

/**
 * Format an integer power into unicode superscript (e.g. 2 -> ², 12 -> ¹²).
 */
export const toSuperscript = (num) => {
  return String(num)
    .split('')
    .map((ch) => SUPERSCRIPTS[ch] || ch)
    .join('')
}

/**
 * Validate that an input matrix is a valid non-empty 2D array of binary numbers (0 or 1).
 *
 * @param {Array<Array<number>>} matrix
 * @returns {{ valid: boolean, error?: string, rows?: number, columns?: number }}
 */
export const validateInputMatrix = (matrix) => {
  if (!matrix || !Array.isArray(matrix)) {
    return { valid: false, error: 'Matrix must be a valid non-empty array.' }
  }

  const rows = matrix.length
  if (rows === 0) {
    return { valid: false, error: 'Matrix must contain at least one row.' }
  }

  if (!Array.isArray(matrix[0])) {
    return { valid: false, error: 'Matrix row 0 is not an array.' }
  }

  const cols = matrix[0].length
  if (cols === 0) {
    return { valid: false, error: 'Matrix must contain at least one column.' }
  }

  for (let r = 0; r < rows; r++) {
    const row = matrix[r]
    if (!Array.isArray(row)) {
      return { valid: false, error: `Row ${r} is not an array.` }
    }
    if (row.length !== cols) {
      return {
        valid: false,
        error: `Unequal row lengths: Row ${r} has length ${row.length}, expected ${cols}.`
      }
    }
    for (let c = 0; c < cols; c++) {
      const val = row[c]
      if (val !== 0 && val !== 1) {
        return {
          valid: false,
          error: `Cell at (${r}, ${c}) contains invalid value ${val}. Must be strictly 0 or 1.`
        }
      }
    }
  }

  return { valid: true, rows, columns: cols }
}

/**
 * Identify all forbidden cells (coordinates where matrix[r][c] == 1).
 *
 * @param {Array<Array<number>>} matrix
 * @returns {Array<{ row: number, col: number }>}
 */
export const findForbiddenCells = (matrix) => {
  const cells = []
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (matrix[r][c] === 1) {
        cells.push({ row: r, col: c })
      }
    }
  }
  return cells
}

/**
 * Format coefficients into an algebraic string expression R(x) = r_0 + r_1 x + ...
 *
 * @param {Array<string|number|BigInt>} coefficients
 * @returns {string} Formatted polynomial
 */
export const formatPolynomial = (coefficients) => {
  if (!coefficients || coefficients.length === 0) return 'R(x) = 0'

  const terms = []
  for (let k = 0; k < coefficients.length; k++) {
    const coeffStr = String(coefficients[k])
    const coeffNum = BigInt(coeffStr)

    // Omit terms with zero coefficient unless it's r_0 on an all-zero polynomial
    if (coeffNum === 0n) continue

    if (k === 0) {
      terms.push(`${coeffStr}`)
    } else if (k === 1) {
      terms.push(coeffStr === '1' ? 'x' : `${coeffStr}x`)
    } else {
      const sup = toSuperscript(k)
      terms.push(coeffStr === '1' ? `x${sup}` : `${coeffStr}x${sup}`)
    }
  }

  if (terms.length === 0) return 'R(x) = 0'
  return `R(x) = ${terms.join(' + ')}`
}

/**
 * Compute the population count (Hamming weight) of a 32-bit integer.
 */
const popcount = (x) => {
  x = x - ((x >> 1) & 0x55555555)
  x = (x & 0x33333333) + ((x >> 2) & 0x33333333)
  x = (x + (x >> 4)) & 0x0f0f0f0f
  x = x + (x >> 8)
  x = x + (x >> 16)
  return x & 0x0000003f
}

/**
 * Independent combinatorial brute-force calculation for small matrices.
 * Used for cross-checking correctness in test suites.
 *
 * @param {Array<Array<number>>} matrix
 * @returns {Array<number>} Coefficients array [r_0, r_1, ..., r_k]
 */
export const bruteForceRookPolynomial = (matrix) => {
  const validation = validateInputMatrix(matrix)
  if (!validation.valid) throw new Error(validation.error)

  const forbidden = findForbiddenCells(matrix)
  const rows = matrix.length
  const cols = matrix[0].length
  const maxK = Math.min(rows, cols)

  const rCounts = Array(maxK + 1).fill(0)
  rCounts[0] = 1 // r_0 = 1

  // Recursive search over subset of forbidden cells
  const backtrack = (startIdx, chosen) => {
    const k = chosen.length
    if (k > 0) {
      rCounts[k]++
    }
    if (k === maxK) return

    for (let i = startIdx; i < forbidden.length; i++) {
      const candidate = forbidden[i]
      // Check if candidate attacks any already chosen rook
      let attacks = false
      for (let j = 0; j < chosen.length; j++) {
        if (chosen[j].row === candidate.row || chosen[j].col === candidate.col) {
          attacks = true
          break
        }
      }
      if (!attacks) {
        chosen.push(candidate)
        backtrack(i + 1, chosen)
        chosen.pop()
      }
    }
  }

  backtrack(0, [])

  // Trim trailing zeros beyond maximum achieved degree, keeping r_0
  let lastNonZero = maxK
  while (lastNonZero > 0 && rCounts[lastNonZero] === 0) {
    lastNonZero--
  }

  return rCounts.slice(0, lastNonZero + 1)
}

/**
 * Generate sample or exhaustive valid non-attacking rook configurations
 * for visual demonstration and interactive arrangement inspection.
 *
 * @param {Array<Array<number>>} matrix
 * @param {number} maxDegree
 * @param {number} limitPerDegree Maximum placements to return per degree (default 25)
 * @returns {Record<number, Array<Array<{row: number, col: number}>>>}
 */
export const generateRookPlacements = (matrix, maxDegree = 4, limitPerDegree = 25) => {
  const forbidden = findForbiddenCells(matrix)
  const rows = matrix.length
  const cols = matrix[0].length
  const limitK = Math.min(maxDegree, rows, cols)

  const placements = {}
  for (let k = 1; k <= limitK; k++) {
    placements[k] = []
  }

  const search = (startIdx, chosen) => {
    const k = chosen.length
    if (k >= 1 && k <= limitK) {
      if (placements[k].length < limitPerDegree) {
        placements[k].push([...chosen])
      }
    }
    if (k >= limitK) return

    for (let i = startIdx; i < forbidden.length; i++) {
      const candidate = forbidden[i]
      let conflict = false
      for (let j = 0; j < chosen.length; j++) {
        if (chosen[j].row === candidate.row || chosen[j].col === candidate.col) {
          conflict = true
          break
        }
      }
      if (!conflict) {
        chosen.push(candidate)
        search(i + 1, chosen)
        chosen.pop()
      }
    }
  }

  search(0, [])
  return placements
}

/**
 * Primary calculation engine: Computes the Rook Polynomial R(B, x)
 * using Dynamic Programming with column bitmasks and BigInt precision.
 *
 * @param {Array<Array<number>>} matrix 2D binary restriction matrix
 * @param {Object} options Calculation options
 * @returns {Object} Comprehensive calculation result
 */
export const computeRookPolynomial = (matrix, options = {}) => {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now()

  // 1. Structural validation
  const validation = validateInputMatrix(matrix)
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
      coefficients: [],
      degree: 0,
      forbiddenCellCount: 0,
      polynomial: 'R(x) = 0',
      matrixDimensions: { rows: 0, columns: 0 },
      algorithm: 'Dynamic Programming (Bitmask)',
      computationTimeMs: 0
    }
  }

  const { rows, columns } = validation
  const forbiddenCells = findForbiddenCells(matrix)
  const forbiddenCellCount = forbiddenCells.length
  const maxDegree = Math.min(rows, columns)

  // Edge Case: No restrictions (all cells 0)
  if (forbiddenCellCount === 0) {
    const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now()
    return {
      success: true,
      coefficients: ['1'],
      coefficientsNumeric: [1],
      degree: 0,
      forbiddenCellCount: 0,
      polynomial: 'R(x) = 1',
      matrixDimensions: { rows, columns },
      algorithm: 'Direct Evaluation (Zero Restrictions)',
      computationTimeMs: Math.max(0, Number((endTime - startTime).toFixed(3))),
      forbiddenCells: [],
      placementsByDegree: {}
    }
  }

  // Optimization: If columns > rows, transpose the matrix so column mask size is <= rows.
  // The rook polynomial is invariant under matrix transposition: R(B, x) == R(B^T, x).
  const isTransposed = columns > rows
  const effectiveRows = isTransposed ? columns : rows
  const effectiveCols = isTransposed ? rows : columns

  // Build row forbidden column masks
  const rowMasks = Array.from({ length: effectiveRows }, () => [])
  for (let r = 0; r < effectiveRows; r++) {
    for (let c = 0; c < effectiveCols; c++) {
      const val = isTransposed ? matrix[c][r] : matrix[r][c]
      if (val === 1) {
        rowMasks[r].push(c)
      }
    }
  }

  // Dynamic Programming Table
  // State: dp[mask] = count of ways to place popcount(mask) non-attacking rooks
  let dp = new Map()
  dp.set(0, 1n) // Empty placement (0 rooks)

  for (let r = 0; r < effectiveRows; r++) {
    const forbiddenCols = rowMasks[r]
    if (forbiddenCols.length === 0) {
      // Row has no forbidden cells; all rooks must skip this row
      continue
    }

    const nextDp = new Map(dp)

    for (const [mask, ways] of dp.entries()) {
      for (let i = 0; i < forbiddenCols.length; i++) {
        const c = forbiddenCols[i]
        const colBit = 1 << c

        // Check if column c is already occupied by a previously placed rook
        if ((mask & colBit) === 0) {
          const nextMask = mask | colBit
          const currentWays = nextDp.get(nextMask) || 0n
          nextDp.set(nextMask, currentWays + ways)
        }
      }
    }

    dp = nextDp
  }

  // Aggregate ways by rook count k = popcount(mask)
  const rBigInt = Array(maxDegree + 1).fill(0n)
  for (const [mask, ways] of dp.entries()) {
    const k = popcount(mask)
    if (k <= maxDegree) {
      rBigInt[k] += ways
    }
  }

  // Ensure r_0 = 1 by definition
  rBigInt[0] = 1n

  // Determine actual maximum degree (highest k where r_k > 0)
  let degree = maxDegree
  while (degree > 0 && rBigInt[degree] === 0n) {
    degree--
  }

  const coefficientsBigInt = rBigInt.slice(0, degree + 1)
  const coefficientsStr = coefficientsBigInt.map((val) => val.toString())
  const coefficientsNumeric = coefficientsBigInt.map((val) => Number(val))

  const polynomial = formatPolynomial(coefficientsStr)

  // Generate sample rook placement coordinates for interactive UI visualization
  const includePlacements = options.includePlacements !== false
  const placementsByDegree = includePlacements
    ? generateRookPlacements(matrix, degree, options.placementLimit || 20)
    : {}

  const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const computationTimeMs = Math.max(0, Number((endTime - startTime).toFixed(3)))

  return {
    success: true,
    coefficients: coefficientsStr,
    coefficientsNumeric,
    degree,
    forbiddenCellCount,
    polynomial,
    matrixDimensions: {
      rows,
      columns
    },
    algorithm: isTransposed
      ? 'Dynamic Programming with Transposed Column Bitmask'
      : 'Dynamic Programming with Column Bitmask',
    computationTimeMs,
    forbiddenCells,
    placementsByDegree
  }
}

export const rookPolynomialService = {
  calculate: computeRookPolynomial,
  computeRookPolynomial,
  formatPolynomial,
  validateInputMatrix,
  findForbiddenCells,
  generateRookPlacements,
  bruteForceRookPolynomial,
  toSuperscript
}

export default rookPolynomialService
