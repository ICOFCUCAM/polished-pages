import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="container flex items-center justify-between h-16 px-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-gold" />
          <span className="text-lg font-bold font-serif tracking-tight">DocuForge</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground font-sans">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          <a href="#about" className="hover:text-foreground transition-colors">About</a>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-muted-foreground font-sans">
            Sign In
          </Button>
          <Button variant="hero" size="sm" className="font-sans">
            Get Started
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
