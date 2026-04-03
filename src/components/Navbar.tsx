import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="container flex items-center justify-between h-16 px-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="text-lg font-bold font-serif tracking-tight text-foreground">DocuForge</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground font-sans">
          <Link to="/cv" className="hover:text-foreground transition-colors">CV Builder</Link>
          <Link to="/cover-letter" className="hover:text-foreground transition-colors">Cover Letter</Link>
          <Link to="/book" className="hover:text-foreground transition-colors">Book Creator</Link>
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
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
