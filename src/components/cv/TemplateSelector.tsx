import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { CVTemplate, CV_TEMPLATES } from "@/types/cv";

interface Props {
  selected: CVTemplate;
  onChange: (template: CVTemplate) => void;
}

const templateIcons: Record<CVTemplate, string> = {
  professional: "📄",
  modern: "🎨",
  executive: "👔",
  minimal: "✨",
  creative: "🚀",
};

const TemplateSelector = ({ selected, onChange }: Props) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
    {CV_TEMPLATES.map((t) => (
      <Card
        key={t.id}
        className={`relative cursor-pointer p-4 transition-all hover:shadow-md ${
          selected === t.id
            ? "border-primary ring-2 ring-primary/20 bg-primary/5"
            : "border-border bg-card/50 hover:border-primary/30"
        }`}
        onClick={() => onChange(t.id)}
      >
        {selected === t.id && (
          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
            <Check className="w-3 h-3 text-primary-foreground" />
          </div>
        )}
        <div className="text-2xl mb-2">{templateIcons[t.id]}</div>
        <h4 className="font-serif font-semibold text-sm">{t.name}</h4>
        <p className="text-xs text-muted-foreground font-sans mt-1 leading-relaxed">{t.description}</p>
      </Card>
    ))}
  </div>
);

export default TemplateSelector;
