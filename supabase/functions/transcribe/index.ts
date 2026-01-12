/**
 * Transcribe Edge Function
 *
 * Accepts audio data and returns a transcript using Deepgram
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

async function transcribeWithDeepgram(audioData: ArrayBuffer): Promise<{ transcript: string }> {
  const deepgramApiKey = Deno.env.get('DEEPGRAM_API_KEY');

  if (!deepgramApiKey) {
    throw new Error('DEEPGRAM_API_KEY not configured');
  }

  const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${deepgramApiKey}`,
      'Content-Type': 'audio/webm',
    },
    body: audioData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Deepgram API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();

  const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';

  return { transcript };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const contentType = req.headers.get('content-type') || '';

    let audioData: ArrayBuffer;

    if (contentType.includes('audio/')) {
      // Direct audio data
      audioData = await req.arrayBuffer();
    } else if (contentType.includes('multipart/form-data')) {
      // Form data with audio file
      const formData = await req.formData();
      const audioFile = formData.get('audio') as File;

      if (!audioFile) {
        return errorResponse('No audio file provided');
      }

      audioData = await audioFile.arrayBuffer();
    } else {
      return errorResponse('Invalid content type. Expected audio/* or multipart/form-data');
    }

    if (!audioData || audioData.byteLength === 0) {
      return errorResponse('No audio data received');
    }

    console.log(`Transcribing audio data: ${audioData.byteLength} bytes`);

    const result = await transcribeWithDeepgram(audioData);

    return jsonResponse({
      transcript: result.transcript,
      success: true,
    });
  } catch (error) {
    console.error('Transcription error:', error);
    return errorResponse(error.message || 'Transcription failed', 500);
  }
});
