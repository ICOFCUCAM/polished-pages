import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowLeft, BookOpen, PenTool, Download, Repeat, Eye, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { BookChapter, BookOutline, BookMode, BookDepth, BookView, ImprovementType } from "@/types/book";
import BookSetup from "@/components/book/BookSetup";
import BookOutlineEditor from "@/components/book/BookOutlineEditor";
import BookWritingPanel from "@/components/book/BookWritingPanel";
import BookContentViewer from "@/components/book/BookContentViewer";
import BookExportPanel from "@/components/book/BookExportPanel";
import BookRepurposePanel from "@/components/book/BookRepurposePanel";
import BookPublishingPackage from "@/components/book/BookPublishingPackage";

const BookCreator = () => {
  const { toast } = useToast();

  // Book metadata
  const [bookTitle, setBookTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [depth, setDepth] = useState<BookDepth>("standard");
  const [mode, setMode] = useState<BookMode>("guided");
  const [existingContent, setExistingContent] = useState("");

  // State
  const [view, setView] = useState<BookView>("setup");
  const [outline, setOutline] = useState<BookOutline | null>(null);
  const [chapters, setChapters] = useState<BookChapter[]>([]);
  const [viewingChapter, setViewingChapter] = useState<number | null>(null);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);

  const generatedChapters = chapters.filter((ch) => ch.content);
  const fullContent = generatedChapters.length > 0
    ? `# ${outline?.title || bookTitle}\n\n${outline?.subtitle ? `*${outline.subtitle}*\n\n` : ""}${outline?.frontMatter ? `---\n\n${outline.frontMatter}\n\n---\n\n` : ""}${generatedChapters.map((ch) => ch.content).join("\n\n---\n\n")}${outline?.backMatter ? `\n\n---\n\n${outline.backMatter}` : ""}`
    : "";

  // Generate outline
  const handleGenerateOutline = async () => {
    if (!bookTitle.trim()) return;
    setIsGeneratingOutline(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-book-outline`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ bookTitle, genre, targetAudience, depth, mode, existingContent }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Outline generation failed");
      }

      const data = await response.json();
      const ol: BookOutline = data.outline;
      setOutline(ol);
      setBookTitle(ol.title || bookTitle);

      const newChapters: BookChapter[] = ol.chapters.map((ch, i) => ({
        id: crypto.randomUUID(),
        title: ch.title,
        summary: ch.summary,
        notes: "",
        keyPoints: ch.keyPoints || [],
        hook: ch.hook || "",
        status: "pending" as const,
      }));
      setChapters(newChapters);

      if (mode === "quick") {
        setView("writing");
        // Auto-generate all chapters in quick mode
        setTimeout(() => handleGenerateAll(newChapters), 100);
      } else {
        setView("outline");
      }
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed", variant: "destructive" });
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  // Generate single chapter
  const handleGenerateChapter = async (index: number, chaptersRef?: BookChapter[]) => {
    const currentChapters = chaptersRef || chapters;
    const ch = currentChapters[index];
    if (!ch?.title.trim()) return;

    setChapters((prev) => prev.map((c, i) => (i === index ? { ...c, isGenerating: true, status: "generating" } : c)));

    try {
      // Collect previous chapter summaries for anti-repetition
      const previousChapters = currentChapters.slice(0, index).filter((c) => c.content).map((c) => c.content!.substring(0, 600));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-book-chapter`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            bookTitle: outline?.title || bookTitle,
            genre,
            targetAudience,
            chapters: currentChapters.map((c) => ({ title: c.title, summary: c.summary, notes: c.notes, keyPoints: c.keyPoints, hook: c.hook })),
            chapterIndex: index,
            depth,
            previousChapters,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Generation failed");
      }

      const data = await response.json();
      setChapters((prev) => prev.map((c, i) => (i === index ? { ...c, content: data.chapter, isGenerating: false, status: "complete" } : c)));
    } catch (error) {
      setChapters((prev) => prev.map((c, i) => (i === index ? { ...c, isGenerating: false, status: "pending" } : c)));
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed", variant: "destructive" });
    }
  };

  // Generate all chapters sequentially
  const handleGenerateAll = async (chaptersRef?: BookChapter[]) => {
    const currentChapters = chaptersRef || chapters;
    for (let i = 0; i < currentChapters.length; i++) {
      if (!currentChapters[i].title.trim() || currentChapters[i].content) continue;
      await handleGenerateChapter(i, currentChapters);
    }
  };

  // Improve chapter
  const handleImproveChapter = async (index: number, type: ImprovementType) => {
    const ch = chapters[index];
    if (!ch?.content) return;

    setChapters((prev) => prev.map((c, i) => (i === index ? { ...c, isGenerating: true } : c)));

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/improve-book-content`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            content: ch.content,
            improvementType: type,
            bookContext: `Book: ${outline?.title || bookTitle}, Genre: ${genre}, Audience: ${targetAudience}`,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Improvement failed");
      }

      const data = await response.json();
      setChapters((prev) => prev.map((c, i) => (i === index ? { ...c, content: data.content, isGenerating: false, status: "improved" } : c)));
      toast({ title: "Chapter Improved", description: `Applied "${type}" enhancement` });
    } catch (error) {
      setChapters((prev) => prev.map((c, i) => (i === index ? { ...c, isGenerating: false } : c)));
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed", variant: "destructive" });
    }
  };

  const isAnyGenerating = chapters.some((ch) => ch.isGenerating);

  // Navigation tabs for post-outline views
  const tabs: { id: BookView; label: string; icon: React.ReactNode; show: boolean }[] = [
    { id: "outline", label: "Outline", icon: <BookOpen className="w-3.5 h-3.5" />, show: !!outline },
    { id: "writing", label: "Write", icon: <PenTool className="w-3.5 h-3.5" />, show: !!outline },
    { id: "preview", label: "Preview", icon: <Eye className="w-3.5 h-3.5" />, show: generatedChapters.length > 0 },
    { id: "export", label: "Export", icon: <Download className="w-3.5 h-3.5" />, show: generatedChapters.length > 0 },
    { id: "repurpose", label: "Repurpose", icon: <Repeat className="w-3.5 h-3.5" />, show: generatedChapters.length > 0 },
    { id: "publish", label: "Publish", icon: <Package className="w-3.5 h-3.5" />, show: !!outline },
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="container flex items-center justify-between h-16 px-6">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-lg font-bold font-serif tracking-tight">DocuForge</span>
          </Link>

          {/* Tabs */}
          {view !== "setup" && (
            <div className="hidden md:flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
              {tabs.filter((t) => t.show).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setView(tab.id); setViewingChapter(null); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    view === tab.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            {view !== "setup" && (
              <Button variant="ghost" size="sm" onClick={() => { setView("setup"); setViewingChapter(null); }}>
                <ArrowLeft className="w-4 h-4 mr-1" /> New Book
              </Button>
            )}
          </div>
        </div>
      </nav>

      <div className="container max-w-4xl mx-auto px-6 pt-28 pb-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={viewingChapter !== null ? `ch-${viewingChapter}` : view}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
          >
            {/* Chapter preview */}
            {viewingChapter !== null && chapters[viewingChapter]?.content ? (
              <div>
                <Button variant="ghost" size="sm" onClick={() => setViewingChapter(null)} className="mb-4">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <BookContentViewer content={chapters[viewingChapter].content!} title={chapters[viewingChapter].title} />
              </div>
            ) : view === "setup" ? (
              <div>
                <div className="mb-8">
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-4">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <span className="text-sm text-primary font-medium">Book Creator</span>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold font-serif mb-2">
                    Create Your <span className="text-primary italic">Book</span>
                  </h1>
                  <p className="text-muted-foreground">AI-powered book production with multiple creation modes.</p>
                </div>
                <BookSetup
                  bookTitle={bookTitle} setBookTitle={setBookTitle}
                  genre={genre} setGenre={setGenre}
                  targetAudience={targetAudience} setTargetAudience={setTargetAudience}
                  depth={depth} setDepth={setDepth}
                  mode={mode} setMode={setMode}
                  existingContent={existingContent} setExistingContent={setExistingContent}
                  onGenerateOutline={handleGenerateOutline}
                  isGenerating={isGeneratingOutline}
                />
              </div>
            ) : view === "outline" && outline ? (
              <BookOutlineEditor
                outline={outline}
                chapters={chapters}
                setChapters={setChapters}
                onStartWriting={() => setView("writing")}
              />
            ) : view === "writing" ? (
              <BookWritingPanel
                chapters={chapters}
                bookTitle={outline?.title || bookTitle}
                onGenerateChapter={(i) => handleGenerateChapter(i)}
                onGenerateAll={() => handleGenerateAll()}
                onImproveChapter={handleImproveChapter}
                onViewChapter={(i) => setViewingChapter(i)}
                isAnyGenerating={isAnyGenerating}
              />
            ) : view === "preview" ? (
              <BookContentViewer content={fullContent} title={outline?.title || bookTitle} />
            ) : view === "export" ? (
              <BookExportPanel
                bookTitle={outline?.title || bookTitle}
                fullContent={fullContent}
                chapterCount={generatedChapters.length}
              />
            ) : view === "repurpose" ? (
              <BookRepurposePanel
                bookTitle={outline?.title || bookTitle}
                fullContent={fullContent}
              />
            ) : view === "publish" && outline ? (
              <BookPublishingPackage outline={outline} />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BookCreator;
