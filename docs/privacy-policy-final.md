# Privacy Policy

**Last Updated:** February 14, 2026
**Effective Date:** February 14, 2026

Speakeasy LLC ("Speakeasy," "we," "us," or "our") is a Virginia limited liability company that provides an AI-powered soft skills learning platform for higher education. This Privacy Policy explains how we collect, use, store, and protect your information when you use our platform at [speakeasyapp.netlify.app](https://speakeasyapp.netlify.app).

By using Speakeasy, you agree to the practices described in this Privacy Policy. If you are using Speakeasy through your educational institution, your institution's agreement with us may also govern how your data is handled.

---

## 1. Information We Collect

### 1.1 Account Information

When you create an account, we collect:

- **Name** and **email address**, provided through your university's authentication system or Google OAuth

We do not collect financial or payment information. Speakeasy is licensed through educational institutions, not individual students.

### 1.2 Video and Audio Recordings

When you complete an assignment, we collect:

- **Video recordings** captured via your device's webcam
- **Audio data** extracted from your video for transcription purposes

Videos are stored securely and are only accessible to you and your instructor. When you re-record a response, the previous recording is automatically deleted.

### 1.3 Transcripts and AI-Generated Feedback

- **Speech transcripts** are generated from your audio using the Deepgram speech-to-text API
- **AI-generated feedback**, including scores, grades, and written analysis, is produced by AI models hosted on AWS Bedrock (Claude and Nova models)

### 1.4 Eye Contact Metrics

Speakeasy uses face-api.js to track eye contact during your recording. This processing happens **entirely within your browser**. No facial data, images, or biometric information is transmitted to any server. Only the final eye contact percentage score is stored.

### 1.5 Usage Data

We collect basic usage information, including:

- Login timestamps
- Assignment submission records
- Attempt counts

### 1.6 Information We Do Not Collect

- Financial or payment data
- Social Security numbers
- Biometric data (facial tracking is processed client-side only)
- Location data
- Third-party tracking or advertising data

---

## 2. How We Use Your Information

We use the information we collect to:

- **Provide the Service:** Facilitate video recording, transcription, AI-powered feedback, and grading for your coursework
- **Support Instructors:** Enable professors to review student submissions, scores, and progress
- **Improve the Platform:** Analyze usage patterns to improve functionality and user experience
- **Maintain Security:** Detect and prevent unauthorized access or misuse
- **Comply with Legal Obligations:** Meet requirements under FERPA and other applicable laws

We do not use your personal data for advertising, marketing, or profiling. We do not sell, rent, or share your personal data with third parties for their marketing purposes.

---

## 3. How We Share Your Information

We share your information only in the following circumstances:

### 3.1 Educational Institutions

Your institution may access student records, grades, and usage data as part of the educational relationship. Speakeasy acts as a "school official" under FERPA (see Section 7).

### 3.2 Service Providers

We use the following third-party services to operate Speakeasy. Each provider processes data solely on our behalf and is contractually prohibited from using your data for any other purpose.

| Provider | Purpose | Data Handled | Retention |
|----------|---------|-------------|-----------|
| **Supabase** | Database, authentication, file storage | Account data, videos, transcripts, scores | Stored until deletion per our retention policy |
| **AWS Bedrock** | AI-powered grading and feedback | Transcripts (sent for evaluation) | Not retained; not used for model training |
| **Deepgram** | Speech-to-text transcription | Audio data | Not retained after processing |
| **Netlify** | Frontend hosting | No personal data stored | N/A |
| **Google** | OAuth authentication (optional) | Authentication tokens only | Per Google's policies |

Supabase is SOC 2 Type II certified. Netlify is SOC 2 certified. AWS Bedrock does not retain inputs or outputs and does not use customer data for model training. Deepgram does not retain audio after processing is complete.

### 3.3 Legal Requirements

We may disclose your information if required by law, subpoena, court order, or other legal process, or if we believe in good faith that disclosure is necessary to protect our rights, your safety, or the safety of others.

---

## 4. Data Retention

We retain your personal data for **six (6) months after the end of the academic term** in which it was collected. After this period, your data, including account information, video recordings, transcripts, and AI-generated feedback, is permanently deleted.

Specific retention details:

- **Video recordings** are deleted when you re-record a response or when the retention period expires
- **Audio data** is not retained by Deepgram after transcription
- **AI evaluation data** is not retained by AWS Bedrock after processing
- **Account data and usage records** are deleted at the end of the retention period

You may request early deletion of your data at any time (see Section 6).

---

## 5. Data Security

We implement industry-standard security measures to protect your data:

- **Encryption in transit:** All data transmitted between your browser and our servers is encrypted using TLS (Transport Layer Security)
- **Encryption at rest:** All stored data is encrypted using AES-256 encryption via Supabase and AWS infrastructure defaults
- **Row Level Security (RLS):** Database-level access controls ensure that users can only access their own data. Instructors can only access data for students in their courses.
- **Access controls:** Video files are stored in Supabase Storage (backed by Amazon S3) with access governed by RLS policies
- **Client-side processing:** Facial tracking for eye contact analysis is performed entirely in your browser. No facial data leaves your device.

No system is 100% secure. While we take reasonable measures to protect your data, we cannot guarantee absolute security.

---

## 6. Your Rights

You have the following rights regarding your personal data:

- **Access:** You may request a copy of the personal data we hold about you
- **Correction:** You may request that we correct inaccurate or incomplete data
- **Deletion:** You may request that we delete your personal data
- **Data Portability:** You may request your data in a structured, commonly used format

To exercise any of these rights, contact us at **tryspeakeasy@gmail.com**. We will respond to your request within 30 days.

If you are a student at an educational institution, you may also exercise your rights under FERPA through your institution (see Section 7).

### Virginia Consumer Data Protection Act (VCDPA)

If you are a Virginia resident, you may have additional rights under the VCDPA, including the right to opt out of the sale of personal data and the right to opt out of profiling. Speakeasy does not sell personal data or engage in profiling for automated decision-making that produces legal or similarly significant effects.

---

## 7. FERPA Compliance

The Family Educational Rights and Privacy Act (FERPA) protects the privacy of student education records. Speakeasy is designed to comply with FERPA.

- **School Official Status:** Speakeasy operates as a "school official" with a "legitimate educational interest" under FERPA, as defined in our contractual agreements with educational institutions
- **Education Records:** Video recordings, transcripts, AI-generated feedback, and grades created within Speakeasy may constitute education records under FERPA
- **Institutional Control:** Your educational institution retains control over your education records. FERPA rights (including the right to inspect, amend, and consent to disclosure of education records) are exercised through your institution
- **No Unauthorized Disclosure:** We do not disclose education records to third parties except as permitted under FERPA or as directed by the educational institution

If you have questions about your FERPA rights, contact your institution's registrar or FERPA compliance office.

---

## 8. Children's Privacy

Speakeasy is designed for use in higher education. We do not knowingly collect personal information from children under the age of 13, in compliance with the Children's Online Privacy Protection Act (COPPA).

Some college students may be under 18 (for example, 17-year-old first-year students). For users between the ages of 13 and 17, parental or guardian consent is obtained through the educational institution's enrollment process. By enrolling a minor student in a course that uses Speakeasy, the institution represents that appropriate consent has been obtained.

If we learn that we have collected personal information from a child under 13 without appropriate consent, we will promptly delete that information. If you believe a child under 13 has provided us with personal data, please contact us at **tryspeakeasy@gmail.com**.

---

## 9. Cookies and Tracking

Speakeasy uses only essential, first-party cookies for session authentication. These cookies are necessary for the platform to function and keep you logged in.

We do not use:

- Third-party tracking cookies
- Analytics or advertising cookies
- Social media tracking pixels
- Fingerprinting or other persistent tracking technologies

---

## 10. International Data Transfers

All data collected by Speakeasy is processed and stored within the United States, specifically in the AWS us-east-1 region (Northern Virginia). We do not transfer personal data outside of the United States.

---

## 11. Data Breach Notification

In the event of a data breach that compromises your personal data, we will:

- Notify affected users and their educational institutions within **72 hours** of confirming the breach
- Provide details about the nature of the breach, the data affected, and the steps we are taking to address it
- Comply with all applicable breach notification laws, including Virginia's data breach notification statute

---

## 12. Changes to This Privacy Policy

We may update this Privacy Policy from time to time. When we make material changes, we will:

- Update the "Last Updated" date at the top of this page
- Notify educational institutions of significant changes
- Where appropriate, notify users directly through the platform

We encourage you to review this Privacy Policy periodically. Continued use of Speakeasy after changes are posted constitutes acceptance of the updated policy.

---

## 13. Contact Information

If you have questions about this Privacy Policy or wish to exercise your data rights, please contact us:

**Speakeasy LLC**
Email: [tryspeakeasy@gmail.com](mailto:tryspeakeasy@gmail.com)
Website: [speakeasyapp.netlify.app](https://speakeasyapp.netlify.app)

---

*Speakeasy LLC is registered in the Commonwealth of Virginia.*
