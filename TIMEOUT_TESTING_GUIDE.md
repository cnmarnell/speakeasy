# Timeout Testing Guide

This guide explains how to verify that the 30-second timeout is working correctly for all AI operations.

## What Was Changed

We added a **30-second timeout** to prevent AI API calls from hanging indefinitely. The timeout applies to:

1. **Bedrock Agent** (`src/lib/bedrockAgent.js`) - AWS AI speech analysis
2. **Deepgram** (`src/lib/deepgram.js`) - Audio transcription (both proxy and direct)

### How It Works

Each AI API call now uses an `AbortController` with a 30-second timeout:

```javascript
const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 30000) // 30 seconds

fetch(url, {
  signal: controller.signal,
  // ... other options
}).finally(() => clearTimeout(timeout))
```

**Important:** The timeout applies **per retry attempt**, not total. With 3 retry attempts, the maximum time before complete failure is ~90 seconds (3 × 30 seconds).

---

## Testing Methods

You have **two testing approaches**: automated tests and manual verification.

---

## Method 1: Automated Tests (Recommended)

Use the test utility we created to verify timeout behavior with simulated slow APIs.

### Quick Test (30 seconds)

Run this in your browser console while the app is open:

```javascript
// Open browser console (F12 or Cmd+Option+I)
// Import and run quick tests
import { runQuickTimeoutTests } from './src/lib/timeoutTest.js'

const result = await runQuickTimeoutTests()
console.log('Test Results:', result)
```

**Expected Output:**
```
🚀 Running quick timeout tests...

=== TEST 1: Fast API Call ===
✅ TEST PASSED: Fast request completed in 2347ms

=== TEST 2: Timeout After 30 Seconds ===
✅ TEST PASSED: Timeout worked correctly! Aborted after 30124ms

=== TEST SUMMARY ===
Fast API Test: ✅ PASS - Request completed successfully in 2347ms
Timeout Test: ✅ PASS - Timeout worked correctly! Aborted after 30124ms

🎉 ALL TESTS PASSED!
```

### Full Test Suite (90+ seconds)

This includes retry behavior testing:

```javascript
import { runAllTimeoutTests } from './src/lib/timeoutTest.js'

const result = await runAllTimeoutTests()
console.log('Full Test Results:', result)
```

**Expected Output:**
```
🚀 Starting comprehensive timeout tests...

=== TEST 1: Fast API Call ===
✅ TEST PASSED: Fast request completed in 2211ms

=== TEST 2: Timeout After 30 Seconds ===
✅ TEST PASSED: Timeout worked correctly! Aborted after 30089ms

=== TEST 3: Retry with Timeout (will take ~90 seconds) ===
⏳ Please wait... This test will take about 90 seconds
Test completed in 91234ms (expected ~90000ms)
✅ TEST PASSED: All 3 retries timed out as expected

=== TEST SUMMARY ===
Fast API Test: ✅ PASS
Timeout Test: ✅ PASS
Retry Test: ✅ PASS

🎉 ALL TESTS PASSED!
```

### Individual Tests

You can also run individual tests:

```javascript
import { testTimeoutFailure, testTimeoutSuccess, testTimeoutWithRetry } from './src/lib/timeoutTest.js'

// Test 1: Fast API (should succeed)
await testTimeoutSuccess()

// Test 2: Slow API (should timeout after 30s)
await testTimeoutFailure()

// Test 3: Retry behavior (takes ~90s)
await testTimeoutWithRetry()
```

---

## Method 2: Manual Verification with Real Services

Test with the actual AI services to ensure timeouts work in production.

### Prerequisites

1. Ensure you have valid API keys configured:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_DEEPGRAM_API_KEY` (if testing direct Deepgram)

2. Deploy a modified version of the edge function that deliberately delays responses (for testing only).

### Test Bedrock Timeout

**Option A: Monitor Console Logs**

1. Submit a recording normally
2. Open browser console (F12)
3. Look for timeout messages in the console:

```
Calling Bedrock Agent function...
⚠️ API call failed: The user aborted a request. Retry 1/3 in 1000ms...
⚠️ API call failed: The user aborted a request. Retry 2/3 in 2000ms...
⚠️ API call failed: The user aborted a request. Retry 3/3 in 4000ms...
❌ API call failed after 3 attempts
```

4. Measure time from "Calling Bedrock Agent function..." to final error
   - Should be ~30 seconds per attempt
   - Total: ~90 seconds with retries

**Option B: Create a Test Edge Function**

Create `supabase/functions/slow-bedrock-test/index.ts`:

```typescript
Deno.serve(async (req) => {
  console.log('Received request, waiting 60 seconds...')

  // Deliberately delay for 60 seconds (exceeds 30s timeout)
  await new Promise(resolve => setTimeout(resolve, 60000))

  return new Response(JSON.stringify({
    speechContent: "This should never arrive",
    contentScore: 2
  }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

Deploy:
```bash
supabase functions deploy slow-bedrock-test
```

Modify `bedrockAgent.js` temporarily to use the test endpoint:
```javascript
// Temporarily change this line for testing:
const proxyUrl = `${supabaseUrl}/functions/v1/slow-bedrock-test`
```

Submit a recording and verify it times out after 30 seconds.

### Test Deepgram Timeout

Create a large video file (10+ minutes) to test timeout behavior:

1. Record a 10-minute video
2. Submit it for transcription
3. Monitor console logs for timeout messages
4. Verify that transcription fails after 30 seconds with "AbortError"

**Expected Console Output:**
```
Extracting audio from video for proxy API...
Making proxy API call to Supabase Edge Function...
⚠️ API call failed: The user aborted a request. Retry 1/3...
```

---

## Interpreting Results

### ✅ Success Indicators

1. **Timeout triggers within 30-32 seconds** per attempt (small variance is normal)
2. **AbortError or "aborted" message** appears in error logs
3. **Retry logic activates** (you see "Retry 1/3", "Retry 2/3", etc.)
4. **Fallback response returned** after all retries fail (for Bedrock)

### ❌ Failure Indicators

1. **Request hangs for 60+ seconds** without timing out
2. **No "AbortError" in console** logs
3. **Timeout does NOT trigger** after 30 seconds
4. **Browser freezes or becomes unresponsive** (indicates timeout not working)

---

## Troubleshooting

### Test shows timeout NOT working

**Symptoms:**
- Request completes or hangs beyond 30 seconds
- No AbortError in console

**Solutions:**
1. Verify the code changes were saved:
   ```bash
   grep -n "AbortController" src/lib/bedrockAgent.js
   grep -n "AbortController" src/lib/deepgram.js
   ```

2. Check if browser supports AbortController:
   ```javascript
   console.log('AbortController supported:', typeof AbortController !== 'undefined')
   ```

3. Ensure you're testing the built version (not cached):
   - Clear browser cache (Cmd+Shift+R or Ctrl+Shift+R)
   - Rebuild the app: `npm run build`

### Test shows error but not AbortError

**Symptoms:**
- Test fails with different error (e.g., network error, 500 error)

**This is OK!** The goal is to prevent indefinite hangs. If the request fails quickly (< 30s) with a different error, that's acceptable.

### Retry behavior not visible

**Symptoms:**
- Only 1 attempt happens, no retries

**Check:**
- Verify `maxAttempts: 3` is set in all fetch calls
- Look for non-retryable errors (401, 403, 404) that skip retries
- Check `apiResilience.js` for retry conditions

---

## Production Monitoring

Once deployed, monitor these metrics to ensure timeouts are working:

1. **Average processing time** per submission
   - Should be < 90 seconds (3 attempts × 30s timeout)
   - If regularly exceeding 90s, timeouts may not be working

2. **Error rates** with "AbortError" or timeout messages
   - Indicates services are slow and timeouts are triggering
   - Consider investigating service performance

3. **User complaints** about "stuck" submissions
   - If users report submissions hang forever → timeout not working
   - If users report submissions fail after ~30-90s → timeout is working

---

## Quick Reference Commands

### Run Quick Test (30 seconds)
```javascript
import { runQuickTimeoutTests } from './src/lib/timeoutTest.js'
await runQuickTimeoutTests()
```

### Run Full Test (90+ seconds)
```javascript
import { runAllTimeoutTests } from './src/lib/timeoutTest.js'
await runAllTimeoutTests()
```

### Check Timeout Code is Present
```bash
grep -A5 "AbortController" src/lib/bedrockAgent.js
grep -A5 "AbortController" src/lib/deepgram.js
```

### Monitor Live Timeouts in Production
```javascript
// Add to browser console while using the app
window.addEventListener('unhandledrejection', event => {
  if (event.reason?.name === 'AbortError') {
    console.log('✅ Timeout triggered:', event.reason)
  }
})
```

---

## Next Steps

After verifying timeouts work:

1. ✅ Test with 5-10 concurrent submissions
2. ✅ Monitor error rates in production
3. ✅ Consider adjusting timeout duration if needed:
   - Decrease to 15-20s for faster failure detection
   - Increase to 45-60s for slow network environments
4. ✅ Implement queue system to prevent API overload (see scalability plan)

---

## Support

If you encounter issues:

1. Check browser console for error messages
2. Verify API keys are configured correctly
3. Test with the automated tests first before manual testing
4. Monitor network tab in DevTools for actual request timing
