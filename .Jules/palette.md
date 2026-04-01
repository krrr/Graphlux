## 2024-05-20 - Adding Empty States using Ng-Zorro-Antd
**Learning:** Utilizing `<nz-empty>` from `ng-zorro-antd` for empty states is effective. Adding a helpful CTA like "Create First Task" directly within the `<nz-empty>` tag works perfectly to guide new users, instead of displaying a blank or confusing UI when no tasks are present.
**Action:** Consistently check lists or tables for empty states and implement `<nz-empty>` with clear, actionable CTAs where appropriate.

## 2024-05-20 - Custom Emoji Picker Accessibility
**Learning:** Custom interactive components like an Emoji Picker often default to using `<div>` elements with `(click)` handlers. This breaks keyboard navigation entirely. Transforming them into `<button type="button">` with `aria-label` ensures screen readers can identify the intent, and keyboard users can effectively tab and interact using `Enter` or `Space`.
**Action:** When building or modifying custom selection grids (like emoji pickers or color palettes), ALWAYS use semantic `<button>` elements, reset their default styles using CSS (e.g., `border: none; background: transparent; padding: 0;`), and ensure a visible `:focus-visible` outline is styled.
