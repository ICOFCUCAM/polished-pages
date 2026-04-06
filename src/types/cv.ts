export interface Experience {
  id: string;
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Education {
  id: string;
  degree: string;
  field: string;
  institution: string;
  year: string;
}

export interface Reference {
  id: string;
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  relationship: string;
}

export interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  website: string;
  summary: string;
}

export type CVTemplate = string;

export interface CVTemplateInfo {
  id: string;
  name: string;
  description: string;
  category: CVTemplateCategory;
  icon: string;
}

export type CVTemplateCategory = "classic" | "modern" | "creative" | "industry" | "academic" | "executive" | "minimalist" | "regional" | "specialty";

export const CV_TEMPLATE_CATEGORIES: { id: CVTemplateCategory; label: string }[] = [
  { id: "classic", label: "Classic" },
  { id: "modern", label: "Modern" },
  { id: "creative", label: "Creative" },
  { id: "industry", label: "Industry" },
  { id: "academic", label: "Academic" },
  { id: "executive", label: "Executive" },
  { id: "minimalist", label: "Minimalist" },
  { id: "regional", label: "Regional" },
  { id: "specialty", label: "Specialty" },
];

export const CV_TEMPLATES: CVTemplateInfo[] = [
  // Classic (6)
  { id: "professional", name: "Professional", description: "Traditional ATS-optimized format with clear section headings and structured layout", category: "classic", icon: "📄" },
  { id: "traditional", name: "Traditional", description: "Time-tested chronological format with conservative styling", category: "classic", icon: "📋" },
  { id: "chronological", name: "Chronological", description: "Emphasizes work history in reverse chronological order", category: "classic", icon: "📅" },
  { id: "functional", name: "Functional", description: "Skills-based format that highlights abilities over timeline", category: "classic", icon: "🔧" },
  { id: "combination", name: "Combination", description: "Hybrid of chronological and functional, balancing both", category: "classic", icon: "🔀" },
  { id: "classic-elegant", name: "Classic Elegant", description: "Refined serif typography with subtle horizontal rules", category: "classic", icon: "🖋️" },

  // Modern (7)
  { id: "modern", name: "Modern", description: "Contemporary layout with skills highlights and visual emphasis", category: "modern", icon: "🎨" },
  { id: "metro", name: "Metro", description: "Clean grid-inspired layout with bold section headers", category: "modern", icon: "🏙️" },
  { id: "sleek", name: "Sleek", description: "Smooth gradients and refined spacing for a polished look", category: "modern", icon: "✨" },
  { id: "startup", name: "Startup", description: "Dynamic layout suited for tech startups and fast-paced roles", category: "modern", icon: "🚀" },
  { id: "digital-first", name: "Digital First", description: "Optimized for online viewing with linked profiles and QR-ready", category: "modern", icon: "💻" },
  { id: "tech-modern", name: "Tech Modern", description: "Code-inspired aesthetics with monospace accents and tech focus", category: "modern", icon: "⌨️" },
  { id: "flat-design", name: "Flat Design", description: "Minimal shadows, bold colors, and clean geometric elements", category: "modern", icon: "🎯" },

  // Creative (7)
  { id: "creative", name: "Creative", description: "Expressive layout with personality for design and media roles", category: "creative", icon: "🎭" },
  { id: "portfolio", name: "Portfolio", description: "Project-focused layout showcasing creative works and case studies", category: "creative", icon: "🖼️" },
  { id: "artistic", name: "Artistic", description: "Bold typography and unconventional layout for artists", category: "creative", icon: "🎨" },
  { id: "storyteller", name: "Storyteller", description: "Narrative-driven format that weaves your career as a story", category: "creative", icon: "📖" },
  { id: "infographic", name: "Infographic", description: "Data-visual style with skill bars, charts, and visual timelines", category: "creative", icon: "📊" },
  { id: "magazine", name: "Magazine", description: "Editorial layout inspired by magazine spreads", category: "creative", icon: "📰" },
  { id: "brand-identity", name: "Brand Identity", description: "Personal branding focus with tagline and brand statement", category: "creative", icon: "🏷️" },

  // Industry (8)
  { id: "engineering", name: "Engineering", description: "Technical format highlighting certifications, projects, and specs", category: "industry", icon: "⚙️" },
  { id: "healthcare", name: "Healthcare", description: "Clinical format for medical professionals with licensure focus", category: "industry", icon: "🏥" },
  { id: "legal", name: "Legal", description: "Formal structure for attorneys with bar admissions and case highlights", category: "industry", icon: "⚖️" },
  { id: "finance", name: "Finance", description: "Numbers-driven layout emphasizing quantified achievements", category: "industry", icon: "💰" },
  { id: "education-sector", name: "Education", description: "Academic teaching format with coursework and publications", category: "industry", icon: "🎓" },
  { id: "marketing", name: "Marketing", description: "Campaign-focused with metrics, ROI highlights, and brand work", category: "industry", icon: "📢" },
  { id: "hospitality", name: "Hospitality", description: "Service-oriented format for hotel, restaurant, and tourism roles", category: "industry", icon: "🏨" },
  { id: "government", name: "Government", description: "Compliance-ready format following public sector standards", category: "industry", icon: "🏛️" },

  // Academic (5)
  { id: "academic-cv", name: "Academic CV", description: "Full academic curriculum vitae with publications and grants", category: "academic", icon: "📚" },
  { id: "research", name: "Research", description: "Research-focused with publications, conferences, and lab experience", category: "academic", icon: "🔬" },
  { id: "phd-candidate", name: "PhD Candidate", description: "Dissertation-focused format for doctoral candidates", category: "academic", icon: "🎓" },
  { id: "postdoc", name: "Postdoctoral", description: "Post-PhD format emphasizing research output and fellowships", category: "academic", icon: "🧪" },
  { id: "professor", name: "Professor", description: "Senior academic format with teaching philosophy and tenure track", category: "academic", icon: "👨‍🏫" },

  // Executive (6)
  { id: "executive", name: "Executive", description: "Board-level format emphasizing strategic leadership and vision", category: "executive", icon: "👔" },
  { id: "c-suite", name: "C-Suite", description: "Chief officer format with P&L responsibility and org transformation", category: "executive", icon: "🏢" },
  { id: "board-director", name: "Board Director", description: "Governance-focused for board of directors positions", category: "executive", icon: "📋" },
  { id: "senior-manager", name: "Senior Manager", description: "Mid-to-senior management with team leadership focus", category: "executive", icon: "👥" },
  { id: "consultant", name: "Consultant", description: "Client-facing format highlighting engagements and impact", category: "executive", icon: "💼" },
  { id: "entrepreneur", name: "Entrepreneur", description: "Founder-focused showing ventures, pivots, and growth metrics", category: "executive", icon: "🌟" },

  // Minimalist (5)
  { id: "minimal", name: "Minimal", description: "Maximum whitespace, zero decoration, content speaks for itself", category: "minimalist", icon: "⬜" },
  { id: "zen", name: "Zen", description: "Calm, spacious layout with generous margins and soft tones", category: "minimalist", icon: "🧘" },
  { id: "one-page", name: "One Page", description: "Strictly single-page with optimized content density", category: "minimalist", icon: "📃" },
  { id: "swiss", name: "Swiss", description: "Influenced by Swiss/International typographic style — grid-based precision", category: "minimalist", icon: "🇨🇭" },
  { id: "clean-slate", name: "Clean Slate", description: "Ultra-clean with subtle typography hierarchy and no borders", category: "minimalist", icon: "🪶" },

  // Regional (5)
  { id: "europass", name: "Europass", description: "EU standard format accepted across European institutions", category: "regional", icon: "🇪🇺" },
  { id: "uk-standard", name: "UK Standard", description: "British CV conventions with personal statement and no photo", category: "regional", icon: "🇬🇧" },
  { id: "nordic", name: "Nordic", description: "Scandinavian-inspired clean design with social number placeholder", category: "regional", icon: "🇳🇴" },
  { id: "australian", name: "Australian", description: "Australian format with key selection criteria and referees", category: "regional", icon: "🇦🇺" },
  { id: "canadian", name: "Canadian", description: "Canadian bilingual-ready format with provincial standards", category: "regional", icon: "🇨🇦" },

  // Specialty (6)
  { id: "career-change", name: "Career Change", description: "Transferable skills focus for professionals switching industries", category: "specialty", icon: "🔄" },
  { id: "freelancer", name: "Freelancer", description: "Project-based format for independent contractors and gig workers", category: "specialty", icon: "🎯" },
  { id: "military-transition", name: "Military Transition", description: "Translates military experience into civilian terminology", category: "specialty", icon: "🎖️" },
  { id: "internship", name: "Internship", description: "Entry-level format highlighting education, projects, and potential", category: "specialty", icon: "🌱" },
  { id: "remote-worker", name: "Remote Worker", description: "Highlights remote collaboration tools, async communication, and self-management", category: "specialty", icon: "🏠" },
  { id: "volunteer-focused", name: "Volunteer Focused", description: "Emphasizes community service, NGO work, and social impact", category: "specialty", icon: "🤝" },
];

export const defaultExperience = (): Experience => ({
  id: crypto.randomUUID(),
  title: "",
  company: "",
  startDate: "",
  endDate: "",
  description: "",
});

export const defaultEducation = (): Education => ({
  id: crypto.randomUUID(),
  degree: "",
  field: "",
  institution: "",
  year: "",
});

export const defaultReference = (): Reference => ({
  id: crypto.randomUUID(),
  name: "",
  title: "",
  company: "",
  email: "",
  phone: "",
  relationship: "",
});
