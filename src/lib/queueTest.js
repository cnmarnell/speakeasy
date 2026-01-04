/**
 * Queue System Test Script
 * Run these functions from the browser console to test the queue system
 */

import { supabase } from './supabase'

// Test 1: Check if queue table exists and is accessible
export async function testQueueTableAccess() {
  console.log('🧪 Test 1: Queue Table Access')

  const { data, error } = await supabase
    .from('submission_queue')
    .select('*')
    .limit(1)

  if (error) {
    console.error('❌ Queue table not accessible:', error.message)
    return false
  }

  console.log('✅ Queue table accessible')
  return true
}

// Test 2: Check queue statistics
export async function testQueueStats() {
  console.log('🧪 Test 2: Queue Statistics')

  const { data, error } = await supabase
    .from('submission_queue')
    .select('status')

  if (error) {
    console.error('❌ Failed to get stats:', error.message)
    return null
  }

  const stats = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    total: data.length
  }

  data.forEach(item => {
    if (stats.hasOwnProperty(item.status)) {
      stats[item.status]++
    }
  })

  console.log('📊 Queue Stats:', stats)
  return stats
}

// Test 3: Trigger the queue processor
export async function testTriggerProcessor() {
  console.log('🧪 Test 3: Trigger Queue Processor')

  try {
    const { data, error } = await supabase.functions.invoke('queue-processor', {
      method: 'POST'
    })

    if (error) {
      console.error('❌ Failed to trigger processor:', error.message)
      return { success: false, error: error.message }
    }

    console.log('✅ Processor response:', data)
    return { success: true, data }
  } catch (err) {
    console.error('❌ Error:', err.message)
    return { success: false, error: err.message }
  }
}

// Test 4: Insert a mock queue item (for testing without real submission)
export async function testInsertMockQueueItem() {
  console.log('🧪 Test 4: Insert Mock Queue Item')

  // First, get a real submission ID if available
  const { data: submissions } = await supabase
    .from('submissions')
    .select('id, video_url')
    .limit(1)

  if (!submissions || submissions.length === 0) {
    console.warn('⚠️ No submissions found. Cannot test queue insertion.')
    console.log('ℹ️ Submit a video first, then run this test again.')
    return null
  }

  const submission = submissions[0]
  console.log('📝 Using submission:', submission.id)

  // Check if already in queue
  const { data: existingQueue } = await supabase
    .from('submission_queue')
    .select('id, status')
    .eq('submission_id', submission.id)
    .single()

  if (existingQueue) {
    console.log('ℹ️ Already in queue with status:', existingQueue.status)
    return existingQueue
  }

  // Insert into queue
  const { data: queueItem, error } = await supabase
    .from('submission_queue')
    .insert([{
      submission_id: submission.id,
      video_url: submission.video_url,
      assignment_title: 'Test Assignment',
      status: 'pending',
      priority: 0
    }])
    .select()
    .single()

  if (error) {
    console.error('❌ Failed to insert:', error.message)
    return null
  }

  console.log('✅ Queue item created:', queueItem)
  return queueItem
}

// Test 5: Full integration test
export async function runFullTest() {
  console.log('🚀 Running Full Queue System Test\n')
  console.log('='.repeat(50))

  // Test 1
  const tableOk = await testQueueTableAccess()
  if (!tableOk) {
    console.log('\n❌ Stopping: Queue table not accessible')
    return
  }

  console.log('')

  // Test 2
  await testQueueStats()
  console.log('')

  // Test 3
  const processorResult = await testTriggerProcessor()
  console.log('')

  // Test 4
  await testInsertMockQueueItem()
  console.log('')

  // Final stats
  console.log('='.repeat(50))
  console.log('📊 Final Queue Stats:')
  await testQueueStats()

  console.log('\n✅ Test complete!')
  console.log('\nNext steps:')
  console.log('1. Submit a real video to test the full flow')
  console.log('2. Check queue stats again to see it added')
  console.log('3. Trigger processor to process it')
  console.log('4. Check submission status for "completed"')
}

// Export for console use
if (typeof window !== 'undefined') {
  window.queueTest = {
    testQueueTableAccess,
    testQueueStats,
    testTriggerProcessor,
    testInsertMockQueueItem,
    runFullTest
  }
  console.log('🧪 Queue test functions loaded. Run: queueTest.runFullTest()')
}
