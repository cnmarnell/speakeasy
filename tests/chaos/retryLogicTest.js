/**
 * Chaos Test: Verify Retry Logic with Mock 429 Responses
 *
 * This test proves that the retry mechanism works by:
 * 1. Mocking the global fetch function
 * 2. Forcing the first 2 calls to return 429 (rate limited)
 * 3. Allowing the 3rd call to return 200 (success)
 * 4. Verifying the retry loop executed correctly
 */

import { fetchWithRetry } from '../../src/lib/apiResilience.js'

// Store original fetch
const originalFetch = global.fetch

// Track fetch call attempts
let attemptCount = 0
const attemptLogs = []

// Mock fetch function
const mockFetch = (url, options) => {
  attemptCount++
  const attempt = attemptCount

  console.log(`\n🧪 Attempt ${attempt}: Calling ${url}`)

  // First 2 attempts: Return 429 Rate Limited
  if (attempt <= 2) {
    console.log(`   ⚠️  Returning 429 (Rate Limited) for attempt ${attempt}`)
    attemptLogs.push({ attempt, status: 429 })

    return Promise.resolve({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      text: () => Promise.resolve(JSON.stringify({
        error: 'Rate limit exceeded',
        retry_after: 1
      }))
    })
  }

  // 3rd attempt: Return 200 Success
  console.log(`   ✅ Returning 200 (Success) for attempt ${attempt}`)
  attemptLogs.push({ attempt, status: 200 })

  return Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve({
      data: 'Success after retries!',
      attempts: attempt
    }),
    text: () => Promise.resolve('Success')
  })
}

// Test function
async function runChaosTest() {
  console.log('='.repeat(60))
  console.log('🧪 CHAOS TEST: Retry Logic with 429 Rate Limiting')
  console.log('='.repeat(60))

  try {
    // Replace global fetch with mock
    global.fetch = mockFetch

    // Reset counter
    attemptCount = 0
    attemptLogs.length = 0

    console.log('\n📡 Testing fetchWithRetry with mock 429 responses...\n')

    // Execute fetch with retry
    const response = await fetchWithRetry(
      () => fetch('https://api.example.com/test', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' })
      }),
      {
        maxAttempts: 3,
        onRetry: (attempt, delay, error) => {
          console.log(`   ⏱️  Waiting ${delay}ms before retry ${attempt}...`)
        }
      }
    )

    // Parse response
    const data = await response.json()

    // Verify results
    console.log('\n' + '='.repeat(60))
    console.log('📊 TEST RESULTS')
    console.log('='.repeat(60))

    console.log(`\n✅ Total Attempts: ${attemptCount}`)
    console.log(`✅ Final Response Status: ${response.status}`)
    console.log(`✅ Response Data:`, data)

    console.log('\n📋 Attempt Log:')
    attemptLogs.forEach(log => {
      const emoji = log.status === 429 ? '⚠️ ' : '✅'
      console.log(`   ${emoji} Attempt ${log.attempt}: Status ${log.status}`)
    })

    // Validate test expectations
    console.log('\n🔍 Validating Expectations:')

    const checks = [
      {
        name: 'Made exactly 3 attempts',
        passed: attemptCount === 3,
        expected: 3,
        actual: attemptCount
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
        name: 'Final response was successful',
        passed: response.ok === true,
        expected: true,
        actual: response.ok
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

    if (allPassed) {
      console.log('\n' + '='.repeat(60))
      console.log('🎉 CHAOS TEST PASSED - Retry Logic Working Correctly!')
      console.log('='.repeat(60))
      process.exit(0)
    } else {
      console.log('\n' + '='.repeat(60))
      console.log('❌ CHAOS TEST FAILED - See errors above')
      console.log('='.repeat(60))
      process.exit(1)
    }

  } catch (error) {
    console.error('\n❌ TEST FAILED WITH ERROR:')
    console.error(error)
    process.exit(1)
  } finally {
    // Restore original fetch
    global.fetch = originalFetch
    console.log('\n♻️  Restored original fetch function\n')
  }
}

// Run test
runChaosTest()
