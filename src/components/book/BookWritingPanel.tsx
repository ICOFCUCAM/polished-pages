import { BookChapter, ImprovementType } from "@/types/book";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, CheckCircle2, FileText, Wand2 } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

interface BookWritingPanelProps {
  chapters: BookChapter[];
  bookTitle: string;
  onGenerateChapter: (index: number) => void;
  onGenerateAll: () => void;
  onImproveChapter: (index: number, type: ImprovementType) => void;
  onViewChapter: (index: number) => void;
  isAnyGenerating: boolean;
}

const improvementOptions: { value: ImprovementType; label: string }[] = [
  { value: "enhance", label: "Enhance Quality" },
  { value: "expand", label: "Expand Content" },
  { value: "tighten", label: "Tighten Writing" },
  { value: "hooks", label: "Better Hooks" },
  { value: "examples", label: "Add Examples" },
  { value: "consistency", label: "Fix Consistency" },
];

const BookWritingPanel = ({ chapters, bookTitle, onGenerateChapter, onGenerateAll, onImproveChapter, onViewChapter, isAnyGenerating }: BookWritingPanelProps) => {
  const [improvingIndex, setImprovingIndex] = useState<number | null>(null);
  const generated = chapters.filter((ch) => ch.content).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold font-serif">Writing Progress</h2>
          <p className="text-sm text-muted-foreground">{generated}/{chapters.length} chapters complete</p>
        </div>
        <Button variant="hero" onClick={onGenerateAll} disabled={isAnyGenerating || generated === chapters.length}>
          {isAnyGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Generate All
        </Button>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${(generated / chapters.length) * 100}%` }}
        />
      </div>

      <div className="space-y-2">
        {chapters.map((ch, index) => (
          <Card key={ch.id} className={`border-border ${ch.content ? "bg-primary/5 border-primary/20" : "bg-card/50"}`}>
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-secondary text-xs font-bold shrink-0">
                  {ch.isGenerating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  ) : ch.content ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{ch.title || `Chapter ${index + 1}`}</p>
                  <p className="text-xs text-muted-foreground">
                    {ch.isGenerating ? "Generating..." : ch.content ? `${ch.content.split(/\s+/).length} words` : "Pending"}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {ch.content && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => onViewChapter(index)} className="h-7 text-xs gap-1">
                        <FileText className="w-3 h-3" /> View
                      </Button>
                      <div className="relative group">
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setImprovingIndex(improvingIndex === index ? null : index)}>
                          <Wand2 className="w-3 h-3" /> Improve
                        </Button>
                        {improvingIndex === index && (
                          <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg p-2 z-10 w-48">
                            {improvementOptions.map((opt) => (
                              <button
                                key={opt.value}
                                className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-secondary transition-colors"
                                onClick={() => { onImproveChapter(index, opt.value); setImprovingIndex(null); }}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  {!ch.content && !ch.isGenerating && (
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => onGenerateChapter(index)} disabled={isAnyGenerating}>
                      <Sparkles className="w-3 h-3" /> Generate
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BookWritingPanel;
