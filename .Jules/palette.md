## 2024-05-24 - Accessibility (a11y) improvements
**Learning:** Found several buttons missing `aria-label` or `title` attributes which makes them difficult for screen reader users to understand their purpose, especially if they are icon-only buttons. Added `aria-label` and `title` to these buttons across `settings`, `tasks`, and `folders` components.
**Action:** Always ensure that icon-only buttons have descriptive `aria-label` and `title` attributes.
