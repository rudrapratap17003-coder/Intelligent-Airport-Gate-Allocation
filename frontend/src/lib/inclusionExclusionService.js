/**
 * Inclusion-Exclusion Engine (Phase 12 — GateWise BLR)
 *
 * Computes the exact number of valid, conflict-free flight-to-gate assignments
 * using the Principle of Inclusion-Exclusion (PIE) in conjunction with Rook Polynomials.
 *
 * Mathematical Foundations:
 * -------------------------
 * For a square restriction matrix (m = n):
 *   N = Σ_{k=0}^n (-1)^k · r_k · (n - k)!
 *
 * For a rectangular restriction matrix (m flights, n gates where m <= n):
 *   Each flight must receive exactly one gate, and no two flights may share a gate.
 *   Total unrestricted injective assignments: P(n, m) = n! / (n - m)!
 *   With k non-attacking rooks placed on forbidden cells, the remaining (m - k) flights
 *   are assigned to the remaining (n - k) gates in P(n - k, m - k) = (n - k)! / (n - m)! ways.
 *   Generalised Rectangular PIE Formula:
 *   N = Σ_{k=0}^m (-1)^k · r_k · [(n - k)! / (n - m)!]
 *
 * For over-constrained rectangular problems (m > n):
 *   By the Pigeonhole Principle, m flights cannot each receive a distinct gate if m > n.
 *   Therefore, N = 0 unconditionally.
 *
 * Exactness:
 * ----------
 * Uses native BigInt internally for arbitrary precision, ensuring zero integer overflow.
 */

import { computeRookPolynomial } from './rookPolynomialService.js'

/**
 * Compute the permutation P(n, r) = n! / (n - r)! as a BigInt.
 *
 * @param {number|bigint} n - Total available items
 * @param {number|bigint} r - Number of items chosen
 * @returns {bigint} P(n, r)
 */
export const permutationBigInt = (n, r) => {
  const bigN = BigInt(n)
  const bigR = BigInt(r)

  if (bigR < 0n || bigR > bigN) return 0n
  if (bigR === 0n) return 1n

  let result = 1n
  for (let i = 0n; i < bigR; i++) {
    result *= (bigN - i)
  }
  return result
}

/**
 * Calculate exact Inclusion-Exclusion valid assignment count from Rook Polynomial coefficients.
 *
 * @param {Array<number|bigint>|Object} rookInput - Array of coefficients [r0, r1, ...] or result object from computeRookPolynomial
 * @param {number} numRows - Number of flights (m)
 * @param {number} numCols - Number of gates (n)
 * @returns {Object} Structured Inclusion-Exclusion evaluation
 */
export const calculateInclusionExclusion = (rookInput, numRows, numCols) => {
  const m = Number(numRows)
  const n = Number(numCols)

  if (!Number.isInteger(m) || m <= 0 || !Number.isInteger(n) || n <= 0) {
    throw new Error(`Invalid dimensions for Inclusion-Exclusion: ${m} flights × ${n} gates.`)
  }

  // Handle over-constrained case: more flights than gates
  if (m > n) {
    return {
      matrixDimensions: { rows: m, columns: n },
      isSquare: false,
      isOverConstrained: true,
      formula: 'N = 0 (Pigeonhole Principle: flights m > gates n)',
      formulaLatex: 'N = 0 \\quad (m > n)',
      totalPossibleAssignments: 0n,
      validAssignments: 0n,
      invalidAssignments: 0n,
      feasibilityPercentage: 0,
      terms: [],
      positiveTermsSum: 0n,
      negativeTermsSum: 0n,
      degree: 0,
      note: `Cannot assign ${m} flights to ${n} gates injectively because flights exceed available gates.`
    }
  }

  // Extract coefficients array
  let coefficients = []
  if (Array.isArray(rookInput)) {
    coefficients = rookInput
  } else if (rookInput && Array.isArray(rookInput.coefficients)) {
    coefficients = rookInput.coefficients
  } else {
    throw new Error('Invalid rookInput: expected array of coefficients or rook polynomial result object.')
  }

  const isSquare = (m === n)
  const maxDegree = Math.min(m, n)

  // Total possible assignments without any restrictions: P(n, m)
  const totalPossible = permutationBigInt(n, m)

  let validSum = 0n
  let positiveSum = 0n
  let negativeSum = 0n
  const terms = []

  for (let k = 0; k <= maxDegree; k++) {
    const rawCoeff = coefficients[k] ?? 0
    const r_k = BigInt(rawCoeff)
    const isEven = (k % 2 === 0)
    const sign = isEven ? 1 : -1
    const signSymbol = isEven ? '+' : '-'

    // Unrestricted remaining arrangements for unconstrained (m - k) flights across (n - k) gates:
    // P(n - k, m - k) = (n - k)! / (n - m)!
    const remainingPermutations = permutationBigInt(n - k, m - k)
    const termContributionMagnitude = r_k * remainingPermutations
    const signedContribution = isEven ? termContributionMagnitude : -termContributionMagnitude

    if (isEven) {
      positiveSum += termContributionMagnitude
    } else {
      negativeSum += termContributionMagnitude
    }

    validSum += signedContribution

    terms.push({
      k,
      sign,
      signSymbol,
      rookCoefficient: r_k,
      remainingPermutations,
      contribution: signedContribution,
      magnitude: termContributionMagnitude,
      isPositive: isEven,
      cumulativeSum: validSum,
      explanation: isSquare
        ? `(-1)^${k} · r_${k} · (${n} - ${k})! = ${signSymbol}(${r_k.toString()} · ${remainingPermutations.toString()}) = ${signedContribution.toString()}`
        : `(-1)^${k} · r_${k} · P(${n} - ${k}, ${m} - ${k}) = ${signSymbol}(${r_k.toString()} · ${remainingPermutations.toString()}) = ${signedContribution.toString()}`
    })
  }

  // Ensure validSum is never mathematically negative (should not happen for valid restriction matrices)
  const exactValid = validSum >= 0n ? validSum : 0n
  const invalidAssignments = totalPossible >= exactValid ? totalPossible - exactValid : 0n

  let feasibilityPercentage = 0
  if (totalPossible > 0n) {
    // High-precision percentage computation
    const percentageBig = (exactValid * 1000000n) / totalPossible
    feasibilityPercentage = Number(percentageBig) / 10000
  }

  const formula = isSquare
    ? 'N = Σ_{k=0}^n (-1)^k · r_k · (n - k)!'
    : 'N = Σ_{k=0}^m (-1)^k · r_k · P(n - k, m - k)'

  const formulaLatex = isSquare
    ? 'N = \\sum_{k=0}^n (-1)^k \\cdot r_k \\cdot (n - k)!'
    : 'N = \\sum_{k=0}^m (-1)^k \\cdot r_k \\cdot \\frac{(n - k)!}{(n - m)!}'

  return {
    matrixDimensions: { rows: m, columns: n },
    isSquare,
    isOverConstrained: false,
    formula,
    formulaLatex,
    totalPossibleAssignments: totalPossible,
    validAssignments: exactValid,
    invalidAssignments,
    feasibilityPercentage,
    terms,
    positiveTermsSum: positiveSum,
    negativeTermsSum: negativeSum,
    degree: maxDegree
  }
}

/**
 * Compute Inclusion-Exclusion directly from a binary restriction matrix.
 *
 * @param {Array<Array<number>>} matrix - Binary restriction matrix (0 = permitted, 1 = forbidden)
 * @returns {Object} Combined Rook Polynomial and Inclusion-Exclusion result
 */
export const computeInclusionExclusionFromMatrix = (matrix) => {
  const rookResult = computeRookPolynomial(matrix)
  const { rows, columns } = rookResult.matrixDimensions

  const pieResult = calculateInclusionExclusion(rookResult.coefficients, rows, columns)

  return {
    ...pieResult,
    rookPolynomial: rookResult.formattedPolynomial,
    rookCoefficients: rookResult.coefficients,
    forbiddenCellCount: rookResult.forbiddenCellCount,
    permittedCellCount: rookResult.permittedCellCount,
    rookComputeTimeMs: rookResult.computationTimeMs
  }
}

export default {
  permutationBigInt,
  calculateInclusionExclusion,
  computeInclusionExclusionFromMatrix
}
