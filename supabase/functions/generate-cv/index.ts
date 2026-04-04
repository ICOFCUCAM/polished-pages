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
      professional: "Use a classic professional format with clear section headings, traditional layout. Sections separated by horizontal rules. Focus on clarity and ATS optimization.",
      modern: "Use a modern format with a skills highlights section near the top, compact layout with visual emphasis on key achievements. Use bold strategically.",
      executive: "Use an executive format emphasizing leadership, strategic vision, and high-level impact. Include an Executive Profile section instead of summary. Focus on board-level language.",
      minimal: "Use a minimal, clean format with maximum whitespace. No decorative elements. Simple section headings. Let the content speak for itself.",
      creative: "Use a creative format with personality. Include a tagline under the name, use engaging language, and organize skills in grouped categories. Show passion and uniqueness.",
    };

    const systemPrompt = `You are an elite professional CV writer. Generate a polished, ATS-optimized CV in clean markdown format.

TEMPLATE STYLE: ${template || "professional"}
${templateInstructions[template || "professional"]}

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
