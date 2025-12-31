/**
 * Chaos Test: Verify Exponential Backoff Timing
 *
 * This test validates that retry delays follow exponential backoff:
 * - 1st retry: ~1 second (±250ms jitter)
 * - 2nd retry: ~2 seconds (±500ms jitter)
 * - 3rd retry: ~4 seconds (±1000ms jitter)
 */

import { utils } from '../../src/lib/apiResilience.js'

async function testExponentialBackoff() {
  console.log('='.repeat(60))
  console.log('🧪 CHAOS TEST: Exponential Backoff Calculation')
  console.log('='.repeat(60))
  console.log('\n📐 Testing backoff delay calculations...\n')

  const tests = [
    { attempt: 0, expectedBase: 1000, name: 'First retry' },
    { attempt: 1, expectedBase: 2000, name: 'Second retry' },
    { attempt: 2, expectedBase: 4000, name: 'Third retry' },
    { attempt: 3, expectedBase: 8000, name: 'Fourth retry' }
  ]

  let allPassed = true

  tests.forEach(test => {
    const delay = utils.calculateBackoff(test.attempt)
    const minExpected = test.expectedBase * 0.75 // -25% jitter
    const maxExpected = test.expectedBase * 1.25 // +25% jitter

    const passed = delay >= minExpected && delay <= maxExpected
    const icon = passed ? '✅' : '❌'

    if (!passed) {
      allPassed = false
    }

    console.log(`${icon} ${test.name} (attempt ${test.attempt}):`)
    console.log(`   Expected: ${test.expectedBase}ms (±25% jitter: ${minExpected.toFixed(0)}-${maxExpected.toFixed(0)}ms)`)
    console.log(`   Got: ${delay}ms`)
    console.log('')
  })

  console.log('='.repeat(60))

  if (allPassed) {
    console.log('🎉 BACKOFF TEST PASSED - All delays within expected range!')
    console.log('='.repeat(60))
    process.exit(0)
  } else {
    console.log('❌ BACKOFF TEST FAILED - Some delays outside expected range')
    console.log('='.repeat(60))
    process.exit(1)
  }
}

testExponentialBackoff()
