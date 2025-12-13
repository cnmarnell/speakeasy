import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface AnalysisRequest {
  transcript: string;
  assignmentTitle: string;
}

interface AnalysisResponse {
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

    console.log('Bedrock analysis request received');

    // Get AWS credentials from environment
    const awsAccessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const awsSecretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    const awsRegion = Deno.env.get('AWS_REGION') || 'us-east-1';

    if (!awsAccessKeyId || !awsSecretAccessKey) {
      console.error('Missing AWS credentials');
      return new Response(
        JSON.stringify({
          error: 'AWS Bedrock configuration not complete',
          speechContent: 'Configuration error - missing AWS credentials',
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
    const { transcript, assignmentTitle }: AnalysisRequest = await req.json();

    console.log('Request parsed:', {
      transcriptLength: transcript?.length || 0,
      assignmentTitle: assignmentTitle || 'No title',
      hasTranscript: !!transcript
    });

    if (!transcript) {
      console.error('Missing transcript in request');
      return new Response(
        JSON.stringify({
          error: 'Transcript is required',
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

    // Prepare the query for Claude Haiku
    const query = `Please analyze this student's speech transcript and provide detailed feedback on their speech. Give it a grade out of 100.

ASSIGNMENT: ${assignmentTitle}

STUDENT SPEECH TRANSCRIPT:
"${transcript}"

Please provide constructive feedback focusing on:
- Content organization and structure
- Use of supporting evidence and examples
- Clarity and coherence of main points
- Engagement techniques and persuasiveness
- Areas for improvement with specific suggestions

Provide encouraging, educational feedback that helps the student develop stronger public speaking skills.`;

    console.log('Calling Claude Haiku via Bedrock...', {
      region: awsRegion,
      transcriptLength: transcript.length,
      queryLength: query.length
    });

    // AWS Bedrock Runtime API endpoint
    const endpoint = `https://bedrock-runtime.${awsRegion}.amazonaws.com`;
    const url = `${endpoint}/model/anthropic.claude-3-haiku-20240307-v1:0/invoke`;

    // Prepare the request body for Claude Haiku
    const bedrockRequestBody = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: query
        }
      ],
      temperature: 0.7,
      top_p: 0.9
    };

    // Create AWS signature
    const awsSignature = await createAWSSignature(
      'POST',
      url,
      JSON.stringify(bedrockRequestBody),
      awsAccessKeyId,
      awsSecretAccessKey,
      awsRegion
    );

    console.log('Calling Bedrock API with AWS Signature...');

    // Call Bedrock using AWS Signature V4
    const bedrockResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': awsSignature.authorization,
        'X-Amz-Date': awsSignature.amzDate,
        'Accept': 'application/json'
      },
      body: JSON.stringify(bedrockRequestBody)
    });

    console.log('Bedrock API response status:', bedrockResponse.status);

    if (!bedrockResponse.ok) {
      const errorText = await bedrockResponse.text();
      console.error('Bedrock API error:', {
        status: bedrockResponse.status,
        statusText: bedrockResponse.statusText,
        error: errorText
      });

      // Fallback to a basic analysis if Bedrock fails
      const fallbackAnalysis = generateFallbackAnalysis(transcript, assignmentTitle);
      console.log('Using fallback analysis due to Bedrock error');

      return new Response(
        JSON.stringify({
          speechContent: fallbackAnalysis,
          confidence: 0.5,
          sources: ['Fallback Analysis - Bedrock unavailable']
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const bedrockResult = await bedrockResponse.json();
    console.log('Bedrock response received');

    // Extract the content from Claude's response
    const content = bedrockResult.content?.[0]?.text || bedrockResult.completion || '';

    if (!content || content.trim().length === 0) {
      console.warn('No content received from Claude');
      const fallbackAnalysis = generateFallbackAnalysis(transcript, assignmentTitle);

      return new Response(
        JSON.stringify({
          speechContent: fallbackAnalysis,
          confidence: 0.4,
          sources: ['No AI response received']
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Analysis completed successfully');

    const analysisResult: AnalysisResponse = {
      speechContent: content.trim(),
      confidence: 0.9,
      sources: ['AWS Bedrock Claude 3 Haiku']
    };

    return new Response(JSON.stringify(analysisResult), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Bedrock analysis error:', error);

    // Fallback to basic analysis on any error
    try {
      const { transcript, assignmentTitle } = await req.json();
      const fallbackAnalysis = generateFallbackAnalysis(transcript || '', assignmentTitle || '');

      return new Response(
        JSON.stringify({
          speechContent: fallbackAnalysis,
          confidence: 0.3,
          sources: ['Error Fallback - Basic analysis']
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } catch {
      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          message: error.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
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

function generateFallbackAnalysis(transcript: string, assignmentTitle: string): string {
  const wordCount = transcript.split(' ').length;
  const hasExamples = /for example|such as|for instance|specifically/i.test(transcript);
  const hasTransitions = /first|second|next|finally|in conclusion|however|furthermore/i.test(transcript);

  return `Content Analysis for "${assignmentTitle}":

**Strengths:**
${wordCount > 150 ? '• Good speech length and detail' : '• Clear and concise delivery'}
${hasExamples ? '• Includes supporting examples' : '• Direct communication style'}
${hasTransitions ? '• Uses transition words effectively' : '• Maintains focus on main topic'}

**Areas for Growth:**
${wordCount < 100 ? '• Consider expanding with more detail and examples' : '• Continue developing comprehensive content'}
${!hasExamples ? '• Add specific examples to support your points' : '• Further strengthen examples with data or personal experiences'}
${!hasTransitions ? '• Include transition words to improve flow' : '• Enhance transitions for even smoother delivery'}

**Suggestions:**
• Structure your speech with clear introduction, body, and conclusion
• Use specific examples and evidence to support your main points
• Practice smooth transitions between ideas for better flow
• Consider your audience and tailor content to their interests`;
}
