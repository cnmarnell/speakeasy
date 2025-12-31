#!/usr/bin/env node

/**
 * STANDALONE RETRY LOGIC TEST
 *
 * This script simulates a 429 Rate Limit scenario by mocking the fetch function.
 *
 * SCENARIO:
 * - Attempt 1: Returns 429 (Rate Limited)
 * - Attempt 2: Returns 429 (Rate Limited)
 * - Attempt 3: Returns 200 (Success)
 *
 * VALIDATES:
 * - Retry loop executes 3 times
 * - Exponential backoff delays are applied (1s, 2s)
 * - Final request succeeds
 *
 * RUN THIS TEST:
 * node scripts/test-retry-logic.js
 */

import { fetchWithRetry } from '../src/lib/apiResilience.js'

console.log('╔═══════════════════════════════════════════════════════════╗')
console.log('║     MOCK RETRY LOGIC TEST - Simulating 429 Errors        ║')
console.log('╚═══════════════════════════════════════════════════════════╝\n')

// Store original fetch
const originalFetch = global.fetch

// Track attempts and timing
let attemptNumber = 0
const attemptTimestamps = []
const attemptLogs = []

// Mock fetch that returns 429 twice, then succeeds
function mockFetchWith429(url, options) {
  attemptNumber++
  const timestamp = Date.now()
  attemptTimestamps.push(timestamp)

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`🔄 ATTEMPT ${attemptNumber}`)
  console.log(`${'─'.repeat(60)}`)
  console.log(`URL: ${url}`)
  console.log(`Method: ${options?.method || 'GET'}`)
  console.log(`Timestamp: ${new Date(timestamp).toISOString()}`)

  // First 2 attempts: Return 429 Rate Limited
  if (attemptNumber <= 2) {
    console.log(`\n⚠️  MOCK RESPONSE: 429 Too Many Requests`)
    console.log(`    (Simulating rate limit - attempt ${attemptNumber}/3)`)

    attemptLogs.push({
      attempt: attemptNumber,
      status: 429,
      timestamp,
      description: 'Rate Limited'
    })

    return Promise.resolve({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      headers: new Headers({
        'Content-Type': 'application/json',
        'Retry-After': '1'
      }),
      text: () => Promise.resolve(JSON.stringify({
        error: {
          message: 'Rate limit exceeded',
          type: 'rate_limit_error',
          retry_after: 1
        }
      })),
      json: () => Promise.resolve({
        error: {
          message: 'Rate limit exceeded',
          type: 'rate_limit_error'
        }
      })
    })
  }

  // 3rd attempt: Return 200 Success
  console.log(`\n✅ MOCK RESPONSE: 200 OK`)
  console.log(`    (Success after ${attemptNumber - 1} retries!)`)

  attemptLogs.push({
    attempt: attemptNumber,
    status: 200,
    timestamp,
    description: 'Success'
  })

  return Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({
      'Content-Type': 'application/json'
    }),
    text: () => Promise.resolve('{"success": true}'),
    json: () => Promise.resolve({
      success: true,
      message: 'Request completed successfully after retries',
      attempts: attemptNumber,
      data: {
        transcript: 'This is a test transcript',
        duration: 30,
        confidence: 0.95
      }
    })
  })
}

// Run the test
async function runRetryTest() {
  try {
    console.log('📝 Test Setup:')
    console.log('   - Mock API will return 429 for attempts 1-2')
    console.log('   - Mock API will return 200 for attempt 3')
    console.log('   - Expected: 3 total attempts with exponential backoff\n')

    // Replace global fetch
    global.fetch = mockFetchWith429

    // Reset state
    attemptNumber = 0
    attemptTimestamps.length = 0
    attemptLogs.length = 0

    const startTime = Date.now()

    console.log('🚀 Starting retry test...\n')

    // Execute fetchWithRetry
    const response = await fetchWithRetry(
      () => fetch('https://api.deepgram.com/v1/listen', {
        method: 'POST',
        headers: {
          'Authorization': 'Token test_key',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: 'https://example.com/test.mp3' })
      }),
      {
        maxAttempts: 3,
        onRetry: (retryAttempt, delay, error) => {
          console.log(`\n⏱️  BACKOFF DELAY: ${delay}ms before retry ${retryAttempt}`)
          console.log(`    Expected: ~${Math.pow(2, retryAttempt - 1) * 1000}ms (±25% jitter)`)
        }
      }
    )

    const endTime = Date.now()
    const totalDuration = endTime - startTime

    // Parse final response
    const data = await response.json()

    // Display results
    console.log('\n\n' + '═'.repeat(60))
    console.log('📊 TEST RESULTS')
    console.log('═'.repeat(60))

    console.log('\n✅ Final Response:')
    console.log(`   Status: ${response.status} ${response.statusText}`)
    console.log(`   Data:`, JSON.stringify(data, null, 2).split('\n').map(line => `   ${line}`).join('\n'))

    console.log('\n📋 Attempt Summary:')
    attemptLogs.forEach((log, index) => {
      const emoji = log.status === 429 ? '⚠️ ' : '✅'
      const timeDiff = index > 0 ? attemptTimestamps[index] - attemptTimestamps[index - 1] : 0
      console.log(`   ${emoji} Attempt ${log.attempt}: ${log.status} ${log.description}`)
      if (timeDiff > 0) {
        console.log(`      ↳ Delay from previous: ${timeDiff}ms`)
      }
    })

    console.log('\n⏱️  Timing Analysis:')
    console.log(`   Total Duration: ${totalDuration}ms`)
    console.log(`   Total Attempts: ${attemptNumber}`)
    console.log(`   Expected Duration: ~3000ms (1s + 2s delays)`)

    // Validate results
    console.log('\n🔍 Validation:')
    const checks = [
      {
        name: 'Made exactly 3 attempts',
        passed: attemptNumber === 3,
        expected: 3,
        actual: attemptNumber
      },
      {
        name: 'First attempt returned 429',
        passed: attemptLogs[0]?.status === 429,
        expected: 429,
        actual: attemptLogs[0]?.status
      },
      {
        name: 'Second attempt returned 429',
        passed: attemptLogs[1]?.status === 429,
        expected: 429,
        actual: attemptLogs[1]?.status
      },
      {
        name: 'Third attempt returned 200',
        passed: attemptLogs[2]?.status === 200,
        expected: 200,
        actual: attemptLogs[2]?.status
      },
      {
        name: 'Final response is successful',
        passed: response.ok === true,
        expected: true,
        actual: response.ok
      },
      {
        name: 'Total duration reasonable (2500-4000ms)',
        passed: totalDuration >= 2500 && totalDuration <= 4000,
        expected: '2500-4000ms',
        actual: `${totalDuration}ms`
      }
    ]

    let allPassed = true
    checks.forEach(check => {
      const icon = check.passed ? '✅' : '❌'
      console.log(`   ${icon} ${check.name}`)
      if (!check.passed) {
        console.log(`      Expected: ${check.expected}, Got: ${check.actual}`)
        allPassed = false
      }
    })

    console.log('\n' + '═'.repeat(60))
    if (allPassed) {
      console.log('🎉 SUCCESS: Retry logic is working correctly!')
      console.log('═'.repeat(60))
      console.log('\n✅ Key Observations:')
      console.log('   • 429 errors triggered retry mechanism')
      console.log('   • Exponential backoff delays were applied')
      console.log('   • Request succeeded after 2 retries')
      console.log('   • Total time matches expected backoff pattern\n')
      process.exit(0)
    } else {
      console.log('❌ FAILURE: Retry logic did not work as expected')
      console.log('═'.repeat(60))
      console.log('\n⚠️  Please review the validation errors above\n')
      process.exit(1)
    }

  } catch (error) {
    console.error('\n\n❌ TEST FAILED WITH ERROR:')
    console.error('═'.repeat(60))
    console.error(error)
    console.error('\nStack trace:')
    console.error(error.stack)
    process.exit(1)
  } finally {
    // Restore original fetch
    global.fetch = originalFetch
    console.log('\n♻️  Restored original fetch function\n')
  }
}

// Run the test
runRetryTest()
