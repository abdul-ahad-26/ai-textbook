---
name: new-chapter
description: Scaffold a new chapter for the Physical AI & Humanoid Robotics textbook with correct front-matter, house style, and sidebar wiring. Use when adding a lesson to any module.
---

# New Chapter

Create a new textbook chapter that matches the book's structure and is immediately
discoverable by the sidebar and the RAG assistant.

## Steps

1. **Pick the module + slug.** Modules live under `book/docs/module-N-*/`. The file
   name becomes the doc `id` (e.g. `inverse-kinematics.md`).

2. **Create the file** using `template.md` in this skill as the starting point.
   Fill in front-matter:
   - `id` — kebab-case, matches the filename
   - `title` — full chapter title
   - `sidebar_label` — short label for the sidebar
   - `description` + `keywords` — used for SEO and retrieval quality

3. **Write in house style** (see the `chapter-author` subagent for the full rules):
   motivating intro → concepts with correct code → comparison tables → ASCII data-flow
   diagrams → `:::tip`/`:::warning` asides → a "Next:" link.

4. **Wire the sidebar.** Add the new doc `id` to the right category in
   `book/sidebars.ts`, in reading order.

5. **Re-index for RAG.** Tell the user to run, from `backend/`:
   ```bash
   python -m scripts.ingest
   ```
   so the chat assistant can answer questions about the new chapter.

6. **Verify the build.** From `book/`: `npm run build` (catches broken links and
   bad front-matter).

## Reference
- Template: `template.md` (in this skill directory)
- Voice & accuracy rules: the `chapter-author` and `robotics-fact-checker` subagents
