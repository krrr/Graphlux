## 2024-05-20 - Adding Empty States using Ng-Zorro-Antd
**Learning:** Utilizing `<nz-empty>` from `ng-zorro-antd` for empty states is effective. Adding a helpful CTA like "Create First Task" directly within the `<nz-empty>` tag works perfectly to guide new users, instead of displaying a blank or confusing UI when no tasks are present.
**Action:** Consistently check lists or tables for empty states and implement `<nz-empty>` with clear, actionable CTAs where appropriate.

## 2024-05-24 - Making Complex `ng-zorro-antd` Components Interactive
**Learning:** When making complex `ng-zorro-antd` components like `<nz-card>` interactive with `(click)`, screen readers and keyboard users miss out unless extra properties are added. It requires adding `tabindex="0"`, `role="button"`, a dynamic `[attr.aria-label]`, and explicitly handling keyboard events `(keydown.enter)` and `(keydown.space)` with `$event.preventDefault()` to mimic native button behavior.
**Action:** When adding `(click)` handlers to non-interactive elements like `nz-card` or custom triggers, always ensure full keyboard and screen reader accessibility by adding role, aria labels, tabindex, and keydown handlers.
