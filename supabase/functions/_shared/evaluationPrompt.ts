/**
 * Shared evaluation prompt builder and response parser
 * Used by the /evaluate edge function for rubric-based grading
 */

export interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  examples: string | null;
  max_points: number;
  order: number;
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

interface PromptInput {
  rubricName: string;
  rubricContext: string | null;
  criteria: RubricCriterion[];
  transcript: string;
}

/**
 * Build a structured evaluation prompt that requests JSON output
 */
export function buildEvaluationPrompt(input: PromptInput): string {
  const { rubricName, rubricContext, criteria, transcript } = input;

  const criteriaJson = criteria.map(c => ({
    id: c.id,
    name: c.name,
    description: c.description,
    examples: c.examples,
    max_points: c.max_points
  }));

  const maxTotal = criteria.reduce((sum, c) => sum + c.max_points, 0);

  return `You are an expert evaluator for speech and presentation assignments. Evaluate the following transcript against the provided rubric.

## Rubric: ${rubricName}
${rubricContext ? `\n### Context\n${rubricContext}\n` : ''}

### Criteria
${JSON.stringify(criteriaJson, null, 2)}

## Transcript to Evaluate
${transcript}

## Instructions
Evaluate the transcript against EACH criterion in the rubric. For each criterion:
1. Carefully read the description and examples
2. Assess how well the transcript meets the criterion
3. Assign a score from 0 to the max_points for that criterion
4. Provide specific feedback explaining the score

IMPORTANT CONSISTENCY RULES:
- If your feedback says the criterion was "not met", "missing", "lacks", or similar negative language, the score MUST be 0
- If your feedback says the criterion was "met", "demonstrated", "included", or similar positive language, the score should reflect that
- Your score MUST match your feedback explanation
- Be consistent: don't give points for criteria you say weren't met

Respond with ONLY a valid JSON object in this exact format:
{
  "criteria_scores": [
    {
      "criterion_id": "<criterion id>",
      "criterion_name": "<criterion name>",
      "score": <number 0 to max_points>,
      "max_score": <max_points>,
      "feedback": "<specific feedback for this criterion>"
    }
  ],
  "total_score": <sum of all scores>,
  "max_total_score": ${maxTotal},
  "overall_feedback": "<overall assessment of the transcript>",
  "improvement_suggestions": "<specific suggestions for improvement>"
}

Respond with ONLY the JSON object, no additional text before or after.`;
}

/**
 * Validate that scores match their feedback explanations
 */
function validateScoreConsistency(criterionScore: CriterionScore): CriterionScore {
  const negativeIndicators = [
    'not met', 'not include', 'did not', 'does not', 'lacks', 'missing',
    'no mention', 'absent', 'failed to', 'without', 'unclear', 'vague',
    'not provide', 'not demonstrate', 'not present', 'not evident',
    'could not find', 'unable to identify', 'not addressed', 'needs to include'
  ];

  const feedback = criterionScore.feedback.toLowerCase();
  const hasNegativeIndicator = negativeIndicators.some(ind => feedback.includes(ind));

  // If feedback is clearly negative but score > 0, this is a mismatch
  if (hasNegativeIndicator && criterionScore.score > 0) {
    console.log(`⚠️ Score/feedback mismatch for "${criterionScore.criterion_name}":`);
    console.log(`   Score: ${criterionScore.score}, Feedback contains negative indicators`);
    console.log(`   Auto-correcting score to 0`);
    return {
      ...criterionScore,
      score: 0
    };
  }

  return criterionScore;
}

/**
 * Parse and validate the AI's evaluation response
 * Returns null if parsing fails completely
 */
export function parseEvaluationResponse(responseText: string): EvaluationResult | null {
  try {
    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('❌ No JSON object found in evaluation response');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!Array.isArray(parsed.criteria_scores) || 
        typeof parsed.total_score !== 'number' ||
        typeof parsed.max_total_score !== 'number' ||
        typeof parsed.overall_feedback !== 'string' ||
        typeof parsed.improvement_suggestions !== 'string') {
      console.log('❌ Missing required fields in evaluation response');
      return null;
    }

    // Validate and correct each criterion score
    const validatedScores = parsed.criteria_scores.map((cs: CriterionScore) => {
      // Ensure score doesn't exceed max
      const clampedScore = Math.min(cs.score, cs.max_score);
      return validateScoreConsistency({
        ...cs,
        score: Math.max(0, clampedScore)
      });
    });

    // Recalculate total based on validated scores
    const calculatedTotal = validatedScores.reduce((sum: number, cs: CriterionScore) => sum + cs.score, 0);

    if (calculatedTotal !== parsed.total_score) {
      console.log(`⚠️ Total score mismatch: reported ${parsed.total_score}, calculated ${calculatedTotal}`);
    }

    return {
      criteria_scores: validatedScores,
      total_score: calculatedTotal,
      max_total_score: parsed.max_total_score,
      overall_feedback: parsed.overall_feedback,
      improvement_suggestions: parsed.improvement_suggestions
    };

  } catch (error) {
    console.error('❌ Failed to parse evaluation response:', error);
    return null;
  }
}
