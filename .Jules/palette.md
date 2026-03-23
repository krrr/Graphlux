## 2024-05-19 - Empty States for Lists
**Learning:** Empty lists (like the Tasks view) previously rendered as blank space, leaving users without guidance on what to do next. Using ng-zorro-antd's `nz-empty` component with a Call-To-Action significantly improves the onboarding experience.
**Action:** Always consider empty states for lists or tables. Use `nz-empty` with `nzNotFoundContent` for explanation and `nzNotFoundFooter` for a primary action button. Ensure `NzEmptyModule` is imported in standalone components.
