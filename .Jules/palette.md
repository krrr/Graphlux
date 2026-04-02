## 2024-05-20 - Adding Empty States using Ng-Zorro-Antd
**Learning:** Utilizing `<nz-empty>` from `ng-zorro-antd` for empty states is effective. Adding a helpful CTA like "Create First Task" directly within the `<nz-empty>` tag works perfectly to guide new users, instead of displaying a blank or confusing UI when no tasks are present.
**Action:** Consistently check lists or tables for empty states and implement `<nz-empty>` with clear, actionable CTAs where appropriate.

## 2024-05-21 - Custom Grid Pickers and Keyboard Accessibility
**Learning:** When building custom grid pickers (like emoji or icon pickers), using `<div>` with `(click)` handlers creates accessibility issues for keyboard and screen reader users. Ng-Zorro-Antd doesn't automatically fix these underlying structural issues. Replacing them with `<button type="button">` resolves semantic issues, but requires careful resetting of default button styles (background, border, padding). Crucially, custom components lack default focus rings, so adding a custom `:focus-visible` state (e.g., using Ant Design's primary color `#1890ff` for box-shadow) is necessary for clear keyboard navigation.
**Action:** Always use `<button type="button">` for interactive grid items instead of `<div>`, add `aria-label`, and explicitly define `:focus-visible` styles to ensure full keyboard navigation and screen reader accessibility.
