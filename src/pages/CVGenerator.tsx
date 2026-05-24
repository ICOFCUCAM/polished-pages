import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Sparkles, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import CVPreview from "@/components/CVPreview";
import PersonalInfoStep from "@/components/cv/PersonalInfoStep";
import ExperienceStep from "@/components/cv/ExperienceStep";
import EducationSkillsStep from "@/components/cv/EducationSkillsStep";
import ReferencesStep from "@/components/cv/ReferencesStep";
import CVUploadStep from "@/components/cv/CVUploadStep";
import TemplateSelector from "@/components/cv/TemplateSelector";
import {
  PersonalInfo, Experience, Education, Reference, CVTemplate,
  defaultExperience, defaultEducation, defaultReference,
} from "@/types/cv";

const CVGenerator = () => {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCV, setGeneratedCV] = useState<string | null>(null);

  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    fullName: "", email: "", phone: "", location: "", linkedin: "", website: "", summary: "",
  });
  const [experiences, setExperiences] = useState<Experience[]>([defaultExperience()]);
  const [education, setEducation] = useState<Education[]>([defaultEducation()]);
  const [references, setReferences] = useState<Reference[]>([]);
  const [skills, setSkills] = useState("");
  const [certifications, setCertifications] = useState("");
  const [languages, setLanguages] = useState("");
  const [targetJob, setTargetJob] = useState("");
  const [template, setTemplate] = useState<CVTemplate>("professional");

  const steps = ["Upload / Info", "Experience", "Education & Skills", "References", "Generate"];

  const updatePersonal = (field: string, value: string) =>
    setPersonalInfo((prev) => ({ ...prev, [field]: value }));

  const addExperience = () => setExperiences((prev) => [...prev, defaultExperience()]);
  const removeExperience = (id: string) => setExperiences((prev) => prev.filter((e) => e.id !== id));
  const updateExperience = (id: string, field: string, value: string) =>
    setExperiences((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));

  const addEducation = () => setEducation((prev) => [...prev, defaultEducation()]);
  const removeEducation = (id: string) => setEducation((prev) => prev.filter((e) => e.id !== id));
  const updateEducation = (id: string, field: string, value: string) =>
    setEducation((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));

  const addReference = () => setReferences((prev) => [...prev, defaultReference()]);
  const removeReference = (id: string) => setReferences((prev) => prev.filter((r) => r.id !== id));
  const updateReference = (id: string, field: string, value: string) =>
    setReferences((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));

  const handleUploadParsed = (data: any) => {
    if (data.personalInfo) {
      setPersonalInfo((prev) => ({
        ...prev,
        ...Object.fromEntries(Object.entries(data.personalInfo).filter(([_, v]) => v)),
      }));
    }
    if (data.experiences?.length) {
      setExperiences(data.experiences.map((e: any) => ({ ...defaultExperience(), ...e })));
    }
    if (data.education?.length) {
      setEducation(data.education.map((e: any) => ({ ...defaultEducation(), ...e })));
    }
    if (data.skills) setSkills(data.skills);
    if (data.certifications) setCertifications(data.certifications);
    if (data.languages) setLanguages(data.languages);
    if (data.references?.length) {
      setReferences(data.references.map((r: any) => ({ ...defaultReference(), ...r })));
    }
  };

  const canProceed = () => {
    if (step === 0) return personalInfo.fullName.trim() && personalInfo.email.trim();
    if (step === 1) return experiences.some((e) => e.title.trim() && e.company.trim());
    return true;
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const skillsArray = skills.split(",").map((s) => s.trim()).filter(Boolean);
      const certsArray = certifications.split(",").map((s) => s.trim()).filter(Boolean);
      const langsArray = languages.split(",").map((s) => s.trim()).filter(Boolean);

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
            certifications: certsArray,
            languages: langsArray,
            references: references.filter((r) => r.name.trim()),
            targetJob: targetJob.trim() || undefined,
            template,
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
      toast({ title: "Generation Failed", description: error instanceof Error ? error.message : "Something went wrong", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  if (generatedCV) {
    return <CVPreview markdown={generatedCV} template={template} onBack={() => setGeneratedCV(null)} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="container flex items-center justify-between h-16 px-6">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-lg font-bold font-serif tracking-tight">DocuForge</span>
          </Link>
        </div>
      </nav>

      <div className="container max-w-3xl mx-auto px-6 pt-28 pb-16">
        {/* Progress */}
        <div className="flex items-center gap-1 mb-10 overflow-x-auto">
          {steps.map((label, i) => (
            <div key={label} className="flex items-center gap-1 flex-1 min-w-0">
              <button
                onClick={() => i < step && setStep(i)}
                className={`flex items-center gap-1.5 text-xs sm:text-sm font-sans transition-colors whitespace-nowrap ${
                  i <= step ? "text-primary" : "text-muted-foreground"
                } ${i < step ? "cursor-pointer hover:text-primary/80" : "cursor-default"}`}
              >
                <span className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-semibold border transition-colors shrink-0 ${
                  i < step ? "bg-primary/10 border-primary/40 text-primary"
                    : i === step ? "border-primary text-primary"
                    : "border-border text-muted-foreground"
                }`}>
                  {i + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </button>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-px min-w-2 ${i < step ? "bg-primary/40" : "bg-border"}`} />
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
            {step === 0 && (
              <div className="space-y-6">
                <CVUploadStep onParsed={handleUploadParsed} />
                <PersonalInfoStep personalInfo={personalInfo} onChange={updatePersonal} />
              </div>
            )}

            {step === 1 && (
              <ExperienceStep
                experiences={experiences}
                onAdd={addExperience}
                onRemove={removeExperience}
                onUpdate={updateExperience}
              />
            )}

            {step === 2 && (
              <EducationSkillsStep
                education={education}
                skills={skills}
                certifications={certifications}
                languages={languages}
                onAddEducation={addEducation}
                onRemoveEducation={removeEducation}
                onUpdateEducation={updateEducation}
                onSkillsChange={setSkills}
                onCertificationsChange={setCertifications}
                onLanguagesChange={setLanguages}
              />
            )}

            {step === 3 && (
              <ReferencesStep
                references={references}
                onAdd={addReference}
                onRemove={removeReference}
                onUpdate={updateReference}
              />
            )}

            {step === 4 && (
              <Card className="border-border bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="font-serif text-2xl">Generate Your CV</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="font-sans font-semibold">Choose a Template</Label>
                    <TemplateSelector selected={template} onChange={setTemplate} />
                  </div>

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

                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-6 text-center">
                    <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
                    <h3 className="font-serif text-lg font-semibold mb-1">Ready to Generate</h3>
                    <p className="text-sm text-muted-foreground font-sans mb-5">
                      Our AI will craft a polished, ATS-optimized CV using the <strong>{template}</strong> template.
                    </p>
                    <Button variant="hero" size="lg" className="px-10" onClick={handleGenerate} disabled={isGenerating}>
                      {isGenerating ? (
                        <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Generating...</>
                      ) : (
                        <><Sparkles className="w-5 h-5 mr-2" /> Generate CV</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between mt-8">
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0} className="text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          {step < 4 && (
            <Button variant="heroOutline" onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
              Next <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CVGenerator;
