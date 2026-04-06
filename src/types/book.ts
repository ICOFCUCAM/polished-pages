export interface BookOutline {
  title: string;
  subtitle: string;
  description: string;
  targetAudience: string;
  positioning: string;
  keywords: string[];
  categories: string[];
  coverDirection: {
    style: string;
    colors: string;
    typography: string;
  };
  frontMatter: string;
  backMatter: string;
  chapters: OutlineChapter[];
}

export interface OutlineChapter {
  title: string;
  summary: string;
  keyPoints: string[];
  hook: string;
}

export interface BookChapter {
  id: string;
  title: string;
  summary: string;
  notes: string;
  keyPoints: string[];
  hook: string;
  content?: string;
  isGenerating?: boolean;
  status: "pending" | "generating" | "complete" | "improved";
}

export type BookMode = "quick" | "guided" | "restructure" | "improve" | "publish";
export type BookDepth = "short" | "standard" | "detailed";
export type BookView = "setup" | "outline" | "writing" | "preview" | "export" | "repurpose" | "publish";

export type AssetType = "blog_post" | "social_post" | "email_newsletter" | "course_outline" | "video_script" | "sales_page";

export type ImprovementType = "enhance" | "expand" | "tighten" | "hooks" | "examples" | "consistency";
