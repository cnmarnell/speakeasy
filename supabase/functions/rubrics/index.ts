import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface Criterion {
  id?: string;
  name: string;
  description?: string;
  max_points: number;
  order: number;
}

interface RubricInput {
  name: string;
  description?: string;
  criteria: Criterion[];
}

interface RubricRow {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface CriterionRow {
  id: string;
  rubric_id: string;
  name: string;
  description: string | null;
  max_points: number;
  order: number;
  created_at: string;
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

async function getTeacherId(supabase: ReturnType<typeof createClient>, authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) return null;
  
  const { data: teacher } = await supabase
    .from('teachers')
    .select('id')
    .eq('email', user.email)
    .single();
  
  return teacher?.id || null;
}

function validateRubricInput(input: RubricInput): string | null {
  if (!input.name || input.name.trim().length === 0) {
    return 'Rubric name is required';
  }
  
  if (!input.criteria || !Array.isArray(input.criteria) || input.criteria.length === 0) {
    return 'Rubric must have at least 1 criterion';
  }
  
  for (let i = 0; i < input.criteria.length; i++) {
    const criterion = input.criteria[i];
    if (!criterion.name || criterion.name.trim().length === 0) {
      return `Criterion ${i + 1} must have a name`;
    }
    if (typeof criterion.max_points !== 'number' || criterion.max_points < 1) {
      return `Criterion "${criterion.name}" must have max_points >= 1`;
    }
  }
  
  return null;
}

async function handleGet(
  supabase: ReturnType<typeof createClient>,
  rubricId: string | null,
  teacherId: string | null
) {
  if (rubricId) {
    const { data: rubric, error: rubricError } = await supabase
      .from('rubrics')
      .select('*')
      .eq('id', rubricId)
      .single();

    if (rubricError || !rubric) {
      return errorResponse('Rubric not found', 404);
    }

    const { data: criteria } = await supabase
      .from('rubric_criteria')
      .select('*')
      .eq('rubric_id', rubricId)
      .order('order', { ascending: true });

    return jsonResponse({ ...rubric, criteria: criteria || [] });
  }

  let query = supabase.from('rubrics').select('*');
  
  if (teacherId) {
    query = query.eq('created_by', teacherId);
  }
  
  const { data: rubrics, error } = await query.order('created_at', { ascending: false });

  if (error) {
    return errorResponse('Failed to fetch rubrics', 500);
  }

  const rubricsWithCriteria = await Promise.all(
    (rubrics || []).map(async (rubric: RubricRow) => {
      const { data: criteria } = await supabase
        .from('rubric_criteria')
        .select('*')
        .eq('rubric_id', rubric.id)
        .order('order', { ascending: true });
      
      return { ...rubric, criteria: criteria || [] };
    })
  );

  return jsonResponse(rubricsWithCriteria);
}

async function handlePost(
  supabase: ReturnType<typeof createClient>,
  body: RubricInput,
  teacherId: string | null
) {
  const validationError = validateRubricInput(body);
  if (validationError) {
    return errorResponse(validationError);
  }

  const { data: rubric, error: rubricError } = await supabase
    .from('rubrics')
    .insert({
      name: body.name.trim(),
      description: body.description?.trim() || null,
      created_by: teacherId,
    })
    .select()
    .single();

  if (rubricError || !rubric) {
    console.error('Error creating rubric:', rubricError);
    return errorResponse('Failed to create rubric', 500);
  }

  const criteriaToInsert = body.criteria.map((c, idx) => ({
    rubric_id: rubric.id,
    name: c.name.trim(),
    description: c.description?.trim() || null,
    max_points: c.max_points,
    order: c.order ?? idx,
  }));

  const { data: criteria, error: criteriaError } = await supabase
    .from('rubric_criteria')
    .insert(criteriaToInsert)
    .select();

  if (criteriaError) {
    console.error('Error creating criteria:', criteriaError);
    await supabase.from('rubrics').delete().eq('id', rubric.id);
    return errorResponse('Failed to create criteria', 500);
  }

  return jsonResponse({ ...rubric, criteria }, 201);
}

async function handlePut(
  supabase: ReturnType<typeof createClient>,
  rubricId: string,
  body: RubricInput,
  teacherId: string | null
) {
  const { data: existingRubric, error: fetchError } = await supabase
    .from('rubrics')
    .select('*')
    .eq('id', rubricId)
    .single();

  if (fetchError || !existingRubric) {
    return errorResponse('Rubric not found', 404);
  }

  if (existingRubric.created_by && teacherId && existingRubric.created_by !== teacherId) {
    return errorResponse('Not authorized to edit this rubric', 403);
  }

  const validationError = validateRubricInput(body);
  if (validationError) {
    return errorResponse(validationError);
  }

  const { error: updateError } = await supabase
    .from('rubrics')
    .update({
      name: body.name.trim(),
      description: body.description?.trim() || null,
    })
    .eq('id', rubricId);

  if (updateError) {
    console.error('Error updating rubric:', updateError);
    return errorResponse('Failed to update rubric', 500);
  }

  const { error: deleteError } = await supabase
    .from('rubric_criteria')
    .delete()
    .eq('rubric_id', rubricId);

  if (deleteError) {
    console.error('Error deleting old criteria:', deleteError);
    return errorResponse('Failed to update criteria', 500);
  }

  const criteriaToInsert = body.criteria.map((c, idx) => ({
    rubric_id: rubricId,
    name: c.name.trim(),
    description: c.description?.trim() || null,
    max_points: c.max_points,
    order: c.order ?? idx,
  }));

  const { data: criteria, error: insertError } = await supabase
    .from('rubric_criteria')
    .insert(criteriaToInsert)
    .select();

  if (insertError) {
    console.error('Error inserting new criteria:', insertError);
    return errorResponse('Failed to update criteria', 500);
  }

  const { data: updatedRubric } = await supabase
    .from('rubrics')
    .select('*')
    .eq('id', rubricId)
    .single();

  return jsonResponse({ ...updatedRubric, criteria });
}

async function handleDelete(
  supabase: ReturnType<typeof createClient>,
  rubricId: string,
  teacherId: string | null
) {
  const { data: existingRubric, error: fetchError } = await supabase
    .from('rubrics')
    .select('*')
    .eq('id', rubricId)
    .single();

  if (fetchError || !existingRubric) {
    return errorResponse('Rubric not found', 404);
  }

  if (existingRubric.created_by && teacherId && existingRubric.created_by !== teacherId) {
    return errorResponse('Not authorized to delete this rubric', 403);
  }

  const { error: deleteError } = await supabase
    .from('rubrics')
    .delete()
    .eq('id', rubricId);

  if (deleteError) {
    console.error('Error deleting rubric:', deleteError);
    return errorResponse('Failed to delete rubric', 500);
  }

  return jsonResponse({ success: true, message: 'Rubric deleted' });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('authorization');
    const teacherId = await getTeacherId(supabase, authHeader);

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const rubricId = pathParts.length > 2 ? pathParts[pathParts.length - 1] : null;
    
    const isValidUuid = rubricId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rubricId);
    const finalRubricId = isValidUuid ? rubricId : null;

    switch (req.method) {
      case 'GET':
        return await handleGet(supabase, finalRubricId, teacherId);

      case 'POST': {
        const body = await req.json() as RubricInput;
        return await handlePost(supabase, body, teacherId);
      }

      case 'PUT': {
        if (!finalRubricId) {
          return errorResponse('Rubric ID required for update', 400);
        }
        const body = await req.json() as RubricInput;
        return await handlePut(supabase, finalRubricId, body, teacherId);
      }

      case 'DELETE': {
        if (!finalRubricId) {
          return errorResponse('Rubric ID required for delete', 400);
        }
        return await handleDelete(supabase, finalRubricId, teacherId);
      }

      default:
        return errorResponse('Method not allowed', 405);
    }
  } catch (error) {
    console.error('Rubrics API error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
});
