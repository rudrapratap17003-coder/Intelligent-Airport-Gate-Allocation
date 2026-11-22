import React from 'react'

/**
 * lazyWithRetry
 * Dynamically imports a React component and retries once on network failure
 * (e.g. hash mismatch caused by an ongoing production update).
 *
 * @param {Function} factory - Dynamic import function, e.g. () => import('./pages/Dashboard')
 * @returns {React.LazyExoticComponent}
 */
export function lazyWithRetry(factory) {
  return React.lazy(async () => {
    try {
      return await factory()
    } catch (err) {
      console.warn('Dynamic chunk load failed, attempting single reload...', err)
      const pathname = typeof window !== 'undefined' ? window.location.pathname : 'ssr'
      const retryKey = `gw_chunk_retry_${pathname}`
      const hasRetried = typeof sessionStorage !== 'undefined' && sessionStorage.getItem(retryKey)

      if (!hasRetried && typeof window !== 'undefined') {
        sessionStorage.setItem(retryKey, 'true')
        window.location.reload()
        return new Promise(() => {}) // Block until reload
      }

      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(retryKey)
      }
      throw err
    }
  })
}

export default lazyWithRetry
