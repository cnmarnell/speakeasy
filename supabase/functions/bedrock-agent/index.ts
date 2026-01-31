import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { buildCARPrompt } from "../_shared/carPrompt.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface NovaLiteRequest {
  transcript: string;
  assignmentTitle: string;
}

// Structured JSON output format for grading
interface GradingCriterion {
  score: 0 | 1;
  explanation: string;
}

interface StructuredGradingResponse {
  context: GradingCriterion;
  action: GradingCriterion;
  result: GradingCriterion;
  quantitative: GradingCriterion;
  total: number;
  improvement: string;
  example_perfect_response: string;
}

interface NovaLiteResponse {
  speechContent: string;
  contentScore: number;
  confidence: number;
  sources: string[];
  structuredGrading?: StructuredGradingResponse;
}

// System prompt is now in _shared/carPrompt.ts — single source of truth
// No more secrets, no more mystery. Edit carPrompt.ts to change grading.

// Validate that scores match explanations
function validateAndCorrectScores(grading: StructuredGradingResponse): StructuredGradingResponse {
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
  
  const positiveIndicators = [
    'met', 'included', 'demonstrated', 'present', 'provided', 'clear',
    'evident', 'showed', 'displayed', 'mentioned', 'addressed', 'stated',
    'described', 'explained', 'identified', 'specific', 'strong',
    'effective', 'well-structured'
  ];

  function shouldBeZero(explanation: string): boolean {
    const lowerExplanation = explanation.toLowerCase();
    // Check explicit negative indicators
    if (negativeIndicators.some(indicator => lowerExplanation.includes(indicator))) return true;
    // Catch pattern: starts with "No " followed by anything (e.g., "No concrete outcomes")
    if (/\bno\s+\w+/.test(lowerExplanation) && !/(no doubt|no issue|no problem|no question)/.test(lowerExplanation)) return true;
    return false;
  }

  function shouldBeOne(explanation: string): boolean {
    const lowerExplanation = explanation.toLowerCase();
    // Only return true if positive indicators exist AND no negative indicators
    const hasPositive = positiveIndicators.some(indicator => lowerExplanation.includes(indicator));
    const hasNegative = shouldBeZero(explanation);
    return hasPositive && !hasNegative;
  }

  // Check and correct each criterion
  const criteria: (keyof Pick<StructuredGradingResponse, 'context' | 'action' | 'result' | 'quantitative'>)[] = 
    ['context', 'action', 'result', 'quantitative'];
  
  let correctedTotal = 0;
  const corrected = { ...grading };

  for (const criterion of criteria) {
    const item = corrected[criterion];
    const originalScore = item.score;
    
    // Check for mismatch: score is 1 but explanation indicates failure
    if (item.score === 1 && shouldBeZero(item.explanation)) {
      console.log(`⚠️ Score/explanation mismatch detected for ${criterion}:`);
      console.log(`   Score: ${item.score}, Explanation: "${item.explanation.substring(0, 100)}..."`);
      console.log(`   Auto-correcting score from 1 to 0`);
      item.score = 0;
    }
    // Check for mismatch: score is 0 but explanation clearly indicates success
    else if (item.score === 0 && shouldBeOne(item.explanation)) {
      // Only correct if the explanation is CLEARLY positive (no negative indicators)
      console.log(`⚠️ Score/explanation mismatch detected for ${criterion}:`);
      console.log(`   Score: ${item.score}, Explanation: "${item.explanation.substring(0, 100)}..."`);
      console.log(`   Auto-correcting score from 0 to 1`);
      item.score = 1;
    }

    correctedTotal += item.score;
    
    if (originalScore !== item.score) {
      console.log(`✅ Corrected ${criterion} score: ${originalScore} → ${item.score}`);
    }
  }

  // Correct total if it doesn't match sum
  if (corrected.total !== correctedTotal) {
    console.log(`⚠️ Total mismatch: reported ${corrected.total}, calculated ${correctedTotal}`);
    corrected.total = correctedTotal;
  }

  return corrected;
}

// Parse JSON response with fallback handling
function parseStructuredResponse(responseText: string): StructuredGradingResponse | null {
  try {
    // First, try to find JSON in the response (in case there's extra text)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('❌ No JSON object found in response');
      return null;
    }

    const jsonStr = jsonMatch[0];
    const parsed = JSON.parse(jsonStr);

    // Validate required fields
    const requiredFields = ['context', 'action', 'result', 'quantitative', 'total', 'improvement', 'example_perfect_response'];
    for (const field of requiredFields) {
      if (!(field in parsed)) {
        console.log(`❌ Missing required field: ${field}`);
        return null;
      }
    }

    // Validate criterion structure
    const criteria = ['context', 'action', 'result', 'quantitative'];
    for (const criterion of criteria) {
      if (typeof parsed[criterion]?.score !== 'number' || 
          typeof parsed[criterion]?.explanation !== 'string') {
        console.log(`❌ Invalid structure for criterion: ${criterion}`);
        return null;
      }
      // Normalize score to 0 or 1
      parsed[criterion].score = parsed[criterion].score >= 0.5 ? 1 : 0;
    }

    // Validate and correct scores based on explanations
    const validated = validateAndCorrectScores(parsed as StructuredGradingResponse);

    console.log('✅ Successfully parsed and validated structured response');
    return validated;

  } catch (error) {
    console.error('❌ JSON parse error:', error);
    return null;
  }
}

// Legacy fallback: extract score from text format
function extractLegacyScore(responseText: string): number | null {
  const lowerText = responseText.toLowerCase();
  const scoreIndex = lowerText.indexOf('final score:');

  if (scoreIndex !== -1) {
    const afterScore = responseText.substring(scoreIndex + 13, scoreIndex + 33);
    const match = afterScore.match(/\d/);
    if (match) {
      return parseInt(match[0], 10);
    }
  }
  return null;
}

// Generate human-readable feedback from structured response
function generateFeedbackText(grading: StructuredGradingResponse): string {
  const criteriaNames = {
    context: 'Context',
    action: 'Action',
    result: 'Result',
    quantitative: 'Quantitative'
  };

  let feedback = `## Elevator Pitch Evaluation\n\n`;
  feedback += `**Total Score: ${grading.total}/4**\n\n`;
  feedback += `### Criteria Breakdown\n\n`;

  for (const [key, name] of Object.entries(criteriaNames)) {
    const criterion = grading[key as keyof typeof criteriaNames];
    const icon = criterion.score === 1 ? '✅' : '❌';
    feedback += `**${name}:** ${icon} ${criterion.score}/1\n`;
    feedback += `${criterion.explanation}\n\n`;
  }

  feedback += `### How to Improve\n\n${grading.improvement}\n\n`;
  feedback += `### Example Perfect Response\n\n${grading.example_perfect_response}`;

  return feedback;
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
    // System prompt now lives in code, not a secret
    // Old secret ELEVATOR_PITCH_SYSTEM_PROMPT is no longer needed
    
    if (!awsAccessKeyId || !awsSecretAccessKey || !awsRegion) {
      console.error('Missing AWS credentials');
      return new Response(
        JSON.stringify({
          speechContent: 'Configuration not complete - missing AWS credentials',
          contentScore: 2,
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
          contentScore: 2,
          confidence: 0,
          sources: ['Missing Data']
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Build prompt from single source of truth (carPrompt.ts)
    const enhancedPrompt = buildCARPrompt(transcript);

    console.log('Calling Nova Lite with CAR prompt...', {
      promptLength: enhancedPrompt.length,
      transcriptLength: transcript.length
    });

    // AWS Bedrock Runtime API endpoint for Nova Lite
    const endpoint = `https://bedrock-runtime.${awsRegion}.amazonaws.com`;
    const url = `${endpoint}/model/amazon.nova-lite-v1:0/converse`;

    // Prepare the request body for Nova Lite
    const novaRequestBody = {
      messages: [
        {
          role: "user",
          content: [{ text: enhancedPrompt }]
        }
      ],
      inferenceConfig: {
        maxTokens: 1500, // Increased for JSON response
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
          contentScore: 2,
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
          contentScore: 2,
          confidence: 0,
          sources: ['Nova Lite - Empty Response']
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Nova Lite response text:', responseText.substring(0, 300) + '...');

    // Try to parse as structured JSON first
    const structuredGrading = parseStructuredResponse(responseText);

    let analysisResult: NovaLiteResponse;

    if (structuredGrading) {
      // Successfully parsed structured JSON
      console.log('✅ Using structured JSON grading:', {
        total: structuredGrading.total,
        context: structuredGrading.context.score,
        action: structuredGrading.action.score,
        result: structuredGrading.result.score,
        quantitative: structuredGrading.quantitative.score
      });

      const feedbackText = generateFeedbackText(structuredGrading);

      analysisResult = {
        speechContent: feedbackText,
        contentScore: structuredGrading.total,
        confidence: 0.98, // High confidence for structured parsing
        sources: ['AWS Nova Lite Model (structured JSON)'],
        structuredGrading: structuredGrading
      };
    } else {
      // Fallback to legacy text parsing
      console.log('⚠️ Falling back to legacy text parsing');
      const legacyScore = extractLegacyScore(responseText);

      analysisResult = {
        speechContent: responseText.trim(),
        contentScore: legacyScore !== null ? legacyScore : 2,
        confidence: legacyScore !== null ? 0.85 : 0.6,
        sources: legacyScore !== null 
          ? ['AWS Nova Lite Model (legacy text extraction)']
          : ['AWS Nova Lite Model (default fallback)']
      };
    }

    console.log('Returning analysis:', {
      contentScore: analysisResult.contentScore,
      confidence: analysisResult.confidence,
      isStructured: !!structuredGrading
    });

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
        contentScore: 2, // Default fallback score
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
