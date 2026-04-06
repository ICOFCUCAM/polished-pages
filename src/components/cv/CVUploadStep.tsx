import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface Props {
  onParsed: (data: {
    personalInfo?: any;
    experiences?: any[];
    education?: any[];
    skills?: string;
    references?: any[];
    certifications?: string;
    languages?: string;
  }) => void;
}

const CVUploadStep = ({ onParsed }: Props) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsed, setParsed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
    if (!allowed.includes(selected.type)) {
      toast({ title: "Unsupported format", description: "Please upload a PDF, DOCX, or TXT file.", variant: "destructive" });
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 5MB.", variant: "destructive" });
      return;
    }

    setFile(selected);
    setParsed(false);
  };

  const handleParse = async () => {
    if (!file) return;
    setIsParsing(true);
    try {
      let text: string;

      if (file.type === "application/pdf") {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pages: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          pages.push(content.items.map((item: any) => item.str).join(" "));
        }
        text = pages.join("\n\n");
      } else {
        text = await file.text();
      }

      if (!text || text.trim().length < 20) {
        throw new Error("Could not extract readable text from this file. Please try a different format.");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-cv`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ action: "parse", cvText: text }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Parsing failed");
      }

      const data = await response.json();
      onParsed(data.parsed);
      setParsed(true);
      toast({ title: "CV Imported", description: "Your CV details have been extracted and filled in." });
    } catch (error) {
      toast({
        title: "Parse Failed",
        description: error instanceof Error ? error.message : "Could not extract CV data.",
        variant: "destructive",
      });
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <Card className="border-border bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="font-serif text-lg">Upload Existing CV</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground font-sans">
          Upload your existing CV to auto-fill the form. We'll extract your details and let you edit before generating.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={handleFileChange}
        />

        <div
          className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/40 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              <div className="text-left">
                <p className="font-sans font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              {parsed && <Check className="w-5 h-5 text-green-500" />}
            </div>
          ) : (
            <>
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-sans text-sm text-muted-foreground">
                Drag & drop or click to upload (PDF, DOCX, TXT)
              </p>
            </>
          )}
        </div>

        {file && !parsed && (
          <Button
            variant="hero"
            className="w-full"
            onClick={handleParse}
            disabled={isParsing}
          >
            {isParsing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Extracting details...</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" /> Extract & Fill Form</>
            )}
          </Button>
        )}

        {file && parsed && (
          <div className="flex items-center gap-2 text-sm text-green-600 font-sans">
            <Check className="w-4 h-4" />
            Details extracted! Review and edit in the steps below.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CVUploadStep;
