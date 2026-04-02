import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Sparkles, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import CVPreview from "@/components/CVPreview";

interface Experience {
  id: string;
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface Education {
  id: string;
  degree: string;
  field: string;
  institution: string;
  year: string;
}

const defaultExperience: () => Experience = () => ({
  id: crypto.randomUUID(),
  title: "",
  company: "",
  startDate: "",
  endDate: "",
  description: "",
});

const defaultEducation: () => Education = () => ({
  id: crypto.randomUUID(),
  degree: "",
  field: "",
  institution: "",
  year: "",
});

const CVGenerator = () => {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCV, setGeneratedCV] = useState<string | null>(null);

  const [personalInfo, setPersonalInfo] = useState({
    fullName: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
  });

  const [experiences, setExperiences] = useState<Experience[]>([defaultExperience()]);
  const [education, setEducation] = useState<Education[]>([defaultEducation()]);
  const [skills, setSkills] = useState("");
  const [targetJob, setTargetJob] = useState("");

  const steps = ["Personal Info", "Experience", "Education & Skills", "Generate"];

  const updatePersonal = (field: string, value: string) =>
    setPersonalInfo((prev) => ({ ...prev, [field]: value }));

  const addExperience = () => setExperiences((prev) => [...prev, defaultExperience()]);
  const removeExperience = (id: string) =>
    setExperiences((prev) => prev.filter((e) => e.id !== id));
  const updateExperience = (id: string, field: string, value: string) =>
    setExperiences((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));

  const addEducation = () => setEducation((prev) => [...prev, defaultEducation()]);
  const removeEducation = (id: string) =>
    setEducation((prev) => prev.filter((e) => e.id !== id));
  const updateEducation = (id: string, field: string, value: string) =>
    setEducation((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));

  const canProceed = () => {
    if (step === 0) return personalInfo.fullName.trim() && personalInfo.email.trim();
    if (step === 1) return experiences.some((e) => e.title.trim() && e.company.trim());
    return true;
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const skillsArray = skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-cv`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            personalInfo,
            experiences: experiences.filter((e) => e.title.trim()),
            education: education.filter((e) => e.degree.trim()),
            skills: skillsArray,
            targetJob: targetJob.trim() || undefined,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Generation failed");
      }

      const data = await response.json();
      setGeneratedCV(data.cv);
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

  if (generatedCV) {
    return <CVPreview markdown={generatedCV} onBack={() => setGeneratedCV(null)} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="container flex items-center justify-between h-16 px-6">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gold" />
            <span className="text-lg font-bold font-serif tracking-tight">DocuForge</span>
          </Link>
        </div>
      </nav>

      <div className="container max-w-3xl mx-auto px-6 pt-28 pb-16">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-10">
          {steps.map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1">
              <button
                onClick={() => i < step && setStep(i)}
                className={`flex items-center gap-2 text-sm font-sans transition-colors ${
                  i <= step ? "text-gold" : "text-muted-foreground"
                } ${i < step ? "cursor-pointer hover:text-gold-light" : "cursor-default"}`}
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border transition-colors ${
                    i < step
                      ? "bg-gold/20 border-gold/40 text-gold"
                      : i === step
                      ? "border-gold text-gold"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </button>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-px ${i < step ? "bg-gold/40" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            {/* Step 0: Personal Info */}
            {step === 0 && (
              <Card className="border-border bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="font-serif text-2xl">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-sans">Full Name *</Label>
                      <Input
                        placeholder="John Doe"
                        value={personalInfo.fullName}
                        onChange={(e) => updatePersonal("fullName", e.target.value)}
                        maxLength={100}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-sans">Email *</Label>
                      <Input
                        type="email"
                        placeholder="john@example.com"
                        value={personalInfo.email}
                        onChange={(e) => updatePersonal("email", e.target.value)}
                        maxLength={255}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-sans">Phone</Label>
                      <Input
                        placeholder="+1 234 567 890"
                        value={personalInfo.phone}
                        onChange={(e) => updatePersonal("phone", e.target.value)}
                        maxLength={30}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-sans">Location</Label>
                      <Input
                        placeholder="New York, NY"
                        value={personalInfo.location}
                        onChange={(e) => updatePersonal("location", e.target.value)}
                        maxLength={100}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-sans">LinkedIn URL</Label>
                    <Input
                      placeholder="https://linkedin.com/in/johndoe"
                      value={personalInfo.linkedin}
                      onChange={(e) => updatePersonal("linkedin", e.target.value)}
                      maxLength={200}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 1: Experience */}
            {step === 1 && (
              <div className="space-y-4">
                {experiences.map((exp, i) => (
                  <Card key={exp.id} className="border-border bg-card/50 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="font-serif text-lg">Experience {i + 1}</CardTitle>
                      {experiences.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeExperience(exp.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="font-sans">Job Title *</Label>
                          <Input
                            placeholder="Software Engineer"
                            value={exp.title}
                            onChange={(e) => updateExperience(exp.id, "title", e.target.value)}
                            maxLength={100}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-sans">Company *</Label>
                          <Input
                            placeholder="Acme Corp"
                            value={exp.company}
                            onChange={(e) => updateExperience(exp.id, "company", e.target.value)}
                            maxLength={100}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-sans">Start Date</Label>
                          <Input
                            placeholder="Jan 2022"
                            value={exp.startDate}
                            onChange={(e) => updateExperience(exp.id, "startDate", e.target.value)}
                            maxLength={20}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-sans">End Date</Label>
                          <Input
                            placeholder="Present"
                            value={exp.endDate}
                            onChange={(e) => updateExperience(exp.id, "endDate", e.target.value)}
                            maxLength={20}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-sans">Key Responsibilities & Achievements</Label>
                        <Textarea
                          placeholder="Led a team of 5 engineers to deliver..."
                          value={exp.description}
                          onChange={(e) => updateExperience(exp.id, "description", e.target.value)}
                          rows={3}
                          maxLength={1000}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button variant="outline" onClick={addExperience} className="w-full border-dashed border-border">
                  <Plus className="w-4 h-4 mr-2" /> Add Experience
                </Button>
              </div>
            )}

            {/* Step 2: Education & Skills */}
            {step === 2 && (
              <div className="space-y-6">
                {education.map((edu, i) => (
                  <Card key={edu.id} className="border-border bg-card/50 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="font-serif text-lg">Education {i + 1}</CardTitle>
                      {education.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeEducation(edu.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="font-sans">Degree</Label>
                          <Input
                            placeholder="Bachelor's"
                            value={edu.degree}
                            onChange={(e) => updateEducation(edu.id, "degree", e.target.value)}
                            maxLength={100}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-sans">Field of Study</Label>
                          <Input
                            placeholder="Computer Science"
                            value={edu.field}
                            onChange={(e) => updateEducation(edu.id, "field", e.target.value)}
                            maxLength={100}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-sans">Institution</Label>
                          <Input
                            placeholder="MIT"
                            value={edu.institution}
                            onChange={(e) => updateEducation(edu.id, "institution", e.target.value)}
                            maxLength={100}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-sans">Year</Label>
                          <Input
                            placeholder="2020"
                            value={edu.year}
                            onChange={(e) => updateEducation(edu.id, "year", e.target.value)}
                            maxLength={10}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button variant="outline" onClick={addEducation} className="w-full border-dashed border-border">
                  <Plus className="w-4 h-4 mr-2" /> Add Education
                </Button>

                <Card className="border-border bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="font-serif text-lg">Skills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label className="font-sans">Key Skills (comma-separated)</Label>
                      <Textarea
                        placeholder="React, TypeScript, Project Management, Leadership..."
                        value={skills}
                        onChange={(e) => setSkills(e.target.value)}
                        rows={3}
                        maxLength={500}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 3: Generate */}
            {step === 3 && (
              <Card className="border-border bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="font-serif text-2xl">Generate Your CV</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="font-sans">Target Job Title (optional)</Label>
                    <Input
                      placeholder="Senior Software Engineer at Google"
                      value={targetJob}
                      onChange={(e) => setTargetJob(e.target.value)}
                      maxLength={200}
                    />
                    <p className="text-xs text-muted-foreground font-sans">
                      Provide a target role to optimize your CV with relevant keywords.
                    </p>
                  </div>

                  <div className="rounded-lg border border-gold/20 bg-gold/5 p-6 text-center">
                    <Sparkles className="w-8 h-8 text-gold mx-auto mb-3" />
                    <h3 className="font-serif text-lg font-semibold mb-1">Ready to Generate</h3>
                    <p className="text-sm text-muted-foreground font-sans mb-5">
                      Our AI will craft a polished, ATS-optimized CV from your details.
                    </p>
                    <Button
                      variant="hero"
                      size="lg"
                      className="px-10"
                      onClick={handleGenerate}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 mr-2" />
                          Generate CV
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          {step < 3 && (
            <Button
              variant="heroOutline"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
            >
              Next <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CVGenerator;
