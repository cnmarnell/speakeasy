# Speakeasy Product Roadmap
*Last Updated: January 2025*

## Overview

This roadmap prioritizes work based on:
1. **Security** - Blocking issues that must be fixed immediately
2. **Revenue** - Features required to charge customers
3. **Retention** - Features that keep users coming back
4. **Growth** - Features that help acquire new users

---

## 🔴 Phase 0: Critical Fixes (This Week)
*Blocking issues - do not ship without these*

### P0-1: Security Hardening
**Priority:** CRITICAL | **Effort:** 2-3 hours

- [ ] Remove hardcoded Supabase credentials from `src/lib/supabase.js`
- [ ] Delete and consolidate duplicate Supabase client files
- [ ] Replace real API key in `.env.example` with placeholder
- [ ] Rotate compromised Deepgram API key
- [ ] Add `.env` validation on app start
- [ ] Audit Supabase RLS policies

### P0-2: Basic Error Boundaries
**Priority:** High | **Effort:** 2 hours

- [ ] Add React Error Boundaries to prevent white screens
- [ ] Implement graceful degradation for API failures
- [ ] Add user-facing error messages

---

## 🟠 Phase 1: Revenue Foundation (Weeks 1-2)
*Minimum features to charge money*

### P1-1: Landing Page
**Priority:** High | **Effort:** 1-2 days

- [ ] Hero section with clear value proposition
- [ ] Feature highlights (AI grading, filler word detection, etc.)
- [ ] "How it Works" section
- [ ] Pricing section (even if manual billing initially)
- [ ] Contact/Demo request form
- [ ] Social proof placeholder (for future testimonials)

**Deliverable:** Users can understand the product and request access

### P1-2: React Router Implementation
**Priority:** High | **Effort:** 1 day

- [ ] Install react-router-dom
- [ ] Create route structure:
  - `/` - Landing page
  - `/login` - Login page
  - `/signup` - Signup page
  - `/dashboard` - Teacher/Student dashboard
  - `/class/:id` - Class view
  - `/assignment/:id` - Assignment view
  - `/student/:id` - Student detail
  - `/record/:assignmentId` - Recording page
- [ ] Add navigation guards (auth required)
- [ ] Enable browser back/forward
- [ ] Add 404 page

**Deliverable:** Shareable URLs, browser navigation works

### P1-3: Stripe Integration (Basic)
**Priority:** High | **Effort:** 2-3 days

- [ ] Create Stripe account and products
- [ ] Implement Stripe Checkout for class purchases
- [ ] Add subscription status to user records
- [ ] Create webhook endpoint for payment events
- [ ] Build "Upgrade" prompt for free tier limits
- [ ] Add billing portal link

**Deliverable:** Can charge for class access

### P1-4: Pricing Page
**Priority:** High | **Effort:** 1 day

- [ ] Design pricing tiers (Free, Class, School)
- [ ] Feature comparison table
- [ ] FAQ section
- [ ] Clear CTAs per tier
- [ ] Annual discount option

**Deliverable:** Users understand pricing options

---

## 🟡 Phase 2: Core Experience (Weeks 3-4)
*Make the product actually good*

### P2-1: Teacher Analytics Dashboard
**Priority:** High | **Effort:** 3-4 days

- [ ] Class overview with completion rates
- [ ] Student performance distribution
- [ ] Assignment submission timeline
- [ ] Average scores over time chart
- [ ] Filler word trends
- [ ] Export to CSV

**Deliverable:** Teachers get value from aggregated data

### P2-2: Student Progress View
**Priority:** Medium | **Effort:** 2 days

- [ ] Personal progress chart over time
- [ ] Score breakdown visualization
- [ ] Goals/targets feature
- [ ] Achievement badges (gamification)
- [ ] Comparison with class average (anonymized)

**Deliverable:** Students can track improvement

### P2-3: Assignment Templates
**Priority:** Medium | **Effort:** 2 days

- [ ] Pre-built templates:
  - Elevator Pitch (30-60 seconds)
  - Interview Question Response
  - Persuasive Speech
  - Informative Presentation
  - Sales Pitch
- [ ] Custom rubric per template
- [ ] Time limit configuration
- [ ] Multiple attempts setting

**Deliverable:** Faster assignment creation for teachers

### P2-4: Improved Onboarding
**Priority:** Medium | **Effort:** 2 days

- [ ] Teacher welcome flow
- [ ] Guided class creation
- [ ] Sample assignment creation
- [ ] Student invitation email templates
- [ ] First-time student experience
- [ ] Tooltips for key features

**Deliverable:** Reduced time-to-value for new users

---

## 🟢 Phase 3: Growth Features (Weeks 5-8)
*Features that drive adoption*

### P3-1: LMS Integration Prep
**Priority:** Medium | **Effort:** 1 week

- [ ] Research Canvas LTI requirements
- [ ] Implement LTI 1.3 protocol
- [ ] Grade passback capability
- [ ] Deep linking support
- [ ] Testing sandbox setup

**Deliverable:** Can integrate with Canvas (major sales enabler)

### P3-2: Email Notifications
**Priority:** Medium | **Effort:** 2-3 days

- [ ] Welcome email for new users
- [ ] Assignment reminder (day before due)
- [ ] Grade available notification
- [ ] Weekly progress summary (teachers)
- [ ] Re-engagement emails (inactive users)
- [ ] Email preferences settings

**Deliverable:** Users return to the platform

### P3-3: Mobile Optimization
**Priority:** Medium | **Effort:** 3-4 days

- [ ] Responsive design audit
- [ ] Mobile recording support
- [ ] Touch-friendly UI
- [ ] PWA manifest
- [ ] Add to home screen
- [ ] Offline feedback viewing

**Deliverable:** Students can practice on mobile

### P3-4: Practice Mode
**Priority:** Low | **Effort:** 2 days

- [ ] "Practice" button separate from "Submit"
- [ ] Instant AI feedback (lighter analysis)
- [ ] No grade recorded
- [ ] Comparison with previous practice
- [ ] Delete practice recordings

**Deliverable:** Students can practice risk-free

---

## 🔵 Phase 4: Scale & Differentiate (Months 3-6)
*Features that create moat*

### P4-1: Advanced Analytics
- [ ] Sentiment analysis of speech
- [ ] Pacing analysis (words per minute)
- [ ] Volume/projection analysis
- [ ] Pause detection and coaching
- [ ] Eye contact tracking (future)

### P4-2: AI Interview Partner
- [ ] Conversational AI for practice
- [ ] Industry-specific question banks
- [ ] Follow-up questions based on answers
- [ ] Difficulty levels

### P4-3: Peer Review System
- [ ] Anonymous peer feedback
- [ ] Calibrated scoring
- [ ] Comment highlighting on video
- [ ] Peer reviewer training

### P4-4: Video Library
- [ ] Exemplar speeches
- [ ] Before/after comparisons
- [ ] Teacher annotations
- [ ] Privacy-compliant sharing

### P4-5: Enterprise Features
- [ ] SSO (SAML, OAuth)
- [ ] Admin dashboard
- [ ] Custom branding
- [ ] API access
- [ ] SLA guarantees

---

## Technical Debt Paydown (Ongoing)

### TD-1: TypeScript Migration
**When:** After Phase 1
**Effort:** 1 week incremental

- [ ] Add TypeScript to project
- [ ] Migrate types for API responses
- [ ] Add strict mode gradually
- [ ] Type all components

### TD-2: Testing Infrastructure
**When:** Phase 2
**Effort:** Ongoing

- [ ] Set up Vitest
- [ ] Unit tests for utilities
- [ ] Integration tests for API calls
- [ ] E2E tests for critical flows (Playwright)
- [ ] CI/CD test automation

### TD-3: Code Organization
**When:** Phase 2
**Effort:** 1 week

- [ ] Split `supabaseData.js` into services
- [ ] Implement proper module structure
- [ ] Add barrel exports
- [ ] Document architecture

### TD-4: Performance
**When:** Phase 3
**Effort:** 3-4 days

- [ ] Code splitting with React.lazy
- [ ] CSS modules or Tailwind
- [ ] Image optimization
- [ ] Caching strategy
- [ ] Bundle size analysis

---

## Potential PR Breakdown

Based on this roadmap, here are discrete PRs that could be created:

### Immediate (P0)
1. `fix/security-hardcoded-credentials` - Remove all hardcoded API keys
2. `fix/consolidate-supabase-client` - Single source of truth for Supabase
3. `feat/error-boundaries` - Add React error boundaries

### Phase 1
4. `feat/react-router-setup` - Basic routing infrastructure
5. `feat/landing-page` - Marketing landing page
6. `feat/pricing-page` - Pricing tier display
7. `feat/stripe-checkout` - Basic payment flow
8. `feat/subscription-management` - User subscription status

### Phase 2
9. `feat/teacher-analytics` - Dashboard charts and stats
10. `feat/student-progress` - Personal progress tracking
11. `feat/assignment-templates` - Pre-built assignment types
12. `feat/onboarding-flow` - Guided setup experience

### Phase 3
13. `feat/email-notifications` - Transactional emails
14. `feat/mobile-responsive` - Mobile UI improvements
15. `feat/practice-mode` - Non-graded practice
16. `feat/canvas-lti-prep` - LMS integration foundation

---

## Success Metrics

| Phase | Key Metric | Target |
|-------|-----------|--------|
| P0 | Security issues | 0 critical |
| P1 | First paying customer | 1 school |
| P2 | Teacher retention | 60% week 2 |
| P3 | Student engagement | 3+ submissions/student |
| P4 | MRR | $5,000 |

---

## Resource Requirements

**Solo Founder Path:**
- Phase 0-1: 2-3 weeks full-time
- Phase 2: 3-4 weeks full-time
- Phase 3: 4-6 weeks full-time
- Phase 4: Ongoing, consider hiring

**With Co-founder/Contractor:**
- Phases 0-2: 3 weeks
- Phase 3: 3 weeks
- Phase 4: Ongoing

---

*This roadmap is a living document. Re-prioritize based on customer feedback.*
