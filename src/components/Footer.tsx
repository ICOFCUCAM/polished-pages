import { Sparkles } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border py-12">
      <div className="container px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-gold" />
          <span className="font-serif font-semibold">DocuForge</span>
        </div>
        <p className="text-sm text-muted-foreground font-sans">
          © 2026 DocuForge. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
