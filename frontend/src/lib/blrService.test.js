/**
 * blrService.test.js
 * Unit test suite verifying blrService methods and contracts.
 */

import { blrService } from './blrService.js'

export const runBlrServiceTests = () => {
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

  test('Method Existence: All blrService methods exist', () => {
    const required = [
      'getConfig',
      'getTerminals',
      'getTerminalDetail',
      'getStands',
      'checkCompatibility',
      'getTurnaroundTimeline',
      'verifyAllocationTurnaround',
      'getAlerts',
      'getClock',
      'controlClock'
    ]
    for (const method of required) {
      assert(typeof blrService[method] === 'function', `Missing method: ${method}`)
    }
  })

  return results
}

if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('blrService.test.js')) {
  console.log('Running blrService unit tests...')
  const results = runBlrServiceTests()
  let failures = 0
  for (const r of results) {
    if (r.passed) {
      console.log(`  ✔ PASS: ${r.name}`)
    } else {
      console.error(`  ✖ FAIL: ${r.name} - ${r.error}`)
      failures++
    }
  }
  if (failures > 0) {
    process.exit(1)
  } else {
    console.log(`All ${results.length} blrService tests passed.`)
  }
}
