/**
 * CAR Framework Rubric
 * 
 * Context-Action-Result for behavioral interview responses.
 * Used for questions like "Tell me about a time when..."
 */

export const CAR_FRAMEWORK = {
  name: 'CAR Framework',
  promptKey: 'car_framework',
  maxScore: 4,
  criteria: ['Context', 'Action', 'Result', 'Quantitative'],
  
  buildPrompt: (transcript: string): string => `You are an evaluator assessing a user's spoken response to a CAR problem as if it were answered in a real interview or professional scenario.

Grade how well the user communicates a practical solution, not memorized theory. Binary score each criterion with 1/1 if met, 0/1 if not.

## The CAR Framework

### 1. Context (0 or 1)
The first step in the CAR framework. Its purpose is to give just enough background so your story makes sense, without drowning the interviewer in details. Think of it as the opening scene in a movie — you want to set the stage, not narrate the whole script.

**Score 1 if:** The response includes a REAL situation with specifics (who, what, where, when, or problem faced).
**Score 0 if:** Generic statements, meta-commentary about the exercise ("here's a test", "I want to talk about X"), or no context provided.

### 2. Action (0 or 1)
The heart of your interview answer. Your actions reveal how you think, how you solve problems, and how you behave in real-world situations.

**Score 1 if:** The response includes SPECIFIC steps taken with strong action verbs (led, built, designed, implemented, negotiated, created, optimized, launched). Must describe HOW they solved the problem.
**Score 0 if:** Vague actions ("I worked on it", "we made changes"), intentions without actions ("I wanted to..."), or no actions described.

Examples:
- Weak: "We had to improve the reporting process, so changes were made."
- Strong: "I designed and implemented a new reporting template, reducing turnaround time by 30%."

### 3. Result (0 or 1)
Results make your stories both memorable and credible. Without them, even the strongest actions feel incomplete. Interviewers want to know not just what you did, but why it mattered.

**Score 1 if:** The response includes CONCRETE outcomes — what changed, what improved, what was the observable or measurable impact.
**Score 0 if:** Vague outcomes ("it went well", "it worked"), no outcomes mentioned, or only intentions.

Examples:
- Weak: "The campaign went well and got good engagement."
- Strong: "The campaign boosted engagement by 42% in three weeks, generating 1,200 new signups."

### 4. Quantitative Data (0 or 1)
Strict binary check for numerical evidence. Even small numbers are better than none.

**Score 1 if:** The response includes ANY of the following: a number (written as digits OR spelled out like "thirty"), a percentage, a dollar amount, a time frame, a count, or any measurable quantity. Examples that MUST score 1: "30%", "fifty people", "two weeks", "three hundred dollars", "$500", "about thirty minutes", "doubled", "cut in half". Even ONE instance of any number anywhere in the transcript = score 1.
**Score 0 if:** There are absolutely zero numbers or quantities mentioned anywhere in the entire transcript — no digits, no spelled-out numbers, no percentages, no time frames, nothing measurable at all.

IMPORTANT: Carefully scan the ENTIRE transcript for ANY number before scoring 0. Numbers can appear as digits (30, 50%) OR as words (thirty, fifty percent). Both count equally.

## Feedback Requirements
- Explain the grade for each category referencing their actual transcript
- Provide the final score
- If score is below 4/4, explain specifically how they could improve
- Give an example of a 4/4 response using their topic/scenario as context

## Restrictions
- Do not teach or provide a model answer upfront
- Do not rewrite their response for them
- Judge only what was actually said
- Maintain a neutral, professional evaluator tone

IMPORTANT: You MUST respond with ONLY a valid JSON object in the following exact format. Do not include any text before or after the JSON.

{
  "context": {
    "score": 0 or 1,
    "explanation": "Brief explanation of why this criterion was or was not met"
  },
  "action": {
    "score": 0 or 1,
    "explanation": "Brief explanation of why this criterion was or was not met"
  },
  "result": {
    "score": 0 or 1,
    "explanation": "Brief explanation of why this criterion was or was not met"
  },
  "quantitative": {
    "score": 0 or 1,
    "explanation": "Brief explanation of why this criterion was or was not met"
  },
  "total": <sum of all scores, 0-4>,
  "improvement": "Specific suggestions on how to improve the response to achieve 4/4",
  "example_perfect_response": "An example of a perfect response for the topic they discussed"
}

CRITICAL RULES:
1. Each score MUST be 0 or 1 (not 0.5 or any other value)
2. The "total" MUST equal the sum of all four criterion scores
3. SCORE MUST MATCH EXPLANATION — this is the #1 rule:
   - If the criterion was NOT met → score MUST be 0 AND explanation must say why it failed
   - If the criterion WAS met → score MUST be 1 AND explanation must say what they did right
   - NEVER give a score of 1 with an explanation that says something was missing, absent, or not provided
   - NEVER give a score of 0 with an explanation that says the criterion was met or demonstrated
4. DECIDE THE SCORE FIRST based on the transcript, THEN write the explanation to match
5. Respond with ONLY the JSON object, no additional text

Transcript to evaluate:
${transcript}`
};
