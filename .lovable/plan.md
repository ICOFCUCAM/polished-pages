## Phase 1: Database Foundation
- Create `books`, `chapters`, `generated_assets` tables with RLS
- Enable auth so users can save their work

## Phase 2: Enhanced Book Production Backend
- New edge function: `generate-book-outline` (AI-powered full outline with structure planning)
- Update `generate-book-chapter` with quality controls (hooks, depth, anti-repetition)
- New edge function: `improve-book-content` (enhancement pass)
- New edge function: `repurpose-content` (blog posts, social, emails, etc.)

## Phase 3: Export System
- New edge function: `export-book` supporting PDF, DOCX, EPUB formats
- Clean formatting for each format

## Phase 4: UI Extensions
- Upgrade BookCreator page with multiple modes (Quick Generate, Guided, Improve)
- Add book library/dashboard showing saved books
- Add content repurposing panel
- Add export panel with format selection
- Chapter editor with inline editing

## Phase 5: Integration
- Wire everything together with proper state management
- Add publishing package generation (description, keywords, categories)

### What stays untouched:
- CV Generator (all steps, templates, upload)
- Cover Letter Generator
- Landing page / Hero / Features / CTA
- Existing edge functions (generate-cv, generate-cover-letter, export-docx)
- All existing routes and components
