import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import ctaImage from "@/assets/cta-workspace.jpg";

const CTASection = () => {
  return (
    <section className="py-24 bg-hero-gradient">
      <div className="container px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative max-w-5xl mx-auto rounded-2xl border border-border overflow-hidden shadow-premium"
        >
          {/* Background image */}
          <div className="absolute inset-0">
            <img
              src={ctaImage}
              alt="Creative workspace"
              className="w-full h-full object-cover opacity-20"
              loading="lazy"
              width={1600}
              height={800}
            />
            <div className="absolute inset-0 bg-background/80" />
          </div>

          <div className="relative z-10 p-12 md:p-20 text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-foreground">
              Ready to Create Something{" "}
              <span className="text-gradient-gold italic">Extraordinary?</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8 font-sans">
              Join thousands of professionals using AI to build career-defining documents and publish their ideas.
            </p>
            <Button variant="hero" size="lg" className="text-base px-10 py-6" asChild>
              <Link to="/cv">
                Start Creating Now
                <ArrowRight className="w-5 h-5 ml-1" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
