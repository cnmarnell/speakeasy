# PRD: Custom Rubric System

## Introduction

Rebuild the rubric system to allow teachers to create, edit, test, and assign custom rubrics to assignments. The system will use a structured template format (context → criteria → examples → scoring) and integrate with the DeepGram → Bedrock pipeline for grading student recordings.

Currently, there are critical bugs preventing rubric saves and assignment linking. This PRD addresses those bugs first, then enhances the calibration/testing workflow.

## Goals

- Fix rubric save edge function to allow editing existing rubrics
- Fix rubric → assignment linking so selected rubrics are actually assigned
- Enable teachers to create rubrics with context, criteria, point values, and optional examples
- Provide calibration tool where teachers can test rubrics against sample transcripts
- Ensure DeepGram transcripts flow through the correct rubric to Bedrock for grading
- Store examples in database alongside rubric criteria

## User Stories

### US-001: Fix rubric PUT edge function
**Description:** As a teacher, I want to edit an existing rubric and have my changes saved so I can refine my grading criteria.

**Acceptance Criteria:**
- [ ] Debug and fix the `rubrics` edge function PUT endpoint
- [ ] Editing a rubric name/description saves correctly
- [ ] Adding/removing/reordering criteria saves correctly
- [ ] Deploy edge function using Supabase MCP
- [ ] Verify fix works using Claude Chrome extension
- [ ] npm run build passes

### US-002: Fix rubric assignment linking
**Description:** As a teacher, I want the rubric I select when creating an assignment to actually be linked so student submissions use that rubric for grading.

**Acceptance Criteria:**
- [ ] Verify `rubric_id` is correctly passed from NewAssignmentModal to createAssignment
- [ ] Verify `rubric_id` is saved to the assignments table
- [ ] Confirm assignment fetch includes rubric_id
- [ ] Test by creating assignment with rubric, verify in Supabase dashboard
- [ ] npm run build passes

### US-003: Add examples field to rubric criteria
**Description:** As a teacher, I want to optionally include examples for each criterion so the AI grader understands what good/bad responses look like.

**Acceptance Criteria:**
- [ ] Add `examples` text column to `rubric_criteria` table (nullable)
- [ ] Update rubrics edge function to handle examples field on CRUD operations
- [ ] Deploy migration and edge function using Supabase MCP
- [ ] npm run build passes

### US-004: Update RubricFormPage with examples input
**Description:** As a teacher, I want to add optional examples when creating/editing rubric criteria.

**Acceptance Criteria:**
- [ ] Add expandable "Examples (optional)" textarea to each criterion row
- [ ] Examples saved with criterion data on form submit
- [ ] Examples loaded when editing existing rubric
- [ ] Clear visual indication that examples are optional
- [ ] npm run build passes
- [ ] Verify in browser using Claude Chrome extension

### US-005: Add context field to rubrics
**Description:** As a teacher, I want to add assignment context to my rubric so the AI grader understands what type of response is expected.

**Acceptance Criteria:**
- [ ] Add `context` text column to `rubrics` table (nullable)
- [ ] Update rubrics edge function to handle context field
- [ ] Deploy migration and edge function using Supabase MCP
- [ ] npm run build passes

### US-006: Update RubricFormPage with context input
**Description:** As a teacher, I want to provide context/background when creating a rubric.

**Acceptance Criteria:**
- [ ] Add "Assignment Context" textarea at top of rubric form
- [ ] Placeholder text explains purpose: "Describe what students are responding to..."
- [ ] Context saved with rubric data on form submit
- [ ] Context loaded when editing existing rubric
- [ ] npm run build passes
- [ ] Verify in browser using Claude Chrome extension

### US-007: Update evaluation prompt template
**Description:** As a developer, I need to update the evaluation prompt to use the new rubric structure (context, criteria with examples, dynamic scoring).

**Acceptance Criteria:**
- [ ] Update `supabase/functions/_shared/evaluationPrompt.ts`
- [ ] Include rubric context in prompt header
- [ ] Include criterion examples when present
- [ ] Dynamic max score based on sum of criteria max_points
- [ ] Output format: "Final Score: [x]/[max]"
- [ ] Deploy using Supabase MCP
- [ ] npm run build passes

### US-008: Fix evaluate edge function to use assignment's rubric
**Description:** As a system, when grading a student submission I need to fetch and use the rubric linked to that assignment.

**Acceptance Criteria:**
- [ ] Evaluate function accepts `assignment_id` parameter
- [ ] Fetches assignment's `rubric_id` from database
- [ ] Fetches full rubric with criteria and examples
- [ ] Passes rubric data to prompt builder
- [ ] Falls back gracefully if no rubric assigned
- [ ] Deploy using Supabase MCP
- [ ] npm run build passes

### US-009: Wire student recording flow to rubric-based grading
**Description:** As a student, after I complete a recording the system should grade my response using the assignment's rubric.

**Acceptance Criteria:**
- [ ] After DeepGram transcription completes, call evaluate endpoint
- [ ] Pass assignment_id so correct rubric is used
- [ ] Store evaluation results in evaluations/evaluation_scores tables
- [ ] Display results using StudentEvaluationCard
- [ ] npm run build passes
- [ ] Verify full flow in browser using Claude Chrome extension

### US-010: Fix RubricCalibrationModal functionality
**Description:** As a teacher, I want to paste a sample transcript and test my rubric to see the grading output so I can refine my criteria.

**Acceptance Criteria:**
- [ ] Debug why current calibration modal is not working
- [ ] Teacher can paste transcript text
- [ ] "Run Evaluation" calls evaluate endpoint with `dry_run: true`
- [ ] Results display in modal using StudentEvaluationCard
- [ ] Clear feedback shown if evaluation fails
- [ ] npm run build passes
- [ ] Verify in browser using Claude Chrome extension

### US-011: Add audio recording option to calibration
**Description:** As a teacher, I want to record audio in the calibration modal to test realistic transcription + grading.

**Acceptance Criteria:**
- [ ] Add "Record Sample" button alongside transcript textarea
- [ ] Reuse existing recording component from student flow
- [ ] Recording → DeepGram → transcript displayed in textarea
- [ ] Teacher can then run evaluation on transcribed text
- [ ] npm run build passes
- [ ] Verify in browser using Claude Chrome extension

## Functional Requirements

- FR-1: `rubrics` edge function PUT endpoint must correctly update rubric and criteria
- FR-2: `assignments.rubric_id` must be saved when creating/editing assignments
- FR-3: `rubric_criteria` table must include nullable `examples` text column
- FR-4: `rubrics` table must include nullable `context` text column
- FR-5: Evaluation prompt must dynamically build from rubric context, criteria names, descriptions, max_points, and examples
- FR-6: `evaluate` edge function must accept `assignment_id` and fetch linked rubric
- FR-7: Student submission flow: Record → DeepGram → Evaluate (with rubric) → Store → Display
- FR-8: Calibration flow: Paste/Record → (DeepGram if recorded) → Evaluate (dry_run) → Display
- FR-9: Final score format must be "Final Score: [earned]/[max]" where max = sum of all criteria max_points

## Non-Goals

- No rubric versioning or history tracking
- No rubric sharing between teachers
- No AI-assisted rubric generation
- No partial point scoring suggestions (teacher defines point values)
- No rubric templates library (future enhancement)

## Design Considerations

- Maintain theatrical Speakeasy theme (maroon/gold/cream)
- Reuse existing StudentEvaluationCard for all evaluation displays
- Examples field should be collapsible to keep form clean
- Context field should have generous height for detailed descriptions

## Technical Considerations

- Edge functions deployed via Supabase MCP
- Existing recording component can be extracted/reused for calibration
- Bedrock integration already exists in evaluate function
- Use Claude Chrome extension for browser verification during development

## Success Metrics

- Teachers can create, save, and edit rubrics without errors
- Rubrics are correctly linked to assignments
- Student recordings are graded using the correct rubric
- Teachers can test rubrics before assigning them
- Calibration results match expected scoring based on criteria

## Open Questions

- Should there be a way to duplicate/clone rubrics?
- Should calibration history be saved for comparison?
- What happens if a rubric is deleted but assignments still reference it?
