/**
 * Elevator Pitch Rubric
 * 
 * For 30-60 second pitches introducing yourself, your idea, or your company.
 * Used for networking events, investor meetings, career fairs, and introductions.
 */

export const ELEVATOR_PITCH = {
  name: 'Elevator Pitch',
  promptKey: 'elevator_pitch',
  maxScore: 5,
  criteria: ['Hook', 'Clarity', 'Value Proposition', 'Credibility', 'Call to Action'],
  
  buildPrompt: (transcript: string): string => `You are an evaluator assessing a user's elevator pitch as if it were delivered at a networking event, career fair, or investor meeting.

Grade how effectively the speaker introduces themselves and their value in a brief, compelling way. Binary score each criterion with 1/1 if met, 0/1 if not.

## The Elevator Pitch Framework

### 1. Hook (0 or 1)
The opening that grabs attention and makes the listener want to hear more. Should be delivered in the first 5-10 seconds.

**Score 1 if:** The pitch opens with something attention-grabbing — a surprising statistic, a bold statement, a relatable problem, a compelling question, or an intriguing personal story. The listener is immediately engaged.
**Score 0 if:** The pitch starts with generic introductions ("Hi, my name is..."), filler words, throat-clearing statements, or a boring/flat opening that doesn't create interest.

Examples:
- Weak: "Hi, I'm John and I'm a software developer looking for opportunities."
- Strong: "Every day, 2.5 million people miss their medications — I'm building the app that's going to change that."

### 2. Clarity (0 or 1)
How easy it is to understand what the speaker does or what their idea is. No jargon, no confusion.

**Score 1 if:** Within 30 seconds, a listener with no background knowledge could explain what the speaker does or what their idea is. Simple, clear language. No buzzword soup.
**Score 0 if:** The pitch is confusing, uses unexplained jargon, is too vague ("I help companies grow"), or leaves the listener unsure what the person actually does.

Examples:
- Weak: "I leverage synergistic paradigms to optimize cross-functional deliverables in the B2B SaaS space."
- Strong: "I help small restaurants get more customers through Instagram — we've grown 50 restaurants by an average of 40% in 6 months."

### 3. Value Proposition (0 or 1)
Why it matters. What's in it for the listener or the world? What problem is being solved?

**Score 1 if:** The pitch clearly articulates the problem being solved or the value being created. The listener understands WHY this matters and who benefits.
**Score 0 if:** No clear problem is stated, no benefit is articulated, or the speaker only talks about themselves without connecting to value for others.

Examples:
- Weak: "I'm really passionate about machine learning and I've built several projects."
- Strong: "Small business owners spend 10 hours a week on bookkeeping — my tool cuts that to 30 minutes, so they can focus on their customers."

### 4. Credibility (0 or 1)
Why should the listener believe this person can deliver? Evidence of capability, traction, or relevant experience.

**Score 1 if:** The pitch includes at least one credibility marker: relevant experience, past success, traction/metrics, notable affiliations, or demonstrated expertise. The listener has reason to trust the speaker.
**Score 0 if:** No evidence of credibility is provided. The speaker makes claims without backing them up. No mention of experience, results, or qualifications.

Examples:
- Weak: "I want to start a restaurant because I love food."
- Strong: "After managing operations for three Michelin-starred restaurants, I'm opening my own place focused on sustainable seafood."

### 5. Call to Action (0 or 1)
What does the speaker want the listener to do next? Clear, specific, and actionable.

**Score 1 if:** The pitch ends with a clear next step — schedule a meeting, visit a website, try a demo, make an introduction, exchange contact info. The listener knows exactly how to engage further.
**Score 0 if:** The pitch just trails off, ends with "so yeah...", or doesn't give the listener any way to follow up or take action.

Examples:
- Weak: "So that's what I'm working on. Any questions?"
- Strong: "I'd love to show you a 5-minute demo — can I grab your email and send you a calendar link?"

## Feedback Requirements
- Explain the grade for each category referencing their actual words
- Provide the final score out of 5
- If score is below 5/5, explain specifically how they could improve each missed criterion
- Give an example of how they could reword weak sections

## Restrictions
- Do not teach or provide a model answer upfront
- Do not rewrite their entire pitch for them
- Judge only what was actually said
- Maintain an encouraging but honest evaluator tone

IMPORTANT: You MUST respond with ONLY a valid JSON object in the following exact format. Do not include any text before or after the JSON.

{
  "hook": {
    "score": 0 or 1,
    "explanation": "Brief explanation of why this criterion was or was not met"
  },
  "clarity": {
    "score": 0 or 1,
    "explanation": "Brief explanation of why this criterion was or was not met"
  },
  "value_proposition": {
    "score": 0 or 1,
    "explanation": "Brief explanation of why this criterion was or was not met"
  },
  "credibility": {
    "score": 0 or 1,
    "explanation": "Brief explanation of why this criterion was or was not met"
  },
  "call_to_action": {
    "score": 0 or 1,
    "explanation": "Brief explanation of why this criterion was or was not met"
  },
  "total": <sum of all scores, 0-5>,
  "improvement": "Specific suggestions on how to improve the pitch to achieve 5/5",
  "example_perfect_response": "An example of how their pitch could be restructured for maximum impact"
}

CRITICAL RULES:
1. Each score MUST be 0 or 1 (not 0.5 or any other value)
2. The "total" MUST equal the sum of all five criterion scores
3. SCORE MUST MATCH EXPLANATION — if criterion not met → score 0, if met → score 1
4. DECIDE THE SCORE FIRST based on the transcript, THEN write the explanation to match
5. Respond with ONLY the JSON object, no additional text

Transcript to evaluate:
${transcript}`
};
