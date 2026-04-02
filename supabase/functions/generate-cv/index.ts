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
    const { personalInfo, experiences, education, skills, targetJob } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an elite professional CV writer. Generate a polished, ATS-optimized CV in clean markdown format.

RULES:
- Use strong action verbs and quantified achievements
- Keep the Professional Summary to 3-4 impactful lines
- Format work experience with bullet points focused on results, not duties
- Include relevant keywords from the target job if provided
- Use clean markdown with ## for sections
- Do NOT include any instructions or meta-commentary, ONLY the CV content
- Structure: Header → Professional Summary → Key Skills → Work Experience → Education → Additional sections`;

    const userPrompt = `Generate a professional CV with the following details:

**Personal Information:**
Name: ${personalInfo.fullName}
Email: ${personalInfo.email}
Phone: ${personalInfo.phone || "Not provided"}
Location: ${personalInfo.location || "Not provided"}
LinkedIn: ${personalInfo.linkedin || "Not provided"}

**Work Experience:**
${experiences.map((exp: any, i: number) => `
${i + 1}. ${exp.title} at ${exp.company} (${exp.startDate} - ${exp.endDate || "Present"})
   ${exp.description}
`).join("")}

**Education:**
${education.map((edu: any) => `- ${edu.degree} in ${edu.field} from ${edu.institution} (${edu.year})`).join("\n")}

**Skills:** ${skills.join(", ")}

${targetJob ? `**Target Job/Role:** ${targetJob}\nOptimize the CV for this specific role.` : ""}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
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
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
