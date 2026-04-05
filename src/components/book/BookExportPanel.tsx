import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, FileText, BookOpen, Loader2 } from "lucide-react";
import { useState } from "react";

interface BookExportPanelProps {
  bookTitle: string;
  fullContent: string;
  chapterCount: number;
}

const BookExportPanel = ({ bookTitle, fullContent, chapterCount }: BookExportPanelProps) => {
  const [exporting, setExporting] = useState<string | null>(null);

  const wordCount = fullContent.split(/\s+/).length;

  const handleExport = async (format: "md" | "docx" | "epub") => {
    if (format === "md") {
      const blob = new Blob([fullContent], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${bookTitle || "book"}.md`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    setExporting(format);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-book`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ content: fullContent, title: bookTitle, format }),
        }
      );

      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(bookTitle || "book").replace(/[^a-zA-Z0-9]/g, "_")}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setExporting(null);
    }
  };

  const formats = [
    { id: "md" as const, label: "Markdown", desc: "Plain text, universal", icon: <FileText className="w-5 h-5" /> },
    { id: "docx" as const, label: "Word (DOCX)", desc: "Microsoft Word format", icon: <FileText className="w-5 h-5" /> },
    { id: "epub" as const, label: "EPUB", desc: "E-book readers", icon: <BookOpen className="w-5 h-5" /> },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold font-serif">Export Your Book</h2>
        <p className="text-sm text-muted-foreground">{chapterCount} chapters · {wordCount.toLocaleString()} words</p>
      </div>

      <div className="grid gap-3">
        {formats.map((f) => (
          <Card key={f.id} className="border-border bg-card/50 hover:border-primary/30 transition-colors">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-muted-foreground">{f.icon}</div>
                <div>
                  <p className="font-medium text-sm">{f.label}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleExport(f.id)} disabled={!!exporting}>
                {exporting === f.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
                Download
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BookExportPanel;
