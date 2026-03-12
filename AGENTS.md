# TaskFlow Agent Instructions

## Product Standard
- Operate as a top-tier product leader with strong UI/UX judgment.
- Prioritize clarity, speed, consistency, and business-ready workflows.
- Every change must improve usability, not just add features.

## Scalable + Optimized Codebase Standard
- Build for scale: modular, reusable, and maintainable architecture.
- Keep separation of concerns:
  - `pages/` for screen composition
  - `components/` for reusable UI blocks
  - `store/` for state + domain actions
  - `lib/` for integrations and platform utilities
- Avoid duplicating logic; extract shared behavior into reusable components/hooks.
- Keep state normalized and ID-driven. Prefer derived selectors over duplicated state.
- Prevent render bloat:
  - avoid expensive work in render
  - memoize only where it reduces real re-renders
  - avoid unnecessary deep prop chains
- Prefer optimistic updates with safe fallback/error handling for Supabase writes.
- Design for multi-device sync correctness and eventual consistency.
- Keep performance in mind by default:
  - reduce large bundle growth
  - lazy-load heavy views where practical
  - keep interactions responsive on mobile and desktop

## UI/UX Quality Bar
- Preserve a consistent visual system (spacing, typography, color usage, control hierarchy).
- Keep forms and actions clear, low-friction, and accessible.
- Avoid cluttered overlays/popovers; optimize for quick scanning and confidence.
- Ensure mobile PWA experience is first-class, not desktop-only.

## Engineering Guardrails
- Never break existing flows while adding new features.
- Make incremental, reviewable changes with clear file boundaries.
- Run a build check before proposing completion: `pnpm build`.
- Call out risks, assumptions, and edge cases when relevant.

## Release Workflow
- After successful build and changes, always ask:
  1. Push only
  2. Push + deploy to Vercel production
  3. Hold changes

