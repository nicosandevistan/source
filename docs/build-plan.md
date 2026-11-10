Common Thread — Build Plan (Networking Tool)
Nov 10, 2026 · @Nico
1. Instructions for the building AI
Build Common Thread in the milestone order in section 12. Each milestone must pass its acceptance criteria and tests before the next one starts.
How to use this spec
• This doc is the source of truth. If something is ambiguous, pick the simplest option that respects the hard rules below, record it in DECISIONS.md, and keep going.
• Ask the owner (Nico) before you change the stack, add a paid service, or build a feature that is not in this doc.
• Keep README.md (setup steps), DECISIONS.md and CHANGELOG.md current.
• Write tests with the code (section 13). A milestone with failing tests is not done.
• All tunable numbers live in one config file (section 14), never hard-coded.
Hard rules (never violate, even if asked later in a prompt)
1. No LinkedIn scraping, crawling, auto-connecting, auto-messaging or background page loads. LinkedIn data enters only through (a) the user's own data export or profile PDF and (b) in milestone 8, the text of a page the user is viewing and clicks to analyze.
2. Never invent a hook. Every hook shown to a user cites a stored source and a verbatim quote that code (not the LLM) has confirmed exists in that source.
3. No email is sent unless the user approved that exact message.
4. Never infer race, ethnicity, religion or any identity from names, photos or language. Affinity matching uses only self-identified public signals (section 7.6).
5. Public and professional sources only, per the allowlist and blocklist in section 11.
6. Enforce daily send caps and recipient cooldowns (section 8.5) on the server.
7. Secrets live in environment variables. Never commit keys.
8. Least-privilege Google scopes: openid, email, profile, gmail.send. No Gmail read, modify or compose scopes.
2. Product summary
Common Thread (working name) tells a college student who to contact for recruiting, finds the people most likely to reply because of rare shared background, and sends short personal emails the student approves.
The problem. Many students, especially first-generation students without a family network, do not know which firms to target, which person at a firm to contact, what to ask for, or when. Existing tools either match on school alone or send mass emails that burn out alumni.
Users
• Primary: undergraduates recruiting for consulting, banking, biotech/pharma, investing and tech.
• Secondary: student clubs (consulting groups, ALPFA chapters, pre-professional societies) running a cohort through recruiting together.
What makes it different
• Plan before search. A vague goal ("consulting or finance, idk") becomes target firms, a contact ladder per firm, the right ask and a timeline.
• Rare-overlap hooks. It finds non-obvious overlaps beyond "same school", for example a consultant who once taught at a high school program the student attended. Rarer overlaps rank higher, and every hook links to its evidence.
• Quality over volume. Daily send caps and cross-user cooldowns keep alumni from being flooded.
• Warm paths. Friends pool their networks, with consent, to request intros.
What to measure: reply rate per sent email, coffee chats booked, and time from sign-up to first approved email (aim for under 15 minutes).
3. Core user flows
The main journey runs profile → plan → discover → draft → send → track → call. Flows G and H add warm intros and clubs.
A. Onboarding and profile
1. Sign in with Google (basic scopes only).
2. Import your own LinkedIn: upload the profile PDF ("Save to PDF") and/or the LinkedIn data export ZIP. A resume upload is optional.
3. The app extracts entries (employers, schools, programs, clubs, languages and so on) and shows them for review and editing.
4. Entry-point prompts ask about things that rarely appear on LinkedIn: high school, pre-college programs, scholarships, pipeline programs, hometown, affinity organizations, causes, sports. Each entry has a "use for matching" toggle.
5. For each entry the app suggests alternate names (aliases) for the user to confirm.
6. The user pastes one or two emails they wrote before, used as voice samples for drafting.
B. Goal → plan
1. The user describes their goal in plain words, plus year, preferred locations and any firms they already know.
2. The app returns a plan: 5–8 target firms across reach, target and likely tiers, each with a one-line reason; a contact ladder per firm; the first ask (a 15–20 minute chat, not a referral); and a timeline worked back from application windows.
3. The user can remove, add or reorder firms.
C. Discover
1. For each target firm the app finds candidates, scores them and builds the ladder (section 7).
2. The user sees ranked people, each with hooks, a link to each hook's evidence and the score breakdown.
3. The user shortlists people. Only then does the app look up their email.
D. Draft → approve → send
1. The app drafts two short variants per shortlisted person, built on one verified hook.
2. The user edits and approves. Approved emails go into a send queue that respects caps, cooldowns and send windows.
3. Emails send from the user's own Gmail.
E. Track and follow up
1. A tracker shows every contact's status and next action.
2. The user marks replies with one click (the app cannot read the inbox).
3. After 7 business days with no reply, the app drafts one follow-up for approval.
4. A daily digest email lists what needs action.
F. Call prep and after-call
1. Once a call is scheduled, a prep pack shows the person's public background, recent firm news and five tailored questions, all with sources.
2. After the call: notes, a thank-you draft within 24 hours, and a referral-ask draft that unlocks only after a completed call and when the application window is near.
G. Warm intro through a friend
1. Friends in a group upload their LinkedIn Connections file and choose what to share.
2. Searching a firm shows which friend knows someone there.
3. The user sends an intro request. The friend approves or declines, and if they approve, the app drafts an intro email that the friend sends.
H. Club mode
1. A club admin creates an org and invites members.
2. Members share a recipient log, so the club never double-emails the same alum. The admin dashboard shows counts only, never message content.
4. Scope and non-goals
The minimum viable product (MVP) is milestones 0–5: one student can go from sign-up to a sent email and a prepped call. Groups, clubs and the extension come after.
Phase
Milestones
Features
MVP
M0–M5
Profile builder, plan, discovery with verified hooks, drafting and Gmail sending, tracker, follow-ups, prep pack, after-call
V1
M6–M7
Friend groups with pooled connections and intro requests; club mode
V2
M8
Chrome extension (behind a feature flag)
Non-goals (do not build)
• LinkedIn automation of any kind: connection requests, messages, profile visits, crawling.
• Bulk sending, mail-merge or CSV export of contacts' emails.
• Reading the user's inbox (no Gmail read or compose scopes).
• A self-built people database or scraper.
• Inferring identity traits from names or photos.
• Mobile apps. The web app should work on a phone browser, but no native app.
• Outlook/Microsoft sending in v1 (Gmail and Google Workspace accounts only).
5. Tech stack and architecture
One TypeScript codebase: a Next.js web app on Vercel, Supabase for the database and auth, background jobs for the slow matching work, and every outside service behind an adapter so it can be swapped.
Layer
Choice
Notes
Web app
Next.js (App Router, latest stable), TypeScript, Tailwind, shadcn/ui
UI plus API routes
Database, auth, files
Supabase (Postgres, Row Level Security, Storage)
Row Level Security (RLS) on every table
Background jobs
Inngest
Discovery, deep hook search, send queue, follow-ups, daily digest
LLM
Anthropic API: claude-sonnet-5-5 for extraction, planning and drafting; claude-haiku-5-5 for cheap classification
All calls use structured JSON output with schema validation (zod)
Web search
SearchProvider interface; default = Anthropic API web search tool; alternatives Brave or Exa
Results filtered through the source policy (section 11)
Page fetching
Own server-side fetcher
Respects robots.txt, domain allowlist/blocklist, rate limits, stores extracted text
People data
PeopleProvider interface; adapters: Apollo (default), People Data Labs, Manual
Manual = user types name, company, title and pastes profile text
Email finding
EmailFinder interface; adapters: Apollo, Hunter
Called only for shortlisted people
Sending
Gmail API, gmail.send scope only
Refresh token encrypted at rest (AES-256-GCM)
App's own emails
Resend
Daily digest, intro requests, invites
Extension (M8)
Chrome Manifest V3, side panel, TypeScript
Talks only to the app's API
The app never calls a vendor directly. Each outside service has an adapter with a recorded-fixture mock, so Apollo, PDL or Hunter can be swapped without touching the engine.
Module layout
• app/ routes and UI
• lib/providers/ people, email-finder and search adapters, each with a recorded-fixture mock
• lib/engine/ profile parsing, plan generation, discovery, hook extraction, verifier, scoring, ladder
• lib/outreach/ drafting, approval queue, Gmail sender, caps and cooldowns, follow-ups
• lib/policy/ source policy, sensitive-data filters, limits
• jobs/ Inngest functions
• config/ all tunable values (section 14)
• extension/ Chrome extension (M8)
6. Data model
Postgres tables in Supabase. Every user-owned row has user_id and an RLS policy limiting access to its owner (plus group or org members where noted). Timestamps (created_at, updated_at) are on every table and omitted below.
Table
Purpose
Key fields
users
Account and settings
name, email, school, grad_year, timezone, daily_send_cap
profile_entries
The user's "entry points"
type (employer, school, program, scholarship, club, affinity_org, hometown, high_school, language, interest, volunteer, publication, other), value, aliases[], start/end, details, est_group_size, source (linkedin_pdf, linkedin_export, resume, manual), use_for_matching
voice_samples
Writing samples for drafting
text
goals
What the user wants
raw_text, industries[], roles[], locations[], year
firms
Shared firm catalog
name, domain, industry, tier, typical_application_window (estimate), provider_company_id
plans / plan_targets
Generated plan and its firms
goal_id; firm_id, tier, rationale, priority
people
Cached provider records (30-day expiry)
provider, provider_person_id, full_name, title, company, seniority, location, history (JSON), education (JSON), fetched_at, expires_at
evidence
Fetched source text
person_id, url, domain, fetched_at, extracted_text, text_hash
hooks
Verified overlaps
user_id, person_id, profile_entry_id, hook_type, quote, evidence_id, verified, identity_confirmed, rarity, strength
candidates
Scored people per plan target
plan_target_id, person_id, score, score_breakdown (JSON), ladder_role (warm_junior, second_hook, recruiter), status
outreach
One relationship thread with one person
person_id, status (see below), email, email_source, email_verified, hook_id, next_action_at
messages
Every drafted or sent email
outreach_id, kind (initial, followup, thank_you, referral_ask, intro), subject, body, approved_at, scheduled_for, sent_at, gmail_message_id, gmail_thread_id
recipient_log
Global log for cooldowns
recipient_key (SHA-256 of lowercased email), user_id, org_id, sent_at
call_notes
Prep and notes
outreach_id, scheduled_for, prep_pack (JSON), notes
oauth_tokens
Gmail send token
provider, encrypted_refresh_token, scopes
groups / group_members
Friend groups
name, owner_id; role, share_level (none, company_title, full)
pooled_connections
Uploaded LinkedIn connections
owner_user_id, full_name, company, position, connected_on
intro_requests
Warm intro asks
requester_id, connector_id, pooled_connection_id, note, status
orgs / org_members
Club mode
name; role (admin, member)
usage_ledger
Cost tracking
kind (people_search, enrich, email_lookup, web_search, llm), units, cost_usd
audit_log
Sends, approvals, deletions
actor, action, target, details
Outreach status flow: suggested → shortlisted → email_found → drafted → approved → sent → followed_up → replied → call_scheduled → call_done → thanked → referral_asked → closed. Closed carries a reason: no_reply, declined, bounced, done.
7. Matching engine
The engine casts a cheap wide net with structured data, then spends LLM and search budget only on the top candidates. A hook reaches the user only after code verifies its quote.
7.1 Profile building
• LinkedIn PDF: extract text (pdf.js or similar), then the LLM maps it to a JSON schema of entries. The user reviews every entry.
• LinkedIn data export ZIP: parse whichever CSVs are present (for example Profile, Positions, Education, Skills, Languages, Projects, Honors, Volunteering, Courses, Certifications, Connections). Tolerate missing files and renamed columns.
• Entry-point prompts (shown as a checklist): high school; pre-college or summer programs; scholarships; pipeline or diversity programs; hometown; clubs and teams; affinity organizations; languages; volunteering; research labs; causes.
• Aliases: for each entry the LLM proposes alternate names and sub-programs, and the user confirms. Example: "MIT ESP" → "MIT Educational Studies Program", "Splash", "Spark", "HSSP".
• Group size: each entry stores an estimated group size (est_group_size), with type defaults (section 7.7) the user can override ("about 40 people in my cohort").
7.2 Plan generation
• Input: goal, year, locations, profile entries.
• Firms must come from the firms catalog (seed about 150 firms across consulting, banking, biotech/pharma, investing and tech). The LLM never invents a firm. A firm the user types in is added to the catalog after a provider company lookup confirms it exists.
• Output per firm: tier (reach, target, likely), a one-line reason tied to the user's profile, the ladder (7.8), the first ask, and outreach start dates worked back from typical_application_window. Window dates are labeled "estimate" in the UI.
7.3 Candidate discovery
For each target firm, run up to three provider queries and dedupe:
1. Current company = firm AND (school in the user's schools OR past employer in the user's employers).
2. Current company = firm AND a junior title (analyst, associate, consultant, and so on) AND started within the last 3 years.
3. Current company = firm AND a recruiting title (recruiter, talent, campus).
Cap at 50 candidates per firm.
7.4 Shallow scoring
Score every candidate on structured overlaps alone (same employer, school, location, language) using the formula in 7.7. This ranks who gets a deep dive.
7.5 Deep hook search (top 15 per firm)
1. Queries: "{full name}" "{company}", plus "{full name}" "{alias}" for the user's most distinctive entries. At most 6 queries per person.
2. Fetch: top results from allowed domains only (section 11). Store extracted text in evidence.
3. Extract: the LLM returns JSON: a list of {profile_entry_id, hook_type, quote, url}. Instructions: only include a hook when the quote states this person's own involvement. Never include personal or sensitive details.
4. Verify (code, not LLM):
    1. Normalize whitespace and case, then require the quote to be an exact substring of the stored text. Otherwise drop the hook.
    2. Require the person's full name, or last name plus first initial, within 300 characters of the quote.
    3. Identity check: the page must also mention the person's company, school or city from the provider record. Otherwise set identity_confirmed = false and hide the hook by default.
5. Store verified hooks with their evidence link.
7.6 Affinity signals
Affinity matching uses only what a person states about themselves publicly: membership or roles in organizations (for example ALPFA, Prospanica, SHPE, NSBE, MLT, SEO, oSTEM), employee resource group roles, listed languages, and listed schools or countries. It never uses names, photos or guesses. It applies only to entries the user has marked use_for_matching.
7.7 Scoring
Each hook gets a strength from its type, its rarity and whether the time periods overlapped:
s_i = w_{type} \times r(N) \times o, \qquad r(N) = \min\left(1,\ \max\left(0.2,\ 1 - \frac{\log_{10} N}{5}\right)\right)
N is the group size, so a 30,000-person university scores 0.2 and a 40-person cohort scores about 0.68. The overlap factor o is 1.2 when the two people were there at the same time, otherwise 1.0.
Hook type
Weight
Default group size
Direct contact (taught, mentored or managed the user)
1.0
10
Same small program or cohort
0.8
200
Same employer
0.7
5,000
Same high school
0.7
2,000
Same affinity organization
0.6
5,000
Same hometown
0.5
50,000
Same college (+0.2 weight if same club or major)
0.4
30,000
Shared language
0.2
1,000,000
Shared interest
0.2
1,000,000
Person score combines hooks with diminishing returns, then adjusts for reply likelihood:
S = \left(1 - \prod_i (1 - s_i)\right) + a_{junior} + a_{alum} + a_{mentor} - a_{busy}
• a_junior = +0.10 if 3 or fewer years in their career.
• a_alum = +0.05 if they went to the user's school.
• a_mentor = +0.10 if a verified source shows they mentor students or offer to chat.
• a_busy = 0.20 if 3 or more app users contacted them in the last 60 days.
• Anyone under an active cooldown (8.5) is excluded.
Clamp S to 0–1. Show the breakdown in the UI. All weights live in config.
7.8 Contact ladder
For each firm, choose:
1. Warm junior: the highest score among junior candidates with at least one verified hook.
2. Second hook: the next highest, with a different hook type than rung 1.
3. Recruiter: the campus recruiter (no hook needed), contacted through official channels.
If a rung is empty, say so and suggest the manual add flow.
7.9 Email lookup
Call the EmailFinder only after the user shortlists a person. Accept only deliverable or verified results. Otherwise mark "no email found" and let the user enter one manually.
8. Outreach: drafting, sending, tracking
Drafts live in the app. The user approves each exact message, and approved messages send from the user's Gmail through a queue that enforces caps, cooldowns and send windows.
8.1 Drafting rules
• Body of 110 words or fewer; subject of 8 words or fewer.
• Structure: who I am (1 line) → the hook (1 line, from a verified hook only, phrased naturally) → why this person (1 line) → the ask (a 15–20 minute chat) → sign-off with school and LinkedIn URL.
• Exactly one ask. No referral request in a first email. No attachments.
• Banned phrases list in config (for example "I hope this email finds you well", "pick your brain", "I came across your profile").
• Match the user's voice samples. Generate two variants; the user picks and edits.
• Code checks after generation: word count, banned phrases, exactly one question mark in the ask line, and the hook sentence must reference a verified hook's entry. Fail → regenerate once, then show the draft with a warning.
8.2 Approval screen
• Each draft shows the person, the hook with its evidence link, and the editable text.
• "Approve" one at a time or "Approve all shown". Every message is still displayed in full first.
• Approved messages go into the send queue with a scheduled_for time.
8.3 Gmail sending
• Ask for gmail.send through incremental consent the first time the user sends, not at sign-up.
• Why this scope: Google rates gmail.send as sensitive, which needs verification but no security assessment. gmail.compose (saving drafts in Gmail) is restricted and triggers a paid third-party security audit (CASA, the Cloud Application Security Assessment). So drafts stay in the app.
• Send with users.messages.send (raw RFC 2822 message, From = the user). Store gmail_message_id and gmail_thread_id. Follow-ups reply in the same thread.
• During beta, keep the Google Cloud project in testing mode, which allows up to 100 named test users without verification. Before a public launch, complete Google's sensitive-scope verification (homepage, privacy policy, demo video).
8.4 Replies, follow-ups, digest
• The app cannot read the inbox, so the user marks Replied, Bounced or Declined with one click in the tracker.
• If an email is not marked replied after 7 business days, draft one follow-up (under 60 words) for approval. Maximum one follow-up per contact.
• Daily digest email (via Resend) at 8 a.m. user time lists follow-ups due, calls coming up, and thank-yous owed. Skip the digest when nothing is due.
8.5 Guardrails (server-enforced)
• Daily cap: 8 first-touch emails per user per day by default (config 1–15).
• Send window: weekdays 8 a.m.–6 p.m. in the recipient's time zone if known, otherwise the user's. Space sends at least 4 minutes apart.
• Recipient cooldown: a recipient (hashed email) who got a first-touch email from any app user in the last 14 days cannot receive another first touch. The UI suggests the next ladder candidate instead.
• Recipient fatigue: at most 2 first-touch emails per recipient from all app users in 60 days. Within a club, at most 1.
• No duplicates: one open outreach per user per recipient.
8.6 Tracker and after-call
• Table and board views by status with next action and due date.
• Prep pack (on "call scheduled"): the person's public professional background with sources, 3 recent firm news items with links, and 5 tailored questions.
• After the call: notes field; thank-you draft due within 24 hours; referral-ask draft unlocks only when status is call_done and the firm's application window starts within 30 days.
9. Friend networks and club mode
Warm intros come from friends who opt in. Nothing about a friend's network is visible beyond the share level they choose, and every intro needs the friend's approval.
9.1 Friend groups
• A user creates a group and invites friends by link.
• Each member uploads their LinkedIn Connections.csv (from their own data export) and picks a share level:
    ◦ none: used only for their own searches;
    ◦ company_title: the group sees "a connection of Maya's at Bain, Associate" without a name;
    ◦ full: the group sees the name too.
• Enforce share levels in RLS policies and database views, not only in the UI.
• Members can delete their upload at any time, and deletion removes it everywhere.
9.2 Intro requests
1. On a firm page, "Friends who know someone here" lists matches from pooled connections.
2. The requester writes a short note on why they want the intro.
3. The connector gets an in-app request and an email. They can approve or decline; declines are silent to the requester (shown as "not available").
4. On approval, the app drafts a forwardable intro email for the connector to send from their own Gmail. The template suggests asking the contact first (a double opt-in intro).
5. The resulting outreach appears in the requester's tracker as "intro pending".
9.3 Club mode
• An org admin creates the org and invites members.
• Shared at org level: a firm list, the recipient log (no member emails the same person a club-mate contacted in the last 60 days), and lower caps if the admin sets them.
• Admin dashboard shows counts only: emails sent, reply rate, calls held, by firm. It never shows message content or whom a member emailed.
10. Chrome extension (milestone 8, behind a feature flag)
The extension is a side panel that analyzes only the page the user is already viewing, and only when they click. It never browses on its own.
Behavior
1. The user opens a profile, team page or program page, then clicks "Analyze this page" in the side panel.
2. A content script reads the page's visible text once (innerText of the main content).
3. The text goes to the app's API with the user's session token. The app runs hook extraction and verification (7.5) with this text as an evidence source of type user_viewed_page, stored only for that user with a 30-day expiry.
4. The side panel shows hooks with quotes, the person's score, and buttons for "Add to tracker" and "Draft email".
The extension must not
• Navigate, scroll, click "see more", or open pages.
• Make any network request to linkedin.com.
• Modify the page's DOM (document structure).
• Run in the background or on a timer.
Risk note for the owner: LinkedIn's terms restrict tools that copy data from its pages, even when a user triggers them. Keep this milestone behind a flag, and decide before publishing to the Chrome Web Store. Everything else in the product works without it.
11. Privacy, safety and compliance
The test for any data the app touches: would this person be glad a student noticed it? Professional and public-service facts pass; personal life does not.
Source policy (enforced in lib/policy/)
• Allowed: company and firm websites, university and program pages, news articles, conference and talk pages, publications (PubMed, journal pages, Google Scholar listings), GitHub, personal professional websites.
• Blocked: linkedin.com (no fetching), facebook.com, instagram.com, tiktok.com, personal X/Twitter accounts, people-search and data-broker sites (Whitepages, Spokeo, BeenVerified, TruePeopleSearch and similar), court records, property records.
• Respect robots.txt. At most 1 request per second per domain.
Never store or show
• Home address, personal phone, family members, health, religion, politics, sexual orientation, immigration status, or personal social media.
• The extraction prompt excludes these, and a code post-filter drops hooks that contain street addresses or phone numbers.
Retention and user rights
• people and evidence rows expire after 30 days unless tied to an outreach the user started.
• Users can export their data and delete their account; deletion removes all their rows, uploads and tokens.
Google API rules
• Follow Google's API Services User Data Policy, including Limited Use: Gmail access is used only to send messages the user approved, never to train models, and no human reads it except for security or legal needs.
• Publish a privacy policy and terms page before inviting anyone beyond the test group.
Email norms
• One-to-one networking emails with the sender's real name and school, honest subject lines, no tracking pixels.
Security
• RLS on every table, with tests (section 13).
• OAuth refresh tokens encrypted at rest; encryption key only in an environment variable.
• Dependency audit in CI; no secrets in client bundles.
Abuse prevention
• Caps and cooldowns (8.5) are enforced on the server. No contact export. Admin can suspend accounts.
12. Milestones and acceptance criteria
Nine milestones, built in order. A milestone is done only when every box below it is checked and its tests pass in CI (continuous integration).
M0 — Foundation
Repo, Next.js app, Supabase project, Google sign-in (basic scopes), RLS scaffolding, config file, CI with lint, type-check and tests, preview deploys on Vercel.
[ ] A user can sign in and sees an empty dashboard.
[ ] CI is green; secrets come only from environment variables.
M1 — Profile builder
PDF and ZIP import, LLM extraction, review UI, entry-point prompts, aliases, group sizes, voice samples.
[ ] The owner's LinkedIn PDF produces his positions and education with no missing or invented entries (checked by hand).
[ ] A ZIP missing some CSVs still imports without errors.
[ ] Adding "MIT ESP" by hand yields alias suggestions including "Educational Studies Program".
M2 — Plan
Goal intake, seeded firm catalog, plan generation, plan editing.
[ ] The goal "consulting or finance, idk" returns 5–8 firms, all from the catalog, each with a reason tied to the profile.
[ ] Each firm shows its ladder rules, first ask and estimated timeline labeled "estimate".
M3 — Discovery, hooks and scoring
Provider adapters with mocks, discovery queries, shallow scoring, deep hook search, verifier, rarity scoring, ladder, people list UI with evidence links, usage ledger.
[ ] Every displayed hook has a verified quote and a working evidence link.
[ ] The golden test (section 13) passes.
[ ] Usage ledger records every paid call; the monthly budget guard stops deep dives when exceeded.
M4 — Outreach
Email lookup, drafting, approval screen, Gmail sending, send queue, tracker, follow-ups, digest, caps and cooldowns.
[ ] An approved email arrives in a test inbox from the user's Gmail.
[ ] The 9th first-touch email in a day is held until the next day.
[ ] A second test user cannot first-touch a recipient contacted 3 days earlier, and sees the next ladder candidate instead.
[ ] With a mocked clock, a follow-up draft appears after 7 business days with no reply.
M5 — Prep and after-call
[ ] A prep pack has sources for every fact and 5 questions.
[ ] The referral-ask draft stays locked until call_done and the 30-day window condition.
M6 — Friend groups and intros
[ ] Two test users in a group: share levels behave as specified, enforced by RLS tests.
[ ] The intro request flow runs end to end, and a decline is shown to the requester only as "not available".
M7 — Club mode
[ ] The club recipient log blocks a duplicate first touch within 60 days.
[ ] The admin dashboard shows counts only.
M8 — Chrome extension (flagged)
[ ] Analysis runs only on click and only on the current page.
[ ] A network log shows no requests from the extension to linkedin.com.
[ ] Hooks from the viewed page show in the side panel and can be added to the tracker.
13. Testing and evaluation
The quote verifier is the most important code in the product, so it gets the most adversarial tests. CI never calls live paid APIs; it uses recorded fixtures.
Unit tests
• Parsers: PDF text, each export CSV, missing and renamed columns.
• Scoring: rarity formula at known points (N = 30,000 gives 0.2; N = 40 gives about 0.68), combination, adjustments, clamping.
• Verifier must reject:
    ◦ a paraphrased quote;
    ◦ a real quote about a different person with the same last name;
    ◦ a quote whose name mention is more than 300 characters away;
    ◦ a page that never mentions the provider record's company, school or city (identity not confirmed).
• Caps, cooldowns, fatigue limit, send windows across time zones, business-day follow-up timing.
• Draft checks: word count, banned phrases, one ask, hook tied to a verified entry.
Integration tests
• Each provider adapter against recorded fixtures.
• End-to-end with mocks: profile → plan → discovery → draft → approve → send (Gmail mocked).
• RLS: user A cannot read user B's rows; group share levels; club dashboard counts only.
LLM evaluation set
• 20 labeled cases (profile, person, fetched pages), each with true hooks and decoys.
• Targets: 95% or higher precision of hooks shown to users, 70% or higher recall, and zero unverified hooks reaching the UI.
• Re-run on every prompt or model change; store results in evals/results/.
Golden test (manual, live APIs)
• Use the owner's real profile and a real contact known to have taught at MIT ESP, where the owner took a class. Do not mention the connection in any prompt or config.
• Pass = the engine surfaces the MIT ESP hook with a working evidence link.
Before inviting testers
• Manual QA checklist: sign-up to first sent email under 15 minutes; mobile browser layout; account deletion removes everything.
14. Configuration, costs and environment variables
All limits and weights live in config/app.ts with the defaults below. Every paid call writes to usage_ledger, and a per-user monthly budget stops deep dives when reached.
Key
Default
Notes
DAILY_SEND_CAP
8
First-touch emails per user per day (allowed 1–15)
SEND_SPACING_MINUTES
4
Minimum gap between sends
RECIPIENT_COOLDOWN_DAYS
14
Across all users
MAX_FIRST_TOUCH_PER_RECIPIENT_60D
2
Across all users; 1 within a club
FOLLOWUP_BUSINESS_DAYS
7

MAX_FOLLOWUPS
1

CANDIDATES_PER_FIRM
50
Discovery cap
DEEP_DIVE_PER_FIRM
15
Deep hook search cap
MAX_QUERIES_PER_PERSON
6
Web searches per deep dive
PEOPLE_TTL_DAYS
30
Cache expiry
DRAFT_MAX_WORDS
110
Follow-ups: 60
MONTHLY_BUDGET_USD_PER_USER
5
Budget guard
Scoring weights
Section 7.7
All weights and default group sizes
Environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, APOLLO_API_KEY, PDL_API_KEY (optional), HUNTER_API_KEY (optional), GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, TOKEN_ENCRYPTION_KEY, INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY, RESEND_API_KEY, APP_BASE_URL.
Data costs to plan for (researched November 2026; confirm before building):
• Apollo charges 1 credit per email lookup (xpay). Reports disagree on which plans include API access, so confirm with Apollo first (Cleanlist).
• People Data Labs' free tier obscures contact fields; the Pro plan has a $100/month minimum (ZoomInfo review).
• Hunter's free tier covers 25 email searches a month (StartupHub).
• Gmail scope tiers: Google's Gmail API scopes page; testing mode allows up to 100 test users (Unipile).
15. Open decisions and defaults chosen
The building AI should proceed with these defaults. The owner can change any of them; changes go in DECISIONS.md.
Decision
Default chosen
Owner to confirm
Product name
Common Thread (working name)
Final name and domain
People data provider
Apollo first, People Data Labs adapter second
Whether the Apollo plan includes API access
Beta budget
About $100/month total for data and LLM
Monthly ceiling
Who can sign up
Invite-only, up to 100 Google test users
When to apply for Google verification
Hosting
Vercel and Supabase starting tiers
Upgrade trigger
Sending accounts
Gmail and Google Workspace only
Whether Outlook is needed for school accounts
Chrome extension
Built behind a flag, not published
Whether to publish to the Chrome Web Store
Firm catalog
Seeded by hand (about 150 firms)
Which industries to cover first