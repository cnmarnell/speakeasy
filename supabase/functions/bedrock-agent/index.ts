import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  getRubricByKey, 
  buildRubricPrompt, 
  DEFAULT_RUBRIC_KEY,
  type RubricDefinition 
} from "../_shared/rubrics/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface GradingRequest {
  transcript: string;
  assignmentId?: string;
  rubricId?: string;
  promptKey?: string;  // Direct prompt_key override
}

interface GradingResponse {
  speechContent: string;
  contentScore: number;
  confidence: number;
  sources: string[];
  structuredGrading?: Record<string, unknown>;
  rubricName?: string;
  maxScore?: number;
}

// Initialize Supabase client
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseKey);
}

// Fetch prompt_key by assignment ID
async function getPromptKeyByAssignment(assignmentId: string): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('assignments')
      .select('rubric_id, rubrics(prompt_key)')
      .eq('id', assignmentId)
      .single();
    
    if (error || !data?.rubrics?.prompt_key) {
      console.log('No prompt_key found for assignment, using default');
      return null;
    }
    
    return data.rubrics.prompt_key;
  } catch (error) {
    console.error('Error fetching prompt_key:', error);
    return null;
  }
}

// Fetch prompt_key by rubric ID
async function getPromptKeyByRubricId(rubricId: string): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('rubrics')
      .select('prompt_key')
      .eq('id', rubricId)
      .single();
    
    if (error || !data?.prompt_key) {
      return null;
    }
    
    return data.prompt_key;
  } catch (error) {
    console.error('Error fetching prompt_key:', error);
    return null;
  }
}

// Parse JSON response based on rubric criteria
function parseRubricResponse(responseText: string, rubric: RubricDefinition): Record<string, unknown> | null {
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate required fields
    if (typeof parsed.total !== 'number' || !parsed.improvement) {
      return null;
    }

    // Validate each criterion exists
    let calculatedTotal = 0;
    for (const criterion of rubric.criteria) {
      const key = criterion.toLowerCase().replace(/\s+/g, '_');
      if (parsed[key] && typeof parsed[key].score === 'number') {
        // Normalize to 0 or 1
        parsed[key].score = parsed[key].score >= 0.5 ? 1 : 0;
        calculatedTotal += parsed[key].score;
      }
    }

    // Correct total if needed
    if (parsed.total !== calculatedTotal) {
      console.log(`Correcting total: ${parsed.total} → ${calculatedTotal}`);
      parsed.total = calculatedTotal;
    }

    return parsed;
  } catch (error) {
    console.error('Parse error:', error);
    return null;
  }
}

// Generate feedback text from parsed response
function generateFeedback(rubric: RubricDefinition, parsed: Record<string, unknown>): string {
  let feedback = `## ${rubric.name} Evaluation\n\n`;
  feedback += `**Total Score: ${parsed.total}/${rubric.maxScore}**\n\n`;
  feedback += `### Criteria Breakdown\n\n`;

  for (const criterion of rubric.criteria) {
    const key = criterion.toLowerCase().replace(/\s+/g, '_');
    const result = parsed[key] as { score: number; explanation: string } | undefined;
    if (result) {
      const icon = result.score === 1 ? '✅' : '❌';
      feedback += `**${criterion}:** ${icon} ${result.score}/1\n`;
      feedback += `${result.explanation}\n\n`;
    }
  }

  feedback += `### How to Improve\n\n${parsed.improvement}\n\n`;
  feedback += `### Example Perfect Response\n\n${parsed.example_perfect_response || 'N/A'}`;

  return feedback;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Grading request received');

    const awsAccessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const awsSecretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    const awsRegion = Deno.env.get('AWS_REGION');
    
    if (!awsAccessKeyId || !awsSecretAccessKey || !awsRegion) {
      console.error('Missing AWS credentials');
      return new Response(
        JSON.stringify({
          speechContent: 'Configuration not complete - missing AWS credentials',
          contentScore: 0,
          confidence: 0,
          sources: ['Configuration Error']
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { transcript, assignmentId, rubricId, promptKey: directPromptKey }: GradingRequest = await req.json();

    console.log('Request:', {
      transcriptLength: transcript?.length || 0,
      assignmentId: assignmentId || 'none',
      rubricId: rubricId || 'none',
      directPromptKey: directPromptKey || 'none'
    });

    if (!transcript) {
      return new Response(
        JSON.stringify({
          speechContent: 'Transcript is required for analysis',
          contentScore: 0,
          confidence: 0,
          sources: ['Missing Data']
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine which rubric to use (priority: directPromptKey > assignmentId > rubricId > default)
    let promptKey: string | null = null;
    
    if (directPromptKey) {
      promptKey = directPromptKey;
    } else if (assignmentId) {
      promptKey = await getPromptKeyByAssignment(assignmentId);
    } else if (rubricId) {
      promptKey = await getPromptKeyByRubricId(rubricId);
    }
    
    // Fall back to default
    if (!promptKey) {
      promptKey = DEFAULT_RUBRIC_KEY;
    }

    // Get the rubric definition
    const rubric = getRubricByKey(promptKey);
    if (!rubric) {
      console.error(`Unknown rubric: ${promptKey}`);
      return new Response(
        JSON.stringify({
          speechContent: `Unknown rubric: ${promptKey}`,
          contentScore: 0,
          confidence: 0,
          sources: ['Configuration Error']
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Using rubric: ${rubric.name} (${promptKey})`);

    // Build the prompt
    const prompt = rubric.buildPrompt(transcript);

    // Call AWS Bedrock
    const endpoint = `https://bedrock-runtime.${awsRegion}.amazonaws.com`;
    const url = `${endpoint}/model/us.anthropic.claude-3-5-haiku-20241022-v1:0/invoke`;

    const requestBody = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      top_p: 0.9
    };

    const awsSignature = await createAWSSignature(
      'POST', url, JSON.stringify(requestBody),
      awsAccessKeyId, awsSecretAccessKey, awsRegion
    );

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': awsSignature.authorization,
        'X-Amz-Date': awsSignature.amzDate,
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', { status: response.status, error: errorText });
      return new Response(
        JSON.stringify({
          speechContent: `API Error (${response.status}): ${errorText}`,
          contentScore: 0,
          confidence: 0,
          sources: ['API Error']
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const claudeResponse = await response.json();
    const responseText = claudeResponse.content?.[0]?.text;

    if (!responseText?.trim()) {
      return new Response(
        JSON.stringify({
          speechContent: 'Empty response from Claude',
          contentScore: 0,
          confidence: 0,
          sources: ['Empty Response']
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Response:', responseText.substring(0, 200) + '...');

    // Parse and generate feedback
    const parsed = parseRubricResponse(responseText, rubric);
    
    let result: GradingResponse;
    
    if (parsed) {
      result = {
        speechContent: generateFeedback(rubric, parsed),
        contentScore: parsed.total as number,
        confidence: 0.95,
        sources: [`Claude Haiku 3.5 (${rubric.name})`],
        structuredGrading: parsed,
        rubricName: rubric.name,
        maxScore: rubric.maxScore
      };
    } else {
      // Fallback to raw text
      result = {
        speechContent: responseText.trim(),
        contentScore: 0,
        confidence: 0.5,
        sources: ['Claude Haiku 3.5 (parse error)'],
        rubricName: rubric.name,
        maxScore: rubric.maxScore
      };
    }

    console.log('Result:', { score: result.contentScore, maxScore: result.maxScore, rubric: result.rubricName });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Grading error:', error);
    return new Response(
      JSON.stringify({
        speechContent: `Error: ${error.message}`,
        contentScore: 0,
        confidence: 0,
        sources: ['Processing Error']
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// AWS Signature V4
async function createAWSSignature(
  method: string, url: string, body: string,
  accessKeyId: string, secretAccessKey: string, region: string
) {
  const urlObj = new URL(url);
  const host = urlObj.hostname;
  const service = 'bedrock';
  
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);
  
  const canonicalUri = urlObj.pathname.split('/').map(segment => encodeURIComponent(segment)).join('/');
  const canonicalQuerystring = urlObj.search.substring(1);
  const canonicalHeaders = `host:${host}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-date';
  const payloadHash = await sha256(body);
  
  const canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${await sha256(canonicalRequest)}`;
  
  const signingKey = await getSigningKey(secretAccessKey, dateStamp, region, service);
  const signature = await hmacSha256(signingKey, stringToSign);
  
  return { authorization: `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`, amzDate };
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256(key: Uint8Array, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey('raw', key.buffer as ArrayBuffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getSigningKey(secretAccessKey: string, dateStamp: string, region: string, service: string): Promise<Uint8Array> {
  const kDate = await hmacSha256Raw(new TextEncoder().encode(`AWS4${secretAccessKey}`), dateStamp);
  const kRegion = await hmacSha256Raw(kDate, region);
  const kService = await hmacSha256Raw(kRegion, service);
  return await hmacSha256Raw(kService, 'aws4_request');
}

async function hmacSha256Raw(key: Uint8Array, message: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey('raw', key.buffer as ArrayBuffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  return new Uint8Array(signature);
}
