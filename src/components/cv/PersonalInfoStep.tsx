import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PersonalInfo } from "@/types/cv";

interface Props {
  personalInfo: PersonalInfo;
  onChange: (field: string, value: string) => void;
}

const PersonalInfoStep = ({ personalInfo, onChange }: Props) => (
  <Card className="border-border bg-card/50 backdrop-blur-sm">
    <CardHeader>
      <CardTitle className="font-serif text-2xl">Personal Information</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="font-sans">Full Name *</Label>
          <Input placeholder="John Doe" value={personalInfo.fullName} onChange={(e) => onChange("fullName", e.target.value)} maxLength={100} />
        </div>
        <div className="space-y-2">
          <Label className="font-sans">Email *</Label>
          <Input type="email" placeholder="john@example.com" value={personalInfo.email} onChange={(e) => onChange("email", e.target.value)} maxLength={255} />
        </div>
        <div className="space-y-2">
          <Label className="font-sans">Phone</Label>
          <Input placeholder="+1 234 567 890" value={personalInfo.phone} onChange={(e) => onChange("phone", e.target.value)} maxLength={30} />
        </div>
        <div className="space-y-2">
          <Label className="font-sans">Location</Label>
          <Input placeholder="New York, NY" value={personalInfo.location} onChange={(e) => onChange("location", e.target.value)} maxLength={100} />
        </div>
        <div className="space-y-2">
          <Label className="font-sans">LinkedIn URL</Label>
          <Input placeholder="https://linkedin.com/in/johndoe" value={personalInfo.linkedin} onChange={(e) => onChange("linkedin", e.target.value)} maxLength={200} />
        </div>
        <div className="space-y-2">
          <Label className="font-sans">Website / Portfolio</Label>
          <Input placeholder="https://johndoe.com" value={personalInfo.website} onChange={(e) => onChange("website", e.target.value)} maxLength={200} />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="font-sans">Professional Summary</Label>
        <Textarea
          placeholder="Experienced software engineer with 8+ years in full-stack development, specializing in React and cloud architecture..."
          value={personalInfo.summary}
          onChange={(e) => onChange("summary", e.target.value)}
          rows={4}
          maxLength={1000}
        />
        <p className="text-xs text-muted-foreground font-sans">
          A brief overview of your career highlights and key strengths (3-5 lines recommended).
        </p>
      </div>
    </CardContent>
  </Card>
);

export default PersonalInfoStep;
