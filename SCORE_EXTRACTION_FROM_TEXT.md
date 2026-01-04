# Speech Content Score Extraction from AI Text Response

## Solution
The AI includes "Final Score: x/3" in its text feedback. We now extract this score directly from the text instead of using keyword inference.

## How It Works

### 1. AI Response Format
The AI returns text feedback that includes:
```
[Detailed feedback about the speech...]

Final Score: 2/3
```

### 2. Edge Function Extraction
The edge function (`bedrock-agent/index.ts`) uses regex to find the score:

```typescript
const scoreMatch = responseText.match(/Final Score:\s*(\d)\/3/i);
```

**Extraction Priority:**
1. First, looks for "Final Score: x/3" pattern (case-insensitive)
2. If not found, tries to parse JSON format (backward compatible)
3. If neither found, defaults to score = 2

### 3. Response Structure
Edge function returns:
```json
{
  "speechContent": "Full AI feedback text...",
  "contentScore": 2,
  "confidence": 0.95,
  "sources": ["AWS Nova Lite Model (extracted score)"]
}
```

### 4. Client Code Usage
The client code (`bedrockAgent.js`) already uses the explicit `contentScore`:

```javascript
const explicitScore = typeof result.contentScore === 'number' ? result.contentScore : null
const calculatedScore = calculateContentScoreFromAnalysis(result.speechContent || '')

// Prefer explicit score from AI
return {
  overallScore: explicitScore !== null ? explicitScore : calculatedScore
}
```

## Benefits

✅ **Accurate**: Uses the AI's actual score (not keyword guessing)
✅ **Simple**: No need for JSON formatting in the prompt
✅ **Compatible**: Works with existing AI prompt
✅ **Fallback**: Still uses keyword method if pattern not found
✅ **Transparent**: Logs show which method was used

## Example Flow

1. **Student submits video** → Transcript generated
2. **AI analyzes** → Returns:
   ```
   Your speech demonstrates excellent organization with clear examples
   and strong transitions. The content is well-developed and engaging.

   Final Score: 3/3
   ```
3. **Edge function extracts** → `contentScore: 3`
4. **Database stores** → `speech_content_score: 3`
5. **Final grade** → `(3/3 * 100 * 0.8) + (filler_score * 0.2) = ...`

## Console Logs (for debugging)

When a speech is submitted, check browser console for:
- `"Extracted score from text: 2"` ✅ Found "Final Score: 2/3"
- `"Score comparison: { explicit: 2, calculated: 2, using: 'explicit' }"` ✅ Using extracted score

If the pattern isn't found:
- `"No JSON score found, will use text-based extraction"`
- `"scoreSource: 'default fallback'"` ⚠️ Using default (2)

## Pattern Matching

The regex `/Final Score:\s*(\d)\/3/i` matches:
- "Final Score: 0/3" ✅
- "Final Score: 1/3" ✅
- "Final Score: 2/3" ✅
- "Final Score: 3/3" ✅
- "final score: 2/3" ✅ (case-insensitive)
- "Final Score:  2/3" ✅ (handles extra spaces)
- "Final Score: 2 / 3" ❌ (spaces around slash not supported)

## Files Changed

1. **supabase/functions/bedrock-agent/index.ts** (deployed ✅)
   - Added regex pattern matching for "Final Score: x/3"
   - Returns extracted score in `contentScore` field
   - Falls back to default (2) if not found

2. **src/lib/bedrockAgent.js** (no changes needed ✅)
   - Already uses `result.contentScore` from API
   - Already has fallback logic

3. **System Prompt** (reverted to original ✅)
   - Uses original text-based format
   - AI naturally includes "Final Score: x/3" in response

## Testing

To verify it's working:
1. Submit a speech recording
2. Open browser console
3. Look for: `"Extracted score from text: X"`
4. Check that score matches the "Final Score: X/3" in the feedback
5. Verify final grade calculation uses the extracted score

## No Changes Needed

- ✅ System prompt works as-is (AI already returns the score)
- ✅ Client code already handles `contentScore` field
- ✅ Database schema unchanged
- ✅ Grading formula unchanged (80/20 content/filler)
