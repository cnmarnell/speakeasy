# Speakeasy Compliance Plan for Virginia Tech

## Overview
This document outlines the compliance requirements for deploying Speakeasy at Virginia Tech and provides a step-by-step action plan.

---

## Key Compliance Areas

### 1. FERPA (Family Educational Rights and Privacy Act)
**What it is:** Federal law protecting student educational records. This is THE big one for higher ed.

**What you need to do:**
- ✅ You qualify as a "school official" under FERPA if VT contracts with you
- ✅ The university (not you) is the data controller — they authorize access
- ✅ You can only use student data for the educational purpose specified

**Required Documentation:**
- [ ] **Data Processing Agreement (DPA)** — contract between Speakeasy and VT
- [ ] **Privacy Policy** — public-facing document on your website
- [ ] **Data Flow Diagram** — shows where student data goes (Supabase, AWS Bedrock)

### 2. Virginia Student Data Privacy Laws
Virginia has additional state-level student privacy protections.

**Key Points:**
- No selling student data (you're not doing this)
- No targeted advertising using student data (you're not doing this)
- Parental consent requirements (handled by university for college students)

### 3. VT IT Security Requirements
Virginia Tech IT Security will likely require:

**Technical Controls:**
- [ ] Data encryption at rest (Supabase provides this ✅)
- [ ] Data encryption in transit (HTTPS/TLS ✅)
- [ ] Access controls (role-based auth ✅)
- [ ] Audit logging (add this if not present)
- [ ] Data retention policy (define how long you keep videos)

**Process Controls:**
- [ ] Incident response plan (what happens if breached)
- [ ] Data deletion process (how students request deletion)
- [ ] Backup and recovery procedures

---

## Your Current Security Posture (Strong Foundation)

| Requirement | Status | Details |
|-------------|--------|---------|
| Encryption at rest | ✅ | Supabase encrypts all data |
| Encryption in transit | ✅ | HTTPS/TLS on all connections |
| Authentication | ✅ | Supabase Auth with email verification |
| Role-based access | ✅ | Teacher vs Student roles |
| AI data handling | ✅ | AWS Bedrock doesn't retain inputs |
| Video storage | ✅ | Supabase Storage (AWS S3 backend) |
| No data selling | ✅ | Not part of business model |

---

## Action Plan (Priority Order)

### Phase 1: Immediate (Before Pilot Expands)

**1. Create Privacy Policy** (1-2 hours)
```
/speakeasy-website/privacy.html

Include:
- What data you collect (name, email, video recordings, transcripts)
- How you use it (AI grading, feedback generation)
- Who you share it with (no one except VT staff with authorization)
- How long you keep it (define retention period)
- How to request deletion
- Contact information
```

**2. Create Terms of Service** (1-2 hours)
```
/speakeasy-website/terms.html

Include:
- Acceptable use policy
- User responsibilities
- Limitation of liability
- FERPA acknowledgment
```

**3. Add Consent Checkbox at Signup** (30 min code change)
```
"I consent to having my video recordings processed by AI for 
educational feedback. I understand my data will be handled 
in accordance with Speakeasy's Privacy Policy and FERPA."
```

### Phase 2: For Official VT Approval (1-2 weeks)

**4. Data Processing Agreement (DPA)**
This is the contract between Speakeasy and VT. They may have a template.

Key sections:
- Purpose of data processing
- Types of data processed
- Security measures
- Breach notification procedures (usually 24-72 hours)
- Data return/deletion upon contract end
- Subprocessors list (Supabase, AWS)

**5. Security Questionnaire**
VT IT will likely send you a vendor security assessment. Common questions:
- Where is data stored? (AWS US regions via Supabase)
- Who has access? (Only authorized professors and students)
- How is data encrypted? (AES-256 at rest, TLS 1.3 in transit)
- Do you have SOC 2? (Not yet — explain you're early stage)
- Penetration testing? (Not yet — explain you're early stage)

**6. Data Flow Documentation**
Create a diagram showing:
```
Student Device → Supabase Auth → Supabase Storage (video)
                              → Deepgram (transcription)
                              → AWS Bedrock (AI grading)
                              → Supabase DB (grades/feedback)
                              → Teacher Dashboard
```

### Phase 3: As You Scale (3-6 months)

**7. SOC 2 Type 1 Certification**
- Cost: $15-30K
- Timeline: 3-6 months
- Only needed when selling to larger institutions

**8. Penetration Testing**
- Cost: $5-15K
- Do this before major enterprise sales

---

## What to Say When VT Asks About Compliance

**"How do you handle FERPA?"**
> "We operate as a school official under FERPA. Student data is only used for the educational purpose of providing speech feedback. We sign a Data Processing Agreement with the university, we don't share data with third parties, and we have a defined data retention and deletion policy."

**"Where is student data stored?"**
> "All data is stored in the United States using Supabase (backed by AWS infrastructure) for our database and file storage. Video transcription uses Deepgram and AI grading uses AWS Bedrock — neither service retains student data after processing."

**"Do you have SOC 2?"**
> "We're an early-stage startup and don't have SOC 2 certification yet. However, our infrastructure providers (AWS, Supabase) are SOC 2 certified. We're happy to complete your vendor security questionnaire and discuss our security controls in detail."

**"What happens to data when a student leaves or the pilot ends?"**
> "We have a data retention policy of [X months] after which recordings are automatically deleted. At contract end, we can provide data export and complete deletion upon request."

---

## VT-Specific Contacts

To get official approval, you'll likely need to work with:

1. **VT IT Security Office** - security.vt.edu
   - For vendor security assessment
   
2. **VT Procurement** - procurement.vt.edu
   - For official contracts/agreements
   
3. **Sponsoring Department** (the professor's department)
   - They initiate the request internally

**Recommended approach:** Ask the professor to introduce you to their department's IT liaison or procurement contact. They can guide you through VT's specific process.

---

## Quick Wins for Tomorrow

1. Add a simple privacy policy page to speakeasyinfo
2. Add consent checkbox to student signup flow
3. Prepare a 1-pager on your security measures
4. Ask the professor: "Who at VT handles vendor security assessments?"

---

## Resources

- [FERPA for Ed-Tech Vendors](https://studentprivacy.ed.gov/audience/education-technology-vendors)
- [Data Security Best Practices](https://studentprivacy.ed.gov/data-security-k-12-and-higher-education)
- [VT IT Security](https://security.vt.edu)

---

*Last updated: February 5, 2026*
