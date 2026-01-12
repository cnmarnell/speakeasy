/**
 * Structured Evaluation Prompt Template
 * 
 * Dynamically generates evaluation prompts based on rubric criteria
 * and enforces strict JSON output format from the LLM.
 */

export interface RubricCriterion {
  id: string;
  name: string;
  description: string | null;
  examples: string | null;
  max_points: number;
  order: number;
}

export interface EvaluationPromptParams {
  rubricName: string;
  rubricContext?: string | null;
  criteria: RubricCriterion[];
  transcript: string;
}

export interface CriterionScore {
  criterion_id: string;
  criterion_name: string;
  score: number;
  max_score: number;
  feedback: string;
}

export interface EvaluationResult {
  criteria_scores: CriterionScore[];
  total_score: number;
  max_total_score: number;
  overall_feedback: string;
  improvement_suggestions: string;
}

/**
 * Generates a structured evaluation prompt with dynamically injected rubric criteria.
 * The prompt instructs the LLM to return ONLY valid JSON matching the EvaluationResult schema.
 */
export function buildEvaluationPrompt(params: EvaluationPromptParams): string {
  const { rubricName, rubricContext, criteria, transcript } = params;

  const criteriaList = criteria
    .sort((a, b) => a.order - b.order)
    .map((c, idx) => {
      let criterionText = `${idx + 1}. **${c.name}** (max ${c.max_points} point${c.max_points !== 1 ? 's' : ''})`;
      if (c.description) {
        criterionText += `\n   Description: ${c.description}`;
      }
      if (c.examples) {
        criterionText += `\n   Examples: ${c.examples}`;
      }
      return criterionText;
    })
    .join('\n\n');

  const criteriaScoresExample = criteria
    .slice(0, 2)
    .map((c) => ({
      criterion_id: c.id,
      criterion_name: c.name,
      score: Math.floor(c.max_points / 2),
      max_score: c.max_points,
      feedback: `Explanation of score for ${c.name}...`,
    }));

  const maxTotalScore = criteria.reduce((sum, c) => sum + c.max_points, 0);

  const jsonSchemaExample = JSON.stringify(
    {
      criteria_scores: criteriaScoresExample,
      total_score: criteriaScoresExample.reduce((s, c) => s + c.score, 0),
      max_total_score: maxTotalScore,
      overall_feedback: 'Summary of overall performance...',
      improvement_suggestions: 'Specific ways to improve...',
    },
    null,
    2
  );

  // Build the context section if provided
  const contextSection = rubricContext
    ? `## Assignment Context

${rubricContext}

`
    : '';

  return `You are an evaluation assistant grading a spoken response using the "${rubricName}" rubric.

${contextSection}## Rubric Criteria

${criteriaList}

## Instructions

1. **Evaluate the transcript** against each criterion above.
2. **Assign a score** for each criterion from 0 up to its max_points. Partial points are allowed (e.g., 0.5 if max is 1).
3. **Do not teach or rewrite the response.** Judge only what was said.
4. **Provide concise feedback** for each criterion explaining why that score was given.
5. **Calculate the total score** as the sum of all criterion scores.
6. **Write overall feedback** summarizing strengths and weaknesses.
7. **Provide improvement suggestions** with specific, actionable advice.

## CRITICAL: Output Format

Return ONLY valid JSON with no markdown, no code fences, no extra text before or after.
Do NOT wrap the JSON in \`\`\`json or any other formatting.

The JSON must match this exact schema:

${jsonSchemaExample}

Where:
- "criteria_scores" is an array with one entry per criterion containing criterion_id, criterion_name, score, max_score, and feedback
- "total_score" is the sum of all scores
- "max_total_score" is ${maxTotalScore}
- "overall_feedback" is 2-4 sentences summarizing performance
- "improvement_suggestions" is 2-4 sentences of actionable advice

## Transcript to Evaluate

${transcript}`;
}

/**
 * Attempts to parse an LLM response as valid EvaluationResult JSON.
 * Returns the parsed result or null if parsing fails.
 */
export function parseEvaluationResponse(response: string): EvaluationResult | null {
  try {
    let cleaned = response.trim();
    
    // Remove markdown code fences if present
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    // Try to extract JSON object if there's extra text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

    const parsed = JSON.parse(cleaned);

    // Validate required fields
    if (
      !Array.isArray(parsed.criteria_scores) ||
      typeof parsed.total_score !== 'number' ||
      typeof parsed.max_total_score !== 'number' ||
      typeof parsed.overall_feedback !== 'string' ||
      typeof parsed.improvement_suggestions !== 'string'
    ) {
      return null;
    }

    // Validate each criterion score
    for (const cs of parsed.criteria_scores) {
      if (
        typeof cs.criterion_id !== 'string' ||
        typeof cs.criterion_name !== 'string' ||
        typeof cs.score !== 'number' ||
        typeof cs.max_score !== 'number' ||
        typeof cs.feedback !== 'string'
      ) {
        return null;
      }
    }

    return parsed as EvaluationResult;
  } catch {
    return null;
  }
}
