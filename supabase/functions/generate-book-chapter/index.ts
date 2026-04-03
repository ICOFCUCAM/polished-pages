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
    const { bookTitle, genre, targetAudience, chapters, chapterIndex } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const chapter = chapters[chapterIndex];
    const outlineContext = chapters
      .map((ch: any, i: number) => `${i + 1}. ${ch.title}${ch.summary ? ` – ${ch.summary}` : ""}`)
      .join("\n");

    const systemPrompt = `You are a bestselling author and ghostwriter. Write compelling, publication-ready book chapters.

RULES:
- Write in a style appropriate for the genre: ${genre || "general non-fiction"}
- Target audience: ${targetAudience || "general readers"}
- Write the FULL chapter content (2000-3000 words minimum)
- Use vivid language, strong narrative flow, and engaging prose
- Include section breaks with ### where appropriate
- Do NOT include meta-commentary or instructions
- Start with the chapter title as a ## heading
- Make each chapter self-contained but connected to the overall narrative`;

    const userPrompt = `Book: "${bookTitle}"

Full Chapter Outline:
${outlineContext}

Now write Chapter ${chapterIndex + 1}: "${chapter.title}"
${chapter.summary ? `\nChapter brief: ${chapter.summary}` : ""}
${chapter.notes ? `\nAuthor notes: ${chapter.notes}` : ""}

Write the complete chapter now.`;

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
    const content = data.choices?.[0]?.message?.content;

    return new Response(JSON.stringify({ chapter: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-book-chapter error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
