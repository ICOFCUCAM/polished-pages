import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, FileText, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CV_TEMPLATES, CVTemplateCategory } from "@/types/cv";

interface CVPreviewProps {
  markdown: string;
  onBack: () => void;
  template?: string;
}

/* ─── Per-category visual themes ─── */
interface Theme {
  font: string;
  pageBg: string;
  pageText: string;
  pageBorder: string;
  h1: string;
  h2: string;
  h3: string;
  bullet: string;
  rule: string;
  layout: "single" | "two-col";
  containerMax: string;
}

const themes: Record<CVTemplateCategory, Theme> = {
  classic: {
    font: "font-serif",
    pageBg: "bg-[#fdfcf8] text-[#1a1a1a]",
    pageText: "text-[#2a2a2a]",
    pageBorder: "border-[#d4c5a0]",
    h1: "text-4xl font-bold uppercase tracking-[0.2em] text-center border-y-2 border-[#1a1a1a] py-3 mb-4",
    h2: "text-base font-bold uppercase tracking-[0.25em] mt-6 mb-2 border-b border-[#1a1a1a] pb-1",
    h3: "text-sm font-semibold italic mt-3 mb-1",
    bullet: "ml-5 list-disc marker:text-[#1a1a1a]",
    rule: "border-[#1a1a1a]",
    layout: "single",
    containerMax: "max-w-3xl",
  },
  modern: {
    font: "font-sans",
    pageBg: "bg-white text-slate-900",
    pageText: "text-slate-700",
    pageBorder: "border-slate-200",
    h1: "text-5xl font-extrabold tracking-tight mb-1 text-slate-900",
    h2: "text-sm font-bold uppercase tracking-[0.18em] mt-7 mb-3 text-blue-600",
    h3: "text-base font-semibold mt-3 mb-1 text-slate-900",
    bullet: "ml-5 list-disc marker:text-blue-500",
    rule: "border-blue-100",
    layout: "single",
    containerMax: "max-w-4xl",
  },
  creative: {
    font: "font-sans",
    pageBg: "bg-gradient-to-br from-[#fff5f0] to-[#ffe8d6] text-[#2d1810]",
    pageText: "text-[#4a2a1a]",
    pageBorder: "border-[#ff6b35]/30",
    h1: "text-5xl font-black mb-1 bg-gradient-to-r from-[#ff6b35] to-[#e84393] bg-clip-text text-transparent",
    h2: "text-lg font-bold mt-7 mb-3 text-[#ff6b35] flex items-center gap-2 before:content-[''] before:inline-block before:w-8 before:h-[3px] before:bg-[#ff6b35]",
    h3: "text-base font-bold mt-3 mb-1 text-[#e84393]",
    bullet: "ml-5 list-['▸_'] marker:text-[#ff6b35]",
    rule: "border-[#ff6b35]/40",
    layout: "two-col",
    containerMax: "max-w-4xl",
  },
  industry: {
    font: "font-sans",
    pageBg: "bg-white text-slate-900",
    pageText: "text-slate-800",
    pageBorder: "border-slate-300",
    h1: "text-3xl font-bold mb-1 text-slate-900",
    h2: "text-sm font-bold uppercase tracking-wider mt-6 mb-2 bg-slate-900 text-white px-3 py-1",
    h3: "text-sm font-semibold mt-3 mb-1 text-slate-900",
    bullet: "ml-5 list-disc marker:text-slate-600",
    rule: "border-slate-300",
    layout: "single",
    containerMax: "max-w-3xl",
  },
  academic: {
    font: "font-serif",
    pageBg: "bg-[#fbfaf6] text-[#1a1a2e]",
    pageText: "text-[#2a2a3a]",
    pageBorder: "border-[#1a1a2e]/20",
    h1: "text-3xl font-bold text-center mb-1",
    h2: "text-base font-bold mt-6 mb-2 uppercase tracking-wide border-b-2 border-[#1a1a2e] pb-1",
    h3: "text-sm font-semibold italic mt-3 mb-1",
    bullet: "ml-5 list-disc marker:text-[#1a1a2e]",
    rule: "border-[#1a1a2e]/30",
    layout: "single",
    containerMax: "max-w-3xl",
  },
  executive: {
    font: "font-serif",
    pageBg: "bg-[#0a0a0a] text-[#f5f0e0]",
    pageText: "text-[#d4cbb8]",
    pageBorder: "border-[#c9a84c]/40",
    h1: "text-4xl font-bold tracking-tight mb-1 text-[#c9a84c]",
    h2: "text-sm font-bold uppercase tracking-[0.3em] mt-7 mb-3 text-[#c9a84c] border-b border-[#c9a84c]/40 pb-1",
    h3: "text-base font-semibold mt-3 mb-1 text-[#f5f0e0]",
    bullet: "ml-5 list-disc marker:text-[#c9a84c]",
    rule: "border-[#c9a84c]/30",
    layout: "single",
    containerMax: "max-w-3xl",
  },
  minimalist: {
    font: "font-sans",
    pageBg: "bg-white text-black",
    pageText: "text-neutral-700",
    pageBorder: "border-neutral-200",
    h1: "text-2xl font-light tracking-widest uppercase mb-1",
    h2: "text-xs font-medium uppercase tracking-[0.3em] mt-8 mb-3 text-neutral-500",
    h3: "text-sm font-medium mt-3 mb-1 text-black",
    bullet: "ml-5 list-none before:content-['—_'] before:text-neutral-400",
    rule: "border-neutral-200",
    layout: "single",
    containerMax: "max-w-2xl",
  },
  regional: {
    font: "font-sans",
    pageBg: "bg-[#f8f8f8] text-[#0f1b3d]",
    pageText: "text-[#1e3a5f]",
    pageBorder: "border-[#0f1b3d]/30",
    h1: "text-3xl font-bold mb-1 text-[#0f1b3d]",
    h2: "text-sm font-bold uppercase mt-6 mb-2 text-white bg-[#0f1b3d] px-3 py-1",
    h3: "text-sm font-semibold mt-3 mb-1 text-[#0f1b3d]",
    bullet: "ml-5 list-disc marker:text-[#0f1b3d]",
    rule: "border-[#0f1b3d]/30",
    layout: "two-col",
    containerMax: "max-w-4xl",
  },
  specialty: {
    font: "font-mono",
    pageBg: "bg-[#0d1b2a] text-[#73ffb8]",
    pageText: "text-[#a0e8c5]",
    pageBorder: "border-[#2dd4a8]/40",
    h1: "text-3xl font-bold mb-1 text-[#73ffb8]",
    h2: "text-sm font-bold uppercase tracking-wider mt-6 mb-2 text-[#2dd4a8] before:content-['#_']",
    h3: "text-sm font-semibold mt-3 mb-1 text-[#73ffb8] before:content-['>_']",
    bullet: "ml-5 list-none before:content-['*_'] before:text-[#2dd4a8]",
    rule: "border-[#2dd4a8]/30",
    layout: "single",
    containerMax: "max-w-3xl",
  },
};

const CVPreview = ({ markdown, onBack, template }: CVPreviewProps) => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const templateInfo = CV_TEMPLATES.find((t) => t.id === template);
  const category: CVTemplateCategory = (templateInfo?.category as CVTemplateCategory) || "classic";
  const theme = themes[category];

  const handleDownloadMd = () => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cv.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadDocx = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-docx`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ markdown }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Export failed" }));
        throw new Error(err.error || "Export failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cv.docx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const renderMarkdown = (md: string) => {
    return md
      .replace(/^### (.+)$/gm, `<h3 class="${theme.h3}">$1</h3>`)
      .replace(/^## (.+)$/gm, `<h2 class="${theme.h2}">$1</h2>`)
      .replace(/^# (.+)$/gm, `<h1 class="${theme.h1}">$1</h1>`)
      .replace(/^---$/gm, `<hr class="my-4 ${theme.rule}" />`)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/^- (.+)$/gm, `<li class="${theme.bullet}">$1</li>`)
      .replace(/\n\n/g, '<div class="mb-3"></div>')
      .replace(/\n/g, "<br/>");
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="container flex items-center justify-between h-16 px-6">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gold" />
            <span className="text-lg font-bold font-serif tracking-tight">DocuForge</span>
          </Link>
          <div className="flex items-center gap-3">
            {templateInfo && (
              <span className="hidden md:inline text-xs text-muted-foreground font-sans">
                Template: <strong className="text-foreground">{templateInfo.name}</strong>
              </span>
            )}
            <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" /> Edit
            </Button>
            <Button variant="heroOutline" size="sm" onClick={handleDownloadMd}>
              <Download className="w-4 h-4 mr-1" /> .md
            </Button>
            <Button
              variant="hero"
              size="sm"
              onClick={handleDownloadDocx}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-1" />
              )}
              .docx
            </Button>
          </div>
        </div>
      </nav>

      <div className={`container ${theme.containerMax} mx-auto px-6 pt-28 pb-16`}>
        <div
          className={`rounded-xl border ${theme.pageBorder} ${theme.pageBg} ${theme.font} p-8 md:p-12 shadow-premium`}
        >
          <div
            className={`max-w-none ${theme.pageText} leading-relaxed ${
              theme.layout === "two-col" ? "md:columns-1" : ""
            }`}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }}
          />
        </div>
      </div>
    </div>
  );
};

export default CVPreview;
