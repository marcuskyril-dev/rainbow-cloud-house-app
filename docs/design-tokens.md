# Design Tokens Reference

This document defines the design tokens used across the housewarming wishlist app.

## Colors

| Token | Hex | CSS Variable | Tailwind Class | Usage |
|-------|-----|--------------|----------------|-------|
| Olive | #A3A074 | `--color-olive` | `bg-olive`, `text-olive` | Primary accent, CTA buttons, progress bars |
| Olive Light | #C4C0A0 | `--color-olive-light` | `bg-olive-light` | Hover states |
| Olive Dark | #7D7B55 | `--color-olive-dark` | `bg-olive-dark` | Active states, dark text on beige |
| Dusty Blue | #5B7C8D | `--color-dusty-blue` | `bg-dusty-blue` | Secondary accent, category labels |
| Dusty Blue Light | #8AACBC | `--color-dusty-blue-light` | `bg-dusty-blue-light` | Hover |
| Dusty Blue Dark | #3E5A68 | `--color-dusty-blue-dark` | `bg-dusty-blue-dark` | Dark text |
| Warm Beige | #EAD9A0 | `--color-warm-beige` | `bg-warm-beige` | Highlights, secondary buttons |
| Warm Beige Light | #F2E8C4 | `--color-warm-beige-light` | `bg-warm-beige-light` | Subtle bg |
| Warm Beige Dark | #D4C07A | `--color-warm-beige-dark` | `bg-warm-beige-dark` | Active |
| Surface | #FFFFFF | `--color-surface` | `bg-surface` | Page background |
| Surface Muted | #F7F6F3 | `--color-surface-muted` | `bg-surface-muted` | Card bg, input bg |
| Surface Card | #FAFAF7 | `--color-surface-card` | `bg-surface-card` | Card background |
| Text Primary | #121212 | `--color-text-primary` | `text-text-primary` | Main text |
| Text Secondary | #999999 | `--color-text-secondary` | `text-text-secondary` | Muted text |
| Text Inverse | #FFFFFF | `--color-text-inverse` | `text-text-inverse` | Text on dark bg |
| Border | #E5E5E5 | `--color-border` | `border-border` | Default border |
| Success | #4CAF50 | `--color-success` | `text-success` | Success indicators |
| Error | #E53935 | `--color-error` | `text-error` | Error text, validation |
| Warning | #FFA726 | `--color-warning` | `text-warning` | Warning indicators |

## Typography

| Use | Font | Weight | Tailwind |
|-----|------|--------|----------|
| Titles/headings | Fredoka | 700 | `font-display font-bold` |
| Body text | Fredoka | 400 | `font-body` |
| Buttons/labels | Fredoka | 500–600 | `font-medium` / `font-semibold` |

## Border Radius

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| Small | 4px | `rounded-sm` | Minor rounding |
| Medium | 8px | `rounded-md` | Cards, inputs, images |
| Large | 16px | `rounded-lg` | Large cards |
| Pill | 100px | `rounded-pill` | Buttons, badges, tags |

## Spacing

Uses the standard Tailwind spacing scale. Key patterns:

| Context | Pattern | Description |
|---------|---------|-------------|
| Card padding | `p-4` | Internal padding for cards |
| Section gaps | `gap-5` | Spacing between sections or grid items |
| Modal content | `space-y-4` | Vertical spacing between modal elements |
| Page layout | `max-w-6xl mx-auto px-4` | Centered max-width with horizontal padding |
