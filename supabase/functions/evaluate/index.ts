import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildEvaluationPrompt,
  parseEvaluationResponse,
  type RubricCriterion,
  type EvaluationResult,
} from "../_shared/evaluationPrompt.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface EvaluateRequest {
  transcript: string;
  rubric_id?: string;
  assignment_id?: string;
  dry_run?: boolean;
  student_id?: string;
}

interface EvaluateResponse {
  evaluation_id?: string;
  criteria_scores: Array<{
    criterion_id: string;
    criterion_name: string;
    score: number;
    max_score: number;
    feedback: string;
  }>;
  total_score: number;
  max_total_score: number;
  overall_feedback: string;
  improvement_suggestions: string;
  fallback?: boolean;
  raw_response?: string;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

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

  const canonicalUri = urlObj.pathname
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');

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

async function callClaudeViaBedrockWithPrompt(
  prompt: string,
  awsAccessKeyId: string,
  awsSecretAccessKey: string,
  awsRegion: string
): Promise<string> {
  const endpoint = `https://bedrock-runtime.${awsRegion}.amazonaws.com`;
  const url = `${endpoint}/model/anthropic.claude-3-haiku-20240307-v1:0/invoke`;

  const bedrockRequestBody = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.3,
    top_p: 0.9
  };

  const bodyStr = JSON.stringify(bedrockRequestBody);
  const awsSignature = await createAWSSignature(
    'POST',
    url,
    bodyStr,
    awsAccessKeyId,
    awsSecretAccessKey,
    awsRegion
  );

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': awsSignature.authorization,
      'X-Amz-Date': awsSignature.amzDate,
      'Accept': 'application/json'
    },
    body: bodyStr
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Bedrock API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  const content = result.content?.[0]?.text || result.completion || '';
  return content;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const awsAccessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const awsSecretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    const awsRegion = Deno.env.get('AWS_REGION') || 'us-east-1';

    if (!awsAccessKeyId || !awsSecretAccessKey) {
      return errorResponse('AWS Bedrock configuration not complete', 500);
    }

    const body: EvaluateRequest = await req.json();
    const { transcript, dry_run = false, student_id } = body;
    let { rubric_id, assignment_id } = body;

    if (!transcript || transcript.trim().length === 0) {
      return errorResponse('transcript is required');
    }

    // If assignment_id is provided but rubric_id is not, fetch rubric_id from assignment
    if (assignment_id && !rubric_id) {
      const { data: assignment, error: assignmentError } = await supabase
        .from('assignments')
        .select('rubric_id')
        .eq('id', assignment_id)
        .single();

      if (assignmentError || !assignment) {
        return errorResponse('Assignment not found', 404);
      }

      if (!assignment.rubric_id) {
        return errorResponse('Assignment does not have a rubric assigned', 400);
      }

      rubric_id = assignment.rubric_id;
    }

    if (!rubric_id) {
      return errorResponse('rubric_id or assignment_id is required');
    }

    console.log('Evaluate request:', {
      transcriptLength: transcript.length,
      rubric_id,
      assignment_id: assignment_id || 'not provided',
      dry_run,
      student_id: student_id || 'not provided'
    });

    const { data: rubric, error: rubricError } = await supabase
      .from('rubrics')
      .select('*')
      .eq('id', rubric_id)
      .single();

    if (rubricError || !rubric) {
      return errorResponse('Rubric not found', 404);
    }

    const { data: criteria, error: criteriaError } = await supabase
      .from('rubric_criteria')
      .select('*')
      .eq('rubric_id', rubric_id)
      .order('order', { ascending: true });

    if (criteriaError || !criteria || criteria.length === 0) {
      return errorResponse('Rubric has no criteria', 400);
    }

    const typedCriteria: RubricCriterion[] = criteria.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      examples: c.examples || null,
      max_points: c.max_points,
      order: c.order,
    }));

    const prompt = buildEvaluationPrompt({
      rubricName: rubric.name,
      rubricContext: rubric.context || null,
      criteria: typedCriteria,
      transcript,
    });

    console.log('Calling Claude via Bedrock for evaluation...');

    const rawResponse = await callClaudeViaBedrockWithPrompt(
      prompt,
      awsAccessKeyId,
      awsSecretAccessKey,
      awsRegion
    );

    console.log('Bedrock response received, parsing...');

    const parsedResult = parseEvaluationResponse(rawResponse);
    const isFallback = parsedResult === null;

    let response: EvaluateResponse;

    if (isFallback) {
      console.log('JSON parse failed, using fallback mode');
      const maxTotal = typedCriteria.reduce((sum, c) => sum + c.max_points, 0);
      response = {
        criteria_scores: [],
        total_score: 0,
        max_total_score: maxTotal,
        overall_feedback: '',
        improvement_suggestions: '',
        fallback: true,
        raw_response: rawResponse,
      };
    } else {
      response = {
        criteria_scores: parsedResult.criteria_scores,
        total_score: parsedResult.total_score,
        max_total_score: parsedResult.max_total_score,
        overall_feedback: parsedResult.overall_feedback,
        improvement_suggestions: parsedResult.improvement_suggestions,
        fallback: false,
      };
    }

    if (!dry_run) {
      console.log('Storing evaluation in database...');

      const evaluationInsert = {
        student_id: student_id || null,
        rubric_id,
        transcript,
        total_score: response.total_score,
        max_total_score: response.max_total_score,
        overall_feedback: response.overall_feedback,
        improvement_suggestions: response.improvement_suggestions,
        is_fallback: isFallback,
        raw_response: isFallback ? rawResponse : null,
      };

      const { data: evaluation, error: evalError } = await supabase
        .from('evaluations')
        .insert(evaluationInsert)
        .select()
        .single();

      if (evalError) {
        console.error('Error storing evaluation:', evalError);
        return errorResponse('Failed to store evaluation', 500);
      }

      response.evaluation_id = evaluation.id;

      if (!isFallback && response.criteria_scores.length > 0) {
        const scoresToInsert = response.criteria_scores.map((cs) => ({
          evaluation_id: evaluation.id,
          criterion_id: cs.criterion_id,
          score: cs.score,
          max_score: cs.max_score,
          feedback: cs.feedback,
        }));

        const { error: scoresError } = await supabase
          .from('evaluation_scores')
          .insert(scoresToInsert);

        if (scoresError) {
          console.error('Error storing evaluation scores:', scoresError);
        }
      }

      console.log('Evaluation stored with ID:', evaluation.id);
    }

    return jsonResponse(response);
  } catch (error) {
    console.error('Evaluate API error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
});
