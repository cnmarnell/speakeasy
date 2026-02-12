# Speakeasy -- System Architecture & Data Flow

**Version:** 1.0
**Date:** February 12, 2026
**Classification:** Internal

---

## 1. Executive Summary

Speakeasy is a cloud-based SaaS platform that helps students develop public speaking and soft skills through AI-powered feedback. Students record video presentations in-browser, which are then analyzed by a multi-stage AI grading pipeline that evaluates speech content, filler word usage, and body language (hand tracking). Teachers create assignments with custom rubrics and monitor student progress through an analytics dashboard.

The platform is built on a modern serverless architecture: a React single-page application hosted on Netlify, backed by Supabase for authentication, database, storage, and serverless functions. AI processing is handled by AWS Bedrock (Claude) for content grading, Deepgram for speech-to-text transcription, and a custom Google Cloud Run service for hand/body language analysis.

All data is transmitted over HTTPS. Access control is enforced at the database level via Supabase Row Level Security (RLS). No credit card or payment data is processed.

---

## 2. Architecture Diagram

```
+-----------------------------------------------------+
|                      CLIENTS                         |
|  Students & Teachers (Modern Web Browsers)           |
+---------------------------+-------------------------+
                            |
                         HTTPS
                            |
                            v
+---------------------------+-------------------------+
|              NETLIFY (CDN / Static Hosting)          |
|           speakeasyapp.netlify.app                   |
|                                                      |
|   React SPA (Vite)                                   |
|   - MediaRecorder API (video capture)                |
|   - Supabase JS Client (auth, DB, storage)           |
|   - Student dashboard, Teacher analytics             |
+---------------------------+-------------------------+
                            |
                         HTTPS
                            |
                            v
+---------------------------+-------------------------+
|               SUPABASE PLATFORM                      |
|     jurwhwgtshyubmjaphnt.supabase.co                 |
|                                                      |
|  +-------------+  +-------------+  +--------------+  |
|  | Supabase    |  | PostgreSQL  |  | Supabase     |  |
|  | Auth        |  | Database    |  | Storage      |  |
|  | (email/pw)  |  | (with RLS)  |  | (private     |  |
|  |             |  |             |  |  bucket)      |  |
|  +-------------+  +------+------+  +--------------+  |
|                          |                            |
|  +-----------------------------------------------+   |
|  |          Supabase Edge Functions               |   |
|  |  (Deno runtime, service role key)              |   |
|  |                                                |   |
|  |  - Queue processor (grading pipeline)          |   |
|  |  - Orchestrates AI services                    |   |
|  +---+------------------+----------------+-------+   |
+------|---------+--------+----------------+--------+--+
       |         |                         |
    HTTPS     HTTPS                     HTTPS
       |         |                         |
       v         v                         v
+------+--+ +---+----------+  +-----------+----------+
| Deepgram | | AWS Bedrock  |  | Google Cloud Run     |
| (STT)    | | (Claude AI)  |  | Hand Tracker Service |
|          | |              |  | (Python Flask)        |
| Audio    | | Transcription|  |                       |
| -> Text  | | + Rubric     |  | Video -> Hand/Body   |
|          | | -> Grades    |  | Language Scores       |
+----------+ +--------------+  +-----------------------+
```

---

## 3. Data Flow

### 3.1 Student Submission Flow

1. **Authentication:** Student logs in via Supabase Auth using email and password. A JWT session token is issued and stored client-side.

2. **Video Recording:** The student opens an assignment and records their presentation using the browser's MediaRecorder API. Video is captured as a WebM/MP4 blob.

3. **Upload:** The recorded video is uploaded directly to Supabase Storage (private bucket) using the authenticated Supabase client. Only the owning user can access their files.

4. **Submission Creation:** A row is inserted into the `submissions` table in PostgreSQL, linking the student, assignment, and storage file path. The submission status is set to "pending."

### 3.2 AI Grading Pipeline

5. **Queue Processing:** A Supabase Edge Function (queue processor) picks up pending submissions and orchestrates the grading pipeline. It uses the service role key to bypass RLS for server-side operations.

6. **Speech-to-Text (Deepgram):**
   - The Edge Function fetches the video from Supabase Storage.
   - Audio is extracted and sent to the Deepgram API.
   - Deepgram returns a full transcription with word-level timestamps.
   - Filler words (um, uh, like, etc.) are counted from the transcript.

7. **AI Content Grading (AWS Bedrock -- Claude):**
   - The transcription text and the assignment's rubric are combined into a structured prompt.
   - The prompt is sent to AWS Bedrock (Claude model) via the Edge Function.
   - Claude returns structured scores and qualitative feedback based on the rubric criteria.

8. **Body Language Analysis (Google Cloud Run):**
   - The video file is sent to the hand tracking service at `https://hand-tracker-755929016846.us-central1.run.app`.
   - The Python Flask service uses computer vision (MediaPipe or similar) to analyze hand gestures and body language.
   - A hand tracking / body language score is returned.

9. **Results Storage:** All grades (content score, filler word count, hand tracking score, qualitative feedback) are written back to the PostgreSQL database, and the submission status is updated to "graded."

### 3.3 Results & Analytics

10. **Student Results:** Students view their scores, AI-generated feedback, filler word breakdown, and body language score on their dashboard.

11. **Teacher Analytics:** Teachers access a class analytics dashboard showing aggregate scores, trends over time, and class leaderboards. Data is queried from PostgreSQL with RLS ensuring teachers only see data for their own classes.

---

## 4. Component Descriptions

### 4.1 Frontend -- React SPA (Netlify)

| Attribute | Detail |
|-----------|--------|
| Framework | React (Vite build) |
| Hosting | Netlify CDN (speakeasyapp.netlify.app) |
| Key Libraries | Supabase JS Client, MediaRecorder API |
| Features | Video recording, submission management, score viewing, teacher dashboard |

The frontend is a single-page application with no server-side rendering. All API calls go directly to Supabase or through Supabase Edge Functions. Video recording uses the native browser MediaRecorder API, requiring no plugins or downloads.

### 4.2 Backend -- Supabase

**Authentication:** Email/password authentication via Supabase Auth. JWT tokens are issued for session management. No OAuth or SSO providers are currently configured.

**Database (PostgreSQL):** All application data is stored in a managed PostgreSQL instance. Key tables include users, classes, assignments, submissions, and grades. Row Level Security policies enforce data isolation between students and classes.

**Storage:** Video files are stored in a private Supabase Storage bucket. Access requires a valid authenticated session, and storage policies ensure users can only access their own uploads.

**Edge Functions (Deno):** Serverless functions running on Supabase's Deno-based edge runtime. These handle the grading pipeline orchestration and any server-side logic requiring the service role key. Edge Functions are invoked by database triggers or direct API calls.

### 4.3 AI Services

**Deepgram (Speech-to-Text):**
- Converts audio from student video recordings into text transcriptions.
- Provides word-level timestamps enabling filler word detection.
- Cloud API, called from Edge Functions.

**AWS Bedrock (Claude -- Content Grading):**
- Evaluates transcription content against teacher-defined rubrics.
- Returns structured scores and qualitative feedback.
- Called from Edge Functions using AWS SDK credentials.

**Google Cloud Run (Hand Tracking):**
- Custom Python Flask service for body language and hand gesture analysis.
- Processes video frames to detect and score hand movements and gestures.
- Hosted at: `https://hand-tracker-755929016846.us-central1.run.app`
- Stateless container service, scales to zero when idle.

---

## 5. Security Overview

### 5.1 Authentication & Authorization

- **Authentication:** Supabase Auth with email/password. JWT-based sessions.
- **Authorization:** PostgreSQL Row Level Security (RLS) policies on all tables ensure:
  - Students can only read/write their own submissions and view their own grades.
  - Teachers can only access data for classes they own.
  - Edge Functions use the service role key to bypass RLS for server-side pipeline operations.

### 5.2 Encryption

- **In Transit:** All connections use HTTPS/TLS. This includes browser-to-Netlify, browser-to-Supabase, and Edge Function-to-external-API calls.
- **At Rest:** Supabase encrypts data at rest (PostgreSQL and Storage) using AES-256. AWS Bedrock encrypts data at rest. Google Cloud Run follows Google's default encryption-at-rest policies.

### 5.3 Storage Security

- Video files are stored in a **private** Supabase Storage bucket.
- Access requires a valid, authenticated user session.
- Storage policies restrict access to the file owner.
- No public URLs are generated for video content.

### 5.4 Server-Side Security

- Edge Functions run in an isolated Deno runtime.
- The Supabase service role key is stored as an environment secret within Edge Functions and is never exposed to the client.
- AWS credentials for Bedrock are stored as Edge Function secrets.

### 5.5 Additional Notes

- No credit card or payment processing -- no PCI DSS scope.
- No personally identifiable information (PII) beyond email addresses and video recordings.
- No on-premises components -- fully cloud-hosted.
- No admin panel currently exists.

---

## 6. Third-Party Services & Certifications

| Service | Purpose | Certification / Compliance |
|---------|---------|---------------------------|
| Supabase | Auth, Database, Storage, Edge Functions | SOC 2 Type II |
| Netlify | Frontend hosting / CDN | SOC 2 |
| AWS (Bedrock) | AI content grading (Claude) | SOC 1/2/3, ISO 27001, FedRAMP, HIPAA eligible |
| Google Cloud (Cloud Run) | Hand tracking service | SOC 1/2/3, ISO 27001, FedRAMP |
| Deepgram | Speech-to-text transcription | SOC 2 Type II |

All third-party services are accessed over HTTPS. No data is shared between services except as described in the grading pipeline flow.

---

## 7. Data Retention & Privacy

### 7.1 Data Collected

- **User accounts:** Email address, hashed password (managed by Supabase Auth).
- **Video recordings:** Student presentation videos stored in Supabase Storage.
- **Transcriptions:** Text output from Deepgram, stored in PostgreSQL.
- **Grades & feedback:** AI-generated scores and feedback stored in PostgreSQL.
- **Class data:** Class names, assignment details, rubrics created by teachers.

### 7.2 Data Retention

- Data is retained for the lifetime of the user account.
- No automated data deletion or archival policy is currently implemented.
- Video files remain in Supabase Storage until manually deleted.

### 7.3 Privacy Considerations

- Video recordings may contain students' faces and voices -- this is inherently sensitive data.
- Transcriptions are derived from student speech and stored alongside submissions.
- AI grading is performed by third-party services (Deepgram, AWS Bedrock); data is transmitted to these services for processing.
- Google Cloud Run hand tracking service receives video data for analysis.
- No data is sold or shared with third parties beyond the processing services listed.
- Institutions deploying Speakeasy should ensure compliance with applicable regulations (FERPA, COPPA, GDPR) based on their user population.

### 7.4 Data Deletion

- Users can request account and data deletion.
- No self-service data export or deletion feature is currently available.
- Manual deletion can be performed at the database and storage level by administrators.

---

## 8. Deployment & Infrastructure Summary

| Component | Platform | Region | Scaling |
|-----------|----------|--------|---------|
| Frontend | Netlify CDN | Global (edge) | Automatic |
| Database | Supabase (AWS) | Project-specific | Managed |
| Storage | Supabase Storage | Project-specific | Managed |
| Edge Functions | Supabase (Deno) | Edge | Automatic |
| AI Grading | AWS Bedrock | us-east-1 (typical) | On-demand |
| Hand Tracking | Google Cloud Run | us-central1 | 0-to-N autoscaling |
| Speech-to-Text | Deepgram Cloud | Multi-region | On-demand |

---

*Document generated on February 12, 2026. For questions or updates, contact the Speakeasy development team.*
