interface BookContentViewerProps {
  content: string;
  title: string;
}

const BookContentViewer = ({ content, title }: BookContentViewerProps) => {
  const renderMarkdown = (md: string) =>
    md
      .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-5 mb-2 text-foreground">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold font-serif mt-7 mb-3 text-foreground pb-1 border-b border-border">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold font-serif mb-3 text-foreground">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-foreground/80">$1</li>')
      .replace(/\n\n/g, '<div class="mb-3"></div>')
      .replace(/\n/g, "<br/>");

  return (
    <div className="rounded-xl border border-border bg-card/50 p-6 md:p-10 shadow-sm">
      <div
        className="prose max-w-none font-sans text-foreground leading-relaxed"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
      />
    </div>
  );
};

export default BookContentViewer;
