import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface NovaLiteRequest {
  transcript: string;
  assignmentTitle: string;
}

interface NovaLiteResponse {
  speechContent: string;
  confidence: number;
  sources: string[];
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

    console.log('Nova Lite grading request received');

    // Get AWS credentials and system prompt from environment
    const awsAccessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const awsSecretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    const awsRegion = Deno.env.get('AWS_REGION');
    const systemPrompt = Deno.env.get('ELEVATOR_PITCH_SYSTEM_PROMPT');

    if (!awsAccessKeyId || !awsSecretAccessKey || !awsRegion || !systemPrompt) {
      console.error('Missing AWS credentials or system prompt configuration');
      return new Response(
        JSON.stringify({ 
          speechContent: 'Configuration not complete - missing credentials or system prompt',
          confidence: 0,
          sources: ['Configuration Error']
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const { transcript, assignmentTitle }: NovaLiteRequest = await req.json();

    console.log('Request parsed:', {
      transcriptLength: transcript?.length || 0,
      assignmentTitle: assignmentTitle || 'No title',
      hasTranscript: !!transcript
    });

    if (!transcript) {
      console.error('Missing transcript in request');
      return new Response(
        JSON.stringify({ 
          speechContent: 'Transcript is required for analysis',
          confidence: 0,
          sources: ['Missing Data']
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Combine system prompt with transcript
    const combinedPrompt = `${systemPrompt}\n\ntranscript: ${transcript}`;

    console.log('Calling Nova Lite with system prompt and transcript...', {
      systemPromptLength: systemPrompt.length,
      transcriptLength: transcript.length,
      combinedLength: combinedPrompt.length
    });

    // AWS Bedrock Runtime API endpoint for Nova Lite
    const endpoint = `https://bedrock-runtime.${awsRegion}.amazonaws.com`;
    const url = `${endpoint}/model/amazon.nova-lite-v1:0/converse`;

    // Prepare the request body for Nova Lite
    const novaRequestBody = {
      messages: [
        {
          role: "user",
          content: [{ text: combinedPrompt }]
        }
      ],
      inferenceConfig: {
        maxTokens: 1000,
        temperature: 0.1,
        topP: 0.9
      }
    };

    // Create AWS signature for Nova Lite
    const awsSignature = await createAWSSignature(
      'POST',
      url,
      JSON.stringify(novaRequestBody),
      awsAccessKeyId,
      awsSecretAccessKey,
      awsRegion
    );

    console.log('Calling Nova Lite API...');

    // Call Nova Lite
    const novaResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': awsSignature.authorization,
        'X-Amz-Date': awsSignature.amzDate,
        'Accept': 'application/json'
      },
      body: JSON.stringify(novaRequestBody)
    });

    console.log('Nova Lite response status:', novaResponse.status);

    if (!novaResponse.ok) {
      const errorText = await novaResponse.text();
      console.error('Nova Lite API error:', {
        status: novaResponse.status,
        statusText: novaResponse.statusText,
        error: errorText
      });
      
      return new Response(
        JSON.stringify({
          speechContent: `Nova Lite API Error (${novaResponse.status}): ${errorText}`,
          confidence: 0,
          sources: ['Nova Lite API Error']
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse Nova Lite response
    const novaResponseData = await novaResponse.json();
    console.log('Nova Lite response received');

    // Extract response text from Nova Lite response structure
    const responseText = novaResponseData.output?.message?.content?.[0]?.text;
    
    if (!responseText || responseText.trim().length === 0) {
      console.warn('No content received from Nova Lite');
      
      return new Response(
        JSON.stringify({
          speechContent: 'Nova Lite returned empty response',
          confidence: 0,
          sources: ['Nova Lite - Empty Response']
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Nova Lite response text received:', responseText.substring(0, 200) + '...');

    // Return the raw Nova Lite response exactly as received
    const analysisResult: NovaLiteResponse = {
      speechContent: responseText.trim(),
      confidence: 0.95,
      sources: ['AWS Nova Lite Model']
    };

    return new Response(JSON.stringify(analysisResult), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Nova Lite placeholder error:', error);

    return new Response(
      JSON.stringify({
        speechContent: `Error processing with Nova Lite: ${error.message}`,
        confidence: 0,
        sources: ['Nova Lite Processing Error']
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// AWS Signature V4 implementation
async function createAWSSignature(
  method: string,
  url: string,
  body: string,
  accessKeyId: string,
  secretAccessKey: string,
  region: string
) {
  const urlObj = new URL(url);
  const host = urlObj.hostname;
  const service = 'bedrock';
  
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);
  
  // Create canonical request - AWS expects URL-encoded path
  const canonicalUri = urlObj.pathname
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
    
  const canonicalQuerystring = urlObj.search.substring(1);
  const canonicalHeaders = `host:${host}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-date';
  const payloadHash = await sha256(body);
  
  const canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  
  // Create string to sign
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${await sha256(canonicalRequest)}`;
  
  // Create signing key
  const signingKey = await getSigningKey(secretAccessKey, dateStamp, region, service);
  
  // Create signature
  const signature = await hmacSha256(signingKey, stringToSign);
  
  // Create authorization header
  const authorization = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  
  return {
    authorization,
    amzDate
  };
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256(key: Uint8Array, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getSigningKey(secretAccessKey: string, dateStamp: string, region: string, service: string): Promise<Uint8Array> {
  const kDate = await hmacSha256Raw(new TextEncoder().encode(`AWS4${secretAccessKey}`), dateStamp);
  const kRegion = await hmacSha256Raw(kDate, region);
  const kService = await hmacSha256Raw(kRegion, service);
  const kSigning = await hmacSha256Raw(kService, 'aws4_request');
  return kSigning;
}

async function hmacSha256Raw(key: Uint8Array, message: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  return new Uint8Array(signature);
}