# Speech Content Scoring Fix - Alignment with AI Feedback

## Problem
The speech content score (0-3) didn't align with the AI's actual feedback because:
- The AI only returned text feedback (no numerical score)
- The code **inferred** the score by searching for keywords ("excellent" = 3, "good" = 2, etc.)
- This caused misalignment when the AI's wording didn't match keyword patterns

**Example Issue:**
- AI says: "Your speech demonstrates strong organization with room for improvement"
- Keyword search finds "strong" → gives 2/3
- But the overall message suggests it might be between 1.5-2.5
- Score doesn't truly reflect AI's assessment

## Solution
The AI now returns **structured JSON** with an explicit numerical score (0-3) alongside the feedback text.

### Changes Made

#### 1. System Prompt (ELEVATOR_PITCH_SYSTEM_PROMPT)
Updated to request JSON response format:
```json
{
  "score": <number 0-3>,
  "feedback": "<detailed text feedback>"
}
```

The AI now explicitly provides:
- **0**: Poor - lacks organization/clarity
- **1**: Fair - basic content, needs improvement
- **2**: Good - clear organization with solid details
- **3**: Excellent - exceptional content and delivery

#### 2. Edge Function (supabase/functions/bedrock-agent/index.ts)
- Added `contentScore` field to response interface
- Parses JSON from AI response (handles markdown code blocks)
- Validates score is a number between 0-3
- Falls back to score of 2 if parsing fails
- Returns both `speechContent` (feedback text) and `contentScore` (0-3)

#### 3. Client Code (src/lib/bedrockAgent.js)
- Reads `result.contentScore` from API response
- Uses explicit AI score if available
- Falls back to keyword-based calculation only if needed
- Logs comparison between explicit and calculated scores for debugging

### How It Works Now

1. **User submits video** → Deepgram transcribes audio
2. **Transcript sent to Bedrock Agent** (AWS Nova Lite model)
3. **AI analyzes speech** and returns JSON:
   ```json
   {
     "score": 2,
     "feedback": "Your speech shows good organization..."
   }
   ```
4. **Edge function parses JSON** → extracts score (2) and feedback
5. **Client receives both values** → uses explicit score (2/3)
6. **Score stored in database** as `speech_content_score: 2`
7. **Final grade calculated**: `(2/3 * 100 * 0.8) + (filler_score * 0.2)`

### Benefits

✅ **Alignment**: Score matches what the AI actually thinks (not keyword inference)
✅ **Accuracy**: AI provides numerical assessment directly
✅ **Consistency**: Same evaluation criteria used for score and feedback
✅ **Transparency**: Console logs show both explicit and calculated scores
✅ **Fallback**: Still works if JSON parsing fails (uses score=2 default)

### Backward Compatibility

- If the AI doesn't return a valid JSON response, the system:
  - Logs a warning
  - Uses the feedback text as-is
  - Defaults to score = 2 (Good)
  - Continues processing normally

- Old submissions with keyword-inferred scores remain unchanged in the database

### Testing

To test the new system:
1. Submit a new speech recording
2. Check browser console for logs:
   - "Parsed AI response" (shows extracted score)
   - "Score comparison" (shows explicit vs calculated)
   - "Returning analysis with score" (final score used)
3. Verify the speech_content_score in results matches AI feedback tone
4. Compare feedback text sentiment with numerical score

### Files Changed

1. **supabase/functions/bedrock-agent/index.ts** (deployed ✅)
   - Added JSON parsing logic
   - Added contentScore to response
   - Added validation and fallbacks

2. **src/lib/bedrockAgent.js** (updated ✅)
   - Uses explicit score from API
   - Logs score comparison
   - Maintains fallback to calculation

3. **ELEVATOR_PITCH_SYSTEM_PROMPT** (updated ✅)
   - Now requests JSON format
   - Defines clear 0-3 scoring rubric
   - Instructs AI to return structured data

### Rollback Plan

If issues occur, revert in this order:
1. Revert system prompt to previous value (ask for text feedback only)
2. Edge function will default to score=2 for non-JSON responses
3. Client will use keyword-based calculation as fallback
4. System continues to function normally

### Future Enhancements

- Add score breakdown (organization, clarity, evidence scores)
- Track score drift (compare explicit vs keyword-inferred over time)
- Add user feedback on score accuracy
- Consider allowing teachers to adjust AI scores
