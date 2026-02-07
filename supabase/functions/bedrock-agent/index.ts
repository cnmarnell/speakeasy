import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCARPrompt } from "../_shared/carPrompt.ts";
import { 
  buildDynamicPrompt, 
  parseDynamicResponse, 
  generateDynamicFeedback,
  type Rubric 
} from "../_shared/dynamicPrompt.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface GradingRequest {
  transcript: string;
  assignmentTitle?: string;
  assignmentId?: string;  // New: fetch rubric via assignment
  rubricId?: string;      // New: direct rubric ID
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

// Initialize Supabase client for fetching rubrics
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseKey);
}

// Fetch rubric by assignment ID
async function getRubricByAssignment(assignmentId: string): Promise<Rubric | null> {
  try {
    const supabase = getSupabaseClient();
    
    // Get assignment's rubric_id
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select('rubric_id')
      .eq('id', assignmentId)
      .single();
    
    if (assignmentError || !assignment?.rubric_id) {
      console.log('No rubric assigned to this assignment, using fallback');
      return null;
    }
    
    return await getRubricById(assignment.rubric_id);
  } catch (error) {
    console.error('Error fetching rubric by assignment:', error);
    return null;
  }
}

// Fetch rubric by ID
async function getRubricById(rubricId: string): Promise<Rubric | null> {
  try {
    const supabase = getSupabaseClient();
    
    const { data: rubric, error } = await supabase
      .from('rubrics')
      .select(`
        id,
        name,
        description,
        context,
        rubric_criteria (
          id,
          name,
          description,
          max_points,
          sort_order,
          examples
        )
      `)
      .eq('id', rubricId)
      .single();
    
    if (error || !rubric) {
      console.error('Error fetching rubric:', error);
      return null;
    }
    
    return rubric as Rubric;
  } catch (error) {
    console.error('Error fetching rubric:', error);
    return null;
  }
}

// Legacy: Validate and correct CAR scores
function validateAndCorrectCARScores(grading: Record<string, unknown>): Record<string, unknown> {
  const negativeIndicators = [
    'not met', 'not include', 'did not', 'does not', 'lacks', 'missing',
    'no mention', 'absent', 'failed to', 'without', 'unclear', 'vague',
    'not provide', 'not demonstrate', 'not present', 'not evident',
    'could not find', 'unable to identify', 'not addressed',
    'no concrete', 'no specific', 'no numerical', 'no measurable',
    'no real', 'no action', 'no context', 'no result', 'no outcome',
    'not mentioned', 'not described', 'not included', 'were not',
    'was not', 'wasn\'t', 'weren\'t', 'no evidence', 'not measurable',
    'did not provide', 'did not include', 'did not describe',
    'did not mention', 'not a real'
  ];

  function shouldBeZero(explanation: string): boolean {
    const lowerExplanation = explanation.toLowerCase();
    if (negativeIndicators.some(indicator => lowerExplanation.includes(indicator))) return true;
    if (/\bno\s+\w+/.test(lowerExplanation) && !/(no doubt|no issue|no problem|no question)/.test(lowerExplanation)) return true;
    return false;
  }

  const criteria = ['context', 'action', 'result', 'quantitative'];
  let correctedTotal = 0;
  const corrected = { ...grading };

  for (const criterion of criteria) {
    const item = corrected[criterion] as { score: number; explanation: string } | undefined;
    if (item) {
      if (item.score === 1 && shouldBeZero(item.explanation)) {
        console.log(`⚠️ Auto-correcting ${criterion} score from 1 to 0`);
        item.score = 0;
      }
      correctedTotal += item.score;
    }
  }

  if ((corrected as { total?: number }).total !== correctedTotal) {
    (corrected as { total: number }).total = correctedTotal;
  }

  return corrected;
}

// Parse legacy CAR response
function parseCARResponse(responseText: string): Record<string, unknown> | null {
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    const requiredFields = ['context', 'action', 'result', 'quantitative', 'total', 'improvement', 'example_perfect_response'];
    for (const field of requiredFields) {
      if (!(field in parsed)) return null;
    }

    const criteria = ['context', 'action', 'result', 'quantitative'];
    for (const criterion of criteria) {
      if (typeof parsed[criterion]?.score !== 'number') return null;
      parsed[criterion].score = parsed[criterion].score >= 0.5 ? 1 : 0;
    }

    return validateAndCorrectCARScores(parsed);
  } catch {
    return null;
  }
}

// Generate CAR feedback (legacy)
function generateCARFeedback(grading: Record<string, unknown>): string {
  const criteriaNames: Record<string, string> = {
    context: 'Context',
    action: 'Action', 
    result: 'Result',
    quantitative: 'Quantitative'
  };

  let feedback = `## CAR Framework Evaluation\n\n`;
  feedback += `**Total Score: ${grading.total}/4**\n\n`;
  feedback += `### Criteria Breakdown\n\n`;

  for (const [key, name] of Object.entries(criteriaNames)) {
    const criterion = grading[key] as { score: number; explanation: string };
    if (criterion) {
      const icon = criterion.score === 1 ? '✅' : '❌';
      feedback += `**${name}:** ${icon} ${criterion.score}/1\n`;
      feedback += `${criterion.explanation}\n\n`;
    }
  }

  feedback += `### How to Improve\n\n${grading.improvement}\n\n`;
  feedback += `### Example Perfect Response\n\n${grading.example_perfect_response}`;

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
          contentScore: 2,
          confidence: 0,
          sources: ['Configuration Error']
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { transcript, assignmentId, rubricId }: GradingRequest = await req.json();

    console.log('Request parsed:', {
      transcriptLength: transcript?.length || 0,
      assignmentId: assignmentId || 'none',
      rubricId: rubricId || 'none'
    });

    if (!transcript) {
      return new Response(
        JSON.stringify({
          speechContent: 'Transcript is required for analysis',
          contentScore: 2,
          confidence: 0,
          sources: ['Missing Data']
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to fetch rubric (by assignment or direct ID)
    let rubric: Rubric | null = null;
    let useDynamicRubric = false;

    if (assignmentId) {
      rubric = await getRubricByAssignment(assignmentId);
    } else if (rubricId) {
      rubric = await getRubricById(rubricId);
    }

    if (rubric && rubric.rubric_criteria?.length > 0) {
      useDynamicRubric = true;
      console.log(`Using dynamic rubric: ${rubric.name} (${rubric.rubric_criteria.length} criteria)`);
    } else {
      console.log('Using fallback CAR Framework prompt');
    }

    // Build prompt
    const prompt = useDynamicRubric && rubric
      ? buildDynamicPrompt(rubric, transcript)
      : buildCARPrompt(transcript);

    console.log('Calling Claude Haiku 3.5...', { promptLength: prompt.length });

    // AWS Bedrock call
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

    const novaResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': awsSignature.authorization,
        'X-Amz-Date': awsSignature.amzDate,
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!novaResponse.ok) {
      const errorText = await novaResponse.text();
      console.error('Claude API error:', { status: novaResponse.status, error: errorText });
      return new Response(
        JSON.stringify({
          speechContent: `API Error (${novaResponse.status}): ${errorText}`,
          contentScore: 2,
          confidence: 0,
          sources: ['API Error']
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const claudeResponse = await novaResponse.json();
    const responseText = claudeResponse.content?.[0]?.text;

    if (!responseText?.trim()) {
      return new Response(
        JSON.stringify({
          speechContent: 'Empty response from Claude',
          contentScore: 2,
          confidence: 0,
          sources: ['Empty Response']
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Response received:', responseText.substring(0, 200) + '...');

    // Parse response based on rubric type
    let result: GradingResponse;

    if (useDynamicRubric && rubric) {
      const parsed = parseDynamicResponse(responseText, rubric);
      if (parsed) {
        const maxScore = rubric.rubric_criteria.reduce((sum, c) => sum + c.max_points, 0);
        const feedbackText = generateDynamicFeedback(
          rubric, parsed.scores, parsed.total, parsed.improvement, parsed.example
        );
        
        result = {
          speechContent: feedbackText,
          contentScore: parsed.total,
          confidence: 0.95,
          sources: [`Claude Haiku 3.5 (${rubric.name})`],
          structuredGrading: { scores: parsed.scores, total: parsed.total },
          rubricName: rubric.name,
          maxScore
        };
      } else {
        // Fallback to raw text
        result = {
          speechContent: responseText.trim(),
          contentScore: 2,
          confidence: 0.6,
          sources: ['Claude Haiku 3.5 (parse error)'],
          rubricName: rubric.name
        };
      }
    } else {
      // Legacy CAR parsing
      const carGrading = parseCARResponse(responseText);
      if (carGrading) {
        result = {
          speechContent: generateCARFeedback(carGrading),
          contentScore: carGrading.total as number,
          confidence: 0.98,
          sources: ['Claude Haiku 3.5 (CAR Framework)'],
          structuredGrading: carGrading,
          rubricName: 'CAR Framework',
          maxScore: 4
        };
      } else {
        result = {
          speechContent: responseText.trim(),
          contentScore: 2,
          confidence: 0.6,
          sources: ['Claude Haiku 3.5 (fallback)']
        };
      }
    }

    console.log('Returning:', { score: result.contentScore, rubric: result.rubricName });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Grading error:', error);
    return new Response(
      JSON.stringify({
        speechContent: `Error: ${error.message}`,
        contentScore: 2,
        confidence: 0,
        sources: ['Processing Error']
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// AWS Signature V4 implementation
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
  
  const authorization = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  
  return { authorization, amzDate };
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
