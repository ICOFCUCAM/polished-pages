import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Check, Search } from "lucide-react";
import { CVTemplate, CV_TEMPLATES, CV_TEMPLATE_CATEGORIES, CVTemplateCategory } from "@/types/cv";

import classicImg from "@/assets/cv-templates/classic.jpg";
import modernImg from "@/assets/cv-templates/modern.jpg";
import creativeImg from "@/assets/cv-templates/creative.jpg";
import industryImg from "@/assets/cv-templates/industry.jpg";
import academicImg from "@/assets/cv-templates/academic.jpg";
import executiveImg from "@/assets/cv-templates/executive.jpg";
import minimalistImg from "@/assets/cv-templates/minimalist.jpg";
import regionalImg from "@/assets/cv-templates/regional.jpg";
import specialtyImg from "@/assets/cv-templates/specialty.jpg";

const categoryPreviewMap: Record<CVTemplateCategory, string> = {
  classic: classicImg,
  modern: modernImg,
  creative: creativeImg,
  industry: industryImg,
  academic: academicImg,
  executive: executiveImg,
  minimalist: minimalistImg,
  regional: regionalImg,
  specialty: specialtyImg,
};

interface Props {
  selected: CVTemplate;
  onChange: (template: CVTemplate) => void;
}

const TemplateSelector = ({ selected, onChange }: Props) => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<CVTemplateCategory | "all">("all");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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

      {/* Preview modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="Template preview"
            className="max-h-[85vh] max-w-[90vw] rounded-xl shadow-2xl border border-border"
          />
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-[520px] overflow-y-auto pr-1">
        {filtered.map((t) => (
          <Card
            key={t.id}
            className={`relative cursor-pointer overflow-hidden transition-all hover:shadow-lg group ${
              selected === t.id
                ? "border-primary ring-2 ring-primary/20"
                : "border-border hover:border-primary/30"
            }`}
            onClick={() => onChange(t.id)}
          >
            {selected === t.id && (
              <div className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-sm">
                <Check className="w-3 h-3 text-primary-foreground" />
              </div>
            )}

            {/* Preview thumbnail */}
            <div className="relative h-28 bg-muted/30 overflow-hidden">
              <img
                src={categoryPreviewMap[t.category]}
                alt={`${t.name} template`}
                loading="lazy"
                className="w-full h-full object-cover object-top opacity-90 group-hover:opacity-100 transition-opacity"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewImage(categoryPreviewMap[t.category]);
                }}
                className="absolute bottom-1 right-1 bg-background/80 backdrop-blur-sm text-[10px] px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
              >
                Preview
              </button>
            </div>

            {/* Info */}
            <div className="p-2.5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-sm">{t.icon}</span>
                <h4 className="font-serif font-semibold text-xs">{t.name}</h4>
              </div>
              <p className="text-[10px] text-muted-foreground font-sans leading-snug line-clamp-2">{t.description}</p>
            </div>
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
