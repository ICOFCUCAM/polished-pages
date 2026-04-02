import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles, ArrowLeft, Loader2, Download, PenTool } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const tones = [
  { value: "professional", label: "Professional", desc: "Formal & corporate" },
  { value: "friendly", label: "Friendly", desc: "Warm & approachable" },
  { value: "confident", label: "Confident", desc: "Bold & assertive" },
];

const CoverLetterGenerator = () => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [relevantExperience, setRelevantExperience] = useState("");
  const [tone, setTone] = useState("professional");

  const canGenerate = fullName.trim() && email.trim() && jobDescription.trim();

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-cover-letter`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ fullName, email, phone, jobDescription, relevantExperience, tone }),
        }
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Generation failed");
      }
      const data = await response.json();
      setResult(data.coverLetter);
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cover-letter.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderMarkdown = (md: string) =>
    md
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold font-serif mt-6 mb-2 text-gold-light">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold font-serif mt-8 mb-3 text-gradient-gold pb-1 border-b border-border">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold font-serif mb-2">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n\n/g, '<div class="mb-4"></div>')
      .replace(/\n/g, "<br/>");

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="container flex items-center justify-between h-16 px-6">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gold" />
            <span className="text-lg font-bold font-serif tracking-tight">DocuForge</span>
          </Link>
          {result && (
            <Button variant="hero" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" /> Download
            </Button>
          )}
        </div>
      </nav>

      <div className="container max-w-4xl mx-auto px-6 pt-28 pb-16">
        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Header */}
              <div className="mb-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/5 px-4 py-1.5 mb-4">
                  <PenTool className="w-4 h-4 text-gold" />
                  <span className="text-sm text-gold-light font-medium font-sans">Cover Letter Generator</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold font-serif mb-2">
                  Craft a <span className="text-gradient-gold italic">Tailored</span> Cover Letter
                </h1>
                <p className="text-muted-foreground font-sans">
                  Paste the job description and let AI create a compelling cover letter matched to the role.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Job description (main input) */}
                <div className="lg:col-span-2 space-y-6">
                  <Card className="border-border bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="font-serif text-xl">Job Description *</CardTitle>
                      <CardDescription className="font-sans">Paste the full job posting to tailor your letter</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder="Paste the job description here..."
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        rows={10}
                        maxLength={5000}
                        className="resize-none"
                      />
                    </CardContent>
                  </Card>

                  <Card className="border-border bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="font-serif text-xl">Your Relevant Experience</CardTitle>
                      <CardDescription className="font-sans">Highlight achievements to feature in the letter</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder="E.g. Led a 12-person engineering team, increased revenue by 40%..."
                        value={relevantExperience}
                        onChange={(e) => setRelevantExperience(e.target.value)}
                        rows={5}
                        maxLength={2000}
                        className="resize-none"
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Right: Personal info & tone */}
                <div className="space-y-6">
                  <Card className="border-border bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="font-serif text-lg">Your Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label className="font-sans">Full Name *</Label>
                        <Input
                          placeholder="Jane Smith"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          maxLength={100}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-sans">Email *</Label>
                        <Input
                          type="email"
                          placeholder="jane@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          maxLength={255}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-sans">Phone</Label>
                        <Input
                          placeholder="+1 234 567 890"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          maxLength={30}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="font-serif text-lg">Tone</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {tones.map((t) => (
                        <button
                          key={t.value}
                          onClick={() => setTone(t.value)}
                          className={`w-full text-left rounded-lg border p-3 transition-colors font-sans ${
                            tone === t.value
                              ? "border-gold/40 bg-gold/10"
                              : "border-border hover:border-border/80 hover:bg-surface-hover"
                          }`}
                        >
                          <span className={`text-sm font-medium ${tone === t.value ? "text-gold" : "text-foreground"}`}>
                            {t.label}
                          </span>
                          <p className="text-xs text-muted-foreground">{t.desc}</p>
                        </button>
                      ))}
                    </CardContent>
                  </Card>

                  <Button
                    variant="hero"
                    size="lg"
                    className="w-full py-6"
                    onClick={handleGenerate}
                    disabled={!canGenerate || isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" /> Generate Cover Letter
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Button
                variant="ghost"
                onClick={() => setResult(null)}
                className="text-muted-foreground mb-6"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Editor
              </Button>

              <div className="rounded-xl border border-border bg-card/50 backdrop-blur-sm p-8 md:p-12 shadow-premium">
                <div
                  className="prose prose-invert max-w-none font-sans text-foreground leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(result) }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CoverLetterGenerator;
