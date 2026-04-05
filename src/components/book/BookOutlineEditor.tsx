import { BookChapter, BookOutline } from "@/types/book";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Plus, Trash2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface BookOutlineEditorProps {
  outline: BookOutline;
  chapters: BookChapter[];
  setChapters: React.Dispatch<React.SetStateAction<BookChapter[]>>;
  onStartWriting: () => void;
}

const BookOutlineEditor = ({ outline, chapters, setChapters, onStartWriting }: BookOutlineEditorProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addChapter = () => {
    setChapters((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: "", summary: "", notes: "", keyPoints: [], hook: "", status: "pending" },
    ]);
  };

  const removeChapter = (id: string) => {
    if (chapters.length <= 1) return;
    setChapters((prev) => prev.filter((ch) => ch.id !== id));
  };

  const updateChapter = (id: string, field: keyof BookChapter, value: any) => {
    setChapters((prev) => prev.map((ch) => (ch.id === id ? { ...ch, [field]: value } : ch)));
  };

  return (
    <div className="space-y-6">
      {/* Book metadata summary */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <h3 className="font-serif text-lg font-bold mb-1">{outline.title}</h3>
          {outline.subtitle && <p className="text-sm text-muted-foreground italic mb-2">{outline.subtitle}</p>}
          <p className="text-sm text-foreground/80 mb-3">{outline.description}</p>
          <div className="flex flex-wrap gap-1.5">
            {outline.keywords?.slice(0, 6).map((kw, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chapter list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-serif">Chapter Outline</h2>
          <span className="text-sm text-muted-foreground">{chapters.length} chapters</span>
        </div>

        {chapters.map((ch, index) => {
          const isExpanded = expandedId === ch.id;
          return (
            <motion.div key={ch.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
              <Card className="border-border bg-card/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-secondary text-xs font-bold shrink-0">
                      {index + 1}
                    </div>
                    <Input
                      placeholder={`Chapter ${index + 1} title`}
                      value={ch.title}
                      onChange={(e) => updateChapter(ch.id, "title", e.target.value)}
                      className="flex-1 border-none bg-transparent font-medium focus-visible:ring-0 px-0"
                      maxLength={200}
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => setExpandedId(isExpanded ? null : ch.id)} className="h-7 w-7 text-muted-foreground">
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </Button>
                      {chapters.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeChapter(ch.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="pt-3 pl-10 space-y-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Summary</Label>
                            <Textarea placeholder="What this chapter covers..." value={ch.summary} onChange={(e) => updateChapter(ch.id, "summary", e.target.value)} rows={2} className="resize-none text-sm" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Opening Hook</Label>
                            <Input placeholder="Hook concept..." value={ch.hook} onChange={(e) => updateChapter(ch.id, "hook", e.target.value)} className="text-sm" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Author Notes</Label>
                            <Textarea placeholder="Specific guidance..." value={ch.notes} onChange={(e) => updateChapter(ch.id, "notes", e.target.value)} rows={2} className="resize-none text-sm" />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={addChapter} className="gap-2">
          <Plus className="w-4 h-4" /> Add Chapter
        </Button>
        <Button variant="hero" size="lg" className="flex-1 py-5" onClick={onStartWriting} disabled={!chapters.some((ch) => ch.title.trim())}>
          <Sparkles className="w-5 h-5 mr-2" /> Start Writing
        </Button>
      </div>
    </div>
  );
};

export default BookOutlineEditor;
