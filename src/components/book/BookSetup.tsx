import { BookMode, BookDepth } from "@/types/book";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, BookOpen, Wrench, TrendingUp, FileCheck } from "lucide-react";

interface BookSetupProps {
  bookTitle: string;
  setBookTitle: (v: string) => void;
  genre: string;
  setGenre: (v: string) => void;
  targetAudience: string;
  setTargetAudience: (v: string) => void;
  depth: BookDepth;
  setDepth: (v: BookDepth) => void;
  mode: BookMode;
  setMode: (v: BookMode) => void;
  existingContent: string;
  setExistingContent: (v: string) => void;
  onGenerateOutline: () => void;
  isGenerating: boolean;
}

const modes: { value: BookMode; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: "quick", label: "Quick Generate", desc: "One-click full book", icon: <Zap className="w-4 h-4" /> },
  { value: "guided", label: "Guided Creation", desc: "Step-by-step control", icon: <BookOpen className="w-4 h-4" /> },
  { value: "restructure", label: "Restructure", desc: "Reorganize existing content", icon: <Wrench className="w-4 h-4" /> },
  { value: "improve", label: "Improve", desc: "Enhance existing book", icon: <TrendingUp className="w-4 h-4" /> },
  { value: "publish", label: "Publishing Prep", desc: "Market-ready package", icon: <FileCheck className="w-4 h-4" /> },
];

const depths: { value: BookDepth; label: string; desc: string }[] = [
  { value: "short", label: "Short", desc: "6 chapters, 1500-2000 words each" },
  { value: "standard", label: "Standard", desc: "8-10 chapters, 2500-3500 words each" },
  { value: "detailed", label: "Detailed", desc: "10-12 chapters, 3500-5000 words each" },
];

const BookSetup = ({
  bookTitle, setBookTitle, genre, setGenre, targetAudience, setTargetAudience,
  depth, setDepth, mode, setMode, existingContent, setExistingContent,
  onGenerateOutline, isGenerating,
}: BookSetupProps) => {
  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <div>
        <Label className="font-sans text-sm font-medium mb-3 block">Creation Mode</Label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {modes.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className={`p-3 rounded-lg border text-left transition-all ${
                mode === m.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={mode === m.value ? "text-primary" : "text-muted-foreground"}>{m.icon}</span>
                <span className="text-xs font-semibold">{m.label}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Book Details */}
      <Card className="border-border bg-card/50">
        <CardContent className="p-5 space-y-4">
          <div className="space-y-2">
            <Label className="font-sans">Book Title *</Label>
            <Input placeholder="e.g. The Art of Modern Leadership" value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} maxLength={200} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-sans">Genre / Category</Label>
              <Input placeholder="e.g. Business, Self-Help" value={genre} onChange={(e) => setGenre(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label className="font-sans">Target Audience</Label>
              <Input placeholder="e.g. Entrepreneurs" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} maxLength={100} />
            </div>
          </div>

          {/* Depth */}
          <div>
            <Label className="font-sans text-sm mb-2 block">Book Depth</Label>
            <div className="grid grid-cols-3 gap-2">
              {depths.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDepth(d.value)}
                  className={`p-2.5 rounded-lg border text-center transition-all ${
                    depth === d.value
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <span className="text-sm font-semibold block">{d.label}</span>
                  <span className="text-[10px] text-muted-foreground">{d.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Existing content for restructure/improve modes */}
          {(mode === "restructure" || mode === "improve") && (
            <div className="space-y-2">
              <Label className="font-sans">Existing Content</Label>
              <Textarea
                placeholder="Paste your existing book content or outline here..."
                value={existingContent}
                onChange={(e) => setExistingContent(e.target.value)}
                rows={6}
                className="resize-none"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        variant="hero"
        size="lg"
        className="w-full py-6"
        onClick={onGenerateOutline}
        disabled={!bookTitle.trim() || isGenerating}
      >
        {isGenerating ? (
          <><Sparkles className="w-5 h-5 mr-2 animate-spin" /> Generating Outline...</>
        ) : (
          <><Sparkles className="w-5 h-5 mr-2" /> Generate Book Outline</>
        )}
      </Button>
    </div>
  );
};

export default BookSetup;
