/**
 * GateWise Client Service — Mathematics Explorer.
 * Connects frontend to /api/v1/math endpoints for ad-hoc combinatorial evaluation.
 */

import { api } from './api'

export const mathExplorerService = {
  /**
   * Evaluate rook polynomial, inclusion-exclusion steps, and valid allocations
   * for an arbitrary square binary restriction matrix.
   */
  async evaluateMatrix(matrix, includeSampleAllocations = true, maxSampleAllocations = 5) {
    const response = await api.post('/math/evaluate', {
      matrix,
      include_sample_allocations: includeSampleAllocations,
      max_sample_allocations: maxSampleAllocations
    })
    return response.data
  },

  /**
   * Retrieve factorial growth table and sample permutations for dimension n.
   */
  async explorePermutations(n, maxSamples = 24) {
    const response = await api.get(`/math/permutations/${n}`, {
      params: { max_samples: maxSamples }
    })
    return response.data
  }
}

export default mathExplorerService
