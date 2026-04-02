import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-24">
      <div className="container px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative max-w-4xl mx-auto rounded-2xl border border-gold/20 bg-card/80 backdrop-blur-sm p-12 md:p-16 text-center overflow-hidden"
        >
          {/* Decorative glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-gold/5 blur-3xl" />

          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Ready to Create Something{" "}
              <span className="text-gradient-gold italic">Extraordinary?</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8 font-sans">
              Join thousands of professionals using AI to build career-defining documents and publish their ideas.
            </p>
            <Button variant="hero" size="lg" className="text-base px-10 py-6">
              Start Creating Now
              <ArrowRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
