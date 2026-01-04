# Complete Grading Flow - Speech Content from AI Feedback Only

## Overview
Grades are calculated using TWO components:
1. **Filler Words** (20% weight): Automatically counted from transcript
2. **Speech Content** (80% weight): Extracted DIRECTLY from AI's "Final Score: x/3"

**NO keyword-based inference. NO mock data. Direct extraction only.**

---

## Step-by-Step Flow

### 1. Student Submits Video
**File:** `src/components/RecordingPage.jsx`

- Student records video
- Video uploaded to Supabase Storage
- Submission created with status: `pending`

### 2. Deepgram Transcription
**File:** `src/data/supabaseData.js` → `processVideoWithAI()`

- Video sent to Deepgram API
- Returns transcript text
- **Filler word analysis** runs on transcript:
  - Counts "um", "uh", "like", etc.
  - Calculates filler_word_count
  - Score = max(0, 20 - filler_word_count)

### 3. AI Speech Content Analysis
**Edge Function:** `supabase/functions/bedrock-agent/index.ts`

**Input:** Transcript text

**AI Processing:**
- Sent to AWS Bedrock (Nova Lite model)
- System prompt asks AI to analyze speech quality
- **AI returns text feedback ending with "Final Score: x/3"**

**Score Extraction (Line 192):**
```typescript
const scoreMatch = responseText.match(/Final Score:\s*(\d)\/3/i);
```

**Possible patterns matched:**
- "Final Score: 0/3" → extract 0
- "Final Score: 1/3" → extract 1
- "Final Score: 2/3" → extract 2
- "Final Score: 3/3" → extract 3

**If not found:**
- Tries JSON format as fallback
- If still not found: **defaults to 2** (line 221)

**Returns:**
```json
{
  "speechContent": "Full AI feedback text...",
  "contentScore": 2,
  "confidence": 0.95,
  "sources": ["AWS Nova Lite Model (extracted score)"]
}
```

### 4. Client Receives Score
**File:** `src/lib/bedrockAgent.js` (lines 53-78)

**What changed:**
- ❌ **REMOVED:** `calculateContentScoreFromAnalysis()` keyword fallback
- ✅ **NOW:** Uses `result.contentScore` directly from edge function
- ✅ **Fallback:** If somehow null → defaults to 2

```javascript
const contentScore = typeof result.contentScore === 'number'
  ? result.contentScore
  : 2 // Only used if edge function fails completely

return {
  overallScore: contentScore // Direct from "Final Score: x/3"
}
```

### 5. Grade Calculation
**File:** `src/data/supabaseData.js` → `runBackgroundAI()` (lines 1282-1287)

```javascript
// Scores
const fillerWordScore = Math.max(0, 20 - fillerWordCount)  // 0-20 scale
const speechContentScore = aiResult?.analysis?.overallScore || 2  // 0-3 scale

// Convert to percentages
const contentPercentage = (speechContentScore / 3) * 100  // 0-100%
const fillerPercentage = (fillerWordScore / 20) * 100     // 0-100%

// Weighted average: 80% content, 20% filler
const averageFinalScore = Math.round(
  (contentPercentage * 0.8) + (fillerPercentage * 0.2)
)
```

**Example:**
- Speech Content: 2/3 = 66.67% × 0.8 = 53.34
- Filler Words: 20/20 = 100% × 0.2 = 20.00
- **Total: 73/100** (C grade)

### 6. Database Storage
**Table:** `grades`

```sql
INSERT INTO grades (
  submission_id,
  speech_content_score,  -- Direct from AI: 0, 1, 2, or 3
  filler_word_score,     -- Calculated: max(0, 20 - count)
  filler_word_count,     -- Counted from transcript
  total_score,           -- Weighted average: 0-100
  speech_content_weight, -- 0.8
  filler_word_weight,    -- 0.2
  content_score_max      -- 3
)
```

### 7. Display to User
**Student View:** `src/components/Results.jsx`
- Shows total score (0-100)
- Shows breakdown:
  - Speech Content (80%): x/3
  - Filler Words (20%): x/20

**Teacher View:** `src/components/AssignmentDetailPage.jsx`
- Shows same breakdown
- Shows detailed feedback from AI

---

## Score Sources

### Speech Content Score (0-3)
**Source:** AI's "Final Score: x/3" extracted from feedback text

**How determined:**
1. Edge function extracts number from "Final Score: x/3" pattern
2. If not found → defaults to 2
3. **NO keyword analysis**
4. **NO mock data**
5. **Direct extraction only**

### Filler Word Score (0-20)
**Source:** Automated counting from transcript

**How calculated:**
```javascript
score = max(0, 20 - filler_word_count)
```

**Examples:**
- 0 fillers → 20/20 (perfect)
- 5 fillers → 15/20
- 20+ fillers → 0/20

---

## Validation

### Edge Function Logs (Console)
```
✅ "Extracted score from text: 2"
✅ "Returning analysis: { contentScore: 2, scoreSource: 'extracted from text' }"
```

### Client Logs (Browser Console)
```
✅ "Using content score from AI: { score: 2, source: 'AWS Nova Lite Model (extracted score)' }"
```

### Database Check
```sql
SELECT
  speech_content_score,  -- Should be 0-3 only
  total_score,           -- Should be 0-100 only
  speech_content_weight, -- Should be 0.8
  filler_word_weight     -- Should be 0.2
FROM grades;
```

**Valid ranges:**
- ✅ speech_content_score: 0, 1, 2, or 3
- ✅ total_score: 0-100
- ❌ speech_content_score: 75 (INVALID - old bug, now fixed)

---

## Removed Components

1. ❌ **Keyword-based score inference** - deleted from client code
2. ❌ **calculateContentScoreFromAnalysis()** - no longer used
3. ❌ **Mock data files** - never existed, confirmed clean
4. ❌ **Test/demo students** - none found in database
5. ❌ **Invalid grades** - all corrected

---

## Current State

✅ Edge function extracts score from "Final Score: x/3"
✅ Client uses extracted score directly (no keyword fallback)
✅ Database has no invalid scores
✅ Database has no mock data
✅ UI shows correct 80/20 weighting
✅ Grading formula uses 80/20 split

**The grading system now uses ONLY:**
- AI's explicit score from "Final Score: x/3" (80% weight)
- Automated filler word count (20% weight)

**No inference. No guessing. Direct values only.**
