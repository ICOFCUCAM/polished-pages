import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { Reference } from "@/types/cv";

interface Props {
  references: Reference[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: string, value: string) => void;
}

const ReferencesStep = ({ references, onAdd, onRemove, onUpdate }: Props) => (
  <div className="space-y-4">
    <p className="text-sm text-muted-foreground font-sans">
      Add professional references who can vouch for your work. Leave blank to include "Available upon request."
    </p>
    {references.map((ref, i) => (
      <Card key={ref.id} className="border-border bg-card/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="font-serif text-lg">Reference {i + 1}</CardTitle>
          <Button variant="ghost" size="icon" onClick={() => onRemove(ref.id)} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-sans">Full Name</Label>
              <Input placeholder="Jane Smith" value={ref.name} onChange={(e) => onUpdate(ref.id, "name", e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label className="font-sans">Job Title</Label>
              <Input placeholder="Engineering Director" value={ref.title} onChange={(e) => onUpdate(ref.id, "title", e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label className="font-sans">Company</Label>
              <Input placeholder="Acme Corp" value={ref.company} onChange={(e) => onUpdate(ref.id, "company", e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label className="font-sans">Relationship</Label>
              <Input placeholder="Former Manager" value={ref.relationship} onChange={(e) => onUpdate(ref.id, "relationship", e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label className="font-sans">Email</Label>
              <Input type="email" placeholder="jane@acme.com" value={ref.email} onChange={(e) => onUpdate(ref.id, "email", e.target.value)} maxLength={255} />
            </div>
            <div className="space-y-2">
              <Label className="font-sans">Phone</Label>
              <Input placeholder="+1 234 567 890" value={ref.phone} onChange={(e) => onUpdate(ref.id, "phone", e.target.value)} maxLength={30} />
            </div>
          </div>
        </CardContent>
      </Card>
    ))}
    <Button variant="outline" onClick={onAdd} className="w-full border-dashed border-border">
      <Plus className="w-4 h-4 mr-2" /> Add Reference
    </Button>
  </div>
);

export default ReferencesStep;
