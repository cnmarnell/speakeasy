import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Configuration
const MAX_CONCURRENT = 5;
const LOCK_TIMEOUT_MS = 5 * 60 * 1000;

interface QueueItem {
  id: string;
  submission_id: string;
  status: string;
  attempts: number;
  max_attempts: number;
  priority: number;
  created_at: string;
  processing_started_at: string | null;
  error_message: string | null;
  assignment_title: string | null;
  video_url: string | null;
}

interface ProcessResult {
  success: boolean;
  error?: string;
  queueItemId: string;
  submissionId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[Queue Processor] Starting...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Clean up stale jobs
    const staleThreshold = new Date(Date.now() - LOCK_TIMEOUT_MS).toISOString();
    await supabase
      .from('submission_queue')
      .update({ status: 'pending', error_message: 'Reset: processing timed out' })
      .eq('status', 'processing')
      .lt('processing_started_at', staleThreshold);

    // Count currently processing
    const { count: processingCount } = await supabase
      .from('submission_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'processing');

    const availableSlots = Math.max(0, MAX_CONCURRENT - (processingCount || 0));

    if (availableSlots === 0) {
      return new Response(
        JSON.stringify({ message: 'Queue at capacity', processing: processingCount }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch pending items
    const { data: pendingItems } = await supabase
      .from('submission_queue')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(availableSlots);

    if (!pendingItems || pendingItems.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending items', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Lock items
    const itemIds = pendingItems.map(item => item.id);
    await supabase
      .from('submission_queue')
      .update({ status: 'processing', processing_started_at: new Date().toISOString() })
      .in('id', itemIds);

    // Process concurrently
    const results = await Promise.allSettled(
      pendingItems.map(item => processQueueItem(supabase, item, supabaseUrl))
    );

    const summary = {
      total: results.length,
      succeeded: results.filter(r => r.status === 'fulfilled' && (r.value as ProcessResult).success).length,
      failed: results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !(r.value as ProcessResult).success)).length,
      results: results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: r.reason?.message })
    };

    return new Response(
      JSON.stringify(summary),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Queue Processor] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processQueueItem(
  supabase: ReturnType<typeof createClient>,
  item: QueueItem,
  supabaseUrl: string
): Promise<ProcessResult> {
  const result: ProcessResult = {
    success: false,
    queueItemId: item.id,
    submissionId: item.submission_id
  };

  try {
    console.log(`[Queue ${item.id}] Processing submission ${item.submission_id}`);

    // Update submission to processing
    await supabase
      .from('submissions')
      .update({ status: 'processing', processing_started_at: new Date().toISOString() })
      .eq('id', item.submission_id);

    // Get submission details
    const { data: submission } = await supabase
      .from('submissions')
      .select('*, assignments(title)')
      .eq('id', item.submission_id)
      .single();

    if (!submission) throw new Error('Submission not found');

    const videoUrl = item.video_url || submission.video_url;
    const assignmentTitle = item.assignment_title || submission.assignments?.title || 'Speech Assignment';

    if (!videoUrl) throw new Error('No video URL');

    // Fetch video
    console.log(`[Queue ${item.id}] Fetching video...`);
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) throw new Error(`Failed to fetch video: ${videoResponse.status}`);
    const videoBlob = await videoResponse.arrayBuffer();

    // Transcribe with Deepgram
    console.log(`[Queue ${item.id}] Transcribing...`);
    const deepgramResponse = await fetch(`${supabaseUrl}/functions/v1/deepgram-proxy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'audio/webm'
      },
      body: videoBlob
    });

    if (!deepgramResponse.ok) {
      const errorText = await deepgramResponse.text();
      throw new Error(`Deepgram failed: ${errorText}`);
    }

    const transcriptResult = await deepgramResponse.json();

    // FIXED: Extract transcript from Deepgram's nested response structure
    const transcript = transcriptResult?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';

    console.log(`[Queue ${item.id}] Transcript: "${transcript.substring(0, 100)}..."`);

    if (!transcript || transcript.trim().length === 0) {
      console.log(`[Queue ${item.id}] Empty transcript — no speech detected`);

      // Update submission with empty transcript
      await supabase.from('submissions').update({ transcript: '', status: 'completed', processing_completed_at: new Date().toISOString() }).eq('id', item.submission_id);

      // Create grade with 0 score
      const { data: existingGrade } = await supabase.from('grades').select('id').eq('submission_id', item.submission_id).single();
      const zeroGradeData = {
        submission_id: item.submission_id,
        total_score: 0,
        speech_content_score: 0,
        filler_word_count: 0,
        filler_words_used: [],
        filler_word_score: 0,
        filler_word_counts: {},
        graded_at: new Date().toISOString()
      };

      let grade;
      if (existingGrade) {
        const { data } = await supabase.from('grades').update(zeroGradeData).eq('id', existingGrade.id).select().single();
        grade = data;
      } else {
        const { data } = await supabase.from('grades').insert([zeroGradeData]).select().single();
        grade = data;
      }

      // Create feedback explaining the issue
      const { data: existingFeedback } = await supabase.from('feedback').select('id').eq('grade_id', grade.id).single();
      const noSpeechFeedback = {
        grade_id: grade.id,
        filler_words_feedback: 'No speech detected in the recording.',
        speech_content_feedback: 'No speech was detected in your recording. Please make sure your microphone is working and try again. Speak clearly and at a normal volume.',
        body_language_feedback: 'Unable to evaluate — no speech detected.'
      };

      if (existingFeedback) {
        await supabase.from('feedback').update(noSpeechFeedback).eq('id', existingFeedback.id);
      } else {
        await supabase.from('feedback').insert([noSpeechFeedback]);
      }

      // Mark queue item completed
      await supabase.from('submission_queue').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', item.id);

      result.success = true;
      return result;
    }

    // Update submission with transcript
    await supabase.from('submissions').update({ transcript }).eq('id', item.submission_id);

    // Analyze with Bedrock
    console.log(`[Queue ${item.id}] Analyzing with Bedrock...`);
    const bedrockResponse = await fetch(`${supabaseUrl}/functions/v1/bedrock-agent`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ transcript, assignmentTitle })
    });

    const bedrockResult = bedrockResponse.ok ? await bedrockResponse.json() : { contentScore: 2, speechContent: 'Analysis unavailable' };
    const speechContentScore = bedrockResult.contentScore ?? 2;
    const speechContentFeedback = bedrockResult.speechContent || 'Analysis completed.';

    // Hand tracking analysis
    console.log(`[Queue ${item.id}] Analyzing hand tracking...`);
    let bodyLanguageFeedback = '✗ Did not use hands effectively'; // Default
    try {
      const handTrackingResponse = await fetch(`${supabaseUrl}/functions/v1/hand-tracking-analysis`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ videoUrl })
      });

      if (handTrackingResponse.ok) {
        const handResult = await handTrackingResponse.json();
        bodyLanguageFeedback = handResult.feedback || bodyLanguageFeedback;
        console.log(`[Queue ${item.id}] Hand tracking: ${bodyLanguageFeedback}`);
      } else {
        console.warn(`[Queue ${item.id}] Hand tracking failed, using default`);
      }
    } catch (error) {
      console.error(`[Queue ${item.id}] Hand tracking error:`, error);
      // Keep default feedback
    }

    // Filler word analysis
    const fillerAnalysis = analyzeFillerWords(transcript);

    // Calculate scores
    const fillerWordScore = Math.max(0, 20 - fillerAnalysis.totalCount);
    const contentPercentage = (speechContentScore / 4) * 100;
    const fillerPercentage = (fillerWordScore / 20) * 100;
    const finalScore = Math.round((contentPercentage * 0.8) + (fillerPercentage * 0.2));

    console.log(`[Queue ${item.id}] Score: ${finalScore}`);

    // Create/update grade
    const { data: existingGrade } = await supabase
      .from('grades')
      .select('id')
      .eq('submission_id', item.submission_id)
      .single();

    const gradeData = {
      submission_id: item.submission_id,
      total_score: finalScore,
      speech_content_score: speechContentScore,
      filler_word_count: fillerAnalysis.totalCount,
      filler_words_used: fillerAnalysis.fillerWordsUsed,
      filler_word_score: fillerWordScore,
      filler_word_counts: fillerAnalysis.wordCounts,
      graded_at: new Date().toISOString()
    };

    let grade;
    if (existingGrade) {
      const { data } = await supabase.from('grades').update(gradeData).eq('id', existingGrade.id).select().single();
      grade = data;
    } else {
      const { data } = await supabase.from('grades').insert([gradeData]).select().single();
      grade = data;
    }

    // Create/update feedback
    const { data: existingFeedback } = await supabase.from('feedback').select('id').eq('grade_id', grade.id).single();
    const feedbackData = {
      grade_id: grade.id,
      filler_words_feedback: generateFillerFeedback(fillerAnalysis),
      speech_content_feedback: speechContentFeedback,
      body_language_feedback: bodyLanguageFeedback
    };

    if (existingFeedback) {
      await supabase.from('feedback').update(feedbackData).eq('id', existingFeedback.id);
    } else {
      await supabase.from('feedback').insert([feedbackData]);
    }

    // Mark completed
    await supabase.from('submissions').update({ status: 'completed', processing_completed_at: new Date().toISOString() }).eq('id', item.submission_id);
    await supabase.from('submission_queue').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', item.id);

    console.log(`[Queue ${item.id}] Completed successfully`);
    result.success = true;
    return result;

  } catch (error) {
    console.error(`[Queue ${item.id}] Failed:`, error);
    result.error = error.message;

    const newAttempts = item.attempts + 1;
    const shouldRetry = newAttempts < item.max_attempts;

    await supabase.from('submission_queue').update({
      status: shouldRetry ? 'pending' : 'failed',
      attempts: newAttempts,
      error_message: error.message,
      completed_at: shouldRetry ? null : new Date().toISOString()
    }).eq('id', item.id);

    await supabase.from('submissions').update({
      status: shouldRetry ? 'pending' : 'failed',
      error_message: error.message
    }).eq('id', item.submission_id);

    return result;
  }
}

function analyzeFillerWords(transcript: string) {
  const patterns = [
    { word: 'um', pattern: /\bum+\b/gi },
    { word: 'uh', pattern: /\buh+\b/gi },
    { word: 'like', pattern: /\blike\b/gi },
    { word: 'you know', pattern: /\byou know\b/gi },
    { word: 'actually', pattern: /\bactually\b/gi },
    { word: 'basically', pattern: /\bbasically\b/gi }
  ];

  const wordCounts: Record<string, number> = {};
  const fillerWordsUsed: string[] = [];
  let totalCount = 0;

  for (const { word, pattern } of patterns) {
    const matches = transcript.match(pattern) || [];
    if (matches.length > 0) {
      wordCounts[word] = matches.length;
      fillerWordsUsed.push(word);
      totalCount += matches.length;
    }
  }

  return { totalCount, fillerWordsUsed, wordCounts };
}

function generateFillerFeedback(analysis: ReturnType<typeof analyzeFillerWords>): string {
  if (analysis.totalCount === 0) return 'Excellent! No filler words detected.';

  const fillerWordScore = Math.max(0, 20 - analysis.totalCount);
  let feedback = `Detected ${analysis.totalCount} filler word(s). Score: ${fillerWordScore}/20.`;

  if (analysis.fillerWordsUsed.length > 0) {
    const words = analysis.fillerWordsUsed.map(w => `"${w}" (${analysis.wordCounts[w]}x)`).join(', ');
    feedback += ` Words: ${words}.`;
  }

  return feedback;
}
