import { AssetType } from "@/types/book";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Sparkles, FileText, MessageSquare, Mail, GraduationCap, Video, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface BookRepurposePanelProps {
  bookTitle: string;
  fullContent: string;
}

const assetTypes: { value: AssetType; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: "blog_post", label: "Blog Posts", desc: "3 SEO-optimized articles", icon: <FileText className="w-5 h-5" /> },
  { value: "social_post", label: "Social Media", desc: "10 platform-ready posts", icon: <MessageSquare className="w-5 h-5" /> },
  { value: "email_newsletter", label: "Email Sequence", desc: "3-email promotion series", icon: <Mail className="w-5 h-5" /> },
  { value: "course_outline", label: "Course Outline", desc: "Full online course structure", icon: <GraduationCap className="w-5 h-5" /> },
  { value: "video_script", label: "Video Scripts", desc: "5 short video scripts", icon: <Video className="w-5 h-5" /> },
  { value: "sales_page", label: "Sales Page", desc: "Complete book sales copy", icon: <ShoppingBag className="w-5 h-5" /> },
];

const BookRepurposePanel = ({ bookTitle, fullContent }: BookRepurposePanelProps) => {
  const { toast } = useToast();
  const [generating, setGenerating] = useState<AssetType | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});

  const handleGenerate = async (type: AssetType) => {
    setGenerating(type);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/repurpose-content`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ bookContent: fullContent, bookTitle, assetType: type }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Generation failed");
      }

      const data = await response.json();
      setResults((prev) => ({ ...prev, [type]: data.content }));
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed", variant: "destructive" });
    } finally {
      setGenerating(null);
    }
  };

  const handleDownload = (type: AssetType) => {
    const content = results[type];
    if (!content) return;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${bookTitle}_${type}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold font-serif">Content Repurposing</h2>
        <p className="text-sm text-muted-foreground">Transform your book into marketing assets</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {assetTypes.map((asset) => (
          <Card key={asset.value} className={`border-border transition-colors ${results[asset.value] ? "bg-primary/5 border-primary/20" : "bg-card/50"}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="text-muted-foreground mt-0.5">{asset.icon}</div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{asset.label}</p>
                  <p className="text-xs text-muted-foreground mb-3">{asset.desc}</p>
                  <div className="flex gap-2">
                    <Button
                      variant={results[asset.value] ? "outline" : "hero"}
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => handleGenerate(asset.value)}
                      disabled={!!generating}
                    >
                      {generating === asset.value ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3 mr-1" />
                      )}
                      {results[asset.value] ? "Regenerate" : "Generate"}
                    </Button>
                    {results[asset.value] && (
                      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => handleDownload(asset.value)}>
                        Download
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BookRepurposePanel;
