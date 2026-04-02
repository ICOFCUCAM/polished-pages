import { motion } from "framer-motion";
import { FileText, BookOpen, Languages, Briefcase, PenTool, Sparkles } from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "CV Builder",
    description: "ATS-optimized CVs with achievement-focused bullet points, tailored to any role.",
  },
  {
    icon: PenTool,
    title: "Cover Letters",
    description: "Personalized, human-sounding cover letters aligned to specific job descriptions.",
  },
  {
    icon: Briefcase,
    title: "Job Matching",
    description: "Extract keywords from job listings and restructure your profile for maximum impact.",
  },
  {
    icon: BookOpen,
    title: "Book Creator",
    description: "Full-length books with structured chapters, ready for EPUB, PDF, or print.",
  },
  {
    icon: Languages,
    title: "Translation",
    description: "Localized documents adapted to country-specific tone and professional standards.",
  },
  {
    icon: Sparkles,
    title: "AI Refinement",
    description: "Iterative improvement — translate, expand, tailor, or convert any document instantly.",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const FeaturesSection = () => {
  return (
    <section className="py-24 bg-hero-gradient">
      <div className="container px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Everything You Need to{" "}
            <span className="text-gradient-gold italic">Succeed</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto font-sans">
            Professional-grade tools for career advancement and publishing
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={item}
              className="group relative rounded-xl border border-border bg-card/50 backdrop-blur-sm p-8 hover:border-gold/30 hover:glow-gold transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-lg bg-gold/10 flex items-center justify-center mb-5 group-hover:bg-gold/20 transition-colors">
                <feature.icon className="w-6 h-6 text-gold" />
              </div>
              <h3 className="text-xl font-semibold mb-2 font-serif">{feature.title}</h3>
              <p className="text-muted-foreground font-sans leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
