import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface BedrockAgentRequest {
  transcript: string;
  assignmentTitle: string;
}

interface BedrockAgentResponse {
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

    console.log('Bedrock Agent request received');

    // Get AWS credentials from environment
    const awsAccessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const awsSecretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    const awsRegion = Deno.env.get('AWS_REGION');
    const agentId = Deno.env.get('BEDROCK_AGENT_ID');
    const agentAliasId = Deno.env.get('BEDROCK_AGENT_ALIAS_ID');

    if (!awsAccessKeyId || !awsSecretAccessKey || !awsRegion || !agentId || !agentAliasId) {
      console.error('Missing AWS credentials or agent configuration');
      return new Response(
        JSON.stringify({ error: 'AWS Bedrock configuration not complete' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const { transcript, assignmentTitle }: BedrockAgentRequest = await req.json();

    console.log('Request parsed:', {
      transcriptLength: transcript?.length || 0,
      assignmentTitle: assignmentTitle || 'No title',
      hasTranscript: !!transcript
    });

    if (!transcript) {
      console.error('Missing transcript in request');
      return new Response(
        JSON.stringify({ error: 'Transcript is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Prepare the prompt with the actual transcript
    const prompt = `Please analyze this student's speech transcript and provide detailed feedback on their content and delivery. This is for educational purposes to help the student improve their public speaking skills.

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

    console.log('Calling Bedrock Agent...', {
      agentId,
      agentAliasId,
      region: awsRegion,
      promptLength: prompt.length
    });

    // Generate a unique session ID for this conversation
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // AWS Bedrock Agent Runtime API endpoint
    const endpoint = `https://bedrock-agent-runtime.${awsRegion}.amazonaws.com`;
    const url = `${endpoint}/agents/${agentId}/agentAliases/${agentAliasId}/sessions/${sessionId}/text`;

    // Prepare the request body for Bedrock Agent
    const bedrockRequestBody = {
      inputText: prompt
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

    console.log('Calling Bedrock Agent API...', { url, sessionId });

    // Call Bedrock Agent
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

    console.log('Bedrock Agent response status:', bedrockResponse.status);

    if (!bedrockResponse.ok) {
      const errorText = await bedrockResponse.text();
      console.error('Bedrock Agent API error:', {
        status: bedrockResponse.status,
        statusText: bedrockResponse.statusText,
        error: errorText
      });
      
      // Fallback to basic analysis if Bedrock fails
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

    // Handle streaming response from Bedrock Agent
    const reader = bedrockResponse.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response stream');
    }

    let responseText = '';
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      
      if (value) {
        const chunk = new TextDecoder().decode(value);
        console.log('Received chunk:', chunk.substring(0, 100) + '...');
        
        // Parse the streaming response (similar to your Python code)
        try {
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.trim() && line.startsWith('data:')) {
              const jsonData = line.substring(5).trim();
              if (jsonData) {
                const parsed = JSON.parse(jsonData);
                if (parsed.chunk?.bytes) {
                  const decodedText = atob(parsed.chunk.bytes);
                  responseText += decodedText;
                }
              }
            }
          }
        } catch (e) {
          // If parsing fails, append the chunk directly
          responseText += chunk;
        }
      }
    }

    console.log('Bedrock Agent response received:', {
      hasResponse: !!responseText,
      responseLength: responseText.length,
      preview: responseText.substring(0, 200) + '...'
    });

    if (!responseText || responseText.trim().length === 0) {
      console.warn('No content received from Bedrock Agent');
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

    // Return the agent's response
    const analysisResult: BedrockAgentResponse = {
      speechContent: responseText.trim(),
      confidence: 0.95,
      sources: ['AWS Bedrock Agent']
    };

    return new Response(JSON.stringify(analysisResult), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Bedrock Agent error:', error);
    
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
  
  // Create canonical request
  const canonicalUri = urlObj.pathname;
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
    key,
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
    key,
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