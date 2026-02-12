# Speakeasy — AI-Assisted Development Session Transcript

> **What is Speakeasy?** Speakeasy is an AI-powered platform for higher education that helps students improve their public speaking and communication skills. Students record video responses to prompts, and AI evaluates their delivery — grading structure, content, filler words, and body language against teacher-selected rubrics. Professors get analytics dashboards showing student improvement over time.

> **What's happening in this session:** This is a live development session building Speakeasy. I use AI as a force multiplier — I make the architecture and product decisions while it handles implementation at speed. My role is directing what gets built, making tradeoffs (storage vs. data retention, file-based rubrics vs. database-only), and debugging through live testing. The debugging sections show how real production issues surface and get resolved through iterative testing — including a 4-layer bug chain where fixing one issue exposed the next. The entire conversation happens over Telegram while I test on my local machine and the AI writes code, creates PRs, and deploys remotely. Three major features were designed, built, and shipped in a single ~4 hour session.

---

## User
Okay now I want to be able to start using different rubrics. Let's go back and forth to get this right first. For the future I want to have a bunch of rubrics pre-made that teachers can choose. Right now I just have the CAR Framework as the only possible rubric. We need to make it so that the teacher can choose rubrics when creating assignments, whatever they choose should be the rubric that AWS runs the transcript against.

## Assistant
Got it — rubric system upgrade. Let me make sure I understand the full picture before we build:

**Current State Questions:**
1. **Assignment schema** — Where are assignments stored? Supabase table? What fields exist currently?
2. **CAR Framework** — Is this hardcoded in the AWS evaluation logic, or stored somewhere?
3. **AWS evaluation** — Lambda? Bedrock prompt? Where does the rubric currently live in that flow?

**Design Questions:**
4. **Rubric storage** — You want a `rubrics` table with pre-made options teachers can pick from, right? Or are teachers also creating custom rubrics eventually?
5. **"Second transcript"** — Clarify this for me. You mean multiple attempts per student per assignment? Or a different transcript type entirely?

**Quick sketch of what I'm hearing:**

```
rubrics table
├── id, name, description, criteria (JSON or structured)

assignments table  
├── ... existing fields
├── rubric_id (FK → rubrics)

transcripts table
├── ... existing fields
├── assignment_id (FK → assignments)
```

Then AWS pulls the rubric via `assignment_id → rubric_id` when scoring.

That the right direction?

## User
1. Supabase table, right now the teacher just creates a title, description, start date, and due date. 2. Hardcoded in carPrompt.ts but then I have to do: "supabase functions deploy bedrock-agent" 3. Bedrock claude prompt. idk maybe edge function? 4. Yeah maybe we have to make a storage for the rubrics, then throw that into the bedrock edge function, idk 5. Sorry not second transcript, just that the transcript is ran through the right rubric based on the assignment.

## Assistant
Perfect, now I've got it. Here's the play:

**The Flow:**
```
Teacher creates assignment → picks rubric
Student submits transcript → linked to assignment
Edge function scores → pulls rubric via assignment_id
```

**What we need to build:**
1. `rubrics` table — pre-made rubrics with their criteria
2. Add `rubric_id` to `assignments` table
3. Update assignment creation UI — dropdown to pick rubric
4. Update `bedrock-agent` edge function — fetch rubric dynamically instead of hardcoded CAR

Let me see the current setup. Can you point me to the Speakeasy repo path?

## User
https://github.com/cnmarnell/speakeasy

## Assistant
Got the full picture. Here's what I see:

**Current State:**
- CAR Framework hardcoded in `carPrompt.ts`
- Previous rubric tables were created then dropped
- Detailed PRD already exists for rebuilding this

**Implementation Plan:**

### 1. Database
```sql
CREATE TABLE rubrics (id UUID, name TEXT, description TEXT, context TEXT, is_system BOOLEAN);
CREATE TABLE rubric_criteria (id UUID, rubric_id UUID, name TEXT, description TEXT, max_points INTEGER, sort_order INTEGER);
ALTER TABLE assignments ADD COLUMN rubric_id UUID REFERENCES rubrics(id);
```

### 2. Edge Function (`bedrock-agent`)
- Accept `assignment_id` in request
- Look up `assignment → rubric_id → rubric + criteria`
- Build dynamic prompt from criteria instead of hardcoded CAR
- Fallback to CAR if no rubric assigned

### 3. Frontend (`NewAssignmentModal`)
- Fetch rubrics on modal open
- Add dropdown: "Select Rubric" with options
- Pass `rubric_id` to `createAssignment()`

**Questions before I build:**
1. Start with CAR only or add more rubrics now?
2. Required or optional? Should rubric be required when creating assignments, or default to CAR if not selected?

## User
Awesome! Now how can I create a new rubric?

## Assistant
Two options:

**Option 1: I create it for you now** (fastest) — tell me the rubric details and I'll insert it directly via the API.

**Option 2: Supabase Dashboard** (manual) — Go to Table Editor, insert rows into `rubrics` and `rubric_criteria`.

**Option 3: Build a Rubric Creator UI** (future) — Add a teacher-facing page to create/edit rubrics.

What rubric do you want to add?

## User
Mmmm I think the rubrics should be pretty detailed, I would prefer to type it out in a file. Like how carPrompt.ts is.

## Assistant
Smart. Detailed rubrics need room to breathe. Here's how I'd structure it:

**File-based rubrics:**
```
supabase/functions/_shared/rubrics/
├── carFramework.ts      # Current CAR prompt
├── elevatorPitch.ts     # 60-second pitch
└── index.ts             # Registry mapping
```

Each file exports the full detailed prompt. Database just stores the `prompt_key` to look up which file to use. You write detailed `.ts` files like you're used to. Database just points to them.

Then when you want a new rubric, you just create a file like `myRubric.ts` and add it to the registry.

---

*[AI builds the full rubric system — database migration, file-based prompt registry, edge function rewrite, frontend dropdown — and pushes code]*

---

## Assistant
Done. Code pushed.

| Component | Status |
|-----------|--------|
| ✅ Database | `rubrics` + `rubric_criteria` tables created, CAR Framework seeded |
| ✅ Frontend | Rubric dropdown in NewAssignmentModal |
| ✅ Data layer | `getRubrics()`, `createAssignment` with rubric_id |
| ⏳ Edge function | Needs deploy: `supabase functions deploy bedrock-agent` |

Once deployed, teachers select a rubric when creating assignments → students submit → graded against that rubric. 🎯

---

## User
*[Tests the new Elevator Pitch rubric — grading output is wrong]*

This is the code I'm using for the elevator pitch rubric... the grading is scoring things wrong.

## Assistant
Found it! You updated the prompt but not the metadata at the top. The parser looks at the `criteria` array to know which JSON keys to extract from Claude's response.

Look at this line in `parseRubricResponse`:

```js
const key = criterion.toLowerCase().replace(/\s+/g, '_');
```

Your criteria array says `'Clarity and Structure'` which converts to `clarity_and_structure`. But the JSON response from Claude uses `clarity_structure` (no "and"). So it doesn't match, gets skipped, and never shows up in the feedback.

**The rule:** criteria names must match the JSON keys exactly when lowercased and spaces replaced with underscores.

- `'Structure'` → `structure` ✅
- `'Clarity and Structure'` → `clarity_and_structure` but Claude returns `clarity_structure` ❌

Fixed and pushed.

---

## User
I think a big pro of this web app is being able to turn all of this qualitative data into quantitative data. How should we go about building an analytics section for the teacher?

## Assistant
That's a huge selling point — professors currently have zero data on speaking skills. You'd be giving them something nobody else offers.

**Key metrics teachers would want:**

**Per Student:**
- Score trend over time (are they improving?)
- Strengths/weaknesses by criteria
- Filler word trend (decreasing over semester = growth)

**Per Class:**
- Class average per assignment
- Score distribution (who's struggling, who's excelling)
- Most common weak criteria across the class
- Class improvement over time

**Per Assignment:**
- Average score vs other assignments
- Which criteria students scored lowest on
- Before/after comparison if students resubmit

You already have all this data in `grades`, `feedback`, and `submissions` tables. It's just about querying and visualizing it.

This is the kind of feature that makes a prof go "I NEED this for my department." It's your differentiator.

Want me to build it?

## User
Yes — also make it look really good. Use charts.

## Assistant
On it — building the full analytics dashboard with charts and everything. I'll ping you when the PR is ready. 🔥

*[3 minutes later]*

PR is up → https://github.com/cnmarnell/speakeasy/pull/60

Full analytics dashboard — overview cards, score trends over time, score distribution, criteria radar chart, filler word trends, and a student leaderboard with improvement tracking. Built with Recharts. "Analytics" button on the class page to access it.

## User
The analytics looks good but I think we should change some things. Let's go back and forth until this is right. 2 ways for teachers to see improvement: 1st per assignment, seeing the graph and difference in filler word count and speech content analysis grade with the x as the number of submissions. 2nd is macro scale of how grades changing assignment to assignment.

That means we have to start collecting more data, storing how many different submissions were submitted and the respective grades with each submission. What do you think?

## Assistant
From a CS perspective — you should already have this data. Each submission is a row in `submissions` tied to a `student_id` and `assignment_id`. If a student submits 3 times, that's 3 rows with their own grades. We just need to query them in order.

Let me check if that's actually the case...

Here's the issue — **resubmissions overwrite the existing submission**. It updates the same row instead of creating a new one. So you're losing all the historical data. A student submits 3 times and you only have the last attempt.

**From a business perspective:** This is a must-fix. Showing improvement over attempts is your killer feature. Professors can literally see "this student went from 1/3 to 3/3 after 4 attempts" — that's proof that the platform works and justifies the price tag.

**What needs to change:**
1. Stop overwriting — every attempt creates a new row. Add `attempt_number` column.
2. Keep all grades — each submission gets its own grade.
3. Frontend — show attempt history per student per assignment.

**One concern:** Storage. If students submit 10 times, that's 10 videos. Maybe cap retakes or delete old videos but keep the grades. What do you think?

## User
Yeah I was thinking delete old submissions but keep scores, lmk what I have to do on my end.

## Assistant
Building it now. Here's what you'll need to do once it's ready:

1. Run this in Supabase SQL Editor:
```sql
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1;
```

2. Pull the branch and test.

That's it from your side. I'll handle all the code changes.

*[Sub-agent builds the feature in ~3 minutes]*

## User
I submitted twice but it only shows the average for 1 submission.

## Assistant
Did you pull the latest code before submitting? The old submission logic overwrites — the new attempt tracking only works with the updated code.

Check in Supabase — look at the `submissions` table. Do you see 2 rows or just 1?

## User
*[Checks database — every attempt_number is 1]*

## Assistant
Every `attempt_number` is `1` — the new submission logic isn't running yet. You're still on the old code that overwrites.

Let me check which function your app actually calls...

Found it — `VideoRecorder.jsx` inserts directly into Supabase, **not** through the `createSubmission` or `createQueuedSubmission` functions in `supabaseData.js`. The sub-agent updated `supabaseData.js` but the actual submission path was never touched. That's the bug.

*[Fixes the real submission path]*

## User
*[Tests again — still broken]*

## Assistant
There it is — **`initiateSubmission` in `supabaseData.js`** is the *real* submission path, and it still has the old overwrite logic. The sub-agent's changes went to `createSubmission` but the app actually uses `initiateSubmission`. The app had three different submission code paths and we only fixed the wrong ones.

That was the real bug. Pull, restart, and test.

## User
Failed to submit video: duplicate key value violates unique constraint "submissions_assignment_id_student_id_key". Please try again.

## Assistant
There's a unique constraint on `(assignment_id, student_id)` — it only allows one submission per student per assignment. We need to drop that constraint to allow multiple attempts.

Run this in Supabase SQL Editor:
```sql
ALTER TABLE submissions DROP CONSTRAINT submissions_assignment_id_student_id_key;
```

## User
*[Drops constraint, tries again — new error]*

Failed to load resource: the server responded with a status of 406... submissions?select=id,status...&student_id=eq.5b250afc...&assignment_id=eq.71d3127c...

## Assistant
406 means the query expects a single row (`.single()`) but now returns multiple rows since we removed the unique constraint. There are queries elsewhere that assume one submission per student per assignment.

*[Searches codebase for all `.single()` calls on submissions]*

Fixed — three queries were using `.single()` on submissions filtered by student+assignment, which broke when multiple attempts exist. Now they all use `.order('attempt_number', { ascending: false }).limit(1)` to grab the latest attempt.

Pull and test.

## User
The analytics look great, can you make the graphs larger?

## Assistant
*[Pushes CSS update]*

Done — charts bumped to 400px height, full-width containers. Pull and refresh.

---

## User
*[Later that evening]*

Yeah just merge PR #60. You can do it from terminal:

```bash
git checkout main
git merge feature/teacher-analytics
git push origin main
```

## Assistant
Done! Analytics dashboard with attempt tracking, score trends, and all the visualization is now on main. 🚀

---

*This session covered approximately 4 hours of development. In that time, three major features were designed, built, and debugged: a dynamic rubric system with file-based prompts, a full analytics dashboard with Recharts visualizations, and a multi-attempt submission system. Multiple real bugs were discovered and fixed through live testing — including a criteria key mismatch between AI output and the parser, a submission overwrite bug that was silently destroying historical data, a database unique constraint blocking multi-attempt submissions, and `.single()` queries breaking when the data model changed. Total PRs created in this session: 4.*
