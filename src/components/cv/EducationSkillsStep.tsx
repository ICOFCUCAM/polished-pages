import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { Education } from "@/types/cv";

interface Props {
  education: Education[];
  skills: string;
  certifications: string;
  languages: string;
  onAddEducation: () => void;
  onRemoveEducation: (id: string) => void;
  onUpdateEducation: (id: string, field: string, value: string) => void;
  onSkillsChange: (val: string) => void;
  onCertificationsChange: (val: string) => void;
  onLanguagesChange: (val: string) => void;
}

const EducationSkillsStep = ({
  education, skills, certifications, languages,
  onAddEducation, onRemoveEducation, onUpdateEducation,
  onSkillsChange, onCertificationsChange, onLanguagesChange,
}: Props) => (
  <div className="space-y-6">
    {education.map((edu, i) => (
      <Card key={edu.id} className="border-border bg-card/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="font-serif text-lg">Education {i + 1}</CardTitle>
          {education.length > 1 && (
            <Button variant="ghost" size="icon" onClick={() => onRemoveEducation(edu.id)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-sans">Degree</Label>
              <Input placeholder="Bachelor's" value={edu.degree} onChange={(e) => onUpdateEducation(edu.id, "degree", e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label className="font-sans">Field of Study</Label>
              <Input placeholder="Computer Science" value={edu.field} onChange={(e) => onUpdateEducation(edu.id, "field", e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label className="font-sans">Institution</Label>
              <Input placeholder="MIT" value={edu.institution} onChange={(e) => onUpdateEducation(edu.id, "institution", e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label className="font-sans">Year</Label>
              <Input placeholder="2020" value={edu.year} onChange={(e) => onUpdateEducation(edu.id, "year", e.target.value)} maxLength={10} />
            </div>
          </div>
        </CardContent>
      </Card>
    ))}
    <Button variant="outline" onClick={onAddEducation} className="w-full border-dashed border-border">
      <Plus className="w-4 h-4 mr-2" /> Add Education
    </Button>

    <Card className="border-border bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="font-serif text-lg">Skills & Qualifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="font-sans">Key Skills (comma-separated)</Label>
          <Textarea placeholder="React, TypeScript, Project Management, Leadership..." value={skills} onChange={(e) => onSkillsChange(e.target.value)} rows={3} maxLength={500} />
        </div>
        <div className="space-y-2">
          <Label className="font-sans">Certifications (comma-separated)</Label>
          <Textarea placeholder="AWS Solutions Architect, PMP, Google Cloud Professional..." value={certifications} onChange={(e) => onCertificationsChange(e.target.value)} rows={2} maxLength={500} />
        </div>
        <div className="space-y-2">
          <Label className="font-sans">Languages (comma-separated)</Label>
          <Input placeholder="English (Native), French (Fluent), Spanish (Intermediate)" value={languages} onChange={(e) => onLanguagesChange(e.target.value)} maxLength={200} />
        </div>
      </CardContent>
    </Card>
  </div>
);

export default EducationSkillsStep;
