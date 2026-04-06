import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOutline } from "@/types/book";
import { BookOpen, Tag, Layers, Target, Palette, Type, Eye } from "lucide-react";

interface Props {
  outline: BookOutline;
}

const BookPublishingPackage = ({ outline }: Props) => {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-serif mb-1">Publishing Package</h2>
        <p className="text-sm text-muted-foreground">Your book's metadata and publishing-ready information.</p>
      </div>

      {/* Title & Subtitle */}
      <Card className="border-border bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="bg-primary/5 border-b border-border px-6 py-4">
          <h3 className="text-2xl font-bold font-serif">{outline.title}</h3>
          {outline.subtitle && (
            <p className="text-muted-foreground font-serif italic mt-1">{outline.subtitle}</p>
          )}
        </div>
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <Target className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Target Audience</p>
              <p className="text-sm">{outline.targetAudience || "General audience"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card className="border-border bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            Book Description
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{outline.description || "No description generated yet."}</p>
        </CardContent>
      </Card>

      {/* Positioning */}
      {outline.positioning && (
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              Market Positioning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{outline.positioning}</p>
          </CardContent>
        </Card>
      )}

      {/* Keywords & Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              Keywords
            </CardTitle>
          </CardHeader>
          <CardContent>
            {outline.keywords?.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {outline.keywords.map((kw, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No keywords generated.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            {outline.categories?.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {outline.categories.map((cat, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{cat}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No categories generated.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cover Art Direction */}
      {outline.coverDirection && (
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" />
              Cover Art Direction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Visual Style</p>
                <p className="text-sm">{outline.coverDirection.style || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Color Palette</p>
                <p className="text-sm">{outline.coverDirection.colors || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Type className="w-3 h-3" /> Typography
                </p>
                <p className="text-sm">{outline.coverDirection.typography || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chapter Overview */}
      <Card className="border-border bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Table of Contents ({outline.chapters?.length || 0} chapters)</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-1.5">
            {outline.chapters?.map((ch, i) => (
              <li key={i} className="flex items-baseline gap-2 text-sm">
                <span className="text-xs text-muted-foreground font-mono w-5 shrink-0">{i + 1}.</span>
                <span className="font-medium">{ch.title}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookPublishingPackage;
