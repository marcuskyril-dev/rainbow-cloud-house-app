---
name: wishlist-ui-consistency
description: >-
  UI component patterns and design token usage for the housewarming wishlist app. Use when building new components, styling existing ones, creating modals, forms, or buttons. Triggers on mentions of UI component, design, Tailwind, Radix, modal, button, form, color, or styling.
---

# UI Consistency Guide

## Design Tokens (defined in src/index.css @theme)
| Token | Value | Usage |
|---|---|---|
| olive | #A3A074 | Primary accent, buttons, progress bars |
| dusty-blue | #5B7C8D | Secondary accent, category labels |
| warm-beige | #EAD9A0 | Highlights, secondary buttons |
| surface | #FFFFFF | Page background |
| surface-muted | #F7F6F3 | Card backgrounds, inputs bg |
| text-primary | #121212 | Main text |
| text-secondary | #999999 | Muted text |
| border | #E5E5E5 | Default borders |

## Typography
- Font: Fredoka (loaded via Google Fonts in index.html)
- Titles: font-display font-bold (Fredoka 700)
- Body: font-body font-normal (Fredoka 400)

## Component Patterns

### Buttons
Use shared `<Button>` component. Variants: primary, secondary, outline, ghost, danger.
All buttons use rounded-pill (border-radius: 100px).

### Modals
Use shared `<Modal>` wrapping Radix Dialog. Always include title and description props.

### Forms
Always use React Hook Form + zod resolver. Use shared Input, Textarea, Select components.

### Cards
Rounded-lg border border-border bg-surface-card. Hover shadow transition.

### Status Badges
Use `<StatusBadge>` for item statuses. Each status has preset color.

## File Locations
- Shared components: src/shared/ui/ (export from index.ts)
- Feature components: src/features/{name}/components/
- Add new shared component: create file, export from src/shared/ui/index.ts
