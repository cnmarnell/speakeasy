/**
 * Dynamic Rubric Prompt Builder
 * 
 * Builds grading prompts from any rubric structure stored in the database.
 * Falls back to CAR Framework if no rubric is provided.
 */

export interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  max_points: number;
  sort_order: number;
  examples?: string;
}

export interface Rubric {
  id: string;
  name: string;
  description?: string;
  context?: string;
  rubric_criteria: RubricCriterion[];
}

/**
 * Build a dynamic grading prompt from a rubric
 */
export function buildDynamicPrompt(rubric: Rubric, transcript: string): string {
  const criteria = rubric.rubric_criteria.sort((a, b) => a.sort_order - b.sort_order);
  const totalPoints = criteria.reduce((sum, c) => sum + c.max_points, 0);
  
  // Build criteria section
  const criteriaSection = criteria.map((c, index) => {
    let section = `### ${index + 1}. ${c.name} (0 or ${c.max_points})
${c.description}`;
    
    if (c.examples) {
      section += `\n\n${c.examples}`;
    }
    
    return section;
  }).join('\n\n');

  // Build JSON schema for response
  const jsonSchema = criteria.map(c => {
    const key = c.name.toLowerCase().replace(/\s+/g, '_');
    return `  "${key}": {
    "score": 0 or ${c.max_points},
    "explanation": "Brief explanation of why this criterion was or was not met"
  }`;
  }).join(',\n');

  const prompt = `You are an evaluator assessing a user's spoken response using the "${rubric.name}" rubric.

Grade how well the user communicates. Binary score each criterion based on whether it was met.

${rubric.context ? `## Context\n${rubric.context}\n\n` : ''}## The ${rubric.name} Rubric

${criteriaSection}

## Feedback Requirements
- Explain the grade for each category referencing their actual transcript
- Provide the final score out of ${totalPoints}
- If score is below ${totalPoints}/${totalPoints}, explain specifically how they could improve
- Give an example of a perfect response using their topic/scenario as context

## Restrictions
- Do not teach or provide a model answer upfront
- Do not rewrite their response for them
- Judge only what was actually said
- Maintain a neutral, professional evaluator tone

IMPORTANT: You MUST respond with ONLY a valid JSON object in the following exact format. Do not include any text before or after the JSON.

{
${jsonSchema},
  "total": <sum of all scores, 0-${totalPoints}>,
  "improvement": "Specific suggestions on how to improve the response to achieve ${totalPoints}/${totalPoints}",
  "example_perfect_response": "An example of a perfect response for the topic they discussed"
}

CRITICAL RULES:
1. Each score MUST match the criterion's max points (0 or max)
2. The "total" MUST equal the sum of all criterion scores
3. SCORE MUST MATCH EXPLANATION — if criterion not met → score 0, if met → score max
4. DECIDE THE SCORE FIRST based on the transcript, THEN write the explanation to match
5. Respond with ONLY the JSON object, no additional text

Transcript to evaluate:
${transcript}`;

  return prompt;
}

/**
 * Parse response for dynamic rubric (handles any criteria structure)
 */
export function parseDynamicResponse(
  responseText: string, 
  rubric: Rubric
): { scores: Record<string, { score: number; explanation: string }>; total: number; improvement: string; example: string } | null {
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('❌ No JSON object found in response');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const criteria = rubric.rubric_criteria;
    
    const scores: Record<string, { score: number; explanation: string }> = {};
    let calculatedTotal = 0;

    for (const criterion of criteria) {
      const key = criterion.name.toLowerCase().replace(/\s+/g, '_');
      if (parsed[key]) {
        const score = Math.min(parsed[key].score || 0, criterion.max_points);
        scores[criterion.name] = {
          score,
          explanation: parsed[key].explanation || ''
        };
        calculatedTotal += score;
      }
    }

    return {
      scores,
      total: calculatedTotal,
      improvement: parsed.improvement || '',
      example: parsed.example_perfect_response || ''
    };
  } catch (error) {
    console.error('❌ JSON parse error:', error);
    return null;
  }
}

/**
 * Generate human-readable feedback from dynamic rubric response
 */
export function generateDynamicFeedback(
  rubric: Rubric,
  scores: Record<string, { score: number; explanation: string }>,
  total: number,
  improvement: string,
  example: string
): string {
  const criteria = rubric.rubric_criteria.sort((a, b) => a.sort_order - b.sort_order);
  const maxTotal = criteria.reduce((sum, c) => sum + c.max_points, 0);

  let feedback = `## ${rubric.name} Evaluation\n\n`;
  feedback += `**Total Score: ${total}/${maxTotal}**\n\n`;
  feedback += `### Criteria Breakdown\n\n`;

  for (const criterion of criteria) {
    const result = scores[criterion.name];
    if (result) {
      const icon = result.score === criterion.max_points ? '✅' : '❌';
      feedback += `**${criterion.name}:** ${icon} ${result.score}/${criterion.max_points}\n`;
      feedback += `${result.explanation}\n\n`;
    }
  }

  feedback += `### How to Improve\n\n${improvement}\n\n`;
  feedback += `### Example Perfect Response\n\n${example}`;

  return feedback;
}
