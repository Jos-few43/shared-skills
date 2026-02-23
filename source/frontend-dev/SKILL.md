---
name: frontend-dev
description: Use when working on frontend code — React, Vue, Svelte, or vanilla HTML/CSS/JS. Provides component patterns, a11y guidance, and design system conventions.
---

# Frontend Development

## Component Patterns

- Prefer functional components with hooks
- Co-locate styles, tests, and stories with components
- Use semantic HTML elements over generic divs
- Keyboard navigation must work for all interactive elements

## Accessibility Checklist

- All images have alt text
- Form inputs have associated labels
- Color contrast meets WCAG AA (4.5:1 for text)
- Focus indicators are visible
- ARIA attributes used correctly (prefer semantic HTML first)

## Styling

- Use CSS custom properties for theming
- Mobile-first responsive design
- Prefer `rem`/`em` over `px` for font sizes
- Test at 200% zoom

## Testing

- Unit test component logic (hooks, state transitions)
- Integration test user interactions (click, type, submit)
- Snapshot tests only for stable, rarely-changing components
- Test accessibility with axe-core or similar

## Performance

- Lazy-load routes and heavy components
- Optimize images (WebP, proper sizing, lazy loading)
- Minimize bundle size — check with `npx bundlephobia <package>` before adding deps
- Use `React.memo` / `useMemo` only when profiling shows a need
