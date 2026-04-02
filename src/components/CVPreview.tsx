import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

interface CVPreviewProps {
  markdown: string;
  onBack: () => void;
}

const CVPreview = ({ markdown, onBack }: CVPreviewProps) => {
  const handleDownload = () => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cv.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Simple markdown to HTML conversion for display
  const renderMarkdown = (md: string) => {
    return md
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold font-serif mt-6 mb-2 text-gold-light">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold font-serif mt-8 mb-3 text-gradient-gold pb-1 border-b border-border">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold font-serif mb-2">$1</h1>')
      .replace(/^\*\*(.+?)\*\*/gm, "<strong>$1</strong>")
      .replace(/^\- (.+)$/gm, '<li class="ml-4 list-disc text-secondary-foreground">$1</li>')
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
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" /> Edit
            </Button>
            <Button variant="hero" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" /> Download
            </Button>
          </div>
        </div>
      </nav>

      <div className="container max-w-3xl mx-auto px-6 pt-28 pb-16">
        <div className="rounded-xl border border-border bg-card/50 backdrop-blur-sm p-8 md:p-12 shadow-premium">
          <div
            className="prose prose-invert max-w-none font-sans text-foreground leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }}
          />
        </div>
      </div>
    </div>
  );
};

export default CVPreview;
