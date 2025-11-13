## Quick context for AI coding agents

- Project type: Vite + React + TypeScript app using shadcn-style UI primitives and TailwindCSS. See `package.json` and `vite.config.ts`.
- Runtime: client-side SPA with `react-router` (routes defined in `src/App.tsx`). Data-fetching uses `@tanstack/react-query` (`QueryClientProvider` in `src/App.tsx`).
- Dev server: `npm run dev` (Vite) — it binds to host `::` and port `8080` (see `vite.config.ts`). Use `npm run preview` to run a production preview.

## Architecture & key locations

- UI primitives live under `src/components/ui/` (buttons, inputs, toasts, etc.). Prefer composing these primitives for new UI.
- Pages are under `src/pages/` (entry page: `Index.tsx`, fallback: `NotFound.tsx`). Add new client routes in `src/App.tsx` above the catch-all `*` route.
- Reusable helpers: `src/lib/utils.ts` (the `cn` helper wraps `clsx` + `tailwind-merge` — use it to join/merge Tailwind classes).
- Core components for the main flow: `src/components/FileUploader.tsx` (file validation and drag/drop for .docx, 10MB limit), `src/components/ProcessingStatus.tsx` (progress UI), `src/components/DataPreview.tsx` (table/CSV/Excel UX).

## Project-specific conventions & patterns

- Path alias: use `@/...` to import from `src/` (configured in `vite.config.ts`). Example: `import { Button } from "@/components/ui/button"`.
- Route insertion rule: keep custom `<Route/>` entries above the catch-all `*` route in `src/App.tsx`.
- UI composition: prefer using components from `src/components/ui/*` for theme and accessibility consistency rather than ad-hoc markup.
- Toasts: use the `use-toast` hook under `src/hooks/use-toast.ts` and the `Toaster` components already wired in `App.tsx`.
- Class names: use `cn(...)` from `src/lib/utils.ts` when conditionally composing Tailwind classes to avoid merge conflicts.

## Build / run / lint commands

- Install: `npm i`
- Dev server: `npm run dev` (Vite, port 8080)
- Build: `npm run build` (also `npm run build:dev` for development-mode build)
- Preview production build: `npm run preview`
- Lint: `npm run lint` (ESLint configured)

## Important implementation notes (observed in code)

- FileUploader accepts `.docx`/.doc and enforces a 10 MB limit; validation lives in `src/components/FileUploader.tsx`. Any backend or parsing changes should respect these constraints.
- The app is client-rendered; components assume DOM availability (e.g., `document.getElementById("file-upload")?.click()`). Avoid moving those calls into server/SSR contexts.
- Development-only plugin: `lovable-tagger` is enabled in development mode in `vite.config.ts`. Keep plugin usage gated on `mode === 'development'`.
- Localization: many UI strings are in Turkish (e.g., FileUploader toast messages). Keep language context in mind for UX edits.

## Example small tasks & where to make changes

- Add a new route + page: create `src/pages/MyPage.tsx`, then add `<Route path="/my" element={<MyPage/>} />` in `src/App.tsx` above `*`.
- Add a new UI primitive: add file under `src/components/ui/` and export it (follow naming + prop patterns from existing primitives).
- Update toast text: edit `src/hooks/use-toast.ts` for default behavior or the component that calls it (e.g., `FileUploader.tsx`).

## Searching the codebase

- Quick entry points: `src/App.tsx`, `src/pages/Index.tsx`, `src/components/FileUploader.tsx`, `src/components/DataPreview.tsx`, `src/lib/utils.ts`, `vite.config.ts`, `package.json`.

## Quality gates & checks

- Lint: run `npm run lint` locally after edits.
- There are no project tests in this repo; keep changes small and manual-verify in browser at `http://localhost:8080`.

## Critical coding standards (AI agents MUST follow)

- **Clean code**: Write readable, maintainable code with clear variable names and proper structure. Follow existing patterns in the codebase.
- **Security first**: NEVER hardcode API keys, secrets, or sensitive credentials in source code. Use environment variables (`.env` files) for sensitive data. Ensure `.env` files are in `.gitignore`.
- **Careful, deliberate coding**: Do NOT rush. Write code slowly and carefully to avoid errors. Double-check syntax and logic before committing changes.
- **Step-by-step error fixing**: When errors occur, fix them incrementally. Do NOT delete and recreate files. Debug methodically by:
  1. Reading error messages carefully
  2. Identifying the root cause
  3. Making minimal, targeted fixes
  4. Testing after each fix
  5. Only moving to the next issue after the current one is resolved

If anything here is unclear or you want more details (for example, a deeper guide to the upload/parse flow or to wire up tests), tell me which area to expand and I will update this file.
