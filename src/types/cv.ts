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

export type CVTemplate = "professional" | "modern" | "executive" | "minimal" | "creative";

export const CV_TEMPLATES: { id: CVTemplate; name: string; description: string }[] = [
  { id: "professional", name: "Professional", description: "Classic ATS-optimized format with clean sections and strong hierarchy" },
  { id: "modern", name: "Modern", description: "Contemporary layout with a skills sidebar and visual emphasis" },
  { id: "executive", name: "Executive", description: "Senior-level format emphasizing leadership and strategic impact" },
  { id: "minimal", name: "Minimal", description: "Clean, distraction-free layout focused on content" },
  { id: "creative", name: "Creative", description: "Stylish format for design, marketing, and media roles" },
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
