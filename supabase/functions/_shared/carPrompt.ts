/**
 * CAR Framework System Prompt — Single Source of Truth
 * 
 * This is THE grading prompt for Speakeasy. No secrets, no mystery.
 * If you want to change how grading works, change it HERE.
 * 
 * Version: 2.0
 * Last updated: 2026-01-31
 */

export const CAR_SYSTEM_PROMPT = `

CRITICAL RULES:
1. Each score MUST be 0 or 1 (not 0.5 or any other value)
2. The "total" MUST equal the sum of all four criterion scores
3. SCORE MUST MATCH EXPLANATION — this is the #1 rule:
   - If the criterion was NOT met → score MUST be 0 AND explanation must say why it failed
   - If the criterion WAS met → score MUST be 1 AND explanation must say what they did right
   - NEVER give a score of 1 with an explanation that says something was missing, absent, or not provided
   - NEVER give a score of 0 with an explanation that says the criterion was met or demonstrated
4. DECIDE THE SCORE FIRST based on the transcript, THEN write the explanation to match
5. Respond with ONLY the JSON object, no additional text`;

/**
 * Build the full prompt with the student's transcript
 */
export function buildCARPrompt(transcript: string): string {
  return `${CAR_SYSTEM_PROMPT}\n\nTranscript to evaluate:\n${transcript}`;
}
