import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText, PenTool, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";

import heroCv from "@/assets/hero-cv-light.jpg";
import heroCoverLetter from "@/assets/hero-letter-light.jpg";
import heroBook from "@/assets/hero-book-light.jpg";

const slides = [
  {
    image: heroCv,
    icon: FileText,
    badge: "CV Builder",
    title: "Build a Stunning",
    highlight: "Professional CV",
    description:
      "Create ATS-optimized, beautifully structured resumes that land interviews — powered by AI that understands what recruiters want.",
    cta: "Build Your CV",
    link: "/cv",
  },
  {
    image: heroCoverLetter,
    icon: PenTool,
    badge: "Cover Letter",
    title: "Write a Tailored",
    highlight: "Cover Letter",
    description:
      "Match your experience to any job description instantly. AI crafts compelling, personalized letters that stand out from the stack.",
    cta: "Write a Letter",
    link: "/cover-letter",
  },
  {
    image: heroBook,
    icon: BookOpen,
    badge: "Book Creator",
    title: "Publish Your Own",
    highlight: "Book",
    description:
      "Outline chapters, generate full-length content, and bring your ideas to life. From concept to manuscript — AI does the heavy lifting.",
    cta: "Create a Book",
    link: "/book",
  },
];

const HeroSection = () => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  const goTo = useCallback(
    (index: number) => {
      setDirection(index > current ? 1 : -1);
      setCurrent(index);
    },
    [current]
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const slide = slides[current];
  const Icon = slide.icon;

  const imageVariants = {
    enter: { opacity: 0, scale: 1.05 },
    center: { opacity: 1, scale: 1, transition: { duration: 1, ease: "easeOut" as const } },
    exit: { opacity: 0, scale: 1.02, transition: { duration: 0.6 } },
  };

  const textVariants = {
    enter: (d: number) => ({ opacity: 0, y: d > 0 ? 40 : -40 }),
    center: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
    exit: (d: number) => ({ opacity: 0, y: d > 0 ? -30 : 30, transition: { duration: 0.4 } }),
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background images */}
      <AnimatePresence mode="sync">
        <motion.div
          key={`bg-${current}`}
          variants={imageVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="absolute inset-0"
        >
          <img
            src={slide.image}
            alt={slide.badge}
            className="w-full h-full object-cover opacity-70"
            width={1920}
            height={1080}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/40 to-background" />
        </motion.div>
      </AnimatePresence>

      {/* Gold accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gold-gradient opacity-60" />

      <div className="container relative z-10 px-6 py-20">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={`text-${current}`}
            custom={direction}
            variants={textVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="max-w-4xl mx-auto text-center"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-8">
              <Icon className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium font-sans">{slide.badge}</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6 text-foreground">
              {slide.title}{" "}
              <span className="text-gradient-gold italic">{slide.highlight}</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed font-sans">
              {slide.description}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="hero" size="lg" className="text-base px-8 py-6" asChild>
                <Link to={slide.link}>
                  {slide.cta}
                  <ArrowRight className="w-5 h-5 ml-1" />
                </Link>
              </Button>
              <Button variant="heroOutline" size="lg" className="text-base px-8 py-6" asChild>
                <a href="#features">See How It Works</a>
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Slide indicators */}
        <div className="flex items-center justify-center gap-3 mt-16">
          {slides.map((s, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="group flex items-center gap-2"
              aria-label={`Go to slide: ${s.badge}`}
            >
              <div
                className={`relative h-1.5 rounded-full transition-all duration-500 overflow-hidden ${
                  i === current ? "w-10 bg-primary/20" : "w-6 bg-border hover:bg-muted-foreground/30"
                }`}
              >
                {i === current && (
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full bg-gold-gradient"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 6, ease: "linear" }}
                    key={`progress-${current}`}
                  />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mt-12 max-w-3xl mx-auto grid grid-cols-3 gap-8 border-t border-border pt-8"
        >
          {[
            { value: "10K+", label: "Documents Created" },
            { value: "50+", label: "Templates" },
            { value: "12", label: "Languages" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-gradient-gold font-serif">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1 font-sans">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
