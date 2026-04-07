import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ─────────────────────────────────────────────────
   STRUCTURAL TEMPLATE DEFINITIONS
   Each template defines UNIQUE:
   - Section order
   - Layout type (single-column, two-column, etc.)
   - Content emphasis
   - Visual hierarchy rules
   ───────────────────────────────────────────────── */

interface TemplateStructure {
  layout: "single-column" | "two-column-left-sidebar" | "two-column-right-sidebar" | "top-heavy" | "modular-blocks" | "narrative";
  sectionOrder: string[];
  emphasis: string;
  instruction: string;
}

const templateStructures: Record<string, TemplateStructure> = {
  // ═══════════════════ CLASSIC ═══════════════════
  professional: {
    layout: "single-column",
    sectionOrder: ["header", "summary", "experience", "education", "skills", "certifications", "languages", "references"],
    emphasis: "balanced",
    instruction: `STRUCTURE A: Classic Single-Column Chronological
FORMAT RULES:
- Single column layout, full width
- Header: Name centered, contact info on one line below (email | phone | location | LinkedIn)
- Professional Summary: 3-5 lines, indented block paragraph
- Each section separated by a thin horizontal rule (---)
- Experience: Reverse chronological. Company name BOLD, title italic, dates right-aligned
- Bullets: 3-5 per role, start with strong action verb, include metrics
- Education: Degree — Institution — Year, single line per entry
- Skills: Comma-separated list grouped by category
- ATS-optimized: standard section names, no tables, no columns`
  },
  traditional: {
    layout: "single-column",
    sectionOrder: ["header", "objective", "experience", "education", "skills", "references"],
    emphasis: "experience-heavy",
    instruction: `STRUCTURE B: Conservative Traditional
FORMAT RULES:
- Single column, formal tone throughout
- Header: Name in large text, contact on separate lines (not inline)
- Include an "Objective" section (2 lines) instead of Summary
- Experience gets 60% of page space — detailed role descriptions
- Each role: Title first, then Company, then dates on next line
- Bullets: 4-6 per role, formal language, third person
- Education: Full institution name, degree spelled out, honors noted
- Skills section at bottom, brief
- NO links, NO social media, NO modern elements`
  },
  chronological: {
    layout: "single-column",
    sectionOrder: ["header", "summary", "experience", "projects", "education", "skills", "certifications"],
    emphasis: "timeline-focused",
    instruction: `STRUCTURE C: Timeline-Driven Chronological
FORMAT RULES:
- Single column with strong date emphasis
- Header: Name left-aligned, contact info right-aligned on same line
- Summary: Brief 2-line career trajectory statement
- Experience: DATES are prominent (bold, left side). Each role has:
  - Date range | Company | Location (on one line)
  - Title below (bold)
  - Bullets indented, focused on progression and growth
- Include a "Key Projects" subsection under relevant roles
- Education with graduation dates prominent
- Show clear career progression through dating`
  },
  functional: {
    layout: "single-column",
    sectionOrder: ["header", "summary", "core-competencies", "skills-matrix", "achievement-highlights", "work-history-brief", "education"],
    emphasis: "skills-first",
    instruction: `STRUCTURE D: Skills-Based Functional
FORMAT RULES:
- Skills-first structure — work history is minimal
- Header: Name + tagline on one line
- Summary: 3 lines focused on transferable capabilities
- "Core Competencies" section: 3 skill categories, each with 4-5 bullet achievements
  Example categories: Leadership & Strategy, Technical Expertise, Communication & Collaboration
- Each competency bullet draws from MULTIPLE roles (not tied to one job)
- "Work History" section: Minimal — just Title, Company, Dates (no bullets)
- Education at bottom
- IDEAL for career changers — skills transcend specific roles`
  },
  combination: {
    layout: "top-heavy",
    sectionOrder: ["header", "professional-profile", "key-skills", "experience", "education", "certifications"],
    emphasis: "skills-then-timeline",
    instruction: `STRUCTURE E: Hybrid Combination
FORMAT RULES:
- Top-heavy layout: skills summary takes top 30% of page
- Header: Name centered with horizontal line above and below
- "Professional Profile": 4-5 line comprehensive summary
- "Key Skills & Expertise": Organized in 3 columns (use markdown list groups)
  - Column 1: Technical skills
  - Column 2: Soft skills  
  - Column 3: Tools & certifications
- Then chronological Experience section (compact — 2-3 bullets per role)
- Education compact
- Balance between skills showcase and career timeline`
  },
  "classic-elegant": {
    layout: "single-column",
    sectionOrder: ["header", "summary", "experience", "education", "skills", "publications", "references"],
    emphasis: "typographic-refinement",
    instruction: `STRUCTURE F: Elegant Serif-Style
FORMAT RULES:
- Single column with generous spacing between sections
- Header: Full name in CAPS with thin rules above and below
- Contact: each item on its own line, centered
- Summary: Italic block paragraph, 3-4 lines
- Section headings: UPPERCASE with horizontal rule below each
- Experience: Institution-first (bold), then title (italic), dates in parentheses
- Bullets: Scholarly tone, precise language, no contractions
- Include "Selected Publications" or "Notable Achievements" if applicable
- References: Full formatted entries with relationship context
- Refined, understated, suitable for senior professionals`
  },

  // ═══════════════════ MODERN ═══════════════════
  modern: {
    layout: "two-column-left-sidebar",
    sectionOrder: ["header", "skills-sidebar", "summary", "experience", "education", "certifications"],
    emphasis: "visual-hierarchy",
    instruction: `STRUCTURE G: Modern Two-Column (ATS-safe)
FORMAT RULES:
- Two-column feel using markdown (sidebar content first, then main content)
- LEFT SIDEBAR (rendered as a top section with "---" separator):
  - Contact details (each on own line)
  - Skills grouped by category (Technical, Soft, Tools)
  - Certifications list
  - Languages with proficiency levels
- MAIN CONTENT (after separator):
  - Professional Summary: 3 lines, impactful
  - Experience: Company in bold, title below, 3 bullets each
  - Education: Compact
- One accent emphasis: use **bold** strategically for key metrics
- Clean hierarchy, plenty of whitespace`
  },
  metro: {
    layout: "modular-blocks",
    sectionOrder: ["header", "summary-block", "experience-block", "skills-block", "education-block"],
    emphasis: "grid-modular",
    instruction: `STRUCTURE H: Metro Grid Blocks
FORMAT RULES:
- Modular block layout — each section is a self-contained block
- Header: NAME in UPPERCASE BOLD, title below in regular weight
- Contact: Inline with separators (email • phone • location)
- Each section heading: ### UPPERCASE with no decorators
- Experience block: Each role is a card-like entry:
  **COMPANY NAME** — City
  *Title* | Start — End
  - Achievement 1
  - Achievement 2
- Skills block: Listed in columns using inline formatting
- Education block: Single-line entries
- NO horizontal rules — blocks separated by whitespace only
- Compact, urban, grid-inspired feel`
  },
  sleek: {
    layout: "single-column",
    sectionOrder: ["header-with-tagline", "highlights", "experience", "education", "skills", "interests"],
    emphasis: "polish-and-spacing",
    instruction: `STRUCTURE I: Sleek Polished
FORMAT RULES:
- Single column with premium spacing (extra line breaks between sections)
- Header: Name + professional tagline on same line (Name — Tagline)
- Contact on next line, compact
- "Career Highlights" section: 3-4 one-line achievement statements (no bullets, em-dash prefix)
- Experience: Generous spacing. Each role:
  Title | Company | Dates
  Short paragraph (2-3 sentences) instead of bullets
- Education: Degree, School, Year — single lines
- Skills: Inline comma-separated
- Optional "Interests" section: brief, humanizing
- Smooth, magazine-quality feel`
  },
  startup: {
    layout: "top-heavy",
    sectionOrder: ["header", "impact-metrics", "experience", "projects", "skills-tools", "education"],
    emphasis: "impact-metrics",
    instruction: `STRUCTURE J: Startup Dynamic
FORMAT RULES:
- Impact-first layout
- Header: Name in bold, current title prominent, social links included
- "Impact by Numbers" section right after header:
  Present 4-6 key metrics in a grid format:
  **$2M** Revenue Generated | **50%** Cost Reduction | **200+** Users Onboarded
- Experience: Focus on what was BUILT, SHIPPED, SCALED
  - Each role: Title at Company (Dates)
  - Bullets start with impact verbs: Launched, Scaled, Automated, Shipped
  - Include specific technologies used inline
- "Side Projects / Open Source" section
- Skills & Tools: organized by category (Languages, Frameworks, DevOps, etc.)
- Education minimal, at bottom
- Fast-paced, energetic tone`
  },
  "digital-first": {
    layout: "two-column-left-sidebar",
    sectionOrder: ["header-digital", "online-presence", "summary", "experience", "skills", "education"],
    emphasis: "digital-presence",
    instruction: `STRUCTURE K: Digital-First Online-Optimized
FORMAT RULES:
- Digital presence prominent
- Header: Name with hyperlinked profiles below (LinkedIn, GitHub, Portfolio, Twitter)
- "Digital Presence" section: List each platform with URL and brief description
- Summary: Written for screen reading — short paragraphs, not blocks
- Experience: Each role includes:
  - Company (with website)
  - Remote/Hybrid/Onsite tag
  - Digital-first achievements (online metrics, platform growth, etc.)
- Skills: Categorized as Technical, Digital Tools, Platforms
- QR code mention for print version
- Optimized for PDF viewer and online sharing`
  },
  "tech-modern": {
    layout: "two-column-right-sidebar",
    sectionOrder: ["header", "summary", "experience", "projects", "tech-stack-sidebar", "education", "certifications"],
    emphasis: "code-aesthetic",
    instruction: `STRUCTURE L: Tech-Inspired Developer CV
FORMAT RULES:
- Code documentation aesthetic
- Header formatted like a code comment:
  // Name — Title
  // email | github | location
- Summary: Brief, technical, no fluff — like a README intro
- Experience: Each role structured like a changelog:
  ## Company Name — v{startYear}.{startMonth}
  **Role:** Title
  - feat: Built microservices architecture serving 10K rps
  - fix: Reduced deployment failures by 90%
  - chore: Mentored 5 junior engineers
- "Tech Stack" section: Organized like a package.json dependencies list
  Languages: TypeScript, Python, Go
  Frameworks: React, Node.js, Django
  Infrastructure: AWS, Docker, K8s
- Projects section with GitHub-style descriptions
- Education: minimal`
  },
  "flat-design": {
    layout: "modular-blocks",
    sectionOrder: ["header", "summary", "skills-grid", "experience", "education", "awards"],
    emphasis: "geometric-clean",
    instruction: `STRUCTURE M: Flat Design Geometric
FORMAT RULES:
- Bold section headers with no decorative elements
- Header: Name in BOLD UPPERCASE, title below in lowercase
- Contact: Icon-described items (Email:, Phone:, Web:)
- Summary: Exactly 3 lines, direct statements
- Skills Grid: Present as a clean matrix:
  Category 1: Skill A, Skill B, Skill C
  Category 2: Skill D, Skill E, Skill F
- Experience: Bold company names, regular title, date range in brackets [2020-2023]
  - Bullets: Short, punchy, one line each
- Education: Clean single-line entries
- "Awards & Recognition" section if applicable
- No shadows, no gradients described — pure flat content hierarchy`
  },

  // ═══════════════════ CREATIVE ═══════════════════
  creative: {
    layout: "narrative",
    sectionOrder: ["header-creative", "tagline", "about-me", "experience", "creative-skills", "education", "passions"],
    emphasis: "personality-driven",
    instruction: `STRUCTURE N: Creative Expressive
FORMAT RULES:
- Personality-forward layout
- Header: First name only in large, full name in smaller text below
- Personal tagline: One compelling sentence (e.g., "Turning ideas into visual stories since 2015")
- "About Me" instead of Summary: Written in first person, conversational but professional
- Experience: Describe each role with a mini narrative:
  "At [Company], I [what you did] which led to [impact]"
- "Creative Arsenal" instead of Skills: Grouped into Create, Collaborate, Communicate
- Education: Include relevant workshops and self-learning
- "What Drives Me" section: 2-3 lines about creative motivation
- Unique, memorable, shows creative thinking through structure`
  },
  portfolio: {
    layout: "modular-blocks",
    sectionOrder: ["header", "summary", "featured-projects", "experience", "skills", "education", "exhibitions"],
    emphasis: "project-showcase",
    instruction: `STRUCTURE O: Portfolio Project-Showcase
FORMAT RULES:
- Projects are the centerpiece (50% of content)
- Header: Name + Creative Title (e.g., "UX Designer & Visual Storyteller")
- Brief Summary: 2 lines maximum
- "Featured Projects" section — each project as a case study mini:
  ### Project Name — Client/Company
  **Challenge:** One sentence
  **Solution:** One sentence  
  **Impact:** Metrics or outcome
  **Tools:** List of tools used
- Work Experience: Condensed, 1-2 bullets per role
- Skills: Organized by discipline (Design, Development, Strategy)
- "Exhibitions / Speaking / Publications" section at bottom
- Project-centric, not job-centric`
  },
  artistic: {
    layout: "narrative",
    sectionOrder: ["name-art", "artist-statement", "exhibitions", "experience", "education", "collections", "skills"],
    emphasis: "artistic-unconventional",
    instruction: `STRUCTURE P: Artistic Unconventional
FORMAT RULES:
- Unconventional section naming and ordering
- Name displayed as standalone element with creative formatting
- "Artist Statement" instead of summary: Written in first person, reflective tone
- "Exhibitions & Shows" before work experience
- Experience described in narrative paragraphs, not bullets
- "Collections & Publications" section
- Skills listed as "Mediums" and "Techniques"
- Education includes workshops, residencies, mentorships
- Non-traditional hierarchy — creative confidence through structure
- Feels like a gallery bio, not a corporate CV`
  },
  storyteller: {
    layout: "narrative",
    sectionOrder: ["prologue", "chapters", "skills-toolkit", "education-journey", "epilogue"],
    emphasis: "narrative-arc",
    instruction: `STRUCTURE Q: Narrative Storyteller
FORMAT RULES:
- Entire CV structured as a story
- "Prologue" instead of header/summary: Set the scene of your career in 4-5 lines
- "Chapters" instead of experience: Each role is a chapter:
  ### Chapter 3: The Leadership Years (2020-2023)
  *Setting: [Company], [Location]*
  Narrative paragraph about what you accomplished, woven with metrics
- "The Toolkit" instead of skills: What you've collected along the journey
- "The Education Journey": Describe learning as part of the narrative
- "What's Next" instead of objective: Forward-looking closing paragraph
- Professional yet compelling — career told as a story worth reading`
  },
  infographic: {
    layout: "two-column-left-sidebar",
    sectionOrder: ["header", "skill-ratings", "career-timeline", "experience", "education", "certifications"],
    emphasis: "data-visual-text",
    instruction: `STRUCTURE R: Data-Visual Infographic
FORMAT RULES:
- Data-visualization aesthetic using text
- Header: Name + title, contact compact
- "Skill Proficiency" section using text-based rating bars:
  JavaScript    ████████░░ 80%
  Python        ██████████ 100%
  Leadership    ███████░░░ 70%
- "Career Timeline" section: Year markers with one-line role descriptions
  2023 ── Senior Developer @ TechCorp
  2021 ── Developer @ StartupXYZ
  2019 ── Junior Dev @ Agency
- Detailed Experience below timeline with metrics prominently bolded
- Education with year markers
- Every section has a quantified element
- Visual through typography, not through graphics`
  },
  magazine: {
    layout: "two-column-right-sidebar",
    sectionOrder: ["header-editorial", "pull-quote", "feature-story", "sidebar-skills", "education", "interests"],
    emphasis: "editorial-magazine",
    instruction: `STRUCTURE S: Magazine Editorial
FORMAT RULES:
- Editorial spread aesthetic
- Header: Name styled as article byline
- "Pull Quote": One powerful career achievement in emphasis (like a magazine pull quote)
  > "Grew the platform from 10K to 2M users in 18 months"
- Main content reads like a feature article:
  Opening paragraph setting the career context
  Then each role described in flowing paragraphs with embedded metrics
- Sidebar content (after separator):
  - Key Competencies
  - Tools of the Trade
  - Education & Credentials
- "Beyond Work" section: Interests and community involvement
- Reads like a profile piece in a business magazine`
  },
  "brand-identity": {
    layout: "top-heavy",
    sectionOrder: ["personal-brand-header", "brand-statement", "value-proposition", "experience", "skills", "education", "testimonials"],
    emphasis: "personal-brand",
    instruction: `STRUCTURE T: Personal Brand Identity
FORMAT RULES:
- Personal branding document
- Header: Name + Brand Tagline (e.g., "Connecting People Through Technology")
- "Brand Statement": 3-4 lines defining your professional brand promise
- "Value Proposition": 3 bullet points — What I bring, How I'm different, Why it matters
- Experience: Each role framed through brand lens:
  How this role advanced your brand/expertise
- Skills: Organized as "Brand Pillars" (3 core areas of expertise)
- Education: Including personal development and brand-building activities
- "Client Testimonials" or "Endorsements" section if available
- Consistent brand voice throughout — mission-driven and authentic`
  },

  // ═══════════════════ INDUSTRY ═══════════════════
  engineering: {
    layout: "two-column-left-sidebar",
    sectionOrder: ["header", "certifications-sidebar", "summary", "technical-projects", "experience", "education", "patents"],
    emphasis: "technical-depth",
    instruction: `STRUCTURE U: Engineering Technical
FORMAT RULES:
- Technical depth and precision
- Header: Name, Title, Professional Engineer (PE) if applicable
- Sidebar section first:
  - Professional Certifications (PE, FE, PMP, etc.)
  - Software Proficiency (CAD, MATLAB, etc.)
  - Standards Knowledge (ISO, ASME, etc.)
- Summary: Technical focus, mention specialization areas
- "Technical Projects" section BEFORE experience:
  Each project: Name, Scope, Your Role, Technologies, Outcome
- Experience: Title at Company, technical achievements with specs
  - "Designed load-bearing structure rated for 50kN..."
- Education: Include relevant coursework
- "Patents & Publications" section if applicable`
  },
  healthcare: {
    layout: "single-column",
    sectionOrder: ["header", "licensure", "summary", "clinical-experience", "education", "certifications", "research", "references"],
    emphasis: "clinical-credentials",
    instruction: `STRUCTURE V: Healthcare Clinical
FORMAT RULES:
- Credentials-first format
- Header: Name, Credentials after name (e.g., "Dr. Jane Smith, MD, FACP")
- "Licensure & Credentials" section immediately after header:
  - Medical License #, State, Expiration
  - Board Certifications
  - DEA Registration
- Clinical Summary: Specialization, patient population, clinical philosophy
- "Clinical Experience": Each role includes:
  - Facility name and type (teaching hospital, private practice, etc.)
  - Patient volume metrics
  - Procedures performed with counts
  - Clinical outcomes data
- Education: Medical school, residency, fellowship (with dates and institutions)
- "Research & Publications": Include citation format
- Professional References: Required with credential verification`
  },
  legal: {
    layout: "single-column",
    sectionOrder: ["header", "bar-admissions", "summary", "experience", "notable-cases", "education", "publications", "memberships"],
    emphasis: "formal-legal",
    instruction: `STRUCTURE W: Legal Professional
FORMAT RULES:
- Formal, conservative, precise language
- Header: Full name, Esq., contact
- "Bar Admissions" immediately after header:
  - State bars with admission dates
  - Federal courts
  - Specialty certifications
- Experience: Law firm or organization name (BOLD), practice area, dates
  - Cases described by type and outcome (maintaining confidentiality)
  - Include billing hours or case volume if appropriate
- "Notable Matters" or "Representative Cases": Brief case descriptions
- Education: Law school, class rank/honors, law review, moot court
- "Publications & Speaking": Legal articles, CLE presentations
- "Professional Memberships": Bar associations, legal organizations`
  },
  finance: {
    layout: "top-heavy",
    sectionOrder: ["header", "executive-profile", "key-metrics", "experience", "education", "certifications", "technical"],
    emphasis: "metrics-driven",
    instruction: `STRUCTURE X: Finance Metrics-Driven
FORMAT RULES:
- Numbers and metrics dominate
- Header: Name, CFA/CPA/MBA designations
- Executive Profile: Focus on AUM, portfolio performance, risk management
- "Key Metrics" section (prominent, near top):
  - Assets Under Management: $XXB
  - Portfolio Returns: XX% above benchmark
  - Team Size: XX analysts
  - Cost Savings: $XXM
- Experience: Each role MUST have 3+ quantified achievements
  - Revenue, P&L, ROI, cost reduction, AUM growth
- Education: Top-tier school emphasis, GPA if strong
- "Professional Certifications": CFA, CPA, FRM, Series licenses
- "Technical Proficiencies": Bloomberg, Excel models, Python, SQL`
  },
  "education-sector": {
    layout: "single-column",
    sectionOrder: ["header", "teaching-philosophy", "teaching-experience", "curriculum", "education", "publications", "service", "references"],
    emphasis: "teaching-focused",
    instruction: `STRUCTURE Y: Education Sector Teaching
FORMAT RULES:
- Teaching-centered format
- Header: Name, degrees, current institution
- "Teaching Philosophy": 3-4 line statement on educational approach
- "Teaching Experience": Courses taught with enrollment numbers
  - Include student evaluation scores if strong
  - Curriculum innovations described
- "Curriculum Development": Programs or courses created
- Education: All degrees with dissertation/thesis titles
- "Publications & Presentations": Academic format
- "Service & Committees": Departmental and institutional service
- Professional References: Academic colleagues required`
  },
  marketing: {
    layout: "two-column-right-sidebar",
    sectionOrder: ["header", "summary", "campaign-highlights", "experience", "skills-sidebar", "education", "awards"],
    emphasis: "campaign-metrics",
    instruction: `STRUCTURE Z: Marketing Campaign-Focused
FORMAT RULES:
- Campaign results take center stage
- Header: Name + marketing specialty (e.g., "Growth Marketing Leader")
- Summary: Brand voice, market focus, core competency
- "Campaign Highlights" section (before experience):
  Each campaign: Name, Goal, Strategy, Results with metrics
  - "Holiday Campaign 2023: +45% conversion, $2M revenue"
- Experience: Marketing-specific achievements
  - ROAS, CAC, LTV, engagement rates, follower growth
- Sidebar (after separator):
  - Marketing Tools (HubSpot, GA4, Salesforce, etc.)
  - Channels (SEO, PPC, Social, Email, Content)
  - Certifications (Google, HubSpot, Meta)
- Awards & Recognition: Industry awards, case study features`
  },
  hospitality: {
    layout: "single-column",
    sectionOrder: ["header", "summary", "experience", "guest-satisfaction", "education", "certifications", "languages"],
    emphasis: "service-excellence",
    instruction: `STRUCTURE AA: Hospitality Service
FORMAT RULES:
- Service and guest satisfaction focus
- Header: Name, current title, hotel/brand affiliation
- Summary: Hospitality philosophy, service standards
- Experience: Property-focused entries
  - Property name, star rating, room count
  - Revenue metrics (RevPAR, ADR, occupancy)
  - Team size managed
  - Guest satisfaction scores
- "Guest Satisfaction & Awards" section:
  - TripAdvisor ratings, J.D. Power results
  - Service awards, employee of month/year
- Certifications: ServSafe, TIPS, brand certifications
- Languages: Critical for hospitality — include proficiency levels`
  },
  government: {
    layout: "single-column",
    sectionOrder: ["header", "clearance", "summary", "experience", "education", "certifications", "skills", "volunteer"],
    emphasis: "compliance-formal",
    instruction: `STRUCTURE AB: Government Public Sector
FORMAT RULES:
- Formal, compliance-ready format
- Header: Full legal name, contact (no social media)
- "Security Clearance" section if applicable:
  Level, granting agency, status
- Summary: Public service focus, policy expertise
- Experience: Agency/Department name, GS level or equivalent
  - Policy impact described
  - Budget authority noted
  - Staff supervised with specifics
  - Regulatory frameworks referenced
- Education: Include relevant government training (FSI, FEMA, etc.)
- "Professional Development": Government-specific courses
- "Volunteer & Community Service": Valued in government hiring`
  },

  // ═══════════════════ ACADEMIC ═══════════════════
  "academic-cv": {
    layout: "single-column",
    sectionOrder: ["header", "research-interests", "education", "appointments", "publications", "grants", "teaching", "service", "references"],
    emphasis: "comprehensive-academic",
    instruction: `STRUCTURE AC: Full Academic CV
FORMAT RULES:
- Comprehensive multi-page academic format
- Header: Name, Department, Institution, ORCID
- "Research Interests": 3-5 keyword areas
- Education: All degrees, advisors, dissertation titles
- "Academic Appointments": Chronological positions
- "Publications": Formatted in citation style
  - Peer-reviewed articles
  - Book chapters
  - Conference proceedings
- "Grants & Funding": Amount, agency, role, dates
- "Teaching": Courses with levels and evaluations
- "Service": Editorial boards, review committees, department service
- References: 3-5 academic referees with full contact`
  },
  research: {
    layout: "two-column-left-sidebar",
    sectionOrder: ["header", "methods-sidebar", "summary", "research-experience", "publications", "grants", "education", "presentations"],
    emphasis: "research-output",
    instruction: `STRUCTURE AD: Research Scientist
FORMAT RULES:
- Research output centered
- Sidebar section:
  - Research Methods (qualitative, quantitative, mixed)
  - Lab Techniques
  - Software & Statistical Tools (R, SPSS, Python)
  - Languages (for international research)
- Research Summary: Current focus, key findings, impact
- "Research Experience": Lab/institution, PI name, project descriptions
  - Include sample sizes, methodologies, key findings
- Publications: Full citation format with impact factors
- "Grants & Fellowships": Detail amount and role
- Conference Presentations: Distinguish invited vs. submitted
- Education: Include lab rotations and research training`
  },
  "phd-candidate": {
    layout: "single-column",
    sectionOrder: ["header", "dissertation", "education", "research", "teaching", "publications", "conferences", "skills", "references"],
    emphasis: "dissertation-centered",
    instruction: `STRUCTURE AE: PhD Candidate
FORMAT RULES:
- Dissertation takes center stage
- Header: Name + "PhD Candidate" + Department + University
- "Dissertation" section (prominent):
  Title: "..."
  Committee: Names and affiliations
  Abstract: 3-4 sentence summary
  Expected completion: Date
  Key findings (if available)
- Education: All degrees with GPA if strong
- Research Experience: Labs, projects, methodologies
- "Teaching Assistantships": Courses, responsibilities, evaluations
- Publications & Working Papers
- Conference Presentations
- "Technical Skills": Research-specific
- References: Committee members`
  },
  postdoc: {
    layout: "single-column",
    sectionOrder: ["header", "research-statement", "appointments", "publications", "grants", "mentoring", "teaching", "education", "service"],
    emphasis: "post-phd-trajectory",
    instruction: `STRUCTURE AF: Postdoctoral Researcher
FORMAT RULES:
- Show trajectory from PhD to independent researcher
- Header: Name, PhD, Current Lab/Institution
- "Research Statement": Future research vision (3-4 lines)
- "Postdoctoral Appointments": Lab, PI, institution, dates
  - Funded by (fellowship name)
  - Key discoveries/contributions
- Publications: Categorize first-author vs. co-author
- "Grants & Fellowships": Show funding trajectory
- "Mentoring": Students supervised, their outcomes
- Teaching: Independent lectures and guest lectures
- Education: PhD details with committee
- "Professional Service": Peer review, committee work`
  },
  professor: {
    layout: "single-column",
    sectionOrder: ["header", "teaching-philosophy", "education", "appointments", "publications", "grants", "doctoral-students", "teaching", "service", "honors"],
    emphasis: "senior-academic",
    instruction: `STRUCTURE AG: Senior Professor / Tenure Track
FORMAT RULES:
- Comprehensive senior academic format
- Header: Name, Title, Department, University, endowed chair if applicable
- "Teaching Philosophy": 4-5 line pedagogical statement
- Education: All degrees
- "Academic Appointments": Full history including visiting positions
- Publications: Extensive, categorized (books, articles, chapters, reviews)
- "Research Grants": Total funding amount highlighted
- "Doctoral Students Supervised": Names, dissertation titles, current positions
- Teaching: Full course list with enrollment data
- "University Service": Committee chairs, administrative roles
- "Honors & Awards": Named lectures, fellowships, honors`
  },

  // ═══════════════════ EXECUTIVE ═══════════════════
  executive: {
    layout: "top-heavy",
    sectionOrder: ["header", "executive-profile", "leadership-highlights", "experience", "board-memberships", "education", "speaking"],
    emphasis: "strategic-leadership",
    instruction: `STRUCTURE AH: Executive Leadership
FORMAT RULES:
- Leadership and strategic impact first
- Header: Name, Title, industry descriptor
- "Executive Profile": 5-line strategic vision statement
  - Revenue responsibility, org size, transformation scope
- "Leadership Highlights": 4-5 marquee achievements in bold:
  - "Drove $500M revenue growth through digital transformation"
  - "Led merger integration of 3,000-person organization"
- Experience: Each role focused on:
  - P&L scope
  - Organization size
  - Strategic initiatives
  - Board reporting
- "Board Memberships & Advisory Roles"
- Education: MBA or equivalent, executive education
- "Speaking & Thought Leadership": Keynotes, articles, media`
  },
  "c-suite": {
    layout: "top-heavy",
    sectionOrder: ["header", "strategic-overview", "transformation-results", "career-progression", "board-governance", "education"],
    emphasis: "ceo-cxo-level",
    instruction: `STRUCTURE AI: C-Suite Chief Officer
FORMAT RULES:
- Most senior executive format
- Header: Name, Title (CEO, CFO, CTO, etc.)
- "Strategic Overview": Company-wide vision and mandate
- "Transformation Results": Top 5 enterprise-level impacts
  Each with: Challenge → Action → Result (with $$ metrics)
- "Career Progression": Condensed, showing upward trajectory
  - Only senior roles in detail
  - Earlier career summarized in 2 lines
- "Board & Governance": Board seats, committee chairs
  - Include public company board experience
- Education: MBA, executive programs (Harvard, INSEAD, etc.)
- NO granular skills section — strategic capabilities implied`
  },
  "board-director": {
    layout: "single-column",
    sectionOrder: ["header", "director-profile", "board-experience", "committee-work", "executive-career", "education", "associations"],
    emphasis: "governance-focused",
    instruction: `STRUCTURE AJ: Board Director
FORMAT RULES:
- Governance and fiduciary focus
- Header: Name + "Board Director" designation
- "Director Profile": Governance expertise, industry sectors, board composition value
- "Board Experience": Each board listed with:
  - Company name, sector, revenue/size
  - Committee roles (Audit, Compensation, Governance, Nominating)
  - Key governance contributions
  - Term dates
- "Committee Expertise": Aggregate committee experience
- "Executive Career Summary": Condensed career that led to board service
- Education: Governance certifications (NACD, ICD.D)
- "Professional Associations": Governance organizations`
  },
  "senior-manager": {
    layout: "single-column",
    sectionOrder: ["header", "management-profile", "experience", "key-achievements", "education", "skills", "certifications"],
    emphasis: "team-leadership",
    instruction: `STRUCTURE AK: Senior Manager
FORMAT RULES:
- Team and operational leadership focus
- Header: Name, Title, functional area
- "Management Profile": Team size, budget authority, cross-functional scope
- Experience: Each role emphasizes:
  - Direct reports and team structure
  - Budget managed
  - Operational improvements with metrics
  - Cross-functional collaboration examples
- "Key Achievements": 4-5 standalone accomplishments:
  - "Built and led 25-person engineering team from scratch"
  - "Reduced operational costs by 35% ($2M annual savings)"
- Education: Management-relevant degrees and executive education
- Skills: Management and leadership focused
- Certifications: PMP, Six Sigma, Agile, etc.`
  },
  consultant: {
    layout: "two-column-right-sidebar",
    sectionOrder: ["header", "consulting-profile", "selected-engagements", "experience", "industry-expertise-sidebar", "education", "publications"],
    emphasis: "engagement-based",
    instruction: `STRUCTURE AL: Management Consultant
FORMAT RULES:
- Engagement/project based format
- Header: Name + Consulting specialty
- "Consulting Profile": Methodology expertise, client types, impact areas
- "Selected Engagements" (centerpiece):
  Each engagement:
  **Industry — Client Type** (anonymized)
  Challenge: Brief problem statement
  Approach: Methodology used
  Impact: Quantified results
- Employment History: Firm names and progression
- Sidebar (after separator):
  - Industry Expertise (sectors)
  - Methodologies (Agile, Lean, Design Thinking)
  - Tools (Excel, Tableau, PowerBI)
- Publications & Speaking: Thought leadership
- Education: MBA and consulting certifications`
  },
  entrepreneur: {
    layout: "modular-blocks",
    sectionOrder: ["header", "founder-statement", "ventures", "advisory-roles", "skills", "education", "press"],
    emphasis: "venture-building",
    instruction: `STRUCTURE AM: Entrepreneur / Founder
FORMAT RULES:
- Venture-building narrative
- Header: Name + "Founder & [Primary Identity]"
- "Founder Statement": Vision, mission, what drives you
- "Ventures" section (main content):
  Each venture as a mini case study:
  ### Company Name (Year–Year) — Status: [Active/Acquired/Closed]
  **Pitch:** One-line description
  **Role:** Founder & CEO
  **Raised:** $X funding
  **Grew to:** X employees, $X revenue
  **Key Achievement:** Biggest impact
  **Exit:** If applicable
- "Advisory & Board Roles": Startups you advise
- "Entrepreneurial Skills": Fundraising, product-market fit, team building
- Press & Media mentions
- Education: Brief`
  },

  // ═══════════════════ MINIMALIST ═══════════════════
  minimal: {
    layout: "single-column",
    sectionOrder: ["name", "contact-line", "experience", "education", "skills"],
    emphasis: "zero-decoration",
    instruction: `STRUCTURE AN: Ultra-Minimal
FORMAT RULES:
- Absolute minimum structure — content only
- Name only (no title, no tagline)
- Contact: Single line (email | phone | city)
- NO summary section
- NO section headings with decorators — just the heading word
- Experience: Company, Title, Dates — then 2 bullets max per role
- Education: One line per entry
- Skills: Single comma-separated line
- NO certifications section unless critical
- NO references section
- NO horizontal rules, NO bold section headings
- Maximum whitespace, minimum ink
- Everything earns its place — if it doesn't add value, remove it`
  },
  zen: {
    layout: "single-column",
    sectionOrder: ["name", "summary", "experience", "education", "skills", "languages"],
    emphasis: "calm-spacious",
    instruction: `STRUCTURE AO: Zen Spacious
FORMAT RULES:
- Calm, breathing layout
- Name centered, no other header elements initially
- Contact details at the BOTTOM of the CV (reverse of convention)
- Summary: Brief, peaceful, confident tone
- Extra blank line between EVERY section
- Extra blank line between EVERY role in experience
- Experience: Title and company on separate lines
  - 2-3 gentle bullets, achievement-focused but not aggressive
  - Soft language: "Contributed to" → "Guided" → "Cultivated"
- Education and Skills: Minimal, spacious
- Languages: Include proficiency in gentle terms
- Overall feel: Confidence through calm, not through volume`
  },
  "one-page": {
    layout: "two-column-left-sidebar",
    sectionOrder: ["header-compact", "skills-sidebar-compact", "summary-one-line", "experience-condensed", "education-compact"],
    emphasis: "density-optimized",
    instruction: `STRUCTURE AP: Strict One-Page
FORMAT RULES:
- EVERYTHING must fit one page — brevity is mandatory
- Header: Name + Title on one line, contact on next line
- Sidebar section (compact):
  - Skills: Bullet list, no descriptions
  - Certifications: Name only, no dates
  - Languages: Language (level)
- Summary: ONE sentence
- Experience: Maximum 3 roles, 2 bullets each
  - Each bullet: Under 15 words
  - Dates abbreviated (Jan 2020 – Dec 2022)
- Education: Degree — School — Year (one line per entry)
- NO references, NO interests, NO extra sections
- Every single word must be necessary
- If content is too long: cut oldest roles, compress bullets`
  },
  swiss: {
    layout: "modular-blocks",
    sectionOrder: ["header-grid", "summary", "experience", "education", "skills", "references"],
    emphasis: "grid-precision",
    instruction: `STRUCTURE AQ: Swiss International Typographic
FORMAT RULES:
- Grid-perfect alignment
- Header: Name flush left, contact flush right (grid alignment)
- All content aligned to an invisible grid
- Section headings: Consistent size, flush left, followed by content indented
- Experience: Each entry:
  DATES          COMPANY          LOCATION
  TITLE
  - Achievement 1
  - Achievement 2
  (Tabular alignment of metadata)
- Education: Same grid alignment as experience
- Skills: Organized in clean columns
- References: Formatted identically
- Purely functional aesthetic — beauty through precision
- No decorative elements whatsoever`
  },
  "clean-slate": {
    layout: "single-column",
    sectionOrder: ["name", "contact", "experience", "education", "skills"],
    emphasis: "pure-hierarchy",
    instruction: `STRUCTURE AR: Clean Slate Pure
FORMAT RULES:
- Hierarchy ONLY through text size/weight — no other visual elements
- Name: Largest text
- Section headings: Medium text, NO borders, NO rules, NO separators
- Body text: Regular weight
- NO bold within body text (except company names)
- NO italic
- NO bullet points — use short paragraphs instead
- Experience: Company on its own line, title on next, dates on next
  Short paragraph (2-3 sentences) per role
- Education: Same paragraph format
- Skills: Flowing sentence: "Proficient in X, Y, and Z with expertise in A and B"
- Pure typography — like a well-set book page`
  },

  // ═══════════════════ REGIONAL ═══════════════════
  europass: {
    layout: "two-column-left-sidebar",
    sectionOrder: ["header", "personal-info-detailed", "work-experience", "education-training", "language-passport", "digital-skills", "additional-info"],
    emphasis: "eu-standard",
    instruction: `STRUCTURE AS: Europass EU Standard
FORMAT RULES:
- EU Europass standard format compliance
- Header: Full name, photo placeholder note
- "Personal Information": Detailed block:
  - Full address, Nationality, Date of birth (EU style: DD/MM/YYYY)
  - Gender (optional)
  - Contact (email, phone, social media)
- "Work Experience": EU format:
  Dates (DD/MM/YYYY format)
  Position, Employer, City, Country
  Description of duties and responsibilities
- "Education and Training": Same date format
  Qualification, institution, EQF level if applicable
- "Language Passport": Self-assessment grid (CEFR levels):
  Language | Understanding | Speaking | Writing
  English  | C1           | B2      | C1
- "Digital Skills": Self-assessment
- "Additional Information": Hobbies, volunteering, etc.`
  },
  "uk-standard": {
    layout: "single-column",
    sectionOrder: ["header", "personal-statement", "key-skills", "employment-history", "education-qualifications", "additional-info", "references"],
    emphasis: "british-conventions",
    instruction: `STRUCTURE AT: UK Standard CV
FORMAT RULES:
- British CV conventions strictly followed
- Header: Full name (no title), contact (no photo, no DOB, no nationality)
- "Personal Statement": 4-6 lines, third person or first person
  Must answer: Who you are, what you offer, what you're looking for
- "Key Skills": 6-8 bullet points of core competencies
- "Employment History": Most recent first
  Job Title — Employer — Dates
  Key responsibilities and achievements (3-4 bullets)
- "Education & Qualifications":
  - University degrees
  - A-Levels/GCSEs if recent graduate
  - Professional qualifications
- "Additional Information": IT skills, languages, interests
- "References": Two references or "Available upon request"
- UK spelling throughout (organisation, programme, centre)`
  },
  nordic: {
    layout: "single-column",
    sectionOrder: ["header", "profile", "competencies", "experience", "education", "languages", "personal"],
    emphasis: "scandinavian-clean",
    instruction: `STRUCTURE AU: Nordic Scandinavian
FORMAT RULES:
- Scandinavian design principles
- Header: Name, Personal number placeholder (YYYYMMDD-XXXX)
- Contact: Address, email, phone
- "Profile": 3-line egalitarian tone (no self-aggrandizing language)
  Collaborative, team-focused framing
- "Core Competencies": Skills framed as team contributions
- Experience: Company and role with flat hierarchy language
  - "Collaborated with team to..."
  - "Contributed to project that..."
  - No individualistic hero language
- Education: Include folkhögskola, YH if applicable
- Languages: Critical in Nordics — include Nordic languages
- "Personal": Brief personal interests (common in Nordic CVs)
- Clean, functional, democratic tone`
  },
  australian: {
    layout: "single-column",
    sectionOrder: ["header", "career-objective", "key-selection-criteria", "employment-history", "education", "skills", "referees"],
    emphasis: "selection-criteria",
    instruction: `STRUCTURE AV: Australian Format
FORMAT RULES:
- Australian government/corporate format
- Header: Full name, contact (including suburb and state)
- "Career Objective": Brief goal statement
- "Key Selection Criteria" (CRITICAL for Australian public sector):
  Each criterion addressed individually:
  **Criterion 1:** [Statement from job ad]
  Response: STAR format (Situation, Task, Action, Result)
  **Criterion 2:** [Next criterion]
  Response: STAR format
- "Employment History": Position, Organisation, City/State
  - Key achievements with Australian context
- Education: Include TAFE qualifications
- Skills: Include RSA, WWC, First Aid if applicable
- "Referees": Full contact details for 2-3 referees (not "upon request")
  Name, Position, Organisation, Phone, Email, Relationship`
  },
  canadian: {
    layout: "single-column",
    sectionOrder: ["header", "summary", "competencies", "experience", "education", "certifications", "volunteer", "languages"],
    emphasis: "bilingual-competency",
    instruction: `STRUCTURE AW: Canadian Format
FORMAT RULES:
- Canadian conventions and bilingual awareness
- Header: Name, City, Province (e.g., Toronto, ON)
- Summary: Bilingual mention if applicable
- "Core Competencies": Skills matrix with bilingual categories if relevant
- Experience: Company, City, Province format
  - Canadian metrics (CAD, Canadian regulations)
  - Provincial context where relevant
- Education: Canadian institutions with provincial context
  - Include Red Seal, provincial certifications
- "Professional Certifications": Canadian equivalencies noted
- "Volunteer Experience": Valued in Canadian hiring
- "Languages": English, French, others
  - Proficiency levels (Government of Canada scale if applicable)
  - Bilingual Bonus noted if relevant`
  },

  // ═══════════════════ SPECIALTY ═══════════════════
  "career-change": {
    layout: "top-heavy",
    sectionOrder: ["header", "career-transition-summary", "transferable-skills", "relevant-experience", "additional-experience", "education", "certifications"],
    emphasis: "bridge-skills",
    instruction: `STRUCTURE AX: Career Change Bridge
FORMAT RULES:
- Skills bridge between old and new career
- Header: Name + Target role (not current role)
- "Career Transition Summary": 4-5 lines explicitly stating the change
  "Transitioning from [old field] to [new field], bringing [transferable value]"
- "Transferable Skills": Top section, organized by relevance to new career
  Each skill with example from old career applied to new context
- "Relevant Experience": Reframe old roles through new career lens
  - Highlight only transferable achievements
  - Use new industry language
- "Additional Experience": Brief list of other roles
- Education: Include any retraining, bootcamps, courses for new career
- New certifications prominent`
  },
  freelancer: {
    layout: "modular-blocks",
    sectionOrder: ["header", "services", "selected-clients", "project-portfolio", "testimonials", "skills", "education"],
    emphasis: "client-project",
    instruction: `STRUCTURE AY: Freelancer / Independent
FORMAT RULES:
- Client-and-project based, not employer-based
- Header: Name + "Independent [Specialty]"
- "Services Offered": Bulleted list of service offerings
- "Selected Clients": Industry categories with anonymized client descriptions
  "Fortune 500 Technology Company" — "Series B Healthcare Startup"
- "Project Portfolio": Each project:
  ### Project Title — Client Industry
  **Scope:** What was needed
  **Deliverables:** What you provided
  **Outcome:** Measurable results
  **Duration:** Timeline
- "Client Testimonials": 1-2 brief quotes if available
- Skills & Tools: Organized by service type
- Education: Brief, supplemented with relevant courses`
  },
  "military-transition": {
    layout: "single-column",
    sectionOrder: ["header", "clearance", "transition-summary", "leadership-experience", "technical-skills", "education-training", "awards", "references"],
    emphasis: "civilian-translation",
    instruction: `STRUCTURE AZ: Military to Civilian
FORMAT RULES:
- Military experience translated to civilian language
- Header: Name (no rank), target civilian title
- "Security Clearance": Level, status, investigation date
- "Transition Summary": Bridge military to civilian value
  "XX years of military leadership translated to [civilian field]"
- "Leadership & Management Experience":
  DO translate: "Platoon Leader" → "Team Manager (40 direct reports)"
  DO translate: "Company Commander" → "Operations Director (200+ personnel)"
  DO translate: "S3 Operations" → "Chief Operations Officer"
  - Include budget equivalents
  - Quantify everything in civilian terms
- "Technical Skills": Civilian equivalents of military training
- "Education & Training": Military schools translated
  "Command and General Staff College" → "Advanced Leadership & Strategic Management Program"
- "Awards & Decorations": Translated to civilian context
- References: Mix of military and civilian`
  },
  internship: {
    layout: "single-column",
    sectionOrder: ["header", "objective", "education", "projects", "skills", "experience", "activities", "references"],
    emphasis: "potential-over-experience",
    instruction: `STRUCTURE BA: Entry-Level / Internship
FORMAT RULES:
- Education and potential first, experience minimal
- Header: Name + "Aspiring [Target Role]" or degree in progress
- "Career Objective": 2-3 lines, enthusiastic but professional
- Education: FIRST and detailed
  - University, degree, expected graduation, GPA (if 3.0+)
  - Relevant coursework listed
  - Dean's list, scholarships, honors
- "Academic & Personal Projects": Each project detailed:
  - Project name, course/context
  - Technologies used
  - Your contribution
  - Outcome or grade
- Skills: Technical and soft skills prominent
- Experience: Internships, part-time, volunteer (even if unrelated)
  - Focus on transferable skills learned
- "Activities & Leadership": Clubs, organizations, competitions
- References: Professors and internship supervisors`
  },
  "remote-worker": {
    layout: "two-column-left-sidebar",
    sectionOrder: ["header", "remote-tools-sidebar", "summary", "remote-experience", "collaboration-highlights", "education", "certifications"],
    emphasis: "remote-first",
    instruction: `STRUCTURE BB: Remote Work Specialist
FORMAT RULES:
- Remote work capabilities prominent
- Header: Name + "Remote [Title]" + timezone/location
- Sidebar section:
  - "Remote Collaboration Tools": Slack, Zoom, Notion, Asana, Jira, etc.
  - "Async Communication": Documentation, Loom, written updates
  - "Time Zones": Flexibility and overlap experience
  - Languages (for global teams)
- Summary: Remote-first experience emphasis
- Experience: Each role includes:
  - Remote/Hybrid/Distributed tag
  - Team distribution (e.g., "12-person team across 5 time zones")
  - Async achievements
  - Self-management evidence
- "Remote Collaboration Highlights":
  - Cross-timezone project delivery
  - Remote culture contributions
  - Digital-first documentation practices
- Certifications: Remote work specific (if any)`
  },
  "volunteer-focused": {
    layout: "single-column",
    sectionOrder: ["header", "mission-statement", "volunteer-experience", "impact-metrics", "professional-experience", "education", "skills"],
    emphasis: "social-impact",
    instruction: `STRUCTURE BC: Volunteer & Social Impact
FORMAT RULES:
- Volunteer and community impact as primary experience
- Header: Name + social impact focus area
- "Mission Statement": Personal commitment to community/cause
- "Volunteer Experience" (BEFORE professional):
  Each role treated as professional experience:
  Organization, Role, Dates
  - Impact metrics (people served, funds raised, programs launched)
  - Leadership responsibilities
  - Outcomes achieved
- "Community Impact Summary": Aggregate metrics
  - Total volunteer hours
  - People impacted
  - Funds raised or managed
  - Programs created
- Professional Experience: Supporting, condensed
- Education: Include service-learning, community development courses
- Skills: Include community organizing, grant writing, event planning`
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Handle CV text parsing (upload feature)
    if (body.action === "parse") {
      const cvText = body.cvText;
      if (!cvText || typeof cvText !== "string" || cvText.length > 50000) {
        return new Response(JSON.stringify({ error: "Invalid CV text" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const parseResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: `You are a CV parser. Extract structured data from the provided CV text and return ONLY valid JSON with this exact structure:
{
  "personalInfo": { "fullName": "", "email": "", "phone": "", "location": "", "linkedin": "", "website": "", "summary": "" },
  "experiences": [{ "title": "", "company": "", "startDate": "", "endDate": "", "description": "" }],
  "education": [{ "degree": "", "field": "", "institution": "", "year": "" }],
  "skills": "comma,separated,skills",
  "certifications": "comma,separated,certs",
  "languages": "English (Native), etc",
  "references": [{ "name": "", "title": "", "company": "", "email": "", "phone": "", "relationship": "" }]
}
Leave empty strings for missing fields. Return ONLY JSON, no markdown.` },
            { role: "user", content: cvText },
          ],
          stream: false,
        }),
      });

      if (!parseResponse.ok) throw new Error("AI parsing failed");
      const parseData = await parseResponse.json();
      let parsed;
      try {
        let content = parseData.choices?.[0]?.message?.content || "{}";
        content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        parsed = JSON.parse(content);
      } catch {
        throw new Error("Failed to parse CV structure");
      }

      return new Response(JSON.stringify({ parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle CV generation
    const { personalInfo, experiences, education, skills, certifications, languages, references, targetJob, template } = body;

    const selectedTemplate = template || "professional";
    const structure = templateStructures[selectedTemplate] || templateStructures["professional"];

    const systemPrompt = `You are an elite professional CV writer specializing in ATS-optimized, recruiter-approved resumes.

TEMPLATE: ${selectedTemplate}
LAYOUT TYPE: ${structure.layout}
CONTENT EMPHASIS: ${structure.emphasis}
SECTION ORDER: ${structure.sectionOrder.join(" → ")}

${structure.instruction}

UNIVERSAL RULES:
1. Follow the EXACT section order specified above — do NOT rearrange sections
2. Use the SPECIFIC section names from the template instructions — do NOT substitute generic names
3. Use strong action verbs and quantified achievements (numbers, percentages, dollar amounts)
4. ATS Compatibility: Use standard parseable text, no tables, no images, no complex formatting
5. Every bullet point must demonstrate IMPACT, not just duties
6. Format in clean markdown: ## for sections, ### for subsections, **bold** for emphasis
7. Output ONLY the CV content — no instructions, no meta-commentary, no explanations
8. If references are provided, include them. If none, add "References available upon request" ONLY if the template includes a references section
9. Adapt content length: compress if too long, expand with relevant detail if thin
10. The CV must feel like it was crafted by a premium resume service, not auto-generated

ANTI-DUPLICATION: This template (${selectedTemplate}) uses a "${structure.layout}" layout with "${structure.emphasis}" emphasis. The structure MUST be visually and organizationally distinct from all other templates.`;

    const userPrompt = `Generate a professional CV using the ${selectedTemplate} template with the following details:

**Personal Information:**
Name: ${personalInfo.fullName}
Email: ${personalInfo.email}
Phone: ${personalInfo.phone || "Not provided"}
Location: ${personalInfo.location || "Not provided"}
LinkedIn: ${personalInfo.linkedin || "Not provided"}
Website: ${personalInfo.website || "Not provided"}

**Professional Summary provided by candidate:**
${personalInfo.summary || "Generate based on experience below"}

**Work Experience:**
${(experiences || []).map((exp: any, i: number) => `
${i + 1}. ${exp.title} at ${exp.company} (${exp.startDate} - ${exp.endDate || "Present"})
   ${exp.description}
`).join("")}

**Education:**
${(education || []).map((edu: any) => `- ${edu.degree} in ${edu.field} from ${edu.institution} (${edu.year})`).join("\n")}

**Skills:** ${(skills || []).join(", ")}

**Certifications:** ${(certifications || []).join(", ") || "None provided"}

**Languages:** ${(languages || []).join(", ") || "None provided"}

**References:**
${(references || []).length > 0
  ? references.map((ref: any) => `- ${ref.name}, ${ref.title} at ${ref.company} (${ref.relationship}) — ${ref.email} / ${ref.phone}`).join("\n")
  : "None provided — include 'References available upon request' if template requires it"}

${targetJob ? `**Target Job/Role:** ${targetJob}\nOptimize the CV for this specific role with relevant keywords and tailored content.` : ""}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI generation failed");
    }

    const data = await response.json();
    const cvContent = data.choices?.[0]?.message?.content;

    return new Response(JSON.stringify({ cv: cvContent, template: selectedTemplate, layout: structure.layout }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-cv error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
