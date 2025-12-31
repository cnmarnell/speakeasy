/**
 * API Resilience Utility
 *
 * Provides retry logic with exponential backoff and jitter to handle:
 * - Rate limiting (HTTP 429)
 * - Server errors (HTTP 5xx)
 * - Network timeouts and transient failures
 *
 * This prevents API call failures from cascading and overwhelming external services.
 */

/**
 * Sleep utility with jitter to prevent thundering herd problem
 * @param {number} ms - Base milliseconds to sleep
 * @returns {Promise<void>}
 */
const sleep = (ms) => {
  // Add jitter (±25% randomization) to prevent synchronized retries
  const jitter = ms * 0.25 * (Math.random() - 0.5) * 2
  const actualDelay = Math.max(0, ms + jitter)
  return new Promise(resolve => setTimeout(resolve, actualDelay))
}

/**
 * Determine if an error is retryable
 * @param {Response|Error} error - The error or response object
 * @returns {boolean}
 */
const isRetryableError = (error) => {
  // If it's a Response object, check status code
  if (error && typeof error.status === 'number') {
    // Retry on rate limits (429) and server errors (5xx)
    return error.status === 429 || (error.status >= 500 && error.status < 600)
  }

  // If it's a network error or timeout, retry
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true
  }

  // If it's an AbortError, retry
  if (error.name === 'AbortError') {
    return true
  }

  return false
}

/**
 * Calculate exponential backoff delay
 * @param {number} attemptNumber - Current attempt number (0-indexed)
 * @returns {number} Delay in milliseconds
 */
const calculateBackoff = (attemptNumber) => {
  // Exponential backoff: 1s, 2s, 4s, 8s, etc.
  // Formula: base_delay * (2 ^ attemptNumber)
  const baseDelay = 1000 // 1 second
  const maxDelay = 32000 // Cap at 32 seconds

  const delay = baseDelay * Math.pow(2, attemptNumber)
  return Math.min(delay, maxDelay)
}

/**
 * Retry a fetch operation with exponential backoff
 *
 * Usage:
 *   const response = await fetchWithRetry(() =>
 *     fetch('https://api.example.com/data', { method: 'POST', body: data })
 *   )
 *
 * @param {Function} fetchFn - Function that returns a fetch Promise
 * @param {Object} options - Configuration options
 * @param {number} options.maxAttempts - Maximum number of retry attempts (default: 3)
 * @param {Function} options.onRetry - Callback for retry events
 * @returns {Promise<Response>} The successful response
 * @throws {Error} If all retry attempts fail
 */
export const fetchWithRetry = async (fetchFn, options = {}) => {
  const {
    maxAttempts = 3,
    onRetry = null
  } = options

  let lastError = null

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // Execute the fetch function
      const response = await fetchFn()

      // If response is ok, return it immediately
      if (response.ok) {
        if (attempt > 0) {
          console.log(`✅ API call succeeded after ${attempt} retries`)
        }
        return response
      }

      // Check if we should retry this error
      if (!isRetryableError(response)) {
        const errorType = classifyError(response)
        console.error(`❌ Non-retryable error (status ${response.status} - ${errorType})`)
        // Extract error details and throw instead of returning
        const errorText = await response.text()
        throw new Error(`API request failed (${response.status} - ${errorType}): ${errorText}`)
      }

      // This is a retryable error
      lastError = response

      // If this was our last attempt, don't wait
      if (attempt === maxAttempts - 1) {
        break
      }

      // Calculate backoff delay
      const delay = calculateBackoff(attempt)

      console.warn(
        `⚠️  API call failed (status ${response.status}). ` +
        `Retry ${attempt + 1}/${maxAttempts} in ${delay}ms...`
      )

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, delay, response)
      }

      // Wait before retrying
      await sleep(delay)

    } catch (error) {
      // Network error or exception thrown
      lastError = error

      // Check if we should retry
      if (!isRetryableError(error)) {
        console.error(`❌ Non-retryable error:`, error.message)
        throw error
      }

      // If this was our last attempt, throw the error
      if (attempt === maxAttempts - 1) {
        break
      }

      // Calculate backoff delay
      const delay = calculateBackoff(attempt)

      console.warn(
        `⚠️  API call failed: ${error.message}. ` +
        `Retry ${attempt + 1}/${maxAttempts} in ${delay}ms...`
      )

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, delay, error)
      }

      // Wait before retrying
      await sleep(delay)
    }
  }

  // All attempts failed
  console.error(`❌ API call failed after ${maxAttempts} attempts`)

  if (lastError instanceof Response) {
    // Extract error details and throw instead of returning
    const errorType = classifyError(lastError)
    const errorText = await lastError.text()
    throw new Error(`API request failed after ${maxAttempts} retries (${lastError.status} - ${errorType}): ${errorText}`)
  } else {
    throw lastError // Throw the error
  }
}

/**
 * Specialized retry wrapper for JSON API calls
 * Handles both fetch and JSON parsing with retries
 *
 * @param {Function} fetchFn - Function that returns a fetch Promise
 * @param {Object} options - Configuration options (same as fetchWithRetry)
 * @returns {Promise<any>} Parsed JSON response
 * @throws {Error} If fetch or JSON parsing fails after retries
 */
export const fetchJsonWithRetry = async (fetchFn, options = {}) => {
  const response = await fetchWithRetry(fetchFn, options)

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `API request failed with status ${response.status}: ${errorText}`
    )
  }

  try {
    return await response.json()
  } catch (error) {
    console.error('Failed to parse JSON response:', error)
    throw new Error(`Invalid JSON response: ${error.message}`)
  }
}

/**
 * Classify error type for better error handling
 * @param {Response|Error} error - The error or response object
 * @returns {string} Error classification
 */
export const classifyError = (error) => {
  if (error instanceof Response || error?.status) {
    const status = error.status
    if (status === 401 || status === 403) return 'AUTH_ERROR'
    if (status === 404) return 'NOT_FOUND'
    if (status === 429) return 'RATE_LIMITED'
    if (status >= 500) return 'SERVER_ERROR'
    return 'CLIENT_ERROR'
  }
  if (error?.name === 'AbortError') return 'TIMEOUT'
  if (error instanceof TypeError && error.message?.includes('fetch')) return 'NETWORK_ERROR'
  return 'UNKNOWN_ERROR'
}

/**
 * Create a rate-limited version of a function
 * Useful for wrapping entire API client methods
 *
 * @param {Function} fn - Async function to wrap
 * @param {Object} options - Retry options
 * @returns {Function} Wrapped function with retry logic
 */
export const withRetry = (fn, options = {}) => {
  return async (...args) => {
    return fetchWithRetry(() => fn(...args), options)
  }
}

// Export utilities for testing and advanced use cases
export const utils = {
  sleep,
  isRetryableError,
  calculateBackoff
}
