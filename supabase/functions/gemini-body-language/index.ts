import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface GeminiRequest {
  frames: string[];
}

interface GeminiResponse {
  bodyLanguageFeedback: string;
  confidence: number;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('🎥 Gemini body language analysis request received');

    // Get environment variables
    const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    const systemPrompt = Deno.env.get('GEMINI_BODY_LANGUAGE_SYSTEM_PROMPT');

    console.log('🔑 Environment check:', {
      hasApiKey: !!geminiApiKey,
      apiKeyLength: geminiApiKey?.length || 0,
      hasSystemPrompt: !!systemPrompt,
      promptLength: systemPrompt?.length || 0
    });

    if (!geminiApiKey || !systemPrompt) {
      console.error('❌ Missing Gemini API key or system prompt configuration', {
        hasApiKey: !!geminiApiKey,
        hasSystemPrompt: !!systemPrompt
      });
      return fallbackResponse();
    }

    // Parse request body
    const { frames }: GeminiRequest = await req.json();

    if (!frames || frames.length === 0) {
      console.error('No frames provided in request');
      return fallbackResponse();
    }

    console.log(`Processing ${frames.length} frames with Gemini...`);

    // Build Gemini API request
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

    // Prepare the content parts with system prompt and images
    const contentParts: any[] = [
      { text: systemPrompt }
    ];

    // Add each frame as inline image data
    for (const frame of frames) {
      // Remove the data URL prefix if present
      const base64Data = frame.replace(/^data:image\/jpeg;base64,/, '');
      contentParts.push({
        inline_data: {
          mime_type: "image/jpeg",
          data: base64Data
        }
      });
    }

    // Add final instruction
    contentParts.push({
      text: "Based on these frames from the student's presentation, provide your body language feedback:"
    });

    const geminiRequestBody = {
      contents: [{
        parts: contentParts
      }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 300,
        topP: 0.9
      }
    };

    console.log('📡 Calling Gemini API...');

    // Call Gemini API
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(geminiRequestBody)
    });

    console.log('📥 Gemini response status:', geminiResponse.status);

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('❌ Gemini API error:', geminiResponse.status, errorText);
      return fallbackResponse();
    }

    const geminiData = await geminiResponse.json();
    const feedback = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!feedback) {
      console.warn('⚠️ No feedback text in Gemini response:', JSON.stringify(geminiData).substring(0, 200));
      return fallbackResponse();
    }

    console.log('✅ Gemini analysis successful! Feedback length:', feedback.length);

    const result: GeminiResponse = {
      bodyLanguageFeedback: feedback.trim(),
      confidence: 0.9
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('💥 Gemini processing error:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    });
    return fallbackResponse();
  }
});

function fallbackResponse() {
  console.log('⚠️ Returning fallback response');
  return new Response(JSON.stringify({
    bodyLanguageFeedback: 'Your presentation delivery shows engagement with your topic. Continue practicing maintaining eye contact and using confident facial expressions to connect with your audience.',
    confidence: 0.5
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
