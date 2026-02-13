# HECVAT Answers for Speakeasy

Generated: 2026-02-13

---

## START HERE (Already Filled)

### GNRL-01
**Question:** Solution Provider Name
**Answer:** Speakeasy

### GNRL-02
**Question:** Solution Name
**Answer:** Speakeasy

### GNRL-03
**Question:** Solution Description
**Answer:** Speakeasy is an AI-powered platform that helps university students improve their communication skills. Students record spoken responses to professor-assigned prompts, and AI evaluates their delivery across custom rubrics, grading structure, word choice, filler words, and body language. Professors create assignments with tailored rubrics, track student improvement over multiple attempts, and access analytics dashboards that turn qualitative speaking skills into quantitative data.

### GNRL-04
**Question:** Solution Provider Contact Name
**Answer:** Collin Marnell

### GNRL-05
**Question:** Solution Provider Contact Title
**Answer:** CEO

### GNRL-06
**Question:** Solution Provider Contact Email
**Answer:** collin.marnell@gmail.com

### GNRL-07
**Question:** Solution Provider Contact Phone Number
**Answer:** 6787105486

### GNRL-08
**Question:** Country of Company Headquarters
**Answer:** United States

### GNRL-09
**Question:** Employee Work Locations (all)
**Answer:** Blacksburg

### COMP-01
**Question:** Do you have a dedicated software and system development team(s)?
**Answer:** No
**Additional Information:** As we scale beyond the initial Virginia Tech pilot, I plan to build out dedicated teams starting with a technical co-founder, sales co-founder and customer success/support hire, prioritized by revenue milestones.

### COMP-02
**Question:** Describe your organization's business background and ownership structure.
**Answer:** The company operates as a sole proprietorship with 100% ownership held by the founder. There are no parent companies, subsidiaries, outside investors, or co-founders. Speakeasy is currently in pilot phase with Virginia Tech faculty.

### COMP-03
**Question:** Have you operated without unplanned disruptions in the past 12 months?
**Answer:** Yes
**Additional Information:** Speakeasy has not experienced any unplanned service disruptions. The platform is currently in pilot phase with limited users and is hosted on reliable infrastructure (Supabase, AWS, Netlify) with high uptime guarantees.

### COMP-04
**Question:** Do you have a dedicated information security staff or office?
**Answer:** No
**Additional Information:** As a solo-founded startup, I currently manage all security practices directly. This includes access control, encryption configuration, dependency updates, and monitoring. As the platform scales, I plan to designate a dedicated information security role and establish formal security policies, starting with SOC 2 readiness as we onboard additional universities.

### COMP-05
**Question:** Use this area to share information about your environment.
**Answer:** Speakeasy's architecture leverages best-in-class cloud providers. The frontend is a React application hosted on Netlify (SOC 2 certified). The backend uses Supabase (SOC 2 Type II certified), which provides PostgreSQL database, Edge Functions for serverless compute, Auth for authentication, and Storage (S3-backed) for video files -- all hosted in AWS us-east-1. AI grading uses AWS Bedrock (Claude and Nova models) with no data retention by AWS. Speech-to-text is handled by Deepgram, which also does not retain data after processing. Client-side eye contact tracking uses face-api.js running entirely in the browser. All data is encrypted in transit (TLS 1.2+) and at rest (AES-256). Row Level Security (RLS) is enabled on all database tables. Data retention is limited to one semester, after which student data is deleted.

### REQU-01
**Question:** Are you offering a cloud-based product?
**Answer:** Yes

### REQU-02
**Question:** Does your product or service have an interface?
**Answer:** Yes

### REQU-03
**Question:** Are you providing consulting services?
**Answer:** No

### REQU-04
**Question:** Does your solution have AI features?
**Answer:** Yes

### REQU-05
**Question:** Does your solution process PHI or HIPAA data?
**Answer:** No

### REQU-06
**Question:** Is the solution designed to process credit card information?
**Answer:** No

### REQU-07
**Question:** Does operating your solution require on-premises appliances or inbound firewall exceptions?
**Answer:** No

### REQU-08
**Question:** Does your solution have access to personal or institutional data?
**Answer:** Yes

---

## Organization Tab

### DOCU-01
**Question:** Do you have a well-documented business continuity plan (BCP), with a clear owner, that is tested annually?
**Answer:** No
**Additional Information:** As an early-stage startup, we do not yet have a formal BCP. However, our architecture inherently provides continuity through managed cloud services: Supabase (99.9% SLA), AWS (99.99% SLA for Bedrock), and Netlify (99.99% SLA). All data is backed up automatically by Supabase. We plan to develop a formal BCP as we scale and onboard additional institutions.

### DOCU-02
**Question:** Do you have a well-documented disaster recovery plan (DRP), with a clear owner, that is tested annually?
**Answer:** No
**Additional Information:** We do not yet have a formal DRP. Our cloud-native architecture means disaster recovery capabilities are largely provided by our infrastructure partners. Supabase provides automated daily backups with point-in-time recovery. All data resides in AWS us-east-1 with built-in redundancy. We plan to formalize a DRP as we grow, leveraging the recovery capabilities already built into our provider stack.

### DOCU-03
**Question:** Have you undergone a SSAE 18/SOC 2 audit?
**Answer:** No
**Additional Information:** We have not yet undergone a SOC 2 audit. As an early-stage startup, the cost is prohibitive at this stage. However, all of our infrastructure providers maintain SOC 2 Type II certifications (Supabase, AWS, Netlify). We plan to pursue SOC 2 Type II compliance as we scale and secure additional funding.

### DOCU-04
**Question:** Do you conform with a specific industry standard security framework?
**Answer:** No
**Additional Information:** Not currently. As an early-stage startup, we do not yet conform to a specific security framework. However, we leverage infrastructure providers that do (Supabase -- SOC 2 Type II, AWS -- multiple certifications, Netlify -- SOC 2). We plan to pursue SOC 2 Type II compliance as we scale.

### DOCU-05
**Question:** Can you provide system/application architecture diagrams?
**Answer:** Yes
**Additional Information:** We can provide architecture diagrams showing the data flow between the React frontend (Netlify), Supabase backend (PostgreSQL, Edge Functions, Storage, Auth), AWS Bedrock (AI grading), and Deepgram (speech-to-text). A privacy policy and data flow documentation is available at: https://drive.google.com/file/d/1rfEaTbJHsf2lXRgJkrVSsf-8JqgTne70/view?usp=sharing

### DOCU-06
**Question:** Does your organization have a data privacy policy?
**Answer:** Yes
**Additional Information:** Speakeasy maintains a privacy policy that describes data collection, use, retention, and sharing practices. The policy is available at: https://drive.google.com/file/d/1rfEaTbJHsf2lXRgJkrVSsf-8JqgTne70/view?usp=sharing

### DOCU-07
**Question:** Do you have a documented employee onboarding and offboarding policy?
**Answer:** No
**Additional Information:** As a single-developer company, there are currently no employees to onboard or offboard. When we begin hiring, we will implement formal onboarding/offboarding procedures that include security training, access provisioning/deprovisioning, and NDA execution.

### THRD-01
**Question:** Do you perform security assessments of third-party companies with which you share data?
**Answer:** Yes
**Additional Information:** We evaluate the security posture of all third-party providers before integration. All of our key providers maintain SOC 2 Type II certifications: Supabase (database, auth, storage), AWS (AI processing via Bedrock), Netlify (frontend hosting), and Deepgram (speech-to-text). We review their compliance documentation and security practices as part of our vendor selection process.

### THRD-02
**Question:** Do you have contractual language in place with third parties governing access to institutional data?
**Answer:** Yes
**Additional Information:** We operate under standard Terms of Service and Data Processing Agreements with our infrastructure providers (Supabase, AWS, Deepgram, Netlify). These agreements include provisions governing data access, use, and protection. AWS Bedrock specifically does not retain or use customer inputs/outputs for model training. Deepgram does not retain audio data after processing.

### THRD-03
**Question:** Do the contracts with third parties address liability in the event of a data breach?
**Answer:** Yes
**Additional Information:** Our standard agreements with Supabase, AWS, Deepgram, and Netlify include liability and indemnification provisions related to data security incidents. Each provider's terms address their responsibilities in the event of a breach within their infrastructure.

### THRD-04
**Question:** Do you have an implemented third-party management strategy?
**Answer:** No
**Additional Information:** We do not yet have a formal, documented third-party management strategy. However, we carefully evaluate providers before integration, preferring those with SOC 2 certifications and strong security track records. We monitor provider security communications and update integrations as needed. We plan to formalize this process as we scale.

### THRD-05
**Question:** Do you have a process for managing your hardware supply chain?
**Answer:** N/A
**Additional Information:** Speakeasy is a fully cloud-based SaaS product with no physical hardware components. All infrastructure is managed by our cloud providers (Supabase/AWS, Netlify). There is no hardware supply chain to manage.

### CHNG-01
**Question:** Will the institution be notified of major changes to your environment that could impact security posture?
**Answer:** Yes
**Additional Information:** We will notify institutional partners of any significant changes to our architecture, data handling practices, or third-party providers that could affect their security posture. Notification will be provided via email to the designated institutional contact with reasonable advance notice.

### CHNG-02
**Question:** Does the system support client customizations from one release to another?
**Answer:** N/A
**Additional Information:** Speakeasy is a multi-tenant SaaS application. Professors can customize assignments, rubrics, and grading criteria within the platform. These customizations are preserved across releases as they are stored in the database, not in the application code.

### CHNG-03
**Question:** Do you have an implemented system configuration management process?
**Answer:** Yes
**Additional Information:** Our infrastructure is defined through Supabase project configuration and Netlify deployment settings. Database schema changes are managed through Supabase migrations. Environment variables and secrets are stored securely in each platform's configuration management. All code is version-controlled in Git.

### CHNG-04
**Question:** Do you have a documented change management process?
**Answer:** No
**Additional Information:** As a single-developer startup, we do not yet have a formally documented change management process. However, all code changes go through version control (Git), are tested before deployment, and Netlify provides automatic rollback capabilities. We plan to formalize change management procedures as the team grows.

### CHNG-05
**Question:** Does your change management process include authorization, impact analysis, testing, and validation?
**Answer:** Yes
**Additional Information:** All changes are developed in feature branches, tested locally and in staging environments, and reviewed before merging to production. Netlify provides preview deployments for every change. Database migrations are tested against development environments before applying to production.

### CHNG-06
**Question:** Does your change management process verify third-party libraries and dependencies are still supported?
**Answer:** Yes
**Additional Information:** We use npm for dependency management and regularly review dependencies for security vulnerabilities using automated tools (npm audit, Dependabot/GitHub security alerts). We update dependencies proactively and verify compatibility before deploying changes.

### CHNG-07
**Question:** Do you have policy and procedure for applying critical patches?
**Answer:** Yes
**Additional Information:** Critical security patches for dependencies are applied promptly upon discovery. We monitor GitHub security advisories and npm audit alerts. Our cloud providers (Supabase, AWS, Netlify) handle patching of their managed infrastructure independently. For our application code, critical patches are prioritized and deployed within 24-48 hours of identification.

### CHNG-08
**Question:** Have you implemented policies for mitigating security risks until patches can be applied?
**Answer:** Yes
**Additional Information:** When patches cannot be immediately applied, we assess the risk and implement compensating controls such as disabling affected features, adding input validation, or applying WAF rules through Netlify. Our cloud-native architecture limits our direct exposure to many infrastructure-level vulnerabilities.

### CHNG-09
**Question:** Do clients have the option to not participate in or postpone an upgrade?
**Answer:** N/A
**Additional Information:** As a cloud-hosted SaaS platform, all users run on the same version. Updates are deployed centrally and do not require institutional involvement. This ensures all users benefit from security patches and improvements simultaneously.

### CHNG-10
**Question:** Do you have a fully implemented solution support strategy for concurrent versions?
**Answer:** N/A
**Additional Information:** As a cloud-hosted SaaS product, we maintain a single production version. All users are always on the latest version, ensuring consistent security and functionality.

### CHNG-11
**Question:** Do you have a release schedule for product updates?
**Answer:** Yes
**Additional Information:** We follow a continuous deployment model. Feature updates and improvements are deployed as they are ready, typically multiple times per week. Security patches are deployed immediately upon validation. We can provide advance notice to institutional partners for major feature changes.

### CHNG-12
**Question:** Do you have a technology roadmap for at least the next two years?
**Answer:** Yes
**Additional Information:** We maintain a product roadmap that includes planned features such as SSO/SAML integration, LMS integration (Canvas, Blackboard), enhanced analytics, accessibility improvements (WCAG 2.1 AA compliance), and expanded AI grading capabilities. We are happy to share our roadmap with institutional partners.

### CHNG-13
**Question:** Can solution updates be completed without institutional involvement?
**Answer:** Yes
**Additional Information:** All updates are deployed centrally to our cloud infrastructure. No institutional action is required for updates, patches, or upgrades.

### CHNG-14
**Question:** Are upgrades or system changes installed during off-peak hours?
**Answer:** Yes
**Additional Information:** Non-critical updates are deployed during low-usage periods. Our continuous deployment pipeline through Netlify enables zero-downtime deployments. Database migrations are performed during off-peak hours when they could affect performance.

### CHNG-15
**Question:** Do procedures exist for documenting and authorizing emergency changes?
**Answer:** Yes
**Additional Information:** Emergency changes (such as critical security patches) are documented in our Git commit history with detailed descriptions. Post-deployment, we document the change, its rationale, and any impact in our internal records.

### CHNG-16
**Question:** Do you have a systems management and configuration strategy?
**Answer:** Yes
**Additional Information:** Our systems management strategy leverages the configuration management capabilities of our cloud providers. Supabase manages database configuration, Netlify manages frontend deployment configuration, and AWS manages Bedrock service configuration. All application configuration is stored in version-controlled environment variables.

### PPPR-01
**Question:** Do you have a documented patch management process?
**Answer:** No
**Additional Information:** We do not yet have a formally documented patch management process. However, we actively monitor for security vulnerabilities in our dependencies (via GitHub Dependabot and npm audit), apply critical patches promptly, and rely on our cloud providers to patch their managed infrastructure. We plan to document this process formally as we scale.

### PPPR-02
**Question:** Can your organization comply with institutional policies on privacy and data protection?
**Answer:** Yes
**Additional Information:** Yes. Speakeasy is designed to handle student education records in compliance with FERPA. We act as a "school official" under FERPA, processing data on behalf of the institution. We are committed to complying with institutional privacy and data protection policies and will work with institutions to address specific requirements.

### PPPR-03
**Question:** Is your company subject to the institution's geographic region's laws and regulations?
**Answer:** Yes
**Additional Information:** Speakeasy LLC is a Virginia-based company operating within the United States. We are subject to U.S. federal and state laws, including FERPA, Virginia data protection laws, and other applicable regulations.

### PPPR-04
**Question:** Can you accommodate encryption requirements using open standards?
**Answer:** Yes
**Additional Information:** All data in transit is encrypted using TLS 1.2+. All data at rest is encrypted using AES-256 through Supabase/AWS default encryption. These are industry-standard open encryption protocols.

### PPPR-05
**Question:** Do you have a documented systems development life cycle (SDLC)?
**Answer:** No
**Additional Information:** We do not yet have a formally documented SDLC. However, we follow modern software development practices including version control (Git), code review, testing, staging environments, and continuous deployment. We plan to document our SDLC formally as the team grows.

### PPPR-06
**Question:** Do you perform background screenings on all employees?
**Answer:** N/A
**Additional Information:** Speakeasy is currently a single-developer company with no additional employees. When we begin hiring, we will implement background screening as part of our onboarding process.

### PPPR-07
**Question:** Do you require new employees to fill out agreements and review policies?
**Answer:** N/A
**Additional Information:** As a single-developer company, there are currently no additional employees. When we begin hiring, new employees will be required to sign NDAs, acceptable use policies, and complete security awareness training before accessing any systems or data.

### PPPR-08
**Question:** Do you have a documented information security policy?
**Answer:** No
**Additional Information:** We do not yet have a standalone formal information security policy document. However, security practices are implemented throughout our architecture: encryption at rest and in transit, RLS on all database tables, least-privilege access controls, and regular dependency updates. We plan to formalize our security policy as part of SOC 2 readiness preparation.

### PPPR-09
**Question:** Are information security principles designed into the product lifecycle?
**Answer:** Yes
**Additional Information:** Security is a core design principle in Speakeasy. Row Level Security (RLS) is enabled on all database tables to ensure data isolation. Authentication uses Supabase Auth with support for email/password and Google OAuth. All API endpoints validate user permissions. Data minimization is practiced -- we only collect what is necessary for the service. AI providers (AWS Bedrock, Deepgram) are configured to not retain data.

### PPPR-10
**Question:** Will you comply with applicable breach notification laws?
**Answer:** Yes
**Additional Information:** Yes. In the event of a data breach, we will comply with all applicable federal and state breach notification laws and will notify affected institutions promptly.

### PPPR-11
**Question:** Do you have an information security awareness program?
**Answer:** No
**Additional Information:** As a single-developer company, a formal security awareness program is not yet applicable. The founder maintains current knowledge of security best practices and threat landscapes. A formal awareness program will be established when additional team members are hired.

### PPPR-12
**Question:** Is security awareness training mandatory for all employees?
**Answer:** N/A
**Additional Information:** Currently a single-developer company. Security awareness training will be mandatory for all employees once we begin hiring.

### PPPR-13
**Question:** Do you have procedures for reviewing and updating access lists for privileged accounts?
**Answer:** Yes
**Additional Information:** As a single-developer company, privileged access is limited to the founder. Access credentials for all services (Supabase, AWS, Netlify, Deepgram) use strong passwords and MFA where available. Access will be reviewed and formalized as the team grows.

### PPPR-14
**Question:** Do you have documented internal audit processes?
**Answer:** No
**Additional Information:** We do not yet have formal internal audit processes. Our cloud providers (Supabase, AWS) provide audit logging capabilities that we leverage. We plan to implement formal audit processes as part of SOC 2 preparation.

### PPPR-15
**Question:** Does your organization have physical security controls and policies?
**Answer:** N/A
**Additional Information:** Speakeasy is a fully remote, cloud-based company with no physical office or data center. Physical security is managed by our cloud providers (AWS data centers for Supabase and Bedrock, Netlify's infrastructure), all of which maintain SOC 2 certifications covering physical security controls.

---

## Product Tab

### AAAI-01
**Question:** Does your solution support single sign-on (SSO) protocols for user and administrator authentication?
**Answer:** No
**Additional Information:** SSO/SAML integration is on our near-term product roadmap. Currently, authentication is handled through Supabase Auth with email/password and Google OAuth. We plan to implement SAML 2.0 and OIDC support to enable institutional SSO integration as a priority feature.

### AAAI-02
**Question:** For customers not using SSO, does your solution support local authentication protocols?
**Answer:** Yes
**Additional Information:** Speakeasy uses Supabase Auth, which provides secure local authentication with email/password and Google OAuth. Passwords are hashed using bcrypt. All authentication traffic is encrypted via TLS.

### AAAI-03
**Question:** For customers not using SSO, can you enforce password/passphrase complexity requirements?
**Answer:** Yes
**Additional Information:** Supabase Auth enforces minimum password length requirements. Additional complexity rules can be configured. We plan to add institutional-configurable password policies as part of our SSO/enterprise features rollout.

### AAAI-04
**Question:** For customers not using SSO, does the system have password complexity or length limitations?
**Answer:** No
**Additional Information:** Supabase Auth does not impose unreasonable upper limits on password length or character restrictions. Passwords are hashed using bcrypt, which supports long passwords. There are no restrictions that would prevent strong passphrase usage.

### AAAI-05
**Question:** For customers not using SSO, do you have documented password reset procedures?
**Answer:** Yes
**Additional Information:** Password reset is handled through Supabase Auth's built-in email-based password reset flow. Users receive a secure, time-limited reset link via email. The process is documented in Supabase's authentication documentation.

### AAAI-06
**Question:** Does your organization participate in InCommon or another eduGAIN-affiliated trust federation?
**Answer:** No
**Additional Information:** We do not currently participate in InCommon or eduGAIN. This is planned as part of our SSO/SAML integration roadmap, which will enable seamless integration with institutional identity providers.

### AAAI-07
**Question:** Are there any passwords/passphrases hard-coded into your systems or solutions?
**Answer:** No
**Additional Information:** No passwords or secrets are hard-coded. All sensitive credentials are stored as environment variables in our hosting platforms (Netlify for frontend, Supabase for backend configuration). API keys for AWS Bedrock and Deepgram are stored securely in Supabase Edge Function environment variables.

### AAAI-08
**Question:** Are you storing any passwords in plaintext?
**Answer:** No
**Additional Information:** All passwords are hashed using bcrypt through Supabase Auth. No plaintext passwords are stored anywhere in the system.

### AAAI-09
**Question:** Are audit logs available that include login, logout, actions performed, and source IP address?
**Answer:** Yes
**Additional Information:** Supabase provides authentication logs that capture login events, IP addresses, and timestamps. Supabase also provides database-level audit logging. Netlify provides access logs for the frontend. We can provide log access to institutions upon request.

### AAAI-10
**Question:** Describe the system capability to log security/authorization changes and events.
**Answer:** (a) Supabase provides comprehensive logging of authentication events (login, logout, failed attempts), database access via RLS policy enforcement, and API request logs. Netlify provides frontend access logs. AWS Bedrock provides CloudTrail logging for all API calls. (b) Logging is enabled by default through our infrastructure providers and requires no additional configuration. (c) We leverage Supabase's built-in logging dashboard and AWS CloudTrail for monitoring. We plan to implement a centralized SIEM solution as we scale.

### AAAI-11
**Question:** Can you provide documentation regarding log retention, protection, and customer accessibility?
**Answer:** Yes
**Additional Information:** Supabase retains authentication and database logs according to their retention policies (available in their documentation). AWS CloudTrail logs are retained per our AWS configuration. Netlify retains access logs for 30 days. Logs are protected by the same encryption and access controls as the rest of our infrastructure. We can provide log data to institutions upon request.

### AAAI-12
**Question:** For customers not using SSO, does your application support integration with other authentication systems?
**Answer:** Yes
**Additional Information:** Supabase Auth supports integration with multiple OAuth providers (Google, GitHub, etc.) and can be extended to support additional authentication systems. Our planned SSO implementation will support SAML 2.0 and OIDC.

### AAAI-13
**Question:** Do you allow the customer to specify attribute mappings for any needed information?
**Answer:** No
**Additional Information:** Currently, we use email address as the primary user identifier. Custom attribute mapping (e.g., eduPerson attributes) will be supported as part of our SSO/SAML integration roadmap.

### AAAI-14
**Question:** For customers not using SSO, does your application support directory integration?
**Answer:** No
**Additional Information:** Direct LDAP/Active Directory integration is not currently supported. This capability is planned as part of our enterprise features roadmap alongside SSO integration.

### AAAI-15
**Question:** Does your solution support any web SSO standards: SAML2, OIDC, CAS, or other?
**Answer:** No
**Additional Information:** Not currently, but SAML 2.0 and OIDC support are on our near-term roadmap as priority features for institutional deployment. Google OAuth is currently supported.

### AAAI-16
**Question:** Do you support differentiation between email address and user identifier?
**Answer:** Yes
**Additional Information:** Supabase Auth assigns a unique UUID to each user that is separate from their email address. Internal references use this UUID, allowing email addresses to be updated without affecting data associations.

### AAAI-17
**Question:** For customers not using SSO, does your application support multifactor authentication?
**Answer:** No
**Additional Information:** MFA is not currently implemented but is on our roadmap. Supabase Auth has built-in MFA capabilities (TOTP) that we plan to enable. In the interim, users can use Google OAuth which supports the user's own MFA configuration at the Google account level.

### AAAI-18
**Question:** Does your application automatically lock the session or log out an account after inactivity?
**Answer:** Yes
**Additional Information:** Supabase Auth uses JWT tokens with configurable expiration. Sessions expire after a period of inactivity, requiring re-authentication. The default session timeout is configured to balance security and usability.

### DATA-01
**Question:** Will the institution's data be stored on devices with publicly routable IP addresses?
**Answer:** No
**Additional Information:** All data is stored within Supabase's managed infrastructure (backed by AWS), which uses private networking for database storage. Public access is only available through Supabase's API layer with authentication and RLS enforcement.

### DATA-02
**Question:** Is the transport of sensitive data encrypted?
**Answer:** Yes
**Additional Information:** All data in transit is encrypted using TLS 1.2 or higher. This applies to all communications: browser to Netlify frontend, browser to Supabase API, Supabase to AWS Bedrock, and Supabase to Deepgram.

### DATA-03
**Question:** Is the storage of sensitive data encrypted?
**Answer:** Yes
**Additional Information:** All data at rest is encrypted using AES-256. This includes the Supabase PostgreSQL database (encrypted at rest by AWS RDS), Supabase Storage/S3 buckets (server-side encryption), and AWS Bedrock processing (no data retained).

### DATA-04
**Question:** Do all cryptographic modules conform to FIPS PUB 140-2 or 140-3?
**Answer:** Yes
**Additional Information:** Our infrastructure providers (AWS, which underlies Supabase) use FIPS 140-2 validated cryptographic modules. AWS's encryption services are built on FIPS-validated hardware security modules.

### DATA-05
**Question:** Will the institution's data be available in the system for a period at contract completion?
**Answer:** Yes
**Additional Information:** Upon contract completion, we will provide a reasonable transition period (minimum 30 days) for the institution to export their data before deletion. We can provide data exports in standard formats (CSV, JSON).

### DATA-06
**Question:** Are ownership rights to all data retained even through a provider acquisition or bankruptcy?
**Answer:** Yes
**Additional Information:** The institution retains full ownership of all their data at all times. In the event of acquisition or bankruptcy, we will ensure data is returned to the institution or securely deleted per their instructions.

### DATA-07
**Question:** Do backups containing institutional data ever leave the data zone?
**Answer:** No
**Additional Information:** All backups are managed by Supabase within the AWS us-east-1 region. Backup data does not leave the United States. Supabase's backup infrastructure operates within the same AWS region as the primary data.

### DATA-08
**Question:** Is media for long-term retention stored in a secure, environmentally protected area?
**Answer:** Yes
**Additional Information:** All data storage is managed by Supabase/AWS, which maintains physically secure, environmentally controlled data centers with SOC 2 Type II certification. Our data retention policy is limited to one semester, so long-term archival is not applicable.

### DATA-09
**Question:** At contract completion, will data be returned and/or deleted?
**Answer:** Yes
**Additional Information:** At contract completion, we will provide a data export to the institution in standard formats and then securely delete all institutional data from our systems, including backups, within 30 days of the export.

### DATA-10
**Question:** Can the institution extract a full or partial backup of data?
**Answer:** Yes
**Additional Information:** We can provide data exports in standard formats (CSV, JSON) upon request. We are also developing self-service data export capabilities within the platform.

### DATA-11
**Question:** Do current backups include all necessary data for recovery?
**Answer:** Yes
**Additional Information:** Supabase provides automated daily backups of the entire PostgreSQL database, including all application data, user accounts, and configurations. Video files in Supabase Storage (S3-backed) have their own redundancy. These backups contain everything needed to restore the service.

### DATA-12
**Question:** Are you performing off-site backups (digitally moved off site)?
**Answer:** Yes
**Additional Information:** Supabase performs automated backups that are stored in separate AWS availability zones within the us-east-1 region, providing geographic redundancy within the data center region.

### DATA-13
**Question:** Are physical backups taken off-site?
**Answer:** N/A
**Additional Information:** As a fully cloud-based service, we do not use physical backup media. All backups are digital and managed by Supabase/AWS.

### DATA-14
**Question:** Are data backups encrypted?
**Answer:** Yes
**Additional Information:** All Supabase/AWS backups are encrypted at rest using AES-256 encryption, consistent with the encryption of primary data stores.

### DATA-15
**Question:** Do you have a media handling process for end-of-life and data sanitization?
**Answer:** N/A
**Additional Information:** As a fully cloud-based service, we do not handle physical media. Data sanitization is handled by our cloud providers (AWS/Supabase) according to their certified procedures. When data is deleted from our application, it follows Supabase's data deletion practices.

### DATA-16
**Question:** Does the process adhere to DoD 5220.22-M and/or NIST SP 800-88 standards?
**Answer:** N/A
**Additional Information:** Physical media sanitization is handled by AWS, which follows NIST 800-88 guidelines for media sanitization in their data centers, as documented in their SOC 2 reports.

### DATA-17
**Question:** Does your staff have access to institutional data?
**Answer:** Yes
**Additional Information:** As the sole developer and administrator, the founder has administrative access to the Supabase dashboard and database for maintenance, support, and debugging purposes. This access is protected by MFA and is used only as needed. No other individuals have access to institutional data.

### DATA-18
**Question:** Do you have a strategy for securing employee workstations when working remotely?
**Answer:** Yes
**Additional Information:** As a single-developer company, the founder's workstation uses full-disk encryption, screen lock, up-to-date OS and software, and strong authentication for all cloud service accounts. All development access to production systems requires MFA. No institutional data is stored locally on workstations.

### DATA-19
**Question:** Does the environment provide dedicated single-tenant capabilities?
**Answer:** Speakeasy operates as a multi-tenant SaaS application with strong logical data separation. Each institution's data is isolated through Supabase Row Level Security (RLS) policies enforced at the database level. RLS ensures that users can only access data belonging to their institution and their own accounts. This provides equivalent security to physical separation while enabling efficient resource utilization.

### DATA-20
**Question:** Are ownership rights to all data retained by the institution?
**Answer:** Yes
**Additional Information:** The institution retains full ownership of all data, inputs, outputs, and metadata generated through their use of Speakeasy. We claim no ownership rights to institutional data.

### DATA-21
**Question:** In the event of bankruptcy or closing, will you provide 90 days for data migration?
**Answer:** Yes
**Additional Information:** In the event of business closure, we commit to providing at least 90 days notice and support for institutions to export their data and transition to alternative solutions.

### DATA-22
**Question:** Are backup copies made according to predefined schedules and securely stored?
**Answer:** Yes
**Additional Information:** Supabase performs automated daily backups on a predefined schedule. Backups are encrypted and stored securely in AWS infrastructure with appropriate access controls.

### DATA-23
**Question:** Do you have a cryptographic key management process?
**Answer:** Yes
**Additional Information:** Cryptographic key management is handled by our infrastructure providers. Supabase/AWS manages encryption keys through AWS Key Management Service (KMS), which provides automated key rotation, secure storage in hardware security modules (HSMs), and audit logging of key usage. Application-level secrets (API keys) are stored in platform-managed environment variables with restricted access.

---

## Infrastructure Tab

### APPL-01
**Question:** Are access controls based on structured rules (RBAC, ABAC, PBAC)?
**Answer:** Yes
**Additional Information:** Speakeasy implements role-based access control (RBAC). Users are assigned roles (student, professor, admin) that determine their permissions. Row Level Security (RLS) policies in Supabase enforce data access at the database level based on user role and identity. Professors can only access their own courses and students; students can only access their own submissions.

### APPL-02
**Question:** Are you using a web application firewall (WAF)?
**Answer:** Yes
**Additional Information:** Netlify provides DDoS protection and edge-level security for the frontend. Supabase provides API rate limiting and security features for the backend. While we do not currently use a standalone WAF, our cloud providers include built-in security layers that provide equivalent protection.

### APPL-03
**Question:** Are only currently supported operating systems, software, and libraries used?
**Answer:** Yes
**Additional Information:** We use current, supported versions of all software components. Our React frontend uses actively maintained libraries. Supabase and AWS services are fully managed and always running supported versions. We monitor for deprecated dependencies and update proactively.

### APPL-04
**Question:** Does your application require access to location or GPS data?
**Answer:** No
**Additional Information:** Speakeasy does not request or use location/GPS data. The only device access required is the camera and microphone for recording video responses.

### APPL-05
**Question:** Does your application provide separation of duties between security admin, system admin, and standard user?
**Answer:** Yes
**Additional Information:** The application supports distinct roles: students (can only view and submit their own work), professors (can manage courses and view student submissions within their courses), and administrators (system-level access). Each role has clearly defined permissions enforced through RLS.

### APPL-06
**Question:** Do you subject your code to static code analysis or SAST prior to release?
**Answer:** No
**Additional Information:** We do not currently use formal SAST tools. However, we use TypeScript for type safety, ESLint for code quality, and leverage IDE-integrated security warnings. We plan to integrate SAST tooling (such as Snyk or SonarQube) as we scale.

### APPL-07
**Question:** Do you have software testing processes (dynamic or static)?
**Answer:** Yes
**Additional Information:** We perform manual testing and use Netlify preview deployments for testing changes before production. We plan to implement automated testing suites (unit, integration, and end-to-end tests) as the team grows.

### APPL-08
**Question:** Are access controls for staff within your organization based on structured rules?
**Answer:** Yes
**Additional Information:** As a single-developer company, administrative access follows least-privilege principles. Cloud service accounts use MFA and role-based permissions. Supabase, AWS, and Netlify all enforce RBAC for their management consoles.

### APPL-09
**Question:** Does the system provide data input validation and error messages?
**Answer:** Yes
**Additional Information:** The application validates all user inputs on both the client side (React form validation) and server side (Supabase Edge Functions with input validation). Error messages are user-friendly and do not expose internal system details or stack traces.

### APPL-10
**Question:** Do you have procedures for managing your software supply chain?
**Answer:** Yes
**Additional Information:** We use npm for package management with lock files to ensure reproducible builds. GitHub Dependabot automatically monitors for vulnerable dependencies and creates pull requests for updates. We review and update dependencies regularly.

### APPL-11
**Question:** Have your developers been trained in secure coding techniques?
**Answer:** Yes
**Additional Information:** The founder/developer has training in secure coding practices including OWASP Top 10 awareness, input validation, authentication security, and secure API design. Continuous learning is maintained through security publications and community resources.

### APPL-12
**Question:** Was your application developed using secure coding techniques?
**Answer:** Yes
**Additional Information:** The application follows secure coding practices including: parameterized queries (via Supabase client), input validation, output encoding, secure authentication (Supabase Auth), authorization enforcement (RLS), HTTPS everywhere, secure headers (via Netlify), and no hard-coded secrets.

### APPL-13
**Question:** If mobile, is the application available from a trusted source?
**Answer:** N/A
**Additional Information:** Speakeasy is a web-based application accessed through a browser. There is no native mobile application. The web application is responsive and works on mobile browsers.

### APPL-14
**Question:** Do you have a policy for how employees obtain administrator access to institutional instances?
**Answer:** Yes
**Additional Information:** Administrative access to production systems is limited to the founder and is protected by MFA. Access is through Supabase's management dashboard and AWS console, both requiring strong authentication. No institutional instance-specific admin access is granted to other individuals.

### DCTR-01
**Question:** Select your hosting option.
**Answer:** Cloud (IaaS/PaaS)
**Additional Information:** Speakeasy is hosted entirely in the cloud. Frontend on Netlify (CDN/edge hosting), backend on Supabase (managed PostgreSQL, Edge Functions, Storage on AWS), AI processing on AWS Bedrock.

### DCTR-02
**Question:** Is a SOC 2 Type 2 report available for the hosting environment?
**Answer:** Yes
**Additional Information:** All of our hosting providers maintain SOC 2 Type II certifications: Supabase (SOC 2 Type II), AWS (SOC 2 Type II, plus SOC 1, SOC 3, ISO 27001, and more), and Netlify (SOC 2). Reports are available upon request from these providers.

### DCTR-03
**Question:** Are you generally able to accommodate storing data within the institution's geographic region?
**Answer:** Yes
**Additional Information:** All data is currently stored in AWS us-east-1 (Northern Virginia). This can accommodate U.S. institutions' data residency requirements. For international requirements, we can discuss region-specific deployments.

### DCTR-04
**Question:** Are the data centers staffed 24x7x365?
**Answer:** Yes
**Additional Information:** AWS data centers (which host our Supabase infrastructure) are staffed 24x7x365 with physical security personnel, as documented in their SOC 2 reports.

### DCTR-05
**Question:** Are your servers separated from other companies via physical barriers?
**Answer:** N/A
**Additional Information:** As a cloud-hosted service using managed infrastructure (Supabase on AWS), physical server separation is managed by AWS. AWS provides logical isolation between tenants and maintains strict physical security controls as documented in their compliance certifications.

### DCTR-06
**Question:** Does a physical barrier fully enclose the physical space?
**Answer:** N/A
**Additional Information:** Physical security of data center facilities is managed by AWS, which maintains comprehensive physical security controls including perimeter fencing, controlled access points, security guards, and surveillance, as documented in their SOC 2 reports.

### DCTR-07
**Question:** Are your primary and secondary data centers geographically diverse?
**Answer:** Yes
**Additional Information:** AWS us-east-1 consists of multiple availability zones that are geographically separated within the region. Supabase leverages this multi-AZ architecture for redundancy.

### DCTR-08
**Question:** Is the service hosted in a high-availability environment?
**Answer:** Yes
**Additional Information:** Supabase and Netlify both provide high-availability architectures. Netlify uses a global CDN with edge nodes. Supabase uses AWS infrastructure with built-in redundancy. All services provide 99.9%+ uptime SLAs.

### DCTR-09
**Question:** Is redundant power available for all data centers?
**Answer:** Yes
**Additional Information:** AWS data centers where our data resides have redundant power supplies, including UPS and backup generators, as documented in their SOC 2 and compliance reports.

### DCTR-10
**Question:** Are redundant power strategies tested?
**Answer:** Yes
**Additional Information:** AWS regularly tests their redundant power systems as part of their operational procedures, documented in their SOC 2 Type II reports.

### DCTR-11
**Question:** Does the data center have cooling and fire-suppression systems?
**Answer:** Yes
**Additional Information:** AWS data centers have active cooling and fire-suppression systems that are regularly tested, as documented in their compliance certifications.

### DCTR-12
**Question:** Do you have ISP redundancy?
**Answer:** Yes
**Additional Information:** AWS data centers have multiple ISP connections for redundancy. Netlify's CDN provides additional network resilience through its globally distributed edge network.

### DCTR-13
**Question:** Does the data center have multiple network provider entrances?
**Answer:** Yes
**Additional Information:** AWS data centers have multiple telecommunications provider entrances, as documented in their compliance reports.

### DCTR-14
**Question:** Do you require multifactor authentication for all administrative accounts?
**Answer:** Yes
**Additional Information:** MFA is enabled on all administrative accounts: AWS console, Supabase dashboard, Netlify management, and GitHub (source code). This is enforced for all accounts with administrative privileges.

### DCTR-15
**Question:** Are you using your cloud provider's available hardening tools or pre-hardened images?
**Answer:** Yes
**Additional Information:** We use Supabase's managed infrastructure, which comes pre-configured with security best practices. Netlify's deployment platform includes built-in security headers and DDoS protection. We leverage AWS security configurations provided through Supabase's managed services.

### DCTR-16
**Question:** Does your cloud solution provider have access to your encryption keys?
**Answer:** Yes
**Additional Information:** Supabase/AWS manages encryption keys through AWS KMS. While AWS has the technical ability to access keys (as the KMS operator), they are bound by their service agreements and compliance certifications not to access customer data. AWS KMS provides audit trails for all key usage.

### FIDP-01
**Question:** Are you utilizing a stateful packet inspection (SPI) firewall?
**Answer:** Yes
**Additional Information:** Network-level firewalling is provided by our infrastructure. Supabase's AWS infrastructure includes VPC security groups and network ACLs. Netlify provides DDoS protection and edge-level security.

### FIDP-02
**Question:** Do you have a documented policy for firewall change requests?
**Answer:** N/A
**Additional Information:** Firewall management is handled by our managed infrastructure providers (Supabase/AWS, Netlify). We do not manage firewalls directly. Any network configuration changes are made through provider dashboards with audit logging.

### FIDP-03
**Question:** Have you implemented an intrusion detection system (network-based)?
**Answer:** Yes
**Additional Information:** Network-level intrusion detection is provided by our infrastructure providers. AWS includes VPC Flow Logs and GuardDuty capabilities. Supabase's managed infrastructure benefits from AWS's security monitoring.

### FIDP-04
**Question:** Do you employ host-based intrusion detection?
**Answer:** N/A
**Additional Information:** As we use fully managed services (Supabase, Netlify), we do not manage hosts directly. Host-level security monitoring is handled by our providers as part of their managed service offerings and SOC 2 compliance.

### FIDP-05
**Question:** Are audit logs available for all changes to network, firewall, IDS, and IPS systems?
**Answer:** Yes
**Additional Information:** Our infrastructure providers maintain audit logs for all infrastructure changes. AWS CloudTrail logs API calls and configuration changes. Supabase and Netlify provide their own audit logging for administrative actions.

### FIDP-06
**Question:** Is authority for firewall change approval documented?
**Answer:** N/A
**Additional Information:** Firewall management is handled by our managed infrastructure providers. As a single-developer company, the founder is the sole authorized person for any infrastructure configuration changes.

### FIDP-07
**Question:** Have you implemented an intrusion prevention system (network-based)?
**Answer:** Yes
**Additional Information:** Netlify provides DDoS mitigation and traffic filtering at the edge. AWS infrastructure includes network-level security controls. Supabase applies rate limiting and API-level protections.

### FIDP-08
**Question:** Do you employ host-based intrusion prevention?
**Answer:** N/A
**Additional Information:** Host-level security is managed by our infrastructure providers as part of their managed services. We do not manage hosts directly.

### FIDP-09
**Question:** Are you employing next-generation persistent threat monitoring?
**Answer:** No
**Additional Information:** We do not currently employ NGPT monitoring. Our cloud providers include built-in threat detection capabilities (e.g., AWS GuardDuty). We plan to evaluate additional threat monitoring solutions as we scale.

### FIDP-10
**Question:** Is intrusion monitoring performed internally or by a third-party service?
**Answer:** Third-party
**Additional Information:** Intrusion monitoring is primarily provided by our infrastructure providers (AWS, Supabase, Netlify) as part of their managed service offerings.

### FIDP-11
**Question:** Do you monitor for intrusions on a 24x7x365 basis?
**Answer:** Yes
**Additional Information:** Our infrastructure providers (AWS, Supabase, Netlify) provide 24x7x365 monitoring of their infrastructure. Application-level monitoring is supplemented by automated alerts and logging.

### HFIH-01
**Question:** Do you have a formal incident response plan?
**Answer:** No
**Additional Information:** We do not yet have a formally documented incident response plan. However, we have informal procedures for responding to security incidents including: immediate containment, assessment, notification to affected institutions, remediation, and post-incident review. We plan to formalize this as part of SOC 2 preparation.

### HFIH-02
**Question:** Do you have an internal or external incident response team?
**Answer:** No
**Additional Information:** As a single-developer company, incident response is currently handled by the founder. As we scale, we plan to engage an external incident response service to provide additional expertise and 24/7 coverage.

### HFIH-03
**Question:** Do you have the capability to respond to incidents on a 24x7x365 basis?
**Answer:** No
**Additional Information:** As a single-developer company, guaranteed 24x7 response is not currently feasible. However, the founder monitors critical alerts and can respond to urgent security incidents at any time. Our infrastructure providers (Supabase, AWS, Netlify) provide 24x7 monitoring and response for infrastructure-level incidents.

### HFIH-04
**Question:** Do you carry cyber-risk insurance?
**Answer:** No
**Additional Information:** We do not currently carry cyber-risk insurance. We plan to obtain coverage as we scale and onboard additional institutional customers.

### VULN-01
**Question:** Are your systems scanned for vulnerabilities prior to new releases?
**Answer:** Yes
**Additional Information:** Dependencies are checked for known vulnerabilities using npm audit and GitHub Dependabot before each release. We plan to add automated security scanning (SAST/DAST) to our CI/CD pipeline as we scale.

### VULN-02
**Question:** Will you provide results of vulnerability scans to the institution?
**Answer:** Yes
**Additional Information:** We are willing to share relevant vulnerability scan results with institutional partners upon request, subject to responsible disclosure practices.

### VULN-03
**Question:** Will you allow the institution to perform its own vulnerability testing?
**Answer:** Yes
**Additional Information:** We welcome institutional vulnerability testing and penetration testing, provided it is performed at a mutually agreed upon time and scope to avoid service disruption.

### VULN-04
**Question:** Have your systems had a third-party security assessment in the last year?
**Answer:** No
**Additional Information:** We have not yet undergone a formal third-party security assessment. Our infrastructure providers (Supabase, AWS, Netlify) undergo regular third-party audits as part of their SOC 2 certifications. We plan to engage a third-party security assessor as we scale.

### VULN-05
**Question:** Do you regularly scan for common web application vulnerabilities?
**Answer:** Yes
**Additional Information:** We monitor for OWASP Top 10 vulnerabilities through secure coding practices and dependency scanning. Our use of Supabase's parameterized queries prevents SQL injection. React's built-in XSS protection, combined with proper output encoding, mitigates cross-site scripting risks. CSRF protection is provided through Supabase Auth token-based authentication.

### VULN-06
**Question:** Are your systems regularly scanned externally for vulnerabilities?
**Answer:** No
**Additional Information:** We do not currently perform regular external vulnerability scans. We plan to implement automated external scanning as part of our security maturation process.

---

## IT Accessibility Tab

### ITAC-01
**Question:** Solution Provider Accessibility Contact Name
**Answer:** Collin Marnell

### ITAC-02
**Question:** Solution Provider Accessibility Contact Title
**Answer:** CEO

### ITAC-03
**Question:** Solution Provider Accessibility Contact Email
**Answer:** collin.marnell@gmail.com

### ITAC-04
**Question:** Solution Provider Accessibility Contact Phone Number
**Answer:** 6787105486

### ITAC-05
**Question:** Web Link to Accessibility Statement or VPAT
**Answer:** N/A
**Additional Information:** We do not currently have a published Accessibility Statement or VPAT. We plan to develop these documents as we pursue WCAG 2.1 AA compliance.

### ITAC-06
**Question:** Has a VPAT or ACR been created or updated within the past 12 months?
**Answer:** No
**Additional Information:** A VPAT has not yet been created. This is planned as part of our accessibility compliance roadmap.

### ITAC-07
**Question:** Will your company agree to meet WCAG 2.1 AA as part of your contractual agreement?
**Answer:** Yes
**Additional Information:** We are committed to achieving WCAG 2.1 AA compliance and are willing to include accessibility commitments in our contractual agreements. We are actively working toward this standard and welcome institutional feedback to prioritize accessibility improvements.

### ITAC-08
**Question:** Does the solution substantially conform to WCAG 2.1 AA?
**Answer:** No
**Additional Information:** We have not yet completed a formal WCAG 2.1 AA conformance evaluation. Our React-based frontend uses semantic HTML and ARIA attributes where applicable. We recognize accessibility as a priority and plan to conduct formal testing and remediation. Some features (video recording, eye contact tracking) present inherent accessibility challenges that we are actively exploring solutions for.

### ITAC-09
**Question:** Do you have a documented process for reporting and tracking accessibility issues?
**Answer:** No
**Additional Information:** We do not yet have a formal accessibility issue tracking process. Users can report accessibility concerns through our standard support channels. We plan to implement a dedicated accessibility feedback mechanism and tracking system.

### ITAC-10
**Question:** Do you have documentation to support the accessibility features of your solution?
**Answer:** No
**Additional Information:** Formal accessibility documentation has not yet been created. This will be developed alongside our WCAG 2.1 AA compliance efforts.

### ITAC-11
**Question:** Has a third-party expert conducted an audit of the most recent version?
**Answer:** No
**Additional Information:** A third-party accessibility audit has not yet been conducted. We plan to engage an accessibility testing firm as part of our compliance roadmap.

### ITAC-12
**Question:** Do you have a documented process for verifying accessibility conformance?
**Answer:** No
**Additional Information:** We do not yet have a formal accessibility verification process. We plan to integrate automated accessibility testing (e.g., axe-core, Lighthouse) into our development pipeline and conduct periodic manual testing.

### ITAC-13
**Question:** Have you adopted a technical or legal standard of conformance?
**Answer:** Yes
**Additional Information:** We have adopted WCAG 2.1 AA as our target accessibility standard and are working toward full conformance.

### ITAC-14
**Question:** Can you provide a current, detailed accessibility roadmap with delivery timelines?
**Answer:** Yes
**Additional Information:** We can provide an accessibility roadmap that includes: automated testing integration (near-term), keyboard navigation improvements, screen reader compatibility, color contrast remediation, and third-party audit (planned within the next 12 months). Specific timelines can be discussed with institutional partners.

### ITAC-15
**Question:** Do you expect your staff to maintain a current skill set in IT accessibility?
**Answer:** Yes
**Additional Information:** The founder maintains awareness of accessibility best practices and WCAG standards. As the team grows, accessibility training will be required for all developers.

### ITAC-16
**Question:** Do you have documented processes for implementing accessibility into your development lifecycle?
**Answer:** No
**Additional Information:** We do not yet have formally documented accessibility development processes. We plan to integrate accessibility reviews into our development workflow, including automated testing in CI/CD and manual review checkpoints.

### ITAC-17
**Question:** Can all functions of the application be performed using only the keyboard?
**Answer:** No
**Additional Information:** Most navigation and form interactions support keyboard operation. However, the core video recording feature requires camera/microphone interaction that currently relies on mouse/touch. We are working to ensure all non-media-capture functions are fully keyboard accessible.

### ITAC-18
**Question:** Does your product rely on activating a special "accessibility mode" or overlay?
**Answer:** No
**Additional Information:** Speakeasy does not use a separate accessibility mode, lite version, or overlay. Accessibility improvements are integrated directly into the main application experience.

---

## Case-Specific Tab

### CONS-01 through CONS-09
**Note:** REQU-03 was answered "No" (not providing consulting services). These questions should be auto-populated as N/A by the spreadsheet.

### HIPA-01 through HIPA-29
**Note:** REQU-05 was answered "No" (does not process PHI/HIPAA data). These questions should be auto-populated as N/A by the spreadsheet.

### PCID-01 through PCID-12
**Note:** REQU-06 was answered "No" (does not process credit card information). These questions should be auto-populated as N/A by the spreadsheet.

### OPEM-01
**Question:** Do you support role-based access control (RBAC) for system administrators?
**Answer:** Yes
**Additional Information:** Speakeasy implements RBAC with distinct roles for students, professors, and administrators. Each role has specific permissions enforced through database-level Row Level Security policies.

### OPEM-02
**Question:** Can your employees access customer systems remotely?
**Answer:** No
**Additional Information:** Speakeasy does not access institutional systems. We are a cloud-hosted SaaS product that institutions connect to via web browser. The founder has administrative access to Speakeasy's own infrastructure (Supabase, AWS, Netlify) but does not access any institutional networks or systems.

### OPEM-03
**Question:** Can you provide system/application architecture diagrams?
**Answer:** Yes
**Additional Information:** We can provide architecture diagrams showing the complete data flow: React frontend (Netlify) -> Supabase (Auth, PostgreSQL, Edge Functions, Storage) -> AWS Bedrock (AI grading) and Deepgram (speech-to-text). Diagrams are available upon request.

### OPEM-04
**Question:** Do you require remote management of the system?
**Answer:** No
**Additional Information:** No remote access to institutional systems is required. All management is performed through our cloud provider dashboards (Supabase, AWS, Netlify).

### OPEM-05
**Question:** If yes to OPEM-04, are remote actions logged?
**Answer:** N/A
**Additional Information:** Not applicable as we do not require remote access to institutional systems.

### OPEM-06
**Question:** If you maintain remote access, will you handle data in a FERPA-compliant manner?
**Answer:** Yes
**Additional Information:** All data handling is FERPA-compliant. Speakeasy acts as a "school official" under FERPA, processing education records on behalf of the institution. All data is encrypted, access is restricted, and we do not share data with unauthorized parties.

### OPEM-07
**Question:** Do you support campus status monitoring through SNMPv3 or other means?
**Answer:** No
**Additional Information:** As a cloud-hosted SaaS product, SNMPv3 monitoring is not applicable. We can provide status monitoring through a public status page and API-based health checks.

### OPEM-08
**Question:** Describe safeguards used to monitor for malicious activity.
**Answer:** We leverage multiple layers of security monitoring: Netlify provides DDoS protection and edge-level security monitoring. Supabase provides API rate limiting, authentication logging, and database audit trails. AWS provides infrastructure-level threat detection through services like GuardDuty. Application-level monitoring includes failed authentication tracking and anomalous access pattern detection through Supabase logs.

### OPEM-09
**Question:** Describe how long your organization has conducted business in this area.
**Answer:** Speakeasy was founded in 2025 and is currently in pilot phase with Virginia Tech. While the company is new, the founder has experience in software development and higher education technology. The platform has been in development and pilot testing with university faculty for approximately 1 year.

### OPEM-10
**Question:** Do you have existing higher education customers?
**Answer:** Yes
**Additional Information:** Speakeasy is currently piloting with faculty at Virginia Tech. We are actively expanding to additional universities.

---

## AI Tab

### AIQU-01
**Question:** Does your solution leverage machine learning (ML)?
**Answer:** Yes
**Additional Information:** Speakeasy uses AI/ML models for grading student presentations. We use AWS Bedrock to access Claude (Anthropic) and Nova (Amazon) large language models for evaluating presentation content, structure, and delivery. Deepgram uses ML for speech-to-text transcription. Face-api.js uses ML models for client-side eye contact tracking (runs entirely in the browser).

### AIQU-02
**Question:** Does your solution leverage a large language model (LLM)?
**Answer:** Yes
**Additional Information:** Yes. Speakeasy uses Claude (Anthropic) and Nova (Amazon) large language models through AWS Bedrock for AI-powered grading of student presentations. These models evaluate transcripts against professor-defined rubrics.

### AIGN-01
**Question:** Does your solution have an AI risk model?
**Answer:** No
**Additional Information:** We do not yet have a formal AI risk model. However, we have implemented practical risk mitigations: AI grades are presented as supplementary to professor judgment, professors can override AI scores, and we use structured rubrics to minimize bias and inconsistency. We plan to develop a formal AI risk framework as we scale.

### AIGN-02
**Question:** Can your solution's AI features be disabled by tenant and/or user?
**Answer:** Yes
**Additional Information:** Professors have full control over their assignments and can choose whether to use AI grading features. The platform can function without AI grading enabled. AI features can be disabled at the assignment level.

### AIGN-03
**Question:** Have your staff completed responsible AI training?
**Answer:** No
**Additional Information:** As a single-developer company, formal responsible AI training has not been completed in a certified program. However, the founder maintains current knowledge of responsible AI practices, bias mitigation, and ethical AI use in education. Formal training will be required for all team members as we grow.

### AIGN-04
**Question:** Please describe the capabilities of your solution's AI features.
**Answer:** Speakeasy's AI features include: (1) Automated presentation grading -- LLMs (Claude/Nova via AWS Bedrock) evaluate student speech transcripts against professor-defined rubrics covering content, structure, delivery, word choice, and filler words. (2) Speech-to-text transcription -- Deepgram converts student audio recordings to text for AI analysis. (3) Eye contact tracking -- face-api.js runs client-side in the browser to analyze webcam footage for eye contact with the camera during presentations. All AI grading results are advisory and subject to professor review and override.

### AIGN-05
**Question:** Does your solution support business rules to protect sensitive data from AI ingestion?
**Answer:** Yes
**Additional Information:** Only presentation transcripts and rubric criteria are sent to AI models for grading. Personally identifiable information (names, emails, student IDs) is not included in AI prompts. AWS Bedrock is configured to not retain any input/output data. The AI models never receive raw video files or audio recordings -- only text transcripts.

### AIPL-01
**Question:** Are AI developer's policies and practices related to AI risk management conspicuously posted and implemented?
**Answer:** No
**Additional Information:** We do not yet have formally published AI risk management policies. However, our AI implementation follows responsible practices: data minimization in AI prompts, no data retention by AI providers, human oversight of AI outputs, and structured evaluation criteria to reduce bias. We plan to formalize and publish AI governance policies as we scale.

### AIPL-02
**Question:** Have you identified and measured AI risks?
**Answer:** Yes
**Additional Information:** We have identified key AI risks including: grading bias/inconsistency, hallucinated feedback, over-reliance on AI scores by professors, and data privacy in AI processing. Mitigations include: using structured rubrics to constrain AI output, providing AI scores as advisory only, enabling professor override, not sending PII to AI models, and using AWS Bedrock with no data retention.

### AIPL-03
**Question:** In the event of an incident, can AI features be disabled in a timely manner?
**Answer:** Yes
**Additional Information:** AI features can be disabled quickly through configuration changes. Disabling the AWS Bedrock integration or Deepgram connection can be done within minutes. The platform continues to function for video recording and manual grading without AI features.

### AIPL-04
**Question:** If disabled, can AI features be re-enabled in a timely manner?
**Answer:** Yes
**Additional Information:** Re-enabling AI features requires only restoring the API configuration, which can be done within minutes. No data loss or service disruption occurs during the disable/re-enable process.

### AIPL-05
**Question:** Do you have documented technical and procedural processes for AI negative impacts?
**Answer:** No
**Additional Information:** We do not yet have formally documented processes aligned with the AI RMF. However, we have practical mitigations in place: professor oversight of all AI-generated grades, ability to disable AI features per assignment, and monitoring of AI output quality. We plan to develop formal AI governance documentation aligned with NIST AI RMF as we mature.

### AISC-01
**Question:** If sensitive data is introduced to your AI model, can the data be removed?
**Answer:** N/A
**Additional Information:** Our AI implementation uses AWS Bedrock, which does not retain any input or output data. Data is processed in real-time and not stored by the AI service. There is no persistent model that accumulates data, so removal is not necessary -- data simply is not retained.

### AISC-02
**Question:** Is user input data used to influence your solution's AI model?
**Answer:** No
**Additional Information:** No user data is used to train or fine-tune AI models. We use AWS Bedrock's pre-trained models (Claude, Nova) through their API. Inputs and outputs are not retained by AWS Bedrock and are not used for model training or improvement.

### AISC-03
**Question:** Do you provide logging for AI features including user, date, and action taken?
**Answer:** Yes
**Additional Information:** All AI grading requests are logged in our database, including the requesting user, timestamp, assignment context, and results. AWS CloudTrail also logs all Bedrock API calls with timestamps and request metadata.

### AISC-04
**Question:** Please describe how you validate user inputs.
**Answer:** User inputs to AI features are validated at multiple levels: (1) Only authenticated users with appropriate roles can trigger AI grading. (2) Transcripts are generated by Deepgram from actual audio recordings -- users cannot directly inject text into the AI grading pipeline. (3) Rubric criteria are defined by professors through structured forms with validation. (4) AI prompts are constructed server-side (in Supabase Edge Functions) with parameterized templates, preventing prompt injection.

### AISC-05
**Question:** Do you plan for and mitigate supply-chain risk related to AI features?
**Answer:** Yes
**Additional Information:** We mitigate AI supply-chain risk by: using established, enterprise-grade AI providers (AWS Bedrock, Deepgram) with strong security track records; not depending on open-source or community-maintained AI models; having the ability to switch between AI providers (Claude and Nova) if one becomes unavailable; and monitoring provider security communications.

### AIML-01
**Question:** Do you separate ML training data from ML solution data?
**Answer:** N/A
**Additional Information:** We do not train our own ML models. We use pre-trained models via AWS Bedrock (Claude, Nova) and Deepgram. No training data is collected or maintained by Speakeasy.

### AIML-02
**Question:** Do you authenticate and verify your ML model's feedback?
**Answer:** Yes
**Additional Information:** AI grading outputs are validated against expected rubric criteria and score ranges before being presented to users. Professors review and can override all AI-generated scores. We monitor for anomalous outputs.

### AIML-03
**Question:** Is your ML training data vetted before training?
**Answer:** N/A
**Additional Information:** We do not train ML models. We use pre-trained models through AWS Bedrock and Deepgram APIs.

### AIML-04
**Question:** Is your ML training data monitored and audited?
**Answer:** N/A
**Additional Information:** Not applicable. We do not maintain or train ML models.

### AIML-05
**Question:** Have you limited access to ML training data?
**Answer:** N/A
**Additional Information:** Not applicable. We do not maintain ML training data.

### AIML-06
**Question:** Have you implemented adversarial training or model defense mechanisms?
**Answer:** Yes
**Additional Information:** While we do not train our own models, we implement defenses against adversarial inputs: server-side prompt construction prevents prompt injection, input validation ensures only legitimate transcripts reach the AI, and structured rubrics constrain AI output to expected formats and ranges.

### AIML-07
**Question:** Do you make your ML model transparent through documentation and log inputs/outputs?
**Answer:** Yes
**Additional Information:** We document which AI models are used (Claude via Bedrock, Nova via Bedrock, Deepgram for STT), what data is sent to each model, and what outputs are generated. All AI interactions are logged in our database with timestamps and results.

### AIML-08
**Question:** Do you watermark your ML training data?
**Answer:** N/A
**Additional Information:** Not applicable. We do not maintain or train ML models.

### AILM-01
**Question:** Do you limit your solution's LLM privileges by default?
**Answer:** Yes
**Additional Information:** Our LLM integration follows least-privilege principles. AWS Bedrock API access is restricted to specific model IDs and configured with minimal IAM permissions. The LLM can only receive text input and return text output -- it has no access to databases, file systems, or other system resources.

### AILM-02
**Question:** Is your LLM training data vetted before training?
**Answer:** N/A
**Additional Information:** We use pre-trained models (Claude by Anthropic, Nova by Amazon) through AWS Bedrock. We do not train or fine-tune LLMs. The model providers are responsible for their training data curation.

### AILM-03
**Question:** Do any actions taken by your LLM features require human intervention?
**Answer:** Yes
**Additional Information:** AI-generated grades are always presented as advisory. Professors review all AI grading results and have full authority to accept, modify, or override AI scores. No automated actions are taken based solely on LLM output without the opportunity for human review.

### AILM-04
**Question:** Do you limit multiple LLM model plugins being called as part of a single input?
**Answer:** Yes
**Additional Information:** Our AI pipeline is structured and sequential: audio goes to Deepgram for transcription, then the transcript goes to a single LLM (Claude or Nova) for grading. We do not chain multiple LLM calls or use LLM plugins. Each grading request uses one model call with a defined prompt template.

### AILM-05
**Question:** Do you limit your LLM resource use per request, per step, and per action?
**Answer:** Yes
**Additional Information:** LLM requests are rate-limited through AWS Bedrock's built-in throttling and our application-level controls. Token limits are set for both input and output. Each grading request is scoped to a single student submission, preventing excessive resource consumption.

### AILM-06
**Question:** Do you leverage LLM model tuning or other model validation mechanisms?
**Answer:** Yes
**Additional Information:** We use carefully crafted prompt engineering with structured rubrics to guide model behavior. We validate model outputs against expected score ranges and rubric criteria. We compare results across multiple models (Claude and Nova) to assess consistency. We do not fine-tune models.

### AILM-07
**Question:** Do you perform taint tracing or tracking on all plugin content related to the LLM?
**Answer:** N/A
**Additional Information:** We do not use LLM plugins. Our LLM integration is through direct API calls to AWS Bedrock with structured prompts. All inputs to the LLM originate from our controlled backend (Supabase Edge Functions), not from untrusted plugin sources.

---

## Privacy Tab

### PRGN-01
**Question:** Does your solution process FERPA-related data?
**Answer:** Yes
**Additional Information:** Yes. Speakeasy processes student education records including names, email addresses, video recordings of presentations, transcripts, and AI-generated grades. We act as a "school official" under FERPA, processing this data on behalf of the institution under the institution's direct control.

### PRGN-02
**Question:** Does your solution process GDPR-related or PIPL-related data?
**Answer:** No
**Additional Information:** Speakeasy currently serves U.S.-based institutions only. We do not currently collect data from individuals in the EEA or China. If we expand internationally, we will implement appropriate GDPR/PIPL compliance measures.

### PRGN-03
**Question:** Does your solution process personal data regulated by state law(s)?
**Answer:** Yes
**Additional Information:** Speakeasy processes personal data (student names, emails, video recordings) that may be subject to state privacy laws such as the Virginia Consumer Data Protection Act (VCDPA) and potentially CCPA if California students are involved. We comply with applicable state data protection requirements.

### PRGN-04
**Question:** Does your solution process user-provided data that may contain regulated information?
**Answer:** Yes
**Additional Information:** Students record video presentations that may incidentally contain regulated information. The primary data collected includes student names, email addresses, video/audio recordings, transcripts, and grades. All data is treated as sensitive and protected accordingly.

### PRGN-05
**Question:** Web Link to Product/Service Privacy Notice
**Answer:** https://drive.google.com/file/d/1rfEaTbJHsf2lXRgJkrVSsf-8JqgTne70/view?usp=sharing

### PCOM-01
**Question:** Have you had a personal data breach in the past three years?
**Answer:** No
**Additional Information:** Speakeasy has not experienced any personal data breaches. The company was recently founded and has maintained strong security practices since inception.

### PCOM-02
**Question:** Use this area to share information about your privacy practices.
**Answer:** Speakeasy is committed to student data privacy. Key privacy practices include: (1) Data minimization -- we collect only what is necessary for the service. (2) Limited retention -- student data is retained for one semester, then deleted. (3) No data selling -- we never sell, share, or monetize student data. (4) AI privacy -- AI providers (AWS Bedrock, Deepgram) do not retain student data after processing. (5) FERPA compliance -- we operate as a "school official" processing data on behalf of institutions. (6) Encryption -- all data is encrypted in transit (TLS) and at rest (AES-256). (7) Access controls -- Row Level Security ensures data isolation between institutions and users.

### PCOM-03
**Question:** Have you had any violations of privacy policies or privacy law in the past 36 months?
**Answer:** No
**Additional Information:** Speakeasy has not had any privacy policy violations or violations of applicable privacy law.

### PCOM-04
**Question:** Do you have a dedicated data privacy staff or office?
**Answer:** No
**Additional Information:** As a single-developer startup, the founder manages data privacy directly. Privacy considerations are integrated into all design and development decisions. A dedicated privacy role will be established as the company grows.

### PDOC-01
**Question:** If you have completed a SOC 2 audit, does it include the Privacy Trust Service Principle?
**Answer:** N/A
**Additional Information:** We have not yet completed a SOC 2 audit. When we pursue SOC 2, we plan to include the Privacy Trust Service Principle.

### PDOC-02
**Question:** Do you conform with a specific industry-standard privacy framework?
**Answer:** No
**Additional Information:** We do not yet formally conform to a specific privacy framework. However, our practices align with FERPA requirements and privacy-by-design principles. We plan to adopt the NIST Privacy Framework as we formalize our privacy program.

### PDOC-03
**Question:** Does your employee onboarding include information security and data privacy training?
**Answer:** N/A
**Additional Information:** Currently a single-developer company. When we begin hiring, onboarding will include mandatory security and privacy training covering FERPA, data handling procedures, and our privacy policies.

### PTHP-01
**Question:** Do you have contractual agreements with third parties requiring them to maintain standards and comply with regulations?
**Answer:** Yes
**Additional Information:** We operate under standard terms of service and data processing agreements with all third-party providers (Supabase, AWS, Deepgram, Netlify). These agreements include provisions for data protection, security standards compliance, and regulatory requirements. AWS Bedrock's terms specifically prohibit data retention and model training on customer data.

### PTHP-02
**Question:** Do you perform privacy impact assessments of third parties?
**Answer:** No
**Additional Information:** We do not conduct formal privacy impact assessments of third parties. However, we evaluate privacy practices of providers before integration, reviewing their privacy policies, data handling practices, and compliance certifications. We select providers that do not retain customer data (AWS Bedrock, Deepgram) and that maintain SOC 2 certifications.

### PCHG-01
**Question:** Does your change management process include privacy review and approval?
**Answer:** Yes
**Additional Information:** Privacy implications are considered for all changes that affect data handling. Any changes to data collection, processing, or sharing practices are reviewed for privacy impact before implementation. As a single-developer company, the founder reviews all changes with privacy in mind.

### PCHG-02
**Question:** Do you have procedures for mitigating privacy risks until they can be resolved?
**Answer:** Yes
**Additional Information:** When privacy risks are identified, we implement immediate mitigations such as restricting data access, disabling affected features, or applying additional controls until a permanent resolution is developed.

### PDAT-01
**Question:** Do you collect, process, or store demographic information?
**Answer:** Yes
**Additional Information:** We collect limited demographic information: student name and email address (provided by the institution or student during registration). We do not collect race, ethnicity, gender, age, or other demographic categories beyond what is necessary for account creation.

### PDAT-02
**Question:** Do you capture or create genetic, biometric, or behaviometric information?
**Answer:** Yes
**Additional Information:** Speakeasy uses face-api.js for client-side eye contact tracking during video recordings. This involves facial landmark detection to determine whether the student is looking at the camera. Important: this processing occurs entirely in the student's browser -- no facial recognition data, biometric templates, or facial geometry data is transmitted to or stored on our servers. Only a simple eye contact percentage score is stored. Video recordings are stored but are not processed for biometric identification purposes.

### PDAT-03
**Question:** Do you combine institutional data with personal data from other sources?
**Answer:** No
**Additional Information:** We do not combine institutional data with data from any other sources. Each institution's data is completely isolated through Row Level Security, and no external data enrichment or cross-referencing is performed.

### PDAT-04
**Question:** Is institutional data going in or out of the United States?
**Answer:** No
**Additional Information:** All data is stored and processed within the United States. Supabase is hosted in AWS us-east-1 (Northern Virginia). AWS Bedrock processes data in the US. Deepgram processes data in the US. No data leaves the United States.

### PDAT-05
**Question:** Do you capture device information (IP address, MAC address)?
**Answer:** Yes
**Additional Information:** Standard web application logging captures IP addresses as part of HTTP request logs (managed by Netlify and Supabase). We do not capture MAC addresses or device fingerprints. IP addresses in logs are retained per our providers' standard retention periods.

### PDAT-06
**Question:** Does any part of this service involve web/app tracking (pixels, cookies)?
**Answer:** No
**Additional Information:** Speakeasy does not use third-party tracking pixels, advertising cookies, or analytics tracking beyond basic service functionality. We use essential cookies for authentication session management only. No data is shared with advertising networks or data brokers.

### PDAT-07
**Question:** Does your staff have access to institutional data?
**Answer:** Yes
**Additional Information:** The founder has administrative access to the Supabase database for maintenance, support, and debugging. This access is protected by MFA and is used only as needed for service operation. No other individuals have access to institutional data.

### PDAT-08
**Question:** Will you handle personal data in compliance with all relevant laws and institution policies?
**Answer:** Yes
**Additional Information:** Yes. We are committed to handling all personal data in compliance with FERPA, applicable state privacy laws, and institutional policies. We will work with institutions to understand and comply with their specific data handling requirements.

### PRPO-01
**Question:** Do you have a documented privacy management process?
**Answer:** No
**Additional Information:** We do not yet have a formally documented privacy management process. However, privacy is a core consideration in our design and development. We maintain a privacy policy, implement data minimization, and follow privacy-by-design principles. We plan to formalize our privacy management process as we scale.

### PRPO-02
**Question:** Are privacy principles designed into the product lifecycle (privacy-by-design)?
**Answer:** Yes
**Additional Information:** Privacy-by-design is a core principle of Speakeasy's development. Examples include: data minimization (collecting only necessary data), AI provider selection based on no-data-retention policies, Row Level Security for data isolation, one-semester data retention policy, client-side biometric processing (face-api.js runs in browser), and not sharing data with third parties beyond what is necessary for service operation.

### PRPO-03
**Question:** Will you comply with applicable breach notification laws?
**Answer:** Yes
**Additional Information:** Yes. We will comply with all applicable federal and state breach notification laws and promptly notify affected institutions in the event of a data breach.

### PRPO-04
**Question:** Will you comply with the institution's policies regarding user privacy and data protection?
**Answer:** Yes
**Additional Information:** We are committed to complying with institutional privacy and data protection policies. We will work with each institution to understand their specific requirements and implement necessary controls.

### PRPO-05
**Question:** Is your company subject to the laws and regulations of the institution's geographic region?
**Answer:** Yes
**Additional Information:** Speakeasy LLC is a Virginia-based U.S. company subject to U.S. federal and state laws, including FERPA and applicable state privacy regulations.

### PRPO-06
**Question:** Do you have a privacy awareness/training program?
**Answer:** No
**Additional Information:** As a single-developer company, a formal privacy training program is not yet applicable. The founder maintains current knowledge of privacy regulations and best practices. A formal privacy training program will be established when additional team members are hired.

### PRPO-07
**Question:** Is privacy awareness training mandatory for all employees?
**Answer:** N/A
**Additional Information:** Currently a single-developer company. Privacy training will be mandatory for all employees once we begin hiring.

### PRPO-08
**Question:** Is AI privacy and ethics awareness/training required for all employees who work with AI?
**Answer:** N/A
**Additional Information:** Currently a single-developer company. The founder maintains awareness of AI privacy and ethics considerations. Formal AI ethics training will be required for all relevant employees once we begin hiring.

### PRPO-09
**Question:** Do you have any decision-making processes that are completely automated?
**Answer:** Yes
**Additional Information:** AI grading is automated but not final -- all AI-generated grades are presented to professors as recommendations that can be accepted, modified, or overridden. No consequential decisions (final grades, pass/fail determinations) are made solely by AI without human review.

### PRPO-10
**Question:** Do you have a documented process for managing automated processing?
**Answer:** No
**Additional Information:** We do not yet have a formally documented process for managing automated processing. However, our AI grading system includes built-in safeguards: structured rubric-based evaluation, score range validation, professor review/override capability, and the ability to disable AI features. We plan to formalize this documentation as we scale.

### PRPO-11
**Question:** Do you have a documented policy for sharing information with law enforcement?
**Answer:** No
**Additional Information:** We do not yet have a formal law enforcement request policy. We will not share institutional data with law enforcement without a valid warrant or subpoena, and we will notify the institution of any such requests to the extent legally permitted.

### PRPO-12
**Question:** Do you share any institutional data with law enforcement without a valid warrant or subpoena?
**Answer:** No
**Additional Information:** We will not share institutional data with law enforcement without a valid warrant or subpoena. We will notify the institution of any law enforcement requests to the extent legally permitted.

### PRPO-13
**Question:** Does your incident response team include a privacy analyst/officer?
**Answer:** No
**Additional Information:** As a single-developer company, the founder handles both security and privacy aspects of incident response. A dedicated privacy role will be established as the company grows. The founder has working knowledge of FERPA and privacy requirements that inform incident response activities.

### INTL-01
**Question:** Will data be collected from, processed in, or stored in the EEA?
**Answer:** No
**Additional Information:** All data collection, processing, and storage occurs within the United States. We do not currently serve institutions in the EEA.

### INTL-02
**Question:** Do you have a data protection officer (DPO)?
**Answer:** No
**Additional Information:** A DPO is not currently required as we do not process data subject to GDPR. If we expand to serve EEA institutions, we will designate a DPO as required.

### INTL-03
**Question:** Will you sign appropriate GDPR Standard Contractual Clauses?
**Answer:** N/A
**Additional Information:** Not currently applicable as we do not process data subject to GDPR. We are willing to discuss SCCs if needed for future international expansion.

### INTL-04
**Question:** Will data be collected from, processed in, or stored in China?
**Answer:** No
**Additional Information:** No data is collected from, processed in, or stored in China.

### INTL-05
**Question:** Do you comply with PIPL security, privacy, and data localization requirements?
**Answer:** N/A
**Additional Information:** Not applicable. We do not process data subject to China's PIPL.

### DRPV-01
**Question:** Have you performed a Data Privacy Impact Assessment?
**Answer:** No
**Additional Information:** We have not yet performed a formal DPIA. However, privacy considerations were central to our architecture decisions, including selecting AI providers that do not retain data, implementing RLS for data isolation, and minimizing data collection. We plan to conduct a formal DPIA as we scale.

### DRPV-02
**Question:** Do you provide an end-user privacy notice?
**Answer:** Yes
**Additional Information:** Our privacy policy describes data collection purposes, use, retention, and disclosure practices. It is available at: https://drive.google.com/file/d/1rfEaTbJHsf2lXRgJkrVSsf-8JqgTne70/view?usp=sharing

### DRPV-03
**Question:** Do you describe choices available to individuals and obtain consent?
**Answer:** Yes
**Additional Information:** Users are informed of data collection and use through our privacy policy. Consent is obtained implicitly through account creation and use of the platform. Students participate through institutional assignments, where the institution has authorized the use of Speakeasy under FERPA's "school official" exception.

### DRPV-04
**Question:** Do you collect personal information only for identified purposes?
**Answer:** Yes
**Additional Information:** We collect personal information solely for the purpose of providing the Speakeasy educational platform service as agreed with the institution. Data is not used for marketing, advertising, profiling, or any purpose beyond the core educational service.

### DRPV-05
**Question:** Do you have a documented list of personal data your service maintains?
**Answer:** Yes
**Additional Information:** Speakeasy maintains the following personal data: student name, email address, video recordings of presentations, audio recordings, AI-generated transcripts, AI-generated grades and feedback, eye contact scores, and assignment submissions metadata (timestamps, attempt counts).

### DRPV-06
**Question:** Do you retain personal information only as long as necessary?
**Answer:** Yes
**Additional Information:** Student data is retained for one semester (the duration of the academic term), then deleted. This ensures data is available for the educational purpose while minimizing long-term data accumulation. Data can also be deleted upon request before the retention period ends.

### DRPV-07
**Question:** Do you provide individuals with access to their personal information for review and update?
**Answer:** Yes
**Additional Information:** Students can view their own submissions, transcripts, grades, and profile information within the platform. Profile information can be updated. Data export and deletion requests are handled through our support process.

### DRPV-08
**Question:** Do you disclose personal information to third parties only for identified purposes?
**Answer:** Yes
**Additional Information:** Personal data is shared with third parties only as necessary for service operation: Supabase (data storage), AWS Bedrock (AI grading -- text transcripts only, no PII), and Deepgram (speech-to-text -- audio only). None of these providers retain data after processing. No data is shared with advertising, marketing, or data broker services.

### DRPV-09
**Question:** Do you protect personal information against unauthorized access?
**Answer:** Yes
**Additional Information:** Personal data is protected through multiple layers: encryption in transit (TLS) and at rest (AES-256), Row Level Security at the database level, role-based access controls, MFA for administrative access, and regular security monitoring. Only authenticated users can access data, and they can only access data appropriate to their role.

### DRPV-10
**Question:** Do you maintain accurate, complete, and relevant personal information?
**Answer:** Yes
**Additional Information:** Users can update their profile information. Submission data is automatically generated and maintained by the system. Data accuracy is maintained through automated processes (AI transcription, grading) with professor oversight for validation.

### DRPV-11
**Question:** Do you have procedures to address privacy-related complaints and disputes?
**Answer:** Yes
**Additional Information:** Privacy concerns and complaints can be directed to collin.marnell@gmail.com. We commit to investigating and responding to privacy complaints promptly. For institutional concerns, we work directly with the institution's designated contact.

### DRPV-12
**Question:** Do you anonymize, de-identify, or otherwise mask personal data?
**Answer:** No
**Additional Information:** We do not currently anonymize or de-identify data for secondary use. Data is used solely for its primary educational purpose and deleted after one semester.

### DRPV-13
**Question:** Do you use anonymized/de-identified data for purposes other than those agreed with the institution?
**Answer:** No
**Additional Information:** We do not use institutional data (whether identified or de-identified) for any purpose other than providing the Speakeasy educational service. No data is shared with ad networks, data brokers, or used for marketing or analytics unrelated to the institution's service.

### DRPV-14
**Question:** Do you certify stop-processing requests?
**Answer:** Yes
**Additional Information:** We will honor stop-processing requests from institutions. Upon receiving such a request, we will cease processing the institution's data and can provide a data export and deletion within a reasonable timeframe.

### DRPV-15
**Question:** Do you have a process to review code for ethical considerations?
**Answer:** No
**Additional Information:** We do not yet have a formal ethical code review process. However, the founder considers ethical implications -- particularly around AI fairness and bias -- during development. We plan to formalize ethical review processes as the team grows, particularly for AI-related features.

### DPAI-01
**Question:** Does your service use AI for the processing of institutional data?
**Answer:** Yes
**Additional Information:** Yes. AI is used to grade student presentations by analyzing transcripts against professor-defined rubrics. Speech-to-text AI converts audio to text. Client-side ML detects eye contact during recordings.

### DPAI-02
**Question:** Is any institutional data retained in AI processing?
**Answer:** No
**Additional Information:** No institutional data is retained by AI providers. AWS Bedrock does not store or retain input prompts or output responses, and does not use customer data for model training. Deepgram does not retain audio data after transcription. Face-api.js runs entirely client-side in the browser.

### DPAI-03
**Question:** Do you have agreements with third parties regarding data protection and AI use?
**Answer:** Yes
**Additional Information:** We operate under standard terms of service with AWS (Bedrock) and Deepgram that include data protection provisions. AWS Bedrock's terms explicitly state that customer data is not retained or used for model training. Deepgram's terms address data handling and non-retention.

### DPAI-04
**Question:** Will institutional data be processed through a third party that also uses AI?
**Answer:** Yes
**Additional Information:** Yes. Student audio is processed by Deepgram (speech-to-text AI) and student transcripts are processed by AWS Bedrock (Claude/Nova LLMs for grading). Both providers have contractual commitments to not retain or use customer data for model training.

### DPAI-05
**Question:** Is AI processing limited to fully licensed commercial enterprise AI services?
**Answer:** Yes
**Additional Information:** All AI processing uses fully licensed commercial enterprise services: AWS Bedrock (enterprise-grade, fully licensed) and Deepgram (commercial enterprise API). We do not use open-source or community AI models for processing institutional data.

### DPAI-06
**Question:** Will institutional data be processed by any shared AI services?
**Answer:** No
**Additional Information:** AWS Bedrock provides isolated inference for each API call -- institutional data is not shared with other customers or used in shared model training. Deepgram similarly processes each request in isolation. No shared or multi-tenant AI processing occurs.

### DPAI-07
**Question:** Do you have safeguards to protect institutional data from unintended AI queries or processing?
**Answer:** Yes
**Additional Information:** AI processing is triggered only through controlled, authenticated API calls from our backend (Supabase Edge Functions). There is no ad-hoc or exploratory AI access to institutional data. Prompts are constructed server-side using parameterized templates. Only relevant transcript data is sent to AI models -- no PII is included in AI prompts.

### DPAI-08
**Question:** Do you provide choice to the user to opt out of AI use?
**Answer:** Yes
**Additional Information:** Professors can choose whether to use AI grading for their assignments. The platform supports manual grading workflows without AI. Students can view their presentations without AI analysis. The decision to use AI features rests with the professor and institution.
