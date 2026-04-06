import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const templateInstructions: Record<string, string> = {
      // Classic
      professional: "Use a classic professional format with clear section headings, traditional layout. Sections separated by horizontal rules. Focus on clarity and ATS optimization.",
      traditional: "Use a conservative, time-tested chronological format. Formal tone, serif-friendly styling, no flashy elements. Prioritize readability and tradition.",
      chronological: "Strictly reverse-chronological work history. Each role gets prominent dates. Timeline emphasis with clear career progression.",
      functional: "Skills-based format. Group experience by skill categories rather than timeline. Ideal for career changers. Lead with a strong skills matrix.",
      combination: "Hybrid format: lead with a skills summary section, then chronological work history. Balance competencies with timeline.",
      "classic-elegant": "Refined format with subtle horizontal rules between sections. Serif typography feel. Understated sophistication with traditional structure.",
      // Modern
      modern: "Use a modern format with a skills highlights section near the top, compact layout with visual emphasis on key achievements. Use bold strategically.",
      metro: "Grid-inspired clean layout. Bold uppercase section headers. Compact spacing with clear visual hierarchy. Metro/urban design aesthetic.",
      sleek: "Smooth, polished presentation. Generous padding between sections. Refined spacing. Professional yet contemporary feel.",
      startup: "Dynamic, energetic layout. Highlight impact metrics prominently. Casual-professional tone. Emphasize growth, speed, and innovation.",
      "digital-first": "Optimized for screen reading. Include hyperlinked profiles. Modern sans-serif feel. Social media and digital presence prominent.",
      "tech-modern": "Code-inspired aesthetics. Use monospace for technical skills. Include GitHub/tech profiles. Structured like clean documentation.",
      "flat-design": "Bold section colors, no shadows or gradients in description. Clean geometric elements. Strong visual hierarchy with minimal decoration.",
      // Creative
      creative: "Use a creative format with personality. Include a tagline under the name, use engaging language, and organize skills in grouped categories. Show passion and uniqueness.",
      portfolio: "Project-showcase format. Each major project gets its own mini-section with outcomes. Ideal for designers, developers, and creatives.",
      artistic: "Bold, unconventional layout. Asymmetric sections. Expressive language. Show creative thinking through format itself.",
      storyteller: "Narrative-driven format. Write career as a compelling story. First-person professional narrative with clear arc.",
      infographic: "Data-visual style. Represent skills as rated lists. Use percentage indicators in text. Timeline visualization for career.",
      magazine: "Editorial layout inspiration. Pull-quote style highlights. Column-feel structure. Feature-article tone for summary.",
      "brand-identity": "Personal branding focus. Lead with brand statement/tagline. Consistent personal brand voice throughout. Mission-driven.",
      // Industry
      engineering: "Technical engineering format. Prominent certifications and technical specs. Project-based achievements. Standards and compliance focus.",
      healthcare: "Clinical CV format. Licensure and credentials prominent. CME/CEU tracking. Patient outcome metrics. HIPAA-aware language.",
      legal: "Formal legal CV. Bar admissions, case highlights, practice areas. Conservative formatting. Jurisdictional experience clear.",
      finance: "Numbers-first format. Quantified achievements mandatory. P&L, AUM, ROI metrics prominent. Regulatory awareness shown.",
      "education-sector": "Teaching-focused format. Include coursework taught, curriculum development, student outcomes. Publication list included.",
      marketing: "Campaign and metrics focused. ROI and conversion data. Brand portfolio. Digital and traditional marketing split.",
      hospitality: "Service excellence format. Guest satisfaction metrics. Multi-property experience. Cultural awareness and languages prominent.",
      government: "Public sector compliant. GS-level or equivalent. Security clearance section. Compliance and policy focus. Formal language.",
      // Academic
      "academic-cv": "Full academic curriculum vitae. Publications, grants, conferences, teaching, service. Comprehensive multi-page format.",
      research: "Research-intensive format. Lab experience, methodologies, publications, grants, conference presentations. Impact factors noted.",
      "phd-candidate": "Dissertation-focused. Research questions, methodology, preliminary findings. Committee members. Teaching assistantship.",
      postdoc: "Post-PhD format. Research output, fellowships, lab management, mentoring. Grant writing experience. Collaboration network.",
      professor: "Senior academic format. Teaching philosophy statement. Tenure track evidence. Doctoral supervision. Editorial board memberships.",
      // Executive
      executive: "Use an executive format emphasizing leadership, strategic vision, and high-level impact. Include an Executive Profile section instead of summary. Focus on board-level language.",
      "c-suite": "Chief officer level. P&L responsibility, organizational transformation, board reporting. Strategic vision and company-wide impact.",
      "board-director": "Board governance format. Fiduciary experience, committee chairs, industry expertise. Stakeholder management.",
      "senior-manager": "Mid-to-senior management. Team size, budget authority, cross-functional leadership. Operational excellence focus.",
      consultant: "Engagement-based format. Client types, project scope, methodologies used, measurable client outcomes. Industry versatility.",
      entrepreneur: "Founder format. Ventures launched, funding raised, team built, pivots navigated. Growth metrics and exit/outcome data.",
      // Minimalist
      minimal: "Use a minimal, clean format with maximum whitespace. No decorative elements. Simple section headings. Let the content speak for itself.",
      zen: "Ultra-calm layout. Generous margins. Soft hierarchy. Breathing room between sections. Peaceful yet professional.",
      "one-page": "Strictly one page. Every word earns its place. Condensed but not cramped. Prioritized content only.",
      swiss: "International/Swiss typographic style. Grid-precise alignment. Functional typography. No ornamentation.",
      "clean-slate": "Absolute minimum styling. No borders, no rules, no icons. Pure text hierarchy through size and weight only.",
      // Regional
      europass: "EU Europass standard format. Structured sections matching Europass template. Language levels using CEFR scale.",
      "uk-standard": "British CV conventions. Personal statement, no photo, no date of birth. 'CV' not 'Resume'. UK spelling throughout.",
      nordic: "Scandinavian design principles. Clean, functional, egalitarian tone. Skills-focused. Personal number placeholder.",
      australian: "Australian format. Key selection criteria responses. Referees section. State/territory context. Achievements-focused.",
      canadian: "Canadian format. Bilingual awareness. Provincial context. Volunteer section included. Competency-based.",
      // Specialty
      "career-change": "Transferable skills prominent. Bridge language connecting old and new industries. Skills reframing. Strong summary.",
      freelancer: "Project-based format. Client roster (anonymized). Rates/billing not included. Deliverables and outcomes for each project.",
      "military-transition": "Military-to-civilian translation. Rank translated to equivalent. Leadership quantified. Security clearance. Duty stations.",
      internship: "Entry-level format. Education first. Projects, coursework, extracurriculars. Potential over experience. Eager professional tone.",
      "remote-worker": "Remote-first format. Async tools proficiency. Self-management evidence. Time-zone flexibility. Digital collaboration skills.",
      "volunteer-focused": "Community impact format. Volunteer roles treated as professional experience. Hours contributed. Social impact metrics.",
    };

    const selectedTemplate = template || "professional";
    const templateInstruction = templateInstructions[selectedTemplate] || templateInstructions["professional"];

    const systemPrompt = `You are an elite professional CV writer. Generate a polished, ATS-optimized CV in clean markdown format.

TEMPLATE STYLE: ${selectedTemplate}
${templateInstruction}

RULES:
- Use strong action verbs and quantified achievements
- Keep the Professional Summary to 3-5 impactful lines
- Format work experience with bullet points focused on results, not duties
- Include relevant keywords from the target job if provided
- Use clean markdown with ## for sections and ### for subsections
- Do NOT include any instructions or meta-commentary, ONLY the CV content
- Structure: Header → Professional Summary → Key Skills → Work Experience → Education → Certifications → Languages → References
- If references are provided, list them with full details. If none, add "References available upon request"
- If certifications are provided, include a Certifications section
- If languages are provided, include a Languages section`;

    const userPrompt = `Generate a professional CV with the following details:

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
  : "None provided — include 'References available upon request'"}

${targetJob ? `**Target Job/Role:** ${targetJob}\nOptimize the CV for this specific role.` : ""}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
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

    return new Response(JSON.stringify({ cv: cvContent }), {
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
