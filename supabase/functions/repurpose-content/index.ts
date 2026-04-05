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
    const { bookContent, bookTitle, assetType } = await req.json();

    if (!bookContent?.trim()) {
      return new Response(JSON.stringify({ error: "Book content is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const assetPrompts: Record<string, string> = {
      blog_post: `Create 3 standalone blog posts (800-1200 words each) from this book content. Each should have a compelling title, SEO-friendly structure with H2/H3 headings, and a call-to-action linking back to the book. Format as markdown with clear separators between posts.`,
      social_post: `Create 10 social media posts from this book content. Include a mix of:
- 3 Twitter/X posts (under 280 chars, with hashtags)
- 3 LinkedIn posts (2-3 paragraphs, professional tone)
- 2 Instagram captions (engaging, with emoji)
- 2 Thread starters (hook + 3 key points)
Format each with the platform label.`,
      email_newsletter: `Create a 3-email sequence to promote this book:
1. Teaser email (build curiosity)
2. Value email (share key insight from the book)
3. Launch/CTA email (drive purchase)
Each should have: Subject line, Preview text, Body, CTA button text.`,
      course_outline: `Transform this book into a complete online course outline with:
- Course title and description
- 6-10 modules with lesson titles
- Learning objectives per module
- Suggested activities/exercises
- Assessment ideas`,
      video_script: `Create 5 short video scripts (3-5 min each) from key book concepts:
- Hook (first 5 seconds)
- Main content with visual cues
- Call to action
Format with [VISUAL] and [NARRATION] tags.`,
      sales_page: `Create a complete sales page for this book with:
- Headline and subheadline
- Problem/agitation/solution framework
- Key benefits (bullet points)
- Chapter previews
- Social proof placeholders
- FAQ section
- Multiple CTAs
Format as structured markdown.`,
    };

    const instruction = assetPrompts[assetType] || assetPrompts.blog_post;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert content marketer and copywriter. Create high-converting marketing assets from book content.\n\nRULES:\n- Output in clean markdown\n- Make content standalone and valuable\n- Include clear CTAs\n- Optimize for the specific platform/format\n- No meta-commentary`,
          },
          {
            role: "user",
            content: `Book: "${bookTitle}"\n\n${instruction}\n\nSource content:\n${bookContent.substring(0, 15000)}`,
          },
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
      throw new Error("Content repurposing failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    return new Response(JSON.stringify({ content, assetType }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("repurpose-content error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
