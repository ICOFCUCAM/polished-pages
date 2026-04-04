import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { Experience } from "@/types/cv";

interface Props {
  experiences: Experience[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: string, value: string) => void;
}

const ExperienceStep = ({ experiences, onAdd, onRemove, onUpdate }: Props) => (
  <div className="space-y-4">
    {experiences.map((exp, i) => (
      <Card key={exp.id} className="border-border bg-card/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="font-serif text-lg">Experience {i + 1}</CardTitle>
          {experiences.length > 1 && (
            <Button variant="ghost" size="icon" onClick={() => onRemove(exp.id)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-sans">Job Title *</Label>
              <Input placeholder="Software Engineer" value={exp.title} onChange={(e) => onUpdate(exp.id, "title", e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label className="font-sans">Company *</Label>
              <Input placeholder="Acme Corp" value={exp.company} onChange={(e) => onUpdate(exp.id, "company", e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label className="font-sans">Start Date</Label>
              <Input placeholder="Jan 2022" value={exp.startDate} onChange={(e) => onUpdate(exp.id, "startDate", e.target.value)} maxLength={20} />
            </div>
            <div className="space-y-2">
              <Label className="font-sans">End Date</Label>
              <Input placeholder="Present" value={exp.endDate} onChange={(e) => onUpdate(exp.id, "endDate", e.target.value)} maxLength={20} />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="font-sans">Key Responsibilities & Achievements</Label>
            <Textarea placeholder="Led a team of 5 engineers to deliver..." value={exp.description} onChange={(e) => onUpdate(exp.id, "description", e.target.value)} rows={3} maxLength={1000} />
          </div>
        </CardContent>
      </Card>
    ))}
    <Button variant="outline" onClick={onAdd} className="w-full border-dashed border-border">
      <Plus className="w-4 h-4 mr-2" /> Add Experience
    </Button>
  </div>
);

export default ExperienceStep;
