import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles, ArrowLeft, Loader2, Download, BookOpen, Plus, Trash2, GripVertical, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface Chapter {
  id: string;
  title: string;
  summary: string;
  notes: string;
  content?: string;
  isGenerating?: boolean;
}

const BookCreator = () => {
  const { toast } = useToast();

  const [bookTitle, setBookTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [targetAudience, setTargetAudience] = useState("");

  const [chapters, setChapters] = useState<Chapter[]>([
    { id: crypto.randomUUID(), title: "", summary: "", notes: "" },
  ]);

  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);
  const [viewingChapter, setViewingChapter] = useState<number | null>(null);

  const addChapter = () => {
    setChapters((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: "", summary: "", notes: "" },
    ]);
  };

  const removeChapter = (id: string) => {
    if (chapters.length <= 1) return;
    setChapters((prev) => prev.filter((ch) => ch.id !== id));
  };

  const updateChapter = (id: string, field: keyof Chapter, value: string) => {
    setChapters((prev) =>
      prev.map((ch) => (ch.id === id ? { ...ch, [field]: value } : ch))
    );
  };

  const generateChapter = async (index: number) => {
    const ch = chapters[index];
    if (!ch.title.trim() || !bookTitle.trim()) {
      toast({ title: "Missing info", description: "Book title and chapter title are required.", variant: "destructive" });
      return;
    }

    setChapters((prev) =>
      prev.map((c, i) => (i === index ? { ...c, isGenerating: true } : c))
    );

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-book-chapter`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            bookTitle,
            genre,
            targetAudience,
            chapters: chapters.map((c) => ({ title: c.title, summary: c.summary, notes: c.notes })),
            chapterIndex: index,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Generation failed" }));
        throw new Error(err.error || "Generation failed");
      }

      const data = await response.json();
      setChapters((prev) =>
        prev.map((c, i) => (i === index ? { ...c, content: data.chapter, isGenerating: false } : c))
      );
      setViewingChapter(index);
    } catch (error) {
      setChapters((prev) =>
        prev.map((c, i) => (i === index ? { ...c, isGenerating: false } : c))
      );
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const generateAllChapters = async () => {
    for (let i = 0; i < chapters.length; i++) {
      if (!chapters[i].title.trim()) continue;
      if (chapters[i].content) continue;
      await generateChapter(i);
    }
  };

  const handleDownloadAll = () => {
    const generated = chapters.filter((ch) => ch.content);
    if (generated.length === 0) return;
    const fullBook = `# ${bookTitle}\n\n` + generated.map((ch) => ch.content).join("\n\n---\n\n");
    const blob = new Blob([fullBook], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${bookTitle || "book"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generatedCount = chapters.filter((ch) => ch.content).length;
  const hasValidChapters = chapters.some((ch) => ch.title.trim()) && bookTitle.trim();

  const renderMarkdown = (md: string) =>
    md
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold font-serif mt-6 mb-2 text-gold-light">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold font-serif mt-8 mb-3 text-gradient-gold pb-1 border-b border-border">$2</h2>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold font-serif mt-8 mb-3 text-gradient-gold pb-1 border-b border-border">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold font-serif mb-2">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-secondary-foreground">$1</li>')
      .replace(/\n\n/g, '<div class="mb-4"></div>')
      .replace(/\n/g, "<br/>");

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="container flex items-center justify-between h-16 px-6">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gold" />
            <span className="text-lg font-bold font-serif tracking-tight">DocuForge</span>
          </Link>
          <div className="flex gap-2">
            {viewingChapter !== null && (
              <Button variant="ghost" onClick={() => setViewingChapter(null)} className="text-muted-foreground">
                <ArrowLeft className="w-4 h-4 mr-2" /> Outline
              </Button>
            )}
            {generatedCount > 0 && (
              <Button variant="hero" size="sm" onClick={handleDownloadAll}>
                <Download className="w-4 h-4 mr-1" /> Download Book
              </Button>
            )}
          </div>
        </div>
      </nav>

      <div className="container max-w-4xl mx-auto px-6 pt-28 pb-16">
        <AnimatePresence mode="wait">
          {viewingChapter !== null && chapters[viewingChapter]?.content ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="rounded-xl border border-border bg-card/50 backdrop-blur-sm p-8 md:p-12 shadow-premium">
                <div
                  className="prose prose-invert max-w-none font-sans text-foreground leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(chapters[viewingChapter].content!) }}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="outline"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Header */}
              <div className="mb-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/5 px-4 py-1.5 mb-4">
                  <BookOpen className="w-4 h-4 text-gold" />
                  <span className="text-sm text-gold-light font-medium font-sans">Book Creator</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold font-serif mb-2">
                  Write Your <span className="text-gradient-gold italic">Book</span>
                </h1>
                <p className="text-muted-foreground font-sans">
                  Outline your chapters, then generate full content for each one with AI.
                </p>
              </div>

              {/* Book details */}
              <Card className="border-border bg-card/50 backdrop-blur-sm mb-6">
                <CardHeader>
                  <CardTitle className="font-serif text-xl">Book Details</CardTitle>
                  <CardDescription className="font-sans">Define the overall vision for your book</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-sans">Book Title *</Label>
                    <Input placeholder="e.g. The Art of Modern Leadership" value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} maxLength={200} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-sans">Genre / Category</Label>
                      <Input placeholder="e.g. Business, Self-Help, Fiction" value={genre} onChange={(e) => setGenre(e.target.value)} maxLength={100} />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-sans">Target Audience</Label>
                      <Input placeholder="e.g. Entrepreneurs, Young Adults" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} maxLength={100} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Chapters */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold font-serif">Chapter Outline</h2>
                  <span className="text-sm text-muted-foreground font-sans">{chapters.length} chapter{chapters.length !== 1 ? "s" : ""}</span>
                </div>

                {chapters.map((ch, index) => {
                  const isExpanded = expandedChapter === ch.id;
                  return (
                    <motion.div
                      key={ch.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                      <Card className={`border-border bg-card/50 backdrop-blur-sm transition-colors ${ch.content ? "border-gold/30" : ""}`}>
                        <CardContent className="p-4">
                          {/* Chapter header row */}
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-sm font-bold font-sans text-secondary-foreground shrink-0">
                              {index + 1}
                            </div>
                            <Input
                              placeholder={`Chapter ${index + 1} title`}
                              value={ch.title}
                              onChange={(e) => updateChapter(ch.id, "title", e.target.value)}
                              className="flex-1 border-none bg-transparent text-base font-medium focus-visible:ring-0 px-0"
                              maxLength={200}
                            />
                            <div className="flex items-center gap-1 shrink-0">
                              {ch.content && (
                                <Button variant="ghost" size="icon" onClick={() => setViewingChapter(index)} className="text-gold h-8 w-8">
                                  <FileText className="w-4 h-4" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" onClick={() => setExpandedChapter(isExpanded ? null : ch.id)} className="text-muted-foreground h-8 w-8">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </Button>
                              {chapters.length > 1 && (
                                <Button variant="ghost" size="icon" onClick={() => removeChapter(ch.id)} className="text-muted-foreground hover:text-destructive h-8 w-8">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Expanded details */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="pt-4 pl-11 space-y-4">
                                  <div className="space-y-2">
                                    <Label className="font-sans text-muted-foreground">Chapter Summary</Label>
                                    <Textarea
                                      placeholder="Brief summary of what this chapter covers..."
                                      value={ch.summary}
                                      onChange={(e) => updateChapter(ch.id, "summary", e.target.value)}
                                      rows={3}
                                      maxLength={1000}
                                      className="resize-none"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="font-sans text-muted-foreground">Author Notes</Label>
                                    <Textarea
                                      placeholder="Key points, tone guidance, specific content to include..."
                                      value={ch.notes}
                                      onChange={(e) => updateChapter(ch.id, "notes", e.target.value)}
                                      rows={2}
                                      maxLength={500}
                                      className="resize-none"
                                    />
                                  </div>
                                  <Button
                                    variant="heroOutline"
                                    size="sm"
                                    onClick={() => generateChapter(index)}
                                    disabled={ch.isGenerating || !ch.title.trim() || !bookTitle.trim()}
                                  >
                                    {ch.isGenerating ? (
                                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                                    ) : ch.content ? (
                                      <><Sparkles className="w-4 h-4 mr-2" /> Regenerate</>
                                    ) : (
                                      <><Sparkles className="w-4 h-4 mr-2" /> Generate Chapter</>
                                    )}
                                  </Button>
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

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" onClick={addChapter} className="gap-2">
                  <Plus className="w-4 h-4" /> Add Chapter
                </Button>
                <Button
                  variant="hero"
                  size="lg"
                  className="flex-1 py-6"
                  onClick={generateAllChapters}
                  disabled={!hasValidChapters || chapters.some((ch) => ch.isGenerating)}
                >
                  {chapters.some((ch) => ch.isGenerating) ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles className="w-5 h-5 mr-2" /> Generate All Chapters</>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BookCreator;
