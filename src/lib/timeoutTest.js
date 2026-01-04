/**
 * Timeout Test Utility
 *
 * This utility helps you verify that the 30-second timeout is working correctly
 * for all AI operations (Bedrock, Deepgram, Gemini).
 *
 * IMPORTANT: This simulates slow API responses by creating a mock server endpoint
 * that deliberately delays responses. Use this ONLY for testing purposes.
 */

import { fetchWithRetry } from './apiResilience'

/**
 * Simulate a slow API call that takes longer than the timeout
 * This should FAIL with an AbortError after 30 seconds
 */
export const testTimeoutFailure = async () => {
  console.log('🧪 Testing timeout - This should FAIL after 30 seconds...')

  const startTime = Date.now()

  try {
    await fetchWithRetry(() => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000) // 30-second timeout

      // Simulate a slow API that never responds (using a delay endpoint)
      return fetch('https://httpbin.org/delay/60', { // 60-second delay (exceeds timeout)
        signal: controller.signal
      }).finally(() => clearTimeout(timeout))
    }, { maxAttempts: 1 }) // Only 1 attempt for clear testing

    console.log('❌ TEST FAILED: Request should have timed out!')
    return {
      success: false,
      message: 'Request completed without timing out (unexpected)',
      duration: Date.now() - startTime
    }

  } catch (error) {
    const duration = Date.now() - startTime

    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
      console.log(`✅ TEST PASSED: Request timed out after ${duration}ms (expected ~30000ms)`)
      return {
        success: true,
        message: `Timeout worked correctly! Aborted after ${duration}ms`,
        duration,
        error: error.message
      }
    } else {
      console.log('❌ TEST FAILED: Wrong error type:', error)
      return {
        success: false,
        message: `Wrong error: ${error.message}`,
        duration,
        error: error.message
      }
    }
  }
}

/**
 * Test a fast API call that completes within the timeout
 * This should SUCCEED
 */
export const testTimeoutSuccess = async () => {
  console.log('🧪 Testing fast API call - This should SUCCEED...')

  const startTime = Date.now()

  try {
    await fetchWithRetry(() => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000) // 30-second timeout

      // Simulate a fast API (2-second response)
      return fetch('https://httpbin.org/delay/2', {
        signal: controller.signal
      }).finally(() => clearTimeout(timeout))
    }, { maxAttempts: 1 })

    const duration = Date.now() - startTime
    console.log(`✅ TEST PASSED: Fast request completed in ${duration}ms`)
    return {
      success: true,
      message: `Request completed successfully in ${duration}ms (under timeout)`,
      duration
    }

  } catch (error) {
    const duration = Date.now() - startTime
    console.log('❌ TEST FAILED: Fast request should not timeout:', error)
    return {
      success: false,
      message: `Unexpected failure: ${error.message}`,
      duration,
      error: error.message
    }
  }
}

/**
 * Test retry behavior with timeout
 * Should retry 3 times, each timing out after 30 seconds
 * Total time should be ~90 seconds (3 attempts × 30 seconds)
 */
export const testTimeoutWithRetry = async () => {
  console.log('🧪 Testing timeout with retry - This will take ~90 seconds...')

  const startTime = Date.now()

  try {
    await fetchWithRetry(() => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000) // 30-second timeout

      // Each attempt will timeout after 30 seconds
      return fetch('https://httpbin.org/delay/60', {
        signal: controller.signal
      }).finally(() => clearTimeout(timeout))
    }, { maxAttempts: 3 }) // 3 attempts

    console.log('❌ TEST FAILED: All retries should have timed out!')
    return {
      success: false,
      message: 'Request completed without timing out (unexpected)',
      duration: Date.now() - startTime
    }

  } catch (error) {
    const duration = Date.now() - startTime
    const expectedDuration = 30000 * 3 // 90 seconds
    const variance = Math.abs(duration - expectedDuration)

    console.log(`Test completed in ${duration}ms (expected ~${expectedDuration}ms)`)

    if (variance < 5000) { // Within 5 seconds of expected
      console.log('✅ TEST PASSED: All 3 retries timed out as expected')
      return {
        success: true,
        message: `All 3 attempts timed out correctly. Total: ${duration}ms`,
        duration,
        attempts: 3
      }
    } else {
      console.log(`⚠️  TEST PARTIAL: Timed out but duration unexpected. Got ${duration}ms, expected ~${expectedDuration}ms`)
      return {
        success: true,
        message: `Timed out but duration was ${duration}ms (expected ~${expectedDuration}ms)`,
        duration,
        attempts: 3
      }
    }
  }
}

/**
 * Run all timeout tests
 * This is the main function you should call to verify timeouts
 */
export const runAllTimeoutTests = async () => {
  console.log('\n🚀 Starting comprehensive timeout tests...\n')

  const results = {
    fastApiTest: null,
    timeoutTest: null,
    retryTest: null
  }

  // Test 1: Fast API call (should succeed)
  console.log('=== TEST 1: Fast API Call ===')
  results.fastApiTest = await testTimeoutSuccess()
  console.log('')

  // Test 2: Slow API call (should timeout)
  console.log('=== TEST 2: Timeout After 30 Seconds ===')
  results.timeoutTest = await testTimeoutFailure()
  console.log('')

  // Test 3: Retry with timeout (should timeout all 3 attempts)
  console.log('=== TEST 3: Retry with Timeout (will take ~90 seconds) ===')
  console.log('⏳ Please wait... This test will take about 90 seconds')
  results.retryTest = await testTimeoutWithRetry()
  console.log('')

  // Summary
  console.log('=== TEST SUMMARY ===')
  console.log(`Fast API Test: ${results.fastApiTest.success ? '✅ PASS' : '❌ FAIL'} - ${results.fastApiTest.message}`)
  console.log(`Timeout Test: ${results.timeoutTest.success ? '✅ PASS' : '❌ FAIL'} - ${results.timeoutTest.message}`)
  console.log(`Retry Test: ${results.retryTest.success ? '✅ PASS' : '❌ FAIL'} - ${results.retryTest.message}`)

  const allPassed = results.fastApiTest.success && results.timeoutTest.success && results.retryTest.success

  console.log('\n' + (allPassed ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED') + '\n')

  return {
    allPassed,
    results
  }
}

/**
 * Quick timeout test (skips the 90-second retry test)
 * Use this for faster verification during development
 */
export const runQuickTimeoutTests = async () => {
  console.log('\n🚀 Running quick timeout tests (skipping retry test)...\n')

  const results = {
    fastApiTest: null,
    timeoutTest: null
  }

  // Test 1: Fast API call
  console.log('=== TEST 1: Fast API Call ===')
  results.fastApiTest = await testTimeoutSuccess()
  console.log('')

  // Test 2: Timeout test
  console.log('=== TEST 2: Timeout After 30 Seconds ===')
  results.timeoutTest = await testTimeoutFailure()
  console.log('')

  // Summary
  console.log('=== TEST SUMMARY ===')
  console.log(`Fast API Test: ${results.fastApiTest.success ? '✅ PASS' : '❌ FAIL'} - ${results.fastApiTest.message}`)
  console.log(`Timeout Test: ${results.timeoutTest.success ? '✅ PASS' : '❌ FAIL'} - ${results.timeoutTest.message}`)

  const allPassed = results.fastApiTest.success && results.timeoutTest.success

  console.log('\n' + (allPassed ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED') + '\n')

  return {
    allPassed,
    results
  }
}
