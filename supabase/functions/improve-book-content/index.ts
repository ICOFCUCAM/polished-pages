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
    const { content, improvementType, bookContext } = await req.json();

    if (!content?.trim()) {
      return new Response(JSON.stringify({ error: "Content is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const improvementPrompts: Record<string, string> = {
      enhance: "Enhance the writing quality: improve prose, strengthen arguments, add vivid examples, and make the content more engaging. Keep the same structure and key points.",
      expand: "Expand this content with more detail, examples, case studies, and practical insights. Double the depth without adding fluff.",
      tighten: "Tighten this content: remove redundancy, sharpen arguments, improve clarity, and make every sentence count. Reduce length by 20-30% while keeping all key points.",
      hooks: "Rewrite chapter openings with powerful hooks. Add compelling transitions between sections. Make chapter endings memorable with clear takeaways.",
      examples: "Add real-world examples, case studies, scenarios, and practical applications throughout. Make abstract concepts concrete.",
      consistency: "Review and enforce consistency in tone, terminology, formatting, and style. Ensure professional, unified voice throughout.",
    };

    const instruction = improvementPrompts[improvementType] || improvementPrompts.enhance;

    const systemPrompt = `You are an expert book editor and writing coach. Your job is to improve existing book content.

TASK: ${instruction}

${bookContext ? `Book context: ${bookContext}` : ""}

RULES:
- Return ONLY the improved content in markdown format
- Preserve the overall structure (headings, sections)
- Do NOT add meta-commentary
- Maintain the author's voice while elevating quality
- Ensure no repetition of ideas or phrases`;

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
          { role: "user", content: content },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI improvement failed");
    }

    const data = await response.json();
    const improved = data.choices?.[0]?.message?.content;

    return new Response(JSON.stringify({ content: improved }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("improve-book-content error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
