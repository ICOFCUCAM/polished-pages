import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Check, Search } from "lucide-react";
import { CVTemplate, CV_TEMPLATES, CV_TEMPLATE_CATEGORIES, CVTemplateCategory } from "@/types/cv";

interface Props {
  selected: CVTemplate;
  onChange: (template: CVTemplate) => void;
}

const TemplateSelector = ({ selected, onChange }: Props) => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<CVTemplateCategory | "all">("all");

  const filtered = CV_TEMPLATES.filter((t) => {
    const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "all" || t.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveCategory("all")}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            activeCategory === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          All ({CV_TEMPLATES.length})
        </button>
        {CV_TEMPLATE_CATEGORIES.map((cat) => {
          const count = CV_TEMPLATES.filter((t) => t.category === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[420px] overflow-y-auto pr-1">
        {filtered.map((t) => (
          <Card
            key={t.id}
            className={`relative cursor-pointer p-3 transition-all hover:shadow-md ${
              selected === t.id
                ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                : "border-border bg-card/50 hover:border-primary/30"
            }`}
            onClick={() => onChange(t.id)}
          >
            {selected === t.id && (
              <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-primary-foreground" />
              </div>
            )}
            <div className="text-lg mb-1">{t.icon}</div>
            <h4 className="font-serif font-semibold text-xs">{t.name}</h4>
            <p className="text-[10px] text-muted-foreground font-sans mt-0.5 leading-snug line-clamp-2">{t.description}</p>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">No templates match your search.</p>
      )}
    </div>
  );
};

export default TemplateSelector;
