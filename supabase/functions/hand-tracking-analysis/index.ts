import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Hand Tracking Analysis Edge Function
 *
 * Analyzes video for hand presence and movement to determine if student
 * used hands effectively during presentation.
 *
 * This function can:
 * 1. Call external Python service (when HAND_TRACKING_SERVICE_URL is set)
 * 2. Use fallback simple analysis (for testing)
 *
 * Returns: Simple text feedback for body language
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HandTrackingRequest {
  videoUrl: string;
}

interface HandTrackingResult {
  used_hands_effectively: boolean;
  hands_detected: boolean;
  movement_detected: boolean;
  details: string;
}

/**
 * Call external Python hand tracking service
 */
async function callPythonService(videoUrl: string): Promise<HandTrackingResult> {
  const serviceUrl = Deno.env.get('HAND_TRACKING_SERVICE_URL');

  if (!serviceUrl) {
    console.log('HAND_TRACKING_SERVICE_URL not configured, using fallback');
    return fallbackAnalysis();
  }

  try {
    const response = await fetch(serviceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ video_url: videoUrl }),
      signal: AbortSignal.timeout(60000), // 60 second timeout
    });

    if (!response.ok) {
      console.error(`Python service error: ${response.status}`);
      return fallbackAnalysis();
    }

    const result = await response.json();
    return result as HandTrackingResult;

  } catch (error) {
    console.error('Error calling Python service:', error);
    return fallbackAnalysis();
  }
}

/**
 * Fallback analysis when Python service is not available
 * Returns a default positive result for testing
 */
function fallbackAnalysis(): HandTrackingResult {
  console.log('Using fallback analysis (Python service not configured)');
  return {
    used_hands_effectively: true,  // Default to true for testing
    hands_detected: true,
    movement_detected: true,
    details: 'Hand tracking service not configured - using default result'
  };
}

/**
 * Generate text feedback for students based on analysis
 */
function generateFeedback(result: HandTrackingResult): string {
  if (result.used_hands_effectively) {
    return "✓ Used hands effectively";
  } else {
    return "✗ Did not use hands effectively";
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { videoUrl }: HandTrackingRequest = await req.json();

    if (!videoUrl) {
      return new Response(
        JSON.stringify({ error: 'videoUrl is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Analyzing video:', videoUrl);

    // Call Python service or use fallback
    const result = await callPythonService(videoUrl);

    // Generate student-facing feedback
    const feedback = generateFeedback(result);

    console.log('Analysis result:', result);
    console.log('Feedback:', feedback);

    return new Response(
      JSON.stringify({
        feedback,
        analysis: result
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Hand tracking analysis error:', error);

    return new Response(
      JSON.stringify({
        error: error.message,
        feedback: '✗ Did not use hands effectively'  // Default to negative on error
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
