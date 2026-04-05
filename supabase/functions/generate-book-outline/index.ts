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
    const { bookTitle, genre, targetAudience, depth, mode, existingContent } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const depthGuide = {
      short: "6 chapters, concise (1500-2000 words each)",
      standard: "8-10 chapters, thorough (2500-3500 words each)",
      detailed: "10-12 chapters, comprehensive (3500-5000 words each)",
    }[depth || "standard"];

    const modeInstructions = {
      quick: "Create a complete, publication-ready outline immediately. Make bold creative decisions.",
      guided: "Create a thorough outline with detailed chapter summaries for user review.",
      restructure: `Analyze this existing content and create an improved structure:\n\n${existingContent || ""}`,
      improve: `Review this existing content and suggest improvements:\n\n${existingContent || ""}`,
      publish: "Create a publishing-optimized outline with market positioning, keywords, and categories.",
    }[mode || "guided"];

    const systemPrompt = `You are a bestselling book strategist and publisher. You create compelling, marketable book outlines.

RESPOND ONLY WITH VALID JSON. No markdown, no explanation.

JSON structure:
{
  "title": "Marketable book title",
  "subtitle": "Compelling subtitle",
  "description": "2-3 sentence book description for marketing",
  "targetAudience": "Specific audience",
  "positioning": "What makes this book unique",
  "keywords": ["keyword1", "keyword2", ...],
  "categories": ["category1", "category2"],
  "coverDirection": {
    "style": "visual style description",
    "colors": "color palette suggestion",
    "typography": "font style suggestion"
  },
  "frontMatter": "Introduction/preface content outline",
  "backMatter": "Conclusion/author bio outline",
  "chapters": [
    {
      "title": "Chapter title",
      "summary": "2-3 sentence summary of chapter content and value",
      "keyPoints": ["point1", "point2", "point3"],
      "hook": "Opening hook concept for this chapter"
    }
  ]
}

RULES:
- Genre: ${genre || "general non-fiction"}
- Target: ${targetAudience || "general readers"}
- Depth: ${depthGuide}
- Each chapter must have a UNIQUE angle — NO repetition of themes
- Chapters must flow logically with clear progression
- Include actionable, practical content
- ${modeInstructions}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Create a ${mode || "guided"} book outline for: "${bookTitle || "Untitled Book"}"` },
        ],
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
      throw new Error("AI generation failed");
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";

    // Strip markdown code fences if present
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const outline = JSON.parse(content);

    return new Response(JSON.stringify({ outline }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-book-outline error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
