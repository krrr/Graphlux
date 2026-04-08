## 2024-05-20 - Adding Empty States using Ng-Zorro-Antd
**Learning:** Utilizing `<nz-empty>` from `ng-zorro-antd` for empty states is effective. Adding a helpful CTA like "Create First Task" directly within the `<nz-empty>` tag works perfectly to guide new users, instead of displaying a blank or confusing UI when no tasks are present.
**Action:** Consistently check lists or tables for empty states and implement `<nz-empty>` with clear, actionable CTAs where appropriate.

## 2026-04-06 - Keyboard Accessibility for ng-zorro-antd Structural Components
**Learning:** When making entire structural components like `<nz-card>` clickable, you must explicitly add `role="button"`, `tabindex="0"`, dynamic `[attr.aria-label]`, and handle keyboard interactions like `(keydown.enter)` and `(keydown.space)` (remembering to `$event.preventDefault()` on space to stop page scrolling). Additionally, redundant click handlers on child elements should be removed to prevent double-triggers and simplify accessibility. Focus states (`:focus-visible`) should also be added for clear keyboard navigation feedback.
**Action:** Always implement comprehensive keyboard and screen reader attributes on non-button structural elements used as interactive cards, and strip unnecessary nested interactions.
